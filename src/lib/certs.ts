import { certSchema, type Cert } from '../schema'

/**
 * Eagerly pull every per-domain JSON file at build time. Each file is an array
 * of raw cert records; the schema is enforced here so a malformed record fails
 * the build rather than rendering a broken cell.
 */
const modules = import.meta.glob('../../data/certs/*.json', { eager: true }) as Record<
  string,
  { default: unknown }
>

export interface LoadIssue {
  file: string
  index: number
  id: string
  message: string
}

function load(): { certs: Cert[]; issues: LoadIssue[] } {
  const certs: Cert[] = []
  const issues: LoadIssue[] = []
  const seen = new Map<string, string>()

  for (const [path, mod] of Object.entries(modules)) {
    const file = path.split('/').pop() ?? path
    const raw = mod.default

    if (!Array.isArray(raw)) {
      issues.push({ file, index: -1, id: '', message: 'file is not a JSON array' })
      continue
    }

    raw.forEach((record, index) => {
      const parsed = certSchema.safeParse(record)
      if (!parsed.success) {
        const id = (record as { id?: string })?.id ?? `#${index}`
        for (const issue of parsed.error.issues) {
          issues.push({
            file,
            index,
            id,
            message: `${issue.path.join('.') || '(root)'}: ${issue.message}`,
          })
        }
        return
      }

      const cert = parsed.data
      const prior = seen.get(cert.id)
      if (prior) {
        issues.push({
          file,
          index,
          id: cert.id,
          message: `duplicate id, already defined in ${prior}`,
        })
        return
      }
      seen.set(cert.id, file)
      certs.push(cert)
    })
  }

  // Stable ordering: highest level first, then alphabetical. Keeps the chart
  // deterministic across builds so diffs stay readable.
  certs.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))
  return { certs, issues }
}

const { certs, issues } = load()

export const allCerts = certs
export const loadIssues = issues

export function certsByDomain(domain: string): Cert[] {
  return allCerts.filter((c) => c.domain === domain)
}

/** Certs that span into a domain without being primarily of it. */
export function adjacentCerts(domain: string): Cert[] {
  return allCerts.filter((c) => c.adjacentDomains.includes(domain))
}

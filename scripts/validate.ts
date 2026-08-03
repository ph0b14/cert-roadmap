/**
 * CI gate for the dataset. Runs before every build and on every PR.
 * Exits non-zero on any schema violation, duplicate id, or dangling reference,
 * so bad data can never reach the published chart.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { certSchema, DOMAIN_IDS, TIERS } from '../src/schema.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
// CERT_DIR lets CI and local experiments validate a candidate dataset without
// touching the committed one.
const certDir = process.env.CERT_DIR ?? join(root, 'data', 'certs')

const errors: string[] = []
const warnings: string[] = []

if (!existsSync(certDir)) {
  console.error(`✗ missing data directory: ${certDir}`)
  process.exit(1)
}

const files = readdirSync(certDir).filter((f) => f.endsWith('.json')).sort()
if (files.length === 0) {
  console.error(`✗ no cert files found in ${certDir}`)
  process.exit(1)
}

const seen = new Map<string, string>()
const byDomain = new Map<string, number>()
const levels: number[] = []
let total = 0

for (const file of files) {
  // Files are organised per issuing body — that is how the data is sourced and
  // how it goes stale, so it is also the unit a contributor owns. The chart's
  // columns come from each record's `domain`, never from the filename.
  const vendorsInFile = new Set<string>()

  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(join(certDir, file), 'utf8'))
  } catch (e) {
    errors.push(`${file}: invalid JSON — ${(e as Error).message}`)
    continue
  }

  if (!Array.isArray(raw)) {
    errors.push(`${file}: expected a JSON array`)
    continue
  }

  raw.forEach((record, i) => {
    const parsed = certSchema.safeParse(record)
    const label = (record as { id?: string })?.id ?? `#${i}`
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`${file} [${label}] ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      }
      return
    }

    const cert = parsed.data
    total++
    levels.push(cert.level)
    byDomain.set(cert.domain, (byDomain.get(cert.domain) ?? 0) + 1)
    vendorsInFile.add(cert.vendor)

    const prior = seen.get(cert.id)
    if (prior) {
      errors.push(`${file} [${cert.id}]: duplicate id, already defined in ${prior}`)
    } else {
      seen.set(cert.id, file)
    }

    // Data-quality signals that shouldn't block a build but should be visible.
    if (cert.status === 'active' && cert.cost.amount === null) {
      warnings.push(`${file} [${cert.id}]: active cert with no price`)
    }
    if (cert.sources.length === 0) {
      warnings.push(`${file} [${cert.id}]: no sources cited`)
    }
    const age = Date.now() - Date.parse(cert.lastVerified)
    if (Number.isFinite(age) && age > 1000 * 60 * 60 * 24 * 365) {
      warnings.push(`${file} [${cert.id}]: not verified in over a year (${cert.lastVerified})`)
    }
  })

  if (vendorsInFile.size > 1) {
    errors.push(
      `${file}: mixes ${vendorsInFile.size} issuing bodies (${[...vendorsInFile].join(', ')}) — one file per body`,
    )
  }
}

// Prerequisites must point at certs that actually exist (free-text allowed if it
// contains a space — those are human-readable requirements, not cert ids).
for (const file of files) {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(join(certDir, file), 'utf8'))
  } catch {
    continue
  }
  if (!Array.isArray(raw)) continue
  for (const record of raw as { id?: string; prerequisites?: string[] }[]) {
    for (const p of record.prerequisites ?? []) {
      if (!p.includes(' ') && !seen.has(p)) {
        warnings.push(`${file} [${record.id}]: prerequisite "${p}" matches no known cert id`)
      }
    }
  }
}

const mean = levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 0

console.log(`\n  ${total} certifications across ${byDomain.size}/${DOMAIN_IDS.length} domains\n`)
for (const id of DOMAIN_IDS) {
  const n = byDomain.get(id) ?? 0
  const bar = '█'.repeat(Math.round(n / 2))
  const flag = n === 0 ? '  ← empty' : n < 5 ? '  ← thin' : ''
  console.log(`  ${id.padEnd(22)} ${String(n).padStart(3)}  ${bar}${flag}`)
}

console.log(`\n  mean level ${mean.toFixed(1)}`)
for (const t of TIERS) {
  const n = levels.filter((l) => l >= t.min && l <= t.max).length
  console.log(`  ${t.label.padEnd(14)} ${String(n).padStart(3)}  ${'▪'.repeat(Math.round(n / 2))}`)
}

if (warnings.length) {
  console.log(`\n  ${warnings.length} warning(s):`)
  for (const w of warnings.slice(0, 25)) console.log(`    ! ${w}`)
  if (warnings.length > 25) console.log(`    … and ${warnings.length - 25} more`)
}

if (errors.length) {
  console.error(`\n✗ ${errors.length} error(s):`)
  for (const e of errors.slice(0, 50)) console.error(`    ${e}`)
  if (errors.length > 50) console.error(`    … and ${errors.length - 50} more`)
  process.exit(1)
}

console.log('\n✓ dataset valid\n')

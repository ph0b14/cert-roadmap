/**
 * Scheduled freshness check. Every vendorUrl is fetched; dead links are the
 * earliest signal that a certification was retired, renamed, or re-priced.
 *
 * Run weekly in CI. It writes reports/linkcheck.json and opens an issue rather
 * than failing the build — a vendor having a bad day should not block merges.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const certDir = join(root, 'data', 'certs')

interface Row {
  id: string
  name: string
  domain: string
  url: string
  status: number | string
  lastVerified: string
}

const targets: Omit<Row, 'status'>[] = []

for (const file of readdirSync(certDir).filter((f) => f.endsWith('.json'))) {
  const records = JSON.parse(readFileSync(join(certDir, file), 'utf8')) as {
    id: string
    name: string
    domain: string
    vendorUrl: string | null
    lastVerified: string
    status: string
  }[]
  for (const c of records) {
    if (c.vendorUrl && c.status !== 'retired') {
      targets.push({
        id: c.id,
        name: c.name,
        domain: c.domain,
        url: c.vendorUrl,
        lastVerified: c.lastVerified,
      })
    }
  }
}

const CONCURRENCY = 8
const TIMEOUT_MS = 15_000

async function probe(t: Omit<Row, 'status'>): Promise<Row> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    // Some vendor sites reject HEAD outright; fall back to a ranged GET.
    let res = await fetch(t.url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'user-agent': 'cert-roadmap-linkcheck/1.0 (+https://certroadmap.dev)' },
    })
    if (res.status === 405 || res.status === 403 || res.status === 501) {
      res = await fetch(t.url, {
        method: 'GET',
        redirect: 'follow',
        signal: ctrl.signal,
        headers: {
          'user-agent': 'cert-roadmap-linkcheck/1.0 (+https://certroadmap.dev)',
          range: 'bytes=0-2048',
        },
      })
    }
    return { ...t, status: res.status }
  } catch (e) {
    return { ...t, status: (e as Error).name === 'AbortError' ? 'timeout' : 'error' }
  } finally {
    clearTimeout(timer)
  }
}

const results: Row[] = []
const queue = [...targets]
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const t = queue.shift()
      if (t) results.push(await probe(t))
    }
  }),
)

/**
 * 429 means the vendor is throttling us, not that the page is gone — TryHackMe
 * rate-limits automated clients hard. Counting it as broken would open a
 * false freshness issue every week, so it is reported separately.
 */
const isThrottled = (r: Row) => r.status === 429
const throttled = results.filter(isThrottled)
const broken = results.filter(
  (r) => !isThrottled(r) && (typeof r.status !== 'number' || r.status >= 400),
)

// Anything unverified for 180+ days is a curation prompt even if the link is fine.
const cutoff = new Date(Date.now() - 180 * 864e5).toISOString().slice(0, 10)
const stale = targets.filter((t) => t.lastVerified < cutoff)

mkdirSync(join(root, 'reports'), { recursive: true })
writeFileSync(
  join(root, 'reports', 'linkcheck.json'),
  JSON.stringify({ checkedAt: new Date().toISOString(), broken, throttled, stale }, null, 2),
)

console.log(`checked ${results.length} links`)
console.log(`  ${broken.length} broken`)
for (const b of broken) console.log(`    ✗ [${b.domain}] ${b.name} → ${b.status} ${b.url}`)
if (throttled.length) {
  console.log(`  ${throttled.length} rate-limited (429) — not treated as broken`)
  for (const t of throttled) console.log(`    · ${t.name} ${t.url}`)
}
console.log(`  ${stale.length} not verified since ${cutoff}`)

if (process.env.GITHUB_OUTPUT) {
  const summary = `${broken.length} broken, ${stale.length} stale`
  writeFileSync(process.env.GITHUB_OUTPUT, `summary=${summary}\nbroken=${broken.length}\n`, {
    flag: 'a',
  })
}

import type { APIRoute } from 'astro'
import { allCerts } from '../../lib/certs'
import { DOMAINS, TIERS } from '../../schema'

/**
 * A public, static JSON API. Built at deploy time and served as a plain file,
 * so it costs nothing to run and cannot fall out of sync with the site.
 *
 * The original roadmap's data was effectively locked inside a rendered chart.
 * Publishing it as a documented endpoint means other tools can build on this
 * dataset instead of re-scraping it — which is how it stays useful when this
 * particular site eventually stops being maintained.
 */
export const GET: APIRoute = () => {
  const body = {
    $schema: 'https://certroadmap.dev/api/schema.json',
    license: 'CC-BY-4.0',
    attribution: 'Technical Security Certification Roadmap — https://certroadmap.dev',
    generatedAt: new Date().toISOString(),
    counts: {
      total: allCerts.length,
      active: allCerts.filter((c) => c.status === 'active').length,
      retired: allCerts.filter((c) => c.status === 'retired').length,
      announced: allCerts.filter((c) => c.status === 'announced').length,
    },
    tiers: TIERS,
    domains: DOMAINS.map((d) => ({
      id: d.id,
      label: d.label,
      band: d.band,
      blurb: d.blurb,
      count: allCerts.filter((c) => c.domain === d.id).length,
    })),
    certifications: allCerts,
  }

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=3600',
    },
  })
}

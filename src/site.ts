/**
 * Deployment-specific constants. Everything that changes when the project moves
 * host or repository lives here so it is a one-file edit.
 */

/** Where the roadmap links back to. */
export const PARENT_SITE = 'https://www.pyaeheinnkyaw.com'

/** Public repository. Correction links are built from this. */
export const REPO_URL = 'https://github.com/ph0b14/cert-roadmap'

/** Structured issue forms, so contributors need no Git or JSON knowledge. */
const TEMPLATE = (file: string, params: Record<string, string> = {}) => {
  const q = new URLSearchParams({ template: file, ...params })
  return `${REPO_URL}/issues/new?${q}`
}

/** Deep-link to the dispute form with the cert and its current score filled in. */
export function correctionUrl(cert: { name: string; level: number }): string {
  return TEMPLATE('level-dispute.yml', {
    title: `Level: ${cert.name} ${cert.level} → ?`,
    cert: cert.name,
    proposed: `${cert.level} → `,
  })
}

/** Report a wrong price, format, URL or status on a specific cert. */
export function fixUrl(cert: { name: string }): string {
  return TEMPLATE('correction.yml', { title: `Fix: ${cert.name} — `, cert: cert.name })
}

/** Propose a certification that is missing entirely. */
export const ADD_CERT_URL = TEMPLATE('new-certification.yml')

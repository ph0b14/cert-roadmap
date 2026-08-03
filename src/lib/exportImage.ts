/**
 * Render the roadmap to a PNG the visitor can save and share.
 *
 * Drawn onto a canvas by hand rather than screenshotting the DOM. The usual
 * approaches both fail here: html2canvas is a large external dependency, and
 * serialising the chart into an <svg><foreignObject> taints the canvas in
 * WebKit so toBlob() throws. Redrawing is more code but has no dependencies,
 * works in every browser, and lets the exported image carry a header and
 * legend the on-screen chart does not need.
 */

export interface ExportGeometry {
  colWidth: number
  colPad: number
  slots: number
  slotGap: number
  cellWidth: number
  cellHeight: number
  rowPitch: number
  gutter: number
}

export interface ExportDomain {
  id: string
  label: string
  band: string
  bandLabel: string
}

export interface ExportBand {
  id: string
  label: string
  startRow: number
  rows: number
}

export interface ExportPlacement {
  id: string
  name: string
  domain: string
  retired: boolean
  row: number
  slot: number
  start: number
  span: number
}

export interface ExportOptions {
  domains: ExportDomain[]
  bands: ExportBand[]
  placements: ExportPlacement[]
  owned: Set<string>
  geometry: ExportGeometry
  totalRows: number
  /** Optional name shown in the header, e.g. "Pyae Heinn Kyaw". */
  heading?: string
  siteLabel: string
}

const FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`
const MARGIN = 40
const HEADER_H = 108
const BAND_H = 26
const COLHEAD_H = 44
const FOOTER_H = 56

/** Resolve a CSS custom property to a concrete colour string. */
function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function bandColour(band: string): string {
  return cssVar(`--color-band-${band}`, '#8c1a38')
}

/** Shrink text until it fits, rather than letting it overrun its cell. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number) {
  let s = size
  ctx.font = `600 ${s}px ${FONT}`
  while (ctx.measureText(text).width > maxWidth && s > 6) {
    s -= 0.5
    ctx.font = `600 ${s}px ${FONT}`
  }
  return s
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

export function renderRoadmapCanvas(opts: ExportOptions): HTMLCanvasElement {
  const { domains, bands, placements, owned, geometry: g, totalRows } = opts

  const plotW = domains.length * g.colWidth
  const width = MARGIN * 2 + g.gutter + plotW
  const plotH = totalRows * g.rowPitch
  const height = MARGIN * 2 + HEADER_H + BAND_H + COLHEAD_H + plotH + FOOTER_H

  // Export at 2x so the text stays sharp when the image is zoomed or printed.
  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)

  const surface = cssVar('--color-surface', '#fff')
  const surface2 = cssVar('--color-surface-2', '#eff2f7')
  const edge = cssVar('--color-edge', '#e2e8f0')
  const ink = cssVar('--color-ink', '#212121')
  const inkDim = cssVar('--color-ink-dim', '#4a5568')
  const inkFaint = cssVar('--color-ink-faint', '#8494a8')
  const primary = cssVar('--pri-color', '#8c1a38')

  ctx.fillStyle = surface
  ctx.fillRect(0, 0, width, height)

  // ---- header -------------------------------------------------------------
  let y = MARGIN
  ctx.textBaseline = 'top'
  ctx.fillStyle = ink
  ctx.font = `700 26px ${FONT}`
  ctx.fillText(opts.heading || 'My Security Certifications', MARGIN, y)
  y += 34

  const ownedCount = placements.filter((p) => owned.has(p.id)).length
  ctx.fillStyle = primary
  ctx.font = `700 17px ${FONT}`
  const countText = `${ownedCount} certification${ownedCount === 1 ? '' : 's'} held`
  ctx.fillText(countText, MARGIN, y)

  ctx.fillStyle = inkFaint
  ctx.font = `400 13px ${FONT}`
  ctx.fillText(
    `  ·  highlighted on the technical security certification roadmap`,
    MARGIN + ctx.measureText(countText).width + 40,
    y + 3,
  )
  y += 30

  ctx.fillStyle = inkFaint
  ctx.font = `400 12px ${FONT}`
  ctx.fillText(new Date().toISOString().slice(0, 10), MARGIN, y)

  y = MARGIN + HEADER_H
  const plotX = MARGIN + g.gutter

  // ---- band headers -------------------------------------------------------
  let cursor = plotX
  for (const d of domains) {
    const first = domains.find((x) => x.band === d.band) === d
    if (!first) continue
    const count = domains.filter((x) => x.band === d.band).length
    const w = count * g.colWidth
    const colour = bandColour(d.band)
    ctx.globalAlpha = 0.12
    ctx.fillStyle = colour
    ctx.fillRect(cursor, y, w, BAND_H - 6)
    ctx.globalAlpha = 1
    ctx.fillStyle = colour
    ctx.fillRect(cursor, y + BAND_H - 8, w, 2)
    ctx.font = `700 11px ${FONT}`
    ctx.fillText(d.bandLabel.toUpperCase(), cursor + 8, y + 5)
    cursor += w
  }
  y += BAND_H

  // ---- column headers -----------------------------------------------------
  ctx.font = `600 11.5px ${FONT}`
  domains.forEach((d, i) => {
    ctx.fillStyle = inkDim
    const x = plotX + i * g.colWidth + 6
    const words = d.label.split(' ')
    let line = ''
    let ly = y + 4
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (ctx.measureText(test).width > g.colWidth - 14 && line) {
        ctx.fillText(line, x, ly)
        ly += 14
        line = w
      } else line = test
    }
    if (line) ctx.fillText(line, x, ly)
  })
  y += COLHEAD_H

  const plotY = y

  // ---- tier bands and column rules ---------------------------------------
  for (const b of bands) {
    const top = plotY + b.startRow * g.rowPitch
    ctx.strokeStyle = edge
    ctx.setLineDash([4, 4])
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(MARGIN, top - 4)
    ctx.lineTo(MARGIN + g.gutter + plotW, top - 4)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = inkFaint
    ctx.font = `700 10px ${FONT}`
    ctx.fillText(b.label.toUpperCase(), MARGIN, top)
  }

  ctx.strokeStyle = edge
  ctx.lineWidth = 1
  for (let i = 1; i < domains.length; i++) {
    const x = plotX + i * g.colWidth + 0.5
    ctx.beginPath()
    ctx.moveTo(x, plotY - 8)
    ctx.lineTo(x, plotY + plotH)
    ctx.stroke()
  }

  // ---- cells --------------------------------------------------------------
  for (const p of placements) {
    const isOwned = owned.has(p.id)
    const spanning = p.span > 1
    const x =
      plotX + p.start * g.colWidth + g.colPad + (spanning ? 0 : p.slot * (g.cellWidth + g.slotGap))
    const w = spanning ? p.span * g.colWidth - g.colPad * 2 : g.cellWidth
    const top = plotY + p.row * g.rowPitch
    const domain = domains.find((d) => d.id === p.domain)
    const colour = bandColour(domain?.band ?? 'offensive')

    // Unowned cells stay visible but recede, so the held ones read instantly.
    ctx.globalAlpha = isOwned ? 1 : 0.28

    roundRect(ctx, x, top, w, g.cellHeight, 4)
    ctx.fillStyle = isOwned ? colour : surface2
    ctx.fill()
    ctx.lineWidth = isOwned ? 1.5 : 1
    ctx.strokeStyle = isOwned ? colour : edge
    ctx.stroke()

    const label = p.name
    const size = fitText(ctx, label, w - 10, 10.5)
    ctx.font = `${isOwned ? 700 : 500} ${size}px ${FONT}`
    ctx.fillStyle = isOwned ? '#ffffff' : inkDim
    ctx.textAlign = 'center'
    ctx.fillText(label, x + w / 2, top + (g.cellHeight - size) / 2 + 1)
    ctx.textAlign = 'left'
    ctx.globalAlpha = 1
  }

  // ---- footer -------------------------------------------------------------
  const fy = plotY + plotH + 18
  ctx.fillStyle = inkFaint
  ctx.font = `400 12px ${FONT}`
  ctx.fillText(opts.siteLabel, MARGIN, fy)
  ctx.font = `400 11px ${FONT}`
  ctx.fillText(
    'Certification names are trademarks of their respective owners. Levels are editorial judgements.',
    MARGIN,
    fy + 18,
  )

  return canvas
}

/** Render and trigger a download. Resolves once the blob has been handed off. */
export async function downloadRoadmapPng(opts: ExportOptions, filename: string): Promise<void> {
  const canvas = renderRoadmapCanvas(opts)
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not encode the image')

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on the next tick; revoking synchronously cancels the download in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

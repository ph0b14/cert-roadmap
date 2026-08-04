import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import type { Cert } from '../schema'
import { downloadRoadmapPng } from '../lib/exportImage'
import FilterBuilder, { QuickFilter } from './FilterBuilder'
import {
  EMPTY_FILTER,
  buildFields,
  describe,
  evaluate,
  newCondition,
  type FilterState,
} from '../lib/filterModel'

/** Where the visitor's selected certifications persist between visits. */
const OWNED_KEY = 'phk-owned-certs'

interface DomainMeta {
  id: string
  label: string
  blurb: string
  band: string
  bandLabel: string
}

interface Tier {
  id: string
  label: string
  min: number
  max: number
  blurb: string
}

interface Props {
  certs: Cert[]
  domains: DomainMeta[]
  tiers: Tier[]
}

const COL_W = 168
const COL_PAD = 4
/** Cells per column. Two keeps acronyms readable while doubling vertical density. */
const SLOTS = 2
const SLOT_GAP = 4
const CELL_W = (COL_W - COL_PAD * 2 - SLOT_GAP * (SLOTS - 1)) / SLOTS
const CELL_H = 26
const ROW_GAP = 4
const ROW_PITCH = CELL_H + ROW_GAP
/**
 * One row per level point, across the whole axis. This is what makes vertical
 * distance mean the same thing everywhere: a five-point gap is five rows in
 * Expert and five rows in Associate.
 */
const ROWS_PER_POINT = 1
/** A little headroom above the highest score and below the lowest. */
const AXIS_PAD = 2
/** Left gutter for the tier axis labels. Must clear the longest ("Professional"). */
const GUTTER = 98

/** Fields offered as one-click dropdowns, in the order people reach for them. */
const QUICK_FIELDS = ['vendor', 'domain', 'band', 'tier', 'examFormat'] as const

const BAND_VAR: Record<string, string> = {
  offensive: 'var(--color-band-offensive)',
  defensive: 'var(--color-band-defensive)',
  platform: 'var(--color-band-platform)',
  specialist: 'var(--color-band-specialist)',
  /*
   * Not a band in the taxonomy — the colour a `span: full` cert draws in. A
   * portfolio credential is assembled from the whole catalogue, so taking the
   * colour of its `domain` column said GSE was a security-engineering cert.
   */
  portfolio: 'var(--color-band-portfolio)',
}

function formatCost(cert: Cert): string {
  if (cert.cost.amount === null) return 'Price unlisted'
  if (cert.cost.amount === 0) return 'Free'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: cert.cost.currency || 'USD',
    maximumFractionDigits: 0,
  }).format(cert.cost.amount)
}

interface Placement {
  cert: Cert
  row: number
  slot: number
  start: number
  span: number
}

interface Band extends Tier {
  startRow: number
  rows: number
}

/**
 * Where a cert sits horizontally, driven by its explicit `span`. An "adjacent"
 * span silently falls back to a single cell if the domains it names are not
 * neighbours, since a cell cannot straddle a gap.
 */
function spanFor(cert: Cert, colIndex: Map<string, number>, columns: number) {
  const home = colIndex.get(cert.domain)
  if (home === undefined) return null

  if (cert.span === 'full') return { start: 0, span: columns }
  if (cert.span !== 'adjacent') return { start: home, span: 1 }

  const idx = [home, ...cert.adjacentDomains.map((d) => colIndex.get(d))].filter(
    (i): i is number => i !== undefined,
  )
  const uniq = [...new Set(idx)].sort((a, b) => a - b)
  const contiguous = uniq[uniq.length - 1] - uniq[0] + 1 === uniq.length

  return contiguous && uniq.length > 1
    ? { start: uniq[0], span: uniq.length }
    : { start: home, span: 1 }
}

/**
 * Lay the chart out on a single proportional axis: one row per level point,
 * top to bottom.
 *
 * This replaces a per-tier layout that sized each band to its own population.
 * That kept every cert inside its tier, but gave each band a different
 * pixels-per-point scale — so GSOA (75) and CCTIM (70) landed on the same row
 * while eCTHP (70) and GCTI (69) sat two rows apart. Vertical distance has to
 * mean the same thing everywhere, so the scale is now global.
 *
 * Collisions nudge to the nearest free row but are clamped inside the cert's
 * own tier, so a crowded band still cannot push a credential across a boundary
 * into a tier it does not belong to.
 */
function layoutGrid(
  certs: Cert[],
  colIndex: Map<string, number>,
  columns: number,
  tiers: Tier[],
) {
  const levels = certs.map((c) => c.level)
  const top = Math.min(100, Math.max(...levels, 0) + AXIS_PAD)
  const bottom = Math.max(0, Math.min(...levels, 100) - AXIS_PAD)
  const rowOf = (level: number) => Math.round((top - level) * ROWS_PER_POINT)
  const totalRows = Math.max(1, rowOf(bottom) + 1)

  const occupied: boolean[][][] = Array.from({ length: columns }, () => [])
  const rowAt = (col: number, row: number) => {
    while (occupied[col].length <= row) occupied[col].push(new Array(SLOTS).fill(false))
    return occupied[col][row]
  }
  const fits = (start: number, width: number, row: number) =>
    row >= 0 &&
    (width > 1
      ? Array.from({ length: width }, (_, k) => rowAt(start + k, row)).every(
          (r) => !r.some(Boolean),
        )
      : rowAt(start, row).indexOf(false) !== -1)

  const tierFor = (level: number) =>
    tiers.find((t) => level >= t.min && level <= t.max) ?? tiers[0]

  const placements: Placement[] = []
  const ordered = [...certs].sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))

  for (const cert of ordered) {
    const where = spanFor(cert, colIndex, columns)
    if (!where) continue
    const { start, span: width } = where

    const tier = tierFor(cert.level)
    // Never leave the tier: clamp the search to the rows this tier owns.
    const hi = rowOf(Math.min(tier.max, top))
    const lo = rowOf(Math.max(tier.min, bottom))
    const ideal = rowOf(cert.level)

    let row = -1
    for (let d = 0; d <= totalRows && row === -1; d++) {
      for (const cand of d === 0 ? [ideal] : [ideal + d, ideal - d]) {
        if (cand < hi || cand > lo) continue
        if (fits(start, width, cand)) {
          row = cand
          break
        }
      }
    }
    // Only if the whole tier is full: fall back to anywhere at or below ideal.
    if (row === -1) {
      row = ideal
      while (!fits(start, width, row)) row++
    }

    let slot = 0
    if (width > 1) {
      for (let k = 0; k < width; k++) rowAt(start + k, row).fill(true)
    } else {
      slot = rowAt(start, row).indexOf(false)
      rowAt(start, row)[slot] = true
    }
    placements.push({ cert, row, slot, start, span: width })
  }

  const maxRow = placements.reduce((m, p) => Math.max(m, p.row), 0)
  const rows = Math.max(totalRows, maxRow + 1)

  // Bands are read off the same scale, so the dashed boundaries land exactly
  // where the tier's score range does.
  const bands: Band[] = [...tiers]
    .sort((a, b) => b.max - a.max)
    // A tier the filtered set does not reach into has no rows to occupy. Kept
    // in, every such tier clamped to the same edge row and stacked its label on
    // top of the others: filtering to one issuing body scoring 48-55 drew
    // MASTER, EXPERT and PROFESSIONAL over each other in the gutter.
    .filter((t) => t.max >= bottom && t.min <= top)
    .map((t) => {
      const startRow = rowOf(Math.min(t.max, top))
      const endRow = rowOf(Math.max(t.min, bottom))
      return { ...t, startRow, rows: Math.max(1, endRow - startRow + 1) }
    })

  return { placements, bands, rows }
}

export default function RoadmapChart({ certs, domains, tiers }: Props) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER)
  const [editorOpen, setEditorOpen] = useState(false)
  const [showRetired, setShowRetired] = useState(false)
  const [selected, setSelected] = useState<Cert | null>(null)
  /**
   * Chart zoom. The chart is one artefact at every width — a phone gets the
   * same 13 columns as a desktop, because a separate mobile list was a
   * different product that happened to share a dataset: no tiers, no
   * proportional axis, no spanning cells, so the one thing the roadmap is for
   * (seeing where a credential sits against its peers) was missing exactly
   * where screen space was tightest. It scrolls horizontally instead, and
   * zoom makes the whole picture reachable.
   */
  const [zoom, setZoom] = useState(1)
  const [picking, setPicking] = useState(false)
  const [owned, setOwned] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const [hydrated, setHydrated] = useState(false)

  // Restore after mount rather than in useState, so the server-rendered markup
  // and the first client render agree.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(OWNED_KEY)
      if (raw) setOwned(new Set(JSON.parse(raw) as string[]))
    } catch {
      /* corrupt or unavailable storage just means starting empty */
    }
    setHydrated(true)
  }, [])

  // Persist as an effect, and only once restore has run — writing during the
  // first render would clobber the stored selection with an empty set.
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(OWNED_KEY, JSON.stringify([...owned]))
    } catch {
      /* selection still works for this session */
    }
  }, [owned, hydrated])

  /**
   * Functional update, not `new Set(owned)`: several cells can be clicked
   * faster than React re-renders, and reading `owned` from the closure makes
   * every click in that window see the same stale set, so only the last sticks.
   */
  const toggleOwned = useCallback((id: string) => {
    setOwned((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  /*
   * Open a narrow screen slightly zoomed out, but floored at 0.6.
   *
   * Not fit-to-width: on a 414px phone that computes to 0.17, which draws the
   * whole roadmap at once with 2px labels — the same view in the sense that a
   * thumbnail is the same view. 0.6 keeps acronyms legible and shows two or
   * three columns, which is enough to compare a cert against its neighbours,
   * and the chart pans for the rest. The Fit button still goes all the way out
   * when the shape is what you want rather than the names.
   */
  useEffect(() => {
    const full = GUTTER + domains.length * COL_W
    const fit = (window.innerWidth - 32) / full
    if (fit < 1) setZoom(Math.max(0.6, Math.round(fit * 20) / 20))
  }, [domains.length])

  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  const tierOf = useCallback(
    (level: number) => tiers.find((t) => level >= t.min && level <= t.max) ?? tiers[0],
    [tiers],
  )

  const filterCtx = useMemo(
    () => ({
      bandLabel: (domain: string) => domains.find((d) => d.id === domain)?.bandLabel ?? '',
      domainLabel: (domain: string) => domains.find((d) => d.id === domain)?.label ?? domain,
      tierLabel: (level: number) => tierOf(level).label,
      domainLabels: domains.map((d) => d.label),
      bandLabels: [...new Set(domains.map((d) => d.bandLabel))],
      tierLabels: [...tiers].sort((a, b) => b.max - a.max).map((t) => t.label),
    }),
    [domains, tiers, tierOf],
  )

  const fields = useMemo(() => buildFields(certs, filterCtx), [certs, filterCtx])

  const expression = useMemo(() => describe(filter, fields), [filter, fields])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return certs.filter((c) => {
      if (!showRetired && c.status === 'retired') return false
      if (!evaluate(c, filter, fields, filterCtx)) return false
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        c.fullName.toLowerCase().includes(q) ||
        c.vendor.toLowerCase().includes(q) ||
        (c.examCode ?? '').toLowerCase().includes(q) ||
        (c.courseCode ?? '').toLowerCase().includes(q)
      )
    })
  }, [certs, query, filter, fields, filterCtx, showRetired])

  const byDomain = useMemo(() => {
    const m = new Map<string, Cert[]>()
    for (const d of domains) m.set(d.id, [])
    for (const c of visible) m.get(c.domain)?.push(c)
    for (const list of m.values()) list.sort((a, b) => b.level - a.level)
    return m
  }, [visible, domains])

  /** How many visible certs sit behind each dropdown option. */
  const optionCounts = useMemo(() => {
    const out = new Map<string, Map<string, number>>()
    for (const key of QUICK_FIELDS) {
      const f = fields.find((x) => x.key === key)
      if (!f) continue
      const m = new Map<string, number>()
      for (const c of visible) {
        const v = f.get(c, filterCtx)
        if (typeof v === 'string' && v) m.set(v, (m.get(v) ?? 0) + 1)
      }
      out.set(key, m)
    }
    return out
  }, [fields, visible, filterCtx])

  const colIndex = useMemo(() => new Map(domains.map((d, i) => [d.id, i])), [domains])

  /**
   * Two different counts, and the header must show the one you can verify.
   *
   * `drawn` is how many cells the column actually contains — its own certs plus
   * any wide cell passing through it. `alsoCovers` is certs that name the domain
   * in `adjacentDomains` but are drawn elsewhere, which is real coverage but
   * invisible here. Adding them together produced a header saying 67 above a
   * column holding 51 cells, and a number you cannot count is worse than a
   * narrow one. So `drawn` goes in the header and `alsoCovers` in the tooltip.
   */
  const { drawn, alsoCovers } = useMemo(() => {
    const drawn = new Map<string, number>()
    const alsoCovers = new Map<string, number>()
    for (const c of visible) {
      const s = spanFor(c, colIndex, domains.length)
      const inCell = new Set<string>()
      if (s) {
        for (let i = s.start; i < s.start + s.span; i++) {
          const id = domains[i]?.id
          if (id) {
            inCell.add(id)
            drawn.set(id, (drawn.get(id) ?? 0) + 1)
          }
        }
      }
      for (const a of c.adjacentDomains)
        if (!inCell.has(a)) alsoCovers.set(a, (alsoCovers.get(a) ?? 0) + 1)
    }
    return { drawn, alsoCovers }
  }, [visible, colIndex, domains])

  const { placements, bands: tierBands, rows } = useMemo(
    () => layoutGrid(visible, colIndex, domains.length, tiers),
    [visible, colIndex, domains.length, tiers],
  )

  const height = rows * ROW_PITCH + CELL_H

  const exportImage = useCallback(async () => {
    setExporting(true)
    try {
      // Export the whole roadmap rather than only the selected certs: the point
      // of the picture is showing where you sit on the map, which needs the map.
      const all = layoutGrid(
        certs.filter((c) => c.status !== 'retired' || owned.has(c.id)),
        colIndex,
        domains.length,
        tiers,
      )
      await downloadRoadmapPng(
        {
          domains: domains.map((d) => ({
            id: d.id,
            label: d.label,
            band: d.band,
            bandLabel: d.bandLabel,
          })),
          bands: all.bands.map((b) => ({
            id: b.id,
            label: b.label,
            startRow: b.startRow,
            rows: b.rows,
          })),
          placements: all.placements.map((p) => ({
            id: p.cert.id,
            name: p.cert.name,
            domain: p.cert.domain,
            retired: p.cert.status === 'retired',
            row: p.row,
            slot: p.slot,
            start: p.start,
            span: p.span,
          })),
          owned,
          totalRows: all.rows,
          geometry: {
            colWidth: COL_W,
            colPad: COL_PAD,
            slots: SLOTS,
            slotGap: SLOT_GAP,
            cellWidth: CELL_W,
            cellHeight: CELL_H,
            rowPitch: ROW_PITCH,
            gutter: GUTTER,
          },
          siteLabel: 'certs.pyaeheinnkyaw.com',
        },
        `my-security-certifications-${new Date().toISOString().slice(0, 10)}.png`,
      )
    } catch (e) {
      console.error('export failed', e)
      setExportError('Could not generate the image in this browser.')
    } finally {
      setExporting(false)
    }
  }, [certs, colIndex, domains, tiers, owned])

  const toggle = (set: Set<string>, key: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set)
    next.has(key) ? next.delete(key) : next.add(key)
    apply(next)
  }

  const bands = useMemo(() => {
    const order: { id: string; label: string; count: number }[] = []
    for (const d of domains) {
      const found = order.find((b) => b.id === d.band)
      if (found) found.count++
      else order.push({ id: d.band, label: d.bandLabel, count: 1 })
    }
    return order
  }, [domains])

  const reset = () => {
    setQuery('')
    setFilter(EMPTY_FILTER)
    setShowRetired(false)
  }

  const filtersOn = query || filter.conditions.length > 0 || showRetired

  return (
    <div className="w-full">
      {/* ---- controls ---- */}
      {/* Sits directly under Base.astro's 48px site bar. */}
      <div className="sticky top-12 z-30 border-b border-[var(--color-edge)] bg-[var(--color-surface)]/95 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2.5">
          {/* Row one: finding things. Row two: narrowing them down.
              Wraps rather than overflowing: the same controls have to fit a
              phone, and the chart below is now the same chart at every width. */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search certs, vendors, course or exam codes…"
              aria-label="Search certifications"
              className="w-full min-w-[200px] flex-1 rounded-md border border-[var(--color-edge)] sm:w-auto bg-[var(--color-surface-2)] px-3 py-1.5 text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-ink-dim)]"
            />

            {QUICK_FIELDS.map((key) => {
              const f = fields.find((x) => x.key === key)
              return f ? (
                <QuickFilter
                  key={key}
                  field={f}
                  state={filter}
                  counts={optionCounts.get(key)}
                  onChange={setFilter}
                />
              ) : null
            })}

            <button
              onClick={() => setEditorOpen((o) => !o)}
              aria-expanded={editorOpen}
              className="whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors"
              style={{
                borderColor: filter.conditions.length ? 'var(--pri-color)' : 'var(--color-edge)',
                background: filter.conditions.length
                  ? 'color-mix(in oklab, var(--pri-color) 15%, transparent)'
                  : 'transparent',
                color: filter.conditions.length ? 'var(--pri-color)' : 'var(--color-ink-dim)',
              }}
            >
              Filter editor
              {filter.conditions.length ? ` · ${filter.conditions.length}` : ''}{' '}
              <span aria-hidden="true" className="text-[9px]">
                {editorOpen ? '▲' : '▼'}
              </span>
            </button>

            <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-[var(--color-ink-dim)]">
              <input
                type="checkbox"
                checked={showRetired}
                onChange={(e) => setShowRetired(e.target.checked)}
                className="accent-[var(--pri-color)]"
              />
              Retired
            </label>

            <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => {
              setPicking((p) => !p)
              setExportError(null)
            }}
            aria-pressed={picking}
            className="rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors"
            style={{
              borderColor: picking ? 'var(--pri-color)' : 'var(--color-edge)',
              background: picking
                ? 'color-mix(in oklab, var(--pri-color) 15%, transparent)'
                : 'transparent',
              color: picking ? 'var(--pri-color)' : 'var(--color-ink-dim)',
            }}
          >
            {picking ? '✓ Selecting my certs' : 'Select my certs'}
          </button>

          {owned.size > 0 ? (
            <>
              <span className="text-xs font-medium tabular-nums text-[var(--pri-color)]">
                {owned.size} held
              </span>
              <button
                onClick={exportImage}
                disabled={exporting}
                className="rounded-md border border-[var(--pri-color)] bg-[var(--pri-color)] px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-60"
              >
                {exporting ? 'Generating…' : 'Save as image'}
              </button>
              <button
                onClick={() => setOwned(new Set())}
                className="rounded-md border border-[var(--color-edge)] px-2.5 py-1.5 text-xs text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                Clear
              </button>
            </>
          ) : null}
            </div>
          </div>
        </div>

        {/* Docked filter bar: the active expression, always visible, with the
            same enable / edit / clear controls Timeline Explorer puts there. */}
        {expression ? (
          <div className="mx-auto mt-2 flex max-w-[1600px] items-center gap-2 rounded-md border border-[var(--color-edge)] bg-[var(--color-surface-2)] px-2.5 py-1.5">
            <input
              type="checkbox"
              checked={filter.enabled}
              onChange={(e) => setFilter({ ...filter, enabled: e.target.checked })}
              aria-label="Enable filter"
              title={filter.enabled ? 'Disable filter' : 'Enable filter'}
              className="accent-[var(--pri-color)]"
            />
            <code
              className="flex-1 truncate font-mono text-[11px]"
              title={expression}
              style={{
                color: filter.enabled ? 'var(--color-ink)' : 'var(--color-ink-faint)',
                textDecoration: filter.enabled ? undefined : 'line-through',
              }}
            >
              {expression}
            </code>
            <button
              onClick={() => setEditorOpen(true)}
              className="whitespace-nowrap text-[11px] text-[var(--pri-color)] hover:underline"
            >
              Edit filter
            </button>
            <button
              onClick={() => setFilter(EMPTY_FILTER)}
              aria-label="Clear filter"
              title="Clear filter"
              className="grid h-5 w-5 place-items-center rounded border border-[var(--color-edge)] text-[11px] text-[var(--color-ink-faint)] hover:border-[var(--pri-color)] hover:text-[var(--pri-color)]"
            >
              ✕
            </button>
          </div>
        ) : null}

        {editorOpen ? (
          <div className="mx-auto mt-2 max-w-[1600px]">
            <FilterBuilder state={filter} fields={fields} onChange={setFilter} />
            {!filter.conditions.length ? (
              <p className="mt-1.5 text-[11px] text-[var(--color-ink-faint)]">
                No conditions yet. Add one, or start from{' '}
                <button
                  className="text-[var(--pri-color)] hover:underline"
                  onClick={() => {
                    const vendor = fields.find((f) => f.key === 'vendor')!
                    setFilter({ ...filter, conditions: [newCondition(vendor)] })
                  }}
                >
                  issuing body
                </button>
                {' or '}
                <button
                  className="text-[var(--pri-color)] hover:underline"
                  onClick={() => {
                    const tier = fields.find((f) => f.key === 'tier')!
                    setFilter({ ...filter, conditions: [newCondition(tier)] })
                  }}
                >
                  tier
                </button>
                .
              </p>
            ) : null}
          </div>
        ) : null}

        {picking || exportError ? (
          <div className="mx-auto mt-2 max-w-[1600px] text-xs text-[var(--color-ink-faint)]">
            {exportError ? (
              <span className="text-[var(--pri-color)]">{exportError}</span>
            ) : (
              <>
                Click any certification to mark it as held, then choose{' '}
                <strong className="text-[var(--color-ink-dim)]">Save as image</strong>. Your
                selection stays in this browser — nothing is uploaded.
              </>
            )}
          </div>
        ) : null}
      </div>

      {certs.length === 0 ? (
        <div className="px-4 py-24 text-center text-sm text-[var(--color-ink-faint)]">
          {/* Visitor-facing, not developer-facing: whoever sees this is reading
              the published site, and there is nothing they can do about it. */}
          <p className="mb-1 text-[var(--color-ink-dim)]">The roadmap could not be loaded.</p>
          <p>Please try refreshing. If it keeps happening, the site is broken and not you.</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="px-4 py-24 text-center text-sm text-[var(--color-ink-faint)]">
          No certifications match those filters.
        </p>
      ) : (
        <Chart
          zoom={zoom}
          onZoom={setZoom}
          domains={domains}
          byDomain={byDomain}
          placements={placements}
          tierBands={tierBands}
          alsoCovers={alsoCovers}
          drawn={drawn}
          height={height}
          owned={owned}
          picking={picking}
          onSelect={(c) => (picking ? toggleOwned(c.id) : setSelected(c))}
        />
      )}

      {selected ? (
        <DetailPanel
          cert={selected}
          domains={domains}
          tier={tierOf(selected.level)}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Chart({
  zoom,
  onZoom,
  domains,
  byDomain,
  placements,
  tierBands,
  alsoCovers,
  drawn,
  height,
  owned,
  picking,
  onSelect,
}: {
  zoom: number
  onZoom: (z: number) => void
  domains: DomainMeta[]
  byDomain: Map<string, Cert[]>
  placements: Placement[]
  tierBands: Band[]
  alsoCovers: Map<string, number>
  drawn: Map<string, number>
  height: number
  owned: Set<string>
  picking: boolean
  onSelect: (c: Cert) => void
}) {
  /**
   * Which cert the pointer is over. Only 7 of the 96 certs with adjacent
   * domains sit in neighbouring columns, so almost none can be drawn as one
   * wide cell — SAL2 covers SOC and Incident Response with Digital Forensics
   * between them. Marking all 89 permanently would be noise, so coverage is
   * revealed on hover instead: the columns a cert reaches into light up.
   */
  const [hovered, setHovered] = useState<Cert | null>(null)
  const covered = new Set(hovered ? [hovered.domain, ...hovered.adjacentDomains] : [])

  const step = (d: number) => onZoom(Math.min(1.5, Math.max(0.25, Math.round((zoom + d) * 20) / 20)))
  const fitAll = () => {
    const full = GUTTER + domains.length * COL_W
    onZoom(Math.min(1.5, Math.max(0.25, Math.round(((window.innerWidth - 32) / full) * 20) / 20)))
  }

  return (
    <div className="chart-scroll overflow-x-auto px-4 pb-16 pt-4">
      {/* Zoom. Pinned to the viewport rather than the chart, so it stays put
          while the chart is panned. */}
      <div
        className="fixed bottom-4 right-4 z-30 flex items-center gap-0.5 rounded-full border border-[var(--color-edge)] bg-[var(--color-surface)]/95 p-1 shadow-lg backdrop-blur"
        style={{ zoom: 'normal' }}
      >
        <button
          onClick={() => step(-0.1)}
          disabled={zoom <= 0.25}
          aria-label="Zoom out"
          className="grid h-8 w-8 place-items-center rounded-full text-base leading-none text-[var(--color-ink-dim)] hover:bg-[var(--color-surface-2)] disabled:opacity-30"
        >
          &#8722;
        </button>
        <button
          onClick={fitAll}
          className="min-w-[3.25rem] rounded-full px-2 py-1 text-[11px] font-medium tabular-nums text-[var(--color-ink-dim)] hover:bg-[var(--color-surface-2)]"
          title="Fit the whole chart to the screen"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => step(0.1)}
          disabled={zoom >= 1.5}
          aria-label="Zoom in"
          className="grid h-8 w-8 place-items-center rounded-full text-base leading-none text-[var(--color-ink-dim)] hover:bg-[var(--color-surface-2)] disabled:opacity-30"
        >
          +
        </button>
      </div>

      {/*
        `zoom`, not `transform: scale()`. A transform makes the scaled element the
        containing block for its descendants, which breaks the sticky column
        headers — and those headers are the only thing telling you which column
        you are looking at once the chart is wider than the screen.
      */}
      <div className="mx-auto" style={{ width: 'max-content', minWidth: '100%', zoom }}>
        {/* band headers */}
        <div className="flex" style={{ marginLeft: GUTTER }}>
          {groupByBand(domains).map((g) => (
            <div
              key={g.band}
              className="mb-1 rounded-t-md border-b-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-widest"
              style={{
                width: g.domains.length * COL_W,
                borderColor: BAND_VAR[g.band],
                color: BAND_VAR[g.band],
                background: `color-mix(in oklab, ${BAND_VAR[g.band]} 10%, transparent)`,
              }}
            >
              {g.bandLabel}
            </div>
          ))}
        </div>

        {/* column headers */}
        {/*
          `top-0`, not a viewport offset: the wrapper's `overflow-x: auto` makes
          it the sticky containing block, so any positive offset would push this
          row *down* over the top of the plot and bury the master-tier certs.
        */}
        <div
          className="flex sticky top-0 z-20 bg-[var(--color-surface)]"
          style={{ marginLeft: GUTTER }}
        >
          {domains.map((d) => (
            <div
              key={d.id}
              title={d.blurb}
              className="border-b px-2 py-2 text-[11px] font-semibold leading-tight transition-colors"
              style={{
                width: COL_W,
                borderColor: covered.has(d.id) ? BAND_VAR[d.band] : 'var(--color-edge)',
                background: covered.has(d.id)
                  ? `color-mix(in oklab, ${BAND_VAR[d.band]} 16%, transparent)`
                  : undefined,
                color: covered.has(d.id) ? BAND_VAR[d.band] : 'var(--color-ink-dim)',
              }}
            >
              {d.label}
              {/* The number of cells in this column — countable on screen. Certs
                  that cover the discipline from another column are named in the
                  tooltip rather than added in, so the figure stays checkable. */}
              <span
                className="ml-1 font-normal text-[var(--color-ink-faint)]"
                title={
                  alsoCovers.get(d.id)
                    ? `${drawn.get(d.id) ?? 0} certifications shown in ${d.label}, and ${alsoCovers.get(d.id)} more cover it from another column`
                    : `${drawn.get(d.id) ?? 0} certifications shown in ${d.label}`
                }
              >
                {drawn.get(d.id) ?? 0}
              </span>
            </div>
          ))}
        </div>

        {/* plot */}
        <div
          className="relative"
          style={{ height, marginLeft: GUTTER, width: domains.length * COL_W }}
        >
          {/* tier bands + axis labels */}
          {tierBands.map((t) => {
            const top = t.startRow * ROW_PITCH
            const h = t.rows * ROW_PITCH
            return (
              <div
                key={t.id}
                className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-[var(--color-edge)]"
                style={{ top, height: h }}
              >
                <span
                  className="absolute -translate-x-full pr-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]"
                  style={{ top: 2 }}
                  title={t.blurb}
                >
                  {t.label}
                </span>
              </div>
            )
          })}

          {/* column rules, drawn under the cells */}
          {domains.map((d, ci) =>
            ci ? (
              <div
                key={d.id}
                className="pointer-events-none absolute top-0 bottom-0 border-l border-[var(--color-edge)]"
                style={{ left: ci * COL_W }}
              />
            ) : null,
          )}

          {placements.map((p) => (
            <CertCell
              key={p.cert.id}
              placement={p}
              band={
                p.cert.span === 'full'
                  ? 'portfolio'
                  : (domains.find((d) => d.id === p.cert.domain)?.band ?? 'offensive')
              }
              owned={owned.has(p.cert.id)}
              picking={picking}
              onSelect={onSelect}
              onHover={setHovered}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function CertCell({
  placement,
  band,
  owned,
  picking,
  onSelect,
  onHover,
}: {
  placement: Placement
  band: string
  owned: boolean
  picking: boolean
  onSelect: (c: Cert) => void
  onHover: (c: Cert | null) => void
}) {
  const { cert, row, slot, start, span } = placement
  const retired = cert.status === 'retired'
  const announced = cert.status === 'announced'
  const spanning = span > 1

  const left = start * COL_W + COL_PAD + (spanning ? 0 : slot * (CELL_W + SLOT_GAP))
  const width = spanning ? span * COL_W - COL_PAD * 2 : CELL_W

  return (
    <button
      onClick={() => onSelect(cert)}
      onMouseEnter={() => onHover(cert)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(cert)}
      onBlur={() => onHover(null)}
      role={picking ? 'checkbox' : undefined}
      aria-checked={picking ? owned : undefined}
      title={
        picking
          ? `${owned ? 'Remove' : 'Mark as held'}: ${cert.fullName}`
          : `${cert.fullName} — ${cert.vendor} · level ${cert.level} · ${formatCost(cert)}` +
            (cert.adjacentDomains.length ? ` · also covers ${cert.adjacentDomains.length} more domain${cert.adjacentDomains.length > 1 ? 's' : ''}` : '')
      }
      className="absolute grid place-items-center overflow-hidden rounded border px-1 text-center text-[10px] leading-tight transition-colors hover:z-10 hover:brightness-125"
      style={{
        top: row * ROW_PITCH,
        left,
        width,
        height: CELL_H,
        // A wide cell already says "this spans several columns"; tinting and
        // bolding it as well made breadth read as importance, which it is not.
        borderColor: owned
          ? BAND_VAR[band]
          : `color-mix(in oklab, ${BAND_VAR[band]} 45%, var(--color-edge))`,
        background: owned
          ? BAND_VAR[band]
          : `color-mix(in oklab, ${BAND_VAR[band]} 14%, var(--color-surface-2))`,
        color: owned ? '#fff' : retired ? 'var(--color-ink-faint)' : 'var(--color-ink)',
        textDecoration: retired ? 'line-through' : undefined,
        borderStyle: announced ? 'dashed' : 'solid',
        fontWeight: owned ? 600 : 400,
        // In picking mode, unheld cells recede so the selection is legible.
        opacity: retired && !owned ? 0.55 : picking && !owned ? 0.45 : 1,
        boxShadow: owned ? '0 0 0 1px var(--color-surface)' : undefined,
        cursor: picking ? 'pointer' : undefined,
      }}
    >
      <span className="w-full truncate">{cert.name}</span>
    </button>
  )
}

function DetailPanel({
  cert,
  domains,
  tier,
  onClose,
}: {
  cert: Cert
  domains: DomainMeta[]
  tier: Tier
  onClose: () => void
}) {
  const domain = domains.find((d) => d.id === cert.domain)
  const rows: [string, string][] = [
    ['Vendor', cert.vendor],
    ['Domain', domain?.label ?? cert.domain],
    [
      'Level',
      `${cert.level} / 100 · ${tier.label}` +
        (cert.scoredBy ? ` (scored by ${cert.scoredBy})` : ''),
    ],
    ['Cost', formatCost(cert) + (cert.cost.note ? ` — ${cert.cost.note}` : '')],
    ['Course code', cert.courseCode ?? '—'],
    ['Exam code', cert.examCode ?? '—'],
    ['Format', cert.examFormat ?? '—'],
    [
      'Exam length',
      cert.examHours === null
        ? '—'
        : cert.examHours >= 48 && cert.examHours % 24 === 0
          ? `${cert.examHours / 24} days`
          : `${cert.examHours} hours`,
    ],
    ['Prerequisites', cert.prerequisites.length ? cert.prerequisites.join(', ') : 'None'],
    [
      'Renewal',
      cert.renewal.required
        ? `Every ${cert.renewal.years ?? '?'} years${
            cert.renewal.ceCredits ? ` · ${cert.renewal.ceCredits} CE credits` : ''
          }`
        : 'No renewal required',
    ],
    ['ANSI/ISO 17024', cert.accreditation.ansiIso17024 ? 'Accredited' : 'No'],
    [
      'DoD 8140',
      cert.accreditation.dod8140.length ? cert.accreditation.dod8140.join(', ') : 'Not listed',
    ],
    ['Status', cert.status],
    ['Last verified', cert.lastVerified],
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={cert.fullName}
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-[430px] overflow-y-auto border-l border-[var(--color-edge)] bg-[var(--color-surface)] p-5"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{cert.name}</h2>
            <p className="text-sm text-[var(--color-ink-dim)]">{cert.fullName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded border border-[var(--color-edge)] px-2 py-1 text-sm text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
          >
            ✕
          </button>
        </div>

        <dl className="mb-4 grid grid-cols-[125px_1fr] gap-x-3 gap-y-2 text-[13px]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-[var(--color-ink-faint)]">{k}</dt>
              <dd className="text-[var(--color-ink)]">{v}</dd>
            </div>
          ))}
        </dl>

        {/* Sits directly under the score it explains — most people read a score
            here rather than on the cert's own page. */}
        {cert.levelNote ? (
          <p className="mb-5 rounded-md border-l-2 border-[var(--pri-color)] bg-[var(--color-surface-2)] px-3 py-2.5 text-xs leading-relaxed text-[var(--color-ink-dim)]">
            <strong className="text-[var(--color-ink)]">On this score:</strong> {cert.levelNote}
          </p>
        ) : null}

        {cert.vendorUrl ? (
          <a
            href={cert.vendorUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mb-4 inline-block rounded-md border border-[var(--color-edge)] bg-[var(--color-surface-2)] px-3 py-2 text-sm font-medium hover:border-[var(--color-ink-dim)]"
          >
            Official page ↗
          </a>
        ) : null}

        {cert.sources.length ? (
          <div className="border-t border-[var(--color-edge)] pt-3">
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
              Sources
            </h3>
            <ul className="flex flex-col gap-1">
              {cert.sources.map((s) => (
                <li key={s}>
                  <a
                    href={s}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="break-all text-[11px] text-[var(--color-ink-faint)] underline hover:text-[var(--color-ink-dim)]"
                  >
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>
    </div>
  )
}

function groupByBand(domains: DomainMeta[]) {
  const out: { band: string; bandLabel: string; domains: DomainMeta[] }[] = []
  for (const d of domains) {
    const last = out[out.length - 1]
    if (last && last.band === d.band) last.domains.push(d)
    else out.push({ band: d.band, bandLabel: d.bandLabel, domains: [d] })
  }
  return out
}

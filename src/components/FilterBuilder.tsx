import { useEffect, useMemo, useRef, useState } from 'react'
import {
  OPS_FOR,
  OP_LABEL,
  newCondition,
  type Condition,
  type FieldDef,
  type FilterState,
  type Op,
} from '../lib/filterModel'

const SELECT =
  'rounded border border-[var(--color-edge)] bg-[var(--color-surface-2)] px-1.5 py-1 text-xs text-[var(--color-ink)] outline-none focus:border-[var(--color-ink-dim)]'

/**
 * Multi-select with a search box, the way Timeline Explorer's column filter
 * behaves. Long value lists (26 issuing bodies) are unusable without the search.
 */
function ValuePicker({
  options,
  selected,
  onChange,
}: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const shown = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase())),
    [options, q],
  )

  const label = selected.length
    ? selected.length <= 2
      ? selected.join(', ')
      : `${selected.length} selected`
    : 'Select values…'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${SELECT} min-w-[150px] max-w-[240px] truncate text-left`}
      >
        {label} <span className="text-[9px]">▼</span>
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-[60] mt-1 max-h-64 w-60 overflow-y-auto rounded-md border border-[var(--color-edge)] bg-[var(--color-surface)] p-1 shadow-lg">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search values…"
            className="mb-1 w-full rounded border border-[var(--color-edge)] bg-[var(--color-surface-2)] px-2 py-1 text-xs outline-none"
          />
          <div className="flex gap-1 px-1 pb-1 text-[10px] text-[var(--color-ink-faint)]">
            <button className="hover:underline" onClick={() => onChange([...options])}>
              Select all
            </button>
            <span>·</span>
            <button className="hover:underline" onClick={() => onChange([])}>
              Clear
            </button>
          </div>
          {shown.map((o) => (
            <label
              key={o}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-[var(--color-surface-2)]"
            >
              <input
                type="checkbox"
                checked={selected.includes(o)}
                onChange={() =>
                  onChange(
                    selected.includes(o) ? selected.filter((s) => s !== o) : [...selected, o],
                  )
                }
                className="accent-[var(--pri-color)]"
              />
              <span className="truncate">{o}</span>
            </label>
          ))}
          {!shown.length ? (
            <p className="px-2 py-1 text-xs text-[var(--color-ink-faint)]">No matches.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/**
 * One-click dropdown for a common field. It is not a parallel filtering system:
 * it reads and writes the same `anyOf` condition the builder would create, so
 * picking two vendors here shows up as a condition in the editor and in the
 * expression bar, and edits made there flow back to the dropdown.
 */
export function QuickFilter({
  field,
  state,
  counts,
  onChange,
}: {
  field: FieldDef
  state: FilterState
  /** How many currently-visible certs each option matches. */
  counts?: Map<string, number>
  onChange: (s: FilterState) => void
}) {
  const existing = state.conditions.find((c) => c.field === field.key && c.op === 'anyOf')
  const selected = existing?.values ?? []

  const apply = (values: string[]) => {
    if (!values.length) {
      onChange({ ...state, conditions: state.conditions.filter((c) => c !== existing) })
      return
    }
    if (existing) {
      onChange({
        ...state,
        conditions: state.conditions.map((c) => (c === existing ? { ...c, values } : c)),
      })
      return
    }
    const c = newCondition(field)
    onChange({ ...state, conditions: [...state.conditions, { ...c, op: 'anyOf', values }] })
  }

  return (
    <QuickPicker
      label={field.label}
      options={field.options ?? []}
      counts={counts}
      selected={selected}
      onChange={apply}
    />
  )
}

function QuickPicker({
  label,
  options,
  counts,
  selected,
  onChange,
}: {
  label: string
  options: string[]
  counts?: Map<string, number>
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const shown = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase())),
    [options, q],
  )
  const on = selected.length > 0

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-1 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors"
        style={{
          borderColor: on ? 'var(--pri-color)' : 'var(--color-edge)',
          background: on ? 'color-mix(in oklab, var(--pri-color) 15%, transparent)' : 'transparent',
          color: on ? 'var(--pri-color)' : 'var(--color-ink-dim)',
        }}
      >
        {label}
        {on ? ` · ${selected.length}` : ''}
        <span aria-hidden="true" className="text-[9px]">
          ▼
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-[60] mt-1 max-h-72 w-60 overflow-y-auto rounded-md border border-[var(--color-edge)] bg-[var(--color-surface)] p-1 shadow-lg">
          {options.length > 8 ? (
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="mb-1 w-full rounded border border-[var(--color-edge)] bg-[var(--color-surface-2)] px-2 py-1 text-xs outline-none"
            />
          ) : null}
          {on ? (
            <button
              onClick={() => onChange([])}
              className="mb-1 w-full rounded px-2 py-1 text-left text-[10px] text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
            >
              Clear {label.toLowerCase()}
            </button>
          ) : null}
          {shown.map((o) => (
            <label
              key={o}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-[var(--color-surface-2)]"
            >
              <input
                type="checkbox"
                checked={selected.includes(o)}
                onChange={() =>
                  onChange(
                    selected.includes(o) ? selected.filter((s) => s !== o) : [...selected, o],
                  )
                }
                className="accent-[var(--pri-color)]"
              />
              <span className="flex-1 truncate">{o}</span>
              {counts ? (
                <span className="tabular-nums text-[var(--color-ink-faint)]">
                  {counts.get(o) ?? 0}
                </span>
              ) : null}
            </label>
          ))}
          {!shown.length ? (
            <p className="px-2 py-1 text-xs text-[var(--color-ink-faint)]">No matches.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function ConditionRow({
  condition,
  fields,
  onChange,
  onRemove,
}: {
  condition: Condition
  fields: FieldDef[]
  onChange: (c: Condition) => void
  onRemove: () => void
}) {
  const field = fields.find((f) => f.key === condition.field) ?? fields[0]
  const ops = OPS_FOR[field.type]
  const needsValue = !['blank', 'notBlank', 'isTrue', 'isFalse'].includes(condition.op)
  const isMulti = condition.op === 'anyOf' || condition.op === 'noneOf'

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        value={condition.field}
        onChange={(e) => {
          const next = fields.find((f) => f.key === e.target.value)!
          // Operators are type-specific, so switching field resets the operator
          // rather than leaving "is greater than" on a text field.
          onChange({ ...condition, field: next.key, op: OPS_FOR[next.type][0], value: '', values: [] })
        }}
        className={`${SELECT} min-w-[130px]`}
        aria-label="Field"
      >
        {fields.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        value={condition.op}
        onChange={(e) => onChange({ ...condition, op: e.target.value as Op })}
        className={`${SELECT} min-w-[125px]`}
        aria-label="Operator"
      >
        {ops.map((o) => (
          <option key={o} value={o}>
            {OP_LABEL[o]}
          </option>
        ))}
      </select>

      {needsValue && isMulti && field.options ? (
        <ValuePicker
          options={field.options}
          selected={condition.values}
          onChange={(values) => onChange({ ...condition, values })}
        />
      ) : needsValue && field.type === 'enum' && field.options ? (
        <select
          value={condition.value}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          className={`${SELECT} min-w-[150px]`}
          aria-label="Value"
        >
          <option value="">Select…</option>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : needsValue ? (
        <>
          <input
            type={field.type === 'number' ? 'number' : 'text'}
            value={condition.value}
            onChange={(e) => onChange({ ...condition, value: e.target.value })}
            placeholder="Value"
            aria-label="Value"
            className={`${SELECT} w-28`}
          />
          {condition.op === 'between' ? (
            <>
              <span className="text-xs text-[var(--color-ink-faint)]">and</span>
              <input
                type="number"
                value={condition.value2}
                onChange={(e) => onChange({ ...condition, value2: e.target.value })}
                placeholder="Value"
                aria-label="Upper bound"
                className={`${SELECT} w-28`}
              />
            </>
          ) : null}
        </>
      ) : null}

      <button
        onClick={onRemove}
        aria-label="Remove condition"
        title="Remove condition"
        className="grid h-6 w-6 place-items-center rounded border border-[var(--color-edge)] text-xs text-[var(--color-ink-faint)] hover:border-[var(--pri-color)] hover:text-[var(--pri-color)]"
      >
        ✕
      </button>
    </div>
  )
}

export default function FilterBuilder({
  state,
  fields,
  onChange,
}: {
  state: FilterState
  fields: FieldDef[]
  onChange: (s: FilterState) => void
}) {
  const set = (patch: Partial<FilterState>) => onChange({ ...state, ...patch })

  return (
    <div className="rounded-md border border-[var(--color-edge)] bg-[var(--color-surface-2)] p-2.5">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-dim)]">
        <span>Match</span>
        <select
          value={state.match}
          onChange={(e) => set({ match: e.target.value as 'all' | 'any' })}
          className={SELECT}
          aria-label="Match all or any condition"
        >
          <option value="all">all conditions (And)</option>
          <option value="any">any condition (Or)</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        {state.conditions.map((c) => (
          <ConditionRow
            key={c.id}
            condition={c}
            fields={fields}
            onChange={(next) =>
              set({ conditions: state.conditions.map((x) => (x.id === c.id ? next : x)) })
            }
            onRemove={() => set({ conditions: state.conditions.filter((x) => x.id !== c.id) })}
          />
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={() => set({ conditions: [...state.conditions, newCondition(fields[0])] })}
          className="rounded border border-[var(--color-edge)] px-2 py-1 text-xs font-medium text-[var(--color-ink-dim)] hover:border-[var(--pri-color)] hover:text-[var(--pri-color)]"
        >
          + Add condition
        </button>
        {state.conditions.length ? (
          <button
            onClick={() => set({ conditions: [] })}
            className="text-xs text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]"
          >
            Remove all
          </button>
        ) : null}
      </div>
    </div>
  )
}

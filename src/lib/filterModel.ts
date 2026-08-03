/**
 * Structured filtering, modelled on Eric Zimmerman's Timeline Explorer.
 *
 * The chip row it replaces could express exactly four things. This can express
 * any combination of field, operator and value — "vendor is any of GIAC/OffSec
 * and level > 70 and format is not multiple-choice" — and renders the result as
 * a readable expression so the active filter is never a mystery.
 */
import type { Cert } from '../schema'

export type FieldType = 'text' | 'number' | 'enum' | 'bool'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  /** Enum choices, in the order they should be offered. */
  options?: string[]
  /** Pulls the comparable value off a cert. */
  get: (cert: Cert, ctx: FilterContext) => string | number | boolean | null
}

/**
 * Label lookups, not id lookups. Filter values are the human-readable strings
 * shown in the dropdown — "Digital Forensics", not "forensics" — because the
 * value in a condition is also what gets printed in the expression bar.
 */
export interface FilterContext {
  bandLabel: (domain: string) => string
  domainLabel: (domain: string) => string
  tierLabel: (level: number) => string
  /** All labels, in render order, for the enum option lists. */
  domainLabels: string[]
  bandLabels: string[]
  tierLabels: string[]
}

export type Op =
  | 'eq' | 'neq'
  | 'contains' | 'ncontains' | 'startsWith' | 'endsWith'
  | 'gt' | 'gte' | 'lt' | 'lte' | 'between'
  | 'anyOf' | 'noneOf'
  | 'blank' | 'notBlank'
  | 'isTrue' | 'isFalse'

export const OP_LABEL: Record<Op, string> = {
  eq: 'equals',
  neq: 'does not equal',
  contains: 'contains',
  ncontains: 'does not contain',
  startsWith: 'begins with',
  endsWith: 'ends with',
  gt: 'is greater than',
  gte: 'is at least',
  lt: 'is less than',
  lte: 'is at most',
  between: 'is between',
  anyOf: 'is any of',
  noneOf: 'is none of',
  blank: 'is blank',
  notBlank: 'is not blank',
  isTrue: 'is yes',
  isFalse: 'is no',
}

export const OPS_FOR: Record<FieldType, Op[]> = {
  text: ['contains', 'ncontains', 'eq', 'neq', 'startsWith', 'endsWith', 'blank', 'notBlank'],
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'blank', 'notBlank'],
  enum: ['anyOf', 'noneOf', 'eq', 'neq'],
  bool: ['isTrue', 'isFalse'],
}

export interface Condition {
  id: string
  field: string
  op: Op
  /** Single-value operators. */
  value: string
  /** Upper bound for `between`. */
  value2: string
  /** Multi-value operators (`anyOf` / `noneOf`). */
  values: string[]
}

export interface FilterState {
  enabled: boolean
  match: 'all' | 'any'
  conditions: Condition[]
}

export const EMPTY_FILTER: FilterState = { enabled: true, match: 'all', conditions: [] }

/** Build the field registry from the loaded dataset so enums list real values. */
export function buildFields(certs: Cert[], ctx: FilterContext): FieldDef[] {
  const uniq = (fn: (c: Cert) => string | null | undefined) =>
    [...new Set(certs.map(fn).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b))

  return [
    { key: 'name', label: 'Name', type: 'text', get: (c) => c.name },
    { key: 'fullName', label: 'Full name', type: 'text', get: (c) => c.fullName },
    {
      key: 'vendor', label: 'Issuing body', type: 'enum',
      options: uniq((c) => c.vendor), get: (c) => c.vendor,
    },
    {
      key: 'domain', label: 'Domain', type: 'enum',
      options: ctx.domainLabels, get: (c, x) => x.domainLabel(c.domain),
    },
    {
      key: 'band', label: 'Band', type: 'enum',
      options: ctx.bandLabels, get: (c, x) => x.bandLabel(c.domain),
    },
    {
      key: 'tier', label: 'Tier', type: 'enum',
      options: ctx.tierLabels, get: (c, x) => x.tierLabel(c.level),
    },
    { key: 'level', label: 'Level', type: 'number', get: (c) => c.level },
    { key: 'price', label: 'Price', type: 'number', get: (c) => c.cost.amount },
    {
      key: 'currency', label: 'Currency', type: 'enum',
      options: uniq((c) => c.cost.currency), get: (c) => c.cost.currency,
    },
    {
      key: 'examFormat', label: 'Exam format', type: 'enum',
      options: uniq((c) => c.examFormat), get: (c) => c.examFormat,
    },
    { key: 'examHours', label: 'Exam hours', type: 'number', get: (c) => c.examHours },
    { key: 'passingScore', label: 'Passing score', type: 'number', get: (c) => c.passingScore },
    { key: 'courseCode', label: 'Course code', type: 'text', get: (c) => c.courseCode },
    { key: 'examCode', label: 'Exam code', type: 'text', get: (c) => c.examCode },
    {
      key: 'status', label: 'Status', type: 'enum',
      options: ['active', 'retired', 'announced'], get: (c) => c.status,
    },
    {
      key: 'renewalYears', label: 'Renewal (years)', type: 'number',
      get: (c) => (c.renewal.required ? c.renewal.years : null),
    },
    { key: 'ansi', label: 'ANSI/ISO 17024', type: 'bool', get: (c) => c.accreditation.ansiIso17024 },
    { key: 'scoredBy', label: 'Scored by', type: 'text', get: (c) => c.scoredBy },
  ]
}

export function newCondition(field: FieldDef): Condition {
  return {
    // Date.now is fine here — ids only need to be unique within a session.
    id: `${field.key}-${Math.random().toString(36).slice(2, 9)}`,
    field: field.key,
    op: OPS_FOR[field.type][0],
    value: '',
    value2: '',
    values: [],
  }
}

function testOne(raw: string | number | boolean | null, c: Condition): boolean {
  switch (c.op) {
    case 'blank':
      return raw === null || raw === ''
    case 'notBlank':
      return raw !== null && raw !== ''
    case 'isTrue':
      return raw === true
    case 'isFalse':
      return raw !== true
  }

  if (raw === null) return false

  if (c.op === 'anyOf' || c.op === 'noneOf') {
    // An empty selection is not a filter — treat it as "no constraint" rather
    // than as "match nothing", which would blank the chart while you are still
    // picking values.
    if (!c.values.length) return true
    const hit = c.values.includes(String(raw))
    return c.op === 'anyOf' ? hit : !hit
  }

  const numeric = typeof raw === 'number'
  if (numeric) {
    const n = Number(c.value)
    const n2 = Number(c.value2)
    if (c.value === '' || Number.isNaN(n)) return true
    switch (c.op) {
      case 'eq': return raw === n
      case 'neq': return raw !== n
      case 'gt': return raw > n
      case 'gte': return raw >= n
      case 'lt': return raw < n
      case 'lte': return raw <= n
      case 'between':
        return c.value2 === '' || Number.isNaN(n2) ? raw >= n : raw >= n && raw <= n2
    }
  }

  if (c.value === '') return true
  const hay = String(raw).toLowerCase()
  const needle = c.value.toLowerCase()
  switch (c.op) {
    case 'eq': return hay === needle
    case 'neq': return hay !== needle
    case 'contains': return hay.includes(needle)
    case 'ncontains': return !hay.includes(needle)
    case 'startsWith': return hay.startsWith(needle)
    case 'endsWith': return hay.endsWith(needle)
  }
  return true
}

export function evaluate(
  cert: Cert,
  state: FilterState,
  fields: FieldDef[],
  ctx: FilterContext,
): boolean {
  if (!state.enabled || !state.conditions.length) return true
  const results = state.conditions.map((c) => {
    const f = fields.find((x) => x.key === c.field)
    return f ? testOne(f.get(cert, ctx), c) : true
  })
  return state.match === 'all' ? results.every(Boolean) : results.some(Boolean)
}

/** Render the active filter the way Timeline Explorer prints it along the bottom. */
export function describe(state: FilterState, fields: FieldDef[]): string {
  if (!state.conditions.length) return ''
  const join = state.match === 'all' ? ' And ' : ' Or '
  return state.conditions
    .map((c) => {
      const f = fields.find((x) => x.key === c.field)
      const label = f?.label ?? c.field
      const op = OP_LABEL[c.op]
      if (c.op === 'blank' || c.op === 'notBlank' || c.op === 'isTrue' || c.op === 'isFalse')
        return `[${label}] ${op}`
      if (c.op === 'anyOf' || c.op === 'noneOf')
        return `[${label}] ${op} (${c.values.join(', ') || '…'})`
      if (c.op === 'between') return `[${label}] ${op} ${c.value || '…'} and ${c.value2 || '…'}`
      return `[${label}] ${op} "${c.value}"`
    })
    .join(join)
}

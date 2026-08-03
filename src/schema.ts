import { z } from 'zod'
import taxonomy from '../data/taxonomy.json' with { type: 'json' }

export const DOMAIN_IDS = taxonomy.bands.flatMap((b) => b.domains.map((d) => d.id)) as [
  string,
  ...string[],
]

export const BANDS = taxonomy.bands
export const TIERS = taxonomy.tiers

/** Flat, render-ordered domain list with its band attached. */
export const DOMAINS = taxonomy.bands.flatMap((band) =>
  band.domains.map((d) => ({ ...d, band: band.id, bandLabel: band.label })),
)

export const domainId = z.enum(DOMAIN_IDS)

export const costSchema = z.object({
  amount: z.number().nonnegative().nullable(),
  currency: z.string().default('USD'),
  note: z.string().nullable().default(null),
})

export const certSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'id must be kebab-case'),
    name: z.string().min(1),
    fullName: z.string().min(1),
    vendor: z.string().min(1),
    vendorUrl: z.string().url().nullable(),
    domain: domainId,
    adjacentDomains: z.array(domainId).max(2).default([]),
    /**
     * How wide the chart draws this credential.
     *
     *   none      a single cell in its own column (the default)
     *   adjacent  one cell spanning `domain` plus `adjacentDomains`, which must
     *             be contiguous columns — for credentials that are genuinely
     *             co-equal across those disciplines, like OSCE³ or GCFA
     *   full      a band across the entire chart, for portfolio credentials
     *             assembled from anywhere in the catalogue (GSE, GSP)
     *
     * Deliberately explicit rather than inferred from `adjacentDomains`: plenty
     * of certs touch a neighbouring column without being of it, and inferring
     * turned a third of the dataset into banners.
     */
    span: z.enum(['none', 'adjacent', 'full']).default('none'),
    level: z.number().int().min(0).max(100),
    /**
     * Who set the current `level`. Attribution travels with the score because
     * the score is an opinion, and readers deserve to know whose. Update it
     * whenever you change `level` — a stale attribution credits the wrong
     * person for your judgement.
     */
    scoredBy: z.string().nullable().default(null),
    /**
     * Why this score departs from what the exam format alone would suggest.
     * Without it, a later contributor applying the scoring rules mechanically
     * will "correct" a deliberate exception straight back out again.
     */
    levelNote: z.string().nullable().default(null),
    cost: costSchema,
    /**
     * The training course, where the body sells one: SANS SEC504, OffSec
     * PEN-200. Distinct from `examCode` because for GIAC and OffSec the code
     * everyone quotes identifies the course, not the exam.
     */
    courseCode: z.string().nullable().default(null),
    /** The exam itself, where it is separately identified: SY0-701, 312-49. */
    examCode: z.string().nullable().default(null),
    examFormat: z
      .enum(['practical', 'multiple-choice', 'hybrid', 'oral', 'portfolio'])
      .nullable()
      .default(null),
    examHours: z.number().positive().nullable().default(null),
    /** Published minimum passing score, as a percentage. Null where unpublished. */
    passingScore: z.number().min(0).max(100).nullable().default(null),
    prerequisites: z.array(z.string()).default([]),
    renewal: z
      .object({
        required: z.boolean(),
        years: z.number().positive().nullable().default(null),
        ceCredits: z.number().nonnegative().nullable().default(null),
      })
      .default({ required: false, years: null, ceCredits: null }),
    accreditation: z
      .object({
        ansiIso17024: z.boolean().default(false),
        dod8140: z.array(z.string()).default([]),
      })
      .default({ ansiIso17024: false, dod8140: [] }),
    status: z.enum(['active', 'retired', 'announced']).default('active'),
    lastVerified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'lastVerified must be YYYY-MM-DD'),
    sources: z.array(z.string().url()).default([]),
  })
  .strict()
  .refine((c) => !c.adjacentDomains.includes(c.domain), {
    message: 'adjacentDomains must not repeat the primary domain',
    path: ['adjacentDomains'],
  })

export type Cert = z.infer<typeof certSchema>
export type Domain = (typeof DOMAINS)[number]

/** Map a 0-100 level score onto its named tier. */
export function tierFor(level: number) {
  return TIERS.find((t) => level >= t.min && level <= t.max) ?? TIERS[0]
}

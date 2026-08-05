# Contributing

Two things make this project work: every claim is sourced, and the subjective parts are argued in
public rather than decided in private.

## Adding or correcting a certification

**The easiest route is a form — no account setup, no tooling, no JSON.**

- [Add a certification](../../issues/new?template=new-certification.yml)
- [Correct a field](../../issues/new?template=correction.yml) — price, format, URL, status
- [Dispute a score](../../issues/new?template=level-dispute.yml)

If you would rather edit the data yourself:

1. Open the JSON file for its **issuing body** in `data/certs/` — one file per body, a new body
   gets a new file — and edit it straight in the GitHub web editor.
2. Open a pull request. Include the vendor page you used as a source.
3. CI validates it: schema, duplicate ids, unknown domains, mixed issuing bodies and dead links
   are all caught automatically and reported on the PR. **You do not need to install or run
   anything.**

Files are grouped by issuing body because that is how the data is sourced and how it goes stale —
when GIAC re-prices its catalogue, one file changes. Which **column** a cert appears in comes from
its own `domain` field, never from the filename, so moving a cert between columns is a one-word
edit.

Every field must be traceable to a primary source — the certification body's own page. Blog posts,
training-provider marketing, and aggregator sites are not sources. If you cannot verify a field,
set it to `null`. **A missing price is more useful than a wrong one.**

Set `lastVerified` to the date you actually checked the vendor page, in `YYYY-MM-DD`.

## Scope

This roadmap covers **technical** certifications only.

**In scope:** credentials that require demonstrable hands-on skill — offensive, defensive,
forensic, engineering, cloud, OT, and AI security.

**Out of scope:** governance, risk, compliance, audit, privacy, and project management. CISSP,
CISM, CISA, CRISC, CGRC, CIPP/CIPT, ISO 27001 lead auditor/implementer, PCI QSA, ITIL, PMP, and
TOGAF are deliberately excluded. This is not a judgement about their value — they are simply a
different chart.

**The test:** if more than half of the exam is policy, process, or paperwork, it is out.

**Also out of scope:** training courses, lab subscriptions, and learning paths that do not issue a
credential backed by an assessment.

Submitted work is not the test — **a credential is.** Intel-Ops' *Hunting Adversary Infrastructure*
is the worked example: its nine assignments are real analysis against live adversary infrastructure,
uploaded for review, and the material is excellent. But there is no pass mark, no proctor, and no
certificate; the syllabus calls it a training course and progress is self-marked. Nothing here
ranks it, because a roadmap of certifications has nothing to rank. If a graded credential is added,
it belongs in the chart.

### Columns we deliberately do not have

Red teaming, network security, and identity are real specialisms, but as *columns* they split hairs
that the certification market does not. Adversary-simulation certs sit in **Penetration Testing**;
network and identity engineering certs sit in **Security Engineering & Architecture**. Use
`adjacentDomains` to record the overlap. Proposals to add a column should show at least five
credentials that are a poor fit for every existing one.

## Level scores

`level` is an integer from 0–100 describing **the depth a credential demands**, calibrated against
these fixed anchors. Do not change the anchors without a separate discussion issue.

| Score | Anchor |
| --- | --- |
| 97 | GSE — portfolio of ten GIAC certs including four hands-on Applied Knowledge exams |
| 93 | OSEE |
| 91 | GSP — portfolio of five GIAC certs, so it outranks any single GX- practical |
| 88 | OSCE³ — ceiling for a single course-backed credential |
| 87 | GX-FA — top of the GIAC experienced tier, no course behind it |
| 84 | GXPN · OSEP |
| 79 | GREM · OSWE · CFCE |
| 77 | GCFA — FOR508, Intermediate |
| 71 | CPTS |
| 69 | OSCP |
| 67 | GPEN · CDSA |
| 64 | GIME — documented exception, see below |
| 63 | GCFE |
| 48 | GSEC — SEC401, Essentials |
| 44 | CCDL1 — top of the Associate band |
| 43 | BTL1 |
| 41 | SAL1 |
| 40 | CySA+ · PenTest+ — top of the paper tier |
| 33 | Security+ |
| 20 | ISC² CC |
| 12 | SC-900 · vendor fundamentals |

No pure multiple-choice exam reaches the top of the paper tier by training weight alone. A deep
course lifts a knowledge exam — GWEB sits above GPYC because SANS rates SEC522 Advanced — but it
does not move it into the hands-on bands.

### How a score is built

    level = assessment + training + gating

**Assessment** is the difficulty of what the candidate must demonstrate, on **one scale for every
issuing body**. This is the part that was broken for a long time and is worth stating plainly,
because the failure repeats if the reasoning is lost: `exam-only` used to mean total-minus-bonus
for bodies that bundle training, and *whatever made the total look right* for bodies that do not.
Market positioning leaked into the one number that describes the exam. That is how a 90-minute
CrowdStrike paper came to be scored at 50 while a 24-hour live network investigation scored 38 —
and it is the single root cause behind a long run of separate-looking complaints: GIME over the
hands-on GIAC exams, eCTHP over GCTI, CEH Practical over PNPT, CTIA level with a 72-hour practical,
CySA+ and SC-200 over BTL1 and SAL1.

Knowledge exams are scored on this scale regardless of who sells them:

| Range | What it is |
| --- | --- |
| 10–16 | vendor fundamentals |
| 18–24 | entry syllabus, ~2h |
| 24–30 | product practitioner, 1–2h |
| 30–36 | professional syllabus, 2–3h |
| 34–40 | broad professional, 3–4h |
| 36–44 | hybrid with genuine performance-based questions |

GIAC's multiple-choice exams are scored on their own band, above the vendor papers and below the
hands-on tier. Treating them as ordinary papers was wrong: 75–115 questions drawn from a five- or
six-day instructor-led course is not a 90-minute product exam, and the absence of CyberLive should
keep them under the hands-on exams rather than drop them among the vendor ones. Each is banded by
the level SANS publishes for the course behind it:

| Course level | Exam band | Examples |
| --- | --- | --- |
| Beginner | 41 | GCLD (SEC388) |
| Essentials | 46–50 | GSOC, GOSI, GBFA, GPCS, GCIP, GASF |
| Intermediate | 53–55 | GCPN, GAWN, GMOB, GCDA, GCTD, GRID, GDSA, GCSA |
| Advanced | 56–58 | GDAT, GCAD, GWEB, GPYC |

And one floor applies on the other side: **a paper does not outrank a hands-on credential of
comparable syllabus level.** The qualifier matters and was missing at first, which made the rule
overshoot. A GIAC paper sitting behind an Advanced six-day SANS course legitimately outranks an
entry-level 24-hour lab exam — GDAT above BTL1 is not an inversion, it is two different tiers of
credential. What the rule forbids is a paper outranking a hands-on exam *pitched at the same
level*: CySA+ over BTL1, CTIA over a 72-hour practical, a 90-minute product exam over anything at
all.

Duration is an input to assessment, not the driver. A 6-hour CREST exam requiring 60% in two
independently-marked sections is harder than a 24-hour lab with generous scheduling.

**Gating** is what the body makes you hold or prove before you may sit, and it is scored separately
rather than smuggled into the exam figure. CPSA is a hard prerequisite for CRT and CPIA for CRIA;
ISC²'s concentrations require CISSP plus two further years; the GIAC experienced tier requires the
base certification. Without this component those credentials could only be placed by inflating
their exam score, which is exactly what went wrong.

### What `level` measures

**The depth a credential demands — not only how the exam checks it.** Those are different things,
and scoring only the exam gets it badly wrong. GCIH is examined in four hours, but earning it
means working through SEC504: six days, 38 CPEs, 44 labs. A seven-day platform exam with a
lighter path behind it is not automatically the deeper credential.

The training component uses **each body's own published rating of its training**, per certification —
not a blanket assumption about the vendor. Those ratings share a four-point shape, so they map onto
a common scale:

| Tier | SANS | OffSec | HTB Academy | Others |
| --- | --- | --- | --- | --- |
| 0 | Beginner | Beginner / 100-level | Easy / Fundamental | entry path |
| 1 | Essentials | 200-level | — | essentials courseware |
| 2 | Intermediate | Intermediate | Medium | intermediate courseware |
| 3 | Advanced | Advanced / Expert | Hard | advanced programme |

Published ratings routinely overturn assumptions, which is the point of using them: FOR585
*Advanced* Smartphone Forensics is rated **Essentials** by SANS, SEC573 and SEC522 are **Advanced**,
OffSec's IR-200 is **Beginner** at 34 hours while EXP-301 is **Advanced** at 932.

Raw hours are *not* comparable across bodies — a SANS CPE counts instruction time, an OffSec
"content hour" counts estimated total effort including labs. Use the tier, and cite the hours only
as supporting detail.

The training bonus diminishes as level rises — at the top the exam is the binding constraint and
every provider's training is excellent, so extra weight there would only compress the ceiling.
Bodies that bundle no training (CompTIA, ISC², CREST) receive none; CREST instead gates on
documented real-world experience.

**The training bonus for a pure multiple-choice exam is capped at +5.** Without that cap the
weighting inverts the thing it is meant to support: GIME reached 71 on a two-hour paper and
outranked GWAPT, GMON and GCIH, all longer and hands-on. A deep course can lift a knowledge exam;
it does not turn it into a practical one.

**A vendor's own label is evidence, not the answer.** Read what the training *is*. INE labels a
self-paced video path "expert"; SANS labels a six-day, 36-CPE instructor-led course
"Intermediate". Taking both at face value put eCTHP above GCTI and eWPTXv2 above OSWE-tier web
credentials. Self-paced video paths top out at tier 2 however they are branded.

The rule cuts upward too. 13Cubed's courses are weighted at tier 2 — above the *Essentials* rating
SANS gives FOR500 — because that is what the training is, regardless of it coming from a
two-person shop rather than an institute.

**An unproctored exam is discounted, not dismissed.** Untimed and unproctored are two separate
concessions and neither erases a practical component: analysing a supplied image and answering
evidence-derived questions is work you cannot look up. 13Cubed's exam-only figure of 44 treated its
20 practical questions as nearly worthless and left IWE below credentials with weaker training and
a weaker assessment. The discount is real — it is why IWE sits under a proctored forensics exam of
the same scope — but it is a discount, not a write-off.

Every record carries the evidence the score is argued from — `examFormat`, `examHours`,
`passingScore`, and `prerequisites`, each read off the issuing body's own certification page. Quote
those fields when you dispute a score; they are what turns "feels harder" into an argument. Where a
score includes a training weight, the record's `levelNote` says so and shows the exam-only figure.

`passingScore` is a **percentage**. Leave it null where a body publishes something else: CompTIA
reports a scaled score on a 100–900 range, which cannot honestly be converted into one.

`courseCode` and `examCode` are different things and both exist. GIAC and OffSec name the training
course (`SEC504`, `PEN-200`) and leave the exam unnamed; CompTIA and EC-Council name the exam
(`SY0-701`, `312-49`) and sell training separately. Put each code in the field that matches what it
actually identifies.

Rules that follow from the anchors:

- **Judge difficulty, not price.** A $5,000 credential with a 90-minute multiple-choice exam is not
  expert level.
- **Judge difficulty, not vendor tier naming.** "Professional" and "Expert" mean different things
  at every vendor.
- **Practical exams outrank multiple-choice** at the same nominal tier. For GIAC specifically this
  means checking whether the exam carries CyberLive hands-on questions — several certifications
  that look advanced from their syllabus are sat entirely as multiple choice.

  **Check that against GIAC's own CyberLive facet, not the prose on the certification page.**
  Every GIAC page carries a generic block explaining what CyberLive is, whether or not *that* exam
  uses it, so reading the page — or asking a summariser to read it — produces confident wrong
  answers in both directions. The authoritative list is the filtered catalogue:

      https://www.giac.org/certifications?...[facets.examFeature][0]=CyberLive

  reachable from the "Certifications with CyberLive" section of <https://www.giac.org/cyberlive>.
  Cross-checking the whole GIAC set against it found three records wrong — GASAE, GOAA and GMLE
  were all filed as multiple choice and are all CyberLive — while confirming the other twenty were
  right. A score built on a wrong `examFormat` is wrong no matter how carefully the rules are
  applied to it, so verify the field before arguing about the number.
- **A pure multiple-choice exam does not score above 58**, and does not outrank a hands-on
  credential of comparable scope from the same body. Score the assessment, not the syllabus: a
  demanding course assessed by 75 questions in two hours is still 75 questions in two hours.

  The exception is when a body omits a hands-on component for **logistical** rather than rigour
  reasons. GIME is the worked example: FOR518 has no CyberLive because provisioning macOS exam
  VMs is impractical, and practitioners who have sat it report depth comparable to the hands-on
  forensics exams. It is scored at 64, above the ceiling, and carries a `levelNote` saying so.
  **Any score that breaks a rule on purpose must carry a `levelNote`** — otherwise the next
  person applying the rules mechanically will quietly undo it.
- **Duration is not difficulty — but ask whether the window is used.** A 48-hour window on a
  beginner lab exam is generous scheduling, and SEC1 and PT1 are correctly scored under 50 despite
  running for a day or more. The test is what the time is *spent on*. BTL1 was held at 39 by a
  blunt reading of this rule, which left a 24-hour investigation of a live compromised network
  scoring below two-hour multiple-choice papers in its own column — the exact inversion the rule
  above it forbids. Twenty evidence-derived tasks against a real environment is work, not
  scheduling. Cite what the candidate has to produce, not the length of the booking.
- **Prestige is not difficulty**, in both directions. A widely-recognised HR-filter cert may still
  be an easy exam — and a body whose standing has fallen does not thereby get a lower score.
  Reputation is not an input. Re-read the assessment and the training; if they have not changed,
  neither does the number. What *is* fair game is a score that was never argued from evidence in
  the first place: eleven EC-Council records shared one copy-pasted note claiming "courseware at
  intermediate level" for programmes ranging from three days to 221 labs, which is the blanket
  vendor assumption this section exists to forbid. That is what got them re-scored, not the
  headlines.
- **A higher cut line on the same exam is a tier, not a second assessment.** EC-Council awards
  LPT (Master) automatically to anyone scoring 90% on the ordinary CPENT sitting. Scoring it as a
  separate, harder credential put a 24-hour exam above credentials examined over 160 hours. Where a
  body publishes no per-course difficulty rating at all, judge the programme by what it is — days
  of instruction, lab count, whether it is instructor-led — and say so in the `levelNote`.

### Attribution

Every score carries `scoredBy`, shown next to it on the chart and the cert page. The current
dataset is scored by **Opus 5**, and that is stated openly rather than left to look like received
fact. **If you change a `level`, change `scoredBy` to your own name or handle in the same commit** —
otherwise the record credits someone else for your judgement.

### Disputing a score

Open an issue titled `Level: <CERT> <current> → <proposed>`. Make the case against the anchors —
which anchor is it comparable to, and why? Arguments that reference exam format, pass rate,
duration, and prerequisites carry weight. Arguments from personal pride do not.

Score changes need a maintainer's agreement plus no unresolved objections after 72 hours. When a
score moves, the reasoning goes in the PR description, so the history of *why* stays readable.

## Domain placement

**The primary domain is the discipline the exam tests, not the terrain it tests it on.** A cloud
penetration-testing credential is a penetration-testing credential examined against cloud, so it is
filed under Penetration Testing with `cloud` adjacent — the same way an Active Directory red-team
cert is not filed under a Windows column. This was inconsistent for a while: GCPN sat in
Penetration Testing while CARTP, CARTE, MCRTA, OAOTC and OGOTC sat in Cloud & Container Security,
which put red-team credentials inside the Platform & Build band and made the cloud column read as
half a defensive discipline. They all follow GCPN now.

Each cert has one primary `domain` and up to two `adjacentDomains`. If a credential genuinely spans
columns — GREM is malware RE but touches software and testing — express that with
`adjacentDomains` rather than duplicating the record. Duplicate `id`s fail CI.

**Spanning cells.** `span` controls how wide the chart draws a credential:

| Value | Effect |
| --- | --- |
| `none` | a single cell in its own column — the default, and correct for almost everything |
| `adjacent` | one wide cell across `domain` + `adjacentDomains`, which must be neighbouring columns |
| `full` | a band across the whole chart |

Use `adjacent` only when a credential is genuinely **co-equal** across those disciplines rather than
merely touching them: OSCE³ is three certifications covering the entire offensive band, GCFA is
assessed across forensics, incident response, and hunting in one exam, and BTL2 covers incident
response and threat hunting. Use `full` only for portfolio credentials assembled from anywhere in
the catalogue — currently just GSE and GSP.

A `full` cert draws in its own violet, not in the colour of the band its `domain` field points at.
GSE is not a security-engineering credential; it only has to name *some* column, and colouring it
green said otherwise.

**Column counts are what you can count.** The number beside a column heading is the cells drawn in
that column — its own certs plus any wide cell passing through. Certs that name the domain in
`adjacentDomains` but are drawn elsewhere go in the tooltip instead. Adding the two together put
`67` above a column holding 51 cells, and a figure a reader cannot check is worse than a narrow one.

This is deliberately explicit rather than inferred from `adjacentDomains`. Inferring it turned
roughly a sixth of the dataset into wide banners, including certs that merely brush a neighbouring
column. If you think a cert deserves a wide cell, say so in the PR and make the co-equal case.

## What gets rejected

- Records without sources.
- Prices copied from a training reseller rather than the issuing body.
- Governance certs, however popular.
- Level scores that ignore the anchor table.
- Bulk additions of an issuing body's entire catalogue without individual verification.

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
| 95 | OSEE |
| 91 | GSP — portfolio of five GIAC certs, so it outranks any single GX- practical |
| 88 | OSCE³ — ceiling for a single course-backed credential |
| 87 | GX-FA — top of the GIAC experienced tier, no course behind it |
| 84 | GXPN — SEC660, Advanced |
| 82 | OSEP |
| 79 | GREM — FOR610, Advanced |
| 77 | GCFA — FOR508, Intermediate |
| 75 | CFCE · OSWE |
| 67 | CPTS · GPEN |
| 66 | OSCP |
| 63 | CDSA · GCFE |
| 48 | CySA+ · PenTest+ · PNPT |
| 38 | GSEC — SEC401, Essentials |
| 33 | Security+ · SSCP · eJPT |
| 22 | ISC² CC |
| 12 | SC-900 · vendor fundamentals |

The pure-multiple-choice ceiling of 58 still applies to the **exam-only** component of a score. A
training weight may lift the total above it — GWEB is 61 because SEC522 is Advanced, not because
its exam got harder.

### What `level` measures

**The depth a credential demands — not only how the exam checks it.** Those are different things,
and scoring only the exam gets it badly wrong. GCIH is examined in four hours, but earning it
means working through SEC504: six days, 38 CPEs, 44 labs. A seven-day platform exam with a
lighter path behind it is not automatically the deeper credential.

So a score has two components:

1. **Assessment rigour** — format, duration, cut score, whether it is hands-on.
2. **Required body of knowledge** — the training the credential is built on.

The second component uses **each body's own published rating of its training**, per certification —
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
- **A pure multiple-choice exam does not score above 58**, and does not outrank a hands-on
  credential of comparable scope from the same body. Score the assessment, not the syllabus: a
  demanding course assessed by 75 questions in two hours is still 75 questions in two hours.

  The exception is when a body omits a hands-on component for **logistical** rather than rigour
  reasons. GIME is the worked example: FOR518 has no CyberLive because provisioning macOS exam
  VMs is impractical, and practitioners who have sat it report depth comparable to the hands-on
  forensics exams. It is scored at 64, above the ceiling, and carries a `levelNote` saying so.
  **Any score that breaks a rule on purpose must carry a `levelNote`** — otherwise the next
  person applying the rules mechanically will quietly undo it.
- **Duration is not difficulty.** A 48-hour window on a beginner lab exam is generous scheduling,
  not depth. SEC1, BTL1 and PT1 all run for a day or more and are correctly scored under 50.
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

# Technical Security Certification Roadmap

### → [certs.pyaeheinnkyaw.com](https://certs.pyaeheinnkyaw.com)

A maintained, **technical-only** cybersecurity certification roadmap. Hands-on credentials
positioned by the depth they actually demand — not by their marketing tier, and not by price.

Inspired by [Paul Jerimy's Security Certification Roadmap](https://pauljerimy.com/security-certification-roadmap/),
which has not been updated since July 2024. This is an independent rebuild, not a fork: its own
taxonomy, its own scoring model, and its own data sourced directly from certification bodies.

## What is different

**Technical scope only.** No CISSP, CISM, CISA, CRISC, ITIL, PMP, TOGAF, ISO lead auditor, or
privacy certs. If a credential is more than half policy and paperwork, it is out. This removes
roughly a third of the entries on the original chart and makes room for real depth in the
disciplines that remain.

**Thirteen domains instead of nine.** The original collapsed malware reverse engineering, threat
intelligence, incident response, forensics, and SOC work into a single `blueops` bucket, and put
OSCP and OSWE in the same `pen_testing` column. Those are different jobs.

| Band | Domains |
| --- | --- |
| Offensive | Penetration Testing · Web & API · Exploit Dev & Vuln Research |
| Defensive | SOC & Detection Eng · Incident Response · Digital Forensics · Malware Analysis & RE · Threat Intel & Hunting |
| Platform & Build | Cloud & Container · Security Engineering & Arch · Secure Dev & DevSecOps |
| Specialist | OT / ICS / IoT & Hardware · AI / ML Security |

Splitting is only worth it where the market actually splits. Adversary-simulation credentials live
in Penetration Testing, and network and identity engineering live in Security Engineering, with the
overlap recorded in each record's `adjacentDomains`.

**AI/ML Security exists.** It did not on the 2024 chart. Neither did most of what is in it.

**Continuous difficulty scores.** Every cert carries a `level` from 0–100, calibrated against fixed
public anchors (OSCP = 62, Security+ = 33, GSE = 97). Scores are editorial judgements, published
openly with `scoredBy` attribution so they can be argued with.

The chart groups those scores into five tiers and gives **each tier the height its own population
needs**, rather than a fixed slice of the axis. Professional covers only a quarter of the 0–100
range but holds more than half the dataset; on a linear axis its certs overflowed downward and
rendered below the Associate line, which put credentials in a tier they did not belong to. Sizing
bands to their density keeps every cert inside its own tier. Within a tier, certs are ordered by
level, highest first — so vertical position is ordinal, not proportional.

**Mark what you hold, and export it.** "Select my certs" turns the chart into a checklist; the
selection persists in `localStorage` and can be saved as a PNG showing your certifications
highlighted on the full roadmap. The image is drawn onto a canvas in the browser — no screenshot
library, no server round-trip, and nothing about your selection ever leaves the device.

**Structured data, not a picture.** The original encodes a cert's full name and price inside a
tooltip string like `"Offensive Security Exploitation Expert\n    $5,000 lab\n    Plus travel"`.
Here every attribute is a typed field, so you can filter by price, exam format, renewal burden, or
DoD 8140 approval — and every cert gets its own crawlable, screen-reader-navigable page.

## Why it should stay current

The original went stale because one person curated hundreds of records by hand. The machinery here
is built so decay is *visible*:

- Every pull request is validated automatically — schema violations, duplicate ids, unknown
  domains and files that mix issuing bodies all fail the build before they reach the chart.
- A weekly GitHub Action probes every vendor URL. Dead links are the earliest signal a cert was
  retired or renamed. Results become a tracking issue automatically.
- Every record carries `lastVerified` and `sources`. Anything unverified for 180+ days is flagged.

## Contributing

**You do not need to clone this repository or install anything to contribute.** Use the site:

- [Suggest a certification](https://github.com/ph0b14/cert-roadmap/issues/new?template=new-certification.yml)
- Open any certification on the chart to report a correction or dispute its score

Each is a short form. No Git, no JSON, no local setup. See [CONTRIBUTING.md](CONTRIBUTING.md) for
what belongs on the chart and how scores are argued.

If you would rather edit the data directly, every issuing body has one JSON file in
[`data/certs/`](data/certs). Edit it in the GitHub web editor and open a pull request — CI checks
the schema, ids, domains and links for you and comments if anything is wrong.

## Data model

One JSON file per **issuing body** in `data/certs/`, each a flat array — that is how the data is
sourced and how it goes stale. A cert's column comes from its own `domain` field, not the filename.
The schema is enforced by [`src/schema.ts`](src/schema.ts).

```json
{
  "id": "oscp",
  "name": "OSCP",
  "fullName": "Offensive Security Certified Professional",
  "vendor": "OffSec",
  "vendorUrl": "https://www.offsec.com/courses/pen-200/",
  "domain": "pentest",
  "adjacentDomains": ["exploitdev"],
  "span": "none",
  "level": 62,
  "cost": { "amount": 1749, "currency": "USD", "note": "includes 90 days lab access" },
  "courseCode": "PEN-200",
  "examCode": null,
  "examFormat": "practical",
  "examHours": 24,
  "passingScore": null,
  "prerequisites": [],
  "renewal": { "required": false, "years": null, "ceCredits": null },
  "accreditation": { "ansiIso17024": false, "dod8140": [] },
  "status": "active",
  "lastVerified": "2026-08-03",
  "sources": ["https://www.offsec.com/courses/pen-200/"]
}
```

Unknown values are `null`, never guessed. A missing price is more useful than a wrong one.

## Legal

Certification names and marks belong to their respective owners and are used nominatively for
identification and comparison. This project is independent and is not affiliated with, endorsed by,
or sponsored by any certification body. No vendor logos are used.

The dataset is original work: its taxonomy, difficulty scoring, and records were built
independently and sourced from primary vendor documentation.

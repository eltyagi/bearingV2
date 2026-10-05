# Keep what works. Make change safer.

## An evidence-led modernization assessment

**Customer project proposal | Bearing + GitHub Copilot App workflow**

A service can run reliably today and still be expensive to understand, slow to test, difficult to release or approaching
the end of vendor support. The business question is not "How much old code can we replace?" It is **"Which constraints
make the next business change costly or risky, and what is the smallest justified improvement?"**

This proposal turns repository exploration into an owned, evidence-backed modernization backlog. It preserves working
behavior and explicitly allows the conclusion **retain as-is**. It is a proposed project, not a capability already
implemented in Bearing, an official GitHub service offering or a claim of measured customer results.

### Why this matters now

Kyndryl's 2025 Readiness Report says **57% of surveyed leaders report that technology-stack issues delay their company's
innovation**. Its study involved 3,700 senior leaders across 21 countries. Separately, Kyndryl's 2024 operational data
shows **44% of mission-critical IT infrastructure approaching or at end-of-life**. That is an infrastructure finding,
not the percentage of enterprise source code that is "legacy." [1][2]

AI can help explore and explain a system, but an explanation does not establish that its critical paths are tested or
that a proposed change preserves behavior. GitHub/Microsoft/DX research reports that developers with high code
understanding **feel 42% more productive** than those with low or no understanding. This is an association in
self-reported data, not a measured modernization benefit or a Bearing result. [3]

### The customer situation

An engineer rotates onto an order-processing service. It still fulfills orders, but a requested validation change raises
questions: which paths rely on this behavior, which tests would detect a regression, which build steps are actually
slow, and whether an upgrade would help or introduce unnecessary risk. The team does not need a rewrite pitch. It needs
a shared picture of what is known, what must be measured, and who can approve the next change.

**Sponsor:** engineering or platform leader. **Accountable owner:** service owner. **Contributors:** rotating developer,
CI/platform specialist and relevant security or compliance reviewer.

**Pilot scope:** one business-critical journey in one small, eligible repository; extend to up to three repositories
only when access, evidence and owner availability permit. The four-week sequence below is a planning assumption, not
a delivery guarantee. Portfolio-wide discovery, large monorepos and automated production changes are out of scope.

---

## Establish the facts before prescribing the change

Start at a pinned commit and record the business journey, environment and evidence date. Each finding includes its
source, owner, confidence and one of four explicit states: **observed, measured, hypothesis or unknown**. A source-code
reference shows where behavior lives; it is not proof of test adequacy or production performance.

| Assessment question | Evidence to collect | Decision it supports |
|---|---|---|
| What does this service do, and who depends on it? | Entry points, key flows, manifests, recent PRs, owner-confirmed business journeys and dependencies. | Bound the change and identify reviewers. |
| What would catch a regression? | Existing test configuration, dated coverage reports, test-to-journey mapping, assertions and failure-path examples. | Add characterization or contract tests where confidence is missing. |
| Where does delivery time go? | Existing CI run exports, job/step timings, queues, setup, compilation, test and packaging stages. | Investigate the stage that causes delay before selecting caching or parallelization. |
| What is becoming costly to support? | Runtime/dependency versions, authoritative support dates, upgrade guides and operating constraints. | Retain, upgrade or isolate a dependency with a justified benefit. |
| What knowledge is person-dependent? | Ownership records, runbooks, documentation gaps and owner review. | Capture decisions and transfer responsibility. |

### Test confidence, not just a coverage percentage

Distinguish **tests found**, **an existing coverage report found**, and **tests executed in an approved environment**.
No report means **coverage unknown**, not zero. For a report, record its tool, commit, date, exclusions and line/branch
denominators. Describe whether each critical business path has meaningful assertions, including failure behavior.
High coverage does not prove correctness; low coverage alone does not justify rewriting working code.

Start with owner-confirmed characterization tests when undocumented behavior must be preserved. The owner decides which
observed behavior is intentional before a test freezes it as a contract. Test execution, instrumentation and any
production-data use require separate approval; no sensitive data enters the assessment artifacts.

### Build and test speed, measured comparably

Use a customer-agreed observation window and report the sample count. Separate queue time from execution, and setup from
compilation, testing and packaging. Compare the same workflow, runner class, branch scope and relevant cache conditions.
Use median and p95 only when the sample supports them; otherwise report the observed durations and uncertainty.

A proposed benefit is a hypothesis until measured. Estimate avoidable waiting as runs per period multiplied by the
measured reduction in the affected stage, then account for parallel work and whether engineers actually wait. Do not
translate every CI minute into recovered engineer time or money.

There is no universal "slow build" duration or safe coverage percentage. Agree targets against the customer's measured
baseline, critical paths, delivery needs and risk tolerance.

---

## Run a bounded pilot with explicit review gates

| Planning stage | Work and artifact | Human gate |
|---|---|---|
| Week 1: discover | Confirm scope and approved access; map one journey, owners and evidence gaps. | Service owner approves the scope and corrects the map. |
| Week 2: baseline | Inspect existing reports and CI data; obtain separately approved measurements where needed. Produce an evidence register. | Owner and CI/test specialist accept the baseline or mark it incomplete. |
| Week 3: decide | Turn constraints into candidate issues. Compare expected value, confidence, effort and change risk. | Sponsor and owner choose one bounded improvement or retain-as-is. |
| Week 4: prove | In a separately approved delivery workflow, implement a reviewed PR, repeat comparable measurements and document rollback. | Owner accepts the result; sponsor decides whether to expand. |

**Discovery remains read-only.** Existing reports can be inspected; running builds or tests is not silently implied.
Implementation has its own approval, permissions and normal repository review requirements. The project board records
review decisions; it does not replace branch protection, deployment controls or organization policy.

### Define success before implementation

For each chosen improvement, agree a baseline, measurement method, desired target, acceptance checks, owner and rollback.
Examples include a shorter affected CI stage without increased failures, owner-reviewed tests for a named business path,
or a supported runtime upgrade with compatible behavior. No percentage improvement is promised in advance.

For the assessment itself, track evidence completeness, unresolved unknowns, time to an owner-approved first meaningful
PR and repeated orientation questions or senior-engineer interruptions. Record the observation method; no reduction is
claimed until a comparable before/after measurement exists. Explicitly deciding not to modernize is a valid outcome.

---

## Turn findings into a GitHub project, not another report

**Proposed project:** `Changeability & Modernization`. Use repository issues as work items and GitHub Projects as the
coordination surface. This document specifies a project design; it does not create a live project or issues.

Suggested statuses are **Discovery, Evidence review, Ready for decision, Approved, In progress, Validating and Done**.
Keep a separate disposition for **retain, improve, reshape or retire**, plus a blocked reason when needed. These are
proposed, human-maintained workflow values, not automated approval enforcement.

Suggested fields: service/repository, business journey, criticality, accountable owner/assignee, workstream, evidence
state, confidence, baseline, target, effort, change risk, reviewer and target date. Link large evidence artifacts from the
issue rather than pasting sensitive data into project fields. Use a table for triage, a status board for delivery and a
date-based roadmap for approved work.

### A decision-ready issue

An issue should state the business constraint and affected journey; link dated evidence; distinguish the finding from
its suspected cause; record the baseline and measurement conditions; propose the smallest next action; identify an
owner and reviewer; and define acceptance criteria, dependencies, risk and rollback. If evidence is missing, the issue
is an investigation, not a confident remediation prescription.

### Illustrative starter backlog -- not findings about this repository

| Candidate issue | Evidence required before approval | Acceptance direction |
|---|---|---|
| Characterize order-validation behavior | Owner-confirmed journey and a documented test gap. | Tests preserve agreed valid, invalid and failure behavior. |
| Investigate dependency-install delay in CI | Comparable step timings and observed cache behavior. | Select an intervention only after the bottleneck is demonstrated. |
| Assess a runtime's support deadline | Manifest version plus the vendor's current support policy. | An owner-approved retain/upgrade/isolate decision; regression checks for any upgrade. |
| Document service ownership and release recovery | Owner review and verified release/rollback procedure. | An accountable owner and a reviewed, reusable runbook. |

### Prioritize value and confidence, not age

Urgent support or compliance obligations take precedence according to customer policy. For the remaining work, compare
business criticality, measured friction, frequency, confidence, effort and reversibility. Missing evidence becomes a
discovery task; it must not lower a risk score or manufacture certainty.

Retain a working system when the expected benefit does not justify disruption. Improve a demonstrated local bottleneck.
Consider reshaping a boundary only when repeated change constraints justify the larger effort. Retire a low-value system
only after business owners confirm dependencies, retention obligations and an exit plan.

---

## Where Bearing fits -- and where it stops

**Available today:** `/onboard-repo` coordinates read-only repository mapping and recent merged-PR research, presents an
incremental seven-section canvas, cites repository evidence, marks unavailable sections and creates a persistent
first-steps checklist. Its extension performs light path/line-reference checks, not correctness certification.

**Proposed assessment work:** critical-journey review, coverage-report interpretation, CI measurement, support-lifecycle
assessment, prioritization and GitHub project setup. These require additional inputs, specialist work and approved
integrations or manual collection. They are not implemented Bearing features. Bearing does not run builds/tests,
measure coverage, certify a safe change or automatically create this project.

**Production expansion needs:** approved repository eligibility and model/data handling, retention rules, access review,
auditability, quality criteria and operational ownership. Bearing's current prototype is intended for small repositories
on github.com; do not present it as a ready-made large-estate or GitHub Enterprise Server assessment platform.

**Customer decision:** nominate one service, one critical journey and one accountable owner. Agree the baseline and review
gates, then prove one justified improvement -- or establish why leaving the system unchanged is the right decision.

### Sources and qualifications

1. [Kyndryl Readiness Report 2025](https://www.kyndryl.com/us/en/insights/readiness-report-2025).
   The 57% finding is a company-leader survey, not a source-code audit. Edelman DXI surveyed 3,700 senior leaders across
   21 countries from June 20 to August 15, 2025, on Kyndryl's behalf.
2. [Kyndryl Readiness Report 2024 announcement](https://www.kyndryl.com/us/en/about-us/news/2024/10/kyndryl-readiness-report-2024),
   published October 16, 2024. The 44% end-of-life finding comes from Kyndryl Bridge operational data. The accompanying
   survey of 3,200 decision-makers is a different evidence stream. Neither establishes the percentage of legacy code.
3. [GitHub: Good DevEx increases productivity](https://github.blog/news-insights/research/good-devex-increases-productivity/)
   and [DevEx in Action, ACM Queue](https://queue.acm.org/detail.cfm?id=3639443), 2024.
   The 42% figure describes self-reported productivity and code understanding; it is not a causal modernization result.
4. [GitHub Brand Toolkit: color](https://brand.github.com/foundations/color) and
   [typography](https://brand.github.com/foundations/typography). The companion artifacts use GitHub's public neutral/green
   palette and a restrained Copilot Purple accent; Bearing remains an independent prototype.

Sources checked October 5, 2026. The Kyndryl reports are vendor-published research; their population and method should
accompany any reused statistic. Examples and the four-week schedule are illustrative. No live customer metrics,
automatic policy enforcement, measured ROI or shipped modernization functionality are asserted.

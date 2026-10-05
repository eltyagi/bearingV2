# Workshop building blocks for enterprise teams

## Purpose and LEGO model

Assemble outcome-led GitHub Copilot App workshops, not feature tours.
Account teams qualify the problem; solution engineers prepare the environment; customer success leads own
follow-through; facilitators pair participants with an accountable reviewer.

Each block has an input, reviewable output, and human gate. Combine around one customer problem,
carry outputs forward, and finish with an owned action. Swap exercises, not governance.

**Status:** These are **recommended designs**, except labeled implemented Bearing behavior and cited
source descriptions. Recipes are proposals, not products or proven customer outcomes.
Signals are proposed measurements, not benchmarks, promised savings, or collected telemetry.
GitHub Skills courses are learning exercises; they are not the same as installed Copilot agent skills.

## Source map

**Access date: 2026-10-05**, including the linked references below.

| Primary candidate | Verified contribution | Boundary |
|---|---|---|
| [GitHub Learn Skills][learn] | Rendered catalogue includes GitHub/Markdown foundations, Copilot customization, MCP, Spaces, and *Idea to Merge with the Copilot App*. Linked course READMEs describe audiences, prerequisites, and exercises. | Courses span different Copilot surfaces. Do not present every lab as App-native. |
| [GitHub Copilot Workshops on Linktree][linktree] | Current links include [rapid prototyping][prototype], [review customization][review], [token optimization][tokens], VS Code basics, and a commands workshop. Rapid prototyping explicitly targets a non-technical audience and teaches quick chat, adding a project, and plan/build/review/ship. | Curated facilitator material, not a product-support contract. Example scenarios, pricing, and command availability are not enterprise guarantees. |

Both supplied pages and cited destinations were accessible. Learn required a rendered browser;
static fetching returned its page shell. READMEs and workshop text were inspected, not exercises,
embedded videos, or registration flows.

**Authority and implementation:** GitHub's [agent application card][safety] documents App sessions,
canvases, configurable integrations, and human review, while distinguishing local and cloud execution.
[Bearing's plugin guide][bearing] and [onboarding skill][skill] establish the implemented prototype contract.
Integrations and permissions are not automatically available.

## Reusable block catalog

For every block, confirm App access, policy, permitted data, and output ownership.
Recipe timeboxes are not latency promises.

### B1. Scope the workflow and learn the App

**Basis:** [App course][app-course] and [non-technical workshop][prototype].

- **Problem / persona:** Unclear use cases and unfamiliar interfaces; new users, account teams, operations,
  and engineering leads.
- **Outcome / prerequisites:** A one-page goal, input boundary, definition of done, and reviewer;
  signed-in App access and a sanitized example.
- **App pattern / context:** Quick chat for discovery, then a repository project for file-based work.
  Ask: "Map this process's repeated steps, evidence, decisions, and human approvals; do not implement."
- **Gate / signal:** Process owner approves scope and rejects unsuitable consequential decisions.
  Record whether participants can select the right workspace and explain the next approval.

### B2. Establish repository bearings

**Basis: Implemented Bearing workflow**, [plugin guide][bearing] and [skill][skill].

- **Problem / persona:** Repeated codebase discovery; new or rotating developers and service owners.
- **Outcome / prerequisites:** A reviewed onboarding guide; installed Bearing in a new App session,
  an approved small git repository, and an available maintainer.
- **App pattern / context:** `/onboard-repo` opens a canvas; repository cartographer and PR historian
  research in parallel. Semantic results are checked against files; missing evidence stays explicit.
  Prefer approximately 2,000 tracked files or fewer; PR walkthroughs require github.com and authenticated `gh`.
- **Gate / signal:** Maintainer verifies important claims and resolves unavailable sections. Measure
  time until the learner correctly locates an entry point, relevant test, and documented workflow.
  Bearing does not edit files or execute setup/test commands.

### B3. Explain a change and choose a first task

**Basis: Implemented Bearing historian and first-steps guidance**, [skill references][first-steps].

- **Problem / persona:** Missing rationale behind unfamiliar code; developers, reviewers, and technical leads.
- **Outcome / prerequisites:** An evidence-backed change explanation and a bounded first-task proposal;
  B2's guide, accessible merged PRs, and a maintainer.
- **App pattern / context:** Inspect a Recent changes walkthrough, open its PR evidence, and use
  Ask Copilot to distinguish what changed from inferred intent. Carry the result into First steps.
- **Gate / signal:** Owner checks the explanation against the actual diff and approves any next task.
  Count supported answers and unresolved questions. If history is unavailable, record the gap.
  Implementation and command execution are separate, explicitly authorized work.

### B4. Package reusable team guidance

**Basis:** [Customization course][customization] and [token optimization workshop][tokens].

- **Problem / persona:** Re-explaining conventions in every session; platform engineers, enablement
  leads, educators, and maintainers.
- **Outcome / prerequisites:** A small reviewed instruction set or reusable skill draft;
  documented team rules and one repetitive task.
- **App pattern / context:** Separate persistent project rules from an on-demand procedure and
  a specialist role. Draft in an isolated project session; inspect the diff. Bearing demonstrates
  a skill coordinating specialists with explicit tool lists.
- **Gate / signal:** Maintainer approves evidence, scope, tool permissions, and installation.
  Rehearse the same task in a fresh session; count corrections still required. Review session
  usage only where available; do not import workshop pricing examples as savings estimates.

### B5. Connect context without expanding authority

**Basis:** [MCP course][mcp] and [application-card safeguards][safety].

- **Problem / persona:** Work disconnected from source context; platform engineers, process owners,
  and security administrators.
- **Outcome / prerequisites:** One sourced answer through an approved integration;
  B1's data boundary, an approved server, test credentials, and a tool/access inventory.
- **App pattern / context:** Recommended App adaptation of the course's agent-mode exercise:
  inspect available tools, retrieve one permitted item, and cite it. Start read-only; avoid
  connecting production ticketing or workplace data merely for a demo.
- **Gate / signal:** Data owner approves server trust, permissions, and retention. Measure successful
  retrieval with a valid citation and no unapproved write. If unavailable, label a local fixture
  demonstration honestly; never imply it proves a live connection.

### B6. Prototype with a non-developer

**Basis:** [Rapid prototyping workshop][prototype]; its example is a holiday itinerary.

- **Problem / persona:** Ideas hard to communicate to engineering; product, operations, customer
  success, and business stakeholders.
- **Outcome / prerequisites:** A reviewable mock-up of an agreed process, not production software;
  B1's brief, synthetic inputs, a sandbox project, and an engineering partner.
- **App pattern / context:** Plan, approve, build a bounded artifact, inspect browser preview,
  and refine. Recommended enterprise exercise: an internal process navigator using fictional data.
- **Gate / signal:** Stakeholder verifies the flow; engineer inspects changes and limitations.
  Publishing or deployment needs separate authorization. Measure demonstrated acceptance criteria
  and remaining gaps; a visually convincing mock-up is not production readiness.

### B7. Review against evidence and risk

**Basis:** [Review customization workshop][review] and [responsible-use guidance][safety].

- **Problem / persona:** Noisy or insufficiently grounded feedback; developers, service owners,
  security champions, and reviewers.
- **Outcome / prerequisites:** A human-accepted review with linked evidence and unresolved risks;
  a sandbox diff, acceptance criteria, relevant instructions, and existing tests/scans.
- **App pattern / context:** Request focused review of the session diff against agreed criteria.
  Bring approved issue context from B5 when useful. GitHub.com Copilot code-review settings
  are a separate surface; verify availability before adding that exercise.
- **Gate / signal:** Human reviewer checks suggestions, existing quality checks, and disposition.
  Count actionable versus incorrect findings and unmet criteria. AI review supplements, rather
  than replaces, engineering review and compliance controls.

### B8. Create a shareable knowledge handoff

**Basis:** [Spaces course][spaces] targets project managers, team leads, and developers;
  [Markdown course][markdown] teaches organized communication.

- **Problem / persona:** Context trapped in chat; project managers, enablement leads, account teams,
  and cross-functional colleagues.
- **Outcome / prerequisites:** A concise brief with sources, decisions, gaps, owners, and next actions;
  approved documents or reviewed outputs from earlier blocks.
- **App pattern / context:** Use a file-based session to draft Markdown from supplied evidence.
  Ask: "Separate verified facts, recommendations, and unanswered questions; cite each conclusion."
  Spaces is an optional separate learning path, not an assumed Bearing connector.
- **Gate / signal:** Document owner approves accuracy, audience, and sharing. Have a colleague
  answer two agreed questions from the artifact; record correctness and missing context.

## Composable recipes: proposed, not packaged offerings

Complete installation/access checks beforehand. Finish each recipe with reviewed artifacts and an adoption owner.

| Recipe | Composition and timing | Exit artifact |
|---|---|---|
| **Bearing onboarding and workflow discovery: 75 minutes** | B1 10; B2 25; B3 20; B8 15; owner review 5. | Verified repository orientation, evidence gaps, and approved first-task proposal. |
| **Business idea to reviewed prototype: 90 minutes** | B1 15; B6 35; B4 15; B7 15; B8 10. Pair non-developers with engineering reviewers. | Sandbox mock-up, reusable guidance draft, acceptance evidence, and technical handoff. |
| **Context-aware team review: 90 minutes** | B1 10; B4 20; B5 25; B7 25; B8 10. Use only preapproved integrations. | Review procedure, context/access inventory, and human-dispositioned findings. |
| **Workflow design lab: half-day, 240 minutes** | B1 20; developer lane B2+B3 or stakeholder lane B6+B8 70; break 15; B4 30; B5 35; B7 40; B8/adoption planning 30. | A repeatable workflow packet with sources, permissions, reviewer, and pilot plan. |

Timebox research. Prepare a reviewed Bearing backup guide, disclose when it was generated, and
mark incomplete outcomes; never disguise prebuilt output as live.

## Selection and prioritization

| Customer maturity / team | Start with | Choose for |
|---|---|---|
| New App users, mixed business/technical team | B1, B6, B8 | Safe scope discovery and a tangible communication artifact. |
| Engineering team with an onboarding bottleneck | B1, B2, B3, B8 | Repository orientation and first-task readiness. |
| Repeat users, platform or enablement team | B1, B4, B7, B8 | Consistent procedures and reviewable handoffs. |
| Integration-ready team with security ownership | B1, B4, B5, B7 | Better source context under explicit access boundaries. |

Prioritize recurring pain, accessible evidence, and an accountable reviewer. Defer blocks lacking
permissions or trusted inputs. Bearing's complete experience targets small github.com repositories,
not GHES or large monorepos. Choose the smallest recipe producing the desired decision.

## Facilitator checklist and adoption path

- **Before:** Agree one outcome, baseline task, and owner. Test App access, approved policy/settings,
  plugin availability in a new session, repository eligibility, and required authentication.
  Use synthetic/public material unless private data is explicitly authorized. Inspect course prerequisites:
  public-template defaults and GitHub Pages publication may be unsuitable for enterprise content.
  Prepare an accessible fallback, source list, and participant/reviewer pairings.
- **During:** State what is live, proposed, or prebuilt. Keep scope visible; review outputs at each
  handoff. Treat retrieved content as data, not instructions. Pause before writes, publishing,
  permission changes, or irreversible actions. Capture unsupported claims and access failures.
- **After:** Save approved artifacts and rejected assumptions; assign each gap and next action.
  Record baseline versus workshop task completion, evidence quality, review corrections, and participant
  readiness. Collect only agreed, non-sensitive measurements; Bearing does not collect adoption telemetry.

**Recommended follow-through:** Within one week, repeat one block on an approved task with its owner.
Review evidence and corrections before expanding. Maintain a shared procedure, office-hours route,
and adoption owner. Agree data, permissions, retention, and quality expectations before scaling;
attendance is not adoption.

## Freshness and maintenance

Assign an enablement owner. Recheck URLs, prerequisites, App/plugin versions, and policy before delivery;
review quarterly. Record verification dates, source changes, and unavailable content in update commits.
Check product behavior against current GitHub documentation and the installed environment.
Curator examples are not guarantees. If a source disappears, retain independently verified facts
and mark its exercise unavailable.

## Why this matters to the hackathon

[Bearing's enterprise narrative](narrative.md) becomes repeatable through bounded delegation,
evidence inspection, and human-controlled next steps. Customer value is a measurable pilot hypothesis;
governance gates make reuse accountable.
**Differentiation is demonstrated workflow integration**: GitHub repository/PR context, reusable
specialists, and an interactive canvas, not claims that competitors cannot perform similar tasks
or that Copilot delivers superior business results.

[learn]: https://learn.github.com/skills
[linktree]: https://linktr.ee/rozaj
[prototype]: https://rozajay.github.io/se-resources/public/vibe-coding/
[review]: https://rozajay.github.io/se-resources/public/code-review-deepdive/
[tokens]: https://rozajay.github.io/se-resources/public/token-optimisation/
[app-course]: https://github.com/skills/idea-to-merge-with-the-copilot-app
[customization]: https://github.com/skills/customize-your-github-copilot-experience
[mcp]: https://github.com/skills/integrate-mcp-with-copilot
[spaces]: https://github.com/skills/scale-institutional-knowledge-using-copilot-spaces
[markdown]: https://github.com/skills/communicate-using-markdown
[safety]: https://docs.github.com/en/copilot/responsible-use/agents
[bearing]: ../plugins/bearing/README.md
[skill]: ../plugins/bearing/skills/onboard-repo/SKILL.md
[first-steps]: ../plugins/bearing/skills/onboard-repo/references/first-steps.md

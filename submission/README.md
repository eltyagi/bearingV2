# Bearing hackathon submission

## Short project summary

Bearing is a light forward-deployed engineer (FDE) as a service for the field teams that help customers move from AI
adoption to AI outcomes. The GitHub Copilot App workflow has three steps: walk people through discovery, generate surveys that
capture fine-grained requirements, and turn confirmed requirements into workshops drawn from a knowledge base of building blocks.
Only repository discovery is built. `/onboard-repo` runs two read-only, least-privilege agents in parallel and fills a live canvas
with a cited map, conventions marked documented or observed, workflow, merged-PR lessons, first steps, and explicit unavailable
sections, then stops before implementation. Stakeholder discovery, surveys, response synthesis, workshop assembly and a private
Pages workspace per customer are proposed, not built. People review every gate. Effectiveness is a hypothesis to pilot.

**Word count:** 124

**Narrative:** [Read the customer-facing Bearing narrative](narrative.md).

**Enterprise deck:** [15-slide branded deck](bearing-enterprise-deck.pptx), "Light FDE as a service". It sets out the industry
signal that customers are moving from AI adoption to AI outcomes (labeled as research, not findings about our customers), an honest
table of what is and is not known about forward-deployed engineers, the three steps (discovery, generated surveys, workshops from
the building blocks), an illustrative worked example, the delegation and human review gates, who uses it, what is built versus
proposed, a bounded pilot, and the research and limits. Slides marked Prototype are implemented (repository discovery only);
Emerging means a document or design exists but is not validated or automated; Proposed is not built; Illustrative is an invented
example. Every slide has speaker notes restating built versus proposed and the sources used.

**Evidence:** [Sources, methods and evidence strength](fde-evidence.md). It records what each source does and does not show.
No rigorous controlled study of forward-deployed engineer effectiveness was found, so Bearing's value is a hypothesis to pilot.

**Modernization assessment concept:** [Project brief](modernization-brief.md) and [branded Word brief](modernization-brief.docx).
This is a proposed project, not an implemented Bearing capability.

**Workshop knowledge base:** [Reusable building blocks and workshop recipes](workshop-building-blocks.md).

**Customer workspace template (Proposed surface):** [docs/](../docs/index.html) holds a static, unpublished GitHub Pages
template with one fictional customer page. A privately published Pages site is open to everyone with read access to its
repository and needs GitHub Enterprise Cloud, so "different customers for different people" means one repository and one
private site per customer. It is not published, has no access control configured, and runs no workflow.

## Why an enterprise customer would use it

Customers who have started using AI now ask what it changed and how they will know. That is an industry signal, not a finding
about our customers (see [fde-evidence.md](fde-evidence.md)). Field teams need a repeatable way to answer without a
forward-deployed engineer for every account. Bearing is a light forward-deployed engineer: a first pass by Copilot, reviewed by
people at every gate. It does not replace a real forward-deployed engineer, the service owner, or the workshop facilitator.

| Business need | Bearing response | Customer value |
|---|---|---|
| Customers ask for AI outcomes and impact, not just adoption | Light FDE as a service: guided discovery, generated surveys, and workshops from the building blocks. Only repository discovery (`/onboard-repo`) is built; the rest is Proposed. | A path from the outcome question to a customer-confirmed requirement list and an owned workshop action. A hypothesis to pilot; no results are claimed. |
| Field teams repeat discovery with every customer | `/onboard-repo` is the built discovery step: a read-only, cited exploration of one repository. | A cited picture and visible evidence gaps (Emerging) to turn into discovery questions. |
| Developers rotate into unfamiliar services | One consistent `/onboard-repo` workflow builds a repository-specific guide. | Less repeated discovery and fewer interruptions for service owners. |
| Important context is distributed across code, docs, and pull requests | Parallel specialists combine semantic repository context with recent GitHub history. | A faster path from "where is everything?" to an evidence-backed mental model. |
| Generated guidance can be wrong or over-privileged | Read-only agents cite files, limit tools by role, mark unavailable sections, and stop before implementation. | Reviewable output with bounded actions and an explicit human decision point. |
| Enablement experiences are expensive to build per team | The plugin, instructions, prompts, tools, and canvas are reusable across eligible repositories. | A field-deployable starting point that can be piloted, calibrated, and scaled. |

## Repeatability and adoption path

1. Install the marketplace and Bearing plugin using the commands in the root README.
2. Pilot on one small, well-understood repository and have its owner review the generated guide.
3. Use evidence gaps to improve repository documentation or refine approved instructions.
4. Give developers the same `/onboard-repo` entry point and verification expectations.
5. Measure time to orientation, evidence coverage, completed sections, and first-task readiness.
6. Expand to similar repositories after governance owners approve repository eligibility, retention, access, and review policy.

The repository includes the complete reusable unit: plugin manifest, skill, specialist agents, role-scoped tool lists,
dispatch prompts, deterministic extension tools, local storage, canvas UI, sample data, and tests.

## Workflow transformation: plan, delegate, validate, review, ship

| Stage | GitHub Copilot App workflow |
|---|---|
| **Plan** | The developer invokes `/onboard-repo`; the skill scans the repository, detects available GitHub context, and establishes the seven-section guide contract. |
| **Delegate** | The coordinating agent starts two specialist agents in parallel, each with a narrow role and least-privilege tool set. |
| **Validate** | Specialists verify semantic-search results in repository files; extension tools validate paths and line ranges, and unavailable evidence stays explicit. |
| **Review** | The live canvas exposes sources and status progressively. The developer can inspect evidence, ask focused questions, reuse or refresh a guide, and decide whether to act. |
| **Ship** | The first-steps checklist is handed over and Bearing stops before implementation. The plugin packages the workflow, prompts, tools, interface, storage, controls, and measures so another team can install and repeat it. |

This is workflow transformation, not a claim that an agent should replace engineering judgment. It automates the repeated
discovery and synthesis work of a first-pass repository exploration (the light FDE pass), then adds review gates at
repository selection, evidence inspection, follow-up questioning, and the decision to begin implementation.

The same five stages are the design for the proposed light FDE service (Proposed, not built). Its gates: scope approved by the
account owner, survey approved before sending, requirements confirmed by the customer, workshop plan approved by the
facilitator, and actions owned by the customer. Only the first stage, repository discovery, is built.

## Field-ready customer playbook

**Who uses the pattern:** account teams, solution sales and engineers, customer success, developer stakeholders, and workshop
facilitators. Only developer repository exploration is built today; the other roles are designs to test in a pilot.

1. Select one customer engagement with an outcome question and an account owner who will approve scope.
2. Baseline the current approach: time to qualified requirements, requirement completeness as judged by the account owner, and how
   many workshop actions get a named customer owner.
3. Run `/onboard-repo` on one small repository its owner can verify, and review the guide with that owner rather than presenting
   it as ground truth.
4. Draft the survey and choose a workshop recipe by hand from the [building blocks](workshop-building-blocks.md); the automated
   versions are Proposed. Use evidence gaps as discovery questions.
5. Capture corrections, unsupported claims, and unavailable sections as pilot findings; agree success measures and enterprise
   controls before expanding.
6. Reuse the demo narrative: "Copilot plans the journey, delegates bounded research, validates evidence, and returns control
   to the person before any next step begins."

This gives field teams a customer-ready conversation about outcomes, governance, and adoption rather than a one-off
feature demonstration.

## Governance, security, Responsible AI, and human review

| Control area | Implemented design | Enterprise adoption consideration |
|---|---|---|
| Data boundaries | Repository and pull request content are treated as untrusted data. Guides remain in local Copilot extension storage. | Define which repositories and classifications are eligible and align retention with organization policy. |
| Permissions | Specialists are read-only and receive only the tools required for their role; no shell is available to them. GitHub calls are read-only. | Review plugin and agent permissions centrally before broad rollout. |
| Grounding | Claims must be verified in files; observed conventions require evidence across at least three files. Invalid file and line references are removed. | Sample guides periodically and define an escalation path for inaccurate guidance. |
| Human-in-the-loop | The developer starts the workflow, chooses reuse or refresh, verifies evidence, asks follow-ups, and decides any implementation work. | Make the review expectation part of onboarding policy; do not treat the guide as an approval artifact. |
| Failure behavior | Missing data is marked unavailable rather than invented; failed agents retry once and unresolved sections receive a reason. | Add audit events, quality thresholds, and operational ownership before production use. |
| Local application surface | The canvas binds to loopback and uses a per-instance secret token. The extension does not persist a GitHub token. | Validate endpoint, model, and telemetry behavior against enterprise controls and regional requirements. |

## Demo video plan

Target duration: **2 minutes 50 seconds**. Recording should show the GitHub Copilot app, the repository session, and the
Bearing canvas at a readable zoom.

| Time | Show | Narration |
|---|---|---|
| 0:00-0:20 | Open an unfamiliar service repository and briefly show scattered docs and pull requests. | "When developers rotate teams, inherit a service, or join an incident, critical context is fragmented. Service owners repeat the same explanations, and new contributors lose time rebuilding a mental model." |
| 0:20-0:35 | Show the two install commands, then type `/onboard-repo`. | "Bearing transforms that existing onboarding process into a repeatable GitHub Copilot App workflow: one install and one consistent command." |
| 0:35-0:55 | Show the repository scan, immediate canvas open, and two agents starting. | "Copilot plans the journey, then delegates repository mapping and change-history research to two least-privilege, read-only specialists in parallel." |
| 0:55-1:25 | Move through Welcome, Map, and Architecture while sections populate. Open a file reference. | "The cartographer combines semantic repository context with verified files. Claims link back to evidence; missing facts are marked unavailable rather than invented." |
| 1:25-1:45 | Show Conventions and Workflow, including documented versus observed evidence. | "Documented rules stay distinct from patterns observed across at least three files. Bearing shows real setup and test commands but never executes them." |
| 1:45-2:05 | Show Recent changes and a pull request walkthrough. | "The historian adds GitHub-native change context, turning merged pull requests into lessons about why the system evolved." |
| 2:05-2:25 | Click an Ask Copilot action and show the question arriving in chat. | "This is more than a generated document: every item can open a grounded conversation in the same app and repository session." |
| 2:25-2:40 | Show First steps and tick one checklist item. | "The developer reviews the result and controls every next action. Bearing stops before implementation." |
| 2:40-2:50 | End on the architecture slide or completed guide. | "Plan, delegate, validate, review, and scale: reusable skills, specialist agents, GitHub context, governed tools, and interactive canvas make this a customer-copyable Copilot workflow." |

### Recording checklist

- Use a repository with enough architecture and recent pull request history to make every section useful.
- Preload or prebuild the guide if live agent research would make the video exceed three minutes; state that the guide was
  generated by the same workflow.
- Keep tokens, private repository names, notifications, and unrelated browser tabs out of the recording.
- Export at 1080p when possible and verify the final file is no longer than three minutes.
- Add the final video URL here before submission: **TBD**.

## Competitive edge against Claude Code

Bearing demonstrates GitHub Copilot's competitive advantage as an extensible, GitHub-native application platform rather
than only a terminal coding agent. The implemented workflow combines a reusable skill, parallel role-specialized agents,
semantic repository search, current GitHub pull request context, deterministic extension tools, durable local state, and
an interactive canvas in one governed session. Judges can see that differentiation in the product: sections arrive live,
claims link to files and pull requests, checklist state persists, and any guide item becomes a focused Copilot conversation.
Claude Code can analyze a repository and produce onboarding output, but Bearing demonstrates an app workflow with a
purpose-built user experience, explicit role and permission boundaries, progressive multi-agent delivery, and a human
review model embedded alongside the repository. The advantage is not a model claim; it is the integrated workflow surface
and GitHub context shown end to end.

## Judging criteria map

| Criterion | Evidence in this submission |
|---|---|
| Enterprise relevance and customer value | Customers moving from AI adoption to AI outcomes (industry signals, labeled), the light FDE service for field teams, and the value table above; consistent onboarding for team rotation, ownership transfer, incidents, and acquisition integration. |
| Repeatability and field usability | Two-command installation, one invocation, reusable plugin assets, plan-to-ship workflow, light FDE gates for field personas, field customer playbook, proposed pilot measures, a static customer workspace template, demo script. |
| Governance, security, Responsible AI, human-in-the-loop | Role-scoped tools, read-only behavior, untrusted-data instructions, evidence rules, local storage, loopback token, explicit review and production controls. |
| Competitive positioning | Implemented multi-agent workflow, semantic repository context, GitHub pull request history, deterministic tools, durable state, and interactive canvas. |
| Storytelling and demo clarity | 15-slide enterprise deck (Light FDE as a service, with a sourced evidence base) and a timed 2:50 problem-to-value demo script. |
| Product feedback bonus | Five concrete GitHub Copilot App product recommendations grounded in development experience. |

## GitHub Copilot App product feedback

- **Make agent tool validation explicit.** Unknown tool names in an agent manifest are currently dropped silently. A load-time
  error or warning would make least-privilege agent configuration safer and much easier to debug.
- **Refresh installed plugin capabilities in existing sessions.** A session started before plugin installation does not load
  the plugin. An in-app reload path for skills and agents, similar to extension reload, would shorten the build-test loop.
- **Expose canvas diagnostics in the app.** Extension logs are useful, but a canvas status view showing provider connection,
  open input, current URL, and recent action errors would improve debugging.
- **Document app theme behavior as a first-class contract.** Canvas webviews do not follow `prefers-color-scheme`; reliable
  app theme tokens work well, and a consolidated reference with examples would reduce trial and error.
- **Provide a native long-running workflow pattern.** Bearing's agents can take several minutes. Standard progress events,
  cancellation, retry, and resumable task affordances would make these workflows more predictable for users and authors.

## Submission checklist

- [x] Repository contains the plugin, agents, skill, extension tools, canvas UI, prompts, configuration, tests, and templates.
- [x] Root README covers roles, prerequisites, governance, human-in-the-loop operation, and proposed success measures.
- [x] Project summary is no more than 150 words.
- [x] Competitive-edge paragraph is drafted.
- [x] Bonus GitHub Copilot App product feedback is drafted.
- [x] Slide deck is complete: [bearing-enterprise-deck.pptx](bearing-enterprise-deck.pptx).
- [x] Evidence companion: [fde-evidence.md](fde-evidence.md).
- [ ] Demo video is recorded, no more than three minutes, and linked here.
- [ ] External submission is finalised.

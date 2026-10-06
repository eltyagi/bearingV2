# Bearing hackathon submission

## Short project summary

Bearing is a light forward-deployed engineer for any team. Input: a repository. Output: what is worth optimizing, with
evidence. A forward-deployed engineer embeds with a team, explores its codebase, and returns a cited picture of where to
improve. Bearing packages that first pass as a repeatable GitHub Copilot app workflow, so account teams, customer success,
solution sales, and developer stakeholders can run a light pass before a deep-dive. Built today: `/onboard-repo` runs two
read-only, least-privilege agents in parallel and fills a live canvas with a cited map, conventions marked documented or
observed, workflow, merged-PR lessons, first steps, and explicit unavailable sections, then stops before implementation.
Evidence gaps are the first optimization signals; ranked optimization candidates with task briefs are proposed, not built.
Humans review every stage.

**Word count:** 126

**Narrative:** [Read the customer-facing Bearing narrative](narrative.md).

**Enterprise deck:** [19-slide branded deck](bearing-enterprise-deck.pptx) covering the AI trust gap, Bearing's
evidence-first workflow, the delegated work and human review gates at each stage, a slide on the "light forward-deployed
engineer" input and output (a repository in, what to optimize out), the proposed modernization assessment, and a persona
view of how account teams, customer success, solution sales, and developer stakeholders could run a light FDE pass.
Slides marked Prototype are implemented; slides marked Emerging reuse today's guide but are not yet validated; slides
marked Proposed are not built. Ranked optimization candidates are Proposed; Bearing does not find optimizations today.

**Modernization assessment concept:** [Project brief](modernization-brief.md) and [branded Word brief](modernization-brief.docx).
This is a proposed project, not an implemented Bearing capability.

**Workshop knowledge base:** [Reusable building blocks and workshop recipes](workshop-building-blocks.md).

## Why an enterprise customer would use it

A forward-deployed engineer's first pass on a codebase is expensive and hard to repeat. Bearing makes a light version of
it repeatable: read-only, cited, and ending in a human decision. It does not replace a real forward-deployed engineer or
the service owner.

| Business need | Bearing response | Customer value |
|---|---|---|
| Teams want a first-pass view of a repository before a deep-dive | `/onboard-repo` is the light FDE pass: a read-only, cited exploration of one repository. | A cited picture and visible evidence gaps (Emerging) to act on. Ranked optimization candidates are proposed, not built. |
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

## Field-ready customer playbook

**Who uses the pattern:** account teams and solution engineers can introduce it; customer success and enablement teams can
run the pilot; service owners validate the output; developers use the guide. Each audience runs the same light FDE pass.

1. Select one small repository whose owner can verify the generated result.
2. Baseline the current onboarding experience: time spent, people interrupted, sources consulted, and first task attempted.
3. Install Bearing, run `/onboard-repo` as the light FDE pass, and review the guide with the service owner rather than presenting it as ground truth.
4. Capture documentation gaps, policy questions, inaccurate evidence, and unavailable sections as pilot findings; these are the first optimization signals.
5. Agree success measures and enterprise controls before expanding to the next repository cohort.
6. Reuse the demo narrative: "Copilot plans the journey, delegates bounded research, validates evidence, and returns control
   to the developer before any implementation begins."

This gives field teams a customer-ready conversation about productivity, governance, and adoption rather than a one-off
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
| Enterprise relevance and customer value | Enterprise scenarios and value table above; consistent onboarding for team rotation, ownership transfer, incidents, and acquisition integration. |
| Repeatability and field usability | Two-command installation, one invocation, reusable plugin assets, plan-to-ship workflow, light FDE pass for field personas, field customer playbook, proposed success measures, demo script. |
| Governance, security, Responsible AI, human-in-the-loop | Role-scoped tools, read-only behavior, untrusted-data instructions, evidence rules, local storage, loopback token, explicit review and production controls. |
| Competitive positioning | Implemented multi-agent workflow, semantic repository context, GitHub pull request history, deterministic tools, durable state, and interactive canvas. |
| Storytelling and demo clarity | 19-slide enterprise deck (repository in, what to optimize out) and a timed 2:50 problem-to-value demo script. |
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
- [ ] Demo video is recorded, no more than three minutes, and linked here.
- [ ] External submission is finalised.

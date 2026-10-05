# Bearing: from repository uncertainty to a first contribution

## The enterprise problem

At enterprise scale, onboarding is rarely a matter of learning one codebase from one README. A developer may rotate
onto a service during an ownership transfer, join an incident response, support an acquired product, or inherit a
repository when its long-time maintainer moves on. The information they need is spread across source files, setup
instructions, conventions, tests, and the history of pull requests that changed the system. The most important
explanation may still live in one senior engineer's memory.

That creates a costly pattern. A new contributor spends hours reconstructing the shape of the repository before they
can make a safe change. A service owner is interrupted to answer the same questions again: Where does this request
enter? Which directory owns this behavior? Which command is expected before opening a pull request? Why does the code
look this way? If the one person who understands a service is unavailable, the organization has not just lost a
conversation; it has lost the shortest path to a reliable mental model.

Bearing addresses the repeated discovery work around onboarding. It is a prototype plugin for the GitHub Copilot app,
designed for small repositories. It does not claim to replace the service owner or make implementation decisions. Its
purpose is to turn repository orientation into a repeatable, inspectable workflow that a developer can review before
starting work.

## A new engineer's first week

Consider Maya, an engineer rotating onto an internal payments service. Her first assignment is deliberately bounded:
make a small contribution to the service's validation path and open a pull request. The task sounds manageable, but
Maya does not yet know where the request enters, which module owns validation, how the tests are arranged, or what
recent changes might have established an important constraint.

On her first morning, Maya opens the repository README and finds useful setup information, but not the complete map
she needs. She searches for familiar words, follows imports, and opens files that look promising. She finds one likely
entry point, then another. A wiki page describes an older layout. A test uses a helper whose purpose is not obvious.
The pull request history contains the explanation, but only if she knows which changes to read and how they relate to
the current code.

By midday, Maya has a partial theory and several open questions. She can interrupt the service owner for a walkthrough,
send a series of chat messages, or keep guessing and risk beginning in the wrong place. The owner can explain the
system, but that explanation is synchronous, difficult to inspect later, and likely to be repeated for the next person.
Maya needs orientation, not an unreviewed answer and not an autonomous coding session.

## The same scenario with Bearing

Maya starts `/onboard-repo` in the GitHub Copilot app. Bearing scans the repository, detects the available GitHub
context, and opens a live `bearing-guide` canvas. The skill establishes a seven-section guide: overview, map,
architecture, conventions, workflow, recent changes, and first steps. Maya sees the workflow begin rather than waiting
for a single opaque document to appear.

The coordinating Copilot agent delegates the research in parallel. The `repo-cartographer` reads the repository
README and relevant files, uses the semantic index when the repository is on GitHub, and saves evidence-backed sections
about what the project is, where things live, how the main flows work, which conventions are documented or repeatedly
observed, and how the project is developed. The `pr-historian` uses read-only GitHub CLI tools to inspect the latest
merged pull requests and turn their diffs and descriptions into short lessons about how the code evolved. Each agent
has a narrow role and an explicit read-only tool list; neither is given shell access or permission to change the
repository.

The canvas gives Maya a useful review surface while this work happens. She can open the referenced files and pull
requests, see which sections are ready or unavailable, and ask a focused follow-up question from an individual guide
item. The extension performs light checks on saved guide data: invalid paths and line ranges are removed, while missing
evidence remains explicit instead of being silently filled in. Bearing shows setup and test commands as guidance; it
does not run them, and it does not edit the repository.

The human review gates are part of the workflow, not a footnote:

1. **Choose the scope.** Maya deliberately starts onboarding and chooses whether to open an existing guide or build a
   new one.
2. **Inspect the evidence.** She checks the files and pull requests behind the architecture, convention, and workflow
   claims, and treats unavailable information as a gap to resolve.
3. **Ask and challenge.** Where the guide is unclear, she uses an Ask Copilot action or asks the service owner to
   confirm an important assumption.
4. **Decide what happens next.** Bearing proposes a first-contribution checklist, but Maya decides whether the path is
   correct and safe. The workflow stops at orientation; implementation remains her decision.

Maya can now trace her assignment through the repository instead of beginning with a blank page. She knows which files
to read first, how the relevant flow moves through the system, which conventions matter, what commands the project
documents, and what recent pull requests teach about the validation path. The service owner still reviews the guide and
fills gaps, but is no longer the only interface to the system's context.

That is the measurable change Bearing is designed to make visible in a field trial. Teams can compare time to
orientation, evidence coverage, completed guide sections, and first-task readiness; they can also count the people
interrupted during onboarding. The prototype does not collect telemetry, so these are proposed measures and targets,
not claimed product results. The durable outcome is not a generated conversation that disappears in chat. It is a
reviewable, repository-specific guide with sources and a reusable first-steps artifact—produced through bounded
delegation, then handed back to a human before any implementation begins.

For the broader enterprise pattern, see the [workflow transformation and field-ready playbook](README.md). They
describe how to pilot Bearing on one well-understood repository, have its owner review the result, calibrate evidence
gaps, and expand only after repository eligibility, retention, access, and review expectations are agreed.

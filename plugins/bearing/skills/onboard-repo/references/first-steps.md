# First steps (`journey` section)

The first steps turn the guide into a path to a first contribution. Write them after the other sections are done,
from the guide outline (`bearing_get_guide`) and the agents' summaries. Do not read the whole repository again.

## Data

```json
{
  "welcome": "2 or 3 sentences to the developer: what the project is, how big it is, and how long the first steps take.",
  "firstSteps": [
    {
      "title": "Run the tests",
      "detail": "Run `npm ci`, then `npm test`. All tests must pass before you change code.",
      "target": { "section": "workflow", "item": "npm-test" },
      "prompt": "Optional. A question that the Help button sends to Copilot."
    }
  ],
  "gaps": ["What the guide could not confirm, for example: No CONTRIBUTING file."]
}
```

## Rules

- 5 to 8 steps, in the order a new developer does them. A good order:
  1. Read the overview and the "start here" files.
  2. Set up the project and run the tests (link the workflow command).
  3. Trace one key flow (link the architecture flow).
  4. Learn the 2 or 3 most important conventions (link the conventions section).
  5. Study one recent pull request that changed code, if there is one (link it).
  6. Find where a typical change goes (link a map lookup).
  7. A small first task: a test, a doc fix, or a small improvement in an area that the guide explains.
     Make it concrete for this repository. Do not invent an issue number.
- `target.section` is one of `overview`, `map`, `architecture`, `conventions`, `workflow`, `changes`.
- `target.item` must be an ID from `bearing_get_guide` (a pull request number for `changes`). Leave it out if no item fits.
  Never invent an ID.
- `title`: an action, at most 6 words. `detail`: 1 or 2 sentences.
- Add `prompt` only when a specific question helps more than the default ("Help me with this first step").
- `gaps`: up to 5 items from the agents' summaries, and each section that is unavailable.
- Save with `bearing_save_guide_section`, `section: "journey"`. If the tool returns an error, fix the data and save again.

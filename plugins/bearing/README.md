# Bearing

Bearing is a plugin for the GitHub Copilot app. It helps a developer start work on a small repository.

Type `/onboard-repo` in a session. Copilot builds an onboarding guide and shows it in a canvas next to the chat:

| Section | What it gives you |
|---|---|
| **Welcome** | What the project is, the files to read first (in order), the tech stack. |
| **Map** | Answers to "where is…?" questions, and the repository layout with notes on each area. |
| **Architecture** | The main components, and 1 to 3 key flows step by step, with file and line links. |
| **Conventions** | The coding rules. *Documented* rules come from config or docs. *Observed* rules repeat in 3 or more files. |
| **Workflow** | Setup steps, commands, CI, and contribution rules. Bearing shows the commands; it does not run them. |
| **Recent changes** | Step-by-step walkthroughs of the 5 latest pull requests merged into the default branch (bot pull requests are left out). |
| **First steps** | A short checklist to a first contribution. Your progress is saved. |

Each item has an **Ask Copilot** button. It sends a focused question about that item to your session, and the answer comes in the chat.

## How it works

1. The `onboard-repo` skill scans the repository and opens the canvas.
2. Two agents work in parallel:
   - `repo-cartographer` maps the code with the GitHub Copilot semantic index (`semantic_code_search`) and checks each claim in the files.
   - `pr-historian` reads the latest merged pull requests (description, files, reviews, and diff) through the GitHub CLI.
3. Each section shows in the canvas as soon as an agent saves it.
4. Copilot writes the first steps and gives a short summary in the chat.

A full guide takes about 10 to 15 minutes for a small repository.

## Requirements

- The GitHub Copilot app (the canvas needs the app).
- A git repository, preferably on github.com. For other repositories, Bearing uses local search, and the **Recent changes** section is not available.
- The GitHub CLI (`gh`), signed in. The Copilot app includes it.
- A small repository: about 2,000 tracked files or fewer. Bearing works on larger repositories, but the guide is less complete.

## Install

Add the marketplace, then install the plugin:

```bash
copilot plugin marketplace add eltyagi/bearingV2
copilot plugin install bearing@bearing-marketplace
```

Start a new session after you install. If you have another plugin named `bearing` (for example Bearing v1), disable it first:
`copilot plugin disable bearing@<other-marketplace>`.

## Use

| You type | Result |
|---|---|
| `/onboard-repo` | Builds a guide for the repository of the current session. If a guide exists, Copilot asks: open it, or build a new one. |
| `/onboard-repo refresh` | Builds a new guide. Your checklist progress is reset. |
| `/onboard-repo /path/to/repo` | Builds a guide for another local repository. |
| "Onboard me to this repo" | The same as `/onboard-repo`. |

In the canvas:

- Use the tabs, or the **Next** button at the end of each section.
- Select a file or a pull request to open it on GitHub. If the browser does not open, the link is copied.
- Use the question box at the bottom to ask Copilot anything about the repository.

## Data and privacy

- Guides are stored on your computer, one folder for each repository:
  `~/.copilot/extensions/bearing/artifacts/guides/<owner>__<repo>/` (`guide.json` and `progress.json`).
  If you set `COPILOT_HOME`, the folder is under it.
- To delete a guide, delete its folder. To delete all guides, delete `~/.copilot/extensions/bearing/artifacts/guides/`.
- Bearing does not change your repository. It does not run install, build, or test commands.
- The pull request tools run read-only `gh` commands. Bearing does not store a GitHub token.
- The canvas server listens only on `127.0.0.1`. Each canvas has its own secret token in the page URL, so other local programs
  cannot read the guide or send prompts to your session.
- "Ask Copilot" prompts name the guide item only by its ID. The item text goes in a separate reference block, because it
  came from the repository and from pull requests.

## Limits

- This is a prototype. Check important facts in the code.
- github.com only. GitHub Enterprise Server is not supported.
- The semantic index covers the default branch on GitHub. Local changes that are not pushed are found only by file search.
- Monorepos and large repositories get a less complete guide.

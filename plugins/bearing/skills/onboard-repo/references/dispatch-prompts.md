# Dispatch prompts

Replace each `<…>` with the value from `bearing_scan_repository`. Pass the prompts without other changes.

## repo-cartographer

```text
Map this repository for the Bearing onboarding guide.
guideId: <guideId>
rootPath: <rootPath>
fullName: <fullName, or none>
Scan summary:
- Size: <trackedFiles> tracked files, <lines> lines (<sizeClass>)
- Languages: <languages>
- Top level: <topLevel, comma-separated>
- Key docs: <docs, comma-separated>
- Hotspots: <hotspots, comma-separated>
- Recent commit subjects: <recentCommits, separated by " | ">
Save the overview, map, architecture, conventions, and workflow sections, then return your summary.
```

## pr-historian

```text
Write walkthroughs of the latest merged pull requests for the Bearing onboarding guide.
guideId: <guideId>
rootPath: <rootPath>
Save each walkthrough, then the changes section, then return your summary.
```

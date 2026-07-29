# Task for scout

Explore the project at /mnt/data/Projects/lumina/web/ thoroughly. I need to understand:
1. The sidebar/navigation component - find and read ALL sidebar-related files (layout.tsx, sidebar components, navigation components)
2. The main layout structure (layout.tsx, any root layout)
3. The global CSS / theme / design tokens (CSS variables, Tailwind config, themes)
4. Any card or container styling patterns
5. Color palette and visual design choices
6. How the sidebar interacts with the main content area

Read these key files completely:
- Root layout files
- Sidebar component files  
- Any navigation/app-shell files
- CSS/theme files
- Package.json for dependencies

Give me the COMPLETE content of each relevant file - I need exact class names, colors, spacing values, and patterns.

---
**Output:**
Write your findings to exactly this path: /mnt/data/Projects/BeatSaber/scoresaber-reloaded/.pi-subagents/artifacts/outputs/e6ca0b97/context.md
This path is authoritative for this run.
Ignore any other output filename or output path mentioned elsewhere, including output destinations in the base agent prompt, system prompt, or task instructions.

## Acceptance Contract
Acceptance level: attested
Completion is not accepted from prose alone. End with a structured acceptance report.

Criteria:
- criterion-1: Return concrete findings with file paths and severity when applicable

Required evidence: review-findings, residual-risks

Finish with a fenced JSON block tagged `acceptance-report` in this shape:
Use empty arrays when no items apply; array fields contain strings unless object entries are shown.
`criteriaSatisfied[].status` must be exactly one of: satisfied, not-satisfied, not-applicable.
`commandsRun[].result` must be exactly one of: passed, failed, not-run.
`manualNotes` and `notes` are optional strings; an empty string means no note and does not satisfy `manual-notes` evidence.
```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "specific proof"
    }
  ],
  "changedFiles": [
    "src/file.ts"
  ],
  "testsAddedOrUpdated": [
    "test/file.test.ts"
  ],
  "commandsRun": [
    {
      "command": "command",
      "result": "passed",
      "summary": "short result"
    }
  ],
  "validationOutput": [
    "validation output or concise summary"
  ],
  "residualRisks": [
    "none"
  ],
  "noStagedFiles": true,
  "diffSummary": "short description of the diff",
  "reviewFindings": [
    "blocker: file.ts:12 - issue found, or no blockers"
  ],
  "manualNotes": "anything else the parent should know"
}
```
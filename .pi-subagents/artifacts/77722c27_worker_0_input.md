# Task for worker

You are a delegated subagent running from a fork of the parent session. Treat the inherited conversation as reference-only context, not a live thread to continue. Do not continue or answer prior messages as if they are waiting for a reply. Your sole job is to execute the task below and return a focused result for that task using your tools.

Task:
Go through each page component in /mnt/data/Projects/BeatSaber/scoresaber-reloaded/projects/website/src/app/(pages)/ and identify ALL inline/component class-level styling that uses:
1. `border-border` - should be changed to use rings instead
2. `rounded-lg` - should be `rounded-xl` for consistency
3. `bg-card/90`, `bg-background/90`, `bg-muted/50`, `bg-accent/50` etc - any opacity backgrounds
4. `backdrop-blur` effects
5. `shadow-xs`, `shadow-sm` usage
6. Custom spacing (`--spacing-lg`, `--spacing-sm`, etc)
7. `text-white` (should use text-foreground instead)
8. Any heavy borders that could be simplified

For each page file, read it and list all the issues you find with the specific line content and line number. Then for each issue, suggest the specific replacement.

Focus on:
- /mnt/data/Projects/BeatSaber/scoresaber-reloaded/projects/website/src/app/(pages)/page.tsx (home page)
- /mnt/data/Projects/BeatSaber/scoresaber-reloaded/projects/website/src/app/(pages)/ranking/[[...slug]]/page.tsx
- /mnt/data/Projects/BeatSaber/scoresaber-reloaded/projects/website/src/app/(pages)/settings/page.tsx
- /mnt/data/Projects/BeatSaber/scoresaber-reloaded/projects/website/src/app/(pages)/scores/top/page.tsx
- /mnt/data/Projects/BeatSaber/scoresaber-reloaded/projects/website/src/app/(pages)/scores/live/page.tsx
- /mnt/data/Projects/BeatSaber/scoresaber-reloaded/projects/website/src/app/(pages)/leaderboard/[id]/page.tsx
- /mnt/data/Projects/BeatSaber/scoresaber-reloaded/projects/website/src/app/(pages)/player/[id]/page.tsx
- /mnt/data/Projects/BeatSaber/scoresaber-reloaded/projects/website/src/app/(pages)/medals/[[...slug]]/page.tsx
- /mnt/data/Projects/BeatSaber/scoresaber-reloaded/projects/website/src/app/(pages)/maps/[type]/page.tsx

For each one, read the page file AND the main component it renders (the imported component that has the actual UI). Give me exact line numbers and suggested replacements.

## Acceptance Contract
Acceptance level: checked
Completion is not accepted from prose alone. End with a structured acceptance report.

Criteria:
- criterion-1: Implement the requested change without widening scope

Required evidence: changed-files, tests-added, commands-run, residual-risks, no-staged-files

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
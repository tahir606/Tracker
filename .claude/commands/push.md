---
description: Commit all changes and push to GitHub
argument-hint: [optional commit message]
allowed-tools: Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*)
---

Commit and push the current changes to GitHub:

1. Run `git status` and `git diff` to review what has changed.
2. If there are no changes at all (working tree clean and nothing unpushed), say so and stop.
3. Stage all changes with `git add -A`.
4. Commit the staged changes:
   - If a commit message was provided, use it: "$ARGUMENTS"
   - Otherwise, write a concise conventional-commit message (e.g. `feat: ...`, `fix: ...`) based on the actual diff.
5. Push to the current branch's remote with `git push` (use `git push -u origin <branch>` if the branch has no upstream yet).
6. Report the commit hash, message, and confirmation that the push succeeded.

Never force-push, never amend existing commits, and never push directly if the push is rejected — report the rejection instead.

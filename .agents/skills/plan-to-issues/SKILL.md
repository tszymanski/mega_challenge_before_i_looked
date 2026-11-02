---
name: plan-to-issues
description: Split this repo's plan.md into GitHub issues with gh, one per unit of work, after a human has reviewed the split. Use when a plan is ready and has no issues yet.
---

# plan-to-issues

Turns `plan.md` into GitHub issues that workers can pick up cold. Easiest with `gh`, authenticated,
in a shell this agent can run.

## Steps

1. Read `plan.md`, `AGENTS.md` and `docs/adr/`.
2. Draft the split as a table: title · plan section · scope · done when · blocked by.
   One issue per unit of work.
3. **Stop and show the table to the human.** Publish nothing until they approve it.
4. Give every issue the shape in "What every issue carries" below. Ask the human only about
   what that section doesn't cover, and write their answer into it.
5. Create each issue in dependency order, so blocked-by can cite real numbers:

   ```sh
   gh issue create --title "<title>" --body-file <tmp.md>
   ```

6. Record every issue URL from gh's output (not from memory) and reply with the list.

Closing one, with the closing comment from AGENTS.md:

```sh
gh issue close <n> -c "<closing comment>"
```

## What every issue carries

Approved by the human for plan morning-digest (2026-11-02, issues #1–#8); use it for every plan.

- **Label:** `plan:<plan name from plan.md frontmatter>`, for example `plan:morning-digest`.
  Create it once per plan: `gh label create "plan:<name>"`.
- **Title:** what the issue delivers, short, with the route or function name if it has one.
- **Body**, in this order:

  ```md
  Source: plan.md § <n>

  **Scope:** <what this issue changes, from the plan section; nothing more>

  **Done when:** <the plan's "Done when", word for word, as a check anyone can run>

  **Blocked by:** <#n, or "—"; say "(the check needs #n)" when work can start earlier than it can close>

  **Model:** <strongest (logic) | cheaper (views, tests) | — (human + agent)>
  ```

  The first line is exactly `Source: plan.md § <n>`, with the subsection letter when there is
  one (`§ 2a`). Reviewers sort by it.

- **Split rules:**
  - One issue per unit of work. When the plan says a part must land first so others can start
    (a types file, a contract), that part is its own issue.
  - A step that waits on someone outside the repo (a reviewer, a customer, a deploy) is its own
    issue. It stays open until they have acted, not until you have sent it, and every clean-up
    after it is blocked by it.

## No `gh`

Steps 1–4 hold either way. GitHub reachable another way (a connector, the REST API, the web UI):
the same issues, made that way. GitHub issues out of reach altogether: write them as files in
`docs/issues/`, format in ADR 0004, then commit and push.

## Don'ts

- Don't paste the whole plan into one issue, and don't keep issues only in chat.
- Don't invent sections the plan doesn't have. If the plan is unclear, ask.

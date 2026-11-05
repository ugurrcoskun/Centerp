# Centerp

Reply concisely in Turkish. Finish authorized work; preserve user changes.
Use the repository owner’s configured Git identity for author/committer; do not add Codex attribution unless requested.

## Efficient workflow

- Do small tasks directly. Delegate only a bounded, useful independent task.
- Give a short task summary, exact files and acceptance criteria; avoid copying the full chat.
- Use one Developer/Explorer when useful; Architect for hard design, one focused Reviewer for risky auth/escrow changes. Do not run a role chain for every task.
- At most two subagents plus the primary. No recursive delegation or concurrent writes to one file.
- Search relevant paths with rg. Read only needed sections. Summarize logs; rerun passing checks only after relevant changes or new failures.
- Keep secrets and private backups out of output/Git. Respect approval rejections. Do not enable Mainnet implicitly.

## Project map and checks

app/: UI/API. lib/: auth.ts, access.ts, erp.ts, stellar.ts, keeper.ts. contracts/invoice-escrow/: Rust.

Run relevant checks: npm test, npm run typecheck; UI/API: npm run build; contract: npm run contract:test and npm run contract:build. Network tests only for affected flows.

Update only relevant items in docs/FEEDBACK_ACTION_PLAN.md. Mark user checks only after explicit user acceptance.

Models/roles: .codex/config.toml and .codex/agents/*.toml. Details on demand: docs/development/AGENT_ARCHITECTURE.md. Existing chats keep their active model; project defaults do not switch it live.

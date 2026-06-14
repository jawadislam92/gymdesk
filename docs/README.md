# GymFlow Suite — Documentation Index

**Start here.** This folder is the project's memory. Any new session/developer/agent should
read these in order and be fully current — no re-discovery needed.

| Read order | Document | What it is |
|---|---|---|
| 1 | [`../CLAUDE.md`](../CLAUDE.md) | **Session handoff** — current status, how to run, env notes, next steps. The fastest "where are we". |
| 2 | [`BUILD_TRACKER.md`](BUILD_TRACKER.md) | **The living checklist.** Every feature as a checkbox, grouped by phase. The single source of truth for *what's done / what's next*. Tick boxes as work lands. |
| 3 | [`DECISIONS.md`](DECISIONS.md) | **Decisions + environment audit + solved gotchas.** Why things are the way they are, the local machine setup, and fixes for problems already solved (so we never re-debug them). |
| 4 | [`PRODUCT_EXPANSION_PLAN.md`](PRODUCT_EXPANSION_PLAN.md) | **The full product scope (v2):** the four surfaces, ~80-feature catalog from market research, web-first tiered roadmap. The north star. |
| 5 | [`PRODUCT_PLAN.md`](PRODUCT_PLAN.md) | Original technical plan: DB schema (§8), RBAC (§9), API (§14), security, pricing, launch. |

## How to keep these current (the rule)
- **When you finish a feature:** tick its box in `BUILD_TRACKER.md` and add a one-line note.
- **When you make a non-obvious choice or solve a tricky bug:** add it to `DECISIONS.md`.
- **At the end of a work session:** refresh the "Current status" + "Next steps" in `CLAUDE.md`.
- Keep these three files accurate and any agent can take over cold. That is the whole point.

## Goal & guardrails (context for prioritization)
- **Business goal:** a commercial gym SaaS targeting **$10k+/month**. Decisions favor what makes
  a gym *pay and stay* and what *differentiates* vs. Mindbody/Glofox/PushPress.
- **Owner is non-technical** — explain in plain language, build end to end, don't hand back
  technical homework.
- **Build order:** complete the **web** product across all four surfaces (Phase A→B→C in the
  expansion plan), then desktop, then mobile.

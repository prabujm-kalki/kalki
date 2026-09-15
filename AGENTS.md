<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Kalki BOS Core Development Principles

## 1. Configurable, Reusable & Production-Grade Architecture
**Nothing should be built as a temporary, fixed, hard-coded solution when the requirement can reasonably be made configurable, reusable, scalable, and production-ready.**

- **Configurable over hard-coded**: Do not assume fixed formats for reports, external exports, UI field terminologies, or workflows.
- **Intelligent matching**: Implement intelligent auto-detect and fuzzy matching for user inputs (e.g., Excel header mapping) before falling back to manual mapping.
- **Save configurations**: Always persist user configurations (mappings, preferences) so they don't have to repeat manual work.
- **Production-readiness**: Evaluate every feature against real-world scenarios (multiple locations, changing integrations, dirty data, etc). Do not just solve for the immediate test case.
- **Customer Experience**: Optimize for the end-user. Minimize repetitive, confusing, or error-prone manual tasks.

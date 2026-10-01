# Strict Destructive Commands Rule

**CRITICAL RULE:** Never execute scripts that drop schemas, truncate tables, or wipe databases (like `reset.ts`, `seed.ts` involving drops, etc.) without explicit and informed permission from the user. 
- Always review the contents of a script using `view_file` before executing it if you are not 100% sure what it does.
- Do not assume that passing `--query` or similar flags to a custom script will bypass its hardcoded drop/reset logic.
- If you need to perform a database query to debug, use a safe client tool or write a read-only script exclusively for querying.

This rule exists because an AI previously obliterated a production database by carelessly executing a reset script.

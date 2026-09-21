---
trigger: always_on
description: Database safety rules for preventing accidental data loss
---

# Database Deletion Safety Rule

**CRITICAL RULE:** Always perform a "dry run" by running a SELECT query first and asking for the user's explicit confirmation before executing any DELETE operations on the database.

- **Never** execute a `DELETE` query or run a deletion script blindly.
- **Always** write a preview script or query to output the records that will be affected.
- **Always** present the list or summary of records to the user and wait for their approval.
- **Always** use explicit ID targeting (e.g., `WHERE id IN (...)`) for the final deletion to guarantee safety, rather than re-running broad pattern-matching conditions.

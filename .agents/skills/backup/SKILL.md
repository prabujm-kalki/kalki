---
name: backup
description: >-
  Runs a full PostgreSQL database backup using pg_dump. Use this whenever the user asks to backup the database.
---

# Database Backup Skill

When the user requests to create a database backup, execute the following command in the terminal:

```bash
npm run db:backup
```

Wait for the command to complete. Do not make any further queries or edits until it confirms that the backup was successfully created in the `backups/` directory.

After the backup is complete, inform the user that the snapshot has been successfully saved.

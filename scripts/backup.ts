import { exec } from "child_process";
import fs from "fs";
import path from "path";
import "dotenv/config";

const backupsDir = path.join(process.cwd(), "backups");
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupFile = path.join(backupsDir, `db-backup-${timestamp}.sql`);

console.log(`Starting backup to ${backupFile}...`);

// Use the database URL from the environment
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("ERROR: DATABASE_URL is not set in .env");
  process.exit(1);
}

// Ensure the db URL has the correct format for pg_dump
// This is a basic spawn of pg_dump
const cmd = `pg_dump "${dbUrl}" -F c -f "${backupFile}"`;

exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error(`Backup failed: ${error.message}`);
    return;
  }
  if (stderr && !stderr.includes("warning")) {
    console.error(`Backup stderr: ${stderr}`);
  }
  console.log(`Backup successfully created: ${backupFile}`);
});

import { exec } from "child_process";
import fs from "fs";
import path from "path";
import "dotenv/config";

const backupFile = process.argv[2];
if (!backupFile) {
  console.error("ERROR: Please provide the path to the backup file.");
  console.error("Usage: npx tsx scripts/restore.ts backups/db-backup-[timestamp].sql");
  process.exit(1);
}

if (!fs.existsSync(backupFile)) {
  console.error(`ERROR: Backup file not found at ${backupFile}`);
  process.exit(1);
}

// Ensure safety check
if (!process.argv.includes("--confirm-restore")) {
  console.error("ERROR: Restoring will overwrite the current database.");
  console.error("To proceed, you must append --confirm-restore to the command.");
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("ERROR: DATABASE_URL is not set in .env");
  process.exit(1);
}

console.log(`Starting restore from ${backupFile}...`);

// Use pg_restore for custom format dumps (-F c)
const cmd = `pg_restore -d "${dbUrl}" -1 -c "${backupFile}"`;

exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error(`Restore failed: ${error.message}`);
    return;
  }
  if (stderr && !stderr.includes("warning")) {
    console.error(`Restore stderr: ${stderr}`);
  }
  console.log(`Database successfully restored from ${backupFile}`);
});

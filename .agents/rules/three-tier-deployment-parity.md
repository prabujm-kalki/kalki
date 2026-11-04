# Strict Three-Tier Code Deployment Rule (100% Parity)

**CRITICAL MANDATORY RULE:**
Under NO circumstances should any AI agent perform direct file edits or ad-hoc patching on the remote production server.

All changes must strictly follow the Three-Tier Deployment Pipeline:
`Local Environment` ──► `GitHub Repository (main)` ──► `Production Server`

---

## 1. Zero Direct Server Edits
- **NEVER** edit files directly on `/home/ubuntu/kalki` on the production server.
- **NEVER** bypass Git by pushing scratch scripts or manual file overrides to the server filesystem.

## 2. The Strict Three-Tier Workflow

### Tier 1: Local Development & Validation
1. Edit code exclusively in the local repository workspace (`c:\Users\prabu\kalki`).
2. Run typechecking / validation locally to verify stability:
   ```bash
   npm run typecheck
   ```

### Tier 2: Commit & Push to GitHub
1. Stage modified files and make clear, descriptive commits:
   ```bash
   git add <modified-files>
   git commit -m "feat/fix: <description>"
   git push origin main
   ```
2. Verify that GitHub `origin main` is up to date.

### Tier 3: Production Pull & Reload (ONLY on Explicit User Command)
> **MANDATORY**: Never push to `origin/main` or trigger a production server deployment automatically. Work locally, batch changes, and deploy to production **only when the user explicitly instructs** (e.g. *"push to production"*, *"deploy to server"*).
> 
> **CRITICAL EXECUTION RULE (Fast Artifact Pipeline)**:
> When the user gives the explicit command to deploy/push to production, the AI agent **MUST NOT** trigger `npm run build` on the remote production server (the VM has < 1GB RAM and will freeze from swap memory thrashing).
>
> The agent **MUST execute the automated fast deployment pipeline locally in the same turn**:
> ```powershell
> powershell -ExecutionPolicy Bypass -File scripts/deploy-production.ps1
> ```
> *(or `npm run deploy:prod`)*.
> 
> This script executes the complete sequence end-to-end:
> 1. Pushes latest Git commits to `origin main`
> 2. Compiles Next.js locally in ~9 seconds (`npx next build`)
> 3. Creates a lightweight bundle `next_build_prod.tar.gz` (~22MB)
> 4. SCPs the bundle to `140.245.253.187:/home/ubuntu/kalki/`
> 5. Runs remote SSH to pull Git (`git pull origin main`), unpacks the `.next` bundle, and restarts `kalki-web` cleanly via PM2.
> 6. Cleans up temporary artifacts. Total execution time: **< 60 seconds**.

---

## 3. Mandatory 100% Code Parity
At all times:
$$\text{Local (Windows)} == \text{GitHub (origin/main)} == \text{Production Server (/home/ubuntu/kalki)}$$

If any drift occurs, rebase or pull from GitHub to restore 100% clean parity before proceeding with new work.

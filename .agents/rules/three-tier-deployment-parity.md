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
> **MANDATORY**: Never push to `origin/main` or trigger a production server deployment automatically. Work locally, batch changes, and deploy to production **only when the user explicitly instructs** (e.g. *"push to production"*).

1. Pull the pushed changes from GitHub onto the production server:
   ```bash
   ssh -i "$HOME/.ssh/oracle_kalki.key" ubuntu@140.245.253.187 "cd /home/ubuntu/kalki && git pull origin main && pm2 restart all"
   ```
2. If dependencies changed:
   ```bash
   npm install --legacy-peer-deps
   ```
3. If Next.js code changed:
   ```bash
   npm run build && pm2 restart all
   ```

---

## 3. Mandatory 100% Code Parity
At all times:
$$\text{Local (Windows)} == \text{GitHub (origin/main)} == \text{Production Server (/home/ubuntu/kalki)}$$

If any drift occurs, rebase or pull from GitHub to restore 100% clean parity before proceeding with new work.

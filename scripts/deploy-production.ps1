# Production Fast Deployment Script
# Kalki BOS 3-Tier Pipeline with Local Pre-Build Artifact Shipping

$ErrorActionPreference = "Stop"

$serverIp = "140.245.253.187"
$serverUser = "ubuntu"
$sshKeyPath = "$HOME/.ssh/oracle_kalki.key"
$remoteAppDir = "/home/ubuntu/kalki"
$artifactName = "next_build_prod.tar.gz"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Kalki BOS: Fast Production Deployment    " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Check Git Status
Write-Host "`n[1/5] Checking Git Status..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "Working tree has uncommitted changes. Please commit or stash them before deploying." -ForegroundColor Red
    exit 1
}

# 2. Push Code to GitHub (Tier 2)
Write-Host "`n[2/5] Pushing latest commits to GitHub (origin/main)..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to push to GitHub. Aborting deployment." -ForegroundColor Red
    exit 1
}

# 3. Compile Next.js Locally (Tier 1)
Write-Host "`n[3/5] Compiling Next.js production build locally..." -ForegroundColor Yellow
npx next build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Local Next.js build failed. Deployment halted." -ForegroundColor Red
    exit 1
}

# 4. Package Pre-Built Artifacts
Write-Host "`n[4/5] Packaging lightweight production bundle..." -ForegroundColor Yellow
if (Test-Path $artifactName) {
    Remove-Item $artifactName -Force
}

tar -czf $artifactName --exclude=.next/cache --exclude=.next/dev .next/server .next/static .next/types .next/*.json .next/BUILD_ID .next/turbopack .next/required-server-files.*
if (-not (Test-Path $artifactName)) {
    Write-Host "Failed to create $artifactName" -ForegroundColor Red
    exit 1
}

$fileSizeMb = [math]::Round(((Get-Item $artifactName).Length / 1MB), 2)
Write-Host "Bundle created successfully: $fileSizeMb MB" -ForegroundColor Green

# 5. Ship to Server & Restart (Tier 3)
Write-Host "`n[5/5] Shipping bundle to $serverIp and restarting service..." -ForegroundColor Yellow
scp -i $sshKeyPath -o BatchMode=yes -o StrictHostKeyChecking=no $artifactName "${serverUser}@${serverIp}:${remoteAppDir}/${artifactName}"
if ($LASTEXITCODE -ne 0) {
    Write-Host "SCP file transfer failed." -ForegroundColor Red
    Remove-Item $artifactName -Force -ErrorAction SilentlyContinue
    exit 1
}

$remoteCommand = "cd $remoteAppDir && git pull origin main && rm -rf .next && tar -xzf $artifactName && rm -f $artifactName && pm2 restart kalki-web && pm2 status"
ssh -i $sshKeyPath -o BatchMode=yes -o StrictHostKeyChecking=no "${serverUser}@${serverIp}" $remoteCommand

# Cleanup local artifact
Remove-Item $artifactName -Force -ErrorAction SilentlyContinue

Write-Host "`n Deployment successfully completed! Web service restarted." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

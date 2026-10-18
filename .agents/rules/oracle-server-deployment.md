# Oracle Cloud Production Server Details

- **Cloud Provider**: Oracle Cloud Infrastructure (OCI)
- **Host OS**: Ubuntu (x86_64)
- **Public IP**: `140.245.253.187`
- **SSH User**: `ubuntu`
- **SSH Key**: `C:\Users\prabu\.ssh\oracle_kalki.key`
- **App Directory**: `/home/ubuntu/kalki`
- **Process Manager**: PM2 (`kalki-web` on port 3000, `kalki-cron`)
- **Reverse Proxy**: Nginx (`/etc/nginx/sites-available/default`) listening on port 80 proxying to `127.0.0.1:3000`
- **Certbot / SSL**: `/usr/bin/certbot` installed, ready for certificate generation
- **Database**: PostgreSQL 17 (`kalki_bos` owned by user `kalki`)

### Quick Connect Command
```bash
ssh -i "$HOME/.ssh/oracle_kalki.key" ubuntu@140.245.253.187
```

### Git / Deployment Workflow
On remote server `/home/ubuntu/kalki`:
```bash
git pull origin main
npm install --legacy-peer-deps
npm run build
pm2 restart all
```

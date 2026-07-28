# Deploy GymReach CRM — 10-minute guide

You'll get a public URL like `gymreach-production.up.railway.app` that opens on your phone.

## Why Railway?

The app uses SQLite (a file-based database) to store your 1,893 leads. Serverless platforms like Vercel wipe their filesystem on every cold start — which would delete your leads. Railway gives you a **persistent volume** so your data survives forever, plus a free trial tier.

---

## Step 1 — Push the code to GitHub (3 min)

### Option A: Create a new GitHub repo
1. Go to **github.com/new**
2. Repository name: `gymreach-crm`
3. Set to **Private** (your leads are business data)
4. **Don't** add README/license/.gitignore (already included)
5. Click **Create repository**

### Option B: Push from this project
From your terminal (the project is already a git repo on `main`):

```bash
cd /home/z/my-project
git remote add origin https://github.com/YOUR_USERNAME/gymreach-crm.git
git push -u origin main
```

If you haven't committed the latest changes yet:
```bash
git add -A
git commit -m "Production-ready: 1893 UK gym leads + Dockerfile + deploy config"
git push -u origin main
```

---

## Step 2 — Deploy on Railway (5 min)

1. Go to **railway.app** → sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `gymreach-crm` repository
4. Railway detects the `railway.json` + `Dockerfile` and starts building automatically

### Add a persistent volume (so leads survive restarts)
1. In your Railway project, click the **service** (your app)
2. Go to **Settings** tab
3. Scroll to **Volumes** → click **Add Volume**
4. Mount path: `/data`
5. Click **Add**

### Set the environment variable
1. Go to **Variables** tab
2. Add variable:
   - `DATABASE_URL` = `file:/data/custom.db`
   (The Dockerfile already sets this, but adding it in Railway makes it explicit/overridable.)

### Generate the public URL
1. Go to **Settings** → **Networking**
2. Click **Generate Domain**
3. You'll get a URL like `gymreach-crm-production.up.railway.app`

---

## Step 3 — Open on your phone (instant)

1. Copy the Railway URL
2. Text/email it to yourself
3. Open on your phone — the dashboard loads with all 1,893 leads
4. Bookmark it or add to home screen for app-like access

---

## What happens on first deploy

The container start command runs:
1. `bun run db:push` — creates the SQLite database on the persistent volume
2. `bun run scripts/bootstrap.ts` — detects empty database, imports all 1,893 leads from `db-backup.json`
3. `node server.js` — starts the Next.js server

On subsequent deploys/restarts, the volume persists your data — the bootstrap script sees the database isn't empty and skips the import. Any outreach progress (status changes, notes, new leads) is preserved.

---

## Costs

- **Railway free trial**: $5 credit ≈ 30–60 days of this app (tiny traffic, single user)
- After trial: **$5/month** minimum (Hobby plan) — worth it for a business tool
- If you need truly free: see "Alternative: Fly.io" below

---

## Troubleshooting

### Build fails on Railway
- Check the **Deploy Logs** tab in Railway
- Most common: `bun.lock` out of sync → run `bun install` locally, commit the updated lockfile, push again

### App loads but shows 0 leads
- The volume mount may not be set up → repeat "Add a persistent volume" step
- `DATABASE_URL` must be `file:/data/custom.db` (not the local path)

### App shows leads but they disappear after restart
- Volume not mounted at `/data` → check Railway Volumes settings

### Need to reset the database
- In Railway, go to your service → **Settings** → **Volumes** → remove the volume, then re-add it
- Next deploy will re-import the 1,893 leads from backup

---

## Alternative: Fly.io (truly free tier)

If Railway's trial runs out and you need free:

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# From the project directory
fly launch           # auto-detects Dockerfile
fly volumes create data --size 1
fly deploy
```

Then in `fly.toml`, add:
```toml
[mounts]
  source = "data"
  destination = "/data"
```
Set `DATABASE_URL=file:/data/custom.db` with `fly secrets set DATABASE_URL=file:/data/custom.db`.

Fly.io's free tier includes 3 shared-cpu 1GB VMs — more than enough for this app forever.

---

## Alternative: Vercel (NOT recommended for this app)

Vercel is the default for Next.js but **SQLite will not work** — Vercel's serverless functions have no persistent filesystem. Your leads would vanish on every cold start.

To use Vercel you'd need to migrate the database to Postgres (Neon or Supabase free tier), which is a bigger change. Stick with Railway/Fly for SQLite persistence.

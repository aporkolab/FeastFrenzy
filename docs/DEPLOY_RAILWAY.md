# Deploy FeastFrenzy to Railway

A comprehensive guide for deploying FeastFrenzy to Railway.app.

## Prerequisites

- Railway account ([railway.app](https://railway.app))
- GitHub repository with FeastFrenzy code
- Railway CLI (optional, but recommended)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Railway Project                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌────────┐  ┌────────┐  │
│  │   Frontend  │  │   Backend   │  │  MySQL │  │  Redis │  │
│  │   (nginx)   │──│   (Node)    │──│   DB   │  │ Cache  │  │
│  └─────────────┘  └─────────────┘  └────────┘  └────────┘  │
│        │                │              ▲           ▲        │
│        │                │              │           │        │
│        │                └──────────────┴───────────┘        │
│        ▼                                                     │
│   https://feastfrenzy.up.railway.app                        │
└─────────────────────────────────────────────────────────────┘
```

## Step 1: Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Empty Project"**
4. Give it a name (e.g., `feastfrenzy`)

## Step 2: Add Database Services

### Add MySQL Database

1. In your project, click **"+ New"** → **"Database"** → **"MySQL"**
2. Wait for provisioning (usually ~30 seconds)
3. Railway auto-generates `DATABASE_URL`

### Add Redis Cache

1. Click **"+ New"** → **"Database"** → **"Redis"**
2. Wait for provisioning
3. Railway auto-generates `REDIS_URL`

## Step 3: Deploy Backend Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your FeastFrenzy repository
3. **Important**: Set the root directory to `/backend`
   - Go to **Settings** → **Root Directory** → enter `backend`

### Configure Backend Environment Variables

Go to **Variables** tab and add:

```bash
# Required
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
FRONTEND_URL=https://your-frontend.up.railway.app

# Optional (good defaults already in place)
CACHE_ENABLED=true
DB_LOGGING=false
DB_POOL_MAX=10
```

### Link Database Variables

1. Go to **Variables** → **"Add Reference"**
2. Select **MySQL** → Click on `DATABASE_URL` → Add
3. Select **Redis** → Click on `REDIS_URL` → Add

### Set Start Command

Go to **Settings** → **Deploy** → **Start Command**:

```bash
npm run start:prod
```

> Note: Migrations run automatically via `postinstall` script when `NODE_ENV=production`

## Step 4: Deploy Frontend Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your FeastFrenzy repository (again)
3. Set root directory to `/frontend`

### Configure Frontend Build

Go to **Settings**:

- **Build Command**: `npm run build`
- **Start Command**: Leave empty (uses nginx from Dockerfile)

### Configure Frontend Environment Variables

```bash
API_URL=https://[your-backend].up.railway.app/api/v1
```

### Update Frontend environment.prod.ts

After deploying backend, get its URL and update:

```typescript
// frontend/src/environments/environment.prod.ts
apiUrl: 'https://feastfrenzy-backend.up.railway.app/api/v1',
```

Then push the change - Railway will auto-redeploy.

## Step 5: Update CORS

After frontend deploys, copy its URL and update backend:

1. Go to Backend service → **Variables**
2. Update `FRONTEND_URL` to your actual frontend URL
3. Railway will auto-redeploy

## Step 6: Verify Deployment

### Health Check

```bash
curl https://[your-backend].up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "redis": "ok"
  },
  "uptime": 123.456,
  "environment": "production"
}
```

### API Docs

Visit: `https://[your-backend].up.railway.app/api-docs`

### Frontend

Visit: `https://[your-frontend].up.railway.app`

## Manual Seed (Optional)

If you need to seed initial data:

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Link project: `railway link`
4. Run seed:

```bash
railway run --service backend npm run seed
```

## Troubleshooting

### Database Connection Fails

- Check `DATABASE_URL` is linked in Variables
- Check MySQL service is running (green status)
- Check logs: `railway logs --service backend`

### CORS Errors

- Verify `FRONTEND_URL` matches actual frontend domain
- Check both http and https variations
- Redeploy backend after changing `FRONTEND_URL`

### Migrations Fail

Run manually:
```bash
railway run --service backend npm run migrate
```

Check migration status:
```bash
railway run --service backend npm run migrate:status
```

### Frontend Can't Connect to Backend

1. Check browser console for CORS errors
2. Verify `apiUrl` in `environment.prod.ts` matches backend URL
3. Ensure backend is healthy: `curl [backend-url]/health`

### Redis Connection Issues

- Check `REDIS_URL` is linked
- Temporarily set `CACHE_ENABLED=false` to bypass Redis
- Check Redis service status in Railway dashboard

## Cost Estimation

Railway Free Tier includes:
- $5 credit/month
- 500 hours of compute

Estimated usage for FeastFrenzy:
- Backend (Node): ~$2-3/month
- Frontend (nginx): ~$1/month  
- MySQL: ~$2-3/month
- Redis: ~$1/month

**Total**: ~$7-8/month (may exceed free tier slightly)

> **Tip**: Use Hobby plan ($5/month) for consistent availability

## Useful Commands

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# View logs
railway logs

# Run command on service
railway run --service backend npm run migrate:status

# Open project in browser
railway open

# View environment
railway variables
```

## URLs After Deployment

| Service | URL Pattern |
|---------|-------------|
| Backend API | `https://[project]-backend.up.railway.app/api/v1` |
| API Docs | `https://[project]-backend.up.railway.app/api-docs` |
| Frontend | `https://[project]-frontend.up.railway.app` |
| Health Check | `https://[project]-backend.up.railway.app/health` |

---

## Quick Reference

### Environment Variables Checklist

Backend (Required):
- [ ] `JWT_SECRET` (32+ chars)
- [ ] `NODE_ENV=production`
- [ ] `FRONTEND_URL`
- [ ] `DATABASE_URL` (auto-linked)
- [ ] `REDIS_URL` (auto-linked)

Frontend:
- [ ] `API_URL` or update `environment.prod.ts`

### Post-Deploy Checklist

- [ ] Health endpoint returns `status: ok`
- [ ] Swagger docs accessible at `/api-docs`
- [ ] Frontend loads and displays login page
- [ ] Can register new user
- [ ] Can login and access protected routes
- [ ] CRUD operations work on all entities

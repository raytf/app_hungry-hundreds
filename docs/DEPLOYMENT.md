# Deployment Guide

## Overview

Hungry Hundreds is a PWA deployed to **Cloudflare Pages** with backend services on **Supabase**. This guide covers the deployment process for both the frontend PWA and Supabase Edge Functions.

## Prerequisites

- **Cloudflare Account** - Free tier is sufficient
- **Supabase Account** - Free tier for database and Edge Functions
- **Firebase Account** - For Cloud Messaging (push notifications)
- **Wrangler CLI** - Installed via `pnpm install` (included in devDependencies)
- **Supabase CLI** - For Edge Functions deployment
- **Git Repository** - For automatic deployments

## Cloudflare Configuration

### Adapter Setup

The project uses `@sveltejs/adapter-cloudflare` configured in `svelte.config.js`:

```javascript
import adapter from '@sveltejs/adapter-cloudflare';

const config = {
	kit: { adapter: adapter() }
};
```

This adapter:

- Compiles SvelteKit app to Cloudflare Workers format
- Generates `_worker.js` in `.svelte-kit/cloudflare/`
- Handles static asset serving via Cloudflare CDN

### Wrangler Configuration

Configuration file: `wrangler.jsonc`

```jsonc
{
	"name": "sv-app", // Project name
	"compatibility_date": "2026-01-12", // Workers runtime version
	"compatibility_flags": ["nodejs_als"], // Node.js compatibility
	"main": ".svelte-kit/cloudflare/_worker.js", // Entry point
	"assets": {
		"binding": "ASSETS",
		"directory": ".svelte-kit/cloudflare"
	},
	"workers_dev": true, // Enable preview deployments
	"preview_urls": true // Generate preview URLs
}
```

## Deployment Methods

### Method 1: Automatic Deployment (Recommended)

#### Setup Cloudflare Pages

1. **Connect Repository**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to Pages → Create a project
   - Connect your Git repository (GitHub/GitLab)

2. **Configure Build Settings**

   ```
   Build command: pnpm build
   Build output directory: .svelte-kit/cloudflare
   Root directory: /
   ```

3. **Environment Variables**
   - No environment variables needed for Phase 1
   - For future phases, add in Pages settings

4. **Deploy**
   - Push to main branch
   - Cloudflare automatically builds and deploys

#### Branch Deployments

- **Production**: `main` branch → `your-app.pages.dev`
- **Preview**: Other branches → `<branch>.your-app.pages.dev`

### Method 2: Manual Deployment via Wrangler

#### First-time Setup

1. **Login to Cloudflare**

   ```bash
   pnpm wrangler login
   ```

2. **Build the Project**

   ```bash
   pnpm build
   ```

3. **Deploy**
   ```bash
   pnpm wrangler pages deploy .svelte-kit/cloudflare
   ```

#### Subsequent Deployments

```bash
pnpm build && pnpm wrangler pages deploy .svelte-kit/cloudflare
```

## Local Preview

### Development Server

```bash
pnpm dev
# Runs on http://localhost:5173
```

### Production Preview (Cloudflare Workers)

```bash
pnpm build
pnpm preview
# Runs on http://localhost:4173 using Wrangler
```

This preview uses the actual Cloudflare Workers runtime, simulating production environment.

## Build Process

### Build Steps

1. **SvelteKit Build**
   - Compiles Svelte components
   - Bundles JavaScript/CSS
   - Generates static assets

2. **Adapter Processing**
   - Converts to Cloudflare Workers format
   - Creates `_worker.js` entry point
   - Organizes assets for CDN

3. **Output Structure**
   ```
   .svelte-kit/cloudflare/
   ├── _worker.js           # Cloudflare Worker entry point
   ├── _app/                # Application code
   │   ├── immutable/       # Versioned assets (long cache)
   │   └── version.json     # Build version
   └── [static files]       # From /static directory
   ```

### Build Optimization

- **Code Splitting** - Automatic route-based splitting
- **Tree Shaking** - Removes unused code
- **Minification** - Compresses JavaScript/CSS
- **Asset Hashing** - Cache-busting for immutable assets

## Environment Configuration

### Development (.env.local)

```bash
# Supabase
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=xxx

# Firebase Cloud Messaging
PUBLIC_FIREBASE_API_KEY=xxx
PUBLIC_FIREBASE_PROJECT_ID=xxx
PUBLIC_FIREBASE_VAPID_KEY=xxx
```

### Production (Cloudflare Pages Settings)

Add via Dashboard → Pages → Settings → Environment Variables:

- `PUBLIC_SUPABASE_URL` - Supabase project URL
- `PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `PUBLIC_FIREBASE_API_KEY` - Firebase API key
- `PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
- `PUBLIC_FIREBASE_VAPID_KEY` - FCM VAPID key for push notifications

## Supabase Deployment

### Database Setup

1. **Create Project** at [supabase.com](https://supabase.com)
2. **Run Migrations** in SQL Editor or via CLI:
   ```bash
   supabase db push
   ```
3. **Enable Row Level Security** on all tables
4. **Create Indexes** for performance

### Edge Functions Deployment

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <project-id>

# Deploy all functions
supabase functions deploy complete-habit
supabase functions deploy daily-reminder

# Set function secrets
supabase secrets set FIREBASE_SERVICE_ACCOUNT='<json>'
```

### Edge Function Structure

```
supabase/
└── functions/
    ├── complete-habit/
    │   └── index.ts     # Habit completion endpoint
    └── daily-reminder/
        └── index.ts     # Scheduled push notifications
```

### Scheduled Functions (Cron)

Set up daily-reminder cron in Supabase Dashboard:

- Dashboard → Database → Extensions → Enable `pg_cron`
- Dashboard → Edge Functions → daily-reminder → Set schedule

## PWA Configuration

### Service Worker

The service worker (`src/service-worker.ts`) is automatically bundled by SvelteKit.

**Key features:**

- **Install**: Cache app shell assets
- **Activate**: Clean old caches
- **Fetch**: Cache-first for assets, network-first for API
- **Push**: Handle push notification display
- **Notification Click**: Open app to relevant page

### Manifest (static/manifest.json)

```json
{
	"name": "Hungry Hundreds",
	"short_name": "Hungry",
	"description": "Build habits, grow your monster",
	"start_url": "/",
	"display": "standalone",
	"background_color": "#1a1a2e",
	"theme_color": "#e94560",
	"icons": [
		{ "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
		{ "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
	]
}
```

### Required Static Assets

```
static/
├── manifest.json        # PWA manifest
├── icon-192.png         # App icon (192x192)
├── icon-512.png         # App icon (512x512)
└── animations/
    └── monster.riv      # Rive animation file
```

## Custom Domain

### Setup

1. **Add Domain in Cloudflare Pages**
   - Pages → Your Project → Custom domains
   - Click "Set up a custom domain"

2. **DNS Configuration**
   - Add CNAME record: `your-domain.com` → `your-app.pages.dev`
   - Or use Cloudflare nameservers for automatic setup

3. **SSL/TLS**
   - Automatic SSL certificate provisioning
   - Force HTTPS enabled by default

## Performance Optimization

### Performance Budgets

| Metric        | Target          | Measurement                                   |
| ------------- | --------------- | --------------------------------------------- |
| Bundle (gzip) | <75KB           | `pnpm build && ls -la .svelte-kit/cloudflare` |
| LCP           | <2.5s           | Lighthouse on 3G throttle                     |
| FID           | <100ms          | Lighthouse                                    |
| CLS           | <0.1            | Lighthouse                                    |
| Offline       | 100% functional | Manual test: airplane mode                    |

### Cloudflare Features

- **Global CDN** - Assets served from 300+ edge locations
- **HTTP/3** - Enabled by default
- **Brotli Compression** - Automatic compression
- **Smart Routing** - Optimized routing to origin
- **Zero Bandwidth Cost** - $0 for static asset serving

### Cache Configuration

Static assets cached automatically:

- `_app/immutable/*` - 1 year cache (versioned)
- Service worker - Network first (for updates)
- Other assets - Standard CDN cache rules

### Bundle Optimization

Rive animations are lazy-loaded to keep initial bundle small:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: { manualChunks: { rive: ['@rive-app/canvas'] } }
    }
  }
});
```

## Monitoring

### Cloudflare Analytics

Available in Dashboard → Pages → Analytics:

- **Requests** - Total requests and bandwidth
- **Performance** - Response times and cache hit rate
- **Errors** - 4xx/5xx error rates
- **Geographic Distribution** - Traffic by region

### Logs

View deployment logs:

```bash
pnpm wrangler pages deployment list
pnpm wrangler pages deployment tail
```

## Troubleshooting

### Build Failures

**Issue**: Build fails with module errors

```bash
# Clear cache and rebuild
rm -rf .svelte-kit node_modules
pnpm install
pnpm build
```

**Issue**: Adapter errors

```bash
# Regenerate types
pnpm types
pnpm build
```

### Runtime Errors

**Issue**: 500 errors in production

- Check Cloudflare Pages logs
- Verify compatibility_date in wrangler.jsonc
- Ensure no Node.js-specific APIs used

**Issue**: Assets not loading

- Verify build output in `.svelte-kit/cloudflare/`
- Check asset paths are relative
- Ensure static files in `/static` directory

### Preview Issues

**Issue**: Preview doesn't match production

```bash
# Use Wrangler preview instead of Vite
pnpm build
pnpm preview  # Uses Wrangler, not Vite
```

## Rollback

### Cloudflare Pages

- Dashboard → Pages → Deployments
- Click on previous deployment
- Click "Rollback to this deployment"

### Wrangler

```bash
# List deployments
pnpm wrangler pages deployment list

# Promote specific deployment
pnpm wrangler pages deployment promote <deployment-id>
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy .svelte-kit/cloudflare
```

## Deployment Checklist

Before deploying to production:

- [ ] All environment variables configured in Cloudflare Pages
- [ ] Supabase database migrations applied
- [ ] Row Level Security enabled on all tables
- [ ] Edge Functions deployed and tested
- [ ] Firebase Cloud Messaging configured
- [ ] PWA manifest icons present in `/static`
- [ ] Service worker tested in production mode
- [ ] Lighthouse scores meet performance budgets
- [ ] Offline functionality verified

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
- [API.md](./API.md) - Data models and Supabase endpoints
- [TECH_SPEC.md](./TECH_SPEC.md) - Full technical specification

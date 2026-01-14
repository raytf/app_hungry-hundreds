# Deployment Guide

## Overview

Hungry Hundreds is deployed to **Cloudflare Pages** using the Cloudflare Workers platform. This guide covers the deployment process, configuration, and troubleshooting.

## Prerequisites

- **Cloudflare Account** - Free tier is sufficient
- **Wrangler CLI** - Installed via `pnpm install` (included in devDependencies)
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
  "name": "sv-app",                    // Project name
  "compatibility_date": "2026-01-12",  // Workers runtime version
  "compatibility_flags": ["nodejs_als"], // Node.js compatibility
  "main": ".svelte-kit/cloudflare/_worker.js", // Entry point
  "assets": {
    "binding": "ASSETS",
    "directory": ".svelte-kit/cloudflare"
  },
  "workers_dev": true,                 // Enable preview deployments
  "preview_urls": true                 // Generate preview URLs
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

### Current (Phase 1)
No environment variables required. All data is mock data.

### Future Phases

#### Development (.env.local)
```bash
# Database
DATABASE_URL=<local-d1-database>

# Authentication (future)
AUTH_SECRET=<random-secret>
AUTH_PROVIDER_ID=<provider-id>
```

#### Production (Cloudflare Pages Settings)
Add via Dashboard → Pages → Settings → Environment Variables:
- `DATABASE_URL` - Cloudflare D1 database binding
- `AUTH_SECRET` - Authentication secret
- `AUTH_PROVIDER_ID` - Auth provider configuration

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

### Cloudflare Features

- **Global CDN** - Assets served from 200+ edge locations
- **HTTP/3** - Enabled by default
- **Brotli Compression** - Automatic compression
- **Smart Routing** - Optimized routing to origin

### Cache Configuration

Static assets cached automatically:
- `_app/immutable/*` - 1 year cache (versioned)
- Other assets - Standard CDN cache rules

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

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
- [API.md](./API.md) - API endpoints and data models


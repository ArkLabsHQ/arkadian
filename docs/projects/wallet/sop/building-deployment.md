# Building and Deployment

This document covers building the Arkade wallet for production and deploying to various platforms.

## Building for Production

### Create Production Bundle

```bash
pnpm run build
```

**Build Process:**
1. Generates git commit info (`scripts/git-commit-info.js`)
2. Builds worker bundle (`vite build -c vite.worker.config.ts`)
3. Builds main application (`vite build`)
4. Outputs to `dist/` folder

**Build Output:**
- Minified and optimized JavaScript
- Optimized CSS
- Compressed assets
- Source maps (if configured)
- PWA manifest and service worker

### Verify Build

```bash
ls -lh dist/
```
- Check bundle size
- Verify all assets present
- Test locally with static server

## Deployment Options

### Static Hosting Platforms

**Supported Platforms:**
- Vercel
- Netlify
- GitHub Pages
- CloudFlare Pages
- AWS S3 + CloudFront
- Firebase Hosting

**Requirements:**
- HTTPS enabled (required for PWA)
- SPA routing support
- Proper CORS headers

## Vercel Deployment

### Setup

1. **Connect Repository**
   - Sign in to Vercel
   - Import GitHub repository
   - Authorize access

2. **Configure Build Settings**
   - Framework Preset: Vite
   - Build Command: `pnpm run build`
   - Output Directory: `dist`
   - Install Command: `pnpm install`

3. **Deploy**
   - Push to main/master branch
   - Automatic deployment triggers
   - Preview deployments for PRs

### Environment Variables

Set in Vercel dashboard:
- `VITE_ARK_SERVER`: Ark server URL
- `VITE_BOLTZ_URL`: Boltz swap service URL
- `VITE_SENTRY_DSN`: Sentry error tracking DSN

## GitHub Pages Deployment

### Manual Deployment

1. **Build Locally**
   ```bash
   pnpm run build
   ```

2. **Deploy to gh-pages Branch**
   ```bash
   git checkout --orphan gh-pages
   git rm -rf .
   cp -r dist/* .
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin gh-pages --force
   ```

3. **Enable in Settings**
   - Go to repository Settings
   - Navigate to Pages section
   - Source: Deploy from branch
   - Branch: gh-pages, root folder
   - Save

### Automated Deployment

Use GitHub Actions workflow to automate deployment on push.

## Self-Hosted Deployment

### Build and Upload

1. **Build Production Bundle**
   ```bash
   pnpm run build
   ```

2. **Upload to Server**
   ```bash
   scp -r dist/* user@server:/var/www/wallet/
   ```

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name wallet.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /var/www/wallet/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name wallet.example.com;
    return 301 https://$server_name$request_uri;
}
```

### Apache Configuration

```apache
<VirtualHost *:443>
    ServerName wallet.example.com
    DocumentRoot /var/www/wallet/dist

    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem

    <Directory /var/www/wallet/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # SPA fallback
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

## Environment Configuration

### Build-Time Variables

Set in `.env.production`:
```
VITE_ARK_SERVER=https://ark.example.com
VITE_BOLTZ_URL=https://boltz.example.com
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Platform-Specific Configuration

Variables are embedded at build time, so:
1. Set environment variables before build
2. Or configure in hosting platform UI
3. Rebuild when configuration changes

## PWA Deployment Checklist

Before deploying PWA:

- [ ] HTTPS enabled and working
- [ ] `manifest.json` configured correctly
- [ ] Service worker registered
- [ ] All icon sizes present (192x192, 512x512)
- [ ] Proper theme colors set
- [ ] Tested installation on mobile device
- [ ] Offline functionality working
- [ ] Cache strategies configured

## Monitoring and Maintenance

### Error Tracking

**Sentry Integration:**
- Set `VITE_SENTRY_DSN` environment variable
- Errors automatically reported
- Monitor dashboard for issues

### Performance Monitoring

**Metrics to Track:**
- Page load time
- Bundle size
- Core Web Vitals
- API response times

### Analytics (Optional)

Integrate analytics if needed:
- Google Analytics
- Plausible
- Custom solution

## Rollback Procedure

### Vercel/Netlify

1. Go to deployments dashboard
2. Find previous working deployment
3. Click "Promote to Production"

### Self-Hosted

1. Keep previous build backup
2. Replace current files with backup
3. Restart web server if needed

## Post-Deployment Verification

After deployment:

1. Visit production URL
2. Test critical user flows
3. Check browser console for errors
4. Verify PWA installation works
5. Test on mobile device
6. Check Sentry for errors

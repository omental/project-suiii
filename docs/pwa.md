# Project SUIII PWA

Project SUIII uses a custom standards-based service worker at `/sw.js`.

The worker is intentionally small and privacy-bounded:

- static build assets: cache first, bounded `project-suiii-static-v4`
- icons, manifest, and `/offline.html`: precached in `project-suiii-shell-v4`
- navigations: network first, then neutral offline shell
- API requests: network only
- authenticated route HTML: not runtime-cached
- external requests: not cached

The service worker scope is `/` on the app origin. It does not intercept other domains.

Update lifecycle:

- registration happens on the client when service workers are supported
- waiting workers expose an update-ready state
- Update now sends `SKIP_WAITING`
- active workouts defer reload messaging so the workout can finish first

Install lifecycle:

- Chromium-style browsers use `beforeinstallprompt`
- iOS gets manual Add to Home Screen guidance
- dismissals are remembered for seven days

Timer alerts work while Project SUIII is open. Reliable background delivery is not claimed.

## Production header verification
Run these after deployment from a trusted terminal:

```bash
curl -I https://suii.muba.me/sw.js
curl -I https://suii.muba.me/offline.html
curl -I https://suii.muba.me/manifest.webmanifest
```

Expected: sw.js must keep Cache-Control: no-cache, no-store, must-revalidate, Service-Worker-Allowed: /, and a JavaScript Content-Type. Private authenticated routes and API responses must remain no-store/private through the proxy.

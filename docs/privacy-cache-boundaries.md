# Privacy And Cache Boundaries

Never service-worker cache:

- `/api/v1/auth/*`
- `/api/v1/profile`
- `/api/v1/sync/*`
- `/api/v1/progress/*`
- `/api/v1/workouts/*`
- `/api/v1/meals/*`
- reports
- private photo endpoints
- authenticated HTML containing personal data
- cookies, CSRF values, session responses
- signed/private upload URLs
- device backup JSON contents

Allowed cache targets:

- versioned Next static chunks under `/_next/static/`
- icons
- manifest
- neutral offline shell
- public static images/SVGs that contain no user data

The service worker does not synthesize cached API responses. If the server or network is unavailable, API calls fail in a controlled way and local repositories remain the source for supported offline workflows.

Production headers in `next.config.mjs` mark API and authenticated app routes as `Cache-Control: no-store, private`. The service-worker script itself is served no-store with `Service-Worker-Allowed: /`.

Future server/Nginx deployment should preserve these headers and avoid CDN caching of authenticated HTML or API responses.

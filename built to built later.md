# Build to build later

Deferred work and production readiness items tracked here.

---

## To do before production — High Priority Findings

### 1. Cleartext traffic globally allowed on Android

**Risk:** Weakens transport guarantees if any HTTP endpoint is hit (traffic can be read or modified on the network).

**Where:** `app.json:15` — `"usesCleartextTraffic": true`

**Fix direction:**

- Serve production API over **HTTPS** only.
- Set `usesCleartextTraffic` to `false` (or remove it) for release builds.
- If dev/staging still needs HTTP, allow cleartext only for specific hosts via Android Network Security Config (not app-wide), not a global `true` in production.

---

### 2. API base URL falls back to plain HTTP when env is missing

**Risk:** Misconfigured builds can ship with insecure networking by accident.

**Where:** `core/infrastructure/api/constants.ts:7` — default `http://localhost:3000/api` when `EXPO_PUBLIC_API_URL` / `extra.apiUrl` is unset.

**Fix direction:**

- Require HTTPS API URL in production EAS profiles / env.
- Fail fast at startup in release if base URL is missing or not `https://`.
- Keep HTTP fallback only for local dev, gated by `__DEV__` or an explicit dev flag.

---

### 3. WebViews allow all origins (`"*"`)

**Risk:** Too permissive even when current content is inline HTML; increases exposure if WebView content or URLs change later.

**Where:**

- `RegisterScreen.tsx:779`
- `ProductListScreen.tsx:1518`
- `MyProductDetailSheet.tsx:628`
- `PublicProductDetailScreen.tsx:764`
- `ChatRoomScreen.tsx:2789`

**Fix direction:**

- Restrict `originWhitelist` to required origins only (e.g. `https://` map tile hosts if any external URLs are loaded).
- For inline-only HTML (Leaflet pickers/maps), prefer `originWhitelist={[]}` or document why each external origin is required.
- Avoid `["*"]` in production builds.

---

## Build it after map service changes

### 4. Map stack loads third-party JS/CSS from CDN at runtime

**Risk:** Supply-chain and runtime dependency risk — map UI depends on unpkg and OpenStreetMap tile servers being available, unmodified, and acceptable under your privacy/terms policy.

**Where:**

- `presentation/lib/leafletPickerHtml.ts:18` — Leaflet CSS from `https://unpkg.com/leaflet@1.9.4/...`
- `presentation/lib/leafletPickerHtml.ts:31` — Leaflet JS from unpkg; OSM tiles at line 9 (`tile.openstreetmap.org`)
- Duplicated inline map HTML with the same CDN pattern:
  - `RegisterScreen.tsx:296` (Leaflet CSS)
  - `RegisterScreen.tsx:309` (Leaflet JS)

**Fix direction:**

- Vendor Leaflet (and any map assets) into the app bundle or a controlled CDN you operate.
- Consolidate map HTML into `leafletPickerHtml.ts` (or one shared builder) — remove duplicate inline HTML in `RegisterScreen.tsx`.
- Document tile provider ToS, rate limits, and attribution requirements for production.

---

### 5. Route computation sends location pairs to public OSRM

**Risk:** Privacy leak — live meetup routing coordinates are sent to a third-party public routing service (`router.project-osrm.org`).

**Where:** `presentation/lib/leafletPickerHtml.ts:300` — OSRM `route/v1/driving/` request built from `routeLine` lat/lng pairs.

**Fix direction:**

- Self-host OSRM or use a contracted routing API with a data-processing agreement.
- Route only coarse/rounded coordinates if approximate paths are enough, or skip external routing and draw a straight line until a private service exists.
- Disclose in privacy policy if third-party routing is used; block routing in production until a compliant backend is in place.

---

## Fix it after we got domain and HTTPS

### 6. External ad links open any http/https URL without validation

**Risk:** Phishing / open-redirect style abuse — if slider ad data from the API is wrong or compromised, one tap opens any external site in the system browser. Bare hostnames are auto-prefixed with `https://`.

**Where:**

- `features/home/presentation/HomeSlider.tsx:57` — accepts `http://` or `https://` as-is
- `features/home/presentation/HomeSlider.tsx:61` — otherwise prepends `https://`, then `Linking.openURL`

**Fix direction:**

- Allowlist link hosts to your production domain and known partners only (after HTTPS is live).
- Reject `http://` in release builds; require `https://`.
- Validate `linkUrl` on the backend when ads are created/updated.
- Optional: confirm dialog showing the destination host before opening; use in-app browser with visible URL bar.

/**
 * Dynamic Expo config. It is merged on top of `app.json` (the object passed as
 * `config`) and runs both locally and on EAS Build workers.
 *
 * Purpose: bake the API base URL into every build so we can never ship a
 * binary that points at the wrong host (previously a missing
 * `EXPO_PUBLIC_API_URL` silently fell back to `http://localhost:3000/api`).
 *
 * Environments:
 *   - Dev backend -> https://flexapi.winterarc.asia/api
 *                   (development / preview build profiles)
 *   - Production  -> https://api.flexusedmarket.com/api
 *                   (production build profile)
 *
 * Resolution order:
 *   1. The `production` EAS profile always resolves to the production URL, even
 *      if a stray local `.env` or environment variable points somewhere else.
 *   2. `EXPO_PUBLIC_API_URL` (EAS build profile `env` in `eas.json`, EAS
 *      environment variables, or a local `.env` while developing).
 *   3. The URL mapped to the EAS build profile name (`EAS_BUILD_PROFILE`).
 *   4. Nothing resolved -> `core/infrastructure/api/constants.ts` applies the
 *      runtime default (localhost in development, production otherwise).
 */
const UAT_API_URL = "https://flexapi.winterarc.asia/api";
const PRODUCTION_API_URL = "https://api.flexusedmarket.com/api";

const API_URL_BY_EAS_PROFILE = {
  development: UAT_API_URL,
  preview: UAT_API_URL,
  production: PRODUCTION_API_URL,
};

function normalizeUrl(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolveApiUrl() {
  const profile = process.env.EAS_BUILD_PROFILE;
  const profileUrl = profile ? API_URL_BY_EAS_PROFILE[profile] : undefined;

  // Store builds must always talk to production, no matter which env file
  // happens to be on the machine that started the build.
  if (profile === "production") return profileUrl;

  return normalizeUrl(process.env.EXPO_PUBLIC_API_URL) ?? profileUrl;
}

module.exports = ({ config }) => {
  const apiUrl = resolveApiUrl();
  if (!apiUrl) return config;

  return {
    ...config,
    extra: {
      ...config.extra,
      apiUrl,
    },
  };
};

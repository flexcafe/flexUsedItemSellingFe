import { router, type Href } from "expo-router";

let pendingReturn: Href | null = null;
let finishLocked = false;
let loginRequested = false;

/** True only after the user taps an account action or Sign in. */
export function didRequestLogin(): boolean {
  return loginRequested;
}

/** Remember where to resume, then show login/register. */
export function openLogin(returnTo?: Href) {
  loginRequested = true;
  pendingReturn = returnTo ?? null;
  router.push("/(auth)/login" as Href);
}

/** Leave a protected screen for login, then resume that screen after sign-in. */
export function replaceWithLogin(returnTo: Href) {
  loginRequested = true;
  pendingReturn = returnTo;
  router.replace("/(auth)/login" as Href);
}

export function clearAuthReturn() {
  pendingReturn = null;
  loginRequested = false;
}

export function finishAuthenticatedNavigation() {
  if (finishLocked) return;
  finishLocked = true;
  const next = pendingReturn;
  pendingReturn = null;
  loginRequested = false;
  // replace, not back(): popping the login screen on iOS can kill the native stack.
  router.replace(next ?? ("/(tabs)" as Href));
  setTimeout(() => {
    finishLocked = false;
  }, 400);
}

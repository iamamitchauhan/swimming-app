import type { AuthUser } from "./auth.store";

/** The default landing page for a signed-in user, by role. */
export function getDefaultRoute(user: Pick<AuthUser, "role">): string {
  return user.role === "coach" ? "/tryouts" : "/dashboard";
}

/** Where to send a user immediately after authenticating (or selecting a club). */
export function getPostAuthRoute(
  user: Pick<AuthUser, "role" | "clubId" | "onboardingStep">,
): string {
  if (user.role === "admin" && !user.clubId && user.onboardingStep < 3) return "/onboarding";
  return getDefaultRoute(user);
}

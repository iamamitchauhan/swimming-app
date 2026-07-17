import { config } from "../../config/env";

export const TEST_USER_IDS: string[] = config.TEST_USER_IDS;

export function isTestUser(userId: string | undefined): boolean {
  if (!userId) return false;
  return TEST_USER_IDS.includes(userId);
}

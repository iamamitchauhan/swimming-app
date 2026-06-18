export const formatDate = (dateString: string) => {
  // expected dateString is "2026-06-17T14:50:00.000Z"
  if (!dateString) return "";

  return new Date(dateString).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

export function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function relativeFromNow(iso: string): string {
  const target = new Date(iso);
  console.info("target => ", target);

  const now = new Date();

  // Normalize both dates to local midnight
  const targetDate = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffDays = Math.round((targetDate.getTime() - todayDate.getTime()) / 86400000);

  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  if (diffDays === -1) return "yesterday";
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";

  return `in ${diffDays} days`;
}

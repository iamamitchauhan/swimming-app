import { MOCK_TRYOUTS } from "../mock-data";
import { db, uid, wait } from "../mock-db";
import type { Registration } from "../types";

export interface CreateRegistrationInput {
  tryoutId: string;
  childId: string;
  childName: string;
  slotId: string;
}

export async function fetchRegistrations(): Promise<Registration[]> {
  await wait(200);
  return db
    .getRegistrations()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function fetchRegistrationById(id: string): Promise<Registration | null> {
  await wait(150);
  return db.getRegistrations().find((r) => r.id === id) ?? null;
}

export async function createRegistration(
  input: CreateRegistrationInput,
): Promise<Registration> {
  await wait(400);
  const tryout = MOCK_TRYOUTS.find((t) => t.id === input.tryoutId);
  const slot = tryout?.slots.find((s) => s.id === input.slotId);
  if (!tryout || !slot) throw new Error("Tryout or slot not found");

  const reg: Registration = {
    id: uid("reg"),
    tryoutId: tryout.id,
    tryoutName: tryout.name,
    childId: input.childId,
    childName: input.childName,
    slotId: slot.id,
    slotLabel: slot.label,
    slotTime: slot.time,
    status: "pending",
    createdAt: new Date().toISOString(),
    timeline: [
      { status: "Submitted", at: new Date().toISOString() },
      { status: "Under Review", at: new Date().toISOString() },
    ],
  };
  db.setRegistrations([reg, ...db.getRegistrations()]);
  // Mock notification
  const notes = db.getNotifications();
  db.setNotifications([
    {
      id: uid("ntf"),
      title: "Registration Submitted",
      body: `${input.childName} is registered for ${tryout.name}.`,
      createdAt: new Date().toISOString(),
      read: false,
    },
    ...notes,
  ]);
  return reg;
}

export async function cancelRegistration(id: string): Promise<Registration> {
  await wait(250);
  const list = db.getRegistrations();
  const next = list.map((r) =>
    r.id === id
      ? {
          ...r,
          status: "cancelled" as const,
          timeline: [...r.timeline, { status: "Cancelled", at: new Date().toISOString() }],
        }
      : r,
  );
  db.setRegistrations(next);
  const reg = next.find((r) => r.id === id)!;
  db.setNotifications([
    {
      id: uid("ntf"),
      title: "Registration Cancelled",
      body: `${reg.childName}'s registration for ${reg.tryoutName} was cancelled.`,
      createdAt: new Date().toISOString(),
      read: false,
    },
    ...db.getNotifications(),
  ]);
  return reg;
}

export async function fetchNotifications() {
  await wait(120);
  return db
    .getNotifications()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function markAllNotificationsRead() {
  await wait(100);
  db.setNotifications(db.getNotifications().map((n) => ({ ...n, read: true })));
}
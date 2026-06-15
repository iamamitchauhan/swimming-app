import { db, uid, wait } from "../mock-db";
import type { Child } from "../types";

export async function fetchChildren(): Promise<Child[]> {
  await wait(150);
  return db.getChildren();
}

export async function createChild(input: Omit<Child, "id">): Promise<Child> {
  await wait(250);
  const child: Child = { ...input, id: uid("chd") };
  db.setChildren([...db.getChildren(), child]);
  return child;
}

export async function updateChild(id: string, patch: Partial<Child>): Promise<Child> {
  await wait(200);
  const list = db.getChildren();
  const next = list.map((c) => (c.id === id ? { ...c, ...patch } : c));
  db.setChildren(next);
  return next.find((c) => c.id === id)!;
}

export async function deleteChild(id: string): Promise<void> {
  await wait(150);
  db.setChildren(db.getChildren().filter((c) => c.id !== id));
}
export type TryoutStatus = "open" | "almost_full" | "closed";

export interface Slot {
  id: string;
  label: string;
  time: string;
  capacity: number;
  taken: number;
}

export interface Tryout {
  id: string;
  name: string;
  club: string;
  ageGroup: string;
  skillLevel: string;
  state: string;
  city: string;
  location: string;
  poolName: string;
  address: string;
  coachName: string;
  date: string;
  time: string;
  deadline: string;
  description: string;
  purpose: string;
  eligibility: string[];
  image: string;
  slots: Slot[];
}

export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: "male" | "female" | "other";
  membershipId?: string;
  clubName?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export type RegistrationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export interface Registration {
  id: string;
  tryoutId: string;
  tryoutName: string;
  childId: string;
  childName: string;
  slotId: string;
  slotLabel: string;
  slotTime: string;
  status: RegistrationStatus;
  createdAt: string;
  timeline: { status: string; at: string }[];
}

export interface Parent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  emailVerified: boolean;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}
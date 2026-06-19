export type TryoutStatus = "open" | "almost_full" | "closed";

export interface TryoutSlot {
  id: string;
  sessionId: string;
  slotIndex: number;
  startTime: string;
  endTime: string;
  label: string;
  capacity: number;
  registeredCount: number;
  availableSlots: number;
}

export interface TryoutSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  label: string;
  slotDuration: number;
  swimmersPerSlot: number;
  totalSlots: number;
  slots: TryoutSlot[];
}

export interface Slot {
  id: string;
  sessionId: string;
  label: string;
  time: string;
  capacity: number;
  taken: number;
  availableSlots: number;
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
  startAt: string;
  endAt: string;
  status: "closed" | "open" | "completed";
  description: string;
  purpose: string;
  eligibility: string[];
  segments: {
    name: string;
    minAge: number;
    maxAge: number;
    level: string;
  }[];
  steps: { title: string; description: string }[];
  faqs: { question: string; answer: string }[];
  image: string;
  slots: Slot[];
  sessions: TryoutSession[];
  sessionCount?: number;
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

export type RegistrationStatus = "pending" | "approved" | "rejected" | "cancelled";

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

export interface MyTryoutChild {
  registrationId: string;
  swimmerId: string;
  firstName: string;
  lastName: string;
  ageOnTryoutDay: number;
  status: string;
  registeredAt: string;
  slot: {
    id: string;
    sessionDate: string;
    startTime: string;
    endTime: string;
    label: string;
    slotIndex: number;
    capacity: number;
  } | null;
}

export interface MyTryoutItem {
  tryout: {
    _id: string;
    name: string;
    status: "closed" | "open" | "completed";
    location: string;
    description: string;
    bannerUrl: string;
    createdAt: string;
    theme?: string;
  };
  children: MyTryoutChild[];
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

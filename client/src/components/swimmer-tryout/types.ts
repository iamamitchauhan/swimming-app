export interface TryoutSession {
  date: string;
  startTime: string;
  endTime: string;
  label: string;
}

export interface TryoutSegment {
  name: string;
  minAge: number;
  maxAge: number;
  level: string;
}

export interface TryoutStep {
  title: string;
  description: string;
}

export interface TryoutFAQ {
  question: string;
  answer: string;
}

export interface Tryout {
  _id: string;
  name: string;
  location: string;
  description: string;
  theme: string;
  bannerUrl: string;
  slotDuration: number;
  swimmersPerSlot: number;
  ctaLabel: string;
  highlights: string;
  additionalInstructions: string;
  status: "draft" | "open" | "closed";
  sessions: TryoutSession[];
  segments: TryoutSegment[];
  steps: TryoutStep[];
  faqs: TryoutFAQ[];
  clubId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

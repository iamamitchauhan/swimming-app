import type { Tryout } from "./types";

const today = new Date();
const days = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

export const MOCK_TRYOUTS: Tryout[] = [
  {
    id: "ty-001",
    name: "Riptide Junior Squad Tryout",
    club: "Pacific Riptide Aquatics",
    ageGroup: "8-10",
    skillLevel: "Beginner to Intermediate",
    state: "CA",
    city: "San Diego",
    location: "Pacific Aquatic Center",
    poolName: "Olympic Pool #2",
    address: "1200 Coast Blvd, San Diego, CA",
    coachName: "Coach Marina Lopez",
    date: days(6),
    time: "9:00 AM",
    deadline: days(4),
    description:
      "Join our junior development squad evaluations. Swimmers will demonstrate freestyle and backstroke technique across 50m sets.",
    purpose: "Identify swimmers ready for the developmental competitive group.",
    eligibility: ["Comfortable swimming 50m unassisted", "Familiar with freestyle & backstroke"],
    image:
      "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1200&q=80",
    slots: [
      { id: "ty-001-a", label: "Session A", time: "9:00 AM", capacity: 30, taken: 18 },
      { id: "ty-001-b", label: "Session B", time: "11:00 AM", capacity: 30, taken: 25 },
      { id: "ty-001-c", label: "Session C", time: "2:00 PM", capacity: 30, taken: 10 },
    ],
  },
  {
    id: "ty-002",
    name: "Bluewave Senior Performance Trials",
    club: "Bluewave Swim Club",
    ageGroup: "13-17",
    skillLevel: "Advanced",
    state: "FL",
    city: "Miami",
    location: "Bluewave Performance Center",
    poolName: "Long Course Pool",
    address: "788 Marina Way, Miami, FL",
    coachName: "Coach Daniel Park",
    date: days(10),
    time: "8:00 AM",
    deadline: days(7),
    description:
      "Competitive trials for senior squad placement. Includes 200 IM, 100 free, and stroke evaluation.",
    purpose: "Select senior squad athletes for the spring competition season.",
    eligibility: ["USA Swimming registered", "Sub 1:10 100m free"],
    image:
      "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=80",
    slots: [
      { id: "ty-002-a", label: "Morning Heat", time: "8:00 AM", capacity: 24, taken: 23 },
      { id: "ty-002-b", label: "Afternoon Heat", time: "1:00 PM", capacity: 24, taken: 19 },
    ],
  },
  {
    id: "ty-003",
    name: "Northstar Learn-to-Compete Tryout",
    club: "Northstar Aquatics",
    ageGroup: "6-8",
    skillLevel: "Beginner",
    state: "NY",
    city: "Brooklyn",
    location: "Northstar Community Pool",
    poolName: "Indoor 25m",
    address: "42 Atlantic Ave, Brooklyn, NY",
    coachName: "Coach Priya Shah",
    date: days(14),
    time: "10:00 AM",
    deadline: days(12),
    description:
      "Friendly entry-level evaluation for swimmers transitioning from lessons to a pre-competitive group.",
    purpose: "Place young swimmers into the right Learn-to-Compete pod.",
    eligibility: ["Can swim 25m freestyle", "Comfortable putting face in water"],
    image:
      "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1200&q=80",
    slots: [
      { id: "ty-003-a", label: "Group 1", time: "10:00 AM", capacity: 20, taken: 8 },
      { id: "ty-003-b", label: "Group 2", time: "11:30 AM", capacity: 20, taken: 14 },
      { id: "ty-003-c", label: "Group 3", time: "1:00 PM", capacity: 20, taken: 4 },
    ],
  },
  {
    id: "ty-004",
    name: "Summit Elite Distance Tryout",
    club: "Summit Elite Swim",
    ageGroup: "11-14",
    skillLevel: "Intermediate to Advanced",
    state: "CO",
    city: "Denver",
    location: "Summit High Altitude Center",
    poolName: "50m Outdoor",
    address: "330 Mountain Pkwy, Denver, CO",
    coachName: "Coach Erika Voss",
    date: days(20),
    time: "7:30 AM",
    deadline: days(18),
    description:
      "Distance-focused tryout featuring 400 IM and 800 free time trials.",
    purpose: "Identify long-distance prospects for the elite distance squad.",
    eligibility: ["1+ year of competitive swim", "Completed 200 IM in meet"],
    image:
      "https://images.unsplash.com/photo-1622629797619-c100e3e67e2e?auto=format&fit=crop&w=1200&q=80",
    slots: [
      { id: "ty-004-a", label: "Distance Heat", time: "7:30 AM", capacity: 16, taken: 16 },
      { id: "ty-004-b", label: "Stroke Heat", time: "10:00 AM", capacity: 16, taken: 11 },
    ],
  },
  {
    id: "ty-005",
    name: "Coastal Stars Mini Swim Tryout",
    club: "Coastal Stars",
    ageGroup: "5-7",
    skillLevel: "Beginner",
    state: "TX",
    city: "Austin",
    location: "Coastal Stars Aquatic Park",
    poolName: "Shallow Training Pool",
    address: "55 Lake Travis Rd, Austin, TX",
    coachName: "Coach Tomás Reyes",
    date: days(3),
    time: "9:30 AM",
    deadline: days(1),
    description: "A welcoming first tryout for our youngest swimmers.",
    purpose: "Build confident young swimmers in the Mini Stars program.",
    eligibility: ["Can float independently", "Comfortable in chest-deep water"],
    image:
      "https://images.unsplash.com/photo-1565992441121-4367c2967103?auto=format&fit=crop&w=1200&q=80",
    slots: [
      { id: "ty-005-a", label: "Mini A", time: "9:30 AM", capacity: 12, taken: 6 },
      { id: "ty-005-b", label: "Mini B", time: "10:30 AM", capacity: 12, taken: 12 },
    ],
  },
  {
    id: "ty-006",
    name: "Harbor Masters Open Tryout",
    club: "Harbor Swim Academy",
    ageGroup: "9-12",
    skillLevel: "Intermediate",
    state: "WA",
    city: "Seattle",
    location: "Harbor Bay Aquatic Center",
    poolName: "Competition Pool",
    address: "210 Harbor Dr, Seattle, WA",
    coachName: "Coach Naomi Reed",
    date: days(12),
    time: "11:00 AM",
    deadline: days(9),
    description: "Open tryout featuring 100m freestyle and turn evaluation.",
    purpose: "Recruit swimmers for the regional competition squad.",
    eligibility: ["Can swim 100m freestyle", "Knows flip turn basics"],
    image:
      "https://images.unsplash.com/photo-1519315901367-f34ff9154487?auto=format&fit=crop&w=1200&q=80",
    slots: [
      { id: "ty-006-a", label: "Wave 1", time: "11:00 AM", capacity: 25, taken: 12 },
      { id: "ty-006-b", label: "Wave 2", time: "1:00 PM", capacity: 25, taken: 7 },
    ],
  },
];

export const PLATFORM_STATS = {
  openTryouts: 12,
  availableSlots: 145,
  registeredFamilies: 530,
  participatingClubs: 32,
};
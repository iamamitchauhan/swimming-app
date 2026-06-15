
import { toast } from "sonner";
import {
  SwimmerTryoutDetailsPage,
  type Tryout,
} from "@/components/swimmer-tryout";
import { PageShell } from "@/components/page-shell";


const sampleTryout: Tryout = {
    "_id": "6a2bcc49aaa6e171daaae368",
    "name": "Spring tryout 2026",
    "location": "101, pairmal",
    "description": "XXXXXXXXXXX",
    "theme": "coral",
    "bannerUrl": "https://i.ibb.co/Pv9T3c6f/Laughing-dove.webp",
    "slotDuration": 20,
    "swimmersPerSlot": 6,
    "ctaLabel": "Sign up today",
    "highlights": "No experience needed\r\nAll skill levels welcome\r\nCoach feedback included",
    "additionalInstructions": "Important Information for Swimmers:\r\n\r\n• Please arrive at least 15–30 minutes before your scheduled tryout time for check-in and warm-up.\r\n• Bring your swimsuit, goggles, swim cap, towel, and a water bottle.\r\n• Ensure you are medically fit to participate in swimming activities.\r\n• Participants should be comfortable swimming independently in deep water.\r\n• Locker room facilities may be available; please secure personal belongings appropriately.\r\n• Parents/guardians may be required to complete consent forms for participants under 18 years of age.\r\n• Coaches may evaluate technique, endurance, speed, and overall swimming ability during the tryout.\r\n• Attendance at the tryout does not guarantee selection.\r\n• In case of severe weather or unforeseen circumstances, event organizers may reschedule the tryout.\r\n• Follow all pool safety rules and instructions provided by coaches and staff at all times.\r\n",
    "status": "open",
    "sessions": [
        {
            "date": "2026-06-13",
            "startTime": "16:37",
            "endTime": "17:38",
            "label": "Jun 13, 2026 · 16:37–17:38"
        },
        {
            "date": "2026-06-13",
            "startTime": "15:34",
            "endTime": "17:37",
            "label": "Jun 13, 2026 · 15:34–17:37"
        },
        {
            "date": "2026-06-14",
            "startTime": "17:34",
            "endTime": "19:39",
            "label": "Jun 14, 2026 · 17:34–19:39"
        }
    ],
    "segments": [
        {
            "name": "U12",
            "minAge": 6,
            "maxAge": 12,
            "level": "Beginner"
        },
        {
            "name": "U20",
            "minAge": 15,
            "maxAge": 20,
            "level": "Intermediate"
        },
        {
            "name": "Learning Bird",
            "minAge": 6,
            "maxAge": 10,
            "level": "Beginner"
        }
    ],
    "steps": [
        {
            "title": "Pick a Slot",
            "description": "Choose a time that works for you."
        },
        {
            "title": "Swim and Be Evaluated",
            "description": "Our coaches will assess your technique."
        },
        {
            "title": "Hear Back by Email",
            "description": "We'll send results within 3–5 business days."
        }
    ],
    "faqs": [
        {
            "question": "Question A",
            "answer": "No experience needed\nAll skill levels welcome\nCoach feedback included"
        }
    ],
    "clubId": "6a2bc9b7075a6fc7adfcff8b",
    "createdBy": "6a2bc972aaa6e171daaae2d8",
    "createdAt": "2026-06-12T09:07:21.533Z",
    "updatedAt": "2026-06-12T09:07:47.016Z",
};

function TryoutRegistration() {
  // TODO: Fetch tryout data by ID from API
  // For now, using sample data
  return (
    <PageShell title="Tryout Registration">
      <SwimmerTryoutDetailsPage
        tryout={sampleTryout}
        onRegister={(t) => toast.success(`Starting registration for ${t.name}`)}
      />
    </PageShell>
  );
}

export default TryoutRegistration;
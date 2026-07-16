export const DEFAULT_EMAIL_TEMPLATES = {
  rejected: {
    subject: "Tryout Result for {{swimmer_name}}",
    body: "Hi {{parent_name}}, \n\nThank you for participating in our tryout. After careful evaluation, we are unable to offer {{swimmer_name}} a spot at this time.\nWe encourage you to try again next season.\n\nBest regards,\n{{club_name}}",
  },
  offered: {
    subject: `Congratulations – Team Offer for {{swimmer_name}}`,
    body: `
      Hi {{parent_name}},
      
I am pleased to officially offer {{swimmer_name}} a spot on the {{group_name}} following a great performance at the {{tryout_name}} tryout.
We are thrilled to have {{swimmer_name}} join {{club_name}}! I will be sending a separate email shortly with all the registration details, practice schedules, and next steps.
Congratulations again—we look forward to seeing {{swimmer_name}} on deck!

Best regards,
{{club_name}}`,
  },
} as const;

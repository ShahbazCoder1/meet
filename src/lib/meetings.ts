export type Meeting = {
  id: string;
  day: string;
  time: string;
  duration: string;
  title: string;
  team: string;
  faces: string[];
  count: string;
  tone: "lavender" | "peach" | "mint";
};

export const meetings: Meeting[] = [
  { id: "brand-direction", day: "TODAY", time: "10:30 AM", duration: "45 min", title: "Brand direction & Q4 campaign", team: "Creative team", faces: ["photo-1534528741775-53994a69daeb", "photo-1500648767791-00dcc994a43e", "photo-1531123897727-8f129e1688ce"], count: "+2", tone: "lavender" },
  { id: "product-sync", day: "TODAY", time: "1:00 PM", duration: "30 min", title: "Weekly product sync", team: "Product · Sprint 24", faces: ["photo-1506794778202-cad84cf45f1d", "photo-1535713875002-d1d0cf377fde"], count: "+4", tone: "peach" },
  { id: "design-review", day: "TOMORROW", time: "9:00 AM", duration: "1 hr", title: "Design review — onboarding", team: "Product design", faces: ["photo-1580489944761-15a19d654956", "photo-1507003211169-0a1dd7228f2d", "photo-1544005313-94ddf0286df2"], count: "+1", tone: "mint" },
];

export function getMeetingTitle(id: string) {
  return meetings.find((meeting) => meeting.id === id)?.title ?? "A little room to connect";
}

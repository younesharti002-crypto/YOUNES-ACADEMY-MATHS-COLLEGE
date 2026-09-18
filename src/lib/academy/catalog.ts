export type AcademySegment = "primaire" | "college" | "lycee";

export type AcademySubjectLoad = {
  subject: string;
  sessions: number;
};

export type AcademyProgram = {
  key: string;
  label: string;
  segment: AcademySegment;
  weeklySessions: number;
  subjects: AcademySubjectLoad[];
};

export const ACADEMY_PROGRAMS: AcademyProgram[] = [
  {
    key: "4AP",
    label: "4AP",
    segment: "primaire",
    weeklySessions: 3,
    subjects: [
      { subject: "Maths", sessions: 1 },
      { subject: "Français", sessions: 1 },
      { subject: "Arabe", sessions: 1 },
    ],
  },
  {
    key: "5AP",
    label: "5AP",
    segment: "primaire",
    weeklySessions: 3,
    subjects: [
      { subject: "Maths", sessions: 1 },
      { subject: "Français", sessions: 1 },
      { subject: "Arabe", sessions: 1 },
    ],
  },
  {
    key: "6AP",
    label: "6AP",
    segment: "primaire",
    weeklySessions: 3,
    subjects: [
      { subject: "Maths", sessions: 1 },
      { subject: "Français", sessions: 1 },
      { subject: "Arabe", sessions: 1 },
    ],
  },
  {
    key: "1AC",
    label: "1AC",
    segment: "college",
    weeklySessions: 5,
    subjects: [
      { subject: "Maths", sessions: 2 },
      { subject: "PC", sessions: 1 },
      { subject: "SVT", sessions: 1 },
      { subject: "Français", sessions: 1 },
    ],
  },
  {
    key: "2AC",
    label: "2AC",
    segment: "college",
    weeklySessions: 5,
    subjects: [
      { subject: "Maths", sessions: 2 },
      { subject: "PC", sessions: 1 },
      { subject: "SVT", sessions: 1 },
      { subject: "Français", sessions: 1 },
    ],
  },
  {
    key: "3AC",
    label: "3AC",
    segment: "college",
    weeklySessions: 5,
    subjects: [
      { subject: "Maths", sessions: 2 },
      { subject: "PC", sessions: 1 },
      { subject: "SVT", sessions: 1 },
      { subject: "Français", sessions: 1 },
    ],
  },
  {
    key: "TC",
    label: "Tronc Commun",
    segment: "lycee",
    weeklySessions: 5,
    subjects: [
      { subject: "Maths", sessions: 2 },
      { subject: "PC", sessions: 1 },
      { subject: "SVT", sessions: 1 },
      { subject: "Anglais", sessions: 1 },
    ],
  },
  {
    key: "1BAC",
    label: "1BAC",
    segment: "lycee",
    weeklySessions: 5,
    subjects: [
      { subject: "Maths", sessions: 1 },
      { subject: "Français", sessions: 2 },
      { subject: "Arabe", sessions: 1 },
      { subject: "Histoire-Géographie", sessions: 1 },
    ],
  },
  {
    key: "2BAC_SVT",
    label: "2BAC SVT",
    segment: "lycee",
    weeklySessions: 6,
    subjects: [
      { subject: "Maths", sessions: 2 },
      { subject: "PC", sessions: 1 },
      { subject: "SVT", sessions: 2 },
      { subject: "Anglais", sessions: 1 },
    ],
  },
  {
    key: "2BAC_PC",
    label: "2BAC PC",
    segment: "lycee",
    weeklySessions: 6,
    subjects: [
      { subject: "Maths", sessions: 2 },
      { subject: "PC", sessions: 2 },
      { subject: "SVT", sessions: 1 },
      { subject: "Anglais", sessions: 1 },
    ],
  },
  {
    key: "2BAC_ECO",
    label: "2BAC ECO",
    segment: "lycee",
    weeklySessions: 5,
    subjects: [
      { subject: "Comptabilité", sessions: 2 },
      { subject: "Économie générale", sessions: 1 },
      { subject: "Maths", sessions: 1 },
      { subject: "Anglais", sessions: 1 },
    ],
  },
];

const TOTAL_WEEKLY_SLOTS = 72;
const SESSION_HOURS = 1.5;
const weeklySessions = ACADEMY_PROGRAMS.reduce(
  (sum, program) => sum + program.weeklySessions,
  0,
);

export const ACADEMY_METRICS = {
  rooms: 4,
  sessionHours: SESSION_HOURS,
  weeklyCapacitySlots: TOTAL_WEEKLY_SLOTS,
  weeklySessions,
  weeklyHours: weeklySessions * SESSION_HOURS,
  freeSlots: TOTAL_WEEKLY_SLOTS - weeklySessions,
  occupancyPercent: Math.round((weeklySessions / TOTAL_WEEKLY_SLOTS) * 1000) / 10,
};

export const ACADEMY_SEGMENT_LABELS: Record<
  AcademySegment,
  { ar: string; fr: string }
> = {
  primaire: { ar: "الابتدائي", fr: "Primaire" },
  college: { ar: "الإعدادي", fr: "Collège" },
  lycee: { ar: "الثانوي", fr: "Lycée" },
};

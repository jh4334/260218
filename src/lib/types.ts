export interface Classroom {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

export interface Student {
  id: string;
  classroom_id: string;
  student_code: string;
  name: string;
  tags: string[];
  created_at: string;
}

export interface Project {
  id: string;
  classroom_id: string;
  title: string;
  order_index: number;
  created_at: string;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  classroom_id: string;
  title: string;
  mode: string; // read | quiz | text | audio | upload | checkin | guidebook
  required: boolean;
  order_index: number;
}

export interface TaskSubmission {
  id: string;
  task_id: string;
  student_code: string;
  classroom_id: string;
  completed: boolean;
  score: number | null;
  created_at: string;
}

export interface MoodCheckin {
  id: string;
  classroom_id: string;
  student_code: string;
  mood_score: number; // 1-5
  phrase: string | null;
  created_at: string;
}

export interface LiteracyRun {
  id: string;
  classroom_id: string;
  student_code: string;
  score: number;
  created_at: string;
}

export interface GuidebookEntry {
  id: string;
  classroom_id: string;
  student_code: string;
  content: string;
  created_at: string;
}

export type SupportLogKind = "mission3" | "mission5" | "buddy" | "frame";

export interface SupportLog {
  id: string;
  classroom_id: string;
  student_code: string;
  kind: SupportLogKind;
  minutes: number;
  mission: string | null;
  detail: Record<string, unknown>;
  created_at: string;
}

export const ALL_TAGS = [
  "migrant",
  "korean",
  "ru",
  "uz",
  "newcomer",
  "support_literacy",
  "support_emotion",
  "buddy_leader",
] as const;

export type StudentTag = (typeof ALL_TAGS)[number];

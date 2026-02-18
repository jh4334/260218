import { fetchClassroomDataset } from "@/lib/classroomData";
import type { Student } from "@/lib/types";
import { currentWeekKeyKST, weekKeyKST } from "@/lib/week";

export interface StudentSupportSummary {
  totalLogs: number;
  totalMinutes: number;
  thisWeekLogs: number;
  thisWeekMinutes: number;
  byKind: {
    mission3: number;
    mission5: number;
    buddy: number;
    frame: number;
  };
  lastLog: {
    kind: string;
    minutes: number;
    mission: string | null;
    createdAt: string;
  } | null;
}

export interface StudentReportMetrics {
  student: Student;
  requiredTaskProgress: number;
  latestLiteracyScore: number | null;
  moodAverage: number | null;
  supportSummary: StudentSupportSummary;
}

function round(value: number, digits = 1): number {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

export async function getStudentReportMetrics(
  classroomId: string,
  studentCode: string
): Promise<StudentReportMetrics | null> {
  const dataset = await fetchClassroomDataset(classroomId);
  const student = dataset.students.find((row) => row.student_code === studentCode);
  if (!student) return null;

  const requiredTasks = dataset.tasks.filter((task) => task.mode !== "read");
  const completed = new Set(
    dataset.submissions
      .filter((submission) => submission.student_code === studentCode && submission.completed)
      .map((submission) => submission.task_id)
  );
  const requiredTaskProgress =
    requiredTasks.length > 0 ? (completed.size / requiredTasks.length) * 100 : 0;

  const literacy = dataset.literacyRuns
    .filter((run) => run.student_code === studentCode)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const latestLiteracyScore = literacy.at(-1)?.score ?? null;

  const moods = dataset.moodCheckins
    .filter((checkin) => checkin.student_code === studentCode)
    .map((checkin) => checkin.mood_score);
  const moodAverage =
    moods.length > 0 ? moods.reduce((sum, mood) => sum + mood, 0) / moods.length : null;

  const logs = dataset.supportLogs
    .filter((log) => log.student_code === studentCode)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const currentWeek = currentWeekKeyKST();

  const supportSummary: StudentSupportSummary = {
    totalLogs: logs.length,
    totalMinutes: logs.reduce((sum, log) => sum + log.minutes, 0),
    thisWeekLogs: logs.filter((log) => weekKeyKST(log.created_at) === currentWeek).length,
    thisWeekMinutes: logs
      .filter((log) => weekKeyKST(log.created_at) === currentWeek)
      .reduce((sum, log) => sum + log.minutes, 0),
    byKind: {
      mission3: logs.filter((log) => log.kind === "mission3").length,
      mission5: logs.filter((log) => log.kind === "mission5").length,
      buddy: logs.filter((log) => log.kind === "buddy").length,
      frame: logs.filter((log) => log.kind === "frame").length,
    },
    lastLog: logs[0]
      ? {
          kind: logs[0].kind,
          minutes: logs[0].minutes,
          mission: logs[0].mission ?? null,
          createdAt: logs[0].created_at,
        }
      : null,
  };

  return {
    student,
    requiredTaskProgress: round(requiredTaskProgress, 1),
    latestLiteracyScore: latestLiteracyScore === null ? null : round(latestLiteracyScore, 2),
    moodAverage: moodAverage === null ? null : round(moodAverage, 2),
    supportSummary,
  };
}

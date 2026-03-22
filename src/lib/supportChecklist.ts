import { fetchClassroomDataset } from "@/lib/classroomData";
import type { Project, ProjectTask, Student, SupportLog, TaskSubmission } from "@/lib/types";
import { currentWeekKeyKST, weekKeyKST } from "@/lib/week";

export interface MissingTask {
  taskId: string;
  taskTitle: string;
  mode: string;
  projectId: string;
  projectTitle: string;
}

export interface MissingProjectGroup {
  projectId: string;
  projectTitle: string;
  tasks: MissingTask[];
}

export interface SupportChecklistRow {
  studentCode: string;
  studentName: string;
  tags: string[];
  missingByProject: MissingProjectGroup[];
  recommended: {
    threeMin: string;
    fiveMin: string;
  };
  thisWeekLogs: number;
  totalLogs: number;
  recentLogs: SupportLog[];
}

function buildDoneMap(submissions: TaskSubmission[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const submission of submissions) {
    if (!submission.completed) continue;
    const set = map.get(submission.student_code) ?? new Set<string>();
    set.add(submission.task_id);
    map.set(submission.student_code, set);
  }
  return map;
}

function buildProjectMap(projects: Project[]): Map<string, Project> {
  return new Map(projects.map((project) => [project.id, project]));
}

function buildMissingRequiredTasks(
  student: Student,
  requiredTasks: ProjectTask[],
  doneMap: Map<string, Set<string>>,
  projectsById: Map<string, Project>
): MissingTask[] {
  const done = doneMap.get(student.student_code) ?? new Set<string>();
  return requiredTasks
    .filter((task) => !done.has(task.id))
    .map((task) => ({
      taskId: task.id,
      taskTitle: task.title,
      mode: task.mode,
      projectId: task.project_id,
      projectTitle: projectsById.get(task.project_id)?.title ?? "프로젝트",
    }));
}

function groupMissingByProject(missingTasks: MissingTask[]): MissingProjectGroup[] {
  const map = new Map<string, MissingProjectGroup>();
  for (const task of missingTasks) {
    const row = map.get(task.projectId) ?? {
      projectId: task.projectId,
      projectTitle: task.projectTitle,
      tasks: [],
    };
    row.tasks.push(task);
    map.set(task.projectId, row);
  }
  return Array.from(map.values()).sort((a, b) => a.projectTitle.localeCompare(b.projectTitle));
}

function containsLiteracyKeyword(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("literacy") ||
    normalized.includes("문해") ||
    normalized.includes("읽기") ||
    normalized.includes("어휘")
  );
}

function firstByMode(tasks: MissingTask[], mode: string): MissingTask | null {
  return tasks.find((task) => task.mode === mode) ?? null;
}

function recommendThreeMin(tasks: MissingTask[]): string {
  const literacyQuiz =
    tasks.find((task) => task.mode === "quiz" && containsLiteracyKeyword(`${task.projectTitle} ${task.taskTitle}`)) ??
    null;
  if (literacyQuiz) return `문해 퀴즈 3분: ${literacyQuiz.projectTitle} / ${literacyQuiz.taskTitle}`;

  const quiz = firstByMode(tasks, "quiz");
  if (quiz) return `퀴즈 3분: ${quiz.projectTitle} / ${quiz.taskTitle}`;

  const textTask = firstByMode(tasks, "text");
  if (textTask) return `문장 1개 작성: ${textTask.projectTitle} / ${textTask.taskTitle}`;

  const checkin = firstByMode(tasks, "checkin");
  if (checkin) return `체크인 1회: ${checkin.projectTitle} / ${checkin.taskTitle}`;

  return "체크인 1회 또는 짧은 문장 1개 작성";
}

function recommendFiveMin(tasks: MissingTask[]): string {
  const audio = firstByMode(tasks, "audio");
  if (audio) return `오디오 업로드 5분: ${audio.projectTitle} / ${audio.taskTitle}`;

  const upload = firstByMode(tasks, "upload");
  if (upload) return `업로드 5분: ${upload.projectTitle} / ${upload.taskTitle}`;

  const textTask = firstByMode(tasks, "text");
  if (textTask) return `문장 2개 작성: ${textTask.projectTitle} / ${textTask.taskTitle}`;

  const guidebook = firstByMode(tasks, "guidebook");
  if (guidebook) return `가이드북 1페이지 추가: ${guidebook.projectTitle} / ${guidebook.taskTitle}`;

  return "문장 2개 작성 또는 가이드북 1페이지 추가";
}

function summarizeLogsByStudent(logs: SupportLog[]): {
  thisWeek: number;
  total: number;
  recent: SupportLog[];
} {
  const currentWeek = currentWeekKeyKST();
  const sorted = [...logs].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const thisWeek = sorted.filter((log) => weekKeyKST(log.created_at) === currentWeek).length;
  return {
    thisWeek,
    total: sorted.length,
    recent: sorted.slice(0, 5),
  };
}

export async function getSupportChecklistRows(classroomId: string): Promise<SupportChecklistRow[]> {
  const dataset = await fetchClassroomDataset(classroomId);
  const supportStudents = dataset.students.filter((student) =>
    student.tags.includes("support_literacy")
  );

  const requiredTasks = dataset.tasks.filter((task) => task.mode !== "read");
  const doneMap = buildDoneMap(dataset.submissions);
  const projectsById = buildProjectMap(dataset.projects);

  const logsByStudent = new Map<string, SupportLog[]>();
  for (const log of dataset.supportLogs) {
    const list = logsByStudent.get(log.student_code) ?? [];
    list.push(log);
    logsByStudent.set(log.student_code, list);
  }

  const rows: SupportChecklistRow[] = [];

  for (const student of supportStudents) {
    const missingTasks = buildMissingRequiredTasks(student, requiredTasks, doneMap, projectsById);
    if (missingTasks.length === 0) continue;

    const logs = summarizeLogsByStudent(logsByStudent.get(student.student_code) ?? []);
    rows.push({
      studentCode: student.student_code,
      studentName: student.name,
      tags: student.tags,
      missingByProject: groupMissingByProject(missingTasks),
      recommended: {
        threeMin: recommendThreeMin(missingTasks),
        fiveMin: recommendFiveMin(missingTasks),
      },
      thisWeekLogs: logs.thisWeek,
      totalLogs: logs.total,
      recentLogs: logs.recent,
    });
  }

  return rows.sort((a, b) => a.studentName.localeCompare(b.studentName));
}

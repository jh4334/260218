import { fetchClassroomDataset } from "@/lib/classroomData";
import type {
  GuidebookEntry,
  LiteracyRun,
  MoodCheckin,
  Project,
  ProjectTask,
  Student,
  SupportLog,
  TaskSubmission,
} from "@/lib/types";
import { currentWeekKeyKST, weekKeyKST } from "@/lib/week";

interface TaskProgress {
  taskId: string;
  projectId: string;
  projectTitle: string;
  taskTitle: string;
  mode: string;
  doneCount: number;
  totalStudents: number;
  percent: number;
}

export interface ProjectProgressSummary {
  projectId: string;
  projectTitle: string;
  avgPercent: number;
  topTasks: TaskProgress[];
  bottomTasks: TaskProgress[];
}

export interface StudentSummary {
  studentCode: string;
  name: string;
  tags: string[];
  overallProgress: number;
  moodAvg: number | null;
  moodPhrases: string[];
  literacyLatest: number | null;
  guidebookArtifact: string | null;
}

export interface TagWeeklySeries {
  labels: string[];
  ru: Array<number | null>;
  uz: Array<number | null>;
  kor: Array<number | null>;
}

export interface SupportWeeklySeries {
  labels: string[];
  mission3: number[];
  mission5: number[];
  scaffold: number[];
  total: number[];
  minutes: number[];
}

export interface SupportAnalytics {
  weekly: SupportWeeklySeries;
  cumulative: SupportWeeklySeries;
  totals: {
    mission3: number;
    mission5: number;
    scaffold: number;
    total: number;
    minutes: number;
  };
  topStudents: Array<{
    studentCode: string;
    name: string;
    logs: number;
    minutes: number;
  }>;
}

export interface SupportEffectAnalysis {
  avgDeltaSupport: number | null;
  avgDeltaNonSupport: number | null;
  avgPrePostDeltaSupport: number | null;
  correlationLogsDelta: number | null;
  correlationMinutesDelta: number | null;
  sampleSizes: {
    supportDeltaN: number;
    nonSupportDeltaN: number;
    prePostN: number;
    correlationN: number;
  };
  interpretation: string[];
}

export interface ClassReportMetrics {
  studentCount: number;
  requiredTaskCount: number;
  projectProgress: ProjectProgressSummary[];
  studentSummaries: StudentSummary[];
  tagWeeklyMood: TagWeeklySeries;
  tagWeeklyLiteracy: TagWeeklySeries;
  supportAnalytics: SupportAnalytics;
  supportChecklistSummary: {
    supportStudents: number;
    supportStudentsMissingRequired: number;
    totalMissingRequiredTasks: number;
  };
  supportEffect: SupportEffectAnalysis;
}

function round(value: number, digits = 1): number {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function projectMap(projects: Project[]): Map<string, Project> {
  return new Map(projects.map((project) => [project.id, project]));
}

function studentMap(students: Student[]): Map<string, Student> {
  return new Map(students.map((student) => [student.student_code, student]));
}

function buildTaskCompletionMap(submissions: TaskSubmission[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const submission of submissions) {
    if (!submission.completed) continue;
    const set = map.get(submission.task_id) ?? new Set<string>();
    set.add(submission.student_code);
    map.set(submission.task_id, set);
  }
  return map;
}

function buildStudentCompletedTaskMap(submissions: TaskSubmission[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const submission of submissions) {
    if (!submission.completed) continue;
    const set = map.get(submission.student_code) ?? new Set<string>();
    set.add(submission.task_id);
    map.set(submission.student_code, set);
  }
  return map;
}

function getRepresentativeArtifact(entries: GuidebookEntry[]): string | null {
  if (entries.length === 0) return null;
  const latest = [...entries].sort((a, b) => a.created_at.localeCompare(b.created_at)).at(-1);
  if (!latest) return null;
  const text = latest.content.trim();
  if (!text) return null;
  return text.length > 80 ? `${text.slice(0, 80)}...` : text;
}

function buildTagSeries<T extends MoodCheckin | LiteracyRun>(
  rows: T[],
  students: Student[],
  getValue: (row: T) => number
): TagWeeklySeries {
  const ruCodes = new Set(students.filter((s) => s.tags.includes("ru")).map((s) => s.student_code));
  const uzCodes = new Set(students.filter((s) => s.tags.includes("uz")).map((s) => s.student_code));
  const korCodes = new Set(students.filter((s) => s.tags.includes("korean")).map((s) => s.student_code));

  const buckets = {
    ru: new Map<string, { sum: number; count: number }>(),
    uz: new Map<string, { sum: number; count: number }>(),
    kor: new Map<string, { sum: number; count: number }>(),
  };

  const add = (group: "ru" | "uz" | "kor", weekKey: string, value: number) => {
    const current = buckets[group].get(weekKey) ?? { sum: 0, count: 0 };
    current.sum += value;
    current.count += 1;
    buckets[group].set(weekKey, current);
  };

  for (const row of rows) {
    const weekKey = weekKeyKST(row.created_at);
    const value = getValue(row);
    if (ruCodes.has(row.student_code)) add("ru", weekKey, value);
    if (uzCodes.has(row.student_code)) add("uz", weekKey, value);
    if (korCodes.has(row.student_code)) add("kor", weekKey, value);
  }

  const labels = Array.from(
    new Set([...buckets.ru.keys(), ...buckets.uz.keys(), ...buckets.kor.keys()])
  ).sort();

  const project = (group: "ru" | "uz" | "kor"): Array<number | null> =>
    labels.map((label) => {
      const bucket = buckets[group].get(label);
      if (!bucket || bucket.count === 0) return null;
      return round(bucket.sum / bucket.count, 2);
    });

  return {
    labels,
    ru: project("ru"),
    uz: project("uz"),
    kor: project("kor"),
  };
}

function buildSupportAnalytics(
  supportLogs: SupportLog[],
  studentsByCode: Map<string, Student>
): SupportAnalytics {
  const weeklyMap = new Map<
    string,
    { mission3: number; mission5: number; scaffold: number; total: number; minutes: number }
  >();

  for (const log of supportLogs) {
    const weekKey = weekKeyKST(log.created_at);
    const row = weeklyMap.get(weekKey) ?? {
      mission3: 0,
      mission5: 0,
      scaffold: 0,
      total: 0,
      minutes: 0,
    };
    row.total += 1;
    row.minutes += log.minutes;
    if (log.kind === "mission3") row.mission3 += 1;
    if (log.kind === "mission5") row.mission5 += 1;
    if (log.kind === "buddy" || log.kind === "frame") row.scaffold += 1;
    weeklyMap.set(weekKey, row);
  }

  const labels = Array.from(weeklyMap.keys()).sort();
  const weekly: SupportWeeklySeries = {
    labels,
    mission3: labels.map((label) => weeklyMap.get(label)?.mission3 ?? 0),
    mission5: labels.map((label) => weeklyMap.get(label)?.mission5 ?? 0),
    scaffold: labels.map((label) => weeklyMap.get(label)?.scaffold ?? 0),
    total: labels.map((label) => weeklyMap.get(label)?.total ?? 0),
    minutes: labels.map((label) => weeklyMap.get(label)?.minutes ?? 0),
  };

  const cumulative: SupportWeeklySeries = {
    labels,
    mission3: [],
    mission5: [],
    scaffold: [],
    total: [],
    minutes: [],
  };

  let cMission3 = 0;
  let cMission5 = 0;
  let cScaffold = 0;
  let cTotal = 0;
  let cMinutes = 0;

  for (let i = 0; i < labels.length; i += 1) {
    cMission3 += weekly.mission3[i] ?? 0;
    cMission5 += weekly.mission5[i] ?? 0;
    cScaffold += weekly.scaffold[i] ?? 0;
    cTotal += weekly.total[i] ?? 0;
    cMinutes += weekly.minutes[i] ?? 0;
    cumulative.mission3.push(cMission3);
    cumulative.mission5.push(cMission5);
    cumulative.scaffold.push(cScaffold);
    cumulative.total.push(cTotal);
    cumulative.minutes.push(cMinutes);
  }

  const byStudent = new Map<string, { logs: number; minutes: number }>();
  for (const log of supportLogs) {
    const row = byStudent.get(log.student_code) ?? { logs: 0, minutes: 0 };
    row.logs += 1;
    row.minutes += log.minutes;
    byStudent.set(log.student_code, row);
  }

  const topStudents = Array.from(byStudent.entries())
    .map(([studentCode, value]) => ({
      studentCode,
      name: studentsByCode.get(studentCode)?.name ?? studentCode,
      logs: value.logs,
      minutes: value.minutes,
    }))
    .sort((a, b) => b.logs - a.logs || b.minutes - a.minutes)
    .slice(0, 5);

  return {
    weekly,
    cumulative,
    totals: {
      mission3: cMission3,
      mission5: cMission5,
      scaffold: cScaffold,
      total: cTotal,
      minutes: cMinutes,
    },
    topStudents,
  };
}

function pearson(x: number[], y: number[]): number | null {
  if (x.length < 2 || y.length < 2 || x.length !== y.length) return null;

  const xMean = x.reduce((sum, n) => sum + n, 0) / x.length;
  const yMean = y.reduce((sum, n) => sum + n, 0) / y.length;

  let numerator = 0;
  let xDen = 0;
  let yDen = 0;

  for (let i = 0; i < x.length; i += 1) {
    const xd = x[i] - xMean;
    const yd = y[i] - yMean;
    numerator += xd * yd;
    xDen += xd * xd;
    yDen += yd * yd;
  }

  const denominator = Math.sqrt(xDen * yDen);
  if (denominator === 0) return null;
  return numerator / denominator;
}

function buildSupportEffectAnalysis(
  students: Student[],
  literacyRuns: LiteracyRun[],
  supportLogs: SupportLog[]
): SupportEffectAnalysis {
  const supportCodes = new Set(
    students.filter((student) => student.tags.includes("support_literacy")).map((student) => student.student_code)
  );

  const runsByStudent = new Map<string, LiteracyRun[]>();
  for (const run of literacyRuns) {
    const list = runsByStudent.get(run.student_code) ?? [];
    list.push(run);
    runsByStudent.set(run.student_code, list);
  }

  const logsByStudent = new Map<string, SupportLog[]>();
  for (const log of supportLogs) {
    const list = logsByStudent.get(log.student_code) ?? [];
    list.push(log);
    logsByStudent.set(log.student_code, list);
  }

  const supportDeltas: number[] = [];
  const nonSupportDeltas: number[] = [];
  const correlationXLogs: number[] = [];
  const correlationXMinutes: number[] = [];
  const correlationYDelta: number[] = [];
  const prePostDeltas: number[] = [];

  for (const student of students) {
    const runs = [...(runsByStudent.get(student.student_code) ?? [])].sort((a, b) =>
      a.created_at.localeCompare(b.created_at)
    );
    if (runs.length < 2) continue;

    const first = runs[0].score;
    const last = runs[runs.length - 1].score;
    const delta = last - first;
    const isSupport = supportCodes.has(student.student_code);

    if (isSupport) {
      supportDeltas.push(delta);
    } else {
      nonSupportDeltas.push(delta);
    }

    if (isSupport) {
      const logs = [...(logsByStudent.get(student.student_code) ?? [])].sort((a, b) =>
        a.created_at.localeCompare(b.created_at)
      );
      const logCount = logs.length;
      const minutes = logs.reduce((sum, log) => sum + log.minutes, 0);
      correlationXLogs.push(logCount);
      correlationXMinutes.push(minutes);
      correlationYDelta.push(delta);

      const firstLogDate = logs.at(0)?.created_at;
      if (firstLogDate) {
        const preScores = runs.filter((run) => run.created_at < firstLogDate).map((run) => run.score);
        const postScores = runs.filter((run) => run.created_at >= firstLogDate).map((run) => run.score);
        const preAvg = avg(preScores);
        const postAvg = avg(postScores);
        if (preAvg !== null && postAvg !== null) {
          prePostDeltas.push(postAvg - preAvg);
        }
      }
    }
  }

  const avgDeltaSupport = avg(supportDeltas);
  const avgDeltaNonSupport = avg(nonSupportDeltas);
  const avgPrePostDeltaSupport = avg(prePostDeltas);
  const correlationLogsDelta = pearson(correlationXLogs, correlationYDelta);
  const correlationMinutesDelta = pearson(correlationXMinutes, correlationYDelta);

  const interpretation: string[] = [];
  interpretation.push(
    `문해력 변화 평균(지원군 vs 비지원군): ${round(avgDeltaSupport ?? 0, 2)} vs ${round(avgDeltaNonSupport ?? 0, 2)}`
  );
  interpretation.push(
    `지원 시작 전후 평균 변화(지원군): ${avgPrePostDeltaSupport === null ? "표본 부족" : round(avgPrePostDeltaSupport, 2)}`
  );
  interpretation.push(
    `상관(로그수-점수변화): ${correlationLogsDelta === null ? "표본 부족" : round(correlationLogsDelta, 3)}`
  );
  interpretation.push(
    `상관(지원분량-점수변화): ${correlationMinutesDelta === null ? "표본 부족" : round(correlationMinutesDelta, 3)}`
  );

  return {
    avgDeltaSupport: avgDeltaSupport === null ? null : round(avgDeltaSupport, 2),
    avgDeltaNonSupport: avgDeltaNonSupport === null ? null : round(avgDeltaNonSupport, 2),
    avgPrePostDeltaSupport:
      avgPrePostDeltaSupport === null ? null : round(avgPrePostDeltaSupport, 2),
    correlationLogsDelta: correlationLogsDelta === null ? null : round(correlationLogsDelta, 3),
    correlationMinutesDelta:
      correlationMinutesDelta === null ? null : round(correlationMinutesDelta, 3),
    sampleSizes: {
      supportDeltaN: supportDeltas.length,
      nonSupportDeltaN: nonSupportDeltas.length,
      prePostN: prePostDeltas.length,
      correlationN: correlationYDelta.length,
    },
    interpretation,
  };
}

function valueOrDash(value: number | null): number {
  if (value === null) return 0;
  return value;
}

function buildProjectProgress(
  projects: Project[],
  requiredTasks: ProjectTask[],
  completionMap: Map<string, Set<string>>,
  studentCount: number
): ProjectProgressSummary[] {
  const projectsById = projectMap(projects);
  const byProject = new Map<string, TaskProgress[]>();

  for (const task of requiredTasks) {
    const doneCount = completionMap.get(task.id)?.size ?? 0;
    const percent = studentCount > 0 ? (doneCount / studentCount) * 100 : 0;
    const project = projectsById.get(task.project_id);
    const list = byProject.get(task.project_id) ?? [];
    list.push({
      taskId: task.id,
      projectId: task.project_id,
      projectTitle: project?.title ?? "Untitled project",
      taskTitle: task.title,
      mode: task.mode,
      doneCount,
      totalStudents: studentCount,
      percent: round(percent, 1),
    });
    byProject.set(task.project_id, list);
  }

  return projects.map((project) => {
    const tasks = byProject.get(project.id) ?? [];
    const sorted = [...tasks].sort((a, b) => b.percent - a.percent);
    const avgPercent =
      tasks.length > 0 ? tasks.reduce((sum, task) => sum + task.percent, 0) / tasks.length : 0;

    return {
      projectId: project.id,
      projectTitle: project.title,
      avgPercent: round(avgPercent, 1),
      topTasks: sorted.slice(0, 3),
      bottomTasks: [...sorted].reverse().slice(0, 3),
    };
  });
}

function buildStudentSummaries(
  students: Student[],
  requiredTasks: ProjectTask[],
  submissions: TaskSubmission[],
  moodCheckins: MoodCheckin[],
  literacyRuns: LiteracyRun[],
  guidebookEntries: GuidebookEntry[]
): StudentSummary[] {
  const completedTaskMap = buildStudentCompletedTaskMap(submissions);
  const moodByStudent = new Map<string, MoodCheckin[]>();
  const literacyByStudent = new Map<string, LiteracyRun[]>();
  const guidebookByStudent = new Map<string, GuidebookEntry[]>();

  for (const mood of moodCheckins) {
    const list = moodByStudent.get(mood.student_code) ?? [];
    list.push(mood);
    moodByStudent.set(mood.student_code, list);
  }
  for (const run of literacyRuns) {
    const list = literacyByStudent.get(run.student_code) ?? [];
    list.push(run);
    literacyByStudent.set(run.student_code, list);
  }
  for (const entry of guidebookEntries) {
    const list = guidebookByStudent.get(entry.student_code) ?? [];
    list.push(entry);
    guidebookByStudent.set(entry.student_code, list);
  }

  const requiredCount = requiredTasks.length;
  return students.map((student) => {
    const completedCount = completedTaskMap.get(student.student_code)?.size ?? 0;
    const overallProgress = requiredCount > 0 ? (completedCount / requiredCount) * 100 : 0;

    const moods = moodByStudent.get(student.student_code) ?? [];
    const moodValues = moods.map((mood) => mood.mood_score);
    const moodAvg = avg(moodValues);
    const moodPhrases = moods
      .map((mood) => (mood.phrase ?? "").trim())
      .filter(Boolean)
      .slice(-3);

    const literacy = [...(literacyByStudent.get(student.student_code) ?? [])].sort((a, b) =>
      a.created_at.localeCompare(b.created_at)
    );
    const literacyLatest = literacy.at(-1)?.score ?? null;
    const guidebookArtifact = getRepresentativeArtifact(guidebookByStudent.get(student.student_code) ?? []);

    return {
      studentCode: student.student_code,
      name: student.name,
      tags: student.tags,
      overallProgress: round(overallProgress, 1),
      moodAvg: moodAvg === null ? null : round(moodAvg, 2),
      moodPhrases,
      literacyLatest: literacyLatest === null ? null : round(literacyLatest, 2),
      guidebookArtifact,
    };
  });
}

function buildSupportChecklistSummary(
  students: Student[],
  requiredTasks: ProjectTask[],
  submissions: TaskSubmission[]
): { supportStudents: number; supportStudentsMissingRequired: number; totalMissingRequiredTasks: number } {
  const supportStudents = students.filter((student) => student.tags.includes("support_literacy"));
  const completedTaskMap = buildStudentCompletedTaskMap(submissions);

  let supportStudentsMissingRequired = 0;
  let totalMissingRequiredTasks = 0;

  for (const student of supportStudents) {
    const done = completedTaskMap.get(student.student_code) ?? new Set<string>();
    const missingCount = requiredTasks.filter((task) => !done.has(task.id)).length;
    if (missingCount > 0) {
      supportStudentsMissingRequired += 1;
      totalMissingRequiredTasks += missingCount;
    }
  }

  return {
    supportStudents: supportStudents.length,
    supportStudentsMissingRequired,
    totalMissingRequiredTasks,
  };
}

export async function getClassReportMetrics(classroomId: string): Promise<ClassReportMetrics> {
  const dataset = await fetchClassroomDataset(classroomId);
  const requiredTasks = dataset.tasks.filter((task) => task.mode !== "read");
  const studentCount = dataset.students.length;
  const completionMap = buildTaskCompletionMap(dataset.submissions);
  const projectProgress = buildProjectProgress(dataset.projects, requiredTasks, completionMap, studentCount);
  const studentSummaries = buildStudentSummaries(
    dataset.students,
    requiredTasks,
    dataset.submissions,
    dataset.moodCheckins,
    dataset.literacyRuns,
    dataset.guidebookEntries
  );

  const tagWeeklyMood = buildTagSeries(dataset.moodCheckins, dataset.students, (row) => row.mood_score);
  const tagWeeklyLiteracy = buildTagSeries(dataset.literacyRuns, dataset.students, (row) => row.score);

  const supportCodes = new Set(
    dataset.students
      .filter((student) => student.tags.includes("support_literacy"))
      .map((student) => student.student_code)
  );
  const supportLogs = dataset.supportLogs.filter((log) => supportCodes.has(log.student_code));
  const studentsByCode = studentMap(dataset.students);
  const supportAnalytics = buildSupportAnalytics(supportLogs, studentsByCode);
  const supportEffect = buildSupportEffectAnalysis(dataset.students, dataset.literacyRuns, supportLogs);
  const supportChecklistSummary = buildSupportChecklistSummary(
    dataset.students,
    requiredTasks,
    dataset.submissions
  );

  const currentWeek = currentWeekKeyKST();
  if (!supportAnalytics.weekly.labels.includes(currentWeek)) {
    supportAnalytics.weekly.labels.push(currentWeek);
    supportAnalytics.weekly.mission3.push(0);
    supportAnalytics.weekly.mission5.push(0);
    supportAnalytics.weekly.scaffold.push(0);
    supportAnalytics.weekly.total.push(0);
    supportAnalytics.weekly.minutes.push(0);

    const lastMission3 = supportAnalytics.cumulative.mission3.at(-1) ?? 0;
    const lastMission5 = supportAnalytics.cumulative.mission5.at(-1) ?? 0;
    const lastScaffold = supportAnalytics.cumulative.scaffold.at(-1) ?? 0;
    const lastTotal = supportAnalytics.cumulative.total.at(-1) ?? 0;
    const lastMinutes = supportAnalytics.cumulative.minutes.at(-1) ?? 0;
    supportAnalytics.cumulative.labels.push(currentWeek);
    supportAnalytics.cumulative.mission3.push(valueOrDash(lastMission3));
    supportAnalytics.cumulative.mission5.push(valueOrDash(lastMission5));
    supportAnalytics.cumulative.scaffold.push(valueOrDash(lastScaffold));
    supportAnalytics.cumulative.total.push(valueOrDash(lastTotal));
    supportAnalytics.cumulative.minutes.push(valueOrDash(lastMinutes));
  }

  return {
    studentCount,
    requiredTaskCount: requiredTasks.length,
    projectProgress,
    studentSummaries,
    tagWeeklyMood,
    tagWeeklyLiteracy,
    supportAnalytics,
    supportChecklistSummary,
    supportEffect,
  };
}

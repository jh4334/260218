import type { StudentTag } from "@/lib/types";

const DEFAULT_MIGRANT_LANGUAGE_RATIO = 0.7; // ru:uz = 70:30
const DEFAULT_MIGRANT_RATIO = 0.7; // migrant:korean = 70:30

function clampCount(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

export function buildInitialStudentTags(totalStudents: number, index: number): StudentTag[] {
  const total = clampCount(totalStudents);
  if (total === 0) {
    return ["korean"];
  }

  const migrantCount = Math.round(total * DEFAULT_MIGRANT_RATIO);
  const safeIndex = Math.max(0, Math.min(index, total - 1));
  const isMigrant = safeIndex < migrantCount;

  if (!isMigrant) {
    return ["korean"];
  }

  const migrantIndex = safeIndex;
  const ruCount = Math.max(1, Math.round(migrantCount * DEFAULT_MIGRANT_LANGUAGE_RATIO));
  const languageTag: StudentTag = migrantIndex < ruCount ? "ru" : "uz";
  return ["migrant", languageTag];
}

export function buildInitialTagsMap(studentCodes: string[]): Record<string, StudentTag[]> {
  const total = studentCodes.length;
  return studentCodes.reduce<Record<string, StudentTag[]>>((acc, code, index) => {
    acc[code] = buildInitialStudentTags(total, index);
    return acc;
  }, {});
}

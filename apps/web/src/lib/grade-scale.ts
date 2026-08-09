// Mirrors the API's grading scale (apps/api/src/modules/grades/grade-scale.util.ts)
// so the teacher sees the same final letter a student will see on Results.
export function percentageToGradeLabel(pct: number): string {
  if (pct >= 85) return 'A';
  if (pct >= 80) return 'A-';
  if (pct >= 75) return 'B+';
  if (pct >= 70) return 'B';
  if (pct >= 65) return 'B-';
  if (pct >= 60) return 'C+';
  if (pct >= 55) return 'C';
  if (pct >= 50) return 'C-';
  if (pct >= 45) return 'D+';
  if (pct >= 40) return 'D';
  return 'F';
}
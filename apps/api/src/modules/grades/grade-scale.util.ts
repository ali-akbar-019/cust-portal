// Standard 4.0-scale grade point mapping from percentage.
// TODO: CUST's real grading scale/policy should replace this once known —
// this is a reasonable common default, not verified against CUST's actual rubric.
export function percentageToGradePoint(pct: number): { letter: string; points: number } {
  if (pct >= 85) return { letter: 'A', points: 4.0 };
  if (pct >= 80) return { letter: 'A-', points: 3.7 };
  if (pct >= 75) return { letter: 'B+', points: 3.3 };
  if (pct >= 70) return { letter: 'B', points: 3.0 };
  if (pct >= 65) return { letter: 'B-', points: 2.7 };
  if (pct >= 60) return { letter: 'C+', points: 2.3 };
  if (pct >= 55) return { letter: 'C', points: 2.0 };
  if (pct >= 50) return { letter: 'C-', points: 1.7 };
  if (pct >= 45) return { letter: 'D+', points: 1.3 };
  if (pct >= 40) return { letter: 'D', points: 1.0 };
  return { letter: 'F', points: 0.0 };
}

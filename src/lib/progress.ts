// ==============================================================================
// Progress Persistence Helpers & Domain Logic — Sistema Autônomos
// File: src/lib/progress.ts
// ==============================================================================

import { NextRequest } from 'next/server';
import { getCurrentUser } from './session';

export const TOTAL_LESSONS = 108;
export const TOTAL_EXERCISES = 13;
export const TOTAL_COURSE_ITEMS = TOTAL_LESSONS + TOTAL_EXERCISES; // 121

/**
 * Recalcula atomicamente o percentual geral do curso ROS 2 Jazzy:
 * (N_aulas_concluidas + N_exercicios_concluidos) / (108 + 13) * 100 (arredondado).
 */
export function calculateOverallPercentage(
  completedLessonsCount: number,
  completedExercisesCount: number
): number {
  const sum = completedLessonsCount + completedExercisesCount;
  return Math.min(
    100,
    Math.max(0, Math.round((sum / TOTAL_COURSE_ITEMS) * 100))
  );
}

/** Validates a live, approved database session before reading or writing progress. */
export async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  return (await getCurrentUser(req))?.id ?? null;
}

import { traceApi } from '@/lib/activity/server';
// ==============================================================================
// POST /api/progress/exercise
// File: src/app/api/progress/exercise/route.ts
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getAuthenticatedUserId,
  calculateOverallPercentage,
  TOTAL_LESSONS,
} from '@/lib/progress';

export async function POST(req: NextRequest) {
  return traceApi(req, "POST /api/progress/exercise", async () => {
  try {
    // 1. Autenticação obrigatória (cookie autonomos_session)
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para persistir o progresso.' },
        { status: 401 }
      );
    }

    // 2. Leitura e validação de formato do JSON
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Corpo da requisição inválido (JSON esperado).' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Corpo da requisição deve ser um objeto JSON válido.' },
        { status: 400 }
      );
    }

    const { exerciseId, completed, code } = body as {
      exerciseId?: unknown;
      completed?: unknown;
      code?: unknown;
    };

    if (!exerciseId || typeof exerciseId !== 'string' || exerciseId.trim() === '') {
      return NextResponse.json(
        { error: 'O identificador do exercício (exerciseId: string) é obrigatório.' },
        { status: 400 }
      );
    }

    if (typeof completed !== 'boolean') {
      return NextResponse.json(
        { error: 'O status de conclusão (completed: boolean) é obrigatório.' },
        { status: 400 }
      );
    }

    if (code !== undefined && typeof code !== 'string') {
      return NextResponse.json(
        { error: 'O código submetido (code) deve ser uma string.' },
        { status: 400 }
      );
    }

    // 3. Resolução do exercício (suporta CUID ou orderIndex numérico)
    const numId = Number(exerciseId);
    const exercise = await prisma.exercise.findFirst({
      where: {
        OR: [
          { id: exerciseId },
          ...(!isNaN(numId) && numId > 0 ? [{ orderIndex: numId }] : []),
        ],
      },
      include: {
        lesson: {
          select: {
            id: true,
            module: {
              select: {
                courseId: true,
              },
            },
          },
        },
      },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: 'Exercício não encontrado.' },
        { status: 404 }
      );
    }

    const courseId = exercise.lesson.module.courseId;

    // 4. Execução atômica da mutação via transação Prisma
    const result = await prisma.$transaction(async (tx) => {
      // 4a. Garante existência do CourseProgress de forma atômica e adquire lock pessimista FOR UPDATE para serializar concorrência
      await tx.$executeRaw`
        INSERT INTO "CourseProgress" ("id", "memberId", "courseId", "percentage", "completedLessonsCount", "totalLessonsCount", "enrolledAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${userId}, ${courseId}, 0, 0, ${TOTAL_LESSONS}, NOW(), NOW())
        ON CONFLICT ("memberId", "courseId") DO NOTHING
      `;
      const [lockedProg] = await tx.$queryRaw<Array<{ id: string; lastLessonId: string | null }>>`
        SELECT id, "lastLessonId" FROM "CourseProgress" WHERE "memberId" = ${userId} AND "courseId" = ${courseId} FOR UPDATE
      `;

      // 4b. Upsert atômico do ExerciseProgress
      await tx.exerciseProgress.upsert({
        where: {
          memberId_exerciseId: {
            memberId: userId,
            exerciseId: exercise.id,
          },
        },
        create: {
          memberId: userId,
          exerciseId: exercise.id,
          completed,
          passed: completed,
          submittedAnswer: typeof code === 'string' ? code : null,
          attempts: 1,
          score: completed ? (exercise.points || 10) : 0,
        },
        update: {
          completed,
          passed: completed,
          ...(typeof code === 'string' ? { submittedAnswer: code } : {}),
          score: completed ? (exercise.points || 10) : 0,
          attempts: { increment: 1 },
        },
      });

      // 4c. Busca todas as lições e exercícios concluídos do usuário concorrentemente
      const [completedLessons, completedExercises] = await Promise.all([
        tx.lessonProgress.findMany({
          where: {
            memberId: userId,
            completed: true,
            lesson: {
              module: {
                courseId,
              },
            },
          },
          select: { lessonId: true },
        }),
        tx.exerciseProgress.findMany({
          where: {
            memberId: userId,
            completed: true,
            exercise: {
              lesson: {
                module: {
                  courseId,
                },
              },
            },
          },
          select: { exerciseId: true },
        }),
      ]);

      const completedLessonIds = completedLessons.map((l) => l.lessonId);
      const completedExerciseIds = completedExercises.map((e) => e.exerciseId);

      // 4d. Recalcula o overallPercentage de forma atômica
      const overallPercentage = calculateOverallPercentage(
        completedLessonIds.length,
        completedExerciseIds.length
      );

      const isCourseCompleted = overallPercentage >= 100;

      // 4e. Determina o lastLessonId apropriado a partir do registro travado
      const updatedLastLessonId = lockedProg?.lastLessonId ?? exercise.lesson.id;

      // 4f. Atualiza CourseProgress com o último acesso e percentual recalculado
      await tx.courseProgress.update({
        where: {
          memberId_courseId: {
            memberId: userId,
            courseId,
          },
        },
        data: {
          percentage: overallPercentage,
          completedLessonsCount: completedLessonIds.length,
          lastLessonId: updatedLastLessonId,
          isCompleted: isCourseCompleted,
          completedAt: isCourseCompleted ? new Date() : null,
        },
      });

      return {
        completedExerciseIds,
        completedLessonIds,
        overallPercentage,
      };
    }, { timeout: 30000, maxWait: 15000 });

    // 5. Retorno do estado atualizado conforme contrato
    return NextResponse.json(
      {
        success: true,
        exerciseId: exercise.id,
        completed,
        completedExerciseIds: result.completedExerciseIds,
        overallPercentage: result.overallPercentage,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro em POST /api/progress/exercise:', error);
    return NextResponse.json(
      { error: 'Erro interno ao persistir o progresso do exercício.' },
      { status: 500 }
    );
  }

  });
}

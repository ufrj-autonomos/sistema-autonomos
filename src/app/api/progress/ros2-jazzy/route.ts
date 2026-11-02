// ==============================================================================
// GET /api/progress/ros2-jazzy
// File: src/app/api/progress/ros2-jazzy/route.ts
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getAuthenticatedUserId,
  calculateOverallPercentage,
  TOTAL_LESSONS,
} from '@/lib/progress';

export async function GET(req: NextRequest) {
  try {
    // 1. Autenticação obrigatória (cookie autonomos_session)
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para acessar seu progresso.' },
        { status: 401 }
      );
    }

    // 2. Busca do curso ROS 2 Jazzy no banco de dados
    const course = await prisma.course.findFirst({
      where: {
        OR: [
          { slug: 'ros2-jazzy' },
          { slug: 'ros2-jazzy-iniciantes' },
        ],
      },
      select: { id: true, slug: true },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Curso ROS 2 Jazzy não encontrado no banco de dados.' },
        { status: 404 }
      );
    }

    // 3. Auto-matrícula: verifica se já existe CourseProgress para o usuário
    let courseProgress = await prisma.courseProgress.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: course.id,
        },
      },
    });

    if (!courseProgress) {
      courseProgress = await prisma.courseProgress.create({
        data: {
          userId,
          courseId: course.id,
          percentage: 0.0,
          completedLessonsCount: 0,
          totalLessonsCount: TOTAL_LESSONS,
          isCompleted: false,
          enrolledAt: new Date(),
        },
      });
    }

    // 4. Consulta todas as lições concluídas do usuário neste curso
    const completedLessons = await prisma.lessonProgress.findMany({
      where: {
        userId,
        completed: true,
        lesson: {
          module: {
            courseId: course.id,
          },
        },
      },
      select: {
        lessonId: true,
      },
    });
    const completedLessonIds = completedLessons.map((l) => l.lessonId);

    // 5. Consulta todos os exercícios concluídos do usuário neste curso
    const completedExercises = await prisma.exerciseProgress.findMany({
      where: {
        userId,
        completed: true,
        exercise: {
          lesson: {
            module: {
              courseId: course.id,
            },
          },
        },
      },
      select: {
        exerciseId: true,
      },
    });
    const completedExerciseIds = completedExercises.map((e) => e.exerciseId);

    // 6. Recalcula o percentual geral
    const overallPercentage = calculateOverallPercentage(
      completedLessonIds.length,
      completedExerciseIds.length
    );

    // 7. Sincroniza CourseProgress caso o percentual tenha divergido
    if (courseProgress.percentage !== overallPercentage) {
      const isCompleted = overallPercentage >= 100;
      courseProgress = await prisma.courseProgress.update({
        where: { id: courseProgress.id },
        data: {
          percentage: overallPercentage,
          completedLessonsCount: completedLessonIds.length,
          isCompleted,
          completedAt: isCompleted ? (courseProgress.completedAt ?? new Date()) : null,
        },
      });
    }

    // 8. Resposta formatada conforme contrato
    return NextResponse.json(
      {
        enrolled: true,
        completedLessonIds,
        completedExerciseIds,
        overallPercentage,
        lastAccessedLessonId: courseProgress.lastLessonId ?? null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro em GET /api/progress/ros2-jazzy:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar o progresso do curso.' },
      { status: 500 }
    );
  }
}

// ==============================================================================
// Domain Types & Interfaces: Ensino Subsystem (ROS 2 Jazzy Udemy Course Player)
// Sistema Autônomos — UFRJ Autônomos
// ==============================================================================

export type LessonType = "VIDEO" | "TEXT" | "QUIZ" | "PROJECT";
export type VideoStatus = "AVAILABLE" | "PENDING" | "TEXT_ONLY";
export type ExerciseType = "CODE" | "TASK" | "MULTIPLE_CHOICE";

export interface ExerciseData {
  id: string;
  lessonId: string;
  title: string;
  type: ExerciseType | "code" | "task" | "multiple_choice" | string;
  prompt: string;
  instructions?: string | null;
  starterCode?: string | null;
  initialCode?: string | null;
  solutionCode?: string | null;
  hints?: string | string[] | null;
  options?: string | string[] | null;
  correctOption?: number | null;
  testCasesJson?: string | null;
  points: number;
  difficulty?: "iniciante" | "intermediario" | "avancado";
  orderIndex: number;
  isCompleted?: boolean;
}

export interface LessonData {
  id: string;
  moduleId?: string;
  slug: string;
  title: string;
  orderIndex: number;
  lessonType?: LessonType | string;
  type?: "video" | "text" | "quiz" | "project" | string;
  videoStatus: VideoStatus | "available" | "pending" | "text_only" | string;
  youtubeVideoId?: string | null;
  durationSeconds?: number | null;
  videoDurationSeconds?: number | null;
  summary?: string | null;
  content?: string;
  textContent?: string;
  rosDocsUrl?: string | null;
  codeZipPath?: string | null;
  exercises?: ExerciseData[];
  module?: {
    id: string;
    title: string;
    orderIndex: number;
  };
  isCompleted?: boolean;
}

export interface ModuleData {
  id: string;
  courseId: string;
  slug?: string | null;
  title: string;
  description?: string | null;
  orderIndex: number;
  lessons: LessonData[];
}

export interface CourseData {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description: string;
  coverImage?: string | null;
  badge?: string | null;
  level: string;
  durationHours: number;
  published: boolean;
  orderIndex: number;
  modules: ModuleData[];
}

export interface SurroundingLesson {
  id: string;
  slug: string;
  title: string;
  orderIndex: number;
}

import { requirePageUser } from '@/lib/session';
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ lessonId: string }>;
}

export default async function EnsinoCursoRedirectPage(props: PageProps) {
  await requirePageUser();
  const { lessonId } = await props.params;
  redirect(`/curso/${lessonId}`);
}

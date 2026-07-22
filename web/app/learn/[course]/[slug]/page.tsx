import {notFound} from 'next/navigation';
import {courses, getLesson, courseLessons} from '@/content/courses';
import {readLessonFile} from '@/lib/content';
import LessonView from '@/components/LessonView';

export function generateStaticParams() {
  return courses.flatMap((c) =>
    courseLessons(c).map((l) => ({course: c.slug, slug: l.slug})),
  );
}

export default async function LearnLessonPage({
  params,
}: {
  params: Promise<{course: string; slug: string}>;
}) {
  const {course: courseSlug, slug} = await params;
  const found = getLesson(courseSlug, slug);
  if (!found) notFound();
  const content = readLessonFile(found.course.slug, found.lesson.file);

  return (
    <main className="min-h-screen bg-[#0b0e14] text-slate-100">
      <LessonView
        course={found.course}
        currentSlug={slug}
        mode="member"
        content={content}
        prev={found.prev}
        next={found.next}
      />
    </main>
  );
}

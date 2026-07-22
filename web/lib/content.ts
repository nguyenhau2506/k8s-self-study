import fs from 'node:fs';
import path from 'node:path';

// Read a lesson's markdown from web/content/<course>/<file> (at build time).
export function readLessonFile(courseSlug: string, file: string): string {
  const full = path.join(process.cwd(), 'content', courseSlug, file);
  let raw = fs.readFileSync(full, 'utf8');
  // Strip leading YAML frontmatter if present.
  raw = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  return raw;
}

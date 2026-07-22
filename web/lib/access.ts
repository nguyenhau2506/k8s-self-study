// Access control for the hub.
//   - Public: landing, login, auth callback, course catalog, and any lesson
//     explicitly marked `access: public` (surfaced under /preview or via manifest).
//   - Members: everything else (invite-only).

const PUBLIC_EXACT = new Set<string>(['/']);

const PUBLIC_PREFIXES = [
  '/login',
  '/auth', // magic-link callback
  '/courses', // public catalog (entice new learners)
  '/preview', // public preview lessons
  '/about',
];

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
}

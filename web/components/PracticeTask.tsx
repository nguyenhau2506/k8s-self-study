'use client';

import {useState, type ReactNode} from 'react';

export function Solution({children}: {children: ReactNode}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg bg-gradient-to-r from-[#326ce5] to-[#22d3ee] px-4 py-1.5 text-sm font-bold text-[#06121f]">
        {open ? '🔒 Ẩn lời giải' : '🔑 Xem lời giải'}
      </button>
      {open && (
        <div className="mt-3 rounded-lg border-l-4 border-cyan-500 bg-slate-800/40 p-4">
          {children}
        </div>
      )}
    </div>
  );
}

export function PracticeTask({
  title,
  level = 'CKA',
  time,
  scenario,
  solution,
}: {
  title: string;
  level?: string;
  time?: string;
  scenario: ReactNode;
  solution: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-gradient-to-r from-cyan-500/10 to-transparent px-4 py-3">
        <span
          className={`rounded px-2 py-0.5 text-xs font-bold ${
            level === 'CKS'
              ? 'bg-violet-500/80 text-white'
              : 'bg-cyan-500/80 text-[#06121f]'
          }`}>
          {level}
        </span>
        {time && <span className="font-mono text-xs text-slate-400">⏱ {time}</span>}
        <span className="font-semibold">{title}</span>
      </div>
      <div className="p-4">
        {scenario}
        <Solution>{solution}</Solution>
      </div>
    </div>
  );
}

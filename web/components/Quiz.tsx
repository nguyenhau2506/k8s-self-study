'use client';

import {useCallback, useState} from 'react';

export type QuizQuestion = {
  id: string;
  question: string;
  options: {id: string; text: string}[];
  correct: string[];
  explanation?: string;
};

const letter = (i: number) => String.fromCharCode(65 + i);

function Question({
  q,
  index,
  onResult,
}: {
  q: QuizQuestion;
  index: number;
  onResult: (id: string, correct: boolean | null) => void;
}) {
  const multiple = q.correct.length > 1;
  const [selected, setSelected] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const correctSet = new Set(q.correct);

  const toggle = (optId: string) => {
    if (checked) return;
    setSelected((s) =>
      multiple
        ? s.includes(optId)
          ? s.filter((x) => x !== optId)
          : [...s, optId]
        : [optId],
    );
  };

  const isCorrect =
    selected.length === correctSet.size &&
    selected.every((s) => correctSet.has(s));

  return (
    <div className="mt-6">
      <div className="font-medium">
        <span className="text-cyan-400">Câu {index + 1}.</span> {q.question}
      </div>
      {multiple && (
        <div className="mt-1 text-xs italic text-slate-500">Chọn nhiều đáp án</div>
      )}
      <ul className="mt-2 space-y-2">
        {q.options.map((opt, i) => {
          const sel = selected.includes(opt.id);
          const right = correctSet.has(opt.id);
          let cls =
            'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ';
          if (checked && right) cls += 'border-emerald-600 bg-emerald-500/10';
          else if (checked && sel && !right) cls += 'border-red-600 bg-red-500/10';
          else if (sel) cls += 'border-cyan-500 bg-cyan-500/10';
          else cls += 'border-slate-700 hover:border-cyan-600';
          return (
            <li key={opt.id}>
              <button
                type="button"
                disabled={checked}
                aria-pressed={sel}
                onClick={() => toggle(opt.id)}
                className={cls}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold">
                  {letter(i)}
                </span>
                <span className="flex-1">{opt.text}</span>
                {checked && right && <span>✓</span>}
                {checked && sel && !right && <span>✗</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {!checked ? (
        <button
          type="button"
          disabled={selected.length === 0}
          onClick={() => {
            setChecked(true);
            onResult(q.id, isCorrect);
          }}
          className="mt-3 rounded-lg bg-cyan-500 px-4 py-1.5 text-sm font-semibold text-slate-900 disabled:opacity-50">
          Kiểm tra
        </button>
      ) : (
        <div
          className={`mt-3 rounded-lg border-l-4 p-3 text-sm ${
            isCorrect
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-red-500 bg-red-500/10'
          }`}>
          <strong>{isCorrect ? '✅ Chính xác!' : '❌ Chưa đúng — xem giải thích:'}</strong>
          {q.explanation && <p className="mt-1 text-slate-300">{q.explanation}</p>}
          <button
            type="button"
            onClick={() => {
              setChecked(false);
              setSelected([]);
              onResult(q.id, null);
            }}
            className="mt-2 rounded border border-slate-600 px-2 py-0.5 text-xs">
            ↺ Làm lại
          </button>
        </div>
      )}
    </div>
  );
}

export default function Quiz({
  title,
  questions,
}: {
  title?: string;
  questions: QuizQuestion[];
}) {
  const [results, setResults] = useState<Record<string, boolean>>({});
  const onResult = useCallback((id: string, correct: boolean | null) => {
    setResults((r) => {
      const next = {...r};
      if (correct === null) delete next[id];
      else next[id] = correct;
      return next;
    });
  }, []);

  const answered = Object.keys(results).length;
  const correct = Object.values(results).filter(Boolean).length;
  const pct = answered ? Math.round((correct / answered) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <span className="text-lg font-semibold">📝 {title ?? 'Quiz tự chấm'}</span>
        <span className="text-sm text-slate-400">
          Đúng {correct}/{answered} · {questions.length} câu
          {answered > 0 && <span className="font-semibold text-cyan-400"> ({pct}%)</span>}
        </span>
      </div>
      {questions.map((q, i) => (
        <Question key={q.id} q={q} index={i} onResult={onResult} />
      ))}
    </div>
  );
}

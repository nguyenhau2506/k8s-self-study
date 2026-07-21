import React, {useState, useCallback} from 'react';
import {useAuth} from '@site/src/lib/auth';
import {getSupabase} from '@site/src/lib/supabase';
import styles from './styles.module.css';

const letter = (i) => String.fromCharCode(65 + i);

function Question({q, index, onResult}) {
  const multiple = Array.isArray(q.correct) && q.correct.length > 1;
  const [selected, setSelected] = useState([]);
  const [checked, setChecked] = useState(false);
  const correctSet = new Set(q.correct);

  const toggle = (optId) => {
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

  const check = () => {
    setChecked(true);
    onResult(q.id ?? index, isCorrect);
  };
  const reset = () => {
    setChecked(false);
    setSelected([]);
    onResult(q.id ?? index, null);
  };

  return (
    <div className={styles.question}>
      <div className={styles.qtext}>
        <span className={styles.qnum}>Câu {index + 1}.</span> {q.question}
      </div>
      {multiple && <div className={styles.hint}>Chọn nhiều đáp án</div>}
      <ul className={styles.options}>
        {q.options.map((opt, i) => {
          const sel = selected.includes(opt.id);
          const right = correctSet.has(opt.id);
          const cls = [
            styles.option,
            sel ? styles.selected : '',
            checked && right ? styles.correct : '',
            checked && sel && !right ? styles.wrong : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <li key={opt.id}>
              <button
                type="button"
                className={cls}
                onClick={() => toggle(opt.id)}
                aria-pressed={sel}
                disabled={checked}>
                <span className={styles.letter}>{letter(i)}</span>
                <span className={styles.optText}>{opt.text}</span>
                {checked && right && <span className={styles.mark}>✓</span>}
                {checked && sel && !right && <span className={styles.mark}>✗</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {!checked ? (
        <button
          type="button"
          className={styles.checkBtn}
          onClick={check}
          disabled={selected.length === 0}>
          Kiểm tra
        </button>
      ) : (
        <div className={isCorrect ? styles.resultRight : styles.resultWrong}>
          <strong>
            {isCorrect ? '✅ Chính xác!' : '❌ Chưa đúng — xem giải thích:'}
          </strong>
          {q.explanation && (
            <div className={styles.explanation}>{q.explanation}</div>
          )}
          <button type="button" className={styles.retryBtn} onClick={reset}>
            ↺ Làm lại
          </button>
        </div>
      )}
    </div>
  );
}

export default function Quiz({questions = [], title, quizId}) {
  const {user} = useAuth();
  const qid = quizId || title || 'quiz';
  const [results, setResults] = useState({});
  const onResult = useCallback(
    (id, correct) => {
      setResults((r) => {
        const next = {...r};
        if (correct === null) delete next[id];
        else next[id] = correct;
        return next;
      });
      // Best-effort persist when logged in + configured; never blocks or throws.
      if (correct !== null && user) {
        const sb = getSupabase();
        if (sb) {
          try {
            sb
              .from('quiz_attempts')
              .insert({user_id: user.id, quiz_id: qid, question_id: String(id), correct})
              .then(
                () => {},
                () => {},
              );
          } catch {
            /* ignore */
          }
        }
      }
    },
    [user, qid],
  );

  const answered = Object.keys(results).length;
  const correct = Object.values(results).filter(Boolean).length;
  const total = questions.length;
  const pct = answered ? Math.round((correct / answered) * 100) : 0;

  return (
    <div className={styles.quiz}>
      <div className={styles.header}>
        <span className={styles.title}>📝 {title || 'Quiz tự chấm'}</span>
        <span className={styles.score}>
          Đúng {correct}/{answered} đã làm · {total} câu
          {answered > 0 && <span className={styles.pct}> ({pct}%)</span>}
        </span>
      </div>
      {questions.map((q, i) => (
        <Question key={q.id ?? i} q={q} index={i} onResult={onResult} />
      ))}
    </div>
  );
}

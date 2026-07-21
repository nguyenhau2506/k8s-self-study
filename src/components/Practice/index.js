import React, {useState} from 'react';
import styles from './styles.module.css';

/**
 * Exam-style practical task card (CKA/CKS performance-based format).
 * Scenario/requirement is always visible; the reference solution is
 * hidden behind a "Xem lời giải" reveal so learners attempt it first.
 *
 * Usage (MDX):
 *   <PracticeTask level="CKS" time="~8 phút" title="...">
 *
 *   **Bối cảnh:** ...
 *   **Nhiệm vụ:** ...
 *
 *   <Solution>
 *   ```yaml ...```
 *   **Giải thích:** ...
 *   </Solution>
 *
 *   </PracticeTask>
 */
export function PracticeTask({title, level = 'CKA', time, children}) {
  return (
    <div className={styles.task}>
      <div className={styles.head}>
        <span className={styles.badge} data-level={level}>
          {level}
        </span>
        {time && <span className={styles.time}>⏱ {time}</span>}
        <span className={styles.title}>{title}</span>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}

export function Solution({children, label = 'lời giải tham khảo'}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.solution}>
      <button
        type="button"
        className={styles.revealBtn}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}>
        {open ? '🔒 Ẩn lời giải' : `🔑 Xem ${label}`}
      </button>
      {open && <div className={styles.solutionBody}>{children}</div>}
    </div>
  );
}

export default PracticeTask;

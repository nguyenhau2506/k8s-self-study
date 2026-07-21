import React, {useState} from 'react';
import {useAuth} from '@site/src/lib/auth';
import styles from './styles.module.css';

// Navbar auth control. Registered as navbar item type "custom-authButton".
export default function AuthButton() {
  const {configured, user, signInWithEmail, signInWithGitHub, signOut} = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  if (!configured) {
    return (
      <button
        className={styles.btn}
        type="button"
        disabled
        title="Đăng nhập chưa được cấu hình (xem SUPABASE_SETUP.md)">
        Đăng nhập
      </button>
    );
  }

  if (user) {
    return (
      <div className={styles.wrap}>
        <button className={styles.btn} type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          👤 {user.email?.split('@')[0] || 'Tài khoản'}
        </button>
        {open && (
          <div className={styles.panel}>
            <div className={styles.email}>{user.email}</div>
            <button
              className={styles.ghost}
              type="button"
              onClick={() => {
                signOut();
                setOpen(false);
              }}>
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    );
  }

  const sendMagic = async (e) => {
    e.preventDefault();
    setMsg('Đang gửi…');
    const {error} = await signInWithEmail(email);
    setMsg(error ? 'Có lỗi, thử lại sau.' : '✅ Đã gửi link đăng nhập tới email của bạn!');
  };

  return (
    <div className={styles.wrap}>
      <button className={styles.btn} type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Đăng nhập
      </button>
      {open && (
        <div className={styles.panel}>
          <form onSubmit={sendMagic}>
            <input
              className={styles.input}
              type="email"
              required
              placeholder="email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className={styles.primary} type="submit">
              Gửi magic link
            </button>
          </form>
          <div className={styles.or}>— hoặc —</div>
          <button className={styles.ghost} type="button" onClick={() => signInWithGitHub()}>
            Đăng nhập với GitHub
          </button>
          {msg && <div className={styles.msg}>{msg}</div>}
        </div>
      )}
    </div>
  );
}

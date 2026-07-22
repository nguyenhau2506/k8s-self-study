import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import TopBar from '@/components/TopBar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Orbit — Self-study hub',
  description:
    'Học theo lộ trình, tiếng Việt. Bắt đầu với Kubernetes (CKA → CKS) — lý thuyết, ví dụ YAML, quiz và bài tập hands-on.',
};

export default function RootLayout({
  children,
}: Readonly<{children: React.ReactNode}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-[#0b0e14]">
        <TopBar />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}

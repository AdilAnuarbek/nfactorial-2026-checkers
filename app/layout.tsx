import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Providers from '@/components/Providers';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'Шашки Pro - Современная платформа для игры в шашки',
  description: 'Играйте в шашки онлайн с умным ИИ или с другом. Три уровня сложности, красивый интерфейс, полная реализация правил.',
  keywords: 'шашки, шашки онлайн, игра в шашки, AI шашки, шашки против компьютера',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="h-full" data-theme="dark" suppressHydrationWarning>
      <body className={`${inter.className} h-full min-h-0`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/lib/auth/authContext';
import { DataStoreProvider } from '@/lib/data/store';

export const metadata: Metadata = {
  title: 'BALE | Billing & Advance Ledger Engine — Asinta Architects',
  description:
    'Lightweight AI-integrated service and ledger management platform for Asinta Architects (Batangas, Philippines). Built for project billing, expenses, attendance, and worker advances.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-surface text-ink-primary antialiased min-h-screen">
        <ToastProvider>
          <AuthProvider>
            <DataStoreProvider>{children}</DataStoreProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

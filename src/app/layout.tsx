
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import { Toaster as SonnerToaster } from 'sonner';
import { UserProvider } from '@/contexts/UserContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'RiskNav - CCG Risk Assessment',
  description: 'Track and approve risk assessments for the Canadian Coast Guard.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        <LanguageProvider>
          <UserProvider>
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8 md:px-6">
              {children}
            </main>
            <SonnerToaster richColors closeButton />
          </UserProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

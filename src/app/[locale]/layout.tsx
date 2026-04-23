import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { Header } from "@/components/Header";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, Locale } from '@/i18n/request';
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { NotificationProvider } from "@/components/providers/NotificationProvider";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DropQueue - Streamer Music Platform",
  description: "Real-time music queue for Twitch streamers and viewers",
};

import { Toaster } from "sonner";
import { FlightRecorder } from "@/components/debug/FlightRecorder";

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col antialiased" suppressHydrationWarning>

        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <NotificationProvider>
                <SessionProvider>
                  <FlightRecorder />
                  <Header />
                  <main className="flex-1 flex flex-col">{children}</main>
                  <Toaster position="top-right" richColors closeButton />
                </SessionProvider>
            </NotificationProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>

    </html>
  );
}

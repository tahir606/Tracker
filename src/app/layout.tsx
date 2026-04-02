import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { Toaster } from "sonner";
import { Header } from "@/components/layout/header";
import "./globals.css";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Media Tracker",
  description: "Track your anime, manga, TV shows, and movies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={lato.variable}>
      <body className="antialiased">
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}

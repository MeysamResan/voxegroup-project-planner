import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import "../components/ui/primitives.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Project Planner",
  description: "Session-only project planning, pricing, and delivery analytics for Voxe Group.",
  manifest: "/manifest.webmanifest",
  applicationName: "Project Planner",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2eff7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0712" },
  ],
  appleWebApp: {
    capable: true,
    title: "Project Planner",
    statusBarStyle: "black-translucent",
  },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ServiceWorkerRegister } from "@/shared/presentation/components/ServiceWorkerRegister";
import "./globals.css";
import "./discovery.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Nestora",
  description: "Ton prochain chapitre commence ici.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nestora",
  },
};

export const viewport: Viewport = {
  themeColor: "#103f54",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#d9e1df]">{children}<ServiceWorkerRegister /></body>
    </html>
  );
}

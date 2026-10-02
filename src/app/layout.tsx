import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SAWALA DESA",
  description: "Pelayanan dan informasi desa dalam satu ruang digital.",
  icons: {
    icon: "/logo-sawala.svg",
    apple: "/logo-sawala.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${inter.variable} ${lora.variable} font-[var(--font-inter)] antialiased`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

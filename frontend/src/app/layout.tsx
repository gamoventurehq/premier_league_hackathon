import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Premier League Studio: Synthetic Match Insights Engine",
  description: "Real-time explainable football match intelligence, pitch space analytics, and personalized broadcast overlays powered by Microsoft Azure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#070a13] text-slate-100 antialiased selection:bg-cyan-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

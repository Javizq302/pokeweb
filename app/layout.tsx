import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "PokéWeb",
  description: "Competitive Pokémon team manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistMono.variable} font-mono antialiased bg-black text-white min-h-screen`}>
        <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight hover:text-white/80 transition-colors">
            POKEWEB
          </Link>
          <div className="flex gap-6 text-sm">
            <Link href="/equipos" className="hover:text-white/80 transition-colors">
              Teams
            </Link>
            <Link href="/calculadora" className="hover:text-white/80 transition-colors">
              Calculator
            </Link>
          </div>
        </nav>
        <main className="px-6 py-8 max-w-5xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}

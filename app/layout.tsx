import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/src/components/Authentication/authgaurd";



const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chartsign Ltd",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
      <AuthGuard>
        {children}
        </AuthGuard>
      </body>
    </html>
  );
}

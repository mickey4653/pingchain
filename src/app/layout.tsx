import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from "@/components/ui/toaster"
import { ClerkFirebaseSync } from '@/components/ClerkFirebaseSync'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PingChain - Never leave important conversations hanging",
  description: "A smart communication assistant that helps you maintain meaningful connections and never forget to respond.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <ClerkFirebaseSync />
          <Navigation />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}

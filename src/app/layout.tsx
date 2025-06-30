import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from "@/components/ui/toaster"
import { ClerkFirebaseSync } from '@/components/ClerkFirebaseSync'
import { PWARegistration } from '@/components/PWARegistration'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PingChain - Never leave important conversations hanging",
  description: "A smart communication assistant that helps you maintain meaningful connections and never forget to respond.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PingChain"
  },
  icons: {
    icon: [
      { url: "/pingchain-android-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/pingchain-android-512x512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" }
    ]
  }
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
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
          <PWARegistration />
        </body>
      </html>
    </ClerkProvider>
  );
}

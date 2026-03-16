import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "EduSaaS - Multi-Tenant AI WhatsApp CRM for Schools",
  description: "Complete Student Management, Attendance Tracking & AI-Powered WhatsApp CRM for Schools. Multi-tenant SaaS with French/English support.",
  keywords: ["EduSaaS", "WhatsApp CRM", "Student Management", "Attendance", "Schools", "Morocco", "Education", "AI"],
  authors: [{ name: "EduSaaS Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "EduSaaS - AI WhatsApp CRM for Schools",
    description: "Complete Student Management & AI-Powered WhatsApp CRM for Schools",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EduSaaS - AI WhatsApp CRM for Schools",
    description: "Complete Student Management & AI-Powered WhatsApp CRM for Schools",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Puter.js - Free serverless cloud and AI directly in frontend */}
        <script src="https://js.puter.com/v2/" async></script>
      </head>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
// Force redeploy at Mon Mar 16 15:32:16 EDT 2026

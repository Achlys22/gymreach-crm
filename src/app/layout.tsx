import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GymReach — UK Gym Outreach CRM",
  description:
    "Cold outreach pipeline for UK MMA, Muay Thai & Boxing gyms. Track 1,800+ Instagram leads from first contact to won client.",
  keywords: [
    "gym outreach",
    "MMA gyms UK",
    "Muay Thai UK",
    "boxing gyms UK",
    "Instagram leads",
    "cold outreach",
    "CRM",
    "gym marketing",
  ],
  authors: [{ name: "GymReach" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "GymReach — UK Gym Outreach CRM",
    description:
      "Cold outreach pipeline for UK MMA, Muay Thai & Boxing gyms. 1,800+ Instagram leads.",
    siteName: "GymReach",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "GymReach — UK Gym Outreach CRM",
    description:
      "Cold outreach pipeline for UK MMA, Muay Thai & Boxing gyms.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

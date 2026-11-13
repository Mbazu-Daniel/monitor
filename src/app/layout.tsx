import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";

// Self-hosted fonts — build must not depend on Google Fonts being reachable.
const hanken = localFont({
  src: "./fonts/hanken-latin-100900.woff2",
  variable: "--font-hanken",
  weight: "100 900",
  display: "swap",
});

const familjen = localFont({
  src: "./fonts/familjen-latin-400700.woff2",
  variable: "--font-familjen",
  weight: "400 700",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin-100900.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FixCampus — University Maintenance Service System",
  description:
    "Digital platform for campus maintenance: submit service requests for electricity, plumbing, furniture, internet and hostel issues; officers track and resolve; administrators manage and report.",
  keywords: ["maintenance", "service request", "university", "campus", "facility management"],
  authors: [{ name: "FixCampus" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#E14A2B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${hanken.variable} ${familjen.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-right" closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}

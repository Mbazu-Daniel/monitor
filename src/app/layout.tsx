import type { Metadata, Viewport } from "next";
import { Familjen_Grotesk, Hanken_Grotesk, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const familjen = Familjen_Grotesk({
  variable: "--font-familjen",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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

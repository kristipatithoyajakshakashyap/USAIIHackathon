import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "PREVAIL - Multimodal Aggression Escalation Intelligence",
  description: "Predictive Violence & Aggression Escalation Intelligence Layer - Proactive Risk Estimation Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100 antialiased selection:bg-cyan-500/30 font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative min-h-screen flex flex-col lg:flex-row hud-grid overflow-x-hidden">
            {/* Sidebar Navigation */}
            <Sidebar />
            
            {/* Main Content Workspace */}
            <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
              {children}
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

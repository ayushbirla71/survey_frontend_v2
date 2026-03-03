import type React from "react";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/app-layout";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ToastContainer } from "react-toastify";
import Providers from "./providers";

export const metadata = {
  title: "Survey.AI - Survey Generation Platform",
  description: "Generate and manage surveys with AI",
  keywords: ["nextjs", "seo", "metadata"],
  generator: "v0.dev",
  icons: {
    icon: "./demokrito-logo.png",
    shortcut: "./demokrito-logo.png",
    apple: "./demokrito-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <AuthProvider>
              <AppLayout>
                <Providers>{children}</Providers>
              </AppLayout>
            </AuthProvider>
          </ErrorBoundary>
          <ToastContainer />
        </ThemeProvider>
      </body>
    </html>
  );
}

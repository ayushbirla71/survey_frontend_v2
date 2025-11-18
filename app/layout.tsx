import type React from "react";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/app-layout";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ToastContainer } from "react-toastify";

export const metadata = {
  title: "Survey.AI - Survey Generation Platform",
  description: "Generate and manage surveys with AI",
  generator: "v0.dev",
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
                {children}
                <ToastContainer />
              </AppLayout>
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}

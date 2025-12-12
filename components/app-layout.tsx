"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Routes that don't need the sidebar (auth pages)
  const authRoutes = ["/auth/login", "/auth/admin-signup"];
  const authRoutesPrefixes = ["/survey/", "/survey-results/"];
  const isAuthRoute =
    authRoutes.includes(pathname) ||
    authRoutesPrefixes.some((prefix) => pathname.startsWith(prefix));

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth pages layout (no sidebar)
  if (isAuthRoute) {
    return <>{children}</>;
  }

  // Main app layout (with sidebar for authenticated users)
  if (user) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    );
  }

  // Fallback - should not reach here due to AuthProvider redirects
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Access Denied
        </h1>
        <p className="text-slate-600">Please log in to access this page.</p>
      </div>
    </div>
  );
}

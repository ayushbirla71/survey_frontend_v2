"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authApi, type User } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: {
    name: string;
    email: string;
    mobile_no?: string;
    password: string;
    role?: "USER" | "SYSTEM_ADMIN";
    theme?: "LIGHT" | "DARK";
  }) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Public routes that don't require authentication
  const publicRoutes = ["/auth/login", "/auth/signup", "/survey/[id]"];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    // Check if user is already logged in
    const initializeAuth = async () => {
      try {
        const token = authApi.isAuthenticated();
        const savedUser = localStorage.getItem("user");

        if (token && savedUser) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
        } else {
          // Clear any stale data
          authApi.removeAuthToken();
          localStorage.removeItem("user");

          // Redirect to login if on protected route
          if (!isPublicRoute) {
            router.push("/auth/login");
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        authApi.removeAuthToken();
        localStorage.removeItem("user");

        if (!isPublicRoute) {
          router.push("/auth/login");
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [router, isPublicRoute]);

  // Redirect authenticated users away from auth pages
  useEffect(() => {
    if (!loading && user && isPublicRoute) {
      router.push("/");
    }
  }, [user, loading, isPublicRoute, router]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await authApi.login({ email, password });

      if (response.data) {
        const { user: userData, token } = response.data;

        // Store token and user data
        authApi.setAuthToken(token);
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);

        return true;
      } else {
        throw new Error(response.error || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData: {
    name: string;
    email: string;
    mobile_no?: string;
    password: string;
    role?: "USER" | "SYSTEM_ADMIN";
    theme?: "LIGHT" | "DARK";
  }): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await authApi.signup(userData);

      if (response.data) {
        const { user: newUser, token } = response.data;

        // Store token and user data
        authApi.setAuthToken(token);
        localStorage.setItem("user", JSON.stringify(newUser));
        setUser(newUser);

        return true;
      } else {
        throw new Error(response.error || "Signup failed");
      }
    } catch (error) {
      console.error("Signup error:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Clear auth data
    authApi.removeAuthToken();
    localStorage.removeItem("user");
    setUser(null);

    // Redirect to login
    router.push("/auth/login");
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
  };

  // Show loading spinner while checking auth
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

  // Don't render protected content if user is not authenticated
  if (!user && !isPublicRoute) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

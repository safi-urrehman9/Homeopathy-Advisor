"use client";

import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api/endpoints";
import { ApiError, getStoredAuthToken, setStoredAuthToken } from "@/lib/api/client";
import type { DoctorSession } from "@/lib/api/types";

interface AuthContextValue {
  user: DoctorSession | null;
  isReady: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getAuthErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "invalid_credentials") {
      return "Invalid email or password.";
    }

    if (error.code === "doctor_exists") {
      return "An account with this email already exists.";
    }
  }

  return error instanceof Error ? error.message : "Authentication failed.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<DoctorSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let ignore = false;

    const bootstrap = async () => {
      const token = getStoredAuthToken();
      if (!token) {
        if (!ignore) {
          setUser(null);
          setIsReady(true);
        }
        return;
      }

      try {
        const doctor = await api.me();
        if (!ignore) {
          setUser(doctor);
        }
      } catch (error) {
        console.error("Session restore failed", getAuthErrorMessage(error));
        setStoredAuthToken(null);
        if (!ignore) {
          setUser(null);
        }
      } finally {
        if (!ignore) {
          setIsReady(true);
        }
      }
    };

    void bootstrap();

    return () => {
      ignore = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      login: async ({ email, password }) => {
        const session = await api.login({ email, password });
        setStoredAuthToken(session.token);
        setUser(session.doctor);
        await queryClient.invalidateQueries();
      },
      register: async ({ name, email, password }) => {
        const session = await api.register({ name, email, password });
        setStoredAuthToken(session.token);
        setUser(session.doctor);
        await queryClient.invalidateQueries();
      },
      logout: async () => {
        setStoredAuthToken(null);
        setUser(null);
        queryClient.clear();
      },
    }),
    [isReady, queryClient, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}

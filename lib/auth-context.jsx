"use client";

/* eslint-disable react-hooks/set-state-in-effect -- read persisted session on mount */
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "eventflow-auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    try {
      setAuthenticated(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setAuthenticated(false);
    }
    setReady(true);
  }, []);

  const login = useCallback((username, password) => {
    const u = username.trim().toLowerCase();
    if (u === "urri" && password === "123") {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
      setAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ ready, isAuthenticated, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

"use client";

/* eslint-disable react-hooks/set-state-in-effect -- hydrate lists from storage when auth is ready */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { mockEvents } from "@/lib/mockEvents";
import { useAuth } from "@/lib/auth-context";

const USER_EVENTS_KEY = "eventflow-user-events";
const DEMO_REMOVED_KEY = "eventflow-demo-removed";

const EventsContext = createContext(null);

export function EventsProvider({ children }) {
  const { isAuthenticated, ready: authReady } = useAuth();
  const [userEvents, setUserEvents] = useState([]);
  const [demoRemovedIds, setDemoRemovedIds] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (isAuthenticated) {
      try {
        const raw = localStorage.getItem(USER_EVENTS_KEY);
        setUserEvents(raw ? JSON.parse(raw) : []);
      } catch {
        setUserEvents([]);
      }
    } else {
      setUserEvents([]);
      try {
        const raw = sessionStorage.getItem(DEMO_REMOVED_KEY);
        setDemoRemovedIds(raw ? JSON.parse(raw) : []);
      } catch {
        setDemoRemovedIds([]);
      }
    }
    setHydrated(true);
  }, [authReady, isAuthenticated]);

  useEffect(() => {
    if (!authReady || !isAuthenticated) return;
    try {
      localStorage.setItem(USER_EVENTS_KEY, JSON.stringify(userEvents));
    } catch {
      /* ignore */
    }
  }, [authReady, isAuthenticated, userEvents]);

  const ready = authReady && hydrated;

  const events = useMemo(() => {
    if (!ready) return [];
    if (isAuthenticated) return userEvents;
    return mockEvents.filter((e) => !demoRemovedIds.includes(e.id));
  }, [ready, isAuthenticated, userEvents, demoRemovedIds]);

  const removeEvent = useCallback(
    (id) => {
      if (isAuthenticated) {
        setUserEvents((prev) => prev.filter((e) => e.id !== id));
      } else {
        setDemoRemovedIds((prev) => {
          const next = prev.includes(id) ? prev : [...prev, id];
          try {
            sessionStorage.setItem(DEMO_REMOVED_KEY, JSON.stringify(next));
          } catch {
            /* ignore */
          }
          return next;
        });
      }
    },
    [isAuthenticated],
  );

  const addEvent = useCallback((event) => {
    const id = `evt-${Date.now()}`;
    setUserEvents((prev) => [
      ...prev,
      {
        ...event,
        id,
        registered: 0,
        status: "upcoming",
      },
    ]);
  }, []);

  const resolveEvent = useCallback(
    (id) => {
      const user = userEvents.find((e) => e.id === id);
      if (user) return user;
      if (isAuthenticated) return null;
      const m = mockEvents.find((e) => e.id === id);
      if (m && !demoRemovedIds.includes(id)) return m;
      return null;
    },
    [userEvents, isAuthenticated, demoRemovedIds],
  );

  return (
    <EventsContext.Provider value={{ events, removeEvent, addEvent, resolveEvent, ready }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error("useEvents must be used within EventsProvider");
  return ctx;
}

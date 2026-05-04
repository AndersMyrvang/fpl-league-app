"use client";
import { createContext, useContext, useEffect, useState } from "react";

type ThemeKey = "slate" | "blue" | "green";

const ThemeContext = createContext<{
  theme: ThemeKey;
  setTheme: (t: ThemeKey) => void;
}>({ theme: "slate", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>("slate");

  useEffect(() => {
    const stored = localStorage.getItem("fpl-theme") as ThemeKey | null;
    if (stored && ["slate", "blue", "green"].includes(stored)) setThemeState(stored);
  }, []);

  const setTheme = (t: ThemeKey) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("fpl-theme", t);
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

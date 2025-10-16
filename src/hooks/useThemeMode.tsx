import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "auto";

export const useThemeMode = () => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem("theme-mode");
    return (stored as ThemeMode) || "auto";
  });

  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const root = document.documentElement;
    
    // Determina o tema efetivo
    let theme: "light" | "dark";
    
    if (themeMode === "auto") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      theme = prefersDark ? "dark" : "light";
    } else {
      theme = themeMode;
    }

    setEffectiveTheme(theme);
    root.setAttribute("data-theme", theme);
    
    // Salvar preferência
    localStorage.setItem("theme-mode", themeMode);
  }, [themeMode]);

  // Listener para mudanças de preferência do sistema
  useEffect(() => {
    if (themeMode !== "auto") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const theme = e.matches ? "dark" : "light";
      setEffectiveTheme(theme);
      document.documentElement.setAttribute("data-theme", theme);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themeMode]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const toggleTheme = () => {
    if (effectiveTheme === "light") {
      setThemeMode("dark");
    } else {
      setThemeMode("light");
    }
  };

  return {
    themeMode,
    effectiveTheme,
    setThemeMode,
    toggleTheme,
  };
};

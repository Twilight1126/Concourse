import { Moon, Sun } from "@phosphor-icons/react";
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "concourse:theme";

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, toggle: () => setTheme((current) => current === "dark" ? "light" : "dark") }}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle({ className = "" }) {
  const { theme, toggle } = useContext(ThemeContext);
  return <button className={`theme-toggle ${className}`} type="button" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
    {theme === "dark" ? <Sun size={19} weight="duotone" aria-hidden="true" /> : <Moon size={19} weight="duotone" aria-hidden="true" />}
    <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
  </button>;
}

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

// The inline script in index.html already applied the right class before
// paint (avoiding a flash of the wrong theme) — this just mirrors that
// choice into React state so a toggle control can read/change it.
export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme: () => setIsDark((prev) => !prev) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

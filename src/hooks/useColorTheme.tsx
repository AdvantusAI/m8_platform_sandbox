import { createContext, useContext, useEffect, useState } from "react";

type ColorTheme = "purple" | "orange" | "blue" | "black";

interface ColorThemeContextType {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
}

const ColorThemeContext = createContext<ColorThemeContextType | undefined>(undefined);

const colorThemes: Record<ColorTheme, { primary: string; accent: string; ring: string; gradient: string }> = {
  purple: {
    primary: "262 84% 58%",
    accent: "262 84% 58%", 
    ring: "262 84% 58%",
    gradient: "linear-gradient(135deg, hsl(262 84% 58%), hsl(283 84% 60%))"
  },
  orange: {
    primary: "20 94% 60%",
    accent: "20 94% 60%",
    ring: "20 94% 60%",
    gradient: "linear-gradient(135deg, hsl(20 94% 60%), hsl(30 94% 65%))"
  },
  blue: {
    primary: "217 91% 60%",
    accent: "217 91% 60%",
    ring: "217 91% 60%",
    gradient: "linear-gradient(135deg, hsl(217 91% 60%), hsl(230 91% 65%))"
  },
  black: {
    primary: "0 0% 9%",
    accent: "0 0% 9%",
    ring: "0 0% 9%",
    gradient: "linear-gradient(135deg, hsl(0 0% 9%), hsl(0 0% 20%))"
  }
};

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    const stored = localStorage.getItem("color-theme");
    return (stored as ColorTheme) || "purple";
  });

  useEffect(() => {
    const root = document.documentElement;
    const theme = colorThemes[colorTheme];
    
    root.style.setProperty("--primary", theme.primary);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--ring", theme.ring);
    root.style.setProperty("--gradient-primary", theme.gradient);
    root.style.setProperty("--gradient-accent", theme.gradient);
    
    localStorage.setItem("color-theme", colorTheme);
  }, [colorTheme]);

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export function useColorTheme() {
  const context = useContext(ColorThemeContext);
  if (context === undefined) {
    throw new Error("useColorTheme must be used within a ColorThemeProvider");
  }
  return context;
}
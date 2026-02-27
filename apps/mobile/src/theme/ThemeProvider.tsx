import { createContext, PropsWithChildren, useCallback, useContext, useState } from "react";
import { Appearance } from "react-native";

import { tokens } from "./tokens";

type ColorScheme = "dark" | "light";

interface ThemeContextValue {
  colors: typeof tokens.colors;
  providerColors: typeof tokens.providerColors;
  spacing: typeof tokens.spacing;
  typography: typeof tokens.typography;
  radius: typeof tokens.radius;
  shadow: typeof tokens.shadow;
  icon: typeof tokens.icon;
  colorScheme: ColorScheme;
  toggleColorScheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: tokens.colors,
  providerColors: tokens.providerColors,
  spacing: tokens.spacing,
  typography: tokens.typography,
  radius: tokens.radius,
  shadow: tokens.shadow,
  icon: tokens.icon,
  colorScheme: "dark",
  toggleColorScheme: () => {}
});

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = Appearance.getColorScheme() ?? "dark";
  const [colorScheme, setColorScheme] = useState<ColorScheme>(systemScheme);

  const toggleColorScheme = useCallback(() => {
    setColorScheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const colors = colorScheme === "dark" ? tokens.darkColors : tokens.lightColors;

  return (
    <ThemeContext.Provider
      value={{
        colors,
        providerColors: tokens.providerColors,
        spacing: tokens.spacing,
        typography: tokens.typography,
        radius: tokens.radius,
        shadow: tokens.shadow,
        icon: tokens.icon,
        colorScheme,
        toggleColorScheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

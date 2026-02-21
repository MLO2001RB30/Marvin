import { createContext, PropsWithChildren, useContext } from "react";

import { tokens } from "./tokens";

interface ThemeContextValue {
  colors: typeof tokens.colors;
  spacing: typeof tokens.spacing;
  typography: typeof tokens.typography;
  radius: typeof tokens.radius;
  icon: typeof tokens.icon;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: tokens.colors,
  spacing: tokens.spacing,
  typography: tokens.typography,
  radius: tokens.radius,
  icon: tokens.icon
});

export function ThemeProvider({ children }: PropsWithChildren) {
  return (
    <ThemeContext.Provider
      value={{
        colors: tokens.colors,
        spacing: tokens.spacing,
        typography: tokens.typography,
        radius: tokens.radius,
        icon: tokens.icon
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

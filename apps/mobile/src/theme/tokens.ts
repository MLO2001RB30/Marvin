const darkColors = {
  bgPage: "#1A1A1C",
  bgSurface: "#242426",
  bgSurfaceAlt: "#1F1F21",
  border: "#3A3A3C",
  accentGold: "#C9A962",
  accentGoldTint: "#C9A96240",
  textPrimary: "#FFFFFF",
  textSecondary: "#9A9A9C",
  textTertiary: "#6E6E70",
  success: "#4ADE80",
  info: "#60A5FA",
  danger: "#F87171"
};

const lightColors: typeof darkColors = {
  bgPage: "#F5F5F7",
  bgSurface: "#FFFFFF",
  bgSurfaceAlt: "#FAFAFA",
  border: "#E0E0E2",
  accentGold: "#9E7C2E",
  accentGoldTint: "#9E7C2E18",
  textPrimary: "#1A1A1C",
  textSecondary: "#6E6E70",
  textTertiary: "#9A9A9C",
  success: "#16A34A",
  info: "#2563EB",
  danger: "#DC2626"
};

const providerColors = {
  slack: "#4A154B",
  gmail: "#EA4335",
  google_drive: "#1A73E8",
  google_calendar: "#4285F4",
  onedrive: "#0078D4",
  dropbox: "#0061FF",
  healthkit: "#FF2D55",
  weatherkit: "#5AC8FA",
  linear: "#5E6AD2"
};

export const tokens = {
  colors: darkColors,
  lightColors,
  darkColors,
  providerColors,
  typography: {
    serif: "Georgia",
    sans: "System",
    sizes: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 22,
      xxl: 32,
      hero: 40
    },
    weights: {
      regular: "400" as const,
      medium: "500" as const,
      semibold: "600" as const,
      bold: "700" as const
    },
    letterSpacing: {
      tight: -0.5,
      normal: 0,
      wide: 0.5
    }
  },
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    card: 20,
    lg: 24,
    xl: 32,
    section: 40
  },
  radius: {
    none: 0,
    card: 20,
    pill: 34
  },
  icon: {
    sm: 14,
    md: 18,
    lg: 22
  }
};

export type AppTokens = typeof tokens;

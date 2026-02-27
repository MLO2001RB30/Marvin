const darkColors = {
  bgPage: "#111113",
  bgSurface: "#1C1C1E",
  bgSurfaceAlt: "#161618",
  bgElevated: "#252528",
  border: "#2C2C2E",
  borderSubtle: "#232325",
  accentGold: "#D4AF5A",
  accentGoldTint: "rgba(212,175,90,0.12)",
  accentGoldMuted: "rgba(212,175,90,0.06)",
  textPrimary: "#F5F5F7",
  textSecondary: "#8E8E93",
  textTertiary: "#636366",
  success: "#34D399",
  successTint: "rgba(52,211,153,0.1)",
  info: "#60A5FA",
  infoTint: "rgba(96,165,250,0.1)",
  danger: "#FB7185",
  dangerTint: "rgba(251,113,133,0.1)"
};

const lightColors: typeof darkColors = {
  bgPage: "#F8F8FA",
  bgSurface: "#FFFFFF",
  bgSurfaceAlt: "#F3F3F5",
  bgElevated: "#FFFFFF",
  border: "#E8E8EC",
  borderSubtle: "#F0F0F2",
  accentGold: "#B8913A",
  accentGoldTint: "rgba(184,145,58,0.10)",
  accentGoldMuted: "rgba(184,145,58,0.04)",
  textPrimary: "#1A1A1E",
  textSecondary: "#6B6B73",
  textTertiary: "#A0A0A8",
  success: "#059669",
  successTint: "rgba(5,150,105,0.08)",
  info: "#2563EB",
  infoTint: "rgba(37,99,235,0.08)",
  danger: "#E11D48",
  dangerTint: "rgba(225,29,72,0.08)"
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
      xs: 11,
      sm: 13,
      md: 15,
      lg: 17,
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
    sm: 8,
    md: 12,
    card: 16,
    lg: 20,
    pill: 999
  },
  shadow: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 6
    }
  },
  icon: {
    sm: 14,
    md: 18,
    lg: 22
  }
};

export type AppTokens = typeof tokens;

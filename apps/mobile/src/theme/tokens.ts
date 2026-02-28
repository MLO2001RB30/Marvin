const darkColors = {
  bgPage: "#191919",
  bgSurface: "#202020",
  bgSurfaceAlt: "#252525",
  bgElevated: "#2C2C2C",
  border: "rgba(255,255,255,0.06)",
  borderSubtle: "rgba(255,255,255,0.03)",
  accentGold: "#FFA344",
  accentGoldTint: "rgba(255,163,68,0.12)",
  accentGoldMuted: "rgba(255,163,68,0.06)",
  textPrimary: "#EBEBEB",
  textSecondary: "#9B9A97",
  textTertiary: "#5A5A5A",
  success: "#4DAB9A",
  successTint: "rgba(77,171,154,0.12)",
  info: "#529CCA",
  infoTint: "rgba(82,156,202,0.12)",
  danger: "#FF7369",
  dangerTint: "rgba(255,115,105,0.12)"
};

const lightColors: typeof darkColors = {
  bgPage: "#FFFFFF",
  bgSurface: "#FFFFFF",
  bgSurfaceAlt: "#F7F6F3",
  bgElevated: "#FFFFFF",
  border: "rgba(0,0,0,0.06)",
  borderSubtle: "rgba(0,0,0,0.03)",
  accentGold: "#D97706",
  accentGoldTint: "rgba(217,119,6,0.08)",
  accentGoldMuted: "rgba(217,119,6,0.04)",
  textPrimary: "#37352F",
  textSecondary: "#787774",
  textTertiary: "#B4B4B0",
  success: "#0F7B6C",
  successTint: "rgba(15,123,108,0.08)",
  info: "#2563EB",
  infoTint: "rgba(37,99,235,0.08)",
  danger: "#E03E3E",
  dangerTint: "rgba(224,62,62,0.08)"
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
    sans: "Inter, -apple-system, system-ui, sans-serif",
    sizes: {
      xs: 11,
      sm: 13,
      md: 15,
      lg: 17,
      xl: 24,
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
      tight: -0.3,
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
    section: 48
  },
  radius: {
    sm: 4,
    md: 8,
    card: 12,
    lg: 16,
    pill: 999
  },
  shadow: {
    sm: {},
    md: {},
    lg: {}
  },
  icon: {
    sm: 16,
    md: 20,
    lg: 24
  }
};

export type AppTokens = typeof tokens;

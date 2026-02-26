import { Text, View } from "react-native";

import type { IntegrationProvider } from "@pia/shared";

import { useTheme } from "../theme/ThemeProvider";

const AVATAR_COLORS = [
  "#E57373", "#F06292", "#BA68C8", "#9575CD",
  "#7986CB", "#64B5F6", "#4FC3F7", "#4DD0E1",
  "#4DB6AC", "#81C784", "#AED581", "#FFD54F",
  "#FFB74D", "#FF8A65", "#A1887F", "#90A4AE"
];

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const cleaned = name.replace(/<[^>]+>/g, "").replace(/[^\w\s@.]/g, "").trim();
  if (cleaned.includes("@")) {
    return cleaned[0].toUpperCase();
  }
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

export function SenderAvatar({
  sender,
  provider,
  size = 28
}: {
  sender?: string | null;
  provider: IntegrationProvider;
  size?: number;
}) {
  const { providerColors } = useTheme();
  const displayName = sender ?? provider;
  const initial = getInitials(displayName);
  const bgColor = sender ? getColorForName(sender) : (providerColors[provider] ?? "#666");

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bgColor,
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Text style={{ color: "#FFFFFF", fontSize: size * 0.4, fontWeight: "700" }}>
        {initial}
      </Text>
    </View>
  );
}

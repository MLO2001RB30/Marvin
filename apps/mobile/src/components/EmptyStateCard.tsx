import { Pressable, Text, View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";

interface EmptyAction {
  label: string;
  onPress: () => void;
}

export function EmptyStateCard({
  title,
  body,
  actions
}: {
  title: string;
  body: string;
  actions?: EmptyAction[];
}) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: spacing.md,
        gap: spacing.sm,
        backgroundColor: colors.bgSurface
      }}
    >
      <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.md }}>{title}</Text>
      <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>{body}</Text>
      {actions?.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
          {actions.map((action, index) => (
            <Pressable
              key={`${action.label}-${index}`}
              onPress={action.onPress}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 999,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm }}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

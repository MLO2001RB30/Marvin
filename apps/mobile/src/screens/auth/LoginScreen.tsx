import { useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";

import { AppHeader } from "../../components/AppHeader";
import { Surface } from "../../components/Surface";

const MARVIN_LOGO = require("../../../assets/images/Marvin_logo.png");
import { useAuthState } from "../../state/AuthState";
import { useTheme } from "../../theme/ThemeProvider";

export function LoginScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const { signIn, setMode, errorMessage, clearError, isConfigured } = useAuthState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={{ gap: spacing.section }}>
      <AppHeader title="Welcome Back" subtitle="Sign in to continue" />
      <Surface>
        <View style={{ gap: spacing.md }}>
          <View style={{ alignItems: "center", marginBottom: spacing.sm }}>
            <Image source={MARVIN_LOGO} style={{ width: 80, height: 80 }} resizeMode="contain" />
          </View>
          {!isConfigured ? (
            <Text style={{ color: colors.danger, fontSize: typography.sizes.sm }}>
              Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in mobile env.
            </Text>
          ) : null}
          {errorMessage ? (
            <Pressable onPress={clearError}>
              <Text style={{ color: colors.accentGold, fontSize: typography.sizes.sm }}>
                {errorMessage}
              </Text>
            </Pressable>
          ) : null}
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor={colors.textTertiary}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              color: colors.textPrimary,
              backgroundColor: colors.bgSurfaceAlt
            }}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Password"
            placeholderTextColor={colors.textTertiary}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              color: colors.textPrimary,
              backgroundColor: colors.bgSurfaceAlt
            }}
          />
          <Pressable
            onPress={() => signIn(email.trim(), password)}
            style={({ pressed }) => ({
              borderRadius: 8,
              paddingVertical: spacing.md,
              alignItems: "center",
              backgroundColor: colors.accentGold,
              opacity: pressed ? 0.85 : 1
            })}
          >
            <Text style={{ color: "#191919", fontSize: typography.sizes.md, fontWeight: "600" }}>Log in</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              clearError();
              setMode("signup");
            }}
            style={{ alignItems: "center", paddingVertical: spacing.xs }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
              Need an account? Sign up
            </Text>
          </Pressable>
        </View>
      </Surface>
    </View>
  );
}

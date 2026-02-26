import { useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";

import { AppHeader } from "../../components/AppHeader";
import { Surface } from "../../components/Surface";
import { useAuthState } from "../../state/AuthState";
import { useTheme } from "../../theme/ThemeProvider";

const MARVIN_LOGO = require("../../../assets/images/Marvin_logo.png");

export function SignUpScreen() {
  const { colors, spacing, typography, radius } = useTheme();
  const { signUp, setMode, errorMessage, clearError, isConfigured } = useAuthState();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <View style={{ gap: spacing.section }}>
      <AppHeader title="Create Account" subtitle="Set up your workspace" />
      <Surface>
        <View style={{ gap: spacing.md }}>
          <View style={{ alignItems: "center", marginBottom: spacing.sm }}>
            <Image
              source={MARVIN_LOGO}
              style={{ width: 80, height: 80 }}
              resizeMode="contain"
            />
          </View>
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.accentGold,
              borderRadius: radius.card,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              backgroundColor: colors.accentGoldTint,
              gap: spacing.xs
            }}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.sizes.xl
              }}
            >
              Welcome to Marvin
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
              Your personal intelligence workspace starts here.
            </Text>
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
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            placeholder="First name"
            placeholderTextColor={colors.textTertiary}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              color: colors.textPrimary
            }}
          />
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
              borderRadius: 12,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              color: colors.textPrimary
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
              borderRadius: 12,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              color: colors.textPrimary
            }}
          />
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Confirm password"
            placeholderTextColor={colors.textTertiary}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              color: colors.textPrimary
            }}
          />
          <Pressable
            onPress={() => {
              if (firstName.trim().length === 0 || password !== confirmPassword) {
                return;
              }
              void signUp(email.trim(), password, firstName.trim());
            }}
            style={({ pressed }) => ({
              borderRadius: radius.pill,
              paddingVertical: spacing.md,
              alignItems: "center",
              backgroundColor: colors.accentGold,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }]
            })}
          >
            <Text style={{ color: "#1A1A1C", fontSize: typography.sizes.md, fontWeight: "600" }}>
              Create account
            </Text>
          </Pressable>
          {password !== confirmPassword && confirmPassword.length > 0 ? (
            <Text style={{ color: colors.danger, fontSize: typography.sizes.sm }}>
              Passwords must match.
            </Text>
          ) : null}
          {firstName.trim().length === 0 ? (
            <Text style={{ color: colors.textTertiary, fontSize: typography.sizes.sm }}>
              Add your first name so we can personalize the experience.
            </Text>
          ) : null}
          <Pressable
            onPress={() => {
              clearError();
              setMode("login");
            }}
            style={{ alignItems: "center", paddingVertical: spacing.xs }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>
              Already have an account? Log in
            </Text>
          </Pressable>
        </View>
      </Surface>
    </View>
  );
}

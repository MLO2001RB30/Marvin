import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaView, Text, View } from "react-native";

import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { AppShell } from "./src/navigation/AppShell";
import { AuthScreen } from "./src/screens/auth/AuthScreen";
import { AppStateProvider } from "./src/state/AppState";
import { AuthStateProvider, useAuthState } from "./src/state/AuthState";
import { ThemeProvider, useTheme } from "./src/theme/ThemeProvider";

// Hide splash as soon as this module loads (first thing when JS runs)
SplashScreen.hideAsync().catch(() => {});

function Root() {
  const { colors, typography } = useTheme();
  const { isLoading, isAuthenticated, user, session } = useAuthState();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bgPage }}>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.md }}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPage }}>
      <StatusBar style="light" />
      {isAuthenticated ? (
        <AppStateProvider userId={user?.id ?? ""} accessToken={session?.access_token ?? ""}>
          <AppShell />
        </AppStateProvider>
      ) : (
        <AuthScreen />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthStateProvider>
          <Root />
        </AuthStateProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

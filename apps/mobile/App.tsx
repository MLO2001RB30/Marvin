import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native";

import { AppShell } from "./src/navigation/AppShell";
import { AppStateProvider } from "./src/state/AppState";
import { ThemeProvider, useTheme } from "./src/theme/ThemeProvider";

function Root() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPage }}>
      <StatusBar style="light" />
      <AppStateProvider>
        <AppShell />
      </AppStateProvider>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  );
}

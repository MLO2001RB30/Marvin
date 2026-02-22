import { ScrollView } from "react-native";

import { useAuthState } from "../../state/AuthState";
import { useTheme } from "../../theme/ThemeProvider";
import { LoginScreen } from "./LoginScreen";
import { SignUpScreen } from "./SignUpScreen";

export function AuthScreen() {
  const { mode } = useAuthState();
  const { colors } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgPage }}
      contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 24, paddingBottom: 24 }}
    >
      {mode === "signup" ? <SignUpScreen /> : <LoginScreen />}
    </ScrollView>
  );
}

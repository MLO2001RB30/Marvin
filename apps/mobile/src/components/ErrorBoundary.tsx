import type { Component, ErrorInfo, ReactNode } from "react";
import { Component as ReactComponent } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const FALLBACK_BG = "#1A1A1C";
const FALLBACK_TEXT = "#FFFFFF";
const FALLBACK_MUTED = "#9A9A9C";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends ReactComponent<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      const err = this.state.error;
      return (
        <View style={{ flex: 1, backgroundColor: FALLBACK_BG, padding: 24, justifyContent: "center" }}>
          <Text style={{ color: "#F87171", fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
            Something went wrong
          </Text>
          <Text style={{ color: FALLBACK_MUTED, fontSize: 14, marginBottom: 16 }} selectable>
            {err.message}
          </Text>
          <ScrollView style={{ maxHeight: 200 }}>
            <Text style={{ color: FALLBACK_MUTED, fontSize: 12, fontFamily: "monospace" }} selectable>
              {err.stack}
            </Text>
          </ScrollView>
          <Pressable
            onPress={() => this.setState({ error: null })}
            style={{
              marginTop: 24,
              paddingVertical: 12,
              paddingHorizontal: 24,
              backgroundColor: "#3A3A3C",
              borderRadius: 12,
              alignSelf: "flex-start"
            }}
          >
            <Text style={{ color: FALLBACK_TEXT, fontSize: 14 }}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

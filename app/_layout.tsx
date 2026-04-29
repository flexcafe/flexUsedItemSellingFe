import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";

import { AnimatedLaunchScreen } from "@/components/animated-launch-screen";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "@/presentation/providers/AuthProvider";
import { LocaleProvider } from "@/presentation/providers/LocaleProvider";
import { QueryProvider } from "@/presentation/providers/QueryProvider";

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showLaunch, setShowLaunch] = useState(true);
  const handleLaunchFinish = useCallback(() => {
    setShowLaunch(false);
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <QueryProvider>
        <LocaleProvider>
          <AuthProvider>
            <View style={{ flex: 1 }}>
              <AuthGate />
              {showLaunch ? (
                <AnimatedLaunchScreen onFinish={handleLaunchFinish} />
              ) : null}
            </View>
            <StatusBar style="auto" />
          </AuthProvider>
        </LocaleProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

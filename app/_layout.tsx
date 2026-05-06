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
import { LanguageSwitcher } from "@/components/language-switcher";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "@/presentation/providers/AuthProvider";
import { LocaleProvider } from "@/presentation/providers/LocaleProvider";
import { QueryProvider } from "@/presentation/providers/QueryProvider";
import { ServicesProvider } from "@/presentation/providers/ServicesProvider";
import container from "@/core/infrastructure/di/container";
import type { IAuthService } from "@/core/domain/services/IAuthService";
import type { IProductService } from "@/core/domain/services/IProductService";
import type { IProfileService } from "@/core/domain/services/IProfileService";
import type { IPreferencesRepository } from "@/core/domain/repositories/IPreferencesRepository";

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

  const services = useState(() => ({
    authService: container.resolve<IAuthService>("authService"),
    productService: container.resolve<IProductService>("productService"),
    profileService: container.resolve<IProfileService>("profileService"),
    preferencesRepository:
      container.resolve<IPreferencesRepository>("preferencesRepository"),
  }))[0];

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <ServicesProvider services={services}>
        <QueryProvider>
          <LocaleProvider>
            <AuthProvider>
              <View style={{ flex: 1 }}>
                <AuthGate />
                <LanguageSwitcher />
                {showLaunch ? (
                  <AnimatedLaunchScreen onFinish={handleLaunchFinish} />
                ) : null}
              </View>
              <StatusBar style="auto" />
            </AuthProvider>
          </LocaleProvider>
        </QueryProvider>
      </ServicesProvider>
    </ThemeProvider>
  );
}

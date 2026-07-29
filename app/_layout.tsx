import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Slot, useRouter, useSegments, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SafeAreaScreenWrapper } from "@/components/app-safe-area";
import { FlexMarketLoader } from "@/components/flex-market-loader";
import { AnimatedLaunchScreen } from "@/components/animated-launch-screen";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { IPreferencesRepository } from "@/core/domain/repositories/IPreferencesRepository";
import type { IAuthService } from "@/core/domain/services/IAuthService";
import type { ICategoryService } from "@/core/domain/services/ICategoryService";
import type { IChatService } from "@/core/domain/services/IChatService";
import type { IClientReportService } from "@/core/domain/services/IClientReportService";
import type { ILegalService } from "@/core/domain/services/ILegalService";
import type { INotificationService } from "@/core/domain/services/INotificationService";
import type { IProductService } from "@/core/domain/services/IProductService";
import type { IProfileService } from "@/core/domain/services/IProfileService";
import type { ISliderAdService } from "@/core/domain/services/ISliderAdService";
import container from "@/core/infrastructure/di/container";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { NotificationToastRoot } from "@/presentation/components/notification-toast-root";
import { AuthProvider, useAuth } from "@/presentation/providers/AuthProvider";
import {
  LegalTermsProvider,
  useLegalTerms,
} from "@/presentation/providers/LegalTermsProvider";
import { LocaleProvider } from "@/presentation/providers/LocaleProvider";
import { QueryProvider } from "@/presentation/providers/QueryProvider";
import { RealtimeProvider } from "@/presentation/providers/RealtimeProvider";
import { ServicesProvider } from "@/presentation/providers/ServicesProvider";

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const {
    isLoadingTerms,
    isCheckingStatus,
    statusReady,
    hasPreAuthAcceptedCurrent,
    needsAcceptance,
  } = useLegalTerms();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || isLoadingTerms) return;
    if (isAuthenticated && (!statusReady || isCheckingStatus)) return;

    const inAuthGroup = segments[0] === "(auth)";
    const authScreen = inAuthGroup ? String(segments[1] ?? "") : "";
    const onTerms = authScreen === "terms";

    if (!isAuthenticated) {
      if (!hasPreAuthAcceptedCurrent) {
        if (!onTerms) router.replace("/(auth)/terms" as Href);
        return;
      }
      if (onTerms) {
        router.replace("/(auth)/login");
        return;
      }
      if (!inAuthGroup) {
        router.replace("/(auth)/login");
      }
      return;
    }

    if (needsAcceptance) {
      if (!onTerms) router.replace("/(auth)/terms" as Href);
      return;
    }

    if (inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [
    isAuthenticated,
    isLoading,
    isLoadingTerms,
    isCheckingStatus,
    statusReady,
    hasPreAuthAcceptedCurrent,
    needsAcceptance,
    segments,
    router,
  ]);

  if (
    isLoading ||
    isLoadingTerms ||
    (isAuthenticated && (!statusReady || isCheckingStatus))
  ) {
    return (
      <SafeAreaScreenWrapper mode="full">
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <FlexMarketLoader size="lg" />
        </View>
      </SafeAreaScreenWrapper>
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
    notificationService: container.resolve<INotificationService>(
      "notificationService",
    ),
    sliderAdService: container.resolve<ISliderAdService>("sliderAdService"),
    categoryService: container.resolve<ICategoryService>("categoryService"),
    chatService: container.resolve<IChatService>("chatService"),
    clientReportService: container.resolve<IClientReportService>(
      "clientReportService",
    ),
    legalService: container.resolve<ILegalService>("legalService"),
    preferencesRepository: container.resolve<IPreferencesRepository>(
      "preferencesRepository",
    ),
  }))[0];

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <ServicesProvider services={services}>
          <QueryProvider>
            <LocaleProvider>
              <AuthProvider>
                <LegalTermsProvider>
                  <RealtimeProvider>
                    <View style={{ flex: 1 }}>
                      <AuthGate />
                      <LanguageSwitcher />
                      {showLaunch ? (
                        <AnimatedLaunchScreen onFinish={handleLaunchFinish} />
                      ) : null}
                    </View>
                    <NotificationToastRoot />
                    <StatusBar style="auto" />
                  </RealtimeProvider>
                </LegalTermsProvider>
              </AuthProvider>
            </LocaleProvider>
          </QueryProvider>
        </ServicesProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

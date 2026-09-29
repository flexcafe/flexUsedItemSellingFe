import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import {
  Slot,
  useGlobalSearchParams,
  usePathname,
  useRouter,
  useSegments,
  type Href,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
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
import type { IModerationService } from "@/core/domain/services/IModerationService";
import type { INotificationService } from "@/core/domain/services/INotificationService";
import type { IProductService } from "@/core/domain/services/IProductService";
import type { IProfileService } from "@/core/domain/services/IProfileService";
import type { ISliderAdService } from "@/core/domain/services/ISliderAdService";
import container from "@/core/infrastructure/di/container";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  didRequestLogin,
  finishAuthenticatedNavigation,
  replaceWithLogin,
} from "@/presentation/lib/requireAuth";
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

const ACCOUNT_TABS = new Set([
  "products",
  "chats",
  "notifications",
  "profile",
]);

function isPublicBrowseRoute(segments: string[]): boolean {
  const root = segments[0] ?? "";
  if (root === "" || root === "(tabs)") {
    const tab = root === "(tabs)" ? (segments[1] ?? "index") : "index";
    return !ACCOUNT_TABS.has(tab);
  }
  return root === "product" || root === "seller" || root === "modal" || root === "verify";
}

function hrefFromLocation(
  pathname: string,
  params: Record<string, string | string[] | undefined>,
): Href {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    const single = Array.isArray(value) ? value[0] : value;
    if (!single) continue;
    query.set(key, single);
  }
  const qs = query.toString();
  return (qs ? `${pathname}?${qs}` : pathname) as Href;
}

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isCheckingStatus, statusReady, needsAcceptance } = useLegalTerms();
  const segments = useSegments();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const sentGuestToLogin = useRef(false);

  const blockNavigation =
    isLoading || (isAuthenticated && (!statusReady || isCheckingStatus));

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && (!statusReady || isCheckingStatus)) return;

    const routeSegments = segments as string[];
    const inAuthGroup = routeSegments[0] === "(auth)";
    const authScreen = inAuthGroup ? String(routeSegments[1] ?? "") : "";
    const onTerms = authScreen === "terms";

    if (!isAuthenticated) {
      if (inAuthGroup) {
        const openedOnPurpose = didRequestLogin();
        const restoredAuthScreen =
          authScreen === "" ||
          authScreen === "login" ||
          authScreen === "register" ||
          authScreen === "forgot-password";
        if (!openedOnPurpose && restoredAuthScreen) {
          router.replace("/(tabs)" as Href);
        }
        sentGuestToLogin.current = false;
        return;
      }
      if (isPublicBrowseRoute(routeSegments)) {
        sentGuestToLogin.current = false;
        return;
      }
      if (sentGuestToLogin.current) return;
      sentGuestToLogin.current = true;
      replaceWithLogin(
        hrefFromLocation(
          pathname,
          paramsRef.current as Record<string, string | string[] | undefined>,
        ),
      );
      return;
    }

    sentGuestToLogin.current = false;

    if (needsAcceptance) {
      if (!onTerms) router.replace("/(auth)/terms" as Href);
      return;
    }

    if (inAuthGroup) {
      finishAuthenticatedNavigation();
    }
  }, [
    isAuthenticated,
    isLoading,
    isCheckingStatus,
    statusReady,
    needsAcceptance,
    segments,
    pathname,
    router,
  ]);

  return (
    <View style={styles.gate}>
      <Slot />
      {blockNavigation ? (
        <View
          style={[
            styles.bootOverlay,
            { backgroundColor: Colors[colorScheme ?? "light"].background },
          ]}
        >
          <SafeAreaScreenWrapper mode="full">
            <View style={styles.bootCenter}>
              <FlexMarketLoader size="lg" />
            </View>
          </SafeAreaScreenWrapper>
        </View>
      ) : null}
    </View>
  );
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
    moderationService: container.resolve<IModerationService>(
      "moderationService",
    ),
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
                  <RealtimeProvider liveEnabled={!showLaunch}>
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

const styles = StyleSheet.create({
  gate: {
    flex: 1,
  },
  bootOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  bootCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

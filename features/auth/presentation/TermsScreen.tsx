import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguageSwitcherSafeTop } from "@/components/app-safe-area";
import { AnimatedLanguageBar } from "@/components/animated-language-bar";
import { FlexMarketLoader } from "@/components/flex-market-loader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { uiCardShadow, uiCardSurface } from "@/presentation/lib/uiAnimations";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useLegalTerms } from "@/presentation/providers/LegalTermsProvider";
import { useLocale } from "@/presentation/providers/LocaleProvider";
import { AuthPrimaryButton } from "./authAnimated";

const SCROLL_END_THRESHOLD = 24;

export function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = useLanguageSwitcherSafeTop();
  const { locale, setLocale, t } = useLocale();
  const { isAuthenticated, logout } = useAuth();
  const {
    terms,
    termsError,
    isLoadingTerms,
    needsAcceptance,
    refreshTerms,
    agreePreAuth,
    disagreePreAuth,
    acceptCurrentTerms,
  } = useLegalTerms();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const [contentOverflows, setContentOverflows] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const isReaccept = isAuthenticated && needsAcceptance;
  const canAgree = !contentOverflows || hasReachedEnd;

  useEffect(() => {
    setHasReachedEnd(false);
    setContentOverflows(false);
    setViewportHeight(0);
    setContentHeight(0);
  }, [terms?.version]);

  useEffect(() => {
    if (viewportHeight <= 0 || contentHeight <= 0) return;
    const overflows = contentHeight > viewportHeight + SCROLL_END_THRESHOLD;
    setContentOverflows(overflows);
    if (!overflows) setHasReachedEnd(true);
  }, [contentHeight, viewportHeight]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height - (layoutMeasurement.height + contentOffset.y);
    if (distanceFromBottom <= SCROLL_END_THRESHOLD) {
      setHasReachedEnd(true);
    }
  };

  const handleAgree = async () => {
    if (!terms?.version) {
      Alert.alert(t("errorTitle"), t("termsLoadFailed"));
      return;
    }
    if (!canAgree) {
      Alert.alert(t("termsScrollRequiredTitle"), t("termsScrollRequiredBody"));
      return;
    }
    setIsSubmitting(true);
    try {
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      if (isReaccept) {
        await acceptCurrentTerms();
        router.replace("/(tabs)");
        return;
      }
      await agreePreAuth();
      router.replace("/(auth)/login" as Href);
    } catch (err) {
      const message =
        err instanceof Error && err.message.trim()
          ? err.message
          : t("termsAcceptFailed");
      Alert.alert(t("errorTitle"), message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisagree = async () => {
    if (isReaccept) {
      Alert.alert(t("termsDisagreeTitle"), t("termsDisagreeAuthenticatedBody"), [
        { text: t("termsStay"), style: "cancel" },
        {
          text: t("termsSignOut"),
          style: "destructive",
          onPress: () => {
            void logout();
          },
        },
      ]);
      return;
    }
    await disagreePreAuth();
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    Alert.alert(t("termsDisagreeTitle"), t("termsDisagreeBody"));
  };

  if (isLoadingTerms && !terms) {
    return (
      <ThemedView style={styles.centered}>
        <FlexMarketLoader size="lg" />
      </ThemedView>
    );
  }

  if (!terms || termsError) {
    return (
      <ThemedView style={styles.centered}>
        <View
          style={[
            styles.errorIconWrap,
            { backgroundColor: colors.tint + "18" },
          ]}
        >
          <MaterialIcons name="gavel" size={28} color={colors.tint} />
        </View>
        <ThemedText style={styles.errorTitle}>{t("termsLoadFailed")}</ThemedText>
        <ThemedText style={[styles.errorBody, { color: colors.icon }]}>
          {termsError ?? t("termsLoadFailedHint")}
        </ThemedText>
        <Pressable
          onPress={() => {
            void refreshTerms();
          }}
          style={[styles.retryButton, { borderColor: colors.tint }]}
        >
          <MaterialIcons name="refresh" size={18} color={colors.tint} />
          <ThemedText style={[styles.retryText, { color: colors.tint }]}>
            {t("termsRetry")}
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.screen, { paddingTop: topInset }]}>
      {/* Document zone — takes all leftover space above the fixed footer */}
      <View style={styles.main}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <MaterialIcons name="gavel" size={20} color={colors.tint} />
            <ThemedText
              type="defaultSemiBold"
              numberOfLines={2}
              style={styles.title}
            >
              {terms.title || t("termsTitle")}
            </ThemedText>
          </View>
          <ThemedText style={[styles.requiredHint, { color: colors.icon }]}>
            {isReaccept
              ? t("termsMustAcceptAgain")
              : t("termsMustAcceptBeforeAuth")}
          </ThemedText>
          <ThemedText style={[styles.versionLine, { color: colors.tint }]}>
            {t("termsVersionLabel")} {terms.version}
          </ThemedText>
        </View>

        <View
          style={[
            styles.documentCard,
            uiCardShadow(scheme),
            {
              borderColor: colors.icon + "28",
              backgroundColor: uiCardSurface(scheme),
            },
          ]}
        >
          <View style={styles.documentHeader}>
            <ThemedText style={styles.documentHeaderTitle}>
              {t("termsDocumentLabel")}
            </ThemedText>
            {!canAgree ? (
              <ThemedText style={[styles.scrollHint, { color: colors.tint }]}>
                {t("termsScrollHint")}
              </ThemedText>
            ) : (
              <View style={styles.readDoneRow}>
                <MaterialIcons name="check-circle" size={14} color="#16a34a" />
                <ThemedText style={styles.readDoneText}>
                  {t("termsScrollComplete")}
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.documentBody}>
            <ScrollView
              style={styles.documentScroll}
              contentContainerStyle={styles.documentInner}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              bounces
              keyboardShouldPersistTaps="handled"
              onScroll={onScroll}
              scrollEventThrottle={16}
              onLayout={(e) => {
                setViewportHeight(e.nativeEvent.layout.height);
              }}
              onContentSizeChange={(_w, h) => {
                setContentHeight(h);
              }}
            >
              <ThemedText style={styles.contentText}>{terms.content}</ThemedText>
            </ScrollView>
            {!canAgree ? (
              <View
                pointerEvents="none"
                style={[
                  styles.scrollFade,
                  {
                    backgroundColor:
                      scheme === "dark"
                        ? "rgba(21, 23, 24, 0.92)"
                        : "rgba(255, 255, 255, 0.92)",
                  },
                ]}
              >
                <MaterialIcons
                  name="keyboard-arrow-down"
                  size={22}
                  color={colors.tint}
                />
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Fixed action dock — never scrolls away, always tappable */}
      <View
        pointerEvents="box-none"
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, 10),
            borderTopColor: colors.icon + "22",
            backgroundColor: colors.background,
          },
        ]}
      >
        <AuthPrimaryButton
          onPress={() => {
            void handleAgree();
          }}
          disabled={!canAgree || isSubmitting}
          backgroundColor={colors.tint}
        >
          {isSubmitting ? (
            <FlexMarketLoader variant="inline" size="xs" showText={false} />
          ) : (
            <ThemedText style={styles.primaryButtonText}>
              {t("termsAgree")}
            </ThemedText>
          )}
        </AuthPrimaryButton>
        <Pressable
          onPress={() => {
            void handleDisagree();
          }}
          disabled={isSubmitting}
          hitSlop={8}
          style={[styles.secondaryButton, isSubmitting ? styles.disabled : null]}
        >
          <ThemedText style={[styles.secondaryButtonText, { color: colors.icon }]}>
            {t("termsDisagree")}
          </ThemedText>
        </Pressable>
        <View style={styles.languageRow} pointerEvents="box-none">
          <AnimatedLanguageBar
            locale={locale}
            onSelect={setLocale}
            variant="comfortable"
            disabled={isSubmitting}
            scheme={scheme}
            tintColor={colors.tint}
            borderColor={colors.tint}
            backgroundColor={colors.background}
            elevated
            style={styles.languageBar}
          />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
  },
  main: {
    flex: 1,
    minHeight: 0,
    gap: 8,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  header: {
    gap: 4,
    paddingTop: 2,
    flexShrink: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
  },
  requiredHint: {
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 0,
  },
  versionLine: {
    fontSize: 11,
    fontWeight: "800",
  },
  documentCard: {
    flex: 1,
    minHeight: 0,
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  documentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    flexShrink: 0,
  },
  documentHeaderTitle: {
    fontSize: 12,
    fontWeight: "800",
  },
  scrollHint: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
  },
  readDoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  readDoneText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16a34a",
  },
  documentBody: {
    flex: 1,
    minHeight: 0,
    position: "relative",
  },
  documentScroll: {
    flex: 1,
  },
  documentInner: {
    paddingHorizontal: 12,
    paddingBottom: 32,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 22,
  },
  scrollFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 40,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 2,
  },
  footer: {
    flexShrink: 0,
    gap: 6,
    paddingTop: 10,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
    elevation: 8,
  },
  languageRow: {
    marginTop: 2,
    minHeight: 56,
    justifyContent: "center",
  },
  languageBar: {
    width: "100%",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  secondaryButton: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  secondaryButtonText: {
    fontWeight: "700",
    fontSize: 14,
  },
  disabled: {
    opacity: 0.55,
  },
  errorIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  errorBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 4,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  retryText: {
    fontWeight: "800",
  },
});

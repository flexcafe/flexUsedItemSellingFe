import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
import { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthLogo } from "@/components/auth-logo";
import { FlexMarketLoader } from "@/components/flex-market-loader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { uiCardShadow, uiCardSurface } from "@/presentation/lib/uiAnimations";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useLegalTerms } from "@/presentation/providers/LegalTermsProvider";
import { useLocale } from "@/presentation/providers/LocaleProvider";

import {
  AuthAnimatedSection,
  AuthPrimaryButton,
} from "./authAnimated";

const SCROLL_END_THRESHOLD = 28;

function formatPublishedAt(value: string | null, locale: string): string | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locale, t } = useLocale();
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
  const reduceMotion = useReducedMotion();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const [contentOverflows, setContentOverflows] = useState(false);

  const isReaccept = isAuthenticated && needsAcceptance;
  const canAgree = !contentOverflows || hasReachedEnd;
  const publishedLabel = useMemo(
    () => formatPublishedAt(terms?.publishedAt ?? null, locale),
    [locale, terms?.publishedAt],
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (layoutMeasurement.height + contentOffset.y);
      if (distanceFromBottom <= SCROLL_END_THRESHOLD) {
        setHasReachedEnd(true);
      }
    },
    [],
  );

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
    <ThemedView style={styles.screen}>
      <AuthAnimatedSection delayMs={0} reduceMotion={reduceMotion}>
        <View style={styles.hero}>
          <AuthLogo variant="compact" />
          <View
            style={[
              styles.heroBadge,
              { backgroundColor: colors.tint + "16" },
            ]}
          >
            <MaterialIcons name="verified-user" size={18} color={colors.tint} />
            <ThemedText style={[styles.heroBadgeText, { color: colors.tint }]}>
              {t("termsSafetyBadge")}
            </ThemedText>
          </View>
          <ThemedText type="screenTitle" style={styles.title}>
            {terms.title || t("termsTitle")}
          </ThemedText>
          <ThemedText style={[styles.requiredHint, { color: colors.icon }]}>
            {isReaccept
              ? t("termsMustAcceptAgain")
              : t("termsMustAcceptBeforeAuth")}
          </ThemedText>
          <View style={styles.metaRow}>
            <View
              style={[
                styles.metaPill,
                {
                  backgroundColor: colors.tint + "14",
                  borderColor: colors.tint + "33",
                },
              ]}
            >
              <MaterialIcons name="history" size={14} color={colors.tint} />
              <ThemedText style={[styles.metaPillText, { color: colors.tint }]}>
                {t("termsVersionLabel")} {terms.version}
              </ThemedText>
            </View>
            {publishedLabel ? (
              <View
                style={[
                  styles.metaPill,
                  {
                    backgroundColor: colors.icon + "12",
                    borderColor: colors.icon + "33",
                  },
                ]}
              >
                <MaterialIcons name="event" size={14} color={colors.icon} />
                <ThemedText
                  style={[styles.metaPillText, { color: colors.icon }]}
                >
                  {publishedLabel}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </AuthAnimatedSection>

      <AuthAnimatedSection
        delayMs={80}
        reduceMotion={reduceMotion}
        style={styles.highlights}
      >
        <View
          style={[
            styles.highlightCard,
            {
              backgroundColor: "#16a34a14",
              borderColor: "#16a34a44",
            },
          ]}
        >
          <MaterialIcons name="block" size={18} color="#16a34a" />
          <ThemedText style={[styles.highlightText, { color: colors.text }]}>
            {t("termsHighlightZeroTolerance")}
          </ThemedText>
        </View>
        <View
          style={[
            styles.highlightCard,
            {
              backgroundColor: colors.tint + "12",
              borderColor: colors.tint + "33",
            },
          ]}
        >
          <MaterialIcons name="flag" size={18} color={colors.tint} />
          <ThemedText style={[styles.highlightText, { color: colors.text }]}>
            {t("termsHighlightReportBlock")}
          </ThemedText>
        </View>
      </AuthAnimatedSection>

      <AuthAnimatedSection
        delayMs={120}
        reduceMotion={reduceMotion}
        style={styles.documentWrap}
      >
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
              onScroll={onScroll}
              scrollEventThrottle={16}
              onContentSizeChange={(_w, h) => {
                setContentOverflows(h > 220);
                if (h <= 220) setHasReachedEnd(true);
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
      </AuthAnimatedSection>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, 12),
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
          style={[styles.secondaryButton, isSubmitting ? styles.disabled : null]}
        >
          <ThemedText style={[styles.secondaryButtonText, { color: colors.icon }]}>
            {t("termsDisagree")}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  hero: {
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    marginBottom: 0,
    textAlign: "center",
  },
  requiredHint: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 2,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  highlights: {
    gap: 8,
  },
  highlightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  highlightText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  documentWrap: {
    flex: 1,
    minHeight: 180,
  },
  documentCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  documentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  documentHeaderTitle: {
    fontSize: 13,
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
    position: "relative",
  },
  documentScroll: {
    flex: 1,
  },
  documentInner: {
    paddingHorizontal: 14,
    paddingBottom: 28,
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
    height: 44,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
  },
  footer: {
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
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

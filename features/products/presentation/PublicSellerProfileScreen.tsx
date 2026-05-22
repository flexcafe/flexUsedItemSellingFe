import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  usePublicUserProfile,
  useSellerReviews,
} from "@/presentation/hooks/useClientProducts";
import { ReferralCodeBlock } from "@/presentation/components/ReferralCodeBlock";
import { uiCardShadow, uiSectionEnter } from "@/presentation/lib/uiAnimations";
import {
  useLocale,
  userRankLabelKey,
} from "@/presentation/providers/LocaleProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { memo, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatListingDate } from "./myProductDetailHelpers";

type Props = { userId: string };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SECTION_STAGGER_MS = 48;

function cardSurface(scheme: "light" | "dark") {
  return scheme === "dark" ? "#23272E" : "#FFFFFF";
}

function staggerEnter(delay: number, reduceMotion: boolean | null) {
  return uiSectionEnter(delay, reduceMotion, {
    direction: "up",
    duration: 420,
    damping: 18,
    stiffness: 220,
  });
}

const ReviewBar = memo(function ReviewBar({
  stars,
  count,
  tint,
  maxCount,
}: {
  stars: number;
  count: number;
  tint: string;
  maxCount: number;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const targetPct = maxCount > 0 ? Math.min(100, (count / maxCount) * 100) : 0;

  useEffect(() => {
    if (reduceMotion) {
      progress.value = targetPct;
      return;
    }
    progress.value = 0;
    progress.value = withSpring(targetPct, { damping: 18, stiffness: 120 });
  }, [count, maxCount, progress, reduceMotion, targetPct]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  return (
    <View style={styles.breakdownRow}>
      <ThemedText style={styles.breakdownStars}>{stars}★</ThemedText>
      <View style={styles.breakdownTrack}>
        <Animated.View
          style={[styles.breakdownFill, { backgroundColor: tint }, fillStyle]}
        />
      </View>
      <ThemedText style={styles.breakdownCount}>{count}</ThemedText>
    </View>
  );
});

export function PublicSellerProfileScreen({ userId }: Props) {
  const router = useRouter();
  const { t, tf, locale } = useLocale();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const reduceMotion = useReducedMotion();
  const backPressed = useSharedValue(0);
  const [page, setPage] = useState(1);

  const profileQuery = usePublicUserProfile(userId);
  const reviewsQuery = useSellerReviews(userId, { page, limit: 20 });
  const profile = profileQuery.data;

  const surface = cardSurface(scheme);
  const borderColor = colors.icon + "22";

  const sortedBreakdown = useMemo(
    () =>
      [...(reviewsQuery.data?.starBreakdown ?? [])].sort(
        (a, b) => b.stars - a.stars,
      ),
    [reviewsQuery.data?.starBreakdown],
  );

  const maxReviewCount = useMemo(
    () => Math.max(1, ...sortedBreakdown.map((r) => r.count)),
    [sortedBreakdown],
  );

  const backAnimStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          backPressed.value,
          [0, 1],
          [1, 0.9],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <View style={[styles.topBar, { backgroundColor: colors.tint }]}>
          <AnimatedPressable
            onPress={() => router.back()}
            onPressIn={() => {
              if (reduceMotion) return;
              backPressed.value = withTiming(1, { duration: 80 });
            }}
            onPressOut={() => {
              if (reduceMotion) return;
              backPressed.value = withSpring(0, {
                damping: 14,
                stiffness: 320,
              });
            }}
            style={[styles.backButton, backAnimStyle]}
          >
            <MaterialIcons name="arrow-back" size={20} color="#FFF" />
          </AnimatedPressable>
          <ThemedText style={styles.topTitle}>
            {t("publicProfileTitle")}
          </ThemedText>
          <View style={styles.backButton} />
        </View>

        {profileQuery.isLoading ? (
          <Animated.View
            entering={reduceMotion ? undefined : FadeIn.duration(280)}
            style={styles.centeredFull}
          >
            <ActivityIndicator color={colors.tint} size="large" />
            <ThemedText style={styles.loadingText}>
              {t("productsDetailLoading")}
            </ThemedText>
          </Animated.View>
        ) : !profile ? (
          <View style={styles.centeredFull}>
            <MaterialIcons name="person-off" size={44} color={colors.icon} />
            <ThemedText>{t("productsDetailNoData")}</ThemedText>
          </View>
        ) : (
          <Animated.ScrollView
            entering={reduceMotion ? undefined : FadeIn.duration(240)}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              entering={staggerEnter(0, reduceMotion)}
              style={[
                styles.sellerCard,
                uiCardShadow(scheme, {
                  iosOffsetLight: 6,
                  iosOffsetDark: 8,
                  iosOpacityLight: 0.1,
                  iosOpacityDark: 0.35,
                  iosRadiusLight: 12,
                  iosRadiusDark: 14,
                  androidElevationLight: 4,
                  androidElevationDark: 6,
                }),
                { backgroundColor: surface, borderColor },
              ]}
            >
              <View
                style={[styles.avatarRing, { borderColor: colors.tint + "50" }]}
              >
                <Image
                  source={profile.avatar ? { uri: profile.avatar } : undefined}
                  style={[
                    styles.avatar,
                    { backgroundColor: colors.icon + "1f" },
                  ]}
                />
              </View>
              <View style={styles.sellerCopy}>
                <ThemedText type="defaultSemiBold" style={styles.sellerName}>
                  {profile.nickname}
                </ThemedText>
                <View
                  style={[
                    styles.rankPill,
                    { backgroundColor: colors.tint + "18" },
                  ]}
                >
                  <ThemedText
                    style={[styles.rankPillText, { color: colors.tint }]}
                  >
                    {t(userRankLabelKey(profile.currentRank))}
                  </ThemedText>
                </View>
                <ThemedText style={styles.sellerSub}>
                  {tf("publicProfileRatingSummary", {
                    avg: profile.averageStars.toFixed(1),
                    count: profile.totalReviews,
                  })}
                </ThemedText>
                <ThemedText style={styles.sellerSub}>
                  {tf("publicProfileRegion", {
                    region: profile.region?.trim() || "—",
                  })}
                </ThemedText>
              </View>
            </Animated.View>

            {profile.referralCode?.trim() ? (
              <Animated.View
                entering={staggerEnter(SECTION_STAGGER_MS * 0.75, reduceMotion)}
                style={{ marginBottom: 12 }}
              >
                <ReferralCodeBlock
                  code={profile.referralCode.trim()}
                  title={t("publicProfileReferralTitle")}
                  hint={t("publicProfileReferralHint")}
                  tint={colors.tint}
                  borderColor={colors.icon + "33"}
                  surfaceColor={surface}
                />
              </Animated.View>
            ) : null}

            <Animated.View
              entering={staggerEnter(SECTION_STAGGER_MS, reduceMotion)}
              style={[
                styles.statsCard,
                uiCardShadow(scheme, {
                  iosOffsetLight: 6,
                  iosOffsetDark: 8,
                  iosOpacityLight: 0.1,
                  iosOpacityDark: 0.35,
                  iosRadiusLight: 12,
                  iosRadiusDark: 14,
                  androidElevationLight: 4,
                  androidElevationDark: 6,
                }),
                { backgroundColor: surface, borderColor },
              ]}
            >
              <View
                style={[
                  styles.statItem,
                  { backgroundColor: colors.tint + "0C" },
                ]}
              >
                <MaterialIcons name="store" size={18} color={colors.tint} />
                <ThemedText style={styles.statLabel}>
                  {t("rewardCompletedSales")}
                </ThemedText>
                <ThemedText style={[styles.statValue, { color: colors.tint }]}>
                  {profile.completedSales}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statItem,
                  { backgroundColor: colors.tint + "0C" },
                ]}
              >
                <MaterialIcons
                  name="shopping-cart"
                  size={18}
                  color={colors.tint}
                />
                <ThemedText style={styles.statLabel}>
                  {t("rewardCompletedPurchases")}
                </ThemedText>
                <ThemedText style={[styles.statValue, { color: colors.tint }]}>
                  {profile.completedPurchases}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statItem,
                  { backgroundColor: colors.tint + "0C" },
                ]}
              >
                <MaterialIcons name="event" size={18} color={colors.tint} />
                <ThemedText style={styles.statLabel}>
                  {t("publicProfileMemberSince")}
                </ThemedText>
                <ThemedText style={styles.statValue}>
                  {profile.memberSince
                    ? formatListingDate(profile.memberSince, locale)
                    : "—"}
                </ThemedText>
              </View>
            </Animated.View>

            <Animated.View
              entering={staggerEnter(SECTION_STAGGER_MS * 2, reduceMotion)}
              style={[
                styles.breakdownCard,
                uiCardShadow(scheme, {
                  iosOffsetLight: 6,
                  iosOffsetDark: 8,
                  iosOpacityLight: 0.1,
                  iosOpacityDark: 0.35,
                  iosRadiusLight: 12,
                  iosRadiusDark: 14,
                  androidElevationLight: 4,
                  androidElevationDark: 6,
                }),
                { backgroundColor: surface, borderColor },
              ]}
            >
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                {t("publicProfileReviewsSection")}
              </ThemedText>
              {sortedBreakdown.map((row) => (
                <ReviewBar
                  key={`b-${row.stars}`}
                  stars={row.stars}
                  count={row.count}
                  tint={colors.tint}
                  maxCount={maxReviewCount}
                />
              ))}
            </Animated.View>

            {reviewsQuery.isLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator color={colors.tint} />
              </View>
            ) : (
              <View style={styles.reviewsList}>
                {(reviewsQuery.data?.items ?? []).map((item, idx) => (
                  <Animated.View
                    key={item.id}
                    entering={
                      reduceMotion
                        ? undefined
                        : FadeInUp.duration(360)
                            .delay(Math.min(idx, 8) * 45)
                            .springify()
                            .damping(18)
                    }
                    style={[
                      styles.reviewItem,
                      uiCardShadow(scheme, {
                        iosOffsetLight: 6,
                        iosOffsetDark: 8,
                        iosOpacityLight: 0.1,
                        iosOpacityDark: 0.35,
                        iosRadiusLight: 12,
                        iosRadiusDark: 14,
                        androidElevationLight: 4,
                        androidElevationDark: 6,
                      }),
                      { backgroundColor: surface, borderColor },
                    ]}
                  >
                    <ThemedText style={styles.reviewStars}>
                      {"★".repeat(Math.max(1, item.stars))}
                    </ThemedText>
                    <ThemedText style={styles.reviewNick}>
                      {item.reviewerNickname ?? "—"}
                    </ThemedText>
                    <ThemedText style={styles.reviewBody}>
                      {item.comment?.trim() || t("publicProfileNoComment")}
                    </ThemedText>
                    <ThemedText style={styles.reviewDate}>
                      {item.createdAt
                        ? formatListingDate(item.createdAt, locale)
                        : "—"}
                    </ThemedText>
                  </Animated.View>
                ))}
              </View>
            )}

            <Animated.View
              entering={staggerEnter(SECTION_STAGGER_MS * 3, reduceMotion)}
              style={styles.paginationRow}
            >
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setPage((p) => Math.max(1, p - 1));
                }}
                disabled={page <= 1}
                style={[
                  styles.pageBtn,
                  uiCardShadow(scheme, {
                    iosOffsetLight: 6,
                    iosOffsetDark: 8,
                    iosOpacityLight: 0.1,
                    iosOpacityDark: 0.35,
                    iosRadiusLight: 12,
                    iosRadiusDark: 14,
                    androidElevationLight: 4,
                    androidElevationDark: 6,
                  }),
                  { backgroundColor: surface, borderColor },
                  page <= 1 && { opacity: 0.5 },
                ]}
              >
                <ThemedText>{t("publicProfilePrev")}</ThemedText>
              </Pressable>
              <ThemedText style={styles.pageText}>
                {tf("publicProfilePage", {
                  page: reviewsQuery.data?.page ?? page,
                })}
              </ThemedText>
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setPage((p) => p + 1);
                }}
                disabled={!reviewsQuery.data?.hasNextPage}
                style={[
                  styles.pageBtn,
                  uiCardShadow(scheme, {
                    iosOffsetLight: 6,
                    iosOffsetDark: 8,
                    iosOpacityLight: 0.1,
                    iosOpacityDark: 0.35,
                    iosRadiusLight: 12,
                    iosRadiusDark: 14,
                    androidElevationLight: 4,
                    androidElevationDark: 6,
                  }),
                  { backgroundColor: surface, borderColor },
                  !reviewsQuery.data?.hasNextPage && { opacity: 0.5 },
                ]}
              >
                <ThemedText>{t("publicProfileNext")}</ThemedText>
              </Pressable>
            </Animated.View>
          </Animated.ScrollView>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  topBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  centeredFull: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 20,
  },
  loadingText: { opacity: 0.65 },
  content: { padding: 12, gap: 14, paddingBottom: 28 },
  sellerCard: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: 62, height: 62, borderRadius: 31 },
  sellerCopy: { flex: 1, gap: 5, minWidth: 0 },
  sellerName: { fontSize: 18, fontWeight: "800" },
  rankPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  rankPillText: { fontSize: 11, fontWeight: "800" },
  sellerSub: { fontSize: 12, opacity: 0.72, lineHeight: 17 },
  statsCard: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
    minHeight: 88,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    gap: 5,
  },
  statLabel: {
    fontSize: 10,
    opacity: 0.65,
    textAlign: "center",
    lineHeight: 13,
  },
  statValue: { fontSize: 13, fontWeight: "800", textAlign: "center" },
  breakdownCard: { padding: 14, borderRadius: 18, borderWidth: 1, gap: 10 },
  sectionTitle: { fontSize: 15, marginBottom: 4 },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  breakdownStars: { width: 26, fontSize: 12, fontWeight: "700" },
  breakdownTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(120,120,120,0.22)",
    overflow: "hidden",
  },
  breakdownFill: { height: "100%", borderRadius: 4 },
  breakdownCount: { width: 28, textAlign: "right", fontSize: 12, opacity: 0.7 },
  centered: { paddingVertical: 20, alignItems: "center" },
  reviewsList: { gap: 10 },
  reviewItem: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  reviewStars: { color: "#FB6D00", fontSize: 12, fontWeight: "800" },
  reviewNick: { fontSize: 13, fontWeight: "700" },
  reviewBody: { fontSize: 13, lineHeight: 18 },
  reviewDate: { fontSize: 11, opacity: 0.55 },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 4,
  },
  pageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  pageText: { fontSize: 12, opacity: 0.7, fontWeight: "600" },
});

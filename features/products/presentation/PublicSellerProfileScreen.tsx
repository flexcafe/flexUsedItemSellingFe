import { FlexMarketLoader } from "@/components/flex-market-loader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { paddingTopInsideSafeAreaForLanguageSwitcher } from "@/constants/language-switcher-layout";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  BlockUserModal,
  type BlockUserTarget,
} from "@/presentation/components/BlockUserModal";
import {
  ContentReportModal,
  type ContentReportTarget,
} from "@/presentation/components/ContentReportModal";
import { ReferralCodeBlock } from "@/presentation/components/ReferralCodeBlock";
import {
  usePublicUserProfile,
  useSellerReviews,
} from "@/presentation/hooks/useClientProducts";
import {
  uiCardShadow,
  uiCardSurface,
  uiSectionEnter,
} from "@/presentation/lib/uiAnimations";
import { useAuth } from "@/presentation/providers/AuthProvider";
import {
  useLocale,
  userRankLabelKey,
} from "@/presentation/providers/LocaleProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
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

import { formatListingDate } from "./myProductDetailHelpers";

type Props = { userId: string };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SECTION_STAGGER_MS = 48;
const SUCCESS = "#16a34a";
const STAR = "#FB6D00";
const CARD_SHADOW = {
  iosOffsetLight: 8,
  iosOffsetDark: 10,
  iosOpacityLight: 0.12,
  iosOpacityDark: 0.38,
  iosRadiusLight: 16,
  iosRadiusDark: 18,
  androidElevationLight: 5,
  androidElevationDark: 8,
} as const;

function staggerEnter(delay: number, reduceMotion: boolean | null) {
  return uiSectionEnter(delay, reduceMotion, {
    direction: "up",
    duration: 420,
    damping: 18,
    stiffness: 220,
  });
}

function StarRow({
  value,
  size = 14,
  color = STAR,
}: {
  value: number;
  size?: number;
  color?: string;
}) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <View style={styles.starRow}>
      {([1, 2, 3, 4, 5] as const).map((star) => (
        <MaterialIcons
          key={star}
          name={star <= filled ? "star" : "star-border"}
          size={size}
          color={star <= filled ? color : color + "66"}
        />
      ))}
    </View>
  );
}

const SectionCard = memo(function SectionCard({
  title,
  icon,
  tint,
  surface,
  borderColor,
  scheme,
  enterDelay = 0,
  trailing,
  children,
}: {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  tint: string;
  surface: string;
  borderColor: string;
  scheme: "light" | "dark";
  enterDelay?: number;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View entering={staggerEnter(enterDelay, reduceMotion)}>
      <View
        style={[
          styles.sectionCard,
          uiCardShadow(scheme, CARD_SHADOW),
          { backgroundColor: surface, borderColor },
        ]}
      >
        <View style={styles.sectionHeader}>
          <View
            style={[styles.sectionIconWrap, { backgroundColor: tint + "18" }]}
          >
            <MaterialIcons name={icon} size={18} color={tint} />
          </View>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {title}
          </ThemedText>
          {trailing}
        </View>
        {children}
      </View>
    </Animated.View>
  );
});

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
  const { isAuthenticated, user } = useAuth();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const reduceMotion = useReducedMotion();
  const backPressed = useSharedValue(0);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [reviewItems, setReviewItems] = useState<
    NonNullable<ReturnType<typeof useSellerReviews>["data"]>["items"]
  >([]);
  const [reportTarget, setReportTarget] = useState<ContentReportTarget | null>(
    null,
  );
  const [blockTarget, setBlockTarget] = useState<BlockUserTarget | null>(null);

  const profileQuery = usePublicUserProfile(userId);
  const reviewsQuery = useSellerReviews(reviewsOpen ? userId : null, {
    page,
    limit: 20,
  });
  const profile = profileQuery.data;
  const isOwnProfile = Boolean(user?.id && user.id === userId);
  const regionLabel = profile?.region?.trim() || "";
  const hasVerifiedRegion = regionLabel.length > 0;

  const surface = uiCardSurface(scheme);
  const borderColor = colors.icon + "22";
  const isRefreshing =
    profileQuery.isRefetching ||
    (reviewsOpen && reviewsQuery.isRefetching && page <= 1);

  useEffect(() => {
    setReviewsOpen(false);
    setPage(1);
    setReviewItems([]);
  }, [userId]);

  useEffect(() => {
    if (!reviewsOpen) {
      setPage(1);
      setReviewItems([]);
    }
  }, [reviewsOpen]);

  useEffect(() => {
    if (!reviewsQuery.data) return;
    if (page <= 1) {
      setReviewItems(reviewsQuery.data.items ?? []);
      return;
    }
    setReviewItems((prev) => {
      const seen = new Set(prev.map((item) => item.id));
      const appended = (reviewsQuery.data?.items ?? []).filter(
        (item) => !seen.has(item.id),
      );
      return [...prev, ...appended];
    });
  }, [page, reviewsQuery.data]);

  const sortedBreakdown = useMemo(() => {
    const byStar = new Map(
      (reviewsQuery.data?.starBreakdown ?? []).map((row) => [
        row.stars,
        row.count,
      ]),
    );
    return ([5, 4, 3, 2, 1] as const).map((stars) => ({
      stars,
      count: byStar.get(stars) ?? 0,
    }));
  }, [reviewsQuery.data?.starBreakdown]);

  const maxReviewCount = useMemo(
    () => Math.max(1, ...sortedBreakdown.map((row) => row.count)),
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

  const refresh = useCallback(() => {
    void profileQuery.refetch();
    if (reviewsOpen) {
      if (page !== 1) setPage(1);
      else void reviewsQuery.refetch();
    }
  }, [page, profileQuery, reviewsOpen, reviewsQuery]);

  const openContentReport = useCallback(
    (target: ContentReportTarget) => {
      if (!isAuthenticated) {
        Alert.alert(
          t("contentReportLoginRequiredTitle"),
          t("contentReportLoginRequiredBody"),
        );
        return;
      }
      void Haptics.selectionAsync();
      setReportTarget(target);
    },
    [isAuthenticated, t],
  );

  const openBlockUser = useCallback(() => {
    if (!isAuthenticated) {
      Alert.alert(
        t("userBlockLoginRequiredTitle"),
        t("userBlockLoginRequiredBody"),
      );
      return;
    }
    if (isOwnProfile) {
      Alert.alert(t("errorTitle"), t("userBlockCannotSelf"));
      return;
    }
    void Haptics.selectionAsync();
    setBlockTarget({
      userId,
      displayName: profile?.nickname ?? null,
    });
  }, [isAuthenticated, isOwnProfile, profile?.nickname, t, userId]);

  return (
    <ThemedView style={styles.safe}>
      <ThemedView style={styles.container}>
        <View
          style={[
            styles.topBar,
            {
              backgroundColor: colors.tint,
              paddingTop: paddingTopInsideSafeAreaForLanguageSwitcher(),
            },
          ]}
        >
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
            style={[styles.iconButton, backAnimStyle]}
            accessibilityRole="button"
            accessibilityLabel={t("publicProfileTitle")}
          >
            <MaterialIcons name="arrow-back" size={20} color="#FFF" />
          </AnimatedPressable>
          <ThemedText type="screenTitle" style={styles.topTitle}>
            {t("publicProfileTitle")}
          </ThemedText>
          <View style={styles.topActions}>
            {!isOwnProfile ? (
              <Pressable
                onPress={openBlockUser}
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel={t("userBlockAction")}
              >
                <MaterialIcons name="block" size={20} color="#FFF" />
              </Pressable>
            ) : (
              <View style={styles.iconButton} />
            )}
            <Pressable
              onPress={() =>
                openContentReport({
                  targetType: "USER_PROFILE",
                  targetId: userId,
                })
              }
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel={t("contentReportAction")}
            >
              <MaterialIcons name="flag" size={20} color="#FFF" />
            </Pressable>
          </View>
        </View>

        {profileQuery.isLoading ? (
          <Animated.View
            entering={reduceMotion ? undefined : FadeIn.duration(280)}
            style={styles.centeredFull}
          >
            <FlexMarketLoader size="md" showText={false} />
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
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing && !profileQuery.isLoading}
                onRefresh={refresh}
                tintColor={colors.tint}
                colors={[colors.tint]}
              />
            }
          >
            <Animated.View
              entering={staggerEnter(0, reduceMotion)}
              style={[
                styles.identityCard,
                uiCardShadow(scheme, CARD_SHADOW),
                { backgroundColor: surface, borderColor },
              ]}
            >
              <View style={styles.identityTop}>
                <View
                  style={[
                    styles.avatarRing,
                    { borderColor: colors.tint + "55" },
                  ]}
                >
                  {profile.avatar ? (
                    <Image
                      source={{ uri: profile.avatar }}
                      style={[
                        styles.avatar,
                        { backgroundColor: colors.icon + "1f" },
                      ]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        styles.avatarFallback,
                        { backgroundColor: colors.tint + "18" },
                      ]}
                    >
                      <MaterialIcons
                        name="person"
                        size={36}
                        color={colors.tint}
                      />
                    </View>
                  )}
                </View>
                <View style={styles.identityCopy}>
                  <ThemedText type="defaultSemiBold" style={styles.sellerName}>
                    {profile.nickname}
                  </ThemedText>
                  <View
                    style={[
                      styles.rankPill,
                      { backgroundColor: colors.tint + "18" },
                    ]}
                  >
                    <MaterialIcons
                      name="emoji-events"
                      size={12}
                      color={colors.tint}
                    />
                    <ThemedText
                      style={[styles.rankPillText, { color: colors.tint }]}
                    >
                      {t(userRankLabelKey(profile.currentRank))}
                    </ThemedText>
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.ratingPanel,
                  { backgroundColor: colors.tint + "0C" },
                ]}
              >
                <ThemedText style={[styles.ratingAvg, { color: colors.tint }]}>
                  {profile.averageStars.toFixed(1)}
                </ThemedText>
                <View style={styles.ratingCopy}>
                  <StarRow value={profile.averageStars} />
                  <ThemedText style={styles.sellerSub}>
                    {tf("publicProfileRatingSummary", {
                      avg: profile.averageStars.toFixed(1),
                      count: profile.totalReviews,
                    })}
                  </ThemedText>
                </View>
              </View>

              <View
                style={[
                  styles.regionChip,
                  {
                    backgroundColor: hasVerifiedRegion
                      ? SUCCESS + "14"
                      : colors.icon + "14",
                    borderColor: hasVerifiedRegion
                      ? SUCCESS + "44"
                      : colors.icon + "33",
                  },
                ]}
              >
                <MaterialIcons
                  name={hasVerifiedRegion ? "verified" : "place"}
                  size={16}
                  color={hasVerifiedRegion ? SUCCESS : colors.icon}
                />
                <ThemedText
                  style={[
                    styles.regionChipText,
                    hasVerifiedRegion
                      ? styles.sellerRegionVerified
                      : { color: colors.icon },
                  ]}
                  numberOfLines={2}
                >
                  {hasVerifiedRegion
                    ? tf("publicProfileRegion", { region: regionLabel })
                    : t("publicProfileRegionUnverified")}
                </ThemedText>
              </View>
            </Animated.View>

            {profile.referralCode?.trim() ? (
              <Animated.View
                entering={staggerEnter(SECTION_STAGGER_MS * 0.75, reduceMotion)}
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

            <SectionCard
              title={t("publicProfileStatsSection")}
              icon="insights"
              tint={colors.tint}
              surface={surface}
              borderColor={borderColor}
              scheme={scheme}
              enterDelay={SECTION_STAGGER_MS}
            >
              <View style={styles.statsRow}>
                <View
                  style={[
                    styles.statItem,
                    { backgroundColor: colors.tint + "0C" },
                  ]}
                >
                  <View
                    style={[
                      styles.statIconWrap,
                      { backgroundColor: colors.tint + "18" },
                    ]}
                  >
                    <MaterialIcons name="store" size={18} color={colors.tint} />
                  </View>
                  <ThemedText
                    style={[styles.statValue, { color: colors.tint }]}
                  >
                    {profile.completedSales}
                  </ThemedText>
                  <ThemedText style={styles.statLabel}>
                    {t("rewardCompletedSales")}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.statItem,
                    { backgroundColor: colors.tint + "0C" },
                  ]}
                >
                  <View
                    style={[
                      styles.statIconWrap,
                      { backgroundColor: colors.tint + "18" },
                    ]}
                  >
                    <MaterialIcons
                      name="shopping-cart"
                      size={18}
                      color={colors.tint}
                    />
                  </View>
                  <ThemedText
                    style={[styles.statValue, { color: colors.tint }]}
                  >
                    {profile.completedPurchases}
                  </ThemedText>
                  <ThemedText style={styles.statLabel}>
                    {t("rewardCompletedPurchases")}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.statItem,
                    { backgroundColor: colors.tint + "0C" },
                  ]}
                >
                  <View
                    style={[
                      styles.statIconWrap,
                      { backgroundColor: colors.tint + "18" },
                    ]}
                  >
                    <MaterialIcons
                      name="event"
                      size={18}
                      color={colors.tint}
                    />
                  </View>
                  <ThemedText style={styles.statValue}>
                    {profile.memberSince
                      ? formatListingDate(profile.memberSince, locale)
                      : "—"}
                  </ThemedText>
                  <ThemedText style={styles.statLabel}>
                    {t("publicProfileMemberSince")}
                  </ThemedText>
                </View>
              </View>
            </SectionCard>

            {!reviewsOpen ? (
              <AnimatedPressable
                entering={staggerEnter(SECTION_STAGGER_MS * 2, reduceMotion)}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setReviewsOpen(true);
                }}
                style={[styles.reviewsBtn, { backgroundColor: colors.tint }]}
                accessibilityRole="button"
                accessibilityLabel={t("publicDetailSellerReviews")}
              >
                <MaterialIcons name="star" size={16} color="#FFF" />
                <ThemedText style={styles.reviewsBtnText}>
                  {tf("publicProfileViewReviews", {
                    count: profile.totalReviews,
                  })}
                </ThemedText>
              </AnimatedPressable>
            ) : (
              <>
                <SectionCard
                  title={t("publicProfileReviewsSection")}
                  icon="star"
                  tint={colors.tint}
                  surface={surface}
                  borderColor={borderColor}
                  scheme={scheme}
                  enterDelay={SECTION_STAGGER_MS * 2}
                  trailing={
                    <ThemedText style={styles.sectionTrailing}>
                      {profile.totalReviews}
                    </ThemedText>
                  }
                >
                  {reviewsQuery.isLoading && page <= 1 ? (
                    <View style={styles.centered}>
                      <FlexMarketLoader size="md" />
                    </View>
                  ) : (
                    sortedBreakdown.map((row) => (
                      <ReviewBar
                        key={`b-${row.stars}`}
                        stars={row.stars}
                        count={row.count}
                        tint={colors.tint}
                        maxCount={maxReviewCount}
                      />
                    ))
                  )}
                </SectionCard>

                {reviewsQuery.isLoading && page <= 1 ? null : reviewItems.length ===
                  0 ? (
                  <View
                    style={[
                      styles.emptyReviews,
                      uiCardShadow(scheme, CARD_SHADOW),
                      { backgroundColor: surface, borderColor },
                    ]}
                  >
                    <MaterialIcons
                      name="rate-review"
                      size={28}
                      color={colors.icon}
                    />
                    <ThemedText style={styles.emptyReviewsText}>
                      {t("publicProfileNoReviews")}
                    </ThemedText>
                  </View>
                ) : (
                  <View style={styles.reviewsList}>
                    {reviewItems.map((item, idx) => (
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
                          uiCardShadow(scheme, CARD_SHADOW),
                          { backgroundColor: surface, borderColor },
                        ]}
                      >
                        <View style={styles.reviewItemHeader}>
                          <View style={styles.reviewerRow}>
                            {item.reviewerAvatar ? (
                              <Image
                                source={{ uri: item.reviewerAvatar }}
                                style={[
                                  styles.reviewerAvatar,
                                  { backgroundColor: colors.icon + "1f" },
                                ]}
                              />
                            ) : (
                              <View
                                style={[
                                  styles.reviewerAvatar,
                                  styles.avatarFallback,
                                  { backgroundColor: colors.tint + "18" },
                                ]}
                              >
                                <MaterialIcons
                                  name="person"
                                  size={16}
                                  color={colors.tint}
                                />
                              </View>
                            )}
                            <View style={styles.reviewerCopy}>
                              <ThemedText style={styles.reviewNick}>
                                {item.reviewerNickname ?? "—"}
                              </ThemedText>
                              <StarRow value={item.stars} size={12} />
                            </View>
                          </View>
                          <Pressable
                            onPress={() =>
                              openContentReport({
                                targetType: "REVIEW",
                                targetId: item.id,
                              })
                            }
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={t("contentReportAction")}
                          >
                            <MaterialIcons
                              name="flag"
                              size={18}
                              color={colors.icon}
                            />
                          </Pressable>
                        </View>
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
                    {reviewsQuery.data?.hasNextPage ? (
                      <Pressable
                        onPress={() => {
                          void Haptics.selectionAsync();
                          setPage((p) => p + 1);
                        }}
                        disabled={reviewsQuery.isFetching}
                        style={[
                          styles.loadMoreBtn,
                          { borderColor: colors.tint },
                          reviewsQuery.isFetching && { opacity: 0.6 },
                        ]}
                      >
                        {reviewsQuery.isFetching && page > 1 ? (
                          <FlexMarketLoader
                            variant="inline"
                            size="xs"
                            showText={false}
                          />
                        ) : (
                          <ThemedText
                            style={[
                              styles.loadMoreText,
                              { color: colors.tint },
                            ]}
                          >
                            {t("publicDetailLoadMoreReviews")}
                          </ThemedText>
                        )}
                      </Pressable>
                    ) : null}
                  </View>
                )}
              </>
            )}
          </Animated.ScrollView>
        )}
      </ThemedView>
      <ContentReportModal
        visible={reportTarget != null}
        target={reportTarget}
        onClose={() => setReportTarget(null)}
      />
      <BlockUserModal
        visible={blockTarget != null}
        target={blockTarget}
        onClose={() => setBlockTarget(null)}
        onBlocked={() => {
          if (router.canGoBack()) router.back();
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  topBar: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  topTitle: { color: "#FFF" },
  centeredFull: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 20,
  },
  loadingText: { opacity: 0.65 },
  content: { padding: 12, gap: 14, paddingBottom: 32 },
  identityCard: {
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  identityTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: 74, height: 74, borderRadius: 37 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  identityCopy: { flex: 1, gap: 8, minWidth: 0 },
  sellerName: { fontSize: 20, fontWeight: "800" },
  rankPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  rankPillText: { fontSize: 11, fontWeight: "800" },
  ratingPanel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ratingAvg: { fontSize: 28, fontWeight: "800", minWidth: 52 },
  ratingCopy: { flex: 1, gap: 4, minWidth: 0 },
  starRow: { flexDirection: "row", alignItems: "center", gap: 1 },
  sellerSub: { fontSize: 12, opacity: 0.72, lineHeight: 17 },
  regionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  regionChipText: { flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 18 },
  sellerRegionVerified: {
    color: SUCCESS,
    opacity: 1,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 15, flex: 1 },
  sectionTrailing: { fontSize: 13, fontWeight: "800", opacity: 0.7 },
  statsRow: { flexDirection: "row", gap: 8 },
  statItem: {
    flex: 1,
    minHeight: 104,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 10,
    gap: 6,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 10,
    opacity: 0.65,
    textAlign: "center",
    lineHeight: 13,
  },
  statValue: { fontSize: 13, fontWeight: "800", textAlign: "center" },
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
  emptyReviews: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  emptyReviewsText: { fontSize: 13, opacity: 0.7, textAlign: "center" },
  reviewsBtn: {
    minHeight: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  reviewsBtnText: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  reviewsList: { gap: 10 },
  reviewItem: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  reviewItemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  reviewerRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  reviewerAvatar: { width: 36, height: 36, borderRadius: 18 },
  reviewerCopy: { flex: 1, gap: 3, minWidth: 0 },
  reviewNick: { fontSize: 13, fontWeight: "700" },
  reviewBody: { fontSize: 13, lineHeight: 18 },
  reviewDate: { fontSize: 11, opacity: 0.55 },
  loadMoreBtn: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  loadMoreText: { fontSize: 13, fontWeight: "800" },
});

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  usePublicUserProfile,
  useSellerReviews,
} from "@/presentation/hooks/useClientProducts";
import {
  useLocale,
  userRankLabelKey,
} from "@/presentation/providers/LocaleProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatListingDate } from "./myProductDetailHelpers";

type Props = {
  userId: string;
};

export function PublicSellerProfileScreen({ userId }: Props) {
  const router = useRouter();
  const { t, tf, locale } = useLocale();
  const colors = Colors[useColorScheme() ?? "light"];
  const [page, setPage] = useState(1);

  const profileQuery = usePublicUserProfile(userId);
  const reviewsQuery = useSellerReviews(userId, { page, limit: 20 });
  const profile = profileQuery.data;

  const sortedBreakdown = useMemo(
    () => [...(reviewsQuery.data?.starBreakdown ?? [])].sort((a, b) => b.stars - a.stars),
    [reviewsQuery.data?.starBreakdown],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <View style={[styles.topBar, { backgroundColor: colors.tint }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={20} color="#FFF" />
          </Pressable>
          <ThemedText style={styles.topTitle}>{t("publicProfileTitle")}</ThemedText>
          <View style={styles.backButton} />
        </View>

        {profileQuery.isLoading ? (
          <View style={styles.centeredFull}>
            <ActivityIndicator color={colors.tint} size="large" />
            <ThemedText style={styles.loadingText}>{t("productsDetailLoading")}</ThemedText>
          </View>
        ) : !profile ? (
          <View style={styles.centeredFull}>
            <ThemedText>{t("productsDetailNoData")}</ThemedText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.sellerCard}>
              <Image
                source={profile.avatar ? { uri: profile.avatar } : undefined}
                style={[styles.avatar, { backgroundColor: colors.icon + "1f" }]}
              />
              <View style={styles.sellerCopy}>
                <ThemedText type="defaultSemiBold" style={styles.sellerName}>
                  {profile.nickname}
                </ThemedText>
                <ThemedText style={styles.sellerSub}>
                  {t(userRankLabelKey(profile.currentRank))}
                </ThemedText>
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
            </View>

            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <ThemedText style={styles.statLabel}>{t("rewardCompletedSales")}</ThemedText>
                <ThemedText style={styles.statValue}>{profile.completedSales}</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statLabel}>{t("rewardCompletedPurchases")}</ThemedText>
                <ThemedText style={styles.statValue}>{profile.completedPurchases}</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statLabel}>{t("publicProfileMemberSince")}</ThemedText>
                <ThemedText style={styles.statValue}>
                  {profile.memberSince
                    ? formatListingDate(profile.memberSince, locale)
                    : "—"}
                </ThemedText>
              </View>
            </View>

            <View style={styles.breakdownCard}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                {t("publicProfileReviewsSection")}
              </ThemedText>
              {sortedBreakdown.map((row) => (
                <View key={`b-${row.stars}`} style={styles.breakdownRow}>
                  <ThemedText style={styles.breakdownStars}>{row.stars}★</ThemedText>
                  <View style={styles.breakdownTrack}>
                    <View
                      style={[
                        styles.breakdownFill,
                        {
                          width: `${Math.min(100, row.count * 12)}%`,
                          backgroundColor: colors.tint,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText style={styles.breakdownCount}>{row.count}</ThemedText>
                </View>
              ))}
            </View>

            {reviewsQuery.isLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator color={colors.tint} />
              </View>
            ) : (
              <View style={styles.reviewsList}>
                {(reviewsQuery.data?.items ?? []).map((item) => (
                  <View key={item.id} style={styles.reviewItem}>
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
                      {item.createdAt ? formatListingDate(item.createdAt, locale) : "—"}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.paginationRow}>
              <Pressable
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={[styles.pageBtn, page <= 1 && { opacity: 0.5 }]}
              >
                <ThemedText>{t("publicProfilePrev")}</ThemedText>
              </Pressable>
              <ThemedText style={styles.pageText}>
                {tf("publicProfilePage", { page: reviewsQuery.data?.page ?? page })}
              </ThemedText>
              <Pressable
                onPress={() => setPage((p) => p + 1)}
                disabled={!reviewsQuery.data?.hasNextPage}
                style={[styles.pageBtn, !reviewsQuery.data?.hasNextPage && { opacity: 0.5 }]}
              >
                <ThemedText>{t("publicProfileNext")}</ThemedText>
              </Pressable>
            </View>
          </ScrollView>
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
    gap: 10,
    padding: 20,
  },
  loadingText: { opacity: 0.65 },
  content: { padding: 12, gap: 12 },
  sellerCard: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFF",
  },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  sellerCopy: { flex: 1, gap: 3 },
  sellerName: { fontSize: 17 },
  sellerSub: { fontSize: 12, opacity: 0.7 },
  breakdownCard: { padding: 12, borderRadius: 14, backgroundColor: "#FFF", gap: 8 },
  sectionTitle: { fontSize: 14, marginBottom: 2 },
  statsCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFF",
    flexDirection: "row",
    gap: 8,
  },
  statItem: {
    flex: 1,
    minHeight: 64,
    borderRadius: 10,
    backgroundColor: "rgba(120,120,120,0.08)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    gap: 4,
  },
  statLabel: { fontSize: 11, opacity: 0.6, textAlign: "center" },
  statValue: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  breakdownStars: { width: 24, fontSize: 12, fontWeight: "700" },
  breakdownTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(120,120,120,0.25)",
    overflow: "hidden",
  },
  breakdownFill: { height: "100%" },
  breakdownCount: { width: 26, textAlign: "right", fontSize: 12, opacity: 0.7 },
  centered: { paddingVertical: 16, alignItems: "center" },
  reviewsList: { gap: 10 },
  reviewItem: { padding: 12, borderRadius: 12, backgroundColor: "#FFF", gap: 4 },
  reviewStars: { color: "#FB6D00", fontSize: 12, fontWeight: "800" },
  reviewNick: { fontSize: 13, fontWeight: "700" },
  reviewBody: { fontSize: 13, lineHeight: 18 },
  reviewDate: { fontSize: 11, opacity: 0.55 },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 8,
  },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FFF",
  },
  pageText: { fontSize: 12, opacity: 0.7 },
});

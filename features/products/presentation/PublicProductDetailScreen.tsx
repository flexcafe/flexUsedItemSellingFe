import { ProductListingThumbnail } from "@/components/product-listing-thumbnail";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  useClientProductDetail,
  useSellerReviews,
} from "@/presentation/hooks/useClientProducts";
import { buildLeafletStaticViewHtml } from "@/presentation/lib/leafletPickerHtml";
import {
  formatProductConditionForDisplay,
  productStatusLabelKey,
  useLocale,
} from "@/presentation/providers/LocaleProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { memo, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import {
  formatCoordinates,
  formatListingDate,
  parsePreferredLocations,
  productImageUrls,
} from "./myProductDetailHelpers";
import { parseProductStatus, statusBadgeColors } from "./myProductStatus";

type Props = { productId: string };

function paymentMethodLabel(method: string, t: ReturnType<typeof useLocale>["t"]) {
  const v = method.toUpperCase();
  if (v === "CASH") return t("productsPaymentCash");
  if (v === "KBZPAY") return t("productsPaymentKbzpay");
  return method;
}

const ReviewRow = memo(function ReviewRow({
  stars,
  count,
  tint,
}: {
  stars: number;
  count: number;
  tint: string;
}) {
  return (
    <View style={styles.reviewBreakdownRow}>
      <ThemedText style={styles.reviewBreakdownStar}>{stars}★</ThemedText>
      <View style={styles.reviewBreakdownBarTrack}>
        <View
          style={[
            styles.reviewBreakdownBarFill,
            { backgroundColor: tint, width: `${Math.min(100, count * 12)}%` },
          ]}
        />
      </View>
      <ThemedText style={styles.reviewBreakdownCount}>{count}</ThemedText>
    </View>
  );
});

const InfoRow = memo(function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <MaterialIcons name={icon} size={16} color="#FB6D00" />
      <View style={styles.infoCopy}>
        <ThemedText style={styles.infoLabel}>{label}</ThemedText>
        <ThemedText style={styles.infoValue}>{value || "—"}</ThemedText>
      </View>
    </View>
  );
});

export function PublicProductDetailScreen({ productId }: Props) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];

  const detailQuery = useClientProductDetail(productId);
  const product = detailQuery.data;
  const sellerUserId = product?.seller?.userId ?? null;

  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewItems, setReviewItems] = useState<
    NonNullable<ReturnType<typeof useSellerReviews>["data"]>["items"]
  >([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const reviewsQuery = useSellerReviews(reviewsOpen ? sellerUserId : null, {
    page: reviewsPage,
    limit: 20,
  });

  const images = useMemo(() => (product ? productImageUrls(product) : []), [product]);
  const preferred = useMemo(
    () => (product ? parsePreferredLocations(product.preferredLocations) : []),
    [product],
  );

  const hasCoordinates =
    product?.directTradeLatitude != null && product.directTradeLongitude != null;

  const mapHtml = useMemo(() => {
    if (
      product?.directTradeLatitude == null ||
      product.directTradeLongitude == null
    ) {
      return "";
    }
    return buildLeafletStaticViewHtml(
      product.directTradeLatitude,
      product.directTradeLongitude,
    );
  }, [product?.directTradeLatitude, product?.directTradeLongitude]);

  useEffect(() => {
    if (!reviewsOpen) {
      setReviewsPage(1);
      setReviewItems([]);
    }
  }, [reviewsOpen]);

  useEffect(() => {
    if (!reviewsQuery.data) return;
    if (reviewsPage <= 1) {
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
  }, [reviewsPage, reviewsQuery.data]);

  if (detailQuery.isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={styles.loadingText}>{t("productsDetailLoading")}</ThemedText>
      </ThemedView>
    );
  }

  if (!product) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{t("productsDetailNoData")}</ThemedText>
      </ThemedView>
    );
  }

  const status = parseProductStatus(product.status, product.isAvailable);
  const statusBadge = statusBadgeColors(status, scheme);
  const rank = product.seller?.currentRank?.trim() || "NEWBIE";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <Animated.ScrollView
          entering={FadeIn.duration(220)}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.duration(340)} style={styles.mapCard}>
            <View style={[styles.topBar, { backgroundColor: colors.tint }]}>
              <Pressable onPress={() => router.back()} style={styles.backButton}>
                <MaterialIcons name="arrow-back" size={20} color="#FFF" />
              </Pressable>
              <ThemedText style={styles.topTitle} numberOfLines={1}>
                {t("productsModalDetailTitle")}
              </ThemedText>
              <View style={styles.idBadge}>
                <ThemedText style={styles.idBadgeText}>#{product.id.slice(-6)}</ThemedText>
              </View>
            </View>

            {hasCoordinates ? (
              <WebView
                source={{ html: mapHtml }}
                style={styles.mapView}
                scrollEnabled={false}
                pointerEvents="none"
                originWhitelist={["*"]}
              />
            ) : product.mapScreenshotUrl ? (
              <Pressable onPress={() => setSelectedImage(product.mapScreenshotUrl ?? null)}>
                <Image
                  source={{ uri: product.mapScreenshotUrl }}
                  style={styles.mapView}
                  contentFit="cover"
                />
              </Pressable>
            ) : (
              <ProductListingThumbnail imageUrl={null} size={240} borderRadius={0} />
            )}

            <View style={styles.locationOverlay}>
              <MaterialIcons name="place" size={15} color="#FFF" />
              <ThemedText style={styles.locationOverlayText} numberOfLines={1}>
                {product.directTradeLocation ?? "—"}
              </ThemedText>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(360).delay(40)} style={styles.sectionCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesRow}>
              {images.length > 0 ? (
                images.map((uri) => (
                  <Pressable key={uri} onPress={() => setSelectedImage(uri)}>
                    <Image source={{ uri }} style={styles.thumb} contentFit="cover" transition={220} />
                  </Pressable>
                ))
              ) : (
                <ProductListingThumbnail imageUrl={null} size={88} borderRadius={10} />
              )}
            </ScrollView>
            <View style={styles.titleRow}>
              <ThemedText type="defaultSemiBold" style={styles.name}>
                {product.name}
              </ThemedText>
              <View style={[styles.statusChip, { backgroundColor: statusBadge.backgroundColor }]}>
                <ThemedText style={[styles.statusChipText, { color: statusBadge.color }]}>
                  {t(productStatusLabelKey(status))}
                </ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.price, { color: colors.tint }]}>
              {product.price.toLocaleString()} MMK
            </ThemedText>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(380).delay(80)} style={styles.sectionCard}>
            <View style={styles.sellerTop}>
              <Pressable
                style={styles.sellerProfileWrap}
                onPress={() => {
                  if (!product.seller?.userId) return;
                  router.push({
                    pathname: "/seller/[userId]",
                    params: { userId: product.seller.userId },
                  });
                }}
              >
                <Image
                  source={product.seller?.avatar ? { uri: product.seller.avatar } : undefined}
                  style={[styles.avatar, { backgroundColor: colors.icon + "1f" }]}
                />
                <View style={styles.sellerCopy}>
                  <ThemedText type="defaultSemiBold">{product.seller?.nickname ?? "—"}</ThemedText>
                  <ThemedText style={styles.sellerRank}>{rank}</ThemedText>
                  <ThemedText style={styles.sellerMeta}>
                    ★ {(product.seller?.averageStars ?? 0).toFixed(1)} · {product.seller?.totalReviews ?? 0}
                  </ThemedText>
                  <ThemedText style={[styles.sellerViewLink, { color: colors.tint }]}>
                    {t("publicDetailViewSeller")}
                  </ThemedText>
                </View>
              </Pressable>
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setReviewsOpen(true);
                }}
                style={[styles.reviewsBtn, { backgroundColor: colors.tint }]}
              >
                <MaterialIcons name="star" size={14} color="#FFF" />
                <ThemedText style={styles.reviewsBtnText}>{t("publicDetailSellerReviews")}</ThemedText>
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(400).delay(120)} style={styles.sectionCard}>
            <ThemedText type="defaultSemiBold">{t("productsDetailSectionTrade")}</ThemedText>
            <InfoRow icon="place" label={t("productsFieldDirectLocation")} value={product.directTradeLocation ?? "—"} />
            {preferred.map((loc, idx) => (
              <InfoRow
                key={`${loc.label}-${idx}`}
                icon="location-on"
                label={`${t("productsFieldPreferredLocationItem")} ${idx + 1}`}
                value={`${loc.label}${loc.address ? ` (${loc.address})` : ""}`}
              />
            ))}
            <InfoRow icon="schedule" label={t("productsFieldPreferredTradeTime")} value={product.preferredTradeTime ?? "—"} />
            {hasCoordinates ? (
              <InfoRow
                icon="my-location"
                label={t("productsDetailCoordinates")}
                value={formatCoordinates(product.directTradeLatitude, product.directTradeLongitude) ?? "—"}
              />
            ) : null}
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(420).delay(160)} style={styles.sectionCard}>
            <ThemedText type="defaultSemiBold">{t("productsFieldPaymentMethods")}</ThemedText>
            <View style={styles.chipsWrap}>
              {(product.paymentMethods ?? []).map((m) => (
                <View key={m} style={[styles.methodChip, { borderColor: colors.tint + "40" }]}>
                  <MaterialIcons name="check-circle" size={14} color={colors.tint} />
                  <ThemedText style={styles.methodChipText}>{paymentMethodLabel(m, t)}</ThemedText>
                </View>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(440).delay(190)} style={styles.sectionCard}>
            <ThemedText type="defaultSemiBold">{t("productsDetailSectionDelivery")}</ThemedText>
            <InfoRow
              icon="local-shipping"
              label={t("productsFieldDelivery")}
              value={product.isDeliveryAvailable ? t("productsDeliveryOn") : t("productsDeliveryOff")}
            />
            <InfoRow
              icon="payments"
              label={t("productsFieldDeliveryFeePayer")}
              value={
                product.deliveryFeePayer === "SELLER"
                  ? t("productsDeliverySellerPays")
                  : product.deliveryFeePayer === "BUYER"
                    ? t("productsDeliveryBuyerPays")
                    : "—"
              }
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(460).delay(220)} style={styles.sectionCard}>
            <ThemedText type="defaultSemiBold">{t("productsDetailDescription")}</ThemedText>
            <ThemedText style={styles.description}>{product.description}</ThemedText>
            <InfoRow
              icon="access-time"
              label={t("productsDetailCreatedAt")}
              value={product.createdAtDisplay?.trim() || formatListingDate(product.createdAt, locale)}
            />
            <InfoRow
              icon="update"
              label={t("productsDetailUpdatedAt")}
              value={formatListingDate(product.updatedAt, locale)}
            />
            <InfoRow
              icon="category"
              label={t("productsFieldCondition")}
              value={formatProductConditionForDisplay(product.condition, t)}
            />
          </Animated.View>
        </Animated.ScrollView>

        <View style={[styles.chatBar, { borderTopColor: colors.icon + "22" }]}>
          <Pressable
            onPress={() => {
              if (!product.seller?.userId) {
                Alert.alert("Chat", t("publicDetailChatSoon"));
                return;
              }
              router.push({
                pathname: "/chat/[sellerId]",
                params: {
                  sellerId: product.seller.userId,
                  productId: product.id,
                  productName: product.name,
                  sellerName: product.seller.nickname ?? "",
                },
              });
            }}
            style={[styles.chatButton, { backgroundColor: colors.tint }]}
          >
            <MaterialIcons name="chat-bubble-outline" size={18} color="#FFF" />
            <ThemedText style={styles.chatButtonText}>{t("publicDetailChatSeller")}</ThemedText>
          </Pressable>
        </View>

        <Modal visible={reviewsOpen} transparent animationType="fade" onRequestClose={() => setReviewsOpen(false)}>
          <View style={styles.reviewsModalBackdrop}>
            <View style={[styles.reviewsModalCard, { backgroundColor: colors.background }]}>
              <View style={styles.reviewsHeader}>
                <ThemedText type="subtitle">{t("publicDetailSellerReviews")}</ThemedText>
                <Pressable onPress={() => setReviewsOpen(false)}>
                  <MaterialIcons name="close" size={22} color={colors.icon} />
                </Pressable>
              </View>

              {reviewsQuery.isLoading ? (
                <View style={styles.centeredBlock}>
                  <ActivityIndicator color={colors.tint} />
                </View>
              ) : reviewsQuery.data ? (
                <ScrollView style={styles.reviewsScroll}>
                  <View style={styles.reviewBreakdownWrap}>
                    {[...reviewsQuery.data.starBreakdown]
                      .sort((a, b) => b.stars - a.stars)
                      .map((row) => (
                        <ReviewRow key={`s-${row.stars}`} stars={row.stars} count={row.count} tint={colors.tint} />
                      ))}
                  </View>
                  {reviewItems.map((item) => (
                    <View key={item.id} style={styles.reviewItem}>
                      <ThemedText style={styles.reviewStars}>{"★".repeat(Math.max(1, item.stars))}</ThemedText>
                      <ThemedText style={styles.reviewNickname}>{item.reviewerNickname ?? "—"}</ThemedText>
                      <ThemedText style={styles.reviewComment}>{item.comment ?? "-"}</ThemedText>
                      <ThemedText style={styles.reviewDate}>
                        {item.createdAt ? formatListingDate(item.createdAt, locale) : "—"}
                      </ThemedText>
                    </View>
                  ))}
                  {reviewsQuery.data.hasNextPage ? (
                    <Pressable
                      onPress={() => setReviewsPage((p) => p + 1)}
                      disabled={reviewsQuery.isFetching}
                      style={[
                        styles.loadMoreBtn,
                        { borderColor: colors.tint },
                        reviewsQuery.isFetching && { opacity: 0.6 },
                      ]}
                    >
                      {reviewsQuery.isFetching ? (
                        <ActivityIndicator color={colors.tint} size="small" />
                      ) : (
                        <ThemedText style={[styles.loadMoreText, { color: colors.tint }]}>
                          {t("publicDetailLoadMoreReviews")}
                        </ThemedText>
                      )}
                    </Pressable>
                  ) : null}
                </ScrollView>
              ) : (
                <View style={styles.centeredBlock}>
                  <ThemedText>{t("productsDetailNoData")}</ThemedText>
                </View>
              )}
            </View>
          </View>
        </Modal>

        <Modal
          visible={selectedImage != null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
        >
          <View style={styles.imageViewerBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSelectedImage(null)}
            />
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={styles.imageViewerImage}
                contentFit="contain"
              />
            ) : null}
            <Pressable
              onPress={() => setSelectedImage(null)}
              style={styles.imageViewerClose}
            >
              <MaterialIcons name="close" size={24} color="#FFF" />
            </Pressable>
          </View>
        </Modal>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  loadingText: { opacity: 0.65 },
  content: { paddingBottom: 96, gap: 12 },
  mapCard: { marginHorizontal: 12, borderRadius: 20, overflow: "hidden", backgroundColor: "#FFF" },
  topBar: { height: 52, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 8 },
  backButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  topTitle: { color: "#FFF", fontSize: 18, fontWeight: "800", flex: 1, textAlign: "center" },
  idBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  idBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "800" },
  mapView: { width: "100%", height: 240 },
  locationOverlay: { position: "absolute", bottom: 10, left: 10, right: 10, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", gap: 6, alignItems: "center" },
  locationOverlayText: { color: "#FFF", flex: 1, fontSize: 12 },
  sectionCard: { marginHorizontal: 12, borderRadius: 16, padding: 12, gap: 10, backgroundColor: "#FFF" },
  imagesRow: { gap: 8, marginBottom: 10 },
  thumb: { width: 88, height: 88, borderRadius: 10 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  name: { flex: 1, fontSize: 20, lineHeight: 26 },
  statusChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusChipText: { fontSize: 11, fontWeight: "800" },
  price: { marginTop: 6, fontSize: 30, fontWeight: "900" },
  sellerTop: { gap: 10 },
  sellerProfileWrap: { flexDirection: "row", gap: 10 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  sellerCopy: { flex: 1, gap: 2 },
  sellerRank: { fontSize: 12, opacity: 0.7, fontWeight: "700" },
  sellerMeta: { fontSize: 12, opacity: 0.65 },
  sellerViewLink: { fontSize: 12, fontWeight: "700" },
  reviewsBtn: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 5 },
  reviewsBtnText: { color: "#FFF", fontWeight: "700", fontSize: 12 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  methodChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  methodChipText: { fontSize: 12, fontWeight: "700" },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoCopy: { flex: 1, minWidth: 0 },
  infoLabel: { fontSize: 11, opacity: 0.55 },
  infoValue: { fontSize: 14, lineHeight: 20 },
  description: { fontSize: 14, lineHeight: 21 },
  chatBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFF", paddingHorizontal: 12, paddingTop: 10, paddingBottom: 14, borderTopWidth: StyleSheet.hairlineWidth },
  chatButton: { borderRadius: 14, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  chatButtonText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  reviewsModalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.42)", justifyContent: "center", padding: 16 },
  reviewsModalCard: { borderRadius: 16, maxHeight: "80%", padding: 14 },
  reviewsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  reviewsScroll: { maxHeight: 480 },
  reviewBreakdownWrap: { gap: 8, marginBottom: 14 },
  reviewBreakdownRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  reviewBreakdownStar: { width: 26, fontSize: 12, fontWeight: "700" },
  reviewBreakdownBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: "rgba(120,120,120,0.22)", overflow: "hidden" },
  reviewBreakdownBarFill: { height: "100%", borderRadius: 4 },
  reviewBreakdownCount: { width: 28, textAlign: "right", fontSize: 12, opacity: 0.7 },
  reviewItem: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: "rgba(120,120,120,0.3)", paddingTop: 10, paddingBottom: 8, gap: 2 },
  reviewStars: { color: "#FB6D00", fontSize: 12, fontWeight: "700" },
  reviewNickname: { fontSize: 13, fontWeight: "700" },
  reviewComment: { fontSize: 13, lineHeight: 18 },
  reviewDate: { fontSize: 11, opacity: 0.55 },
  loadMoreBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreText: { fontSize: 13, fontWeight: "700" },
  centeredBlock: { paddingVertical: 24, alignItems: "center" },
  imageViewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  imageViewerImage: { width: "100%", height: "85%" },
  imageViewerClose: {
    position: "absolute",
    top: 44,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});

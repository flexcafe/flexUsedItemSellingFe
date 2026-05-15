import { ProductListingThumbnail } from "@/components/product-listing-thumbnail";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import type { Product } from "@/core/domain/entities/Product";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useProduct } from "@/presentation/hooks/useProducts";
import { buildLeafletStaticViewHtml } from "@/presentation/lib/leafletPickerHtml";
import {
  formatProductConditionForDisplay,
  productStatusLabelKey,
  useLocale,
} from "@/presentation/providers/LocaleProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInUp,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { WebView } from "react-native-webview";

import {
  formatCoordinates,
  formatListingDate,
  hasTradeCoordinates,
  parsePreferredLocations,
  productImageUrls,
} from "./myProductDetailHelpers";
import { parseProductStatus, statusBadgeColors } from "./myProductStatus";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const GALLERY_GAP = 10;
const GALLERY_HEIGHT = 196;
const SECTION_STAGGER_MS = 55;
const DOT_MIN_W = 6;
const DOT_MAX_W = 18;

function staggerEnter(delay: number, reduceMotion: boolean | null) {
  if (reduceMotion) return undefined;
  return FadeInUp.duration(420).delay(delay).springify().damping(18).stiffness(220);
}

const GalleryDot = memo(function GalleryDot({
  active,
  tint,
  muted,
}: {
  active: boolean;
  tint: string;
  muted: string;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    const target = active ? 1 : 0;
    if (reduceMotion) {
      progress.value = target;
      return;
    }
    progress.value = withSpring(target, { damping: 16, stiffness: 300, mass: 0.35 });
  }, [active, progress, reduceMotion]);

  const dotStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [DOT_MIN_W, DOT_MAX_W], Extrapolation.CLAMP),
    backgroundColor: interpolateColor(progress.value, [0, 1], [muted, tint]),
    opacity: interpolate(progress.value, [0, 1], [0.45, 1], Extrapolation.CLAMP),
  }));

  return <Animated.View style={[styles.dot, dotStyle]} />;
});

export type MyProductDetailSheetProps = {
  productId: string | null;
  visible: boolean;
  categoryLabelFor?: (product: Product) => string;
  onClose: () => void;
  onEdit: (product: Product) => void;
};

function paymentLabel(method: string, t: ReturnType<typeof useLocale>["t"]): string {
  const u = method.toUpperCase();
  if (u === "CASH") return t("productsPaymentCash");
  if (u === "KBZPAY") return t("productsPaymentKbzpay");
  return method;
}

function cardSurface(scheme: "light" | "dark") {
  return scheme === "dark" ? "#23272E" : "#F7F9FC";
}

const TagChip = memo(function TagChip({
  label,
  tint,
  muted,
}: {
  label: string;
  tint: string;
  muted?: boolean;
}) {
  return (
    <View
      style={[
        styles.tagChip,
        { backgroundColor: muted ? tint + "12" : tint + "1A", borderColor: tint + "35" },
      ]}
    >
      <ThemedText style={[styles.tagChipText, { color: tint }]} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
});

const DetailField = memo(function DetailField({
  icon,
  label,
  value,
  tint,
  iconColor,
  last,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  tint: string;
  iconColor: string;
  last?: boolean;
}) {
  const display = value?.trim() || "—";
  return (
    <View style={[styles.fieldRow, !last && styles.fieldRowBorder]}>
      <View style={[styles.fieldIconWrap, { backgroundColor: tint + "14" }]}>
        <MaterialIcons name={icon} size={17} color={iconColor} />
      </View>
      <View style={styles.fieldCopy}>
        <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
        <ThemedText style={styles.fieldValue} selectable>
          {display}
        </ThemedText>
      </View>
    </View>
  );
});

const SectionCard = memo(function SectionCard({
  title,
  icon,
  tint,
  surface,
  borderColor,
  enterDelay = 0,
  children,
}: {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  tint: string;
  surface: string;
  borderColor: string;
  enterDelay?: number;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View
      entering={staggerEnter(enterDelay, reduceMotion)}
      style={styles.sectionCardWrap}
    >
      <View style={[styles.sectionCard, { backgroundColor: surface, borderColor }]}>
        <View style={styles.sectionCardHeader}>
          <View style={[styles.sectionIconWrap, { backgroundColor: tint + "18" }]}>
            <MaterialIcons name={icon} size={18} color={tint} />
          </View>
          <ThemedText type="defaultSemiBold" style={styles.sectionCardTitle}>
            {title}
          </ThemedText>
        </View>
        {children}
      </View>
    </Animated.View>
  );
});

export const MyProductDetailSheet = memo(function MyProductDetailSheet({
  productId,
  visible,
  categoryLabelFor,
  onClose,
  onEdit,
}: MyProductDetailSheetProps) {
  const { t, tf, locale } = useLocale();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const { width } = useWindowDimensions();
  const detailQuery = useProduct(visible ? productId : null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const sheetProgress = useSharedValue(0);
  const closePressed = useSharedValue(0);
  const editPressed = useSharedValue(0);

  const product = detailQuery.data;
  const images = useMemo(() => (product ? productImageUrls(product) : []), [product]);
  const preferred = useMemo(
    () => (product ? parsePreferredLocations(product.preferredLocations) : []),
    [product],
  );

  const gallerySlideWidth = width - 32;
  const mapHtml = useMemo(() => {
    if (!product || !hasTradeCoordinates(product)) return "";
    return buildLeafletStaticViewHtml(
      product.directTradeLatitude!,
      product.directTradeLongitude!,
    );
  }, [product]);

  const categoryLabel =
    product && categoryLabelFor
      ? categoryLabelFor(product) || product.category
      : product?.category ?? "—";

  const surface = cardSurface(scheme);
  const borderColor = colors.icon + "20";

  const onGalleryScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const slide = gallerySlideWidth + GALLERY_GAP;
      if (slide <= 0) return;
      const idx = Math.round(e.nativeEvent.contentOffset.x / slide);
      setPhotoIndex(Math.min(Math.max(idx, 0), Math.max(images.length - 1, 0)));
    },
    [gallerySlideWidth, images.length],
  );

  useEffect(() => {
    setPhotoIndex(0);
  }, [productId, images.length]);

  useEffect(() => {
    if (!visible) {
      sheetProgress.value = 0;
      return;
    }
    if (reduceMotion) {
      sheetProgress.value = 1;
      return;
    }
    sheetProgress.value = withSpring(1, {
      damping: 24,
      stiffness: 280,
      mass: 0.42,
    });
  }, [reduceMotion, sheetProgress, visible]);

  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheetProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          sheetProgress.value,
          [0, 1],
          [480, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const closeAnimStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(closePressed.value, [0, 1], [1, 0.9], Extrapolation.CLAMP),
      },
    ],
  }));

  const editAnimStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(editPressed.value, [0, 1], [1, 0.97], Extrapolation.CLAMP),
      },
    ],
  }));

  const contentKey = product?.id ?? productId ?? "loading";

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, backdropAnimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        <Animated.View
          style={[styles.sheet, { backgroundColor: colors.background }, sheetAnimStyle]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.headerTitle} numberOfLines={1}>
              {product?.name ?? t("productsModalDetailTitle")}
            </ThemedText>
            <AnimatedPressable
              onPress={() => {
                void Haptics.selectionAsync();
                onClose();
              }}
              onPressIn={() => {
                if (reduceMotion) return;
                closePressed.value = withTiming(1, { duration: 80 });
              }}
              onPressOut={() => {
                if (reduceMotion) return;
                closePressed.value = withSpring(0, { damping: 14, stiffness: 320 });
              }}
              hitSlop={12}
              style={[
                styles.closeBtn,
                { backgroundColor: colors.icon + "14" },
                closeAnimStyle,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("productsModalClose")}
            >
              <MaterialIcons name="close" size={20} color={colors.icon} />
            </AnimatedPressable>
          </View>

          {detailQuery.isLoading ? (
            <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(280)} style={styles.centered}>
              <ActivityIndicator size="large" color={colors.tint} />
              <ThemedText style={styles.loadingText}>{t("productsDetailLoading")}</ThemedText>
            </Animated.View>
          ) : !product ? (
            <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(280)} style={styles.centered}>
              <MaterialIcons name="inventory-2" size={40} color={colors.icon} />
              <ThemedText>{t("productsDetailNoData")}</ThemedText>
            </Animated.View>
          ) : (
            <View style={styles.body}>
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Animated.View
                  key={`gallery-${contentKey}`}
                  entering={staggerEnter(0, reduceMotion)}
                  style={styles.galleryBlock}
                >
                  <ScrollView
                    horizontal
                    pagingEnabled={false}
                    decelerationRate="fast"
                    snapToInterval={gallerySlideWidth + GALLERY_GAP}
                    snapToAlignment="start"
                    disableIntervalMomentum
                    showsHorizontalScrollIndicator={false}
                    onScroll={onGalleryScroll}
                    scrollEventThrottle={32}
                    contentContainerStyle={styles.galleryScroll}
                  >
                    {images.length > 0 ? (
                      images.map((uri, i) => (
                        <Image
                          key={`${uri}-${i}`}
                          source={{ uri }}
                          style={[
                            styles.galleryImage,
                            {
                              width: gallerySlideWidth,
                              backgroundColor: colors.icon + "10",
                            },
                          ]}
                          contentFit="cover"
                          transition={280}
                        />
                      ))
                    ) : (
                      <View style={{ width: gallerySlideWidth }}>
                        <ProductListingThumbnail
                          imageUrl={null}
                          size={GALLERY_HEIGHT}
                          borderRadius={14}
                          showNoImageLabel
                        />
                      </View>
                    )}
                  </ScrollView>
                  {images.length > 1 ? (
                    <>
                      <View style={styles.photoCountBadge}>
                        <ThemedText style={styles.photoCountText}>
                          {tf("productsDetailPhotosCount", {
                            current: photoIndex + 1,
                            total: images.length,
                          })}
                        </ThemedText>
                      </View>
                      <View style={styles.dotsRow}>
                        {images.map((uri, i) => (
                          <GalleryDot
                            key={`dot-${uri}`}
                            active={i === photoIndex}
                            tint={colors.tint}
                            muted={colors.icon + "55"}
                          />
                        ))}
                      </View>
                    </>
                  ) : null}
                </Animated.View>

                <Animated.View
                  key={`summary-${contentKey}`}
                  entering={staggerEnter(SECTION_STAGGER_MS, reduceMotion)}
                  style={[styles.summaryCard, { backgroundColor: surface, borderColor }]}
                >
                  <View style={styles.summaryTop}>
                    <ThemedText type="defaultSemiBold" style={styles.summaryTitle}>
                      {product.name}
                    </ThemedText>
                    {(() => {
                      const status = parseProductStatus(product.status, product.isAvailable);
                      const badge = statusBadgeColors(status, scheme);
                      return (
                        <View
                          style={[styles.statusPill, { backgroundColor: badge.backgroundColor }]}
                        >
                          <ThemedText style={[styles.statusPillText, { color: badge.color }]}>
                            {t(productStatusLabelKey(status))}
                          </ThemedText>
                        </View>
                      );
                    })()}
                  </View>
                  <ThemedText style={[styles.summaryPrice, { color: colors.tint }]}>
                    {product.price.toLocaleString()} MMK
                  </ThemedText>
                  <View style={styles.quickFacts}>
                    <QuickFact
                      icon="visibility"
                      label={t("productsDetailViewCount")}
                      value={String(product.viewCount ?? 0)}
                      colors={colors}
                    />
                    <QuickFact
                      icon="event"
                      label={t("productsDetailCreatedAt")}
                      value={formatListingDate(product.createdAt, locale)}
                      colors={colors}
                    />
                    <QuickFact
                      icon="update"
                      label={t("productsDetailUpdatedAt")}
                      value={formatListingDate(product.updatedAt, locale)}
                      colors={colors}
                    />
                  </View>
                </Animated.View>

                {product.description?.trim() ? (
                  <SectionCard
                    title={t("productsDetailDescription")}
                    icon="description"
                    tint={colors.tint}
                    surface={surface}
                    borderColor={borderColor}
                    enterDelay={SECTION_STAGGER_MS * 2}
                  >
                    <ThemedText style={styles.descriptionBody}>{product.description}</ThemedText>
                  </SectionCard>
                ) : null}

                <SectionCard
                  title={t("productsDetailSectionListing")}
                  icon="inventory-2"
                  tint={colors.tint}
                  surface={surface}
                  borderColor={borderColor}
                  enterDelay={SECTION_STAGGER_MS * 3}
                >
                  <View style={styles.chipRow}>
                    <TagChip
                      label={formatProductConditionForDisplay(product.condition, t)}
                      tint={colors.tint}
                    />
                    <TagChip label={categoryLabel} tint={colors.tint} muted />
                  </View>
                  <View style={styles.chipRow}>
                    {(product.paymentMethods ?? []).map((m) => (
                      <TagChip key={m} label={paymentLabel(m, t)} tint={colors.tint} muted />
                    ))}
                  </View>
                  <DetailField
                    icon="fingerprint"
                    label={t("productsDetailListingId")}
                    value={product.id}
                    tint={colors.tint}
                    iconColor={colors.icon}
                    last
                  />
                </SectionCard>

                <SectionCard
                  title={t("productsDetailSectionTrade")}
                  icon="place"
                  tint={colors.tint}
                  surface={surface}
                  borderColor={borderColor}
                  enterDelay={SECTION_STAGGER_MS * 4}
                >
                  {product.directTradeLocation?.trim() ? (
                    <View style={[styles.addressHighlight, { borderColor: colors.tint + "30" }]}>
                      <MaterialIcons name="location-on" size={18} color={colors.tint} />
                      <ThemedText style={styles.addressText} selectable>
                        {product.directTradeLocation.trim()}
                      </ThemedText>
                    </View>
                  ) : null}
                  {formatCoordinates(
                    product.directTradeLatitude,
                    product.directTradeLongitude,
                  ) ? (
                    <DetailField
                      icon="my-location"
                      label={t("productsDetailCoordinates")}
                      value={
                        formatCoordinates(
                          product.directTradeLatitude,
                          product.directTradeLongitude,
                        )!
                      }
                      tint={colors.tint}
                      iconColor={colors.icon}
                    />
                  ) : null}
                  {product.nearbyLandmarks?.trim() ? (
                    <DetailField
                      icon="signpost"
                      label={t("productsFieldNearbyLandmarks")}
                      value={product.nearbyLandmarks}
                      tint={colors.tint}
                      iconColor={colors.icon}
                    />
                  ) : null}
                  {product.preferredTradeTime?.trim() ? (
                    <DetailField
                      icon="schedule"
                      label={t("productsFieldPreferredTradeTime")}
                      value={product.preferredTradeTime}
                      tint={colors.tint}
                      iconColor={colors.icon}
                      last={!mapHtml && !product.mapScreenshotUrl}
                    />
                  ) : null}
                  {mapHtml ? (
                    <View style={[styles.mapWrap, { borderColor }]}>
                      <ThemedText style={styles.mapCaption}>
                        {t("productsDirectTradeMapTitle")}
                      </ThemedText>
                      <WebView
                        source={{ html: mapHtml }}
                        style={styles.map}
                        scrollEnabled={false}
                        pointerEvents="none"
                        originWhitelist={["*"]}
                      />
                    </View>
                  ) : null}
                  {product.mapScreenshotUrl ? (
                    <View style={styles.mapShotBlock}>
                      <ThemedText style={styles.mapCaption}>
                        {t("productsFieldMapScreenshotUrl")}
                      </ThemedText>
                      <Image
                        source={{ uri: product.mapScreenshotUrl }}
                        style={[styles.mapShot, { backgroundColor: colors.icon + "10" }]}
                        contentFit="cover"
                        transition={280}
                      />
                    </View>
                  ) : null}
                </SectionCard>

                <SectionCard
                  title={t("productsDetailSectionDelivery")}
                  icon="local-shipping"
                  tint={colors.tint}
                  surface={surface}
                  borderColor={borderColor}
                  enterDelay={SECTION_STAGGER_MS * 5}
                >
                  <View style={styles.chipRow}>
                    <TagChip
                      label={
                        product.isDeliveryAvailable
                          ? t("productsDeliveryOn")
                          : t("productsDeliveryOff")
                      }
                      tint={product.isDeliveryAvailable ? colors.tint : colors.icon}
                      muted={!product.isDeliveryAvailable}
                    />
                    {product.isDeliveryAvailable ? (
                      <TagChip
                        label={
                          product.deliveryFeePayer === "SELLER"
                            ? t("productsDeliverySellerPays")
                            : product.deliveryFeePayer === "BUYER"
                              ? t("productsDeliveryBuyerPays")
                              : "—"
                        }
                        tint={colors.tint}
                      />
                    ) : null}
                  </View>
                </SectionCard>

                {preferred.length > 0 ? (
                  <SectionCard
                    title={t("productsDetailSectionPreferred")}
                    icon="location-on"
                    tint={colors.tint}
                    surface={surface}
                    borderColor={borderColor}
                    enterDelay={SECTION_STAGGER_MS * 6}
                  >
                    {preferred.map((loc, i) => (
                      <View
                        key={`${loc.label}-${i}`}
                        style={[
                          styles.prefCard,
                          { borderColor },
                          i === preferred.length - 1 && styles.prefCardLast,
                        ]}
                      >
                        <View style={styles.prefHeader}>
                          <View style={[styles.prefIndex, { backgroundColor: colors.tint + "20" }]}>
                            <ThemedText style={[styles.prefIndexText, { color: colors.tint }]}>
                              {i + 1}
                            </ThemedText>
                          </View>
                          <ThemedText type="defaultSemiBold" style={styles.prefLabel}>
                            {loc.label || `${t("productsFieldPreferredLocationItem")} ${i + 1}`}
                          </ThemedText>
                        </View>
                        {loc.address ? (
                          <ThemedText style={styles.prefAddress} selectable>
                            {loc.address}
                          </ThemedText>
                        ) : null}
                        {formatCoordinates(loc.latitude, loc.longitude) ? (
                          <ThemedText style={styles.prefCoords}>
                            {formatCoordinates(loc.latitude, loc.longitude)}
                          </ThemedText>
                        ) : null}
                      </View>
                    ))}
                  </SectionCard>
                ) : null}
              </ScrollView>

              <Animated.View
                entering={staggerEnter(SECTION_STAGGER_MS * 7, reduceMotion)}
                style={[styles.footer, { borderTopColor: borderColor }]}
              >
                <AnimatedPressable
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onClose();
                    onEdit(product);
                  }}
                  onPressIn={() => {
                    if (reduceMotion) return;
                    editPressed.value = withTiming(1, { duration: 90 });
                  }}
                  onPressOut={() => {
                    if (reduceMotion) return;
                    editPressed.value = withSpring(0, { damping: 14, stiffness: 320 });
                  }}
                  style={[styles.editBtn, { backgroundColor: colors.tint }, editAnimStyle]}
                >
                  <MaterialIcons name="edit" size={18} color="#FFFFFF" />
                  <ThemedText style={styles.editBtnText}>
                    {t("productsDetailEditListing")}
                  </ThemedText>
                </AnimatedPressable>
              </Animated.View>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
});

const QuickFact = memo(function QuickFact({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  colors: (typeof Colors)["light"];
}) {
  return (
    <View style={[styles.quickFact, { backgroundColor: colors.background, borderColor: colors.icon + "18" }]}>
      <MaterialIcons name={icon} size={14} color={colors.tint} />
      <View style={styles.quickFactCopy}>
        <ThemedText style={styles.quickFactLabel} numberOfLines={1}>
          {label}
        </ThemedText>
        <ThemedText style={styles.quickFactValue} numberOfLines={2}>
          {value}
        </ThemedText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "92%",
    width: "100%",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.4)",
    marginTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    padding: 48,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    opacity: 0.6,
    fontSize: 13,
  },
  body: {
    flexShrink: 1,
    minHeight: 120,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 12,
    gap: 12,
  },
  galleryBlock: {
    position: "relative",
    paddingHorizontal: 16,
    gap: 8,
  },
  galleryScroll: {
    gap: GALLERY_GAP,
  },
  galleryImage: {
    height: GALLERY_HEIGHT,
    borderRadius: 14,
  },
  photoCountBadge: {
    position: "absolute",
    top: 10,
    right: 26,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  photoCountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  summaryCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  summaryTop: {
    gap: 8,
  },
  summaryTitle: {
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  summaryPrice: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  quickFacts: {
    gap: 8,
  },
  quickFact: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickFactCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  quickFactLabel: {
    fontSize: 10,
    opacity: 0.55,
    fontWeight: "600",
  },
  quickFactValue: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  sectionCardWrap: {
    marginHorizontal: 16,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  sectionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCardTitle: {
    fontSize: 15,
    flex: 1,
  },
  descriptionBody: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.82,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: "100%",
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
  },
  fieldRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.22)",
  },
  fieldIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fieldCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.55,
  },
  fieldValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  addressHighlight: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(99,102,241,0.06)",
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  mapWrap: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    gap: 0,
  },
  mapCaption: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.55,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  map: {
    height: 150,
    backgroundColor: "transparent",
  },
  mapShotBlock: {
    gap: 6,
  },
  mapShot: {
    width: "100%",
    height: 130,
    borderRadius: 12,
  },
  prefCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginBottom: 8,
  },
  prefCardLast: {
    marginBottom: 0,
  },
  prefHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  prefIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  prefIndexText: {
    fontSize: 11,
    fontWeight: "800",
  },
  prefLabel: {
    flex: 1,
    fontSize: 13,
  },
  prefAddress: {
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.78,
    paddingLeft: 30,
  },
  prefCoords: {
    fontSize: 11,
    opacity: 0.5,
    paddingLeft: 30,
    fontVariant: ["tabular-nums"],
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 22 : 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  editBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});

import { ProductListingThumbnail } from "@/components/product-listing-thumbnail";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  paddingTopBelowLanguageSwitcher,
  topOffsetForFloatingBackButton,
} from "@/constants/language-switcher-layout";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  useClientProductDetail,
  useSellerReviews,
} from "@/presentation/hooks/useClientProducts";
import { buildLeafletStaticViewHtml } from "@/presentation/lib/leafletPickerHtml";
import {
  canOpenMapsForTarget,
  openInMapsApp,
  type MapOpenTarget,
} from "@/presentation/lib/openMapsApp";
import {
  formatProductConditionForDisplay,
  productStatusLabelKey,
  useLocale,
  userRankLabelKey,
} from "@/presentation/providers/LocaleProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Alert,
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
  FadeInDown,
  FadeInUp,
  FadeOut,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import {
  formatCoordinates,
  formatListingDate,
  parsePreferredLocations,
  productImageUrls,
} from "./myProductDetailHelpers";
import { parseProductStatus, statusBadgeColors } from "./myProductStatus";

type Props = { productId: string };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const GALLERY_HEIGHT = 220;
const SECTION_STAGGER_MS = 52;
const DOT_MIN_W = 6;
const DOT_MAX_W = 20;
const MAP_HEIGHT = 260;
const HERO_CARD_H_MARGIN = 12;
const HERO_CARD_PADDING = 14;

function cardShadow(scheme: "light" | "dark") {
  const isDark = scheme === "dark";
  return Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: isDark ? 10 : 8 },
      shadowOpacity: isDark ? 0.38 : 0.12,
      shadowRadius: isDark ? 18 : 16,
    },
    android: { elevation: isDark ? 8 : 5 },
    default: {},
  });
}

function cardSurface(scheme: "light" | "dark") {
  return scheme === "dark" ? "#23272E" : "#FFFFFF";
}

function staggerEnter(delay: number, reduceMotion: boolean | null) {
  if (reduceMotion) return undefined;
  return FadeInUp.duration(440)
    .delay(delay)
    .springify()
    .damping(18)
    .stiffness(220);
}

function paymentMethodLabel(method: string, t: ReturnType<typeof useLocale>["t"]) {
  const v = method.toUpperCase();
  if (v === "CASH") return t("productsPaymentCash");
  if (v === "KBZPAY") return t("productsPaymentKbzpay");
  return method;
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
    opacity: interpolate(progress.value, [0, 1], [0.4, 1], Extrapolation.CLAMP),
  }));

  return <Animated.View style={[styles.dot, dotStyle]} />;
});

const ImageThumb = memo(function ImageThumb({
  uri,
  active,
  tint,
  onPress,
}: {
  uri: string;
  active: boolean;
  tint: string;
  onPress: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(pressed.value, [0, 1], [1, 0.94], Extrapolation.CLAMP),
      },
    ],
    borderColor: interpolateColor(
      pressed.value,
      [0, 1],
      [active ? tint : "transparent", tint],
    ),
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        if (reduceMotion) return;
        pressed.value = withTiming(1, { duration: 80 });
      }}
      onPressOut={() => {
        if (reduceMotion) return;
        pressed.value = withSpring(0, { damping: 14, stiffness: 320 });
      }}
      style={[
        styles.thumbWrap,
        active && { borderColor: tint, borderWidth: 2 },
        animStyle,
      ]}
    >
      <Image source={{ uri }} style={styles.thumb} contentFit="cover" transition={240} />
    </AnimatedPressable>
  );
});

const SectionCard = memo(function SectionCard({
  title,
  icon,
  tint,
  surface,
  borderColor,
  scheme,
  enterDelay = 0,
  children,
}: {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  tint: string;
  surface: string;
  borderColor: string;
  scheme: "light" | "dark";
  enterDelay?: number;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View entering={staggerEnter(enterDelay, reduceMotion)} style={styles.sectionWrap}>
      <View style={[styles.sectionCard, cardShadow(scheme), { backgroundColor: surface, borderColor }]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconWrap, { backgroundColor: tint + "18" }]}>
            <MaterialIcons name={icon} size={18} color={tint} />
          </View>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {title}
          </ThemedText>
        </View>
        {children}
      </View>
    </Animated.View>
  );
});

const DetailField = memo(function DetailField({
  icon,
  label,
  value,
  tint,
  last,
  onPress,
  actionLabel,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  tint: string;
  last?: boolean;
  onPress?: () => void;
  actionLabel?: string;
}) {
  const display = value?.trim() || "—";
  const row = (
    <View style={[styles.fieldRow, !last && styles.fieldRowBorder]}>
      <View style={[styles.fieldIconWrap, { backgroundColor: tint + "14" }]}>
        <MaterialIcons name={icon} size={17} color={tint} />
      </View>
      <View style={styles.fieldCopy}>
        <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
        <ThemedText style={[styles.fieldValue, onPress && { color: tint }]}>
          {display}
        </ThemedText>
        {onPress && actionLabel ? (
          <ThemedText style={[styles.fieldAction, { color: tint }]}>{actionLabel}</ThemedText>
        ) : null}
      </View>
      {onPress ? (
        <MaterialIcons name="open-in-new" size={18} color={tint} style={styles.fieldActionIcon} />
      ) : null}
    </View>
  );

  if (!onPress) return row;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.fieldRowPressed]}
      accessibilityRole="button"
      accessibilityLabel={actionLabel ?? label}
    >
      {row}
    </Pressable>
  );
});

const ReviewRow = memo(function ReviewRow({
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

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View style={styles.reviewBreakdownRow}>
      <ThemedText style={styles.reviewBreakdownStar}>{stars}★</ThemedText>
      <View style={styles.reviewBreakdownBarTrack}>
        <Animated.View style={[styles.reviewBreakdownBarFill, { backgroundColor: tint }, fillStyle]} />
      </View>
      <ThemedText style={styles.reviewBreakdownCount}>{count}</ThemedText>
    </View>
  );
});

const ImageViewerModal = memo(function ImageViewerModal({
  uri,
  visible,
  onClose,
}: {
  uri: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible && !!uri}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.imageViewerBackdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close image"
        />
        {uri ? (
          <View style={styles.imageViewerContent} pointerEvents="box-none">
            <Image
              source={{ uri }}
              style={{
                width: width - 32,
                height: Math.min(height * 0.78, height - insets.top - insets.bottom - 80),
              }}
              contentFit="contain"
              recyclingKey={uri}
              accessibilityIgnoresInvertColors
            />
          </View>
        ) : null}
        <Pressable
          onPress={onClose}
          style={[styles.imageViewerClose, { top: insets.top + 12 }]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <MaterialIcons name="close" size={24} color="#FFF" />
        </Pressable>
      </View>
    </Modal>
  );
});

function ReviewsSheet({
  visible,
  onClose,
  surface,
  borderColor,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  surface: string;
  borderColor: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      progress.value = 0;
      return;
    }
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withSpring(1, { damping: 22, stiffness: 280, mass: 0.45 });
  }, [progress, reduceMotion, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [420, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.sheetBackdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheetCard,
            { backgroundColor: surface, borderColor },
            sheetStyle,
          ]}
        >
          <View style={styles.sheetHandle} />
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export function PublicProductDetailScreen({ productId }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, tf, locale } = useLocale();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const topContentInset = paddingTopBelowLanguageSwitcher(insets.top);
  const backButtonTop = topOffsetForFloatingBackButton(insets.top);

  const detailQuery = useClientProductDetail(productId);
  const product = detailQuery.data;
  const sellerUserId = product?.seller?.userId ?? null;

  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewItems, setReviewItems] = useState<
    NonNullable<ReturnType<typeof useSellerReviews>["data"]>["items"]
  >([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [mapLoading, setMapLoading] = useState(true);

  const chatPressed = useSharedValue(0);
  const backPressed = useSharedValue(0);

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

  const showsMapMedia =
    hasCoordinates || Boolean(product?.mapScreenshotUrl?.trim());

  useEffect(() => {
    if (!showsMapMedia) {
      setMapLoading(false);
      return;
    }
    setMapLoading(true);
  }, [productId, showsMapMedia, mapHtml]);

  useEffect(() => {
    if (!showsMapMedia || !mapLoading) return;
    const timeout = setTimeout(() => setMapLoading(false), 12_000);
    return () => clearTimeout(timeout);
  }, [showsMapMedia, mapLoading]);

  const gallerySlideWidth =
    width - HERO_CARD_H_MARGIN * 2 - HERO_CARD_PADDING * 2;

  const openImageViewer = useCallback((uri: string) => {
    if (!uri.trim()) return;
    void Haptics.selectionAsync();
    setSelectedImage(uri.trim());
  }, []);

  const openMaps = useCallback(
    async (target: MapOpenTarget) => {
      if (!canOpenMapsForTarget(target)) {
        Alert.alert(t("errorTitle"), t("publicDetailMapsUnavailable"));
        return;
      }
      void Haptics.selectionAsync();
      const opened = await openInMapsApp(target);
      if (!opened) {
        Alert.alert(t("errorTitle"), t("publicDetailMapsUnavailable"));
      }
    },
    [t],
  );
  const surface = cardSurface(scheme);
  const borderColor = colors.icon + "22";
  const mutedDot = colors.icon + "55";

  const maxReviewCount = useMemo(() => {
    const rows = reviewsQuery.data?.starBreakdown ?? [];
    return Math.max(1, ...rows.map((r) => r.count));
  }, [reviewsQuery.data?.starBreakdown]);

  const onGalleryScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const slide = gallerySlideWidth;
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

  const chatAnimStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(chatPressed.value, [0, 1], [1, 0.97], Extrapolation.CLAMP),
      },
    ],
  }));

  const backAnimStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(backPressed.value, [0, 1], [1, 0.9], Extrapolation.CLAMP),
      },
    ],
  }));

  const screenBackButton = (
    <AnimatedPressable
      onPress={() => router.back()}
      onPressIn={() => {
        if (reduceMotion) return;
        backPressed.value = withTiming(1, { duration: 80 });
      }}
      onPressOut={() => {
        if (reduceMotion) return;
        backPressed.value = withSpring(0, { damping: 14, stiffness: 320 });
      }}
      style={[styles.screenBackBtn, { top: backButtonTop }, backAnimStyle]}
      accessibilityRole="button"
      accessibilityLabel={t("productsComposerBack")}
    >
      <MaterialIcons name="arrow-back" size={22} color="#FFF" />
    </AnimatedPressable>
  );

  if (detailQuery.isLoading) {
    return (
      <ThemedView style={[styles.centered, { paddingTop: topContentInset }]}>
        {screenBackButton}
        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(300)} style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={styles.loadingText}>{t("productsDetailLoading")}</ThemedText>
        </Animated.View>
      </ThemedView>
    );
  }

  if (!product) {
    return (
      <ThemedView style={[styles.centered, { paddingTop: topContentInset }]}>
        {screenBackButton}
        <MaterialIcons name="inventory-2" size={48} color={colors.icon} />
        <ThemedText>{t("productsDetailNoData")}</ThemedText>
      </ThemedView>
    );
  }

  const status = parseProductStatus(product.status, product.isAvailable);
  const statusBadge = statusBadgeColors(status, scheme);

  const directTradeMapsTarget: MapOpenTarget = {
    latitude: product.directTradeLatitude,
    longitude: product.directTradeLongitude,
    address: product.directTradeLocation,
    label: product.name,
  };
  const canOpenDirectTradeMaps = canOpenMapsForTarget(directTradeMapsTarget);
  const mapsActionLabel = t("publicDetailOpenInMaps");

  return (
      <ThemedView style={styles.container}>
      {screenBackButton}
        <Animated.ScrollView
        entering={reduceMotion ? undefined : FadeIn.duration(240)}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topContentInset, paddingBottom: 96 + insets.bottom },
        ]}
          showsVerticalScrollIndicator={false}
        >
        <Animated.View
          entering={staggerEnter(0, reduceMotion)}
          style={[styles.mapCard, cardShadow(scheme), { borderColor }]}
        >
            {hasCoordinates ? (
              <>
              <WebView
                source={{ html: mapHtml }}
                style={styles.mapView}
                scrollEnabled={false}
                pointerEvents="none"
                originWhitelist={["*"]}
                  onLoadEnd={() => setMapLoading(false)}
                  onError={() => setMapLoading(false)}
                />
                {!mapLoading ? (
                  <Pressable
                    style={styles.mapTapOverlay}
                    onPress={() => openMaps(directTradeMapsTarget)}
                    accessibilityRole="button"
                    accessibilityLabel={mapsActionLabel}
                  />
                ) : null}
              </>
            ) : product.mapScreenshotUrl ? (
            <Pressable
              onPress={() => openImageViewer(product.mapScreenshotUrl ?? "")}
              accessibilityRole="imagebutton"
              accessibilityLabel={t("productsDetailPhotosCount")}
            >
              <Image
                source={{ uri: product.mapScreenshotUrl }}
                style={styles.mapView}
                contentFit="cover"
                transition={280}
                pointerEvents="none"
                onLoad={() => setMapLoading(false)}
                onError={() => setMapLoading(false)}
              />
            </Pressable>
          ) : (
            <View style={styles.mapPlaceholder}>
              <ProductListingThumbnail imageUrl={null} size={MAP_HEIGHT} borderRadius={0} />
            </View>
          )}

          {mapLoading && showsMapMedia ? (
            <Animated.View
              entering={reduceMotion ? undefined : FadeIn.duration(180)}
              exiting={reduceMotion ? undefined : FadeOut.duration(200)}
              style={[
                styles.mapLoadingOverlay,
                {
                  backgroundColor:
                    scheme === "dark" ? "rgba(35,39,46,0.92)" : "rgba(255,255,255,0.92)",
                },
              ]}
              pointerEvents="none"
            >
              <ActivityIndicator size="large" color={colors.tint} />
              <ThemedText style={[styles.mapLoadingText, { color: colors.icon }]}>
                {t("productsDetailLoading")}
              </ThemedText>
            </Animated.View>
          ) : null}

          <View style={styles.mapGradientTop} pointerEvents="none" />
          <View style={styles.mapGradientBottom} pointerEvents="none" />

          <View style={styles.mapOverlayTop}>
            <View style={styles.mapIdPill}>
              <ThemedText style={styles.mapIdText}>#{product.id.slice(-6)}</ThemedText>
            </View>
          </View>

          <Pressable
            onPress={() => {
              if (!canOpenDirectTradeMaps) return;
              void openMaps(directTradeMapsTarget);
            }}
            disabled={!canOpenDirectTradeMaps}
            style={({ pressed }) => [
              styles.locationChip,
              pressed && canOpenDirectTradeMaps && styles.locationChipPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={mapsActionLabel}
          >
            <MaterialIcons name="place" size={16} color="#FFF" />
            <ThemedText style={styles.locationChipText} numberOfLines={2}>
              {product.directTradeLocation ?? "—"}
            </ThemedText>
            {canOpenDirectTradeMaps ? (
              <MaterialIcons name="open-in-new" size={14} color="#FFF" style={styles.locationChipAction} />
            ) : null}
          </Pressable>
          </Animated.View>

        <Animated.View
          entering={staggerEnter(SECTION_STAGGER_MS, reduceMotion)}
          style={[styles.heroCard, cardShadow(scheme), { backgroundColor: surface, borderColor }]}
        >
              {images.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onGalleryScroll}
                scrollEventThrottle={16}
                decelerationRate="fast"
                snapToInterval={gallerySlideWidth}
                snapToAlignment="start"
                disableIntervalMomentum
                style={{ width: gallerySlideWidth }}
                contentContainerStyle={styles.galleryScroll}
              >
                {images.map((uri) => (
                  <Pressable
                    key={uri}
                    onPress={() => openImageViewer(uri)}
                    style={{ width: gallerySlideWidth, height: GALLERY_HEIGHT }}
                    accessibilityRole="imagebutton"
                  >
                    <Image
                      source={{ uri }}
                      style={styles.galleryImage}
                      contentFit="cover"
                      transition={300}
                      pointerEvents="none"
                    />
                  </Pressable>
                ))}
              </ScrollView>
              {images.length > 1 ? (
                <View style={styles.dotsRow}>
                  {images.map((uri, i) => (
                    <GalleryDot key={uri} active={i === photoIndex} tint={colors.tint} muted={mutedDot} />
                  ))}
                </View>
              ) : null}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbsRow}
              >
                {images.map((uri, i) => (
                  <ImageThumb
                    key={`thumb-${uri}`}
                    uri={uri}
                    active={i === photoIndex}
                    tint={colors.tint}
                    onPress={() => {
                      setPhotoIndex(i);
                      openImageViewer(uri);
                    }}
                  />
                ))}
              </ScrollView>
            </>
          ) : (
            <View style={styles.galleryEmpty}>
              <ProductListingThumbnail imageUrl={null} size={GALLERY_HEIGHT - 24} borderRadius={14} />
            </View>
          )}

            <View style={styles.titleRow}>
            <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={3}>
                {product.name}
              </ThemedText>
              <View style={[styles.statusChip, { backgroundColor: statusBadge.backgroundColor }]}> 
                <ThemedText style={[styles.statusChipText, { color: statusBadge.color }]}>
                  {t(productStatusLabelKey(status))}
                </ThemedText>
              </View>
            </View>

          <View style={[styles.pricePanel, { backgroundColor: colors.tint + "12" }]}>
            <ThemedText style={styles.priceLabel}>MMK</ThemedText>
            <ThemedText style={[styles.price, { color: colors.tint }]}>
              {product.price.toLocaleString()}
            </ThemedText>
            {product.createdAtDisplay?.trim() ? (
              <ThemedText style={[styles.postedAt, { color: colors.icon }]}>
                {product.createdAtDisplay.trim()}
              </ThemedText>
            ) : null}
          </View>
          </Animated.View>

        <Animated.View
          entering={staggerEnter(SECTION_STAGGER_MS * 2, reduceMotion)}
          style={[styles.sellerCard, cardShadow(scheme), { backgroundColor: surface, borderColor }]}
        >
          <Pressable
            style={styles.sellerRow}
            onPress={() => {
              if (!product.seller?.userId) return;
              void Haptics.selectionAsync();
              router.push({
                pathname: "/seller/[userId]",
                params: { userId: product.seller.userId },
              });
            }}
          >
            <View style={[styles.avatarRing, { borderColor: colors.tint + "55" }]}>
                <Image
                  source={product.seller?.avatar ? { uri: product.seller.avatar } : undefined}
                  style={[styles.avatar, { backgroundColor: colors.icon + "1f" }]}
                />
            </View>
                <View style={styles.sellerCopy}>
              <ThemedText type="defaultSemiBold" style={styles.sellerName}>
                {product.seller?.nickname ?? "—"}
              </ThemedText>
              <ThemedText style={styles.sellerRank}>
                {t(userRankLabelKey(product.seller?.currentRank))}
              </ThemedText>
              <ThemedText style={styles.sellerMeta}>
                {tf("publicProfileRatingSummary", {
                  avg: (product.seller?.averageStars ?? 0).toFixed(1),
                  count: product.seller?.totalReviews ?? 0,
                })}
              </ThemedText>
              <ThemedText style={[styles.sellerViewLink, { color: colors.tint }]}>
                {t("publicDetailViewSeller")}
              </ThemedText>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.icon} />
          </Pressable>

          <AnimatedPressable
            onPress={() => {
              void Haptics.selectionAsync();
              setReviewsOpen(true);
            }}
            style={[styles.reviewsBtn, { backgroundColor: colors.tint }]}
          >
            <MaterialIcons name="star" size={16} color="#FFF" />
            <ThemedText style={styles.reviewsBtnText}>{t("publicDetailSellerReviews")}</ThemedText>
          </AnimatedPressable>
        </Animated.View>

        <SectionCard
          title={t("productsDetailSectionTrade")}
          icon="storefront"
          tint={colors.tint}
          surface={surface}
          borderColor={borderColor}
          scheme={scheme}
          enterDelay={SECTION_STAGGER_MS * 3}
        >
          <Pressable
            onPress={() => openMaps(directTradeMapsTarget)}
            disabled={!canOpenDirectTradeMaps}
            style={({ pressed }) => [
              styles.addressHighlight,
              { borderColor: colors.tint + "30" },
              pressed && canOpenDirectTradeMaps && styles.addressHighlightPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={mapsActionLabel}
          >
            <MaterialIcons name="place" size={18} color={colors.tint} />
            <ThemedText style={[styles.addressText, canOpenDirectTradeMaps && { color: colors.tint }]}>
              {product.directTradeLocation ?? "—"}
            </ThemedText>
            {canOpenDirectTradeMaps ? (
              <MaterialIcons name="open-in-new" size={16} color={colors.tint} />
            ) : null}
          </Pressable>
          {preferred.map((loc, idx) => {
            const locTarget: MapOpenTarget = {
              latitude: loc.latitude,
              longitude: loc.longitude,
              label: loc.label,
              address: loc.address,
            };
            const canOpenLoc = canOpenMapsForTarget(locTarget);
            return (
              <DetailField
                key={`${loc.label}-${idx}`}
                icon="location-on"
                label={`${t("productsFieldPreferredLocationItem")} ${idx + 1}`}
                value={`${loc.label}${loc.address ? ` (${loc.address})` : ""}`}
                tint={colors.tint}
                last={idx === preferred.length - 1 && !hasCoordinates && !product.preferredTradeTime}
                onPress={canOpenLoc ? () => openMaps(locTarget) : undefined}
                actionLabel={canOpenLoc ? mapsActionLabel : undefined}
              />
            );
          })}
          {product.preferredTradeTime ? (
            <DetailField
              icon="schedule"
              label={t("productsFieldPreferredTradeTime")}
              value={product.preferredTradeTime}
              tint={colors.tint}
              last={!hasCoordinates}
            />
          ) : null}
          {hasCoordinates ? (
            <DetailField
              icon="my-location"
              label={t("productsDetailCoordinates")}
              value={
                formatCoordinates(product.directTradeLatitude, product.directTradeLongitude) ?? "—"
              }
              tint={colors.tint}
              last
              onPress={() => openMaps(directTradeMapsTarget)}
              actionLabel={mapsActionLabel}
            />
          ) : null}
        </SectionCard>

        <SectionCard
          title={t("productsFieldPaymentMethods")}
          icon="payments"
          tint={colors.tint}
          surface={surface}
          borderColor={borderColor}
          scheme={scheme}
          enterDelay={SECTION_STAGGER_MS * 4}
        >
          <View style={styles.chipsWrap}>
            {(product.paymentMethods ?? []).map((m) => (
              <View
                key={m}
                style={[styles.methodChip, { borderColor: colors.tint + "40", backgroundColor: colors.tint + "10" }]}
              >
                <MaterialIcons name="check-circle" size={15} color={colors.tint} />
                <ThemedText style={[styles.methodChipText, { color: colors.tint }]}>
                  {paymentMethodLabel(m, t)}
                </ThemedText>
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard
          title={t("productsDetailSectionDelivery")}
          icon="local-shipping"
          tint={colors.tint}
          surface={surface}
          borderColor={borderColor}
          scheme={scheme}
          enterDelay={SECTION_STAGGER_MS * 5}
        >
          <DetailField
            icon="local-shipping"
            label={t("productsFieldDelivery")}
            value={
              product.isDeliveryAvailable ? t("productsDeliveryOn") : t("productsDeliveryOff")
            }
            tint={colors.tint}
          />
          <DetailField
            icon="account-balance-wallet"
            label={t("productsFieldDeliveryFeePayer")}
            value={
              product.deliveryFeePayer === "SELLER"
                ? t("productsDeliverySellerPays")
                : product.deliveryFeePayer === "BUYER"
                  ? t("productsDeliveryBuyerPays")
                  : "—"
            }
            tint={colors.tint}
            last
          />
        </SectionCard>

        <SectionCard
          title={t("productsDetailDescription")}
          icon="description"
          tint={colors.tint}
          surface={surface}
          borderColor={borderColor}
          scheme={scheme}
          enterDelay={SECTION_STAGGER_MS * 6}
        >
          <ThemedText style={styles.description}>{product.description}</ThemedText>
          <DetailField
            icon="access-time"
            label={t("productsDetailCreatedAt")}
            value={product.createdAtDisplay?.trim() || formatListingDate(product.createdAt, locale)}
            tint={colors.tint}
          />
          <DetailField
            icon="update"
            label={t("productsDetailUpdatedAt")}
            value={formatListingDate(product.updatedAt, locale)}
            tint={colors.tint}
          />
          <DetailField
            icon="category"
            label={t("productsFieldCondition")}
            value={formatProductConditionForDisplay(product.condition, t)}
            tint={colors.tint}
            last
          />
        </SectionCard>
      </Animated.ScrollView>

      <Animated.View
        entering={reduceMotion ? undefined : FadeInDown.duration(380).springify().damping(20)}
        style={[
          styles.chatBar,
          cardShadow(scheme),
          {
            borderTopColor: borderColor,
            backgroundColor: surface,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <AnimatedPressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (!product.seller?.userId) return;
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
          onPressIn={() => {
            if (reduceMotion) return;
            chatPressed.value = withTiming(1, { duration: 90 });
          }}
          onPressOut={() => {
            if (reduceMotion) return;
            chatPressed.value = withSpring(0, { damping: 14, stiffness: 320 });
          }}
          style={[styles.chatButton, { backgroundColor: colors.tint }, chatAnimStyle]}
        >
          <MaterialIcons name="chat-bubble-outline" size={20} color="#FFF" />
          <ThemedText style={styles.chatButtonText}>{t("publicDetailChatSeller")}</ThemedText>
        </AnimatedPressable>
      </Animated.View>

      <ReviewsSheet
        visible={reviewsOpen}
        onClose={() => setReviewsOpen(false)}
        surface={surface}
        borderColor={borderColor}
      >
        <View style={styles.reviewsHeader}>
          <ThemedText type="subtitle">{t("publicDetailSellerReviews")}</ThemedText>
          <Pressable onPress={() => setReviewsOpen(false)} hitSlop={12}>
            <MaterialIcons name="close" size={24} color={colors.icon} />
          </Pressable>
        </View>

        {reviewsQuery.isLoading ? (
          <View style={styles.centeredBlock}>
            <ActivityIndicator color={colors.tint} />
          </View>
        ) : reviewsQuery.data ? (
          <ScrollView style={styles.reviewsScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.reviewBreakdownWrap}>
              {[...reviewsQuery.data.starBreakdown]
                .sort((a, b) => b.stars - a.stars)
                .map((row) => (
                  <ReviewRow
                    key={`s-${row.stars}`}
                    stars={row.stars}
                    count={row.count}
                    tint={colors.tint}
                    maxCount={maxReviewCount}
                  />
                ))}
            </View>
            {reviewItems.map((item, idx) => (
              <Animated.View
                key={item.id}
                entering={
                  reduceMotion
                    ? undefined
                    : FadeInUp.duration(320)
                        .delay(Math.min(idx, 8) * 40)
                        .springify()
                        .damping(18)
                }
                style={[styles.reviewItem, { borderColor: borderColor }]}
              >
                <ThemedText style={styles.reviewStars}>
                  {"★".repeat(Math.max(1, item.stars))}
                </ThemedText>
                <ThemedText style={styles.reviewNickname}>
                  {item.reviewerNickname ?? "—"}
                </ThemedText>
                <ThemedText style={styles.reviewComment}>
                  {item.comment?.trim() || t("publicProfileNoComment")}
                </ThemedText>
                <ThemedText style={styles.reviewDate}>
                  {item.createdAt ? formatListingDate(item.createdAt, locale) : "—"}
                </ThemedText>
              </Animated.View>
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
      </ReviewsSheet>

      <ImageViewerModal
        uri={selectedImage}
        visible={selectedImage != null}
        onClose={() => setSelectedImage(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 24 },
  loadingText: { opacity: 0.65 },
  content: { gap: 14, paddingTop: 0 },
  mapCard: {
    marginHorizontal: 12,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    minHeight: MAP_HEIGHT,
  },
  mapView: { width: "100%", height: MAP_HEIGHT },
  mapTapOverlay: {
    ...StyleSheet.absoluteFillObject,
    bottom: 52,
    zIndex: 1,
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mapLoadingText: { fontSize: 13, fontWeight: "600", opacity: 0.75 },
  mapPlaceholder: { height: MAP_HEIGHT },
  mapGradientTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  mapGradientBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  screenBackBtn: {
    position: "absolute",
    left: 16,
    zIndex: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  mapOverlayTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  mapIdPill: {
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  mapIdText: { color: "#FFF", fontSize: 11, fontWeight: "800" },
  locationChip: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  locationChipPressed: { backgroundColor: "rgba(0,0,0,0.65)" },
  locationChipText: { color: "#FFF", flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  locationChipAction: { opacity: 0.9 },
  heroCard: {
    marginHorizontal: 12,
    borderRadius: 20,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  galleryScroll: {},
  galleryImage: {
    width: "100%",
    height: GALLERY_HEIGHT,
    borderRadius: 16,
  },
  galleryEmpty: {
    height: GALLERY_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  dot: { height: 6, borderRadius: 3 },
  thumbsRow: { gap: 8, paddingVertical: 4 },
  thumbWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumb: { width: "100%", height: "100%" },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  name: { flex: 1, fontSize: 22, lineHeight: 28, fontWeight: "800" },
  statusChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusChipText: { fontSize: 11, fontWeight: "800" },
  pricePanel: {
    borderRadius: 14,
    padding: 14,
    gap: 2,
  },
  priceLabel: { fontSize: 12, fontWeight: "700", opacity: 0.55 },
  price: { fontSize: 32, fontWeight: "900", letterSpacing: -0.5 },
  postedAt: { fontSize: 12, marginTop: 4, fontWeight: "600" },
  sellerCard: {
    marginHorizontal: 12,
    borderRadius: 20,
    padding: 14,
    gap: 12,
    borderWidth: 1,
  },
  sellerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  sellerCopy: { flex: 1, gap: 3, minWidth: 0 },
  sellerName: { fontSize: 16 },
  sellerRank: { fontSize: 12, opacity: 0.7, fontWeight: "700" },
  sellerMeta: { fontSize: 12, opacity: 0.65 },
  sellerViewLink: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  reviewsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    paddingVertical: 12,
  },
  reviewsBtnText: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  sectionWrap: { marginHorizontal: 12 },
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
  addressHighlight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(251,109,0,0.06)",
  },
  addressHighlightPressed: { backgroundColor: "rgba(251,109,0,0.12)" },
  addressText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  fieldAction: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  fieldActionIcon: { marginTop: 8, opacity: 0.85 },
  fieldRowPressed: { opacity: 0.82 },
  fieldRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
  },
  fieldRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  fieldIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldCopy: { flex: 1, minWidth: 0, gap: 3 },
  fieldLabel: { fontSize: 11, fontWeight: "600", opacity: 0.55 },
  fieldValue: { fontSize: 14, lineHeight: 20 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  methodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  methodChipText: { fontSize: 13, fontWeight: "700" },
  description: { fontSize: 14, lineHeight: 22, opacity: 0.85, marginBottom: 4 },
  chatBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chatButton: {
    borderRadius: 16,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  chatButtonText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.48)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    maxHeight: "82%",
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.45)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  reviewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  reviewsScroll: { maxHeight: 480 },
  reviewBreakdownWrap: { gap: 10, marginBottom: 16 },
  reviewBreakdownRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  reviewBreakdownStar: { width: 28, fontSize: 12, fontWeight: "700" },
  reviewBreakdownBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(120,120,120,0.22)",
    overflow: "hidden",
  },
  reviewBreakdownBarFill: { height: "100%", borderRadius: 4 },
  reviewBreakdownCount: { width: 28, textAlign: "right", fontSize: 12, opacity: 0.7 },
  reviewItem: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 4,
  },
  reviewStars: { color: "#FB6D00", fontSize: 12, fontWeight: "700" },
  reviewNickname: { fontSize: 13, fontWeight: "700" },
  reviewComment: { fontSize: 13, lineHeight: 18 },
  reviewDate: { fontSize: 11, opacity: 0.55 },
  loadMoreBtn: {
    marginTop: 12,
    borderWidth: 1.5,
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreText: { fontSize: 14, fontWeight: "700" },
  centeredBlock: { paddingVertical: 28, alignItems: "center" },
  imageViewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
  },
  imageViewerContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  imageViewerClose: {
    position: "absolute",
    right: 20,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
});

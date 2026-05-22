import { AddProductListingButton } from "@/components/add-product-listing-button";
import { ProductListingThumbnail } from "@/components/product-listing-thumbnail";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import type { Category } from "@/core/domain/entities/Category";
import type { Product } from "@/core/domain/entities/Product";
import type { ClientCatalogRadiusSelection } from "@/core/domain/types/catalog";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useBuyerCatalogLocation } from "@/presentation/hooks/useBuyerCatalogLocation";
import { useCategories } from "@/presentation/hooks/useCategories";
import { useClientProductsCatalog } from "@/presentation/hooks/useClientProducts";
import {
  uiCardShadow,
  uiLayoutTransition,
  uiListItemEnter,
} from "@/presentation/lib/uiAnimations";
import { useLocale } from "@/presentation/providers/LocaleProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { HomeHero } from "./HomeHero";
import { HomeRadiusFilter } from "./HomeRadiusFilter";
import { HomeReportsSection } from "./HomeReportsSection";
import { HomeSlider } from "./HomeSlider";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRODUCT_IMAGE_SIZE = 80;

function flattenCategories(tree: Category[] | undefined): Category[] {
  if (!tree || tree.length === 0) return [];
  const out: Category[] = [];
  for (const root of tree) {
    out.push(root);
    for (const child of root.children) out.push(child);
  }
  return out;
}

const ProductCard = memo(function ProductCard({
  item,
  categoryLabel,
  index,
  onPress,
}: {
  item: Product;
  categoryLabel: string;
  index: number;
  onPress: (productId: string) => void;
}) {
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          pressed.value,
          [0, 1],
          [1, 0.985],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const onPressIn = () => {
    if (reduceMotion) return;
    pressed.value = withTiming(1, { duration: 90 });
  };

  const onPressOut = () => {
    if (reduceMotion) return;
    pressed.value = withSpring(0, { damping: 14, stiffness: 320 });
  };

  const entering = uiListItemEnter(index, reduceMotion, {
    duration: 420,
    staggerMs: 52,
    maxItems: 10,
    damping: 18,
  });

  return (
    <Animated.View
      entering={entering}
      layout={uiLayoutTransition}
      style={cardAnimStyle}
    >
      <AnimatedPressable
        onPress={() => onPress(item.id)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.productCard,
          uiCardShadow(scheme, {
            iosOffsetLight: 6,
            iosOffsetDark: 8,
            iosOpacityLight: 0.1,
            iosOpacityDark: 0.35,
            iosRadiusLight: 14,
            iosRadiusDark: 16,
            androidElevationLight: 4,
            androidElevationDark: 6,
          }),
          {
            borderColor: `${colors.icon}22`,
            backgroundColor: scheme === "dark" ? "#1C1F24" : "#FFFFFF",
          },
        ]}
        accessibilityRole="button"
      >
        <View style={styles.productImageWrap}>
          <ProductListingThumbnail
            imageUrl={item.imageUrl}
            size={PRODUCT_IMAGE_SIZE}
            borderRadius={14}
          />
        </View>
        <View style={styles.productInfo}>
          <View style={styles.productTitleRow}>
            <ThemedText
              type="defaultSemiBold"
              numberOfLines={2}
              style={styles.productTitle}
            >
              {item.name}
            </ThemedText>
            {item.createdAtDisplay?.trim() ? (
              <ThemedText
                style={[styles.productPostedAt, { color: colors.icon }]}
                numberOfLines={2}
              >
                {item.createdAtDisplay.trim()}
              </ThemedText>
            ) : null}
          </View>
          <ThemedText style={styles.productCategory} numberOfLines={1}>
            {categoryLabel}
          </ThemedText>
          <ThemedText style={[styles.productPrice, { color: colors.tint }]}>
            {item.price.toLocaleString()} MMK
          </ThemedText>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
});

function CatalogSkeleton({ tint }: { tint: string }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return (
      <View style={styles.skeletonWrap}>
        <ActivityIndicator color={tint} />
      </View>
    );
  }

  return (
    <View style={styles.skeletonWrap}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={`sk-${i}`}
          entering={FadeInUp.duration(400).delay(i * 80)}
          style={styles.skeletonCard}
        >
          <View style={styles.skeletonThumb} />
          <View style={styles.skeletonLines}>
            <View style={[styles.skeletonLine, { width: "72%" }]} />
            <View
              style={[styles.skeletonLine, { width: "48%", marginTop: 8 }]}
            />
            <View
              style={[styles.skeletonLine, { width: "36%", marginTop: 8 }]}
            />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

export function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const { width } = useWindowDimensions();
  const { t } = useLocale();
  const reduceMotion = useReducedMotion();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [searchDraft, setSearchDraft] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedRadiusKm, setSelectedRadiusKm] =
    useState<ClientCatalogRadiusSelection>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [reportsVisible, setReportsVisible] = useState(false);
  const searchFocus = useSharedValue(0);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(searchDraft.trim());
    }, 400);
    return () => clearTimeout(id);
  }, [searchDraft]);

  useEffect(() => {
    searchFocus.value = withTiming(searchFocused ? 1 : 0, { duration: 220 });
  }, [searchFocused, searchFocus]);

  const searchFieldAnimStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      searchFocus.value,
      [0, 1],
      [colors.icon + "44", colors.tint + "AA"],
    ),
    transform: [
      {
        scale: interpolate(
          searchFocus.value,
          [0, 1],
          [1, 1.01],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const categoriesQuery = useCategories();
  const categories = useMemo(
    () => flattenCategories(categoriesQuery.data),
    [categoriesQuery.data],
  );

  const categoryLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) {
      m.set(c.id, c.name);
    }
    return m;
  }, [categories]);

  const resolveCategoryLabel = useCallback(
    (item: Product): string => {
      if (item.category?.trim()) return item.category.trim();
      if (item.categoryId) {
        return categoryLabelById.get(item.categoryId) ?? "";
      }
      return "";
    },
    [categoryLabelById],
  );

  const locationQuery = useBuyerCatalogLocation();
  const hasGeo =
    locationQuery.data?.latitude != null &&
    locationQuery.data?.longitude != null;
  const geo = hasGeo
    ? {
        latitude: locationQuery.data!.latitude,
        longitude: locationQuery.data!.longitude,
      }
    : {};

  useEffect(() => {
    if (!hasGeo && selectedRadiusKm != null) {
      setSelectedRadiusKm(null);
    }
  }, [hasGeo, selectedRadiusKm]);

  const productsQuery = useClientProductsCatalog({
    limit: 20,
    ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(hasGeo && selectedRadiusKm != null
      ? { radiusKm: selectedRadiusKm }
      : {}),
    ...geo,
  });

  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [productsQuery.data?.pages],
  );

  const isRefreshing =
    productsQuery.isRefetching ||
    categoriesQuery.isRefetching ||
    locationQuery.isRefetching;

  const isInitialLoading = productsQuery.isPending && products.length === 0;

  const onEndReached = useCallback(() => {
    if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
      void productsQuery.fetchNextPage();
    }
  }, [productsQuery]);

  const filterPanelEntering = reduceMotion
    ? undefined
    : FadeInDown.duration(480).delay(120).springify().damping(18);

  const listHeader = useMemo(
    () => (
      <View>
        <HomeHero
          tint={colors.tint}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          onOpenReports={() => setReportsVisible(true)}
        />
        <View style={styles.sliderSection}>
          <HomeSlider />
        </View>
        <Animated.View
          entering={reduceMotion ? undefined : FadeInUp.duration(420).delay(80)}
        >
          <AddProductListingButton
            horizontalPadding={16}
            style={styles.addListingButton}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/products",
                params: { openCreate: "1" },
              })
            }
          />
        </Animated.View>
        <Animated.View
          entering={filterPanelEntering}
          style={[
            styles.filtersPanel,
            uiCardShadow(scheme, {
              iosOffsetLight: 6,
              iosOffsetDark: 8,
              iosOpacityLight: 0.1,
              iosOpacityDark: 0.35,
              iosRadiusLight: 14,
              iosRadiusDark: 16,
              androidElevationLight: 4,
              androidElevationDark: 6,
            }),
            {
              backgroundColor: scheme === "dark" ? "#1A1D22" : "#FFFFFF",
              borderColor: colors.icon + "20",
              maxWidth: width - 32,
            },
          ]}
        >
          <View style={styles.productsTitleBlock}>
            <ThemedText type="subtitle" style={styles.productsTitle}>
              {t("homeProductsTitle")}
            </ThemedText>
            {locationQuery.data != null ? (
              <View
                style={[
                  styles.nearBadge,
                  { backgroundColor: colors.tint + "18" },
                ]}
              >
                <MaterialIcons name="near-me" size={13} color={colors.tint} />
                <ThemedText
                  style={[styles.nearBadgeText, { color: colors.tint }]}
                  numberOfLines={2}
                >
                  {t("homeProductsNearYouHint")}
                </ThemedText>
              </View>
            ) : null}
          </View>

          {categoriesQuery.isError ? (
            <ThemedText style={styles.categoryErrorText}>
              {t("homeCategoryErrorRetryHint")}
            </ThemedText>
          ) : null}
          {productsQuery.isError ? (
            <ThemedText style={styles.productsErrorText}>
              {t("homeProductsLoadError")}
            </ThemedText>
          ) : null}

          <Animated.View style={[styles.searchField, searchFieldAnimStyle]}>
            <MaterialIcons
              name="search"
              size={20}
              color={searchFocused ? colors.tint : colors.icon}
              style={styles.searchIcon}
            />
            <TextInput
              value={searchDraft}
              onChangeText={setSearchDraft}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder={t("homeSearchPlaceholder")}
              placeholderTextColor={colors.icon}
              style={[styles.searchInput, { color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchDraft.length > 0 ? (
              <Animated.View
                entering={FadeIn.duration(180)}
                exiting={FadeIn.duration(120)}
              >
                <Pressable
                  accessibilityLabel={t("homeSearchClearAccessibility")}
                  hitSlop={10}
                  onPress={() => {
                    setSearchDraft("");
                    setDebouncedSearch("");
                    void Haptics.selectionAsync();
                  }}
                  style={[
                    styles.searchClear,
                    { backgroundColor: colors.icon + "18" },
                  ]}
                >
                  <MaterialIcons name="close" size={16} color={colors.icon} />
                </Pressable>
              </Animated.View>
            ) : null}
          </Animated.View>

          <HomeRadiusFilter
            value={selectedRadiusKm}
            onChange={setSelectedRadiusKm}
            disabled={!hasGeo}
          />
        </Animated.View>
      </View>
    ),
    [
      categories,
      categoriesQuery.isError,
      colors.icon,
      colors.text,
      colors.tint,
      filterPanelEntering,
      hasGeo,
      locationQuery.data,
      productsQuery.isError,
      reduceMotion,
      router,
      scheme,
      searchDraft,
      searchFieldAnimStyle,
      searchFocused,
      selectedCategoryId,
      selectedRadiusKm,
      t,
      width,
    ],
  );

  const listFooter = useMemo(() => {
    if (productsQuery.isFetchingNextPage) {
      return (
        <Animated.View
          entering={FadeIn.duration(280)}
          style={styles.footerLoading}
        >
          <ActivityIndicator color={colors.tint} />
          <ThemedText style={styles.footerLoadingText}>
            {t("homeProductsLoadingMore")}
          </ThemedText>
        </Animated.View>
      );
    }
    return <View style={styles.footerSpacer} />;
  }, [colors.tint, productsQuery.isFetchingNextPage, t]);

  const emptyText = useMemo(() => {
    if (productsQuery.isError) return t("homeProductsLoadError");
    if (productsQuery.isPending) return t("homeLoadingProducts");
    if (debouncedSearch.length > 0) return t("homeNoProductsForSearch");
    return t("homeNoProductsForCategory");
  }, [debouncedSearch, productsQuery.isError, productsQuery.isPending, t]);

  const renderItem = useCallback(
    ({ item, index }: { item: Product; index: number }) => (
      <ProductCard
        item={item}
        index={index}
        categoryLabel={resolveCategoryLabel(item) || t("homeCategoryFallback")}
        onPress={(productId) =>
          router.push({
            pathname: "/product/[productId]",
            params: { productId },
          })
        }
      />
    ),
    [resolveCategoryLabel, router, t],
  );

  return (
    <ThemedView style={styles.container}>
      <HomeReportsSection
        visible={reportsVisible}
        onClose={() => setReportsVisible(false)}
      />
      <Animated.FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        itemLayoutAnimation={
          reduceMotion
            ? undefined
            : uiLayoutTransition.damping(22).stiffness(180)
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor={colors.tint}
            onRefresh={() => {
              void productsQuery.refetch();
              void categoriesQuery.refetch();
              void locationQuery.refetch();
            }}
          />
        }
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          isInitialLoading ? (
            <CatalogSkeleton tint={colors.tint} />
          ) : (
            <Animated.View
              entering={FadeIn.duration(400)}
              style={styles.emptyWrap}
            >
              <View
                style={[
                  styles.emptyIconWrap,
                  { backgroundColor: colors.tint + "14" },
                ]}
              >
                <MaterialIcons
                  name="inventory-2"
                  size={28}
                  color={colors.tint}
                />
              </View>
              <ThemedText style={styles.emptyText}>{emptyText}</ThemedText>
            </Animated.View>
          )
        }
        ListFooterComponent={listFooter}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.35}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
    flexGrow: 1,
  },
  sliderSection: {
    marginTop: 6,
  },
  addListingButton: {
    marginTop: 10,
    marginBottom: 4,
  },
  filtersPanel: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  productsTitleBlock: {
    gap: 8,
    marginBottom: 4,
    width: "100%",
  },
  productsTitle: {
    letterSpacing: -0.3,
  },
  nearBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  nearBadgeText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
  categoryErrorText: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.7,
  },
  productsErrorText: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.85,
    color: "#DC2626",
  },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 48,
    marginTop: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
  },
  searchClear: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  productCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  productImageWrap: {
    width: PRODUCT_IMAGE_SIZE,
    height: PRODUCT_IMAGE_SIZE,
    borderRadius: 14,
    overflow: "hidden",
  },
  productInfo: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  productTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  productTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
    minWidth: 0,
  },
  productCategory: {
    opacity: 0.62,
    fontSize: 12,
    lineHeight: 16,
  },
  productPostedAt: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    opacity: 0.72,
    textAlign: "right",
    maxWidth: "40%",
    flexShrink: 0,
  },
  productPrice: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  emptyWrap: {
    paddingHorizontal: 32,
    paddingTop: 28,
    paddingBottom: 16,
    alignItems: "center",
    gap: 12,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    opacity: 0.62,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  footerLoading: {
    paddingVertical: 20,
    alignItems: "center",
    gap: 10,
  },
  footerLoadingText: {
    fontSize: 12,
    opacity: 0.6,
  },
  footerSpacer: {
    height: 8,
  },
  skeletonWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  skeletonCard: {
    flexDirection: "row",
    gap: 14,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "rgba(120,120,120,0.12)",
  },
  skeletonThumb: {
    width: PRODUCT_IMAGE_SIZE,
    height: PRODUCT_IMAGE_SIZE,
    borderRadius: 14,
    backgroundColor: "rgba(120,120,120,0.18)",
  },
  skeletonLines: {
    flex: 1,
    justifyContent: "center",
  },
  skeletonLine: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(120,120,120,0.16)",
  },
});

import { AddProductListingButton } from "@/components/add-product-listing-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import type { Category } from "@/core/domain/entities/Category";
import type { Product } from "@/core/domain/entities/Product";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useBuyerCatalogLocation } from "@/presentation/hooks/useBuyerCatalogLocation";
import { useCategories } from "@/presentation/hooks/useCategories";
import { useClientProductsCatalog } from "@/presentation/hooks/useClientProducts";
import { useLocale } from "@/presentation/providers/LocaleProvider";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

import { HomeHero } from "./HomeHero";
import { HomeSlider } from "./HomeSlider";

const PRODUCT_IMAGE_SIZE = 76;

function flattenCategories(tree: Category[] | undefined): Category[] {
  if (!tree || tree.length === 0) return [];
  const out: Category[] = [];
  for (const root of tree) {
    out.push(root);
    for (const child of root.children) out.push(child);
  }
  return out;
}

function ProductCard({
  item,
  categoryLabel,
}: {
  item: Product;
  categoryLabel: string;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  return (
    <Pressable
      style={[styles.productCard, { borderColor: `${colors.icon}30` }]}
      accessibilityRole="button">
      <View style={styles.productImageWrap}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.productImage} contentFit="cover" />
        ) : (
          <View style={[styles.productImage, styles.productImageFallback]} />
        )}
      </View>
      <View style={styles.productInfo}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {item.name}
        </ThemedText>
        <ThemedText style={styles.productCategory} numberOfLines={1}>
          {categoryLabel}
        </ThemedText>
        <ThemedText style={styles.productPrice}>
          {item.price.toLocaleString()} MMK
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { t } = useLocale();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

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
  const geo =
    locationQuery.data?.latitude != null && locationQuery.data?.longitude != null
      ? {
          latitude: locationQuery.data.latitude,
          longitude: locationQuery.data.longitude,
        }
      : {};

  const productsQuery = useClientProductsCatalog({
    limit: 20,
    ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
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

  const onEndReached = useCallback(() => {
    if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
      void productsQuery.fetchNextPage();
    }
  }, [productsQuery]);

  const listHeader = useMemo(
    () => (
      <View>
        <HomeHero
          tint={colors.tint}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
        />
        <View style={styles.sliderSection}>
          <HomeSlider />
        </View>
        <AddProductListingButton
          horizontalPadding={16}
          style={styles.addListingButton}
          onPress={() =>
            router.push({ pathname: "/(tabs)/products", params: { openCreate: "1" } })
          }
        />
        <View style={styles.listHeader}>
          <ThemedText type="subtitle">{t("homeProductsTitle")}</ThemedText>
          {locationQuery.data != null ? (
            <ThemedText style={styles.nearYouHint}>{t("homeProductsNearYouHint")}</ThemedText>
          ) : null}
          {categoriesQuery.isError ? (
            <ThemedText style={styles.categoryErrorText}>
              {t("homeCategoryErrorRetryHint")}
            </ThemedText>
          ) : null}
          {productsQuery.isError ? (
            <ThemedText style={styles.productsErrorText}>{t("homeProductsLoadError")}</ThemedText>
          ) : null}
        </View>
      </View>
    ),
    [
      categories,
      categoriesQuery.isError,
      colors.tint,
      productsQuery.isError,
      router,
      selectedCategoryId,
      t,
      locationQuery.data,
    ],
  );

  const listFooter = useMemo(() => {
    if (productsQuery.isFetchingNextPage) {
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator />
          <ThemedText style={styles.footerLoadingText}>{t("homeProductsLoadingMore")}</ThemedText>
        </View>
      );
    }
    return null;
  }, [productsQuery.isFetchingNextPage, t]);

  const emptyText = productsQuery.isError
    ? t("homeProductsLoadError")
    : productsQuery.isPending
      ? t("homeLoadingProducts")
      : t("homeNoProductsForCategory");

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            item={item}
            categoryLabel={resolveCategoryLabel(item) || t("homeCategoryFallback")}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
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
          <View style={styles.emptyWrap}>
            <ThemedText style={styles.emptyText}>{emptyText}</ThemedText>
          </View>
        }
        ListFooterComponent={listFooter}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.35}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  listHeader: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  nearYouHint: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.65,
  },
  sliderSection: {
    marginTop: 6,
  },
  addListingButton: {
    marginTop: 10,
    marginBottom: 4,
  },
  categoryErrorText: {
    marginTop: 6,
    fontSize: 12,
    opacity: 0.7,
  },
  productsErrorText: {
    marginTop: 6,
    fontSize: 12,
    opacity: 0.75,
    color: "#DC2626",
  },
  productCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  productImageWrap: {
    width: PRODUCT_IMAGE_SIZE,
    height: PRODUCT_IMAGE_SIZE,
    borderRadius: 12,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productImageFallback: {
    backgroundColor: "rgba(120,120,120,0.2)",
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productCategory: {
    opacity: 0.6,
    fontSize: 13,
    lineHeight: 18,
  },
  productPrice: {
    marginTop: 6,
    color: "#F97316",
    fontWeight: "700",
  },
  emptyWrap: {
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: "center",
  },
  emptyText: {
    opacity: 0.6,
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: "center",
    gap: 8,
  },
  footerLoadingText: {
    fontSize: 12,
    opacity: 0.6,
  },
});

import { AddProductListingButton } from "@/components/add-product-listing-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import type { Product } from "@/core/domain/entities/Product";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocale } from "@/presentation/providers/LocaleProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";

import { MyProductCard } from "./MyProductCard";

export type MyProductsListingProps = {
  products: Product[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  isRefetching: boolean;
  isFetchingNextPage: boolean;
  categoryLabelFor: (product: Product) => string;
  archivePending: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  onEndReached: () => void;
  onCreatePress: () => void;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onArchive: (product: Product) => void;
};

function ListingSkeleton({ tint }: { tint: string }) {
  return (
    <View style={styles.skeletonWrap}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={`sk-${i}`}
          entering={FadeInUp.duration(360).delay(i * 70)}
          style={styles.skeletonCard}
        >
          <View style={styles.skeletonThumb} />
          <View style={styles.skeletonLines}>
            <View style={[styles.skeletonLine, { width: "70%" }]} />
            <View style={[styles.skeletonLine, { width: "45%", marginTop: 8 }]} />
            <View style={[styles.skeletonLine, { width: "55%", marginTop: 8 }]} />
          </View>
        </Animated.View>
      ))}
      <ActivityIndicator color={tint} style={{ marginTop: 8 }} />
    </View>
  );
}

export const MyProductsListing = memo(function MyProductsListing({
  products,
  totalCount,
  isLoading,
  isError,
  isRefetching,
  isFetchingNextPage,
  categoryLabelFor,
  archivePending,
  onRefresh,
  onRetry,
  onEndReached,
  onCreatePress,
  onView,
  onEdit,
  onArchive,
}: MyProductsListingProps) {
  const { t, tf } = useLocale();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];

  const countLabel = useMemo(
    () => tf("productsListingCount", { count: totalCount }),
    [tf, totalCount],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <View style={styles.titleBlock}>
          <ThemedText type="title" style={styles.screenTitle}>
            {t("productsMyTitle")}
          </ThemedText>
          <ThemedText style={styles.subtitle} numberOfLines={3}>
            {t("productsMySubtitle")}
          </ThemedText>
          {!isLoading && !isError ? (
            <View style={[styles.countPill, { backgroundColor: colors.tint + "14" }]}>
              <MaterialIcons name="inventory-2" size={14} color={colors.tint} />
              <ThemedText style={[styles.countText, { color: colors.tint }]} numberOfLines={1}>
                {countLabel}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <AddProductListingButton
          onPress={onCreatePress}
          horizontalPadding={0}
          style={styles.createButton}
        />

        {isError ? (
          <Animated.View
            entering={FadeIn.duration(280)}
            style={[styles.errorBanner, { borderColor: "#DC262644", backgroundColor: "#DC262612" }]}
          >
            <MaterialIcons name="error-outline" size={20} color="#DC2626" />
            <ThemedText style={styles.errorText} numberOfLines={3}>
              {t("productsLoadError")}
            </ThemedText>
            <Pressable
              onPress={onRetry}
              style={[styles.retryChip, { backgroundColor: colors.tint }]}
            >
              <ThemedText style={styles.retryChipText}>{t("productsRetry")}</ThemedText>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    ),
    [colors.tint, countLabel, isError, isLoading, onCreatePress, onRetry, t],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Product; index: number }) => (
      <MyProductCard
        product={item}
        index={index}
        categoryLabel={categoryLabelFor(item)}
        onView={onView}
        onEdit={onEdit}
        onArchive={onArchive}
        archivePending={archivePending}
      />
    ),
    [archivePending, categoryLabelFor, onArchive, onEdit, onView],
  );

  const listEmpty = useMemo(() => {
    if (isLoading) {
      return <ListingSkeleton tint={colors.tint} />;
    }
    if (isError) return null;
    return (
      <Animated.View entering={FadeIn.duration(400)} style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.tint + "14" }]}>
          <MaterialIcons name="add-shopping-cart" size={32} color={colors.tint} />
        </View>
        <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
          {t("productsEmpty")}
        </ThemedText>
        <ThemedText style={styles.emptyHint} numberOfLines={3}>
          {t("productsEmptyHint")}
        </ThemedText>
        <Pressable
          onPress={onCreatePress}
          style={[styles.emptyCta, { backgroundColor: colors.tint }]}
        >
          <MaterialIcons name="add" size={18} color="#FFFFFF" />
          <ThemedText style={styles.emptyCtaText}>{t("productsNewListing")}</ThemedText>
        </Pressable>
      </Animated.View>
    );
  }, [colors.tint, isError, isLoading, onCreatePress, t]);

  const listFooter = useMemo(() => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator color={colors.tint} />
          <ThemedText style={styles.footerText}>{t("productsLoadingMore")}</ThemedText>
        </View>
      );
    }
    return <View style={styles.footerSpacer} />;
  }, [colors.tint, isFetchingNextPage, t]);

  return (
    <ThemedView style={styles.container}>
      <Animated.FlatList
        data={isLoading || isError ? [] : products}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={onRefresh}
            tintColor={colors.tint}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.35}
      />
    </ThemedView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 56 : 48,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    flexGrow: 1,
    gap: 12,
  },
  headerBlock: {
    gap: 12,
    marginBottom: 4,
    width: "100%",
  },
  titleBlock: {
    gap: 6,
    width: "100%",
  },
  screenTitle: {
    letterSpacing: -0.4,
  },
  subtitle: {
    opacity: 0.62,
    fontSize: 14,
    lineHeight: 20,
  },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: "100%",
  },
  countText: {
    fontSize: 12,
    fontWeight: "800",
    flexShrink: 1,
  },
  createButton: {
    marginBottom: 4,
  },
  errorBanner: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    width: "100%",
  },
  errorText: {
    flex: 1,
    minWidth: 120,
    fontSize: 13,
    lineHeight: 18,
    color: "#DC2626",
  },
  retryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  retryChipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  empty: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 24,
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    textAlign: "center",
    fontSize: 16,
  },
  emptyHint: {
    textAlign: "center",
    opacity: 0.58,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 300,
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyCtaText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  footerLoading: {
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    opacity: 0.58,
  },
  footerSpacer: {
    height: 8,
  },
  skeletonWrap: {
    gap: 12,
    paddingTop: 8,
  },
  skeletonCard: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "rgba(120,120,120,0.1)",
  },
  skeletonThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "rgba(120,120,120,0.16)",
  },
  skeletonLines: {
    flex: 1,
    justifyContent: "center",
  },
  skeletonLine: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(120,120,120,0.14)",
  },
});

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useProducts } from "@/presentation/hooks/useProducts";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { Product } from "@/core/domain/entities/Product";

function ProductCard({ product }: { product: Product }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  return (
    <View style={[styles.card, { borderColor: colors.icon + "30" }]}>
      <View style={styles.cardContent}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {product.name}
        </ThemedText>
        <ThemedText style={styles.cardDescription} numberOfLines={2}>
          {product.description}
        </ThemedText>
        <View style={styles.cardFooter}>
          <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
            ${product.price.toFixed(2)}
          </ThemedText>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: product.isAvailable
                  ? "#2ecc7120"
                  : "#e74c3c20",
              },
            ]}>
            <ThemedText
              style={{
                fontSize: 12,
                color: product.isAvailable ? "#2ecc71" : "#e74c3c",
              }}>
              {product.isAvailable ? "Available" : "Unavailable"}
            </ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}

export function ProductListScreen() {
  const { data: products = [], isLoading, error, refetch, isRefetching } = useProducts();

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
        <ThemedText style={{ marginTop: 12 }}>Loading products...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={{ textAlign: "center", marginBottom: 12 }}>
          Failed to load products.{"\n"}Is the backend API running?
        </ThemedText>
        <Pressable onPress={() => refetch()} style={styles.retryButton}>
          <ThemedText style={styles.retryText}>Retry</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Products</ThemedText>
        <ThemedText style={styles.subtitle}>
          Manage your cafe menu items.
        </ThemedText>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProductCard product={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText style={{ opacity: 0.6 }}>
              No products yet. Add your first menu item!
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  subtitle: {
    opacity: 0.6,
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  cardContent: {
    padding: 16,
    gap: 4,
  },
  cardDescription: {
    opacity: 0.6,
    fontSize: 14,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  empty: {
    alignItems: "center",
    paddingTop: 48,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#0a7ea4",
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
});

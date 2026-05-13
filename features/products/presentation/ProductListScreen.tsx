import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";

import { AddProductListingButton } from "@/components/add-product-listing-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import type { Product } from "@/core/domain/entities/Product";
import type {
  ProductCondition,
  ProductCreateInput,
  ProductStatus,
  ProductUpdateInput,
} from "@/core/domain/types/product";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCategories } from "@/presentation/hooks/useCategories";
import {
  useCreateProduct,
  useDeleteProduct,
  useProduct,
  useProducts,
  useUpdateProduct,
} from "@/presentation/hooks/useProducts";
import { buildLeafletPickerHtml } from "@/presentation/lib/leafletPickerHtml";
import { useLocale } from "@/presentation/providers/LocaleProvider";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

const CONDITION_OPTIONS: ProductCondition[] = [
  "NEW",
  "LIKE_NEW",
  "GOOD",
  "FAIR",
  "POOR",
];
const STATUS_OPTIONS: ProductStatus[] = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "SOLD",
  "DELETED",
];

type ComposerMode = "create" | "edit";
type LocationCoords = { latitude: number; longitude: number };
type PreferredLocationForm = {
  label: string;
  address: string;
  latitude: string;
  longitude: string;
};
const MAX_PREFERRED_LOCATIONS = 3;

const EMPTY_PREFERRED_LOCATION: PreferredLocationForm = {
  label: "",
  address: "",
  latitude: "",
  longitude: "",
};

function parseOptionalNumber(text: string): number | undefined {
  const t = text.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function toPreferredLocationForm(raw: unknown): PreferredLocationForm | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const label =
    typeof row.label === "string" ? row.label.trim() : "";
  const address =
    typeof row.address === "string" ? row.address.trim() : "";
  const latRaw =
    typeof row.latitude === "number" || typeof row.latitude === "string"
      ? String(row.latitude)
      : "";
  const lngRaw =
    typeof row.longitude === "number" || typeof row.longitude === "string"
      ? String(row.longitude)
      : "";
  const latitude = latRaw.trim();
  const longitude = lngRaw.trim();
  if (!label && !address && !latitude && !longitude) return null;
  return { label, address, latitude, longitude };
}

type ProductFormState = {
  categoryId: string;
  title: string;
  description: string;
  price: string;
  condition: ProductCondition;
  status: ProductStatus;
  paymentMethods: ("CASH" | "KBZPAY")[];
  directTradeLocation: string;
  mapCoords: LocationCoords | null;
  mapScreenshotUrl: string;
  nearbyLandmarks: string;
  preferredTradeTime: string;
  preferredLocations: PreferredLocationForm[];
  imagesCsv: string;
  isDeliveryAvailable: boolean;
  deliveryFeePayer: "BUYER" | "SELLER";
};

const EMPTY_FORM: ProductFormState = {
  categoryId: "",
  title: "",
  description: "",
  price: "",
  condition: "GOOD",
  status: "ACTIVE",
  paymentMethods: ["CASH"],
  directTradeLocation: "",
  mapCoords: null,
  mapScreenshotUrl: "",
  nearbyLandmarks: "",
  preferredTradeTime: "",
  preferredLocations: [],
  imagesCsv: "",
  isDeliveryAvailable: false,
  deliveryFeePayer: "BUYER",
};

function splitCsv(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function formFromProduct(product: Product): ProductFormState {
  const status = STATUS_OPTIONS.includes(
    (product.status as ProductStatus) ?? "ACTIVE",
  )
    ? (product.status as ProductStatus)
    : "ACTIVE";
  const condition = CONDITION_OPTIONS.includes(
    (product.condition as ProductCondition) ?? "GOOD",
  )
    ? (product.condition as ProductCondition)
    : "GOOD";
  const validMethods = (product.paymentMethods ?? []).filter(
    (m): m is "CASH" | "KBZPAY" => m === "CASH" || m === "KBZPAY",
  );
  const methods: ("CASH" | "KBZPAY")[] =
    validMethods.length > 0 ? validMethods : ["CASH"];
  return {
    categoryId: product.categoryId ?? "",
    title: product.name,
    description: product.description,
    price: String(product.price ?? ""),
    condition,
    status,
    paymentMethods: methods,
    directTradeLocation: product.directTradeLocation ?? "",
    mapCoords:
      product.directTradeLatitude != null && product.directTradeLongitude != null
        ? {
            latitude: product.directTradeLatitude,
            longitude: product.directTradeLongitude,
          }
        : null,
    mapScreenshotUrl: product.mapScreenshotUrl ?? "",
    nearbyLandmarks: product.nearbyLandmarks ?? "",
    preferredTradeTime: product.preferredTradeTime ?? "",
    preferredLocations: (product.preferredLocations ?? [])
      .map(toPreferredLocationForm)
      .filter((v): v is PreferredLocationForm => v != null)
      .slice(0, MAX_PREFERRED_LOCATIONS),
    imagesCsv: (product.images ?? []).join(", "),
    isDeliveryAvailable: product.isDeliveryAvailable ?? false,
    deliveryFeePayer:
      product.deliveryFeePayer === "SELLER" ? "SELLER" : "BUYER",
  };
}

function ProductCard({
  product,
  onView,
  onEdit,
  onArchive,
  archivePending,
}: {
  product: Product;
  onView: (p: Product) => void;
  onEdit: (p: Product) => void;
  onArchive: (p: Product) => void;
  archivePending: boolean;
}) {
  const { t } = useLocale();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const statusText =
    product.status ?? (product.isAvailable ? "ACTIVE" : "SOLD");

  return (
    <View style={[styles.card, { borderColor: colors.icon + "30" }]}>
      <View style={styles.cardContent}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {product.name}
        </ThemedText>
        <ThemedText style={styles.cardDescription} numberOfLines={2}>
          {product.description}
        </ThemedText>
        <ThemedText style={styles.metaLine}>
          {t("productsLabelStatus")}: {statusText}
        </ThemedText>
        <View style={styles.cardFooter}>
          <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
            {product.price.toLocaleString()} MMK
          </ThemedText>
          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => onView(product)}
              style={[
                styles.neutralButton,
                { borderColor: colors.icon + "55" },
              ]}
            >
              <ThemedText style={[styles.neutralText, { color: colors.text }]}>
                {t("productsDetail")}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => onEdit(product)}
              style={[styles.editButton, { backgroundColor: colors.tint }]}
            >
              <ThemedText style={styles.editText}>
                {t("productsEdit")}
              </ThemedText>
            </Pressable>
            <Pressable
              disabled={archivePending}
              onPress={() => onArchive(product)}
              style={({ pressed }) => [
                styles.archiveButton,
                pressed && !archivePending && styles.archiveButtonPressed,
                archivePending && styles.archiveButtonDisabled,
              ]}
            >
              <ThemedText style={styles.archiveText}>
                {archivePending
                  ? t("productsArchiveShort")
                  : t("productsArchive")}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export function ProductListScreen() {
  const { t, tf } = useLocale();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const params = useLocalSearchParams<{ openCreate?: string }>();
  const chipSelected = (on: boolean) =>
    on
      ? {
          backgroundColor: `${colors.tint}33`,
          borderColor: colors.tint,
        }
      : undefined;

  const productsQuery = useProducts({ limit: 20 });
  const categoriesQuery = useCategories();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const [composerMode, setComposerMode] = useState<ComposerMode>("create");
  const [composerVisible, setComposerVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [isLocatingTradePoint, setIsLocatingTradePoint] = useState(false);
  const detailQuery = useProduct(detailId);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [productsQuery.data?.pages],
  );
  const categories = useMemo(
    () =>
      (categoriesQuery.data ?? []).flatMap((root) => [root, ...root.children]),
    [categoriesQuery.data],
  );
  const tradeMapHtml = useMemo(() => {
    if (!form.mapCoords) return "";
    return buildLeafletPickerHtml(
      form.mapCoords.latitude,
      form.mapCoords.longitude,
    );
  }, [form.mapCoords]);

  const applyTradeCoords = useCallback((coords: LocationCoords) => {
    setForm((prev) => ({ ...prev, mapCoords: coords }));
  }, []);

  const handleUseCurrentTradeLocation = useCallback(async () => {
    setIsLocatingTradePoint(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("productsAlertCoordsTitle"), t("productsAlertCoordsBody"));
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      applyTradeCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      Alert.alert(t("productsErrorRequestTitle"), t("productsErrorRequestBody"));
    } finally {
      setIsLocatingTradePoint(false);
    }
  }, [applyTradeCoords, t]);

  const addPreferredLocation = useCallback(() => {
    setForm((prev) => {
      if (prev.preferredLocations.length >= MAX_PREFERRED_LOCATIONS) return prev;
      return {
        ...prev,
        preferredLocations: [
          ...prev.preferredLocations,
          { ...EMPTY_PREFERRED_LOCATION },
        ],
      };
    });
  }, []);

  const removePreferredLocation = useCallback((idx: number) => {
    setForm((prev) => ({
      ...prev,
      preferredLocations: prev.preferredLocations.filter((_, i) => i !== idx),
    }));
  }, []);

  const updatePreferredLocation = useCallback(
    (idx: number, key: keyof PreferredLocationForm, value: string) => {
      setForm((prev) => ({
        ...prev,
        preferredLocations: prev.preferredLocations.map((row, i) =>
          i === idx ? { ...row, [key]: value } : row,
        ),
      }));
    },
    [],
  );

  useEffect(() => {
    if (!composerVisible && categories.length > 0 && !form.categoryId) {
      setForm((prev) => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [categories, composerVisible, form.categoryId]);

  const openCreate = useCallback(() => {
    setComposerMode("create");
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      categoryId: categories[0]?.id ?? "",
    });
    setComposerVisible(true);
  }, [categories]);

  useEffect(() => {
    if (params.openCreate !== "1") return;
    openCreate();
    router.setParams({ openCreate: undefined });
  }, [params.openCreate, openCreate]);

  const openEdit = (product: Product) => {
    setComposerMode("edit");
    setEditingId(product.id);
    setForm(formFromProduct(product));
    setComposerVisible(true);
  };

  const onArchive = (product: Product) => {
    Alert.alert(
      t("productsArchiveTitle"),
      tf("productsArchiveMessage", { name: product.name }),
      [
        { text: t("actionCancel"), style: "cancel" },
        {
          text: t("productsArchive"),
          style: "destructive",
          onPress: () => {
            deleteMutation.mutate({
              id: product.id,
              data: { confirmTitle: product.name },
            });
          },
        },
      ],
    );
  };

  const onSave = async () => {
    const title = form.title.trim();
    const description = form.description.trim();
    if (!form.categoryId) {
      Alert.alert(
        t("productsAlertCategoryTitle"),
        t("productsAlertCategoryBody"),
      );
      return;
    }
    if (!title || !description) {
      Alert.alert(
        t("productsAlertMissingTitle"),
        t("productsAlertMissingBody"),
      );
      return;
    }
    if (form.paymentMethods.length === 0) {
      Alert.alert(
        t("productsAlertPaymentTitle"),
        t("productsAlertPaymentBody"),
      );
      return;
    }

    const lat = form.mapCoords?.latitude;
    const lng = form.mapCoords?.longitude;
    const preferredLocations: ProductCreateInput["preferredLocations"] = [];
    for (const row of form.preferredLocations) {
      const label = row.label.trim();
      const address = row.address.trim();
      const latText = row.latitude.trim();
      const lngText = row.longitude.trim();
      const hasAny = !!(label || address || latText || lngText);
      if (!hasAny) continue;
      if (!label || !address) {
        Alert.alert(
          t("productsAlertPreferredLocationTitle"),
          t("productsAlertPreferredLocationBody"),
        );
        return;
      }
      if ((latText === "") !== (lngText === "")) {
        Alert.alert(t("productsAlertCoordsTitle"), t("productsAlertCoordsBody"));
        return;
      }
      const latParsed = parseOptionalNumber(latText);
      const lngParsed = parseOptionalNumber(lngText);
      if ((latText && latParsed == null) || (lngText && lngParsed == null)) {
        Alert.alert(t("productsAlertCoordsTitle"), t("productsAlertCoordsBody"));
        return;
      }
      preferredLocations.push({
        label,
        address,
        ...(latParsed != null ? { latitude: latParsed } : {}),
        ...(lngParsed != null ? { longitude: lngParsed } : {}),
      });
    }

    try {
      if (composerMode === "create") {
        const price = Number(form.price);
        if (!Number.isFinite(price) || price <= 0) {
          Alert.alert(
            t("productsAlertPriceTitle"),
            t("productsAlertPriceBody"),
          );
          return;
        }
        const payload: ProductCreateInput = {
          categoryId: form.categoryId,
          title,
          description,
          price,
          condition: form.condition,
          paymentMethods: form.paymentMethods,
          isDeliveryAvailable: form.isDeliveryAvailable,
          ...(form.directTradeLocation.trim()
            ? { directTradeLocation: form.directTradeLocation.trim() }
            : {}),
          ...(lat != null ? { directTradeLatitude: lat } : {}),
          ...(lng != null ? { directTradeLongitude: lng } : {}),
          ...(form.mapScreenshotUrl.trim()
            ? { mapScreenshotUrl: form.mapScreenshotUrl.trim() }
            : {}),
          ...(form.nearbyLandmarks.trim()
            ? { nearbyLandmarks: form.nearbyLandmarks.trim() }
            : {}),
          ...(form.preferredTradeTime.trim()
            ? { preferredTradeTime: form.preferredTradeTime.trim() }
            : {}),
          ...(preferredLocations.length > 0 ? { preferredLocations } : {}),
          ...(form.isDeliveryAvailable
            ? { deliveryFeePayer: form.deliveryFeePayer }
            : {}),
          ...(form.imagesCsv.trim()
            ? { images: splitCsv(form.imagesCsv) }
            : {}),
        };
        await createMutation.mutateAsync(payload);
      } else {
        if (!editingId) return;
        const payload: ProductUpdateInput = {
          categoryId: form.categoryId,
          title,
          description,
          condition: form.condition,
          paymentMethods: form.paymentMethods,
          isDeliveryAvailable: form.isDeliveryAvailable,
          status: form.status,
          ...(form.directTradeLocation.trim()
            ? { directTradeLocation: form.directTradeLocation.trim() }
            : {}),
          ...(lat != null ? { directTradeLatitude: lat } : {}),
          ...(lng != null ? { directTradeLongitude: lng } : {}),
          ...(form.mapScreenshotUrl.trim()
            ? { mapScreenshotUrl: form.mapScreenshotUrl.trim() }
            : {}),
          ...(form.nearbyLandmarks.trim()
            ? { nearbyLandmarks: form.nearbyLandmarks.trim() }
            : {}),
          ...(form.preferredTradeTime.trim()
            ? { preferredTradeTime: form.preferredTradeTime.trim() }
            : {}),
          ...(preferredLocations.length > 0 ? { preferredLocations } : {}),
          ...(form.isDeliveryAvailable
            ? { deliveryFeePayer: form.deliveryFeePayer }
            : {}),
          ...(form.imagesCsv.trim()
            ? { images: splitCsv(form.imagesCsv) }
            : {}),
        };
        await updateMutation.mutateAsync({ id: editingId, data: payload });
      }
      setComposerVisible(false);
      setEditingId(null);
      Alert.alert(
        t("productsSuccessTitle"),
        composerMode === "create"
          ? t("productsSuccessCreated")
          : t("productsSuccessUpdated"),
      );
    } catch {
      Alert.alert(
        t("productsErrorRequestTitle"),
        t("productsErrorRequestBody"),
      );
    }
  };

  if (productsQuery.isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={{ marginTop: 12 }}>
          {t("productsLoading")}
        </ThemedText>
      </ThemedView>
    );
  }

  if (productsQuery.error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={{ textAlign: "center", marginBottom: 12 }}>
          {t("productsLoadError")}
        </ThemedText>
        <Pressable
          onPress={() => productsQuery.refetch()}
          style={[styles.retryButton, { backgroundColor: colors.tint }]}
        >
          <ThemedText style={styles.retryText}>{t("productsRetry")}</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">{t("productsMyTitle")}</ThemedText>
        <ThemedText style={styles.subtitle}>
          {t("productsMySubtitle")}
        </ThemedText>
      </View>
      <AddProductListingButton
        onPress={openCreate}
        horizontalPadding={24}
        style={styles.createButtonWrap}
      />

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onView={(p) => setDetailId(p.id)}
            onEdit={openEdit}
            onArchive={onArchive}
            archivePending={deleteMutation.isPending}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={productsQuery.isRefetching}
            onRefresh={productsQuery.refetch}
          />
        }
        onEndReached={() => {
          if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
            void productsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          productsQuery.isFetchingNextPage ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator color={colors.tint} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText style={{ opacity: 0.6 }}>
              {t("productsEmpty")}
            </ThemedText>
          </View>
        }
      />

      <Modal
        visible={detailId != null}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[styles.modalCard, { backgroundColor: colors.background }]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">
                {t("productsModalDetailTitle")}
              </ThemedText>
              <Pressable onPress={() => setDetailId(null)}>
                <ThemedText style={[styles.closeText, { color: colors.tint }]}>
                  {t("productsModalClose")}
                </ThemedText>
              </Pressable>
            </View>
            {detailQuery.isLoading ? (
              <View style={styles.centeredBlock}>
                <ActivityIndicator color={colors.tint} />
              </View>
            ) : detailQuery.data ? (
              <ScrollView style={styles.detailBody}>
                <ThemedText style={styles.detailRow}>
                  {t("productsLabelTitle")}: {detailQuery.data.name}
                </ThemedText>
                <ThemedText style={styles.detailRow}>
                  {t("productsLabelStatus")}: {detailQuery.data.status ?? "-"}
                </ThemedText>
                <ThemedText style={styles.detailRow}>
                  {t("productsLabelCondition")}:{" "}
                  {detailQuery.data.condition ?? "-"}
                </ThemedText>
                <ThemedText style={styles.detailRow}>
                  {t("productsLabelCategoryId")}:{" "}
                  {detailQuery.data.categoryId ?? "-"}
                </ThemedText>
                <ThemedText style={styles.detailRow}>
                  {t("productsLabelPayment")}:{" "}
                  {(detailQuery.data.paymentMethods ?? []).join(", ") || "-"}
                </ThemedText>
                <ThemedText style={styles.detailRow}>
                  {t("productsLabelLocation")}:{" "}
                  {detailQuery.data.directTradeLocation ?? "-"}
                </ThemedText>
                <ThemedText style={styles.detailRow}>
                  {t("productsLabelPrice")}:{" "}
                  {detailQuery.data.price.toLocaleString()} MMK
                </ThemedText>
                <ThemedText style={styles.detailRow}>
                  {t("productsLabelDescription")}:
                </ThemedText>
                <ThemedText style={styles.detailDescription}>
                  {detailQuery.data.description}
                </ThemedText>
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
        visible={composerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setComposerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[styles.modalCard, { backgroundColor: colors.background }]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">
                {composerMode === "create"
                  ? t("productsModalCreateTitle")
                  : t("productsModalEditTitle")}
              </ThemedText>
              <Pressable onPress={() => setComposerVisible(false)}>
                <ThemedText style={[styles.closeText, { color: colors.tint }]}>
                  {t("productsModalClose")}
                </ThemedText>
              </Pressable>
            </View>
            <ScrollView style={styles.formBody}>
              <ThemedText style={styles.fieldLabel}>
                {t("productsFieldCategory")}
              </ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsWrap}
              >
                {categories.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() =>
                      setForm((prev) => ({ ...prev, categoryId: c.id }))
                    }
                    style={[
                      styles.chip,
                      chipSelected(form.categoryId === c.id),
                    ]}
                  >
                    <ThemedText
                      style={[styles.chipText, { color: colors.text }]}
                    >
                      {c.name}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>

              <ThemedText style={styles.fieldLabel}>
                {t("productsFieldTitle")}
              </ThemedText>
              <TextInput
                value={form.title}
                onChangeText={(title) =>
                  setForm((prev) => ({ ...prev, title }))
                }
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.icon + "66" },
                ]}
                placeholder={t("productsPlaceholderTitle")}
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>
                {t("productsFieldDescription")}
              </ThemedText>
              <TextInput
                value={form.description}
                onChangeText={(description) =>
                  setForm((prev) => ({ ...prev, description }))
                }
                style={[
                  styles.input,
                  styles.textarea,
                  { color: colors.text, borderColor: colors.icon + "66" },
                ]}
                multiline
                placeholder={t("productsPlaceholderDescription")}
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>
                {t("productsFieldPriceCreateOnly")}
              </ThemedText>
              <TextInput
                editable={composerMode === "create"}
                value={form.price}
                onChangeText={(price) =>
                  setForm((prev) => ({ ...prev, price }))
                }
                keyboardType="numeric"
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.icon + "66" },
                  composerMode !== "create" && styles.inputDisabled,
                ]}
                placeholder={t("productsPlaceholderPrice")}
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>
                {t("productsFieldCondition")}
              </ThemedText>
              <View style={styles.inlineWrap}>
                {CONDITION_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() =>
                      setForm((prev) => ({ ...prev, condition: option }))
                    }
                    style={[
                      styles.chip,
                      chipSelected(form.condition === option),
                    ]}
                  >
                    <ThemedText
                      style={[styles.chipText, { color: colors.text }]}
                    >
                      {option}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              {composerMode === "edit" ? (
                <>
                  <ThemedText style={styles.fieldLabel}>
                    {t("productsFieldStatus")}
                  </ThemedText>
                  <View style={styles.inlineWrap}>
                    {STATUS_OPTIONS.map((option) => (
                      <Pressable
                        key={option}
                        onPress={() =>
                          setForm((prev) => ({ ...prev, status: option }))
                        }
                        style={[
                          styles.chip,
                          chipSelected(form.status === option),
                        ]}
                      >
                        <ThemedText
                          style={[styles.chipText, { color: colors.text }]}
                        >
                          {option}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              <ThemedText style={styles.fieldLabel}>
                {t("productsFieldPaymentMethods")}
              </ThemedText>
              <View style={styles.inlineWrap}>
                {(["CASH", "KBZPAY"] as const).map((method) => {
                  const selected = form.paymentMethods.includes(method);
                  return (
                    <Pressable
                      key={method}
                      onPress={() =>
                        setForm((prev) => ({
                          ...prev,
                          paymentMethods: selected
                            ? prev.paymentMethods.filter((m) => m !== method)
                            : [...prev.paymentMethods, method],
                        }))
                      }
                      style={[styles.chip, chipSelected(selected)]}
                    >
                      <ThemedText
                        style={[styles.chipText, { color: colors.text }]}
                      >
                        {method}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <ThemedText style={styles.fieldLabel}>
                {t("productsFieldDirectLocation")}
              </ThemedText>
              <TextInput
                value={form.directTradeLocation}
                onChangeText={(directTradeLocation) =>
                  setForm((prev) => ({ ...prev, directTradeLocation }))
                }
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.icon + "66" },
                ]}
                placeholder={t("productsPlaceholderLocation")}
                placeholderTextColor={colors.icon}
              />

              <View style={styles.mapWrap}>
                {form.mapCoords ? (
                  <WebView
                    key={`${form.mapCoords.latitude},${form.mapCoords.longitude}`}
                    style={styles.map}
                    originWhitelist={["*"]}
                    source={{ html: tradeMapHtml }}
                    onMessage={(e) => {
                      try {
                        const data = JSON.parse(e.nativeEvent.data) as
                          | LocationCoords
                          | undefined;
                        if (
                          typeof data?.latitude === "number" &&
                          typeof data?.longitude === "number"
                        ) {
                          applyTradeCoords(data);
                        }
                      } catch {
                        // ignore malformed message from webview
                      }
                    }}
                  />
                ) : (
                  <View
                    style={[
                      styles.mapPlaceholder,
                      {
                        borderColor: colors.icon + "66",
                        backgroundColor: colors.background,
                      },
                    ]}
                  >
                    <ThemedText style={{ opacity: 0.72, textAlign: "center" }}>
                      {t("productsMapPickHint")}
                    </ThemedText>
                  </View>
                )}
              </View>
              <Pressable
                onPress={() => void handleUseCurrentTradeLocation()}
                disabled={isLocatingTradePoint}
                style={[
                  styles.locationButton,
                  { borderColor: colors.tint },
                  isLocatingTradePoint && styles.archiveButtonDisabled,
                ]}
              >
                <ThemedText style={{ color: colors.tint, fontWeight: "700" }}>
                  {isLocatingTradePoint
                    ? t("productsMapLocating")
                    : form.mapCoords
                      ? t("productsMapUpdateFromCurrent")
                      : t("productsMapUseCurrent")}
                </ThemedText>
              </Pressable>
              {form.mapCoords ? (
                <ThemedText style={styles.coordSummary}>
                  {t("productsFieldLatitude")}:{" "}
                  {form.mapCoords.latitude.toFixed(6)}  {t("productsFieldLongitude")}
                  : {form.mapCoords.longitude.toFixed(6)}
                </ThemedText>
              ) : null}

              <ThemedText style={styles.fieldLabel}>
                {t("productsFieldNearbyLandmarks")}
              </ThemedText>
              <TextInput
                value={form.nearbyLandmarks}
                onChangeText={(nearbyLandmarks) =>
                  setForm((prev) => ({ ...prev, nearbyLandmarks }))
                }
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.icon + "66" },
                ]}
                placeholder={t("productsPlaceholderNearbyLandmarks")}
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>
                {t("productsFieldPreferredTradeTime")}
              </ThemedText>
              <TextInput
                value={form.preferredTradeTime}
                onChangeText={(preferredTradeTime) =>
                  setForm((prev) => ({ ...prev, preferredTradeTime }))
                }
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.icon + "66" },
                ]}
                placeholder={t("productsPlaceholderPreferredTradeTime")}
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>
                {t("productsFieldMapScreenshotUrl")}
              </ThemedText>
              <TextInput
                value={form.mapScreenshotUrl}
                onChangeText={(mapScreenshotUrl) =>
                  setForm((prev) => ({ ...prev, mapScreenshotUrl }))
                }
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.icon + "66" },
                ]}
                placeholder={t("productsPlaceholderMapScreenshotUrl")}
                placeholderTextColor={colors.icon}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.preferredHeader}>
                <ThemedText style={styles.fieldLabel}>
                  {t("productsFieldPreferredLocations")}
                </ThemedText>
                <Pressable
                  onPress={addPreferredLocation}
                  disabled={
                    form.preferredLocations.length >= MAX_PREFERRED_LOCATIONS
                  }
                  style={[
                    styles.addPreferredButton,
                    { borderColor: colors.tint },
                    form.preferredLocations.length >= MAX_PREFERRED_LOCATIONS &&
                      styles.archiveButtonDisabled,
                  ]}
                >
                  <ThemedText style={{ color: colors.tint, fontWeight: "700" }}>
                    {t("productsPreferredLocationAdd")}
                  </ThemedText>
                </Pressable>
              </View>
              {form.preferredLocations.map((row, idx) => (
                <View
                  key={`preferred-location-${idx}`}
                  style={[
                    styles.preferredCard,
                    { borderColor: colors.icon + "55" },
                  ]}
                >
                  <View style={styles.preferredCardHeader}>
                    <ThemedText style={styles.preferredCardTitle}>
                      {t("productsFieldPreferredLocationItem")} #{idx + 1}
                    </ThemedText>
                    <Pressable
                      onPress={() => removePreferredLocation(idx)}
                      style={styles.preferredRemoveBtn}
                    >
                      <ThemedText style={styles.preferredRemoveText}>
                        {t("productsPreferredLocationRemove")}
                      </ThemedText>
                    </Pressable>
                  </View>
                  <TextInput
                    value={row.label}
                    onChangeText={(value) =>
                      updatePreferredLocation(idx, "label", value)
                    }
                    style={[
                      styles.input,
                      { color: colors.text, borderColor: colors.icon + "66" },
                    ]}
                    placeholder={t("productsPlaceholderPreferredLocationLabel")}
                    placeholderTextColor={colors.icon}
                  />
                  <TextInput
                    value={row.address}
                    onChangeText={(value) =>
                      updatePreferredLocation(idx, "address", value)
                    }
                    style={[
                      styles.input,
                      { color: colors.text, borderColor: colors.icon + "66" },
                    ]}
                    placeholder={t("productsPlaceholderPreferredLocationAddress")}
                    placeholderTextColor={colors.icon}
                  />
                  <View style={styles.preferredCoordsRow}>
                    <TextInput
                      value={row.latitude}
                      onChangeText={(value) =>
                        updatePreferredLocation(idx, "latitude", value)
                      }
                      style={[
                        styles.input,
                        styles.preferredCoordInput,
                        { color: colors.text, borderColor: colors.icon + "66" },
                      ]}
                      keyboardType="decimal-pad"
                      placeholder={t(
                        "productsPlaceholderPreferredLocationLatitude",
                      )}
                      placeholderTextColor={colors.icon}
                    />
                    <TextInput
                      value={row.longitude}
                      onChangeText={(value) =>
                        updatePreferredLocation(idx, "longitude", value)
                      }
                      style={[
                        styles.input,
                        styles.preferredCoordInput,
                        { color: colors.text, borderColor: colors.icon + "66" },
                      ]}
                      keyboardType="decimal-pad"
                      placeholder={t(
                        "productsPlaceholderPreferredLocationLongitude",
                      )}
                      placeholderTextColor={colors.icon}
                    />
                  </View>
                </View>
              ))}

              <ThemedText style={styles.fieldLabel}>
                {t("productsFieldImages")}
              </ThemedText>
              <TextInput
                value={form.imagesCsv}
                onChangeText={(imagesCsv) =>
                  setForm((prev) => ({ ...prev, imagesCsv }))
                }
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.icon + "66" },
                ]}
                placeholder={t("productsPlaceholderImages")}
                placeholderTextColor={colors.icon}
              />

              <ThemedText style={styles.fieldLabel}>
                {t("productsFieldDelivery")}
              </ThemedText>
              <View style={styles.inlineWrap}>
                <Pressable
                  onPress={() =>
                    setForm((prev) => ({ ...prev, isDeliveryAvailable: true }))
                  }
                  style={[styles.chip, chipSelected(form.isDeliveryAvailable)]}
                >
                  <ThemedText style={[styles.chipText, { color: colors.text }]}>
                    {t("productsDeliveryOn")}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setForm((prev) => ({ ...prev, isDeliveryAvailable: false }))
                  }
                  style={[styles.chip, chipSelected(!form.isDeliveryAvailable)]}
                >
                  <ThemedText style={[styles.chipText, { color: colors.text }]}>
                    {t("productsDeliveryOff")}
                  </ThemedText>
                </Pressable>
                {form.isDeliveryAvailable ? (
                  <>
                    <Pressable
                      onPress={() =>
                        setForm((prev) => ({
                          ...prev,
                          deliveryFeePayer: "BUYER",
                        }))
                      }
                      style={[
                        styles.chip,
                        chipSelected(form.deliveryFeePayer === "BUYER"),
                      ]}
                    >
                      <ThemedText
                        style={[styles.chipText, { color: colors.text }]}
                      >
                        {t("productsDeliveryBuyerPays")}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        setForm((prev) => ({
                          ...prev,
                          deliveryFeePayer: "SELLER",
                        }))
                      }
                      style={[
                        styles.chip,
                        chipSelected(form.deliveryFeePayer === "SELLER"),
                      ]}
                    >
                      <ThemedText
                        style={[styles.chipText, { color: colors.text }]}
                      >
                        {t("productsDeliverySellerPays")}
                      </ThemedText>
                    </Pressable>
                  </>
                ) : null}
              </View>

              <Pressable
                onPress={onSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                style={({ pressed }) => [
                  styles.saveButton,
                  { backgroundColor: colors.tint },
                  pressed && styles.archiveButtonPressed,
                  (createMutation.isPending || updateMutation.isPending) &&
                    styles.archiveButtonDisabled,
                ]}
              >
                <ThemedText style={styles.saveButtonText}>
                  {createMutation.isPending || updateMutation.isPending
                    ? t("productsSaving")
                    : composerMode === "create"
                      ? t("productsSaveCreate")
                      : t("productsSaveUpdate")}
                </ThemedText>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    marginBottom: 8,
  },
  createButtonWrap: {
    marginBottom: 12,
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
  metaLine: {
    opacity: 0.65,
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  neutralButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(120,120,120,0.45)",
  },
  neutralText: {
    fontSize: 12,
    fontWeight: "600",
  },
  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  editText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
  },
  archiveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#DC2626",
  },
  archiveButtonPressed: {
    opacity: 0.85,
  },
  archiveButtonDisabled: {
    opacity: 0.55,
  },
  archiveText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  empty: {
    alignItems: "center",
    paddingTop: 48,
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "88%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  closeText: {
    fontWeight: "700",
  },
  centeredBlock: {
    paddingVertical: 24,
    alignItems: "center",
  },
  detailBody: {
    maxHeight: 420,
  },
  detailRow: {
    marginBottom: 8,
  },
  detailDescription: {
    opacity: 0.8,
    marginBottom: 8,
    lineHeight: 20,
  },
  formBody: {
    maxHeight: 520,
  },
  fieldLabel: {
    marginTop: 10,
    marginBottom: 6,
    fontWeight: "600",
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  textarea: {
    minHeight: 84,
    textAlignVertical: "top",
  },
  chipsWrap: {
    marginBottom: 2,
  },
  inlineWrap: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    borderWidth: 1,
    borderColor: "rgba(120,120,120,0.35)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  mapWrap: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  map: {
    height: 220,
    width: "100%",
  },
  mapPlaceholder: {
    height: 220,
    width: "100%",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  locationButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  coordSummary: {
    marginTop: 8,
    opacity: 0.7,
    fontSize: 12,
  },
  preferredHeader: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  addPreferredButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  preferredCard: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  preferredCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  preferredCardTitle: {
    fontWeight: "700",
    fontSize: 12,
    opacity: 0.85,
  },
  preferredRemoveBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  preferredRemoveText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },
  preferredCoordsRow: {
    flexDirection: "row",
    gap: 8,
  },
  preferredCoordInput: {
    flex: 1,
  },
  saveButton: {
    marginTop: 16,
    marginBottom: 6,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
});

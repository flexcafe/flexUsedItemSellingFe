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
type ProductFormState = {
  categoryId: string;
  title: string;
  description: string;
  price: string;
  condition: ProductCondition;
  status: ProductStatus;
  paymentMethods: ("CASH" | "KBZPAY")[];
  directTradeLocation: string;
  latitude: string;
  longitude: string;
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
  latitude: "",
  longitude: "",
  imagesCsv: "",
  isDeliveryAvailable: false,
  deliveryFeePayer: "BUYER",
};

function parseOptionalNumber(text: string): number | undefined {
  const t = text.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

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
    latitude:
      product.directTradeLatitude != null
        ? String(product.directTradeLatitude)
        : "",
    longitude:
      product.directTradeLongitude != null
        ? String(product.directTradeLongitude)
        : "",
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

    const lat = parseOptionalNumber(form.latitude);
    const lng = parseOptionalNumber(form.longitude);
    if ((lat == null) !== (lng == null)) {
      Alert.alert(t("productsAlertCoordsTitle"), t("productsAlertCoordsBody"));
      return;
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

              <View style={styles.coordsRow}>
                <TextInput
                  value={form.latitude}
                  onChangeText={(latitude) =>
                    setForm((prev) => ({ ...prev, latitude }))
                  }
                  style={[
                    styles.input,
                    styles.coordInput,
                    { color: colors.text, borderColor: colors.icon + "66" },
                  ]}
                  keyboardType="decimal-pad"
                  placeholder={t("productsPlaceholderLat")}
                  placeholderTextColor={colors.icon}
                />
                <TextInput
                  value={form.longitude}
                  onChangeText={(longitude) =>
                    setForm((prev) => ({ ...prev, longitude }))
                  }
                  style={[
                    styles.input,
                    styles.coordInput,
                    { color: colors.text, borderColor: colors.icon + "66" },
                  ]}
                  keyboardType="decimal-pad"
                  placeholder={t("productsPlaceholderLng")}
                  placeholderTextColor={colors.icon}
                />
              </View>

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
  coordsRow: {
    flexDirection: "row",
    gap: 8,
  },
  coordInput: {
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

import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import type { LocationGeocodedAddress } from "expo-location";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { toAbsoluteMediaUrl } from "@/core/application/mappers/mediaUrl";
import type { Product } from "@/core/domain/entities/Product";
import type {
  ProductCondition,
  ProductCreateInput,
  ProductPaymentMethod,
  ProductStatus,
  ProductUpdateInput,
  UploadFile,
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
import {
  buildLeafletPickerHtml,
  buildLeafletStaticViewHtml,
} from "@/presentation/lib/leafletPickerHtml";
import {
  parseProductCondition,
  productConditionLabelKey,
  useLocale,
} from "@/presentation/providers/LocaleProvider";
import { File, Paths } from "expo-file-system";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MyProductsListing } from "./MyProductsListing";

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
/** Shared Leaflet map modal: one code path for preferred rows and direct trade. */
type MapPickerTarget =
  | { kind: "preferred"; rowIndex: number }
  | { kind: "directTrade" };
type PreferredLocationForm = {
  /** Stable list key — do not use array index (reorder breaks inputs). */
  id: string;
  label: string;
  address: string;
  latitude: string;
  longitude: string;
};
const MAX_PREFERRED_LOCATIONS = 3;
const COMPOSER_STEP_COUNT = 4;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_PRODUCT_IMAGES = 5;
const ALLOWED_UPLOAD_TYPES = new Set<UploadFile["type"]>([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function newPreferredRowId(): string {
  return `pl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyPreferredRow(): PreferredLocationForm {
  return {
    id: newPreferredRowId(),
    label: "",
    address: "",
    latitude: "",
    longitude: "",
  };
}

function parseOptionalNumber(text: string): number | undefined {
  const t = text.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function inferUploadType(
  mimeType: string | null | undefined,
  fileName: string,
): UploadFile["type"] | null {
  if (mimeType === "image/png") return "image/png";
  if (mimeType === "image/jpeg" || mimeType === "image/jpg")
    return "image/jpeg";
  if (mimeType === "image/webp") return "image/webp";
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return null;
}

function normalizeUploadFile(
  asset: ImagePicker.ImagePickerAsset,
): UploadFile | null {
  const uri = asset.uri?.trim();
  if (!uri) return null;
  const name =
    asset.fileName?.trim() || uri.split("/").pop() || `image-${Date.now()}.jpg`;
  const type = inferUploadType(asset.mimeType, name);
  if (!type) return null;
  return { uri, name, type };
}

/** Single-line address from Expo reverse geocode (user can edit in the form). */
function formatGeocodedAddress(a: LocationGeocodedAddress): string {
  const parts: string[] = [];
  const name = a.name?.trim();
  const streetLine = [a.streetNumber?.trim(), a.street?.trim()]
    .filter(Boolean)
    .join(" ")
    .trim();
  const locality = [a.district?.trim(), a.city?.trim(), a.subregion?.trim()]
    .filter(Boolean)
    .join(", ");
  const admin = [a.region?.trim(), a.postalCode?.trim()].filter(Boolean).join(" ");
  const country = a.country?.trim();

  if (name && name !== streetLine) parts.push(name);
  if (streetLine) parts.push(streetLine);
  if (locality) parts.push(locality);
  if (admin) parts.push(admin);
  if (country) parts.push(country);

  return parts.join(", ");
}

function toPreferredLocationForm(raw: unknown): PreferredLocationForm | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const label = typeof row.label === "string" ? row.label.trim() : "";
  const address = typeof row.address === "string" ? row.address.trim() : "";
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
  return {
    id: newPreferredRowId(),
    label,
    address,
    latitude,
    longitude,
  };
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
  mapScreenshotFile: UploadFile | null;
  existingMapScreenshotUrl: string;
  nearbyLandmarks: string;
  preferredTradeTime: string;
  preferredLocations: PreferredLocationForm[];
  imageFiles: UploadFile[];
  existingImageUrls: string[];
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
  mapScreenshotFile: null,
  existingMapScreenshotUrl: "",
  nearbyLandmarks: "",
  preferredTradeTime: "",
  preferredLocations: [createEmptyPreferredRow()],
  imageFiles: [],
  existingImageUrls: [],
  isDeliveryAvailable: false,
  deliveryFeePayer: "BUYER",
};

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
    validMethods.length > 0 ? [validMethods[0]] : ["CASH"];
  const parsedPreferred = (product.preferredLocations ?? [])
    .map(toPreferredLocationForm)
    .filter((v): v is PreferredLocationForm => v != null)
    .slice(0, MAX_PREFERRED_LOCATIONS);
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
      product.directTradeLatitude != null &&
      product.directTradeLongitude != null
        ? {
            latitude: product.directTradeLatitude,
            longitude: product.directTradeLongitude,
          }
        : null,
    mapScreenshotFile: null,
    existingMapScreenshotUrl: product.mapScreenshotUrl ?? "",
    nearbyLandmarks: product.nearbyLandmarks ?? "",
    preferredTradeTime: product.preferredTradeTime ?? "",
    preferredLocations:
      parsedPreferred.length > 0
        ? parsedPreferred
        : [createEmptyPreferredRow()],
    imageFiles: [],
    existingImageUrls: product.images ?? [],
    isDeliveryAvailable: product.isDeliveryAvailable ?? false,
    deliveryFeePayer:
      product.deliveryFeePayer === "SELLER" ? "SELLER" : "BUYER",
  };
}

function formatProductConditionForDisplay(
  raw: string | null | undefined,
  translate: (key: ReturnType<typeof productConditionLabelKey>) => string,
): string {
  const c = parseProductCondition(raw);
  return c ? translate(productConditionLabelKey(c)) : (raw ?? "-");
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
  /** Wizard step inside create/edit listing modal (0..COMPOSER_STEP_COUNT - 1). */
  const [composerStep, setComposerStep] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [isLocatingTradePoint, setIsLocatingTradePoint] = useState(false);
  const [mapPicker, setMapPicker] = useState<MapPickerTarget | null>(null);
  const [mapPickerCoords, setMapPickerCoords] = useState<LocationCoords | null>(
    null,
  );
  const [isLocatingMapPicker, setIsLocatingMapPicker] = useState(false);
  const mapPickerRef = useRef<MapPickerTarget | null>(null);
  const mapPickerCoordsRef = useRef<LocationCoords | null>(null);
  const directTradeGeocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const preferredGeocodeTimersRef = useRef<
    Map<number, ReturnType<typeof setTimeout>>
  >(new Map());
  const detailQuery = useProduct(detailId);
  const [form, setForm] = useState<ProductFormState>(() => ({
    ...EMPTY_FORM,
    preferredLocations: [createEmptyPreferredRow()],
  }));
  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [productsQuery.data?.pages],
  );
  const totalCount = productsQuery.data?.pages[0]?.total ?? products.length;
  const categories = useMemo(
    () =>
      (categoriesQuery.data ?? []).flatMap((root) => [root, ...root.children]),
    [categoriesQuery.data],
  );
  const categoryLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(c.id, c.name);
    return m;
  }, [categories]);
  const categoryLabelFor = useCallback(
    (product: Product): string => {
      if (product.category?.trim()) return product.category.trim();
      if (product.categoryId) {
        return categoryLabelById.get(product.categoryId) ?? "";
      }
      return "";
    },
    [categoryLabelById],
  );
  useEffect(() => {
    mapPickerRef.current = mapPicker;
  }, [mapPicker]);

  useEffect(() => {
    mapPickerCoordsRef.current = mapPickerCoords;
  }, [mapPickerCoords]);

  useEffect(() => {
    const preferredTimers = preferredGeocodeTimersRef.current;
    return () => {
      if (directTradeGeocodeTimerRef.current) {
        clearTimeout(directTradeGeocodeTimerRef.current);
      }
      preferredTimers.forEach((t) => clearTimeout(t));
      preferredTimers.clear();
    };
  }, []);

  const mapPickerHtml = useMemo(() => {
    if (!mapPickerCoords) return "";
    return buildLeafletPickerHtml(
      mapPickerCoords.latitude,
      mapPickerCoords.longitude,
    );
  }, [mapPickerCoords]);

  const directTradeStaticMapHtml = useMemo(() => {
    const c = form.mapCoords;
    if (!c) return "";
    return buildLeafletStaticViewHtml(c.latitude, c.longitude);
  }, [form.mapCoords]);

  const runReverseGeocodeDirectTrade = useCallback(
    async (coords: LocationCoords) => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") return;
        const results = await Location.reverseGeocodeAsync(coords);
        const first = results[0];
        if (!first) return;
        const text = formatGeocodedAddress(first).trim();
        if (!text) return;
        setForm((prev) => ({ ...prev, directTradeLocation: text }));
      } catch {
        // Reverse geocode is optional; user can type the address manually.
      }
    },
    [],
  );

  const scheduleReverseGeocodeDirectTrade = useCallback(
    (coords: LocationCoords) => {
      if (directTradeGeocodeTimerRef.current) {
        clearTimeout(directTradeGeocodeTimerRef.current);
      }
      directTradeGeocodeTimerRef.current = setTimeout(() => {
        directTradeGeocodeTimerRef.current = null;
        void runReverseGeocodeDirectTrade(coords);
      }, 450);
    },
    [runReverseGeocodeDirectTrade],
  );

  const flushReverseGeocodeDirectTrade = useCallback(
    (coords: LocationCoords) => {
      if (directTradeGeocodeTimerRef.current) {
        clearTimeout(directTradeGeocodeTimerRef.current);
        directTradeGeocodeTimerRef.current = null;
      }
      void runReverseGeocodeDirectTrade(coords);
    },
    [runReverseGeocodeDirectTrade],
  );

  const clearPreferredGeocodeTimer = useCallback((idx: number) => {
    const m = preferredGeocodeTimersRef.current;
    const t = m.get(idx);
    if (t) {
      clearTimeout(t);
      m.delete(idx);
    }
  }, []);

  const runReverseGeocodePreferredRow = useCallback(
    async (idx: number, coords: LocationCoords) => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") return;
        const results = await Location.reverseGeocodeAsync(coords);
        const first = results[0];
        if (!first) return;
        const text = formatGeocodedAddress(first).trim();
        if (!text) return;
        setForm((prev) => ({
          ...prev,
          preferredLocations: prev.preferredLocations.map((r, i) =>
            i === idx ? { ...r, address: text } : r,
          ),
        }));
      } catch {
        // Reverse geocode is optional; user can type the address manually.
      }
    },
    [],
  );

  const scheduleReverseGeocodePreferredRow = useCallback(
    (idx: number, coords: LocationCoords) => {
      clearPreferredGeocodeTimer(idx);
      const timer = setTimeout(() => {
        preferredGeocodeTimersRef.current.delete(idx);
        void runReverseGeocodePreferredRow(idx, coords);
      }, 450);
      preferredGeocodeTimersRef.current.set(idx, timer);
    },
    [clearPreferredGeocodeTimer, runReverseGeocodePreferredRow],
  );

  const flushReverseGeocodePreferredRow = useCallback(
    (idx: number, coords: LocationCoords) => {
      clearPreferredGeocodeTimer(idx);
      void runReverseGeocodePreferredRow(idx, coords);
    },
    [clearPreferredGeocodeTimer, runReverseGeocodePreferredRow],
  );

  const applyTradeCoords = useCallback(
    (coords: LocationCoords) => {
      setForm((prev) => ({ ...prev, mapCoords: coords }));
      scheduleReverseGeocodeDirectTrade(coords);
    },
    [scheduleReverseGeocodeDirectTrade],
  );

  const clearDirectTradePin = useCallback(() => {
    if (directTradeGeocodeTimerRef.current) {
      clearTimeout(directTradeGeocodeTimerRef.current);
      directTradeGeocodeTimerRef.current = null;
    }
    setForm((prev) => ({ ...prev, mapCoords: null }));
  }, []);

  const handleUseCurrentTradeLocation = useCallback(async () => {
    setIsLocatingTradePoint(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("productsAlertCoordsTitle"),
          t("productsAlertCoordsBody"),
        );
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
      Alert.alert(
        t("productsErrorRequestTitle"),
        t("productsErrorRequestBody"),
      );
    } finally {
      setIsLocatingTradePoint(false);
    }
  }, [applyTradeCoords, t]);

  const closeMapPicker = useCallback(() => {
    const target = mapPickerRef.current;
    const coordsSnap = mapPickerCoordsRef.current;
    mapPickerRef.current = null;
    setMapPicker(null);
    setMapPickerCoords(null);
    setIsLocatingMapPicker(false);
    if (target?.kind === "directTrade" && coordsSnap) {
      flushReverseGeocodeDirectTrade(coordsSnap);
    } else if (target?.kind === "preferred" && coordsSnap) {
      flushReverseGeocodePreferredRow(target.rowIndex, coordsSnap);
    }
  }, [flushReverseGeocodeDirectTrade, flushReverseGeocodePreferredRow]);

  useEffect(() => {
    if (!composerVisible) {
      closeMapPicker();
    }
  }, [composerVisible, closeMapPicker]);

  const openPreferredLocationMap = useCallback(
    (idx: number) => {
      const row = form.preferredLocations[idx];
      if (!row) return;
      const plat = parseOptionalNumber(row.latitude);
      const plng = parseOptionalNumber(row.longitude);
      const nextCoords: LocationCoords | null =
        plat != null && plng != null
          ? { latitude: plat, longitude: plng }
          : form.mapCoords
            ? { ...form.mapCoords }
            : null;
      mapPickerRef.current = { kind: "preferred", rowIndex: idx };
      setMapPicker({ kind: "preferred", rowIndex: idx });
      setMapPickerCoords(nextCoords);
    },
    [form.preferredLocations, form.mapCoords],
  );

  const openDirectTradeMap = useCallback(() => {
    mapPickerRef.current = { kind: "directTrade" };
    setMapPicker({ kind: "directTrade" });
    setMapPickerCoords(form.mapCoords ? { ...form.mapCoords } : null);
  }, [form.mapCoords]);

  const applyCoordsToPreferredRow = useCallback(
    (idx: number, coords: LocationCoords) => {
      const latStr = coords.latitude.toFixed(6);
      const lngStr = coords.longitude.toFixed(6);
      setForm((prev) => ({
        ...prev,
        preferredLocations: prev.preferredLocations.map((r, i) =>
          i === idx ? { ...r, latitude: latStr, longitude: lngStr } : r,
        ),
      }));
      setMapPickerCoords(coords);
      scheduleReverseGeocodePreferredRow(idx, coords);
    },
    [scheduleReverseGeocodePreferredRow],
  );

  const handleMapPickerMessage = useCallback(
    (raw: string) => {
      const target = mapPickerRef.current;
      if (!target) return;
      try {
        const data = JSON.parse(raw) as LocationCoords | undefined;
        if (
          typeof data?.latitude === "number" &&
          typeof data?.longitude === "number"
        ) {
          if (target.kind === "preferred") {
            applyCoordsToPreferredRow(target.rowIndex, data);
          } else {
            applyTradeCoords(data);
            setMapPickerCoords(data);
          }
        }
      } catch {
        // ignore malformed webview message
      }
    },
    [applyCoordsToPreferredRow, applyTradeCoords],
  );

  const handleUseCurrentMapPicker = useCallback(async () => {
    const target = mapPickerRef.current;
    if (!target) return;
    setIsLocatingMapPicker(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("productsAlertCoordsTitle"),
          t("productsAlertCoordsBody"),
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      if (target.kind === "preferred") {
        applyCoordsToPreferredRow(target.rowIndex, coords);
      } else {
        applyTradeCoords(coords);
        setMapPickerCoords(coords);
      }
    } catch {
      Alert.alert(
        t("productsErrorRequestTitle"),
        t("productsErrorRequestBody"),
      );
    } finally {
      setIsLocatingMapPicker(false);
    }
  }, [applyCoordsToPreferredRow, applyTradeCoords, t]);

  const clearPreferredLocationPin = useCallback((idx: number) => {
    clearPreferredGeocodeTimer(idx);
    setForm((prev) => ({
      ...prev,
      preferredLocations: prev.preferredLocations.map((r, i) =>
        i === idx ? { ...r, latitude: "", longitude: "" } : r,
      ),
    }));
  }, [clearPreferredGeocodeTimer]);

  const addPreferredLocation = useCallback(() => {
    setForm((prev) => {
      if (prev.preferredLocations.length >= MAX_PREFERRED_LOCATIONS)
        return prev;
      return {
        ...prev,
        preferredLocations: [
          ...prev.preferredLocations,
          createEmptyPreferredRow(),
        ],
      };
    });
  }, []);

  const removePreferredLocation = useCallback((idx: number) => {
    setForm((prev) => {
      if (prev.preferredLocations.length <= 1) {
        return {
          ...prev,
          preferredLocations: [createEmptyPreferredRow()],
        };
      }
      return {
        ...prev,
        preferredLocations: prev.preferredLocations.filter((_, i) => i !== idx),
      };
    });
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

  const requestMediaPermission = useCallback(async (): Promise<boolean> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        t("productsErrorRequestTitle"),
        t("productsAlertImagePermissionBody"),
      );
      return false;
    }
    return true;
  }, [t]);

  const ensureValidImageAsset = useCallback(
    (asset: ImagePicker.ImagePickerAsset): UploadFile | null => {
      if (
        typeof asset.fileSize === "number" &&
        asset.fileSize > MAX_UPLOAD_BYTES
      ) {
        Alert.alert(
          t("productsAlertImageSizeTitle"),
          t("productsAlertImageSizeBody"),
        );
        return null;
      }
      const file = normalizeUploadFile(asset);
      if (!file || !ALLOWED_UPLOAD_TYPES.has(file.type)) {
        Alert.alert(
          t("productsAlertImageTypeTitle"),
          t("productsAlertImageTypeBody"),
        );
        return null;
      }
      return file;
    },
    [t],
  );

  const toUploadReadyAsset = useCallback(
    async (
      asset: ImagePicker.ImagePickerAsset,
    ): Promise<ImagePicker.ImagePickerAsset | null> => {
      const uri = asset.uri?.trim();
      if (!uri) return null;
      if (Platform.OS !== "android" || !uri.startsWith("content://")) {
        return asset;
      }

      const mime = asset.mimeType ?? "";
      const extFromName = asset.fileName?.split(".").pop()?.toLowerCase();
      const ext =
        extFromName ||
        (mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg");
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const fileName = `upload-${stamp}.${ext}`;

      try {
        const source = new File(uri);
        const destination = new File(Paths.cache, fileName);
        source.copy(destination);
        return {
          ...asset,
          uri: destination.uri,
          fileName,
        };
      } catch {
        Alert.alert(
          t("productsErrorRequestTitle"),
          t("productsErrorRequestBody"),
        );
        return null;
      }
    },
    [t],
  );

  const pickProductImages = useCallback(async () => {
    const ok = await requestMediaPermission();
    if (!ok) return;
    const remain =
      MAX_PRODUCT_IMAGES -
      form.imageFiles.length -
      form.existingImageUrls.length;
    if (remain <= 0) {
      Alert.alert(
        t("productsAlertImagesLimitTitle"),
        t("productsAlertImagesLimitBody"),
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remain,
      quality: 0.9,
    });
    if (result.canceled) return;
    const selected: UploadFile[] = [];
    for (const asset of result.assets) {
      const uploadReadyAsset = await toUploadReadyAsset(asset);
      if (!uploadReadyAsset) return;
      const file = ensureValidImageAsset(uploadReadyAsset);
      if (!file) return;
      selected.push(file);
    }
    if (!selected.length) return;
    setForm((prev) => {
      const cap = Math.max(
        0,
        MAX_PRODUCT_IMAGES - prev.existingImageUrls.length,
      );
      const merged = [...prev.imageFiles, ...selected].slice(0, cap);
      return {
        ...prev,
        imageFiles: merged,
      };
    });
  }, [
    ensureValidImageAsset,
    form.existingImageUrls.length,
    form.imageFiles.length,
    requestMediaPermission,
    t,
    toUploadReadyAsset,
  ]);

  const pickMapScreenshot = useCallback(async () => {
    const ok = await requestMediaPermission();
    if (!ok) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.9,
      allowsMultipleSelection: false,
    });
    if (result.canceled) return;
    const uploadReadyAsset = await toUploadReadyAsset(result.assets[0]);
    if (!uploadReadyAsset) return;
    const file = ensureValidImageAsset(uploadReadyAsset);
    if (!file) return;
    setForm((prev) => ({
      ...prev,
      mapScreenshotFile: file,
    }));
  }, [ensureValidImageAsset, requestMediaPermission, toUploadReadyAsset]);

  useEffect(() => {
    if (!composerVisible && categories.length > 0 && !form.categoryId) {
      setForm((prev) => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [categories, composerVisible, form.categoryId]);

  useEffect(() => {
    if (!composerVisible) {
      setComposerStep(0);
    }
  }, [composerVisible]);

  const openCreate = useCallback(() => {
    setComposerMode("create");
    setEditingId(null);
    setComposerStep(0);
    setForm({
      ...EMPTY_FORM,
      preferredLocations: [createEmptyPreferredRow()],
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
    setComposerStep(0);
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

  const tryAdvanceComposerStep = useCallback(() => {
    if (composerStep === 0) {
      if (!form.categoryId) {
        Alert.alert(
          t("productsAlertCategoryTitle"),
          t("productsAlertCategoryBody"),
        );
        return;
      }
      if (!form.title.trim() || !form.description.trim()) {
        Alert.alert(
          t("productsAlertMissingTitle"),
          t("productsAlertMissingBody"),
        );
        return;
      }
      if (composerMode === "create") {
        const price = Number(form.price);
        if (!Number.isFinite(price) || price <= 0) {
          Alert.alert(
            t("productsAlertPriceTitle"),
            t("productsAlertPriceBody"),
          );
          return;
        }
      }
    } else if (composerStep === 1) {
      const paymentMethods: ProductPaymentMethod[] = [
        ...new Set(form.paymentMethods),
      ];
      if (paymentMethods.length === 0) {
        Alert.alert(
          t("productsAlertPaymentTitle"),
          t("productsAlertPaymentBody"),
        );
        return;
      }
    }
    setComposerStep((s) => Math.min(s + 1, COMPOSER_STEP_COUNT - 1));
  }, [composerMode, composerStep, form, t]);

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
    const paymentMethods: ProductPaymentMethod[] = [
      ...new Set(form.paymentMethods),
    ];
    if (paymentMethods.length === 0) {
      Alert.alert(
        t("productsAlertPaymentTitle"),
        t("productsAlertPaymentBody"),
      );
      return;
    }

    if (form.isDeliveryAvailable) {
      if (
        form.deliveryFeePayer !== "BUYER" &&
        form.deliveryFeePayer !== "SELLER"
      ) {
        Alert.alert(
          t("productsAlertDeliveryFeePayerTitle"),
          t("productsAlertDeliveryFeePayerBody"),
        );
        return;
      }
    }

    const lat = form.mapCoords?.latitude;
    const lng = form.mapCoords?.longitude;
    if ((lat != null) !== (lng != null)) {
      Alert.alert(t("productsAlertCoordsTitle"), t("productsAlertCoordsBody"));
      return;
    }

    const totalImages = form.imageFiles.length + form.existingImageUrls.length;
    if (totalImages > MAX_PRODUCT_IMAGES) {
      Alert.alert(
        t("productsAlertImagesLimitTitle"),
        t("productsAlertImagesLimitBody"),
      );
      return;
    }

    if (form.preferredLocations.length > MAX_PREFERRED_LOCATIONS) {
      Alert.alert(
        t("productsAlertPreferredLocationTitle"),
        t("productsAlertPreferredLocationBody"),
      );
      return;
    }
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
        Alert.alert(
          t("productsAlertCoordsTitle"),
          t("productsAlertCoordsBody"),
        );
        return;
      }
      const latParsed = parseOptionalNumber(latText);
      const lngParsed = parseOptionalNumber(lngText);
      if ((latText && latParsed == null) || (lngText && lngParsed == null)) {
        Alert.alert(
          t("productsAlertCoordsTitle"),
          t("productsAlertCoordsBody"),
        );
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
        /** Delivery off: never send `deliveryFeePayer` (BUYER/SELLER → 400). Delivery on: required payer. */
        const payload: ProductCreateInput = {
          categoryId: form.categoryId,
          title,
          description,
          price,
          condition: form.condition,
          paymentMethods,
          isDeliveryAvailable: form.isDeliveryAvailable,
          ...(form.isDeliveryAvailable
            ? { deliveryFeePayer: form.deliveryFeePayer }
            : {}),
          ...(form.directTradeLocation.trim()
            ? { directTradeLocation: form.directTradeLocation.trim() }
            : {}),
          ...(lat != null ? { directTradeLatitude: lat } : {}),
          ...(lng != null ? { directTradeLongitude: lng } : {}),
          ...(form.mapScreenshotFile
            ? { mapScreenshotFile: form.mapScreenshotFile }
            : {}),
          ...(form.nearbyLandmarks.trim()
            ? { nearbyLandmarks: form.nearbyLandmarks.trim() }
            : {}),
          ...(form.preferredTradeTime.trim()
            ? { preferredTradeTime: form.preferredTradeTime.trim() }
            : {}),
          ...(preferredLocations.length > 0 ? { preferredLocations } : {}),
          ...(form.imageFiles.length > 0
            ? { imageFiles: form.imageFiles }
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
          paymentMethods,
          isDeliveryAvailable: form.isDeliveryAvailable,
          status: form.status,
          ...(form.isDeliveryAvailable
            ? { deliveryFeePayer: form.deliveryFeePayer }
            : { deliveryFeePayer: null }),
          ...(form.directTradeLocation.trim()
            ? { directTradeLocation: form.directTradeLocation.trim() }
            : {}),
          ...(lat != null ? { directTradeLatitude: lat } : {}),
          ...(lng != null ? { directTradeLongitude: lng } : {}),
          ...(form.mapScreenshotFile
            ? { mapScreenshotFile: form.mapScreenshotFile }
            : {}),
          ...(form.nearbyLandmarks.trim()
            ? { nearbyLandmarks: form.nearbyLandmarks.trim() }
            : {}),
          ...(form.preferredTradeTime.trim()
            ? { preferredTradeTime: form.preferredTradeTime.trim() }
            : {}),
          ...(preferredLocations.length > 0 ? { preferredLocations } : {}),
          ...(form.imageFiles.length > 0
            ? { imageFiles: form.imageFiles }
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

  return (
    <>
      <MyProductsListing
        products={products}
        totalCount={totalCount}
        isLoading={productsQuery.isLoading}
        isError={productsQuery.isError}
        isRefetching={productsQuery.isRefetching}
        isFetchingNextPage={productsQuery.isFetchingNextPage}
        categoryLabelFor={categoryLabelFor}
        archivePending={deleteMutation.isPending}
        onRefresh={() => void productsQuery.refetch()}
        onRetry={() => void productsQuery.refetch()}
        onEndReached={() => {
          if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
            void productsQuery.fetchNextPage();
          }
        }}
        onCreatePress={openCreate}
        onView={(p) => setDetailId(p.id)}
        onEdit={openEdit}
        onArchive={onArchive}
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
                  {formatProductConditionForDisplay(
                    detailQuery.data.condition,
                    t,
                  )}
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
            <ThemedText
              style={[styles.composerProgress, { color: colors.text }]}
            >
              {tf("productsComposerProgress", {
                current: String(composerStep + 1),
                total: String(COMPOSER_STEP_COUNT),
              })}
            </ThemedText>
            <ThemedText
              style={[styles.composerStepHint, { color: colors.text }]}
            >
              {composerStep === 0
                ? t("productsComposerStepHint1")
                : composerStep === 1
                  ? t("productsComposerStepHint2")
                  : composerStep === 2
                    ? t("productsComposerStepHint3")
                    : t("productsComposerStepHint4")}
            </ThemedText>
            <ScrollView
              style={styles.formBody}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {composerStep === 0 ? (
                <>
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
                          {t(productConditionLabelKey(option))}
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
                </>
              ) : null}
              {composerStep === 1 ? (
                <>
                  <ThemedText style={styles.fieldLabel}>
                    {t("productsFieldPaymentMethods")}
                  </ThemedText>
                  <View style={styles.inlineWrap}>
                    {(["CASH", "KBZPAY"] as const).map((method) => {
                      const selected = form.paymentMethods[0] === method;
                      return (
                        <Pressable
                          key={method}
                          onPress={() =>
                            setForm((prev) => ({
                              ...prev,
                              paymentMethods: [method],
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
                    {t("productsFieldDelivery")}
                  </ThemedText>
                  <View style={styles.inlineWrap}>
                    <Pressable
                      onPress={() =>
                        setForm((prev) => ({
                          ...prev,
                          isDeliveryAvailable: true,
                        }))
                      }
                      style={[
                        styles.chip,
                        chipSelected(form.isDeliveryAvailable),
                      ]}
                    >
                      <ThemedText
                        style={[styles.chipText, { color: colors.text }]}
                      >
                        {t("productsDeliveryOn")}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        setForm((prev) => ({
                          ...prev,
                          isDeliveryAvailable: false,
                        }))
                      }
                      style={[
                        styles.chip,
                        chipSelected(!form.isDeliveryAvailable),
                      ]}
                    >
                      <ThemedText
                        style={[styles.chipText, { color: colors.text }]}
                      >
                        {t("productsDeliveryOff")}
                      </ThemedText>
                    </Pressable>
                  </View>
                  {form.isDeliveryAvailable ? (
                    <View style={[styles.inlineWrap, styles.deliveryPayerRow]}>
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
                    </View>
                  ) : null}
                </>
              ) : null}
              {composerStep === 2 ? (
                <>
                  <View
                    style={[
                      styles.directTradeMapCard,
                      {
                        borderColor: colors.icon + "44",
                        backgroundColor: colors.tint + "14",
                      },
                    ]}
                  >
                    <ThemedText style={styles.fieldLabel}>
                      {t("productsFieldDirectLocation")}
                    </ThemedText>
                    <ThemedText style={styles.fieldHint}>
                      {t("productsDirectTradeSectionHelp")}
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

                    {form.mapCoords ? (
                      <View
                        style={[
                          styles.directTradeCoordsCard,
                          {
                            borderColor: colors.tint + "44",
                            borderLeftColor: colors.tint,
                            backgroundColor: colors.background,
                          },
                        ]}
                      >
                        <ThemedText
                          type="defaultSemiBold"
                          style={styles.directTradeCoordsTitle}
                        >
                          {t("productsDirectTradeCoordsSaved")}
                        </ThemedText>
                        <View
                          style={[
                            styles.directTradeStaticMapWrap,
                            { borderColor: colors.icon + "44" },
                          ]}
                        >
                          <WebView
                            key={`dt-static-${form.mapCoords.latitude.toFixed(5)}-${form.mapCoords.longitude.toFixed(5)}`}
                            style={styles.directTradeStaticMap}
                            originWhitelist={["*"]}
                            source={{ html: directTradeStaticMapHtml }}
                            scrollEnabled={false}
                            nestedScrollEnabled={false}
                          />
                        </View>
                        <ThemedText style={styles.directTradeCoordLines}>
                          {t("productsFieldLatitude")}:{" "}
                          {form.mapCoords.latitude.toFixed(6)}
                          {"\n"}
                          {t("productsFieldLongitude")}:{" "}
                          {form.mapCoords.longitude.toFixed(6)}
                        </ThemedText>
                        <Pressable
                          onPress={clearDirectTradePin}
                          style={styles.directTradeClearPin}
                          hitSlop={8}
                        >
                          <ThemedText
                            style={{
                              color: colors.tint,
                              fontWeight: "700",
                              fontSize: 13,
                            }}
                          >
                            {t("productsDirectTradeClearPin")}
                          </ThemedText>
                        </Pressable>
                      </View>
                    ) : (
                      <ThemedText style={styles.preferredNoPin}>
                        {t("productsPreferredLocationNoPin")}
                      </ThemedText>
                    )}

                    <Pressable
                      onPress={openDirectTradeMap}
                      style={[
                        styles.directTradeMapPrimary,
                        { backgroundColor: colors.tint },
                      ]}
                    >
                      <ThemedText style={styles.directTradeMapPrimaryText}>
                        {t("productsDirectTradeOpenMap")}
                      </ThemedText>
                    </Pressable>

                    <ThemedText style={styles.directTradeGpsHint}>
                      {t("productsDirectTradeGpsHint")}
                    </ThemedText>
                    <Pressable
                      onPress={() => void handleUseCurrentTradeLocation()}
                      disabled={isLocatingTradePoint}
                      style={[
                        styles.locationButton,
                        {
                          borderColor: colors.tint,
                          marginTop: 0,
                        },
                        isLocatingTradePoint && styles.archiveButtonDisabled,
                      ]}
                    >
                      <ThemedText
                        style={{ color: colors.tint, fontWeight: "700" }}
                      >
                        {isLocatingTradePoint
                          ? t("productsMapLocating")
                          : form.mapCoords
                            ? t("productsMapUpdateFromCurrent")
                            : t("productsMapUseCurrent")}
                      </ThemedText>
                    </Pressable>
                  </View>

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
                  <Pressable
                    onPress={() => void pickMapScreenshot()}
                    style={[
                      styles.preferredMapPickButton,
                      { borderColor: colors.tint },
                    ]}
                  >
                    <ThemedText
                      style={{ color: colors.tint, fontWeight: "700" }}
                    >
                      {t("productsPickMapScreenshot")}
                    </ThemedText>
                  </Pressable>
                  {form.mapScreenshotFile ? (
                    <>
                      <ThemedText style={styles.coordSummary}>
                        {tf("productsSelectedMapScreenshot", {
                          name: form.mapScreenshotFile.name,
                        })}
                      </ThemedText>
                      <View
                        style={[
                          styles.mapScreenshotPreview,
                          { borderColor: colors.icon + "55" },
                        ]}
                      >
                        <Image
                          source={{ uri: form.mapScreenshotFile.uri }}
                          style={styles.mapScreenshotPreviewImage}
                          resizeMode="contain"
                        />
                        <View style={styles.selectedImageMetaRow}>
                          <ThemedText
                            numberOfLines={1}
                            style={styles.selectedImageName}
                          >
                            {form.mapScreenshotFile.name}
                          </ThemedText>
                          <Pressable
                            accessibilityLabel={t("productsClearMapScreenshot")}
                            onPress={() =>
                              setForm((prev) => ({
                                ...prev,
                                mapScreenshotFile: null,
                              }))
                            }
                            hitSlop={8}
                          >
                            <ThemedText style={styles.preferredClearPinText}>
                              ×
                            </ThemedText>
                          </Pressable>
                        </View>
                      </View>
                    </>
                  ) : form.existingMapScreenshotUrl ? (
                    <>
                      <ThemedText style={styles.coordSummary}>
                        {t("productsExistingMapScreenshot")}
                      </ThemedText>
                      <View
                        style={[
                          styles.mapScreenshotPreview,
                          { borderColor: colors.icon + "55" },
                        ]}
                      >
                        <Image
                          source={{
                            uri: toAbsoluteMediaUrl(
                              form.existingMapScreenshotUrl,
                            ),
                          }}
                          style={styles.mapScreenshotPreviewImage}
                          resizeMode="contain"
                        />
                      </View>
                    </>
                  ) : null}
                </>
              ) : null}
              {composerStep === 3 ? (
                <>
                  <ThemedText style={styles.fieldLabel}>
                    {t("productsFieldPreferredLocations")}
                  </ThemedText>
                  <ThemedText style={styles.fieldHint}>
                    {t("productsPreferredLocationsIntro")}
                  </ThemedText>
                  <View style={styles.preferredHeader}>
                    <Pressable
                      onPress={addPreferredLocation}
                      disabled={
                        form.preferredLocations.length >=
                        MAX_PREFERRED_LOCATIONS
                      }
                      style={[
                        styles.addPreferredButton,
                        { borderColor: colors.tint },
                        form.preferredLocations.length >=
                          MAX_PREFERRED_LOCATIONS &&
                          styles.archiveButtonDisabled,
                      ]}
                    >
                      <ThemedText
                        style={{ color: colors.tint, fontWeight: "700" }}
                      >
                        {t("productsPreferredLocationAdd")}
                      </ThemedText>
                    </Pressable>
                  </View>
                  {form.preferredLocations.map((row, idx) => (
                    <View
                      key={row.id}
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
                          disabled={form.preferredLocations.length <= 1}
                          style={[
                            styles.preferredRemoveBtn,
                            form.preferredLocations.length <= 1 &&
                              styles.preferredRemoveDisabled,
                          ]}
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
                          {
                            color: colors.text,
                            borderColor: colors.icon + "66",
                          },
                        ]}
                        placeholder={t(
                          "productsPlaceholderPreferredLocationLabel",
                        )}
                        placeholderTextColor={colors.icon}
                      />
                      <TextInput
                        value={row.address}
                        onChangeText={(value) =>
                          updatePreferredLocation(idx, "address", value)
                        }
                        style={[
                          styles.input,
                          {
                            color: colors.text,
                            borderColor: colors.icon + "66",
                          },
                        ]}
                        placeholder={t(
                          "productsPlaceholderPreferredLocationAddress",
                        )}
                        placeholderTextColor={colors.icon}
                      />
                      {parseOptionalNumber(row.latitude) != null &&
                      parseOptionalNumber(row.longitude) != null ? (
                        <>
                          <View
                            style={[
                              styles.preferredStaticMapWrap,
                              { borderColor: colors.icon + "44" },
                            ]}
                          >
                            <WebView
                              key={`pl-static-${row.id}-${row.latitude}-${row.longitude}`}
                              style={styles.preferredStaticMap}
                              originWhitelist={["*"]}
                              source={{
                                html: buildLeafletStaticViewHtml(
                                  parseOptionalNumber(row.latitude)!,
                                  parseOptionalNumber(row.longitude)!,
                                ),
                              }}
                              scrollEnabled={false}
                              nestedScrollEnabled={false}
                            />
                          </View>
                          <ThemedText style={styles.preferredCoordSummary}>
                            {t("productsFieldLatitude")}:{" "}
                            {parseOptionalNumber(row.latitude)!.toFixed(6)}{" "}
                            {t("productsFieldLongitude")}:{" "}
                            {parseOptionalNumber(row.longitude)!.toFixed(6)}
                          </ThemedText>
                        </>
                      ) : (
                        <ThemedText style={styles.preferredNoPin}>
                          {t("productsPreferredLocationNoPin")}
                        </ThemedText>
                      )}
                      <Pressable
                        onPress={() => openPreferredLocationMap(idx)}
                        style={[
                          styles.preferredMapPickButton,
                          { borderColor: colors.tint },
                        ]}
                      >
                        <ThemedText
                          style={{ color: colors.tint, fontWeight: "700" }}
                        >
                          {t("productsPreferredLocationPickMap")}
                        </ThemedText>
                      </Pressable>
                      {parseOptionalNumber(row.latitude) != null &&
                      parseOptionalNumber(row.longitude) != null ? (
                        <Pressable
                          onPress={() => clearPreferredLocationPin(idx)}
                          style={styles.preferredClearPin}
                        >
                          <ThemedText style={styles.preferredClearPinText}>
                            {t("productsPreferredLocationClearPin")}
                          </ThemedText>
                        </Pressable>
                      ) : null}
                    </View>
                  ))}

                  <ThemedText style={styles.fieldLabel}>
                    {t("productsFieldImages")}
                  </ThemedText>
                  <Pressable
                    onPress={() => void pickProductImages()}
                    style={[
                      styles.preferredMapPickButton,
                      { borderColor: colors.tint },
                    ]}
                  >
                    <ThemedText
                      style={{ color: colors.tint, fontWeight: "700" }}
                    >
                      {t("productsPickImages")}
                    </ThemedText>
                  </Pressable>
                  {form.existingImageUrls.length > 0 ? (
                    <>
                      <ThemedText style={styles.coordSummary}>
                        {tf("productsExistingImagesCount", {
                          count: form.existingImageUrls.length,
                        })}
                      </ThemedText>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.selectedImagesStrip}
                      >
                        {form.existingImageUrls.map((url, idx) => (
                          <View
                            key={`existing-${url}-${idx}`}
                            style={[
                              styles.selectedImageCard,
                              { borderColor: colors.icon + "55" },
                            ]}
                          >
                            <Image
                              source={{ uri: toAbsoluteMediaUrl(url) }}
                              style={styles.selectedImageThumb}
                              resizeMode="cover"
                            />
                            <View style={styles.selectedImageMetaRow}>
                              <ThemedText style={styles.selectedImageName}>
                                {idx + 1}/{form.existingImageUrls.length}
                              </ThemedText>
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                    </>
                  ) : null}
                  {form.imageFiles.length > 0 ? (
                    <>
                      <ThemedText style={styles.coordSummary}>
                        {tf("productsSelectedImagesCount", {
                          count: form.imageFiles.length,
                        })}
                      </ThemedText>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.selectedImagesStrip}
                      >
                        {form.imageFiles.map((file, idx) => (
                          <View
                            key={`${file.uri}-${idx}`}
                            style={[
                              styles.selectedImageCard,
                              { borderColor: colors.icon + "55" },
                            ]}
                          >
                            <Image
                              source={{ uri: file.uri }}
                              style={styles.selectedImageThumb}
                              resizeMode="cover"
                            />
                            <View style={styles.selectedImageMetaRow}>
                              <ThemedText
                                numberOfLines={1}
                                style={styles.selectedImageName}
                              >
                                {file.name}
                              </ThemedText>
                              <Pressable
                                onPress={() =>
                                  setForm((prev) => ({
                                    ...prev,
                                    imageFiles: prev.imageFiles.filter(
                                      (f) => f.uri !== file.uri,
                                    ),
                                  }))
                                }
                                hitSlop={8}
                              >
                                <ThemedText
                                  style={styles.preferredClearPinText}
                                >
                                  ×
                                </ThemedText>
                              </Pressable>
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                      <Pressable
                        onPress={() =>
                          setForm((prev) => ({ ...prev, imageFiles: [] }))
                        }
                        style={styles.preferredClearPin}
                      >
                        <ThemedText style={styles.preferredClearPinText}>
                          {t("productsClearSelectedImages")}
                        </ThemedText>
                      </Pressable>
                    </>
                  ) : null}
                </>
              ) : null}
            </ScrollView>
            <View style={styles.composerFooter}>
              {composerStep > 0 ? (
                <Pressable
                  onPress={() => setComposerStep((s) => Math.max(0, s - 1))}
                  style={({ pressed }) => [
                    styles.composerNavButton,
                    styles.composerNavSecondary,
                    { borderColor: colors.icon + "55" },
                    pressed && styles.archiveButtonPressed,
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.composerNavButtonText,
                      { color: colors.text },
                    ]}
                  >
                    {t("productsComposerBack")}
                  </ThemedText>
                </Pressable>
              ) : (
                <View style={styles.composerFooterSpacer} />
              )}
              {composerStep < COMPOSER_STEP_COUNT - 1 ? (
                <Pressable
                  onPress={tryAdvanceComposerStep}
                  style={({ pressed }) => [
                    styles.composerNavButton,
                    styles.composerNavPrimary,
                    { backgroundColor: colors.tint },
                    pressed && styles.archiveButtonPressed,
                  ]}
                >
                  <ThemedText style={styles.composerNavButtonTextPrimary}>
                    {t("productsComposerNext")}
                  </ThemedText>
                </Pressable>
              ) : (
                <Pressable
                  onPress={onSave}
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  style={({ pressed }) => [
                    styles.composerNavButton,
                    styles.composerNavPrimary,
                    { backgroundColor: colors.tint },
                    pressed && styles.archiveButtonPressed,
                    (createMutation.isPending || updateMutation.isPending) &&
                      styles.archiveButtonDisabled,
                  ]}
                >
                  <ThemedText style={styles.composerNavButtonTextPrimary}>
                    {createMutation.isPending || updateMutation.isPending
                      ? t("productsSaving")
                      : composerMode === "create"
                        ? t("productsSaveCreate")
                        : t("productsSaveUpdate")}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={mapPicker !== null}
        transparent
        animationType="slide"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={closeMapPicker}
      >
        <View style={styles.preferredMapModalBackdrop}>
          <View
            style={[
              styles.preferredMapModalCard,
              { backgroundColor: colors.background },
            ]}
          >
            <View style={styles.preferredMapModalHeader}>
              <View style={styles.preferredMapModalHeaderSide}>
                <Pressable onPress={closeMapPicker}>
                  <ThemedText style={{ color: colors.tint, fontWeight: "700" }}>
                    {t("productsModalClose")}
                  </ThemedText>
                </Pressable>
              </View>
              <View style={styles.preferredMapModalTitleWrap}>
                <ThemedText
                  type="subtitle"
                  style={styles.preferredMapModalTitle}
                  numberOfLines={1}
                >
                  {mapPicker?.kind === "preferred"
                    ? tf("productsPreferredLocationMapTitle", {
                        index: mapPicker.rowIndex + 1,
                      })
                    : t("productsDirectTradeMapTitle")}
                </ThemedText>
              </View>
              <View style={styles.preferredMapModalHeaderSide} />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={Platform.OS === "android"}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.preferredMapModalScrollContent}
            >
              <ThemedText style={styles.preferredMapModalHint}>
                {mapPicker?.kind === "preferred"
                  ? t("productsPreferredLocationMapHint")
                  : t("productsDirectTradeMapHint")}
              </ThemedText>
              <View style={styles.preferredMapModalMapWrap}>
                {mapPickerCoords ? (
                  <WebView
                    key={`mp-${mapPickerCoords.latitude},${mapPickerCoords.longitude}`}
                    style={[
                      styles.preferredLocationMap,
                      mapPicker?.kind === "directTrade" &&
                        styles.preferredLocationMapDirectTrade,
                    ]}
                    originWhitelist={["*"]}
                    source={{ html: mapPickerHtml }}
                    nestedScrollEnabled
                    onMessage={(e) =>
                      handleMapPickerMessage(e.nativeEvent.data)
                    }
                  />
                ) : (
                  <View
                    style={[
                      styles.preferredMapModalPlaceholder,
                      mapPicker?.kind === "directTrade" &&
                        styles.preferredMapModalPlaceholderDirectTrade,
                      { borderColor: colors.icon + "66" },
                    ]}
                  >
                    <ThemedText style={{ opacity: 0.72, textAlign: "center" }}>
                      {t("productsMapPickHint")}
                    </ThemedText>
                  </View>
                )}
              </View>
              <Pressable
                onPress={() => void handleUseCurrentMapPicker()}
                disabled={isLocatingMapPicker}
                style={[
                  styles.preferredMapModalLocateButton,
                  { borderColor: colors.tint },
                  isLocatingMapPicker && styles.archiveButtonDisabled,
                ]}
              >
                <ThemedText style={{ color: colors.tint, fontWeight: "700" }}>
                  {isLocatingMapPicker
                    ? t("productsMapLocating")
                    : mapPickerCoords
                      ? t("productsMapUpdateFromCurrent")
                      : t("productsMapUseCurrent")}
                </ThemedText>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
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
  composerProgress: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  composerStepHint: {
    fontSize: 12,
    opacity: 0.72,
    textAlign: "center",
    marginBottom: 10,
    lineHeight: 17,
    paddingHorizontal: 4,
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
  composerFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    marginTop: 2,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(120,120,120,0.22)",
  },
  composerFooterSpacer: {
    minWidth: 100,
  },
  composerNavButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    minWidth: 104,
    alignItems: "center",
    justifyContent: "center",
  },
  composerNavPrimary: {},
  composerNavSecondary: {
    borderWidth: 1,
  },
  composerNavButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  composerNavButtonTextPrimary: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
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
  deliveryPayerRow: {
    width: "100%",
    marginTop: 8,
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
  locationButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  directTradeMapCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 2,
  },
  directTradeCoordsCard: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  directTradeStaticMapWrap: {
    marginTop: 8,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
  },
  directTradeStaticMap: {
    width: "100%",
    height: 200,
    backgroundColor: "rgba(120,120,120,0.08)",
  },
  directTradeCoordsTitle: {
    fontSize: 13,
    marginBottom: 6,
  },
  directTradeCoordLines: {
    fontSize: 12,
    opacity: 0.82,
    lineHeight: 18,
  },
  directTradeClearPin: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingVertical: 2,
  },
  directTradeMapPrimary: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  directTradeMapPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  directTradeGpsHint: {
    fontSize: 11,
    opacity: 0.62,
    marginTop: 10,
    lineHeight: 16,
  },
  coordSummary: {
    marginTop: 8,
    opacity: 0.7,
    fontSize: 12,
  },
  selectedImagesStrip: {
    marginTop: 6,
    marginBottom: 4,
  },
  selectedImageCard: {
    width: 132,
    marginRight: 8,
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(120,120,120,0.08)",
  },
  selectedImageThumb: {
    width: "100%",
    height: 88,
  },
  selectedImageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  selectedImageName: {
    fontSize: 12,
    opacity: 0.75,
    flex: 1,
    marginRight: 6,
  },
  mapScreenshotPreview: {
    width: "100%",
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(120,120,120,0.12)",
  },
  mapScreenshotPreviewImage: {
    width: "100%",
    height: 240,
    alignSelf: "center",
  },
  fieldHint: {
    fontSize: 12,
    opacity: 0.65,
    marginBottom: 6,
    lineHeight: 17,
  },
  preferredHeader: {
    width: "100%",
    marginBottom: 8,
  },
  addPreferredButton: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
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
  preferredRemoveDisabled: {
    opacity: 0.35,
  },
  preferredRemoveText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },
  preferredCoordSummary: {
    fontSize: 12,
    opacity: 0.75,
    marginTop: 6,
  },
  preferredStaticMapWrap: {
    marginTop: 6,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
  },
  preferredStaticMap: {
    width: "100%",
    height: 160,
    backgroundColor: "rgba(120,120,120,0.08)",
  },
  preferredNoPin: {
    fontSize: 12,
    opacity: 0.55,
    fontStyle: "italic",
  },
  preferredMapPickButton: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  preferredClearPin: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  preferredClearPinText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
  },
  preferredMapModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  preferredMapModalCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: "88%",
  },
  preferredMapModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  preferredMapModalHeaderSide: {
    width: 88,
    flexShrink: 0,
  },
  preferredMapModalTitleWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  preferredMapModalTitle: {
    textAlign: "center",
    width: "100%",
  },
  preferredMapModalScrollContent: {
    paddingBottom: 4,
    flexGrow: 1,
  },
  preferredMapModalHint: {
    fontSize: 12,
    opacity: 0.65,
    marginBottom: 8,
    lineHeight: 17,
  },
  preferredMapModalMapWrap: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
  },
  preferredLocationMap: {
    height: 280,
    width: "100%",
  },
  preferredLocationMapDirectTrade: {
    height: 360,
  },
  preferredMapModalPlaceholder: {
    height: 280,
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  preferredMapModalPlaceholderDirectTrade: {
    height: 360,
  },
  preferredMapModalLocateButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
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

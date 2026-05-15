import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import type { Product } from "@/core/domain/entities/Product";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { productStatusLabelKey, useLocale } from "@/presentation/providers/LocaleProvider";

import { parseProductStatus, statusBadgeColors } from "./myProductStatus";
import { ProductListingThumbnail } from "@/components/product-listing-thumbnail";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { memo } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const IMAGE_SIZE = 56;
const ICON_BTN = 26;
const MAX_STAGGER = 8;
const STAGGER_MS = 48;

export type MyProductCardProps = {
  product: Product;
  index: number;
  categoryLabel?: string;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onArchive: (product: Product) => void;
  archivePending: boolean;
};

function cardShadow(scheme: "light" | "dark") {
  const isDark = scheme === "dark";
  return Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: isDark ? 6 : 4 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: isDark ? 12 : 10,
    },
    android: { elevation: isDark ? 4 : 3 },
    default: {},
  });
}

export const MyProductCard = memo(function MyProductCard({
  product,
  index,
  categoryLabel,
  onView,
  onEdit,
  onArchive,
  archivePending,
}: MyProductCardProps) {
  const { t } = useLocale();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const reduceMotion = useReducedMotion();

  const status = parseProductStatus(product.status, product.isAvailable);
  const badge = statusBadgeColors(status, scheme);

  const entering = reduceMotion
    ? undefined
    : FadeInUp.duration(380)
        .delay(Math.min(index, MAX_STAGGER) * STAGGER_MS)
        .springify()
        .damping(18);

  return (
    <Animated.View entering={entering}>
      <View
        style={[
          styles.card,
          cardShadow(scheme),
          {
            borderColor: colors.icon + "22",
            backgroundColor: scheme === "dark" ? "#1C1F24" : "#FFFFFF",
          },
        ]}
      >
        <Pressable
          onPress={() => onView(product)}
          style={styles.mainPressable}
          accessibilityRole="button"
          accessibilityLabel={product.name}
        >
          <View style={styles.imageWrap}>
            <ProductListingThumbnail
              imageUrl={product.imageUrl}
              size={IMAGE_SIZE}
              borderRadius={10}
              showNoImageLabel={false}
            />
          </View>

          <View style={styles.body}>
            <View style={[styles.statusBadge, { backgroundColor: badge.backgroundColor }]}>
              <ThemedText
                style={[styles.statusText, { color: badge.color }]}
                numberOfLines={2}
              >
                {t(productStatusLabelKey(status))}
              </ThemedText>
            </View>

            <View style={styles.titlePriceRow}>
              <ThemedText type="defaultSemiBold" numberOfLines={2} style={styles.title}>
                {product.name}
              </ThemedText>
              <ThemedText style={[styles.price, { color: colors.tint }]} numberOfLines={2}>
                {product.price.toLocaleString()} MMK
              </ThemedText>
            </View>

            {categoryLabel ? (
              <View style={styles.metaRow}>
                <MaterialIcons name="category" size={11} color={colors.icon} style={styles.metaIcon} />
                <ThemedText style={styles.category} numberOfLines={1}>
                  {categoryLabel}
                </ThemedText>
              </View>
            ) : null}

            <View style={styles.descRow}>
              <MaterialIcons name="notes" size={10} color={colors.icon} style={styles.metaIcon} />
              <ThemedText style={styles.description} numberOfLines={1}>
                {product.description}
              </ThemedText>
            </View>
          </View>
        </Pressable>

        <View style={styles.toolbar}>
          <IconButton
            icon="visibility"
            label={t("productsDetail")}
            onPress={() => onView(product)}
            tint={colors.text}
            borderColor={colors.icon + "40"}
            reduceMotion={!!reduceMotion}
          />
          <IconButton
            icon="edit"
            label={t("productsEdit")}
            onPress={() => onEdit(product)}
            tint="#FFFFFF"
            backgroundColor={colors.tint}
            reduceMotion={!!reduceMotion}
          />
          <IconButton
            icon="inventory-2"
            label={t("productsArchive")}
            onPress={() => onArchive(product)}
            disabled={archivePending}
            tint="#FFFFFF"
            backgroundColor="#DC2626"
            reduceMotion={!!reduceMotion}
          />
        </View>
      </View>
    </Animated.View>
  );
});

const IconButton = memo(function IconButton({
  icon,
  label,
  onPress,
  tint,
  backgroundColor,
  borderColor,
  disabled,
  reduceMotion,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
  tint: string;
  backgroundColor?: string;
  borderColor?: string;
  disabled?: boolean;
  reduceMotion: boolean;
}) {
  const pressed = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(pressed.value, [0, 1], [1, 0.9], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={() => {
        if (!disabled) void Haptics.selectionAsync();
        onPress();
      }}
      onPressIn={() => {
        if (disabled || reduceMotion) return;
        pressed.value = withTiming(1, { duration: 60 });
      }}
      onPressOut={() => {
        if (reduceMotion) return;
        pressed.value = withSpring(0, { damping: 14, stiffness: 320 });
      }}
      hitSlop={6}
      style={[
        styles.iconBtn,
        animStyle,
        backgroundColor ? { backgroundColor } : { borderWidth: 1, borderColor },
        disabled && styles.iconBtnDisabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
    >
      {disabled ? (
        <MaterialIcons name="hourglass-empty" size={12} color={tint} />
      ) : (
        <MaterialIcons name={icon} size={14} color={tint} />
      )}
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  mainPressable: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
    alignItems: "flex-start",
  },
  imageWrap: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 10,
    overflow: "hidden",
    flexShrink: 0,
  },
  statusBadge: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 13,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  titlePriceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: -0.2,
    minWidth: 0,
  },
  price: {
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 14,
    letterSpacing: -0.2,
    textAlign: "right",
    maxWidth: "42%",
    flexShrink: 0,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  descRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaIcon: {
    opacity: 0.65,
    flexShrink: 0,
  },
  category: {
    flex: 1,
    fontSize: 10,
    lineHeight: 13,
    opacity: 0.62,
    minWidth: 0,
  },
  description: {
    flex: 1,
    fontSize: 10,
    lineHeight: 13,
    opacity: 0.52,
    minWidth: 0,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
    paddingHorizontal: 8,
    paddingBottom: 6,
    marginTop: -2,
  },
  iconBtn: {
    width: ICON_BTN,
    height: ICON_BTN,
    borderRadius: ICON_BTN / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnDisabled: {
    opacity: 0.5,
  },
});

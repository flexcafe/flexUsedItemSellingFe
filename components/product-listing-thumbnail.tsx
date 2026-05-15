import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocale } from "@/presentation/providers/LocaleProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { memo } from "react";
import { StyleSheet, View } from "react-native";

export type ProductListingThumbnailProps = {
  imageUrl?: string | null;
  size: number;
  borderRadius?: number;
  showNoImageLabel?: boolean;
};

export const ProductListingThumbnail = memo(function ProductListingThumbnail({
  imageUrl,
  size,
  borderRadius = 12,
  showNoImageLabel,
}: ProductListingThumbnailProps) {
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const { t } = useLocale();

  const uri = imageUrl?.trim();
  const labelVisible = showNoImageLabel ?? size >= 64;
  const iconSize = Math.round(size * 0.32);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius }}
        contentFit="cover"
        transition={260}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: colors.tint + "10",
          borderColor: colors.tint + "28",
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={t("productListingNoImage")}
    >
      <View
        style={[
          styles.decorRing,
          {
            width: size * 0.72,
            height: size * 0.72,
            borderRadius: size * 0.36,
            backgroundColor: colors.tint + "12",
          },
        ]}
      />
      <View
        style={[
          styles.decorDot,
          {
            top: size * 0.12,
            right: size * 0.14,
            backgroundColor: colors.tint + "22",
          },
        ]}
      />
      <MaterialIcons name="photo" size={iconSize} color={colors.tint} style={styles.icon} />
      {labelVisible ? (
        <ThemedText
          style={[styles.label, { color: colors.tint }]}
          numberOfLines={2}
        >
          {t("productListingNoImage")}
        </ThemedText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
  },
  decorRing: {
    position: "absolute",
    opacity: 0.9,
  },
  decorDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  icon: {
    opacity: 0.72,
    zIndex: 1,
  },
  label: {
    marginTop: 2,
    fontSize: 8,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 10,
    paddingHorizontal: 4,
    opacity: 0.85,
    zIndex: 1,
  },
});

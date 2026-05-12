import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocale } from "@/presentation/providers/LocaleProvider";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet, View } from "react-native";

type AddProductListingButtonProps = {
  onPress: () => void;
  /** Matches horizontal padding of the parent list/section (e.g. 16 home, 24 products). */
  horizontalPadding?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Full-width primary CTA for creating a listing — shared by Home (below slider) and Products tab.
 */
export function AddProductListingButton({
  onPress,
  horizontalPadding = 16,
  style,
}: AddProductListingButtonProps) {
  const { t } = useLocale();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  return (
    <View style={[{ width: "100%", paddingHorizontal: horizontalPadding }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("productsNewListing")}
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          { backgroundColor: colors.tint },
          pressed && styles.pressed,
        ]}>
        <ThemedText style={styles.label}>{t("productsNewListing")}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  pressed: {
    opacity: 0.9,
  },
  label: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});

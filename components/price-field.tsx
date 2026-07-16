import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import {
  formatPriceInputDisplay,
  MARKET_CURRENCY,
  parsePriceInputDigits,
} from "@/core/domain/value-objects/Money";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocale } from "@/presentation/providers/LocaleProvider";

type Props = {
  value: string;
  onChange: (digits: string) => void;
  label?: string;
  placeholder?: string;
  /** Create-only listings: false locks the field in edit mode. */
  editable?: boolean;
  error?: boolean;
  style?: StyleProp<ViewStyle>;
  hint?: string;
};

/**
 * Marketplace price input: digit state, thousand-separated display, MMK badge.
 * Matches FormField / DateTimeField composition used elsewhere.
 */
export function PriceField({
  value,
  onChange,
  label,
  placeholder,
  editable = true,
  error,
  style,
  hint,
}: Props) {
  const { t } = useLocale();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const scheme = colorScheme ?? "light";
  const surface = scheme === "dark" ? "#1C1F24" : "#FFFFFF";
  const borderColor = error ? "#e74c3c" : colors.icon + "66";
  const display = formatPriceInputDisplay(value);

  return (
    <View style={[styles.wrap, style]}>
      {label ? <ThemedText style={styles.label}>{label}</ThemedText> : null}

      <View
        style={[
          styles.row,
          {
            backgroundColor: surface,
            borderColor,
            opacity: editable ? 1 : 0.55,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.tint + "14" }]}>
          <MaterialIcons name="sell" size={18} color={colors.tint} />
        </View>

        <TextInput
          value={display}
          onChangeText={(text) => onChange(parsePriceInputDigits(text))}
          editable={editable}
          keyboardType="number-pad"
          placeholder={placeholder ?? t("productsPlaceholderPrice")}
          placeholderTextColor={colors.icon}
          style={[styles.input, { color: colors.text }]}
          accessibilityLabel={label ?? t("productsFieldPrice")}
        />

        <View style={[styles.currencyPill, { backgroundColor: colors.tint + "18" }]}>
          <ThemedText style={[styles.currencyText, { color: colors.tint }]}>
            {MARKET_CURRENCY}
          </ThemedText>
        </View>
      </View>

      {hint ? (
        <ThemedText style={[styles.hint, { color: colors.icon }]}>{hint}</ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    marginTop: 10,
    marginBottom: 0,
    fontWeight: "600",
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    minHeight: 48,
  },
  iconWrap: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
    paddingVertical: 12,
    paddingHorizontal: 4,
    minHeight: 48,
  },
  currencyPill: {
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  currencyText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 2,
  },
});

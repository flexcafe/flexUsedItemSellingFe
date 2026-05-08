import { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, type TextInputProps, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocale } from "@/presentation/providers/LocaleProvider";

export function PasswordInput({
  value,
  onChangeText,
  placeholder,
  editable,
  inputStyle,
  hasError,
  ...rest
}: Omit<TextInputProps, "secureTextEntry" | "value" | "onChangeText" | "placeholder"> & {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  editable?: boolean;
  inputStyle?: TextInputProps["style"];
  hasError?: boolean;
}) {
  const { t } = useLocale();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [visible, setVisible] = useState(false);

  const a11yLabel = useMemo(
    () => (visible ? t("hidePassword") : t("showPassword")),
    [t, visible],
  );

  return (
    <View style={styles.row}>
      <TextInput
        {...rest}
        style={[styles.inputPad, inputStyle]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.icon}
        secureTextEntry={!visible}
        editable={editable}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        disabled={editable === false}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        style={({ pressed }) => [styles.toggle, { opacity: pressed ? 0.7 : 1 }]}
      >
        <ThemedText style={[styles.toggleText, { color: colors.tint }]}>
          {visible ? t("hide") : t("show")}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: "relative",
    justifyContent: "center",
  },
  inputPad: {
    paddingRight: 80,
  },
  toggle: {
    position: "absolute",
    right: 12,
    height: 44,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  toggleText: {
    fontWeight: "700",
    fontSize: 14,
  },
});


import type { CountryCode } from "libphonenumber-js";
import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export type PhoneCountry = {
  code: CountryCode;
  dialCode: string;
  label: string;
  flag: string;
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "MM", dialCode: "+95", label: "Myanmar", flag: "\uD83C\uDDF2\uD83C\uDDF2" },
  { code: "KR", dialCode: "+82", label: "Korea", flag: "\uD83C\uDDF0\uD83C\uDDF7" },
  { code: "CN", dialCode: "+86", label: "China", flag: "\uD83C\uDDE8\uD83C\uDDF3" },
];

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  selectedCountry: PhoneCountry;
  onCountryChange: (country: PhoneCountry) => void;
  placeholder?: string;
  error?: boolean;
  editable?: boolean;
  inputStyle?: TextInputProps["style"];
};

export function PhoneNumberInput({
  value,
  onChangeText,
  selectedCountry,
  onCountryChange,
  placeholder,
  error,
  editable = true,
  inputStyle,
}: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <View style={styles.phoneRow}>
        <Pressable
          onPress={() => setIsOpen(true)}
          disabled={!editable}
          style={[
            styles.dialPicker,
            {
              borderColor: colors.icon,
              backgroundColor: colors.background,
            },
          ]}
        >
          <ThemedText style={styles.dialText}>{selectedCountry.dialCode}</ThemedText>
          <ThemedText style={styles.dialChevron}>▾</ThemedText>
        </Pressable>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: error ? "#e74c3c" : colors.icon,
              backgroundColor: colors.background,
            },
            styles.phoneInput,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.icon}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
          editable={editable}
        />
      </View>

      {isOpen ? (
        <View style={styles.pickerOverlay}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setIsOpen(false)} />
          <View
            style={[
              styles.pickerSheet,
              { backgroundColor: colors.background, borderColor: colors.icon },
            ]}
          >
            <ThemedText style={styles.pickerTitle}>Choose country</ThemedText>
            {PHONE_COUNTRIES.map((c) => {
              const selected = c.code === selectedCountry.code;
              return (
                <Pressable
                  key={c.code}
                  onPress={() => {
                    onCountryChange(c);
                    setIsOpen(false);
                  }}
                  style={[styles.pickerRow, selected && { borderColor: colors.tint }]}
                >
                  <ThemedText style={styles.pickerDial}>{c.dialCode}</ThemedText>
                  <ThemedText style={styles.pickerCode}>{c.code}</ThemedText>
                  {selected ? (
                    <ThemedText style={{ color: colors.tint, fontWeight: "700" }}>✓</ThemedText>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  phoneRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  dialPicker: {
    height: 48,
    minWidth: 88,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dialText: {
    fontSize: 15,
    fontWeight: "800",
  },
  dialChevron: {
    fontSize: 16,
    opacity: 0.65,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontSize: 15,
  },
  phoneInput: {
    flex: 1,
  },
  pickerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  pickerSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
    gap: 10,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  pickerRow: {
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pickerDial: {
    fontSize: 15,
    fontWeight: "800",
    width: 68,
  },
  pickerCode: {
    fontSize: 13,
    opacity: 0.7,
    flex: 1,
  },
});

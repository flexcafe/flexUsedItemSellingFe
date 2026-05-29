import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useAppSafeAreaInsets } from "@/components/app-safe-area";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  formatDateFromDate,
  formatDateInputMask,
  formatTimeFromDate,
  formatTimeInputMask,
  parseDateString,
  parseTimeString,
} from "@/presentation/lib/dateTime";
import { useLocale } from "@/presentation/providers/LocaleProvider";

export type DateTimeFieldMode = "date" | "time";

type Props = {
  mode: DateTimeFieldMode;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  style?: StyleProp<ViewStyle>;
  /** When true, field border/background are provided by parent (e.g. FormField row). */
  embedded?: boolean;
};

function resolvePickerDate(
  mode: DateTimeFieldMode,
  value: string,
  minimumDate?: Date,
  maximumDate?: Date,
): Date {
  const now = new Date();
  if (mode === "date") {
    return (
      parseDateString(value) ??
      minimumDate ??
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0)
    );
  }
  return parseTimeString(value, parseDateString(defaultDateForTime()) ?? now) ?? now;
}

function defaultDateForTime(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DateTimeField({
  mode,
  value,
  onChange,
  label,
  placeholder,
  error,
  disabled,
  minimumDate,
  maximumDate,
  style,
  embedded,
}: Props) {
  const { t } = useLocale();
  const insets = useAppSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [showPicker, setShowPicker] = useState(false);
  const [iosDraft, setIosDraft] = useState<Date>(() =>
    resolvePickerDate(mode, value, minimumDate, maximumDate),
  );

  const displayValue = value.trim();
  const iconName = mode === "date" ? "event" : "schedule";
  const resolvedPlaceholder =
    placeholder ??
    (mode === "date"
      ? t("chatMeetingDatePlaceholder")
      : t("chatMeetingTimePlaceholder"));

  const borderColor = error ? "#e74c3c" : colors.icon + (embedded ? "44" : "");
  const fieldStyles = embedded
    ? [styles.embeddedInput, { color: colors.text }]
    : [
        styles.field,
        {
          borderColor: error ? "#e74c3c" : colors.icon,
          backgroundColor: colors.background,
        },
      ];

  const applyPickerDate = (date: Date) => {
    onChange(
      mode === "date" ? formatDateFromDate(date) : formatTimeFromDate(date),
    );
  };

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (event.type === "dismissed" || !selected) return;
      applyPickerDate(selected);
      return;
    }
    if (selected) setIosDraft(selected);
  };

  const openPicker = () => {
    if (disabled) return;
    setIosDraft(resolvePickerDate(mode, value, minimumDate, maximumDate));
    setShowPicker(true);
  };

  const webInput = (
    <TextInput
      value={value}
      onChangeText={(text) =>
        onChange(
          mode === "date" ? formatDateInputMask(text) : formatTimeInputMask(text),
        )
      }
      placeholder={resolvedPlaceholder}
      placeholderTextColor={colors.icon}
      keyboardType="number-pad"
      maxLength={mode === "date" ? 10 : 5}
      editable={!disabled}
      style={fieldStyles}
    />
  );

  const nativeTrigger = (
    <Pressable
      onPress={openPicker}
      disabled={disabled}
      style={({ pressed }) => [
        styles.field,
        embedded && styles.embeddedField,
        {
          borderColor,
          backgroundColor: embedded
            ? "transparent"
            : colors.background,
          opacity: disabled ? 0.55 : pressed ? 0.92 : 1,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.fieldText,
          { color: displayValue ? colors.text : colors.icon },
        ]}
        numberOfLines={1}
      >
        {displayValue || resolvedPlaceholder}
      </ThemedText>
      <MaterialIcons name={iconName} size={20} color={colors.tint} />
    </Pressable>
  );

  const pickerValue =
    Platform.OS === "ios"
      ? iosDraft
      : resolvePickerDate(mode, value, minimumDate, maximumDate);

  return (
    <View style={[styles.wrap, style]}>
      {label ? <ThemedText style={styles.label}>{label}</ThemedText> : null}

      {Platform.OS === "web" ? webInput : nativeTrigger}

      {Platform.OS === "android" && showPicker ? (
        <DateTimePicker
          value={pickerValue}
          mode={mode}
          display="default"
          minimumDate={mode === "date" ? minimumDate : undefined}
          maximumDate={mode === "date" ? maximumDate : undefined}
          onChange={onPickerChange}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal
          visible={showPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowPicker(false)}
          >
            <Pressable
              style={[
                styles.modalSheet,
                {
                  backgroundColor: colors.background,
                  paddingBottom: Math.max(24, insets.bottom + 12),
                },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setShowPicker(false)} hitSlop={12}>
                  <ThemedText style={{ color: colors.icon, fontWeight: "600" }}>
                    {t("dateTimePickerCancel")}
                  </ThemedText>
                </Pressable>
                <ThemedText type="defaultSemiBold">
                  {mode === "date"
                    ? t("dateTimePickerSelectDate")
                    : t("dateTimePickerSelectTime")}
                </ThemedText>
                <Pressable
                  onPress={() => {
                    applyPickerDate(iosDraft);
                    setShowPicker(false);
                  }}
                  hitSlop={12}
                >
                  <ThemedText style={{ color: colors.tint, fontWeight: "800" }}>
                    {t("dateTimePickerConfirm")}
                  </ThemedText>
                </Pressable>
              </View>
              <DateTimePicker
                value={pickerValue}
                mode={mode}
                display="spinner"
                minimumDate={mode === "date" ? minimumDate : undefined}
                maximumDate={mode === "date" ? maximumDate : undefined}
                onChange={onPickerChange}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

type DateTimePairProps = {
  dateValue: string;
  timeValue: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  dateLabel?: string;
  timeLabel?: string;
  dateError?: boolean;
  timeError?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Side-by-side date + time fields (fraud report, etc.). */
export function DateTimePairFields({
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  dateLabel,
  timeLabel,
  dateError,
  timeError,
  disabled,
  style,
}: DateTimePairProps) {
  return (
    <View style={[styles.pairRow, style]}>
      <View style={styles.pairItem}>
        <DateTimeField
          mode="date"
          value={dateValue}
          onChange={onDateChange}
          label={dateLabel}
          error={dateError}
          disabled={disabled}
        />
      </View>
      <View style={styles.pairItem}>
        <DateTimeField
          mode="time"
          value={timeValue}
          onChange={onTimeChange}
          label={timeLabel}
          error={timeError}
          disabled={disabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  field: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  embeddedField: {
    minHeight: 44,
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  embeddedInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
    minHeight: 44,
  },
  fieldText: {
    flex: 1,
    fontSize: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  pairRow: {
    flexDirection: "row",
    gap: 10,
  },
  pairItem: {
    flex: 1,
    minWidth: 0,
  },
});

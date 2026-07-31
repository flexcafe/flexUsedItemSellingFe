import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { FlexMarketLoader } from "@/components/flex-market-loader";
import { KeyboardAwareFormScroll } from "@/components/keyboard-aware-form-scroll";
import { PasswordInput } from "@/components/password-input";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { DELETE_ACCOUNT_CONFIRM_TEXT } from "@/core/domain/types/profile";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDeleteAccount } from "@/presentation/hooks/useClientProfile";
import { uiCardSurface } from "@/presentation/lib/uiAnimations";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useLocale } from "@/presentation/providers/LocaleProvider";

type Props = {
  visible: boolean;
  onClose: () => void;
};

function readApiErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const response = (error as { response?: { data?: unknown } }).response;
  const data = response?.data;
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return "";
}

export function DeleteAccountModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { logout } = useAuth();
  const deleteAccount = useDeleteAccount();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const surface = uiCardSurface(scheme);
  const fieldSurface = scheme === "dark" ? "#14171C" : "#F8FAFC";

  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (!visible) return;
    setCurrentPassword("");
    setConfirmText("");
  }, [visible]);

  const canSubmit = useMemo(
    () =>
      currentPassword.trim().length > 0 &&
      confirmText.trim() === DELETE_ACCOUNT_CONFIRM_TEXT &&
      !deleteAccount.isPending,
    [confirmText, currentPassword, deleteAccount.isPending],
  );

  const onSubmit = async () => {
    if (!canSubmit) return;
    if (confirmText.trim() !== DELETE_ACCOUNT_CONFIRM_TEXT) {
      Alert.alert(t("errorTitle"), t("deleteAccountConfirmMismatch"));
      return;
    }
    try {
      await deleteAccount.mutateAsync({
        currentPassword: currentPassword.trim(),
        confirm: DELETE_ACCOUNT_CONFIRM_TEXT,
      });
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onClose();
      Toast.show({
        type: "notification",
        text1: t("deleteAccountSuccessTitle"),
        text2: t("deleteAccountSuccessBody"),
      });
      await logout();
    } catch (error) {
      const apiMessage = readApiErrorMessage(error);
      Alert.alert(t("errorTitle"), apiMessage || t("deleteAccountFailed"));
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <ThemedView
        style={[styles.screen, { paddingTop: Math.max(insets.top, 12) }]}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.headerIconWrap,
              { backgroundColor: "#DC2626" + "18" },
            ]}
          >
            <MaterialIcons name="person-remove" size={22} color="#DC2626" />
          </View>
          <View style={styles.headerCopy}>
            <ThemedText
              type="defaultSemiBold"
              style={styles.title}
              numberOfLines={2}
            >
              {t("deleteAccountTitle")}
            </ThemedText>
            <ThemedText
              style={[styles.subtitle, { color: colors.icon }]}
              numberOfLines={3}
            >
              {t("deleteAccountSubtitle")}
            </ThemedText>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={[styles.closeBtn, { backgroundColor: colors.icon + "18" }]}
            accessibilityRole="button"
            accessibilityLabel={t("actionCancel")}
          >
            <MaterialIcons name="close" size={20} color={colors.icon} />
          </Pressable>
        </View>

        <KeyboardAwareFormScroll
          fill
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.body}
        >
          <View
            style={[
              styles.warnCard,
              {
                backgroundColor: "#DC2626" + "10",
                borderColor: "#DC2626" + "33",
              },
            ]}
          >
            <MaterialIcons name="warning-amber" size={20} color="#DC2626" />
            <ThemedText style={[styles.warnText, { color: "#B91C1C" }]}>
              {t("deleteAccountWarning")}
            </ThemedText>
          </View>

          <ThemedText style={styles.label}>
            {t("deleteAccountPasswordLabel")}
          </ThemedText>
          <View style={styles.fieldWrap}>
            <PasswordInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder={t("deleteAccountPasswordPlaceholder")}
              editable={!deleteAccount.isPending}
              inputStyle={[
                styles.passwordInput,
                {
                  backgroundColor: fieldSurface,
                  borderColor: colors.icon + "22",
                  color: colors.text,
                },
              ]}
            />
          </View>

          <ThemedText style={styles.label}>
            {t("deleteAccountConfirmLabel")}
          </ThemedText>
          <ThemedText style={[styles.hint, { color: colors.icon }]}>
            {t("deleteAccountConfirmHint")}
          </ThemedText>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={DELETE_ACCOUNT_CONFIRM_TEXT}
            placeholderTextColor={colors.icon + "99"}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!deleteAccount.isPending}
            style={[
              styles.confirmInput,
              {
                backgroundColor: fieldSurface,
                borderColor: colors.icon + "22",
                color: colors.text,
              },
            ]}
          />

          <View
            style={[
              styles.noteCard,
              { backgroundColor: surface, borderColor: colors.icon + "22" },
            ]}
          >
            <ThemedText style={[styles.noteText, { color: colors.icon }]}>
              {t("deleteAccountNotDeactivate")}
            </ThemedText>
          </View>
        </KeyboardAwareFormScroll>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              borderTopColor: colors.icon + "22",
              backgroundColor: colors.background,
            },
          ]}
        >
          <Pressable
            onPress={() => {
              void onSubmit();
            }}
            disabled={!canSubmit}
            style={[
              styles.deleteBtn,
              {
                backgroundColor: "#DC2626",
                opacity: canSubmit ? 1 : 0.55,
              },
            ]}
          >
            {deleteAccount.isPending ? (
              <FlexMarketLoader variant="inline" size="xs" showText={false} />
            ) : (
              <View style={styles.deleteBtnInner}>
                <MaterialIcons name="person-remove" size={18} color="#fff" />
                <ThemedText
                  style={styles.deleteBtnText}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {t("deleteAccountConfirmButton")}
                </ThemedText>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={onClose}
            style={styles.cancelBtn}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t("actionCancel")}
          >
            <ThemedText
              style={[styles.cancelText, { color: colors.icon }]}
              numberOfLines={1}
            >
              {t("actionCancel")}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontSize: 18 },
  subtitle: { fontSize: 13, lineHeight: 18 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 16,
  },
  fieldWrap: {
    minWidth: 0,
    width: "100%",
  },
  warnCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  warnText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "700", marginTop: 4 },
  hint: { fontSize: 12, lineHeight: 16, marginTop: -4 },
  passwordInput: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 48,
  },
  confirmInput: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  noteCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  noteText: { fontSize: 12, lineHeight: 18 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 6,
  },
  deleteBtn: {
    width: "100%",
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  deleteBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    maxWidth: "100%",
  },
  deleteBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    flexShrink: 1,
    textAlign: "center",
  },
  cancelBtn: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  cancelText: {
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
  },
});

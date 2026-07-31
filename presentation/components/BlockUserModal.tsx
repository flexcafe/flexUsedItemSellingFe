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
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useBlockUser } from "@/presentation/hooks/useModerationReports";
import { uiCardSurface } from "@/presentation/lib/uiAnimations";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useLocale } from "@/presentation/providers/LocaleProvider";

export type BlockUserTarget = {
  userId: string;
  displayName?: string | null;
};

type Props = {
  visible: boolean;
  target: BlockUserTarget | null;
  onClose: () => void;
  onBlocked?: (userId: string) => void;
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

export function BlockUserModal({
  visible,
  target,
  onClose,
  onBlocked,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { isAuthenticated, user } = useAuth();
  const blockUser = useBlockUser();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const surface = uiCardSurface(scheme);
  const fieldSurface = scheme === "dark" ? "#14171C" : "#F8FAFC";

  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!visible) return;
    setReason("");
  }, [visible, target?.userId]);

  const canSubmit = useMemo(() => {
    const id = target?.userId?.trim();
    if (!id || !isAuthenticated) return false;
    if (user?.id && user.id === id) return false;
    return true;
  }, [isAuthenticated, target?.userId, user?.id]);

  const onSubmit = async () => {
    const blockedUserId = target?.userId?.trim();
    if (!blockedUserId || blockUser.isPending) return;
    if (!isAuthenticated) {
      Alert.alert(
        t("userBlockLoginRequiredTitle"),
        t("userBlockLoginRequiredBody"),
      );
      return;
    }
    if (user?.id && user.id === blockedUserId) {
      Alert.alert(t("errorTitle"), t("userBlockCannotSelf"));
      return;
    }
    try {
      await blockUser.mutateAsync({
        blockedUserId,
        reason: reason.trim() || undefined,
      });
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onClose();
      Toast.show({
        type: "notification",
        text1: t("userBlockSuccessTitle"),
        text2: t("userBlockSuccessBody"),
      });
      onBlocked?.(blockedUserId);
    } catch (error) {
      const apiMessage = readApiErrorMessage(error);
      Alert.alert(t("errorTitle"), apiMessage || t("userBlockFailed"));
    }
  };

  const displayName =
    target?.displayName?.trim() || t("contentReportsUnknownUser");

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
            <MaterialIcons name="block" size={22} color="#DC2626" />
          </View>
          <View style={styles.headerCopy}>
            <ThemedText type="defaultSemiBold" style={styles.title}>
              {t("userBlockTitle")}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
              {t("userBlockSubtitle")}
            </ThemedText>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={[styles.closeBtn, { backgroundColor: colors.icon + "18" }]}
            accessibilityRole="button"
            accessibilityLabel={t("userBlockCancel")}
          >
            <MaterialIcons name="close" size={20} color={colors.icon} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <View
            style={[
              styles.targetCard,
              {
                backgroundColor: surface,
                borderColor: colors.icon + "22",
              },
            ]}
          >
            <MaterialIcons name="person-off" size={20} color={colors.tint} />
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {displayName}
            </ThemedText>
          </View>

          <ThemedText style={styles.label}>{t("userBlockReasonLabel")}</ThemedText>
          <ThemedText style={[styles.hint, { color: colors.icon }]}>
            {t("userBlockReasonHint")}
          </ThemedText>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder={t("userBlockReasonPlaceholder")}
            placeholderTextColor={colors.icon + "99"}
            multiline
            maxLength={280}
            style={[
              styles.input,
              {
                backgroundColor: fieldSurface,
                borderColor: colors.icon + "22",
                color: colors.text,
              },
            ]}
          />
        </View>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12) + 8 },
          ]}
        >
          <Pressable
            onPress={onClose}
            style={[styles.secondaryBtn, { borderColor: colors.icon + "33" }]}
          >
            <ThemedText>{t("userBlockCancel")}</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => {
              void onSubmit();
            }}
            disabled={!canSubmit || blockUser.isPending}
            style={[
              styles.primaryBtn,
              {
                backgroundColor: "#DC2626",
                opacity: !canSubmit || blockUser.isPending ? 0.6 : 1,
              },
            ]}
          >
            {blockUser.isPending ? (
              <FlexMarketLoader variant="inline" size="xs" showText={false} />
            ) : (
              <ThemedText style={styles.primaryBtnText}>
                {t("userBlockConfirm")}
              </ThemedText>
            )}
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
  headerCopy: { flex: 1, gap: 4 },
  title: { fontSize: 18 },
  subtitle: { fontSize: 13, lineHeight: 18 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, paddingHorizontal: 16, gap: 10 },
  targetCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  label: { fontSize: 14, fontWeight: "700" },
  hint: { fontSize: 12, lineHeight: 16, marginTop: -4 },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
    fontSize: 15,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    flex: 1.2,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
});

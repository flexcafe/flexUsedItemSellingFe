import { DateTimeField } from "@/components/date-time-field";
import { useAppSafeAreaInsets } from "@/components/app-safe-area";
import { AppScrollView } from "@/components/app-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import type {
  ClientFraudReport,
  ClientSuggestion,
} from "@/core/domain/entities/ClientReport";
import {
  CLIENT_FRAUD_TYPES,
  type FraudType,
} from "@/core/domain/types/clientReports";
import {
  ProfileAnimatedCard,
  ProfilePressableScale,
  ProfileStaggerItem,
  ProfileTabButton,
  ProfileTabPanel,
} from "@/features/profile/presentation/profileAnimated";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  useMyFraudReports,
  useMySuggestions,
  useSubmitFraudReport,
  useSubmitSuggestion,
} from "@/presentation/hooks/useClientReports";
import {
  uiCardShadow,
  uiCardSurface,
  uiSectionEnter,
} from "@/presentation/lib/uiAnimations";
import {
  isValidCalendarDate,
  isValidTime24h,
} from "@/presentation/lib/dateTime";
import { useLocale } from "@/presentation/providers/LocaleProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

type Tab = "suggestion" | "fraud";

type HomeReportsSectionProps = {
  visible: boolean;
  onClose: () => void;
};

const STATUS_COLORS = {
  pending: { bg: "#FEF3C7", text: "#B45309" },
  approved: { bg: "#DCFCE7", text: "#15803D" },
  rejected: { bg: "#FEE2E2", text: "#B91C1C" },
  default: { bg: "#E2E8F0", text: "#475569" },
};

function fraudTypeLabelKey(type: FraudType) {
  switch (type) {
    case "FAKE_PRODUCT":
      return "homeFraudTypeFakeProduct" as const;
    case "FAKE_PAYMENT":
      return "homeFraudTypeFakePayment" as const;
    case "HARASSMENT":
      return "homeFraudTypeHarassment" as const;
    case "OTHER":
    default:
      return "homeFraudTypeOther" as const;
  }
}

function statusPalette(status: string) {
  const s = status.toUpperCase();
  if (s.includes("PENDING")) return STATUS_COLORS.pending;
  if (s.includes("APPROV") || s.includes("REVIEW") || s.includes("ACCEPT"))
    return STATUS_COLORS.approved;
  if (s.includes("REJECT") || s.includes("BAN")) return STATUS_COLORS.rejected;
  return STATUS_COLORS.default;
}

function formatReportDate(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.trim();
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function StatusBadge({ status }: { status: string }) {
  const palette = statusPalette(status);
  return (
    <View style={[styles.statusBadge, { backgroundColor: palette.bg }]}>
      <ThemedText style={[styles.statusBadgeText, { color: palette.text }]}>
        {status}
      </ThemedText>
    </View>
  );
}

type FieldProps = {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  tint: string;
  surface: string;
  borderColor: string;
  children: ReactNode;
};

function FormField({
  label,
  icon,
  tint,
  surface,
  borderColor,
  children,
}: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <View
        style={[
          styles.fieldRow,
          { backgroundColor: surface, borderColor },
        ]}
      >
        <View style={[styles.fieldIconWrap, { backgroundColor: tint + "14" }]}>
          <MaterialIcons name={icon} size={18} color={tint} />
        </View>
        <View style={styles.fieldInputWrap}>{children}</View>
      </View>
    </View>
  );
}

type PremiumInputProps = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  textColor: string;
  placeholderColor: string;
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
};

function PremiumInput({
  value,
  onChangeText,
  placeholder,
  textColor,
  placeholderColor,
  multiline,
  autoCapitalize,
}: PremiumInputProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={placeholderColor}
      autoCapitalize={autoCapitalize}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
      style={[
        styles.input,
        multiline && styles.inputMultiline,
        { color: textColor },
      ]}
    />
  );
}

function SectionHeader({
  title,
  icon,
  tint,
}: {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  tint: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: tint + "18" }]}>
        <MaterialIcons name={icon} size={16} color={tint} />
      </View>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        {title}
      </ThemedText>
    </View>
  );
}

function SuggestionHistoryCard({
  item,
  index,
  reduceMotion,
  scheme,
  borderColor,
  tf,
}: {
  item: ClientSuggestion;
  index: number;
  reduceMotion: boolean | null;
  scheme: "light" | "dark";
  borderColor: string;
  tf: (key: "homeReportsPointsAwarded", vars?: Record<string, unknown>) => string;
}) {
  return (
    <ProfileStaggerItem index={index} reduceMotion={reduceMotion}>
      <View
        style={[
          styles.historyCard,
          uiCardShadow(scheme, { androidElevationLight: 2 }),
          {
            borderColor,
            backgroundColor: uiCardSurface(scheme),
          },
        ]}
      >
        <View style={styles.historyTop}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {item.nickname || item.name || "—"}
          </ThemedText>
          <StatusBadge status={item.status} />
        </View>
        <ThemedText style={styles.historyMeta} numberOfLines={1}>
          {item.name}
          {item.createdAt ? ` · ${formatReportDate(item.createdAt)}` : ""}
        </ThemedText>
        <ThemedText style={styles.historyBody} numberOfLines={4}>
          {item.details}
        </ThemedText>
        {item.pointsAwarded > 0 ? (
          <View style={styles.pointsPill}>
            <MaterialIcons name="stars" size={14} color="#D97706" />
            <ThemedText style={styles.pointsText}>
              {tf("homeReportsPointsAwarded", { points: item.pointsAwarded })}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </ProfileStaggerItem>
  );
}

function FraudHistoryCard({
  item,
  index,
  reduceMotion,
  scheme,
  borderColor,
  fraudTypeLabel,
}: {
  item: ClientFraudReport;
  index: number;
  reduceMotion: boolean | null;
  scheme: "light" | "dark";
  borderColor: string;
  fraudTypeLabel: string;
}) {
  return (
    <ProfileStaggerItem index={index} reduceMotion={reduceMotion}>
      <View
        style={[
          styles.historyCard,
          uiCardShadow(scheme, { androidElevationLight: 2 }),
          {
            borderColor,
            backgroundColor: uiCardSurface(scheme),
          },
        ]}
      >
        <View style={styles.historyTop}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {item.fraudUserName || "—"}
          </ThemedText>
          <StatusBadge status={item.status} />
        </View>
        <ThemedText style={styles.historyMeta} numberOfLines={1}>
          {fraudTypeLabel}
          {item.reportedReferralCode
            ? ` · ${item.reportedReferralCode}`
            : ""}
        </ThemedText>
        <ThemedText style={styles.historyBody} numberOfLines={4}>
          {item.details}
        </ThemedText>
      </View>
    </ProfileStaggerItem>
  );
}

function EmptyHistory({
  message,
  icon,
  tint,
}: {
  message: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  tint: string;
}) {
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIcon, { backgroundColor: tint + "14" }]}>
        <MaterialIcons name={icon} size={26} color={tint} />
      </View>
      <ThemedText style={styles.emptyText}>{message}</ThemedText>
    </View>
  );
}

export function HomeReportsSection({
  visible,
  onClose,
}: HomeReportsSectionProps) {
  const { t, tf } = useLocale();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const insets = useAppSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  const [tab, setTab] = useState<Tab>("suggestion");

  const suggestionsQuery = useMySuggestions();
  const submitSuggestion = useSubmitSuggestion();
  const fraudReportsQuery = useMyFraudReports();
  const submitFraudReport = useSubmitFraudReport();

  const [nickname, setNickname] = useState("");
  const [name, setName] = useState("");
  const [suggestionDetails, setSuggestionDetails] = useState("");

  const [fraudUserName, setFraudUserName] = useState("");
  const [reportedReferralCode, setReportedReferralCode] = useState("");
  const [tradeDate, setTradeDate] = useState("");
  const [tradeTime, setTradeTime] = useState("");
  const [fraudType, setFraudType] = useState<FraudType>("FAKE_PRODUCT");
  const [fraudDetails, setFraudDetails] = useState("");

  const surface = uiCardSurface(scheme);
  const borderColor = colors.icon + "22";
  const fieldSurface = scheme === "dark" ? "#14171C" : "#F8FAFC";

  const canSubmitSuggestion = useMemo(
    () =>
      nickname.trim().length > 0 &&
      name.trim().length > 0 &&
      suggestionDetails.trim().length > 0,
    [name, nickname, suggestionDetails],
  );

  const canSubmitFraud = useMemo(
    () =>
      fraudUserName.trim().length > 0 &&
      reportedReferralCode.trim().length > 0 &&
      tradeDate.trim().length > 0 &&
      tradeTime.trim().length > 0 &&
      fraudDetails.trim().length > 0,
    [fraudDetails, fraudUserName, reportedReferralCode, tradeDate, tradeTime],
  );

  const onSubmitSuggestion = async () => {
    if (!canSubmitSuggestion || submitSuggestion.isPending) return;
    try {
      await submitSuggestion.mutateAsync({
        nickname: nickname.trim(),
        name: name.trim(),
        details: suggestionDetails.trim(),
      });
      setSuggestionDetails("");
      Alert.alert(t("homeReportsSuccessTitle"), t("homeSuggestionSubmitted"));
    } catch {
      Alert.alert(t("errorTitle"), t("homeReportsSubmitFailed"));
    }
  };

  const onSubmitFraud = async () => {
    if (!canSubmitFraud || submitFraudReport.isPending) return;
    if (!isValidCalendarDate(tradeDate.trim())) {
      Alert.alert(t("errorTitle"), t("chatMeetingDateInvalid"));
      return;
    }
    if (!isValidTime24h(tradeTime.trim())) {
      Alert.alert(t("errorTitle"), t("chatMeetingTimeInvalid"));
      return;
    }
    try {
      await submitFraudReport.mutateAsync({
        fraudUserName: fraudUserName.trim(),
        reportedReferralCode: reportedReferralCode.trim().toUpperCase(),
        tradeDate: tradeDate.trim(),
        tradeTime: tradeTime.trim(),
        fraudType,
        details: fraudDetails.trim(),
      });
      setFraudDetails("");
      Alert.alert(t("homeReportsSuccessTitle"), t("homeFraudSubmitted"));
    } catch {
      Alert.alert(t("errorTitle"), t("homeReportsSubmitFailed"));
    }
  };

  const headerEntering = uiSectionEnter(0, reduceMotion);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.screen}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Animated.View
            entering={headerEntering}
            style={[
              styles.hero,
              {
                paddingTop: Math.max(insets.top, 12) + 8,
                backgroundColor: colors.tint,
              },
              uiCardShadow(scheme, {
                iosOffsetLight: 8,
                iosOpacityLight: 0.18,
                androidElevationLight: 6,
              }),
            ]}
          >
            <View style={styles.heroTop}>
              <View style={styles.heroIconWrap}>
                <MaterialIcons name="campaign" size={22} color="#fff" />
              </View>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.closeBtn,
                  pressed && styles.closeBtnPressed,
                ]}
                accessibilityRole="button"
              >
                <MaterialIcons name="close" size={20} color="#fff" />
              </Pressable>
            </View>
            <ThemedText style={styles.heroTitle}>
              {t("homeSuggestionReportTitle")}
            </ThemedText>
            <ThemedText style={styles.heroSubtitle}>
              {t("homeReportsSubtitle")}
            </ThemedText>
          </Animated.View>

          <View
            style={[
              styles.tabBarWrap,
              {
                borderColor,
                backgroundColor: surface,
              },
              uiCardShadow(scheme),
            ]}
          >
            <ProfileTabButton
              active={tab === "suggestion"}
              tint={colors.tint}
              inactiveColor={colors.icon}
              label={t("homeSuggestionTab")}
              onPress={() => setTab("suggestion")}
            />
            <ProfileTabButton
              active={tab === "fraud"}
              tint={colors.tint}
              inactiveColor={colors.icon}
              label={t("homeFraudTab")}
              onPress={() => setTab("fraud")}
            />
          </View>

          <AppScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 20) + 24 },
            ]}
          >
            {tab === "suggestion" ? (
              <ProfileTabPanel tabKey="suggestion" reduceMotion={reduceMotion}>
                <ProfileAnimatedCard scheme={scheme} borderColor={borderColor}>
                  <SectionHeader
                    title={t("homeReportsNewSubmission")}
                    icon="edit-note"
                    tint={colors.tint}
                  />
                  <FormField
                    label={t("homeSuggestionNicknamePlaceholder")}
                    icon="badge"
                    tint={colors.tint}
                    surface={fieldSurface}
                    borderColor={borderColor}
                  >
                    <PremiumInput
                      value={nickname}
                      onChangeText={setNickname}
                      placeholder={t("homeSuggestionNicknamePlaceholder")}
                      textColor={colors.text}
                      placeholderColor={colors.icon}
                    />
                  </FormField>
                  <FormField
                    label={t("homeSuggestionNamePlaceholder")}
                    icon="person"
                    tint={colors.tint}
                    surface={fieldSurface}
                    borderColor={borderColor}
                  >
                    <PremiumInput
                      value={name}
                      onChangeText={setName}
                      placeholder={t("homeSuggestionNamePlaceholder")}
                      textColor={colors.text}
                      placeholderColor={colors.icon}
                    />
                  </FormField>
                  <FormField
                    label={t("homeSuggestionDetailsPlaceholder")}
                    icon="notes"
                    tint={colors.tint}
                    surface={fieldSurface}
                    borderColor={borderColor}
                  >
                    <PremiumInput
                      value={suggestionDetails}
                      onChangeText={setSuggestionDetails}
                      placeholder={t("homeSuggestionDetailsPlaceholder")}
                      textColor={colors.text}
                      placeholderColor={colors.icon}
                      multiline
                    />
                  </FormField>
                  <ProfilePressableScale
                    onPress={() => void onSubmitSuggestion()}
                    disabled={
                      !canSubmitSuggestion || submitSuggestion.isPending
                    }
                    style={[
                      styles.submitBtn,
                      {
                        backgroundColor: colors.tint,
                        opacity:
                          !canSubmitSuggestion || submitSuggestion.isPending
                            ? 0.55
                            : 1,
                      },
                    ]}
                  >
                    {submitSuggestion.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="send" size={18} color="#fff" />
                        <ThemedText style={styles.submitText}>
                          {t("homeSuggestionSubmit")}
                        </ThemedText>
                      </>
                    )}
                  </ProfilePressableScale>
                </ProfileAnimatedCard>

                <SectionHeader
                  title={t("homeReportsYourHistory")}
                  icon="history"
                  tint={colors.tint}
                />
                {suggestionsQuery.isPending ? (
                  <ActivityIndicator color={colors.tint} style={styles.loader} />
                ) : (suggestionsQuery.data ?? []).length === 0 ? (
                  <EmptyHistory
                    message={t("homeReportsEmptySuggestions")}
                    icon="lightbulb-outline"
                    tint={colors.tint}
                  />
                ) : (
                  (suggestionsQuery.data ?? []).slice(0, 8).map((item, index) => (
                    <SuggestionHistoryCard
                      key={item.id}
                      item={item}
                      index={index}
                      reduceMotion={reduceMotion}
                      scheme={scheme}
                      borderColor={borderColor}
                      tf={tf}
                    />
                  ))
                )}
              </ProfileTabPanel>
            ) : (
              <ProfileTabPanel tabKey="fraud" reduceMotion={reduceMotion}>
                <ProfileAnimatedCard scheme={scheme} borderColor={borderColor}>
                  <SectionHeader
                    title={t("homeReportsNewSubmission")}
                    icon="report"
                    tint={colors.tint}
                  />
                  <FormField
                    label={t("homeFraudUserNamePlaceholder")}
                    icon="person-search"
                    tint={colors.tint}
                    surface={fieldSurface}
                    borderColor={borderColor}
                  >
                    <PremiumInput
                      value={fraudUserName}
                      onChangeText={setFraudUserName}
                      placeholder={t("homeFraudUserNamePlaceholder")}
                      textColor={colors.text}
                      placeholderColor={colors.icon}
                    />
                  </FormField>
                  <FormField
                    label={t("homeFraudReferralCodePlaceholder")}
                    icon="qr-code-2"
                    tint={colors.tint}
                    surface={fieldSurface}
                    borderColor={borderColor}
                  >
                    <PremiumInput
                      value={reportedReferralCode}
                      onChangeText={setReportedReferralCode}
                      placeholder={t("homeFraudReferralCodePlaceholder")}
                      textColor={colors.text}
                      placeholderColor={colors.icon}
                      autoCapitalize="characters"
                    />
                  </FormField>
                  <View style={styles.row2}>
                    <View style={styles.row2Item}>
                      <FormField
                        label={t("homeFraudTradeDatePlaceholder")}
                        icon="event"
                        tint={colors.tint}
                        surface={fieldSurface}
                        borderColor={borderColor}
                      >
                        <DateTimeField
                          mode="date"
                          value={tradeDate}
                          onChange={setTradeDate}
                          placeholder={t("homeFraudTradeDatePlaceholder")}
                          embedded
                          minimumDate={new Date(2020, 0, 1)}
                        />
                      </FormField>
                    </View>
                    <View style={styles.row2Item}>
                      <FormField
                        label={t("homeFraudTradeTimePlaceholder")}
                        icon="schedule"
                        tint={colors.tint}
                        surface={fieldSurface}
                        borderColor={borderColor}
                      >
                        <DateTimeField
                          mode="time"
                          value={tradeTime}
                          onChange={setTradeTime}
                          placeholder={t("homeFraudTradeTimePlaceholder")}
                          embedded
                        />
                      </FormField>
                    </View>
                  </View>

                  <ThemedText style={styles.fieldLabel}>
                    {t("homeReportsFraudTypeLabel")}
                  </ThemedText>
                  <View style={styles.typeGrid}>
                    {CLIENT_FRAUD_TYPES.map((type) => {
                      const selected = fraudType === type;
                      return (
                        <Pressable
                          key={type}
                          onPress={() => setFraudType(type)}
                          style={[
                            styles.typeChip,
                            {
                              borderColor: selected
                                ? colors.tint
                                : borderColor,
                              backgroundColor: selected
                                ? colors.tint + "16"
                                : fieldSurface,
                            },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.typeChipText,
                              selected && { color: colors.tint },
                            ]}
                          >
                            {t(fraudTypeLabelKey(type))}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>

                  <FormField
                    label={t("homeFraudDetailsPlaceholder")}
                    icon="description"
                    tint={colors.tint}
                    surface={fieldSurface}
                    borderColor={borderColor}
                  >
                    <PremiumInput
                      value={fraudDetails}
                      onChangeText={setFraudDetails}
                      placeholder={t("homeFraudDetailsPlaceholder")}
                      textColor={colors.text}
                      placeholderColor={colors.icon}
                      multiline
                    />
                  </FormField>

                  <ProfilePressableScale
                    onPress={() => void onSubmitFraud()}
                    disabled={!canSubmitFraud || submitFraudReport.isPending}
                    style={[
                      styles.submitBtn,
                      {
                        backgroundColor: colors.tint,
                        opacity:
                          !canSubmitFraud || submitFraudReport.isPending
                            ? 0.55
                            : 1,
                      },
                    ]}
                  >
                    {submitFraudReport.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="gavel" size={18} color="#fff" />
                        <ThemedText style={styles.submitText}>
                          {t("homeFraudSubmit")}
                        </ThemedText>
                      </>
                    )}
                  </ProfilePressableScale>
                </ProfileAnimatedCard>

                <SectionHeader
                  title={t("homeReportsYourHistory")}
                  icon="history"
                  tint={colors.tint}
                />
                {fraudReportsQuery.isPending ? (
                  <ActivityIndicator color={colors.tint} style={styles.loader} />
                ) : (fraudReportsQuery.data ?? []).length === 0 ? (
                  <EmptyHistory
                    message={t("homeReportsEmptyFraud")}
                    icon="shield"
                    tint={colors.tint}
                  />
                ) : (
                  (fraudReportsQuery.data ?? []).slice(0, 8).map((item, index) => (
                    <FraudHistoryCard
                      key={item.id}
                      item={item}
                      index={index}
                      reduceMotion={reduceMotion}
                      scheme={scheme}
                      borderColor={borderColor}
                      fraudTypeLabel={
                        CLIENT_FRAUD_TYPES.includes(item.fraudType as FraudType)
                          ? t(fraudTypeLabelKey(item.fraudType as FraudType))
                          : item.fraudType
                      }
                    />
                  ))
                )}
              </ProfileTabPanel>
            )}
          </AppScrollView>
        </KeyboardAvoidingView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: 18,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnPressed: {
    opacity: 0.85,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    maxWidth: "95%",
  },
  tabBarWrap: {
    marginHorizontal: 16,
    marginTop: -18,
    borderRadius: 14,
    borderWidth: 1,
    padding: 6,
    flexDirection: "row",
    gap: 8,
    zIndex: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.72,
    letterSpacing: 0.2,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    minHeight: 48,
  },
  fieldIconWrap: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldInputWrap: {
    flex: 1,
    justifyContent: "center",
    paddingRight: 12,
  },
  input: {
    fontSize: 15,
    paddingVertical: 12,
    minHeight: 44,
  },
  inputMultiline: {
    minHeight: 108,
    paddingTop: 12,
    lineHeight: 21,
  },
  row2: {
    flexDirection: "row",
    gap: 10,
  },
  row2Item: {
    flex: 1,
    minWidth: 0,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  typeChip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  submitBtn: {
    minHeight: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  submitText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  loader: {
    marginVertical: 16,
  },
  historyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  historyTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  historyMeta: {
    fontSize: 12,
    opacity: 0.62,
  },
  historyBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  pointsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#FFFBEB",
  },
  pointsText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
    opacity: 0.65,
    lineHeight: 20,
  },
});




import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import { Alert, Pressable, Share, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useLocale } from "@/presentation/providers/LocaleProvider";

type Props = {
  code: string;
  title: string;
  hint?: string;
  tint: string;
  borderColor: string;
  surfaceColor: string;
};

export function ReferralCodeBlock({
  code,
  title,
  hint,
  tint,
  borderColor,
  surfaceColor,
}: Props) {
  const { t } = useLocale();
  const trimmed = code.trim();
  if (!trimmed) return null;

  const onCopy = async () => {
    await Clipboard.setStringAsync(trimmed);
    Alert.alert(t("referralCodeCopiedTitle"), t("referralCodeCopiedBody"));
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `${title}: ${trimmed}`,
      });
    } catch {
      // User cancelled share sheet.
    }
  };

  return (
    <View
      style={[
        styles.card,
        { borderColor, backgroundColor: surfaceColor },
      ]}
    >
      <ThemedText style={styles.title}>{title}</ThemedText>
      {hint ? <ThemedText style={styles.hint}>{hint}</ThemedText> : null}
      <View style={[styles.codeRow, { borderColor: tint + "44" }]}>
        <ThemedText style={[styles.code, { color: tint }]} selectable>
          {trimmed}
        </ThemedText>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={() => void onCopy()}
          style={({ pressed }) => [
            styles.btn,
            { borderColor: tint, opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <MaterialIcons name="content-copy" size={16} color={tint} />
          <ThemedText style={[styles.btnText, { color: tint }]}>
            {t("referralCodeCopy")}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => void onShare()}
          style={({ pressed }) => [
            styles.btn,
            styles.btnPrimary,
            { backgroundColor: tint, opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <MaterialIcons name="share" size={16} color="#FFF" />
          <ThemedText style={styles.btnTextPrimary}>{t("referralCodeShare")}</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
  },
  hint: {
    fontSize: 12,
    opacity: 0.72,
    lineHeight: 17,
  },
  codeRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  code: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  btn: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  btnPrimary: {
    borderWidth: 0,
  },
  btnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  btnTextPrimary: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
});

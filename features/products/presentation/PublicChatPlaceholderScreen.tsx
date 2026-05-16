import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocale } from "@/presentation/providers/LocaleProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  sellerId: string;
  sellerName?: string;
  productId?: string;
  productName?: string;
};

export function PublicChatPlaceholderScreen({
  sellerId,
  sellerName,
  productId,
  productName,
}: Props) {
  const router = useRouter();
  const { t } = useLocale();
  const colors = Colors[useColorScheme() ?? "light"];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <View style={[styles.topBar, { backgroundColor: colors.tint }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={20} color="#FFF" />
          </Pressable>
          <ThemedText style={styles.topTitle}>{t("publicDetailChatSeller")}</ThemedText>
          <View style={styles.backButton} />
        </View>

        <View style={styles.body}>
          <MaterialIcons name="chat-bubble-outline" size={54} color={colors.tint} />
          <ThemedText type="defaultSemiBold" style={styles.title}>
            {t("publicDetailChatSoon")}
          </ThemedText>
          <ThemedText style={styles.meta}>Seller: {sellerName || sellerId}</ThemedText>
          <ThemedText style={styles.meta}>Product: {productName || productId || "-"}</ThemedText>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  topBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { color: "#FFF", fontSize: 17, fontWeight: "800" },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 20 },
  title: { textAlign: "center", fontSize: 18 },
  meta: { fontSize: 13, opacity: 0.72, textAlign: "center" },
});

import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useLocale } from "@/presentation/providers/LocaleProvider";

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { t } = useLocale();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">
          {t("homeWelcome")}{user?.name ? `, ${user.name}` : ""}!
        </ThemedText>
        <ThemedText style={styles.subtitle}>{user?.email}</ThemedText>
      </View>

      <View style={styles.content}>
        <ThemedText type="subtitle">{t("homeBrandTitle")}</ThemedText>
        <ThemedText>{t("homeDashboardSubtitle")}</ThemedText>
      </View>

      <View style={styles.logoutWrapper}>
        <ThemedText type="link" onPress={logout} style={styles.logoutText}>
          {t("signOutButton")}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
  },
  subtitle: {
    opacity: 0.6,
    marginTop: 4,
  },
  content: {
    flex: 1,
    gap: 8,
  },
  logoutWrapper: {
    paddingBottom: 24,
    alignItems: "center",
  },
  logoutText: {
    color: "#e74c3c",
  },
});

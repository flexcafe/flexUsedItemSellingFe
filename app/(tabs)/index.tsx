import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/presentation/providers/AuthProvider";

export default function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">
          Welcome{user?.name ? `, ${user.name}` : ""}!
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {user?.email}
        </ThemedText>
      </View>

      <View style={styles.content}>
        <ThemedText type="subtitle">Flex Cafe</ThemedText>
        <ThemedText>Your cafe management dashboard.</ThemedText>
      </View>

      <View style={styles.logoutWrapper}>
        <ThemedText
          type="link"
          onPress={logout}
          style={styles.logoutText}>
          Sign Out
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

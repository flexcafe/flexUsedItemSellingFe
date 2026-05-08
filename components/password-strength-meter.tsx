import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very weak" | "Weak" | "Okay" | "Strong" | "Very strong";
  color: string;
  tips: string[];
};

function getPasswordStrength(password: string): PasswordStrength {
  const value = password ?? "";
  const tips: string[] = [];

  const length = value.length;
  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);

  if (length < 8) tips.push("Use at least 8 characters");
  if (!hasUpper) tips.push("Add an uppercase letter");
  if (!hasLower) tips.push("Add a lowercase letter");
  if (!hasNumber) tips.push("Add a number");
  if (!hasSymbol) tips.push("Add a symbol");

  // Simple scoring (0..4): length + character variety.
  let score = 0;
  if (length >= 8) score += 1;
  if (length >= 12) score += 1;
  const variety = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;
  if (variety >= 2) score += 1;
  if (variety >= 3) score += 1;

  const final = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  if (final === 0) return { score: 0, label: "Very weak", color: "#ef4444", tips };
  if (final === 1) return { score: 1, label: "Weak", color: "#f97316", tips };
  if (final === 2) return { score: 2, label: "Okay", color: "#eab308", tips };
  if (final === 3) return { score: 3, label: "Strong", color: "#22c55e", tips };
  return { score: 4, label: "Very strong", color: "#16a34a", tips };
}

export function PasswordStrengthMeter({
  password,
  visibleWhenEmpty = false,
}: {
  password: string;
  visibleWhenEmpty?: boolean;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  if (!visibleWhenEmpty && password.length === 0) return null;

  const pw = getPasswordStrength(password);
  return (
    <View style={styles.wrap}>
      <View style={[styles.track, { backgroundColor: `${colors.icon}20` }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${((pw.score + 1) / 5) * 100}%`,
              backgroundColor: pw.color,
            },
          ]}
        />
      </View>
      <View style={styles.row}>
        <ThemedText style={[styles.label, { color: pw.color }]}>{pw.label}</ThemedText>
        <ThemedText style={styles.hint}>
          {pw.tips.length > 0 ? pw.tips[0] : "Looks good"}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, gap: 6 },
  track: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
  },
  hint: {
    fontSize: 12,
    opacity: 0.7,
    flex: 1,
    textAlign: "right",
  },
});


import type { Category } from "@/core/domain/entities/Category";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useLocale } from "@/presentation/providers/LocaleProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import Constants from "expo-constants";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Clears `LanguageSwitcher` (absolute `top: ~44` + bar height) from overlapping the hero. */
const EXTRA_TOP_FOR_LANGUAGE_SWITCHER = 36;
/** Extra breathing room below the switcher / title row. */
const HERO_EXTRA_TOP_MARGIN = 14;

/** Compact tiles to match reference (~square, many visible per row). */
const CATEGORY_TILE_WIDTH = 68;
const CATEGORY_TILE_MIN_HEIGHT = 56;

type HomeHeroProps = {
  tint: string;
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
};

export function HomeHero({
  tint,
  categories,
  selectedCategoryId,
  onSelectCategory,
}: HomeHeroProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useAuth();
  const { t, categorySecondLine } = useLocale();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";

  const onSuggestReport = () => {
    const email =
      Constants.expoConfig?.extra?.supportEmail ??
      process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
    if (typeof email === "string" && email.includes("@")) {
      const q = encodeURIComponent("Suggest or Report");
      void Linking.openURL(`mailto:${email}?subject=${q}`);
    } else {
      router.push("/(tabs)/explore");
    }
  };

  return (
    <View
      style={[
        styles.hero,
        {
          backgroundColor: tint,
          paddingTop:
            Math.max(insets.top, 6) +
            EXTRA_TOP_FOR_LANGUAGE_SWITCHER +
            HERO_EXTRA_TOP_MARGIN,
        },
      ]}>
      <Text style={styles.marketTitle}>{t("homeMarketTitleFlex")}</Text>

      <View style={styles.actionsRow}>
        <View style={styles.actionsLeft}>
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            style={({ pressed }) => [
              styles.outlinePill,
              pressed && styles.pillPressed,
            ]}>
            <MaterialIcons name="person-outline" size={14} color="#fff" />
            <Text style={styles.outlinePillText} numberOfLines={1}>
              {t("homeMyProfileButton")}
            </Text>
          </Pressable>
          <Pressable
            onPress={onSuggestReport}
            style={({ pressed }) => [
              styles.reportPill,
              pressed && styles.pillPressed,
            ]}>
            <MaterialIcons name="warning" size={14} color="#fff" />
            <Text style={styles.reportPillText} numberOfLines={1}>
              {t("homeSuggestReportButton")}
            </Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => void logout()}
          style={({ pressed }) => [
            styles.logoutPill,
            pressed && styles.pillPressed,
          ]}>
          <Text style={[styles.logoutPillText, { color: tint }]}>
            {t("homeLogoutCaps")}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}>
        <Pressable
          onPress={() => onSelectCategory(null)}
          style={[
            styles.categoryTile,
            selectedCategoryId == null && styles.categoryTileSelected,
          ]}>
          <View style={styles.categoryIconWrap}>
            <MaterialIcons name="apps" size={17} color={Colors[scheme].text} />
          </View>
          <Text
            style={styles.categoryPrimary}
            numberOfLines={1}
            ellipsizeMode="tail">
            {t("homeAllCategory")}
          </Text>
        </Pressable>
        {categories.map((category) => {
          const selected = selectedCategoryId === category.id;
          const sub = categorySecondLine(category.slug);
          return (
            <Pressable
              key={category.id}
              onPress={() => onSelectCategory(category.id)}
              style={[
                styles.categoryTile,
                selected && styles.categoryTileSelected,
              ]}>
              <View style={styles.categoryIconWrap}>
                {category.iconUrl ? (
                  <Image
                    source={{ uri: category.iconUrl }}
                    style={styles.categoryIcon}
                    contentFit="contain"
                  />
                ) : (
                  <MaterialIcons name="category" size={17} color={Colors[scheme].text} />
                )}
              </View>
              <Text
                style={styles.categoryPrimary}
                numberOfLines={1}
                ellipsizeMode="tail">
                {category.name}
              </Text>
              {sub ? (
                <Text
                  style={styles.categorySecondary}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {sub}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingBottom: 10,
  },
  marketTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.15,
    paddingHorizontal: 12,
    marginTop: 0,
    marginBottom: 6,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  actionsLeft: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  outlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#fff",
    flexShrink: 1,
    maxWidth: "100%",
  },
  outlinePillText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
    flexShrink: 1,
  },
  reportPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#DC2626",
    flexShrink: 1,
    maxWidth: "100%",
  },
  reportPillText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    flexShrink: 1,
  },
  logoutPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#fff",
    flexShrink: 0,
  },
  logoutPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  pillPressed: {
    opacity: 0.85,
  },
  categoryRow: {
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 0,
    paddingBottom: 2,
  },
  categoryTile: {
    width: CATEGORY_TILE_WIDTH,
    minHeight: CATEGORY_TILE_MIN_HEIGHT,
    borderRadius: 10,
    backgroundColor: "#FACC15",
    paddingHorizontal: 4,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "flex-start",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  categoryTileSelected: {
    borderColor: "#fff",
  },
  categoryIconWrap: {
    width: 20,
    height: 20,
    marginBottom: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIcon: {
    width: 18,
    height: 18,
  },
  categoryPrimary: {
    fontSize: 9,
    fontWeight: "700",
    color: "#11181C",
    textAlign: "center",
    width: "100%",
    lineHeight: 11,
  },
  categorySecondary: {
    marginTop: 1,
    fontSize: 8,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    width: "100%",
    lineHeight: 9,
  },
});

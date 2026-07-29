import { Colors } from "@/constants/theme";
import type { Category } from "@/core/domain/entities/Category";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { paddingTopInsideSafeAreaForLanguageSwitcher } from "@/constants/language-switcher-layout";
import { ScreenTitleTypography } from "@/constants/typography";
import { AppScrollView } from "@/components/app-scroll-view";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useLocale } from "@/presentation/providers/LocaleProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

/** Compact tiles to match reference (~square, many visible per row). */
const CATEGORY_TILE_WIDTH = 68;
const CATEGORY_TILE_MIN_HEIGHT = 56;

type HomeHeroProps = {
  tint: string;
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onOpenSuggestion: () => void;
  onOpenFraudReport: () => void;
  onOpenContentReports: () => void;
};

type ActionTileProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  hint: string;
  onPress: () => void;
  tone?: "neutral" | "danger" | "soft";
};

function ActionTile({
  icon,
  label,
  hint,
  onPress,
  tone = "neutral",
}: ActionTileProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${hint}`}
      style={({ pressed }) => [
        styles.actionTile,
        tone === "danger" && styles.actionTileDanger,
        tone === "soft" && styles.actionTileSoft,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.actionIconWrap,
          tone === "danger" && styles.actionIconWrapDanger,
          tone === "soft" && styles.actionIconWrapSoft,
        ]}
      >
        <MaterialIcons name={icon} size={18} color="#fff" />
      </View>
      <Text style={styles.actionLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.actionHint} numberOfLines={2}>
        {hint}
      </Text>
    </Pressable>
  );
}

export function HomeHero({
  tint,
  categories,
  selectedCategoryId,
  onSelectCategory,
  onOpenSuggestion,
  onOpenFraudReport,
  onOpenContentReports,
}: HomeHeroProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const { t, categorySecondLine } = useLocale();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";

  return (
    <View
      style={[
        styles.hero,
        {
          backgroundColor: tint,
          paddingTop: paddingTopInsideSafeAreaForLanguageSwitcher(),
        },
      ]}
    >
      <View style={styles.titleRow}>
        <Text style={styles.marketTitle} numberOfLines={1}>
          {t("homeMarketTitleFlex")}
        </Text>
        <Pressable
          onPress={() => void logout()}
          style={({ pressed }) => [
            styles.logoutBtn,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("homeLogoutCaps")}
        >
          <MaterialIcons name="logout" size={15} color={tint} />
          <Text style={[styles.logoutText, { color: tint }]} numberOfLines={1}>
            {t("homeLogoutCaps")}
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push("/(tabs)/profile")}
        style={({ pressed }) => [
          styles.profileCard,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t("homeMyProfileButton")}
      >
        <View style={styles.profileIconWrap}>
          <MaterialIcons name="person-outline" size={18} color="#fff" />
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileTitle} numberOfLines={1}>
            {t("homeMyProfileButton")}
          </Text>
          <Text style={styles.profileHint} numberOfLines={1}>
            {t("homeProfileActionHint")}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.85)" />
      </Pressable>

      <View style={styles.actionsGrid}>
        <ActionTile
          icon="lightbulb-outline"
          label={t("homeSuggestionButtonShort")}
          hint={t("homeSuggestionButtonHint")}
          onPress={onOpenSuggestion}
          tone="soft"
        />
        <ActionTile
          icon="flag"
          label={t("contentReportsButtonShort")}
          hint={t("contentReportsButtonHint")}
          onPress={onOpenContentReports}
          tone="neutral"
        />
        <ActionTile
          icon="gavel"
          label={t("homeFraudButtonShort")}
          hint={t("homeFraudButtonHint")}
          onPress={onOpenFraudReport}
          tone="danger"
        />
      </View>

      <AppScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        <Pressable
          onPress={() => onSelectCategory(null)}
          style={[
            styles.categoryTile,
            selectedCategoryId == null && styles.categoryTileSelected,
          ]}
        >
          <View style={styles.categoryIconWrap}>
            <MaterialIcons name="apps" size={17} color={Colors[scheme].text} />
          </View>
          <Text
            style={styles.categoryPrimary}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
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
              ]}
            >
              <View style={styles.categoryIconWrap}>
                {category.iconUrl ? (
                  <Image
                    source={{ uri: category.iconUrl }}
                    style={styles.categoryIcon}
                    contentFit="contain"
                  />
                ) : (
                  <MaterialIcons
                    name="category"
                    size={17}
                    color={Colors[scheme].text}
                  />
                )}
              </View>
              <Text
                style={styles.categoryPrimary}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {category.name}
              </Text>
              {sub ? (
                <Text
                  style={styles.categorySecondary}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {sub}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </AppScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  marketTitle: {
    ...ScreenTitleTypography,
    color: "#fff",
    flex: 1,
    marginTop: 0,
    marginBottom: 0,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  logoutText: {
    fontSize: 11,
    fontWeight: "700",
  },
  profileCard: {
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  profileIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  profileTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  profileHint: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 11,
    fontWeight: "500",
  },
  actionsGrid: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  actionTile: {
    flex: 1,
    minHeight: 92,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(0,0,0,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 5,
  },
  actionTileSoft: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  actionTileDanger: {
    backgroundColor: "rgba(185,28,28,0.55)",
    borderColor: "rgba(255,255,255,0.22)",
  },
  actionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    marginBottom: 1,
  },
  actionIconWrapSoft: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  actionIconWrapDanger: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  actionLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 15,
  },
  actionHint: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 13,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
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

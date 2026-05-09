import { useMemo } from "react";
import Toast, { BaseToast } from "react-native-toast-message";
import type { ToastConfigParams } from "react-native-toast-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function NotificationToastRoot() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const colors = Colors[colorScheme ?? "light"];

  const toastConfig = useMemo(
    () => ({
      notification: (params: ToastConfigParams<undefined>) => (
        <BaseToast
          text1={params.text1}
          text2={params.text2}
          onPress={params.onPress}
          style={{
            borderLeftColor: colors.tint,
            backgroundColor: colors.background,
          }}
          text1Style={[
            params.text1Style,
            { fontSize: 16, fontWeight: "700", color: colors.text },
          ]}
          text2Style={[
            params.text2Style,
            { fontSize: 13, color: colors.text, opacity: 0.88 },
          ]}
          text2NumberOfLines={4}
        />
      ),
    }),
    [colors.background, colors.text, colors.tint],
  );

  return (
    <Toast
      config={toastConfig}
      position="top"
      topOffset={insets.top + 8}
    />
  );
}

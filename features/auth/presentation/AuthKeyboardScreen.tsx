import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { KeyboardAwareFormScroll } from "@/components/keyboard-aware-form-scroll";

type AuthKeyboardScreenProps = {
  children: ReactNode;
  footer?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
  showsVerticalScrollIndicator?: boolean;
  keyboardShouldPersistTaps?: "always" | "handled" | "never";
  showScrollHint?: boolean;
};

/** Auth-form wrapper around the shared keyboard-aware scroll. */
export function AuthKeyboardScreen(props: AuthKeyboardScreenProps) {
  return <KeyboardAwareFormScroll fill {...props} />;
}

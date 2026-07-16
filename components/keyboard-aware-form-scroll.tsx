import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { AppScrollView } from "@/components/app-scroll-view";

const FIELD_GAP_ABOVE_KEYBOARD = 28;

type KeyboardAwareFormScrollProps = {
  children: ReactNode;
  /** Rendered below the scroll area (e.g. language bar, footer actions). */
  footer?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  /** Full-screen forms (auth). Modal sheets should leave this false. */
  fill?: boolean;
  keyboardVerticalOffset?: number;
  showsVerticalScrollIndicator?: boolean;
  keyboardShouldPersistTaps?: "always" | "handled" | "never";
  showScrollHint?: boolean;
  nestedScrollEnabled?: boolean;
  refreshControl?: ScrollViewProps["refreshControl"];
};

/**
 * Form shell that keeps the focused input above the keyboard (iOS + Android).
 */
export function KeyboardAwareFormScroll({
  children,
  footer,
  contentContainerStyle,
  style,
  fill = false,
  keyboardVerticalOffset = 0,
  showsVerticalScrollIndicator = false,
  keyboardShouldPersistTaps = "handled",
  showScrollHint = true,
  nestedScrollEnabled,
  refreshControl,
}: KeyboardAwareFormScrollProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const [keyboardPad, setKeyboardPad] = useState(0);

  const resolveKeyboardTopY = useCallback((event: { endCoordinates?: { height?: number; screenY?: number } }) => {
    const windowHeight = Dimensions.get("window").height;
    const keyboardHeight = Math.max(
      0,
      Number(event.endCoordinates?.height ?? Keyboard.metrics()?.height ?? 0),
    );
    const screenY = Number(event.endCoordinates?.screenY);
    if (
      Number.isFinite(screenY) &&
      screenY > 0 &&
      screenY <= windowHeight
    ) {
      return screenY;
    }
    return Math.max(0, windowHeight - keyboardHeight);
  }, []);

  const scrollFocusedFieldAboveKeyboard = useCallback((keyboardTopY: number) => {
    const focused = TextInput.State.currentlyFocusedInput();
    if (!focused || !scrollRef.current) return;

    focused.measureInWindow((_x, y, _width, height) => {
      const fieldBottom = y + height;
      const visibleBottom = keyboardTopY - FIELD_GAP_ABOVE_KEYBOARD;
      if (fieldBottom <= visibleBottom) return;

      const delta = fieldBottom - visibleBottom;
      scrollRef.current?.scrollTo({
        y: Math.max(0, scrollYRef.current + delta),
        animated: true,
      });
    });
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (event) => {
      const keyboardHeight = Math.max(
        0,
        Number(event.endCoordinates?.height ?? Keyboard.metrics()?.height ?? 0),
      );
      setKeyboardPad(
        Math.max(120, Math.round(keyboardHeight + FIELD_GAP_ABOVE_KEYBOARD)),
      );
      const keyboardTopY = resolveKeyboardTopY(event);
      requestAnimationFrame(() => {
        scrollFocusedFieldAboveKeyboard(keyboardTopY);
      });
      setTimeout(() => scrollFocusedFieldAboveKeyboard(keyboardTopY), 100);
      setTimeout(() => scrollFocusedFieldAboveKeyboard(keyboardTopY), 280);
      setTimeout(() => scrollFocusedFieldAboveKeyboard(keyboardTopY), 520);
    });

    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardPad(0);
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [resolveKeyboardTopY, scrollFocusedFieldAboveKeyboard]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYRef.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  const flatContent = StyleSheet.flatten(contentContainerStyle) ?? {};
  const basePaddingBottom =
    typeof flatContent.paddingBottom === "number"
      ? flatContent.paddingBottom
      : 24;

  return (
    <KeyboardAvoidingView
      style={fill ? styles.fill : styles.shrink}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <AppScrollView
        ref={scrollRef}
        style={fill ? styles.fill : style}
        scrollViewStyle={fill ? styles.fill : undefined}
        contentContainerStyle={[
          contentContainerStyle,
          { paddingBottom: basePaddingBottom + keyboardPad },
        ]}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        showScrollHint={showScrollHint}
        nestedScrollEnabled={nestedScrollEnabled}
        refreshControl={refreshControl}
        onScroll={handleScroll}
      >
        {children}
      </AppScrollView>
      {footer}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  shrink: {
    flexShrink: 1,
  },
});

import { Stack } from "expo-router";

import { SafeAreaScreenWrapper } from "@/components/app-safe-area";

export default function ChatLayout() {
  return (
    <SafeAreaScreenWrapper mode="full">
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaScreenWrapper>
  );
}

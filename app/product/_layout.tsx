import { Stack } from "expo-router";

import { SafeAreaScreenWrapper } from "@/components/app-safe-area";

export default function ProductLayout() {
  return (
    <SafeAreaScreenWrapper mode="full">
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaScreenWrapper>
  );
}

import Constants from "expo-constants";
import { Platform } from "react-native";

export function getAppVersionInfo(): { version: string; build: string } {
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const build =
    Platform.OS === "android"
      ? String(Constants.expoConfig?.android?.versionCode ?? 1)
      : Platform.OS === "ios"
        ? (Constants.expoConfig?.ios?.buildNumber ?? "1")
        : String(Constants.expoConfig?.android?.versionCode ?? 1);

  return { version, build };
}

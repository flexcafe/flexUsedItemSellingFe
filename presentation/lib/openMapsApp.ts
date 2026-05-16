import { Linking, Platform } from "react-native";

export type MapOpenTarget = {
  latitude?: number | null;
  longitude?: number | null;
  label?: string | null;
  address?: string | null;
};

function normalizeCoords(
  latitude?: number | null,
  longitude?: number | null,
): { latitude: number; longitude: number } | null {
  if (latitude == null || longitude == null) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function displayQuery(target: MapOpenTarget): string {
  return [target.label, target.address]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

/** Build candidate map URLs (Google Maps web first for broad compatibility). */
export function buildMapsUrls(target: MapOpenTarget): string[] {
  const coords = normalizeCoords(target.latitude, target.longitude);
  const query = displayQuery(target);
  const urls: string[] = [];

  if (coords) {
    const { latitude, longitude } = coords;
    const label = query || `${latitude},${longitude}`;
    const encodedLabel = encodeURIComponent(label);
    urls.push(
      `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    );
    if (Platform.OS === "ios") {
      urls.push(`http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodedLabel}`);
    } else {
      urls.push(`geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedLabel})`);
    }
  }

  if (query) {
    const encoded = encodeURIComponent(query);
    urls.push(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
    if (Platform.OS === "ios") {
      urls.push(`http://maps.apple.com/?q=${encoded}`);
    }
  }

  return [...new Set(urls)];
}

export function canOpenMapsForTarget(target: MapOpenTarget): boolean {
  return buildMapsUrls(target).length > 0;
}

export async function openInMapsApp(target: MapOpenTarget): Promise<boolean> {
  const urls = buildMapsUrls(target);
  if (urls.length === 0) return false;

  for (const url of urls) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      // try next scheme
    }
  }

  try {
    await Linking.openURL(urls[0]!);
    return true;
  } catch {
    return false;
  }
}

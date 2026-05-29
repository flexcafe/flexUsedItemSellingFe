import { File, Paths } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import type { ImagePickerAsset } from "expo-image-picker";
import { Platform } from "react-native";

type NormalizeImageAssetOptions = {
  jpegQuality?: number;
};

function extensionFromMime(mimeType: string | null | undefined): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function replaceImageExtension(fileName: string, extension: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) return `image-${Date.now()}.${extension}`;
  return /\.[a-z0-9]+$/i.test(trimmed)
    ? trimmed.replace(/\.[a-z0-9]+$/i, `.${extension}`)
    : `${trimmed}.${extension}`;
}

export function isHeicImageAsset(asset: ImagePickerAsset): boolean {
  const mimeType = asset.mimeType?.toLowerCase() ?? "";
  const fileName = asset.fileName?.toLowerCase() ?? "";
  const uri = asset.uri?.toLowerCase() ?? "";
  return (
    mimeType === "image/heic" ||
    mimeType === "image/heif" ||
    fileName.endsWith(".heic") ||
    fileName.endsWith(".heif") ||
    uri.endsWith(".heic") ||
    uri.endsWith(".heif")
  );
}

export async function normalizeImagePickerAssetForUpload(
  asset: ImagePickerAsset | null | undefined,
  options: NormalizeImageAssetOptions = {},
): Promise<ImagePickerAsset | null> {
  if (!asset) return null;
  const uri = asset.uri?.trim();
  if (!uri) return null;

  if (isHeicImageAsset(asset)) {
    const converted = await ImageManipulator.manipulateAsync(
      uri,
      [],
      {
        compress: options.jpegQuality ?? 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
    const baseName =
      asset.fileName?.trim() || uri.split("/").pop() || `image-${Date.now()}`;
    return {
      ...asset,
      uri: converted.uri,
      fileName: replaceImageExtension(baseName, "jpg"),
      mimeType: "image/jpeg",
      width: converted.width,
      height: converted.height,
      fileSize: undefined,
    };
  }

  if (Platform.OS !== "android" || !uri.startsWith("content://")) {
    return asset;
  }

  const extension =
    asset.fileName?.split(".").pop()?.toLowerCase() ||
    extensionFromMime(asset.mimeType);
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const fileName = `upload-${stamp}.${extension}`;

  const source = new File(uri);
  const destination = new File(Paths.cache, fileName);
  source.copy(destination);
  return {
    ...asset,
    uri: destination.uri,
    fileName,
  };
}

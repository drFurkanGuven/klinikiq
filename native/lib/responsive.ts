import { useMemo } from "react";
import { Platform, useWindowDimensions } from "react-native";

export const TABLET_MIN_WIDTH = 768;
export const AUTH_MAX_WIDTH = 480;
export const CONTENT_MAX_WIDTH = 720;

export function isTabletWidth(width: number): boolean {
  return width >= TABLET_MIN_WIDTH;
}

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  return useMemo(
    () => ({
      width,
      height,
      isTablet: isTabletWidth(width),
      contentMaxWidth: isTabletWidth(width) ? CONTENT_MAX_WIDTH : width,
      authMaxWidth: AUTH_MAX_WIDTH,
    }),
    [width, height]
  );
}

export function useTabletContentStyle(maxWidth = CONTENT_MAX_WIDTH) {
  const { width, isTablet } = useResponsiveLayout();
  return useMemo(
    () =>
      isTablet
        ? {
            width: "100%" as const,
            maxWidth,
            alignSelf: "center" as const,
          }
        : undefined,
    [isTablet, maxWidth, width]
  );
}

export function tabletKeyboardOffset(isTablet: boolean): number {
  if (Platform.OS !== "ios") return 0;
  return isTablet ? 24 : 0;
}

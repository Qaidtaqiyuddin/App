import { useColorScheme } from "react-native";

export const lightPalette = {
  surface: "#FAF9F6",
  onSurface: "#1C1C1E",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#3A3A3C",
  surfaceTertiary: "#F2F2F7",
  onSurfaceTertiary: "#8E8E93",
  surfaceInverse: "#1C1C1E",
  onSurfaceInverse: "#FFFFFF",
  brand: "#4A7C59",
  brandPrimary: "#4A7C59",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#8DB596",
  onBrandSecondary: "#1C1C1E",
  brandTertiary: "#DDEADA",
  onBrandTertiary: "#2F4F38",
  success: "#34C759",
  onSuccess: "#FFFFFF",
  warning: "#FF9F0A",
  onWarning: "#FFFFFF",
  error: "#FF3B30",
  onError: "#FFFFFF",
  info: "#8E8E93",
  onInfo: "#FFFFFF",
  border: "#E5E5EA",
  borderStrong: "#C7C7CC",
  divider: "#E5E5EA",
};

export const darkPalette = {
  surface: "#121212",
  onSurface: "#F2F2F7",
  surfaceSecondary: "#1C1C1E",
  onSurfaceSecondary: "#D1D1D6",
  surfaceTertiary: "#2C2C2E",
  onSurfaceTertiary: "#8E8E93",
  surfaceInverse: "#FAF9F6",
  onSurfaceInverse: "#1C1C1E",
  brand: "#6BB382",
  brandPrimary: "#6BB382",
  onBrandPrimary: "#121212",
  brandSecondary: "#8DB596",
  onBrandSecondary: "#121212",
  brandTertiary: "#2A4031",
  onBrandTertiary: "#A3CCAE",
  success: "#30D158",
  onSuccess: "#121212",
  warning: "#FF9F0A",
  onWarning: "#121212",
  error: "#FF453A",
  onError: "#121212",
  info: "#8E8E93",
  onInfo: "#121212",
  border: "#2C2C2E",
  borderStrong: "#3A3A3C",
  divider: "#2C2C2E",
};

export type Palette = typeof lightPalette;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };
export const typography = {
  fontFamily: undefined as string | undefined,
  weightRegular: "400" as const,
  weightMedium: "500" as const,
  weightSemibold: "600" as const,
  weightBold: "700" as const,
};

export function usePalette(): Palette {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkPalette : lightPalette;
}

import React from "react";
import { View, Text, StyleSheet, ViewStyle, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePalette, spacing, radius } from "@/src/theme";

export function Card({ children, style, testID }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[]; testID?: string }) {
  const p = usePalette();
  return (
    <View testID={testID} style={[{ backgroundColor: p.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: p.border }, style as any]}>
      {children}
    </View>
  );
}

export function IconTile({ name, color, size = 20, bg }: { name: keyof typeof MaterialCommunityIcons.glyphMap; color: string; size?: number; bg?: string }) {
  const p = usePalette();
  return (
    <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: bg || p.brandTertiary, alignItems: "center", justifyContent: "center" }}>
      <MaterialCommunityIcons name={name} size={size} color={color} />
    </View>
  );
}

export function EmptyState({ icon = "tray", title, subtitle, cta, onPress, testID }: { icon?: keyof typeof MaterialCommunityIcons.glyphMap; title: string; subtitle?: string; cta?: string; onPress?: () => void; testID?: string }) {
  const p = usePalette();
  return (
    <View testID={testID} style={{ alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: p.brandTertiary, alignItems: "center", justifyContent: "center" }}>
        <MaterialCommunityIcons name={icon} size={36} color={p.brandPrimary} />
      </View>
      <Text style={{ color: p.onSurface, fontSize: 16, fontWeight: "600" }}>{title}</Text>
      {subtitle ? <Text style={{ color: p.onSurfaceTertiary, fontSize: 13, textAlign: "center" }}>{subtitle}</Text> : null}
      {cta && onPress ? (
        <Pressable onPress={onPress} style={{ marginTop: spacing.sm, backgroundColor: p.brandPrimary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill }}>
          <Text style={{ color: p.onBrandPrimary, fontWeight: "600" }}>{cta}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Chip({ label, active, onPress, testID }: { label: string; active?: boolean; onPress?: () => void; testID?: string }) {
  const p = usePalette();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={{
        height: 36,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: active ? p.brandPrimary : p.border,
        backgroundColor: active ? p.brandTertiary : p.surfaceSecondary,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Text style={{ color: active ? p.onBrandTertiary : p.onSurfaceSecondary, fontSize: 13, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const p = usePalette();
  const pct = max <= 0 ? 0 : Math.min(1, value / max);
  const barColor = color || (pct >= 1 ? p.error : pct >= 0.8 ? p.warning : p.brandPrimary);
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: p.surfaceTertiary, overflow: "hidden" }}>
      <View style={{ height: 8, width: `${pct * 100}%`, backgroundColor: barColor }} />
    </View>
  );
}

export function SectionHeader({ title, action, onActionPress, testID }: { title: string; action?: string; onActionPress?: () => void; testID?: string }) {
  const p = usePalette();
  return (
    <View testID={testID} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md, marginTop: spacing.lg }}>
      <Text style={{ color: p.onSurface, fontSize: 16, fontWeight: "700" }}>{title}</Text>
      {action ? (
        <Pressable onPress={onActionPress}>
          <Text style={{ color: p.brandPrimary, fontSize: 13, fontWeight: "600" }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Button({ label, onPress, variant = "primary", icon, disabled, testID, style }: { label: string; onPress?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger"; icon?: keyof typeof MaterialCommunityIcons.glyphMap; disabled?: boolean; testID?: string; style?: ViewStyle }) {
  const p = usePalette();
  const bg = variant === "primary" ? p.brandPrimary : variant === "secondary" ? p.brandTertiary : variant === "danger" ? p.error : "transparent";
  const fg = variant === "primary" ? p.onBrandPrimary : variant === "secondary" ? p.onBrandTertiary : variant === "danger" ? p.onError : p.brandPrimary;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [{
        backgroundColor: bg,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        borderRadius: radius.md,
        paddingVertical: 14,
        paddingHorizontal: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
      }, style]}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={18} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: "600", fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function Toast({ message, type = "success", visible }: { message: string; type?: "success" | "error" | "info"; visible: boolean }) {
  const p = usePalette();
  if (!visible) return null;
  const bg = type === "success" ? p.success : type === "error" ? p.error : p.info;
  return (
    <View pointerEvents="none" style={{ position: "absolute", bottom: 100, left: 20, right: 20, zIndex: 9999, alignItems: "center" }}>
      <View style={{ backgroundColor: bg, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.md }}>
        <Text style={{ color: "#fff", fontWeight: "600" }}>{message}</Text>
      </View>
    </View>
  );
}
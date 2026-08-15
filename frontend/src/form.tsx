import React from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { usePalette, spacing, radius } from "@/src/theme";

export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  const p = usePalette();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: p.onSurfaceTertiary, fontSize: 12, fontWeight: "600" }}>{label}</Text>
      {children}
    </View>
  );
}

export function TextField({ value, onChange, placeholder, testID, multiline, keyboardType }: { value: string; onChange: (v: string) => void; placeholder?: string; testID?: string; multiline?: boolean; keyboardType?: any }) {
  const p = usePalette();
  return (
    <TextInput
      testID={testID}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={p.onSurfaceTertiary}
      multiline={multiline}
      keyboardType={keyboardType}
      style={{
        backgroundColor: p.surfaceSecondary, color: p.onSurface,
        borderWidth: 1, borderColor: p.border, borderRadius: radius.md,
        paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 14,
        minHeight: multiline ? 80 : undefined, textAlignVertical: multiline ? "top" : "center",
      }}
    />
  );
}

export function OptionRow<T extends string>({ options, value, onChange, labels }: { options: T[]; value: T; onChange: (v: T) => void; labels: Record<string, string> }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      {options.map((o) => (
        <Pressable
          key={o}
          testID={`opt-${o}`}
          onPress={() => onChange(o)}
          style={{ paddingHorizontal: spacing.md, height: 36, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: value === o ? p.brandTertiary : p.surfaceSecondary, borderWidth: 1, borderColor: value === o ? p.brandPrimary : p.border }}
        >
          <Text style={{ color: value === o ? p.onBrandTertiary : p.onSurface, fontSize: 13, fontWeight: "600" }}>{labels[o] || o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export const COLOR_PALETTE = ["#4A7C59", "#8DB596", "#34C759", "#FF9F0A", "#FF7A45", "#FF3B30", "#FF2D55", "#AF52DE", "#5AC8FA", "#8E8E93", "#A2845E", "#FFCC00"];

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      {COLOR_PALETTE.map((c) => (
        <Pressable key={c} testID={`color-${c}`} onPress={() => onChange(c)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, borderWidth: value === c ? 3 : 0, borderColor: "#fff", alignItems: "center", justifyContent: "center" }} />
      ))}
    </View>
  );
}

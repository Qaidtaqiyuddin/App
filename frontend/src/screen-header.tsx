import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePalette, spacing } from "@/src/theme";

export function ScreenHeader({ title, subtitle, onAdd, addTestID }: { title: string; subtitle?: string; onAdd?: () => void; addTestID?: string }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: p.border, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <Pressable testID="btn-back" onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }}>
        <MaterialCommunityIcons name="chevron-left" size={26} color={p.onSurface} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ color: p.onSurface, fontSize: 18, fontWeight: "800" }}>{title}</Text>
        {subtitle ? <Text style={{ color: p.onSurfaceTertiary, fontSize: 12 }}>{subtitle}</Text> : null}
      </View>
      {onAdd ? (
        <Pressable testID={addTestID} onPress={onAdd} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: p.brandPrimary, alignItems: "center", justifyContent: "center" }}>
          <MaterialCommunityIcons name="plus" size={22} color={p.onBrandPrimary} />
        </Pressable>
      ) : null}
    </View>
  );
}

import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePalette, spacing, radius } from "@/src/theme";
import { Card, IconTile } from "@/src/ui";

const ITEMS: { key: string; label: string; icon: any; color: string; route: string }[] = [
  { key: "akun", label: "Akun & Dompet", icon: "wallet", color: "#4A7C59", route: "/akun" },
  { key: "kategori", label: "Kategori", icon: "shape", color: "#FF9F0A", route: "/kategori" },
  { key: "tagihan", label: "Tagihan & Berulang", icon: "calendar-clock", color: "#FF3B30", route: "/tagihan" },
  { key: "utang", label: "Utang & Piutang", icon: "hand-heart", color: "#8DB596", route: "/utang" },
  { key: "target", label: "Target Tabungan", icon: "piggy-bank", color: "#34C759", route: "/target" },
  { key: "catatan", label: "Catatan Keuangan", icon: "notebook", color: "#AF52DE", route: "/catatan" },
  { key: "cari", label: "Pencarian Global", icon: "magnify", color: "#5AC8FA", route: "/cari" },
  { key: "backup", label: "Ekspor & Backup", icon: "database-export", color: "#8E8E93", route: "/backup" },
  { key: "settings", label: "Pengaturan", icon: "cog", color: "#3A3A3C", route: "/pengaturan" },
];

export default function LainnyaScreen() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: p.surface }} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg }}>
        <Text style={{ color: p.onSurface, fontSize: 22, fontWeight: "800", marginBottom: spacing.lg }}>Lainnya</Text>
        <Card style={{ padding: 0 }}>
          {ITEMS.map((it, i) => (
            <Pressable
              key={it.key}
              testID={`menu-${it.key}`}
              onPress={() => router.push(it.route as any)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: p.divider,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <IconTile name={it.icon} color={it.color} bg={p.brandTertiary} />
              <Text style={{ flex: 1, color: p.onSurface, fontWeight: "600" }}>{it.label}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={p.onSurfaceTertiary} />
            </Pressable>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

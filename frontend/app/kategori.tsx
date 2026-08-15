import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePalette, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { Category } from "@/src/types";
import { Card, EmptyState, IconTile, Chip } from "@/src/ui";
import { ScreenHeader } from "@/src/screen-header";

export default function KategoriScreen() {
  const p = usePalette();
  const router = useRouter();
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"expense" | "income">("expense");

  const load = useCallback(async () => {
    setLoading(true);
    try { setCats(await api.get<Category[]>("/categories")); } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = cats.filter((c) => c.type === tab && !c.archived);

  return (
    <View style={{ flex: 1, backgroundColor: p.surface }}>
      <ScreenHeader title="Kategori" onAdd={() => router.push({ pathname: "/category/edit", params: { type: tab } })} addTestID="btn-add-category" />
      <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: "row", gap: spacing.sm }}>
        <Chip label="Pengeluaran" active={tab === "expense"} onPress={() => setTab("expense")} testID="chip-expense" />
        <Chip label="Pemasukan" active={tab === "income"} onPress={() => setTab("income")} testID="chip-income" />
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={p.brandPrimary} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: 40, gap: spacing.sm }}>
          {filtered.length === 0 ? (
            <EmptyState icon="shape" title="Belum ada kategori" cta="Tambah Kategori" onPress={() => router.push({ pathname: "/category/edit", params: { type: tab } })} testID="empty-cat" />
          ) : filtered.map((c) => (
            <Pressable key={c.id} testID={`category-${c.id}`} onPress={() => router.push({ pathname: "/category/edit", params: { id: c.id } })}>
              <Card style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md }}>
                <IconTile name={(c.icon as any) || "tag"} color={c.color} bg={c.color + "22"} />
                <Text style={{ flex: 1, color: p.onSurface, fontWeight: "600" }}>{c.name}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={p.onSurfaceTertiary} />
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

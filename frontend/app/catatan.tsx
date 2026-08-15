import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { usePalette, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { Note } from "@/src/types";
import { formatDateID } from "@/src/format";
import { Card, EmptyState, IconTile } from "@/src/ui";
import { ScreenHeader } from "@/src/screen-header";

const TYPE_LABEL: Record<string, string> = { plan: "Rencana", purchase: "Pembelian", debt: "Utang", saving_idea: "Ide Hemat", journal: "Jurnal" };
const TYPE_ICON: Record<string, any> = { plan: "clipboard-text", purchase: "cart", debt: "hand-coin", saving_idea: "lightbulb", journal: "book-open-variant" };
const TYPE_COLOR: Record<string, string> = { plan: "#4A7C59", purchase: "#FF9F0A", debt: "#FF3B30", saving_idea: "#34C759", journal: "#AF52DE" };

export default function CatatanScreen() {
  const p = usePalette();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setNotes(await api.get<Note[]>("/notes")); } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: p.surface }}>
      <ScreenHeader title="Catatan Keuangan" onAdd={() => router.push("/note/edit")} addTestID="btn-add-note" />
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={p.brandPrimary} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40, gap: spacing.md }}>
          {notes.length === 0 ? (
            <EmptyState icon="notebook" title="Belum ada catatan" cta="Tulis Catatan" onPress={() => router.push("/note/edit")} testID="empty-notes" />
          ) : notes.map((n) => (
            <Pressable key={n.id} testID={`note-${n.id}`} onPress={() => router.push({ pathname: "/note/edit", params: { id: n.id } })}>
              <Card style={{ flexDirection: "row", gap: spacing.md }}>
                <IconTile name={TYPE_ICON[n.type]} color={TYPE_COLOR[n.type]} bg={TYPE_COLOR[n.type] + "22"} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: p.onSurface, fontWeight: "700" }}>{n.title}</Text>
                  <Text style={{ color: p.onSurfaceTertiary, fontSize: 12, marginTop: 2 }} numberOfLines={2}>{n.content}</Text>
                  <Text style={{ color: p.brandPrimary, fontSize: 11, marginTop: 4 }}>{TYPE_LABEL[n.type]} · {formatDateID(n.date)}</Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

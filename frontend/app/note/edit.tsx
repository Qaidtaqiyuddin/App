import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePalette, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { Note } from "@/src/types";
import { FormField, TextField, OptionRow } from "@/src/form";
import { Button } from "@/src/ui";
import { todayJakarta } from "@/src/format";

export default function NoteEdit() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!params.id;
  const [loading, setLoading] = useState(isEdit);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<Note["type"]>("journal");
  const [existing, setExisting] = useState<Note | null>(null);

  const load = useCallback(async () => {
    if (!params.id) return;
    const all = await api.get<Note[]>("/notes");
    const n = all.find((x) => x.id === params.id);
    if (n) { setExisting(n); setTitle(n.title); setContent(n.content); setType(n.type); }
    setLoading(false);
  }, [params.id]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!title.trim()) return;
    const payload: any = { id: existing?.id, type, title: title.trim(), content, date: existing?.date || todayJakarta() };
    if (isEdit && existing) await api.put(`/notes/${existing.id}`, payload);
    else await api.post("/notes", payload);
    router.back();
  };
  const remove = async () => { if (existing) { await api.del(`/notes/${existing.id}`); router.back(); } };

  if (loading) return <View style={{ flex: 1, backgroundColor: p.surface, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={p.brandPrimary} /></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: p.surface }}>
      <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: p.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable testID="btn-close" onPress={() => router.back()}><MaterialCommunityIcons name="close" size={24} color={p.onSurface} /></Pressable>
        <Text style={{ color: p.onSurface, fontWeight: "700", fontSize: 16 }}>{isEdit ? "Edit Catatan" : "Catatan Baru"}</Text>
        <Pressable testID="btn-save" onPress={save}><Text style={{ color: p.brandPrimary, fontWeight: "700" }}>Simpan</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, gap: spacing.md }}>
        <FormField label="Jenis"><OptionRow options={["plan","purchase","debt","saving_idea","journal"]} value={type} onChange={(v) => setType(v as any)} labels={{ plan: "Rencana", purchase: "Pembelian", debt: "Utang", saving_idea: "Ide Hemat", journal: "Jurnal" }} /></FormField>
        <FormField label="Judul"><TextField value={title} onChange={setTitle} placeholder="cth. Rencana Q2" testID="input-title" /></FormField>
        <FormField label="Isi Catatan"><TextField value={content} onChange={setContent} multiline placeholder="Tulis di sini..." testID="input-content" /></FormField>
        {isEdit ? <Button label="Hapus Catatan" variant="danger" icon="trash-can" onPress={remove} testID="btn-delete" style={{ marginTop: spacing.md }} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

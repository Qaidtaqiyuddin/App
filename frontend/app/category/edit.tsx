import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePalette, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";
import { Category } from "@/src/types";
import { FormField, TextField, OptionRow, ColorPicker } from "@/src/form";
import { Button } from "@/src/ui";

const ICONS = ["tag","food","car","file-document","wifi","cellphone","shopping","medical-bag","school","movie","account-group","hand-heart","home","bank","receipt","briefcase","gift","cash","medal","storefront"];

export default function CategoryEdit() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; type?: string }>();
  const isEdit = !!params.id;
  const [loading, setLoading] = useState(isEdit);
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">((params.type as any) || "expense");
  const [color, setColor] = useState("#4A7C59");
  const [icon, setIcon] = useState("tag");
  const [existing, setExisting] = useState<Category | null>(null);

  const load = useCallback(async () => {
    if (!params.id) return;
    const all = await api.get<Category[]>("/categories");
    const c = all.find((x) => x.id === params.id);
    if (c) { setExisting(c); setName(c.name); setType(c.type); setColor(c.color); setIcon(c.icon); }
    setLoading(false);
  }, [params.id]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!name.trim()) return;
    const payload: any = { id: existing?.id, name: name.trim(), type, color, icon, parent_id: null, archived: false };
    if (isEdit && existing) await api.put(`/categories/${existing.id}`, payload);
    else await api.post("/categories", payload);
    router.back();
  };
  const archive = async () => { if (existing) { await api.del(`/categories/${existing.id}`); router.back(); } };

  if (loading) return <View style={{ flex: 1, backgroundColor: p.surface, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={p.brandPrimary} /></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: p.surface }}>
      <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: p.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable testID="btn-close" onPress={() => router.back()}><MaterialCommunityIcons name="close" size={24} color={p.onSurface} /></Pressable>
        <Text style={{ color: p.onSurface, fontWeight: "700", fontSize: 16 }}>{isEdit ? "Edit Kategori" : "Kategori Baru"}</Text>
        <Pressable testID="btn-save" onPress={save}><Text style={{ color: p.brandPrimary, fontWeight: "700" }}>Simpan</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, gap: spacing.md }}>
        <FormField label="Nama Kategori"><TextField value={name} onChange={setName} placeholder="cth. Makanan" testID="input-name" /></FormField>
        <FormField label="Jenis"><OptionRow options={["expense","income"]} value={type} onChange={(v) => setType(v as any)} labels={{ expense: "Pengeluaran", income: "Pemasukan" }} /></FormField>
        <FormField label="Warna"><ColorPicker value={color} onChange={setColor} /></FormField>
        <FormField label="Ikon">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {ICONS.map((ic) => (
              <Pressable key={ic} testID={`icon-${ic}`} onPress={() => setIcon(ic)} style={{ width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: icon === ic ? color + "22" : p.surfaceSecondary, borderWidth: 1, borderColor: icon === ic ? color : p.border }}>
                <MaterialCommunityIcons name={ic as any} size={20} color={icon === ic ? color : p.onSurfaceTertiary} />
              </Pressable>
            ))}
          </View>
        </FormField>
        {isEdit ? <Button label="Arsipkan Kategori" variant="danger" icon="archive" onPress={archive} testID="btn-archive" style={{ marginTop: spacing.md }} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

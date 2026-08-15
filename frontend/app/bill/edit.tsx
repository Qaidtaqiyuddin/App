import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePalette, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { Bill, Category, Account } from "@/src/types";
import { FormField, TextField, OptionRow } from "@/src/form";
import { Button } from "@/src/ui";
import { todayJakarta } from "@/src/format";

export default function BillEdit() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!params.id;
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [freq, setFreq] = useState<Bill["frequency"]>("monthly");
  const [dueDate, setDueDate] = useState(todayJakarta());
  const [notes, setNotes] = useState("");
  const [reminder, setReminder] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  const [existing, setExisting] = useState<Bill | null>(null);

  const load = useCallback(async () => {
    const c = await api.get<Category[]>("/categories");
    setCats(c.filter((x) => x.type === "expense" && !x.archived));
    if (params.id) {
      const all = await api.get<Bill[]>("/bills");
      const b = all.find((x) => x.id === params.id);
      if (b) { setExisting(b); setName(b.name); setAmount(String(b.amount)); setFreq(b.frequency); setDueDate(b.due_date); setNotes(b.notes || ""); setReminder(b.reminder); setCategoryId(b.category_id || ""); }
    }
    setLoading(false);
  }, [params.id]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!name.trim() || !amount) return;
    const payload: any = { id: existing?.id, name: name.trim(), amount: parseFloat(amount) || 0, frequency: freq, due_date: dueDate, category_id: categoryId || null, account_id: existing?.account_id || null, is_paid: existing?.is_paid || false, fixed: true, notes: notes || null, reminder };
    if (isEdit && existing) await api.put(`/bills/${existing.id}`, payload);
    else await api.post("/bills", payload);
    router.back();
  };
  const remove = async () => { if (existing) { await api.del(`/bills/${existing.id}`); router.back(); } };

  if (loading) return <View style={{ flex: 1, backgroundColor: p.surface, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={p.brandPrimary} /></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: p.surface }}>
      <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: p.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable testID="btn-close" onPress={() => router.back()}><MaterialCommunityIcons name="close" size={24} color={p.onSurface} /></Pressable>
        <Text style={{ color: p.onSurface, fontWeight: "700", fontSize: 16 }}>{isEdit ? "Edit Tagihan" : "Tagihan Baru"}</Text>
        <Pressable testID="btn-save" onPress={save}><Text style={{ color: p.brandPrimary, fontWeight: "700" }}>Simpan</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, gap: spacing.md }}>
        <FormField label="Nama Tagihan"><TextField value={name} onChange={setName} placeholder="cth. Listrik PLN" testID="input-name" /></FormField>
        <FormField label="Nominal"><TextField value={amount} onChange={(v) => setAmount(v.replace(/[^0-9]/g, ""))} keyboardType="numeric" testID="input-amount" /></FormField>
        <FormField label="Frekuensi"><OptionRow options={["daily","weekly","monthly","yearly"]} value={freq} onChange={(v) => setFreq(v as any)} labels={{ daily: "Harian", weekly: "Mingguan", monthly: "Bulanan", yearly: "Tahunan" }} /></FormField>
        <FormField label="Jatuh Tempo (YYYY-MM-DD)"><TextField value={dueDate} onChange={setDueDate} placeholder="2026-01-01" testID="input-due" /></FormField>
        <FormField label="Kategori">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {cats.map((c) => (
              <Pressable key={c.id} testID={`cat-${c.id}`} onPress={() => setCategoryId(c.id)} style={{ paddingHorizontal: spacing.md, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: categoryId === c.id ? c.color + "22" : p.surfaceSecondary, borderWidth: 1, borderColor: categoryId === c.id ? c.color : p.border }}>
                <Text style={{ color: p.onSurface, fontSize: 12, fontWeight: "600" }}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        </FormField>
        <FormField label="Catatan"><TextField value={notes} onChange={setNotes} placeholder="Opsional" multiline testID="input-notes" /></FormField>
        <Pressable testID="toggle-reminder" onPress={() => setReminder(!reminder)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: p.onSurface, fontWeight: "600" }}>Pengingat (placeholder)</Text>
          <MaterialCommunityIcons name={reminder ? "toggle-switch" : "toggle-switch-off-outline"} size={40} color={reminder ? p.brandPrimary : p.onSurfaceTertiary} />
        </Pressable>
        {isEdit ? <Button label="Hapus Tagihan" variant="danger" icon="trash-can" onPress={remove} testID="btn-delete" style={{ marginTop: spacing.md }} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

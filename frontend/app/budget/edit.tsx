import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePalette, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";
import { Budget, Category } from "@/src/types";
import { FormField, TextField, OptionRow } from "@/src/form";
import { Button } from "@/src/ui";

export default function BudgetEdit() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!params.id;
  const now = new Date();
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<"monthly" | "weekly">("monthly");
  const [categoryId, setCategoryId] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  const [existing, setExisting] = useState<Budget | null>(null);

  const load = useCallback(async () => {
    const c = await api.get<Category[]>("/categories");
    setCats(c.filter((x) => x.type === "expense" && !x.archived));
    if (params.id) {
      const all = await api.get<Budget[]>("/budgets");
      const b = all.find((x) => x.id === params.id);
      if (b) { setExisting(b); setAmount(String(b.amount)); setPeriod(b.period); setCategoryId(b.category_id || ""); }
    }
    setLoading(false);
  }, [params.id]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!amount) return;
    const payload: any = { id: existing?.id, category_id: categoryId || null, period, amount: parseFloat(amount) || 0, month: existing?.month || now.getMonth() + 1, year: existing?.year || now.getFullYear() };
    if (isEdit && existing) await api.put(`/budgets/${existing.id}`, payload);
    else await api.post("/budgets", payload);
    router.back();
  };
  const remove = async () => { if (existing) { await api.del(`/budgets/${existing.id}`); router.back(); } };

  if (loading) return <View style={{ flex: 1, backgroundColor: p.surface, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={p.brandPrimary} /></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: p.surface }}>
      <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: p.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable testID="btn-close" onPress={() => router.back()}><MaterialCommunityIcons name="close" size={24} color={p.onSurface} /></Pressable>
        <Text style={{ color: p.onSurface, fontWeight: "700", fontSize: 16 }}>{isEdit ? "Edit Anggaran" : "Anggaran Baru"}</Text>
        <Pressable testID="btn-save" onPress={save}><Text style={{ color: p.brandPrimary, fontWeight: "700" }}>Simpan</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, gap: spacing.md }}>
        <FormField label="Periode"><OptionRow options={["monthly","weekly"]} value={period} onChange={(v) => setPeriod(v as any)} labels={{ monthly: "Bulanan", weekly: "Mingguan" }} /></FormField>
        <FormField label="Nominal Anggaran"><TextField value={amount} onChange={(v) => setAmount(v.replace(/[^0-9]/g, ""))} keyboardType="numeric" testID="input-amount" /></FormField>
        <FormField label="Kategori (kosongkan untuk total)">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <Pressable testID="cat-total" onPress={() => setCategoryId("")} style={{ paddingHorizontal: spacing.md, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: categoryId === "" ? p.brandTertiary : p.surfaceSecondary, borderWidth: 1, borderColor: categoryId === "" ? p.brandPrimary : p.border }}>
              <Text style={{ color: p.onSurface, fontSize: 12, fontWeight: "600" }}>Total</Text>
            </Pressable>
            {cats.map((c) => (
              <Pressable key={c.id} testID={`cat-${c.id}`} onPress={() => setCategoryId(c.id)} style={{ paddingHorizontal: spacing.md, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: categoryId === c.id ? c.color + "22" : p.surfaceSecondary, borderWidth: 1, borderColor: categoryId === c.id ? c.color : p.border }}>
                <Text style={{ color: p.onSurface, fontSize: 12, fontWeight: "600" }}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        </FormField>
        {isEdit ? <Button label="Hapus Anggaran" variant="danger" icon="trash-can" onPress={remove} testID="btn-delete" style={{ marginTop: spacing.md }} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

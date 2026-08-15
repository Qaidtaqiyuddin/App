import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePalette, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { SavingsGoal, Account } from "@/src/types";
import { FormField, TextField } from "@/src/form";
import { Button, Card } from "@/src/ui";
import { formatIDR, todayJakarta } from "@/src/format";

export default function SavingsEdit() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!params.id;
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("0");
  const [targetDate, setTargetDate] = useState("");
  const [periodic, setPeriodic] = useState("");
  const [notes, setNotes] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [existing, setExisting] = useState<SavingsGoal | null>(null);
  const [depositAmt, setDepositAmt] = useState("");

  const load = useCallback(async () => {
    const a = await api.get<Account[]>("/accounts");
    setAccounts(a); if (a.length) setAccountId(a[0].id);
    if (params.id) {
      const all = await api.get<SavingsGoal[]>("/savings");
      const g = all.find((x) => x.id === params.id);
      if (g) { setExisting(g); setName(g.name); setTarget(String(g.target_amount)); setCurrent(String(g.current_amount)); setTargetDate(g.target_date || ""); setPeriodic(String(g.periodic_deposit || "")); setNotes(g.notes || ""); }
    }
    setLoading(false);
  }, [params.id]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!name.trim() || !target) return;
    const payload: any = { id: existing?.id, name: name.trim(), target_amount: parseFloat(target) || 0, current_amount: parseFloat(current) || 0, target_date: targetDate || null, periodic_deposit: periodic ? parseFloat(periodic) : null, account_id: accountId || null, notes: notes || null };
    if (isEdit && existing) await api.put(`/savings/${existing.id}`, payload);
    else await api.post("/savings", payload);
    router.back();
  };
  const remove = async () => { if (existing) { await api.del(`/savings/${existing.id}`); router.back(); } };

  const deposit = async () => {
    if (!existing || !depositAmt) return;
    const amt = parseFloat(depositAmt) || 0;
    if (amt <= 0) return;
    await api.post("/transactions", {
      date: todayJakarta(), time: "12:00", type: "transfer",
      amount: amt, account_id: accountId, to_account_id: accountId,
      note: `Setoran tabungan - ${existing.name}`, tags: [], is_recurring: false, verified: true, savings_goal_id: existing.id,
    });
    setDepositAmt("");
    load();
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: p.surface, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={p.brandPrimary} /></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: p.surface }}>
      <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: p.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable testID="btn-close" onPress={() => router.back()}><MaterialCommunityIcons name="close" size={24} color={p.onSurface} /></Pressable>
        <Text style={{ color: p.onSurface, fontWeight: "700", fontSize: 16 }}>{isEdit ? "Edit Target" : "Target Baru"}</Text>
        <Pressable testID="btn-save" onPress={save}><Text style={{ color: p.brandPrimary, fontWeight: "700" }}>Simpan</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, gap: spacing.md }}>
        <FormField label="Nama Target"><TextField value={name} onChange={setName} placeholder="cth. Dana Darurat" testID="input-name" /></FormField>
        <FormField label="Nominal Target"><TextField value={target} onChange={(v) => setTarget(v.replace(/[^0-9]/g, ""))} keyboardType="numeric" testID="input-target" /></FormField>
        <FormField label="Saldo Saat Ini"><TextField value={current} onChange={(v) => setCurrent(v.replace(/[^0-9]/g, ""))} keyboardType="numeric" testID="input-current" /></FormField>
        <FormField label="Tanggal Target (opsional)"><TextField value={targetDate} onChange={setTargetDate} placeholder="YYYY-MM-DD" testID="input-target-date" /></FormField>
        <FormField label="Setoran Berkala per Bulan (opsional)"><TextField value={periodic} onChange={(v) => setPeriodic(v.replace(/[^0-9]/g, ""))} keyboardType="numeric" testID="input-periodic" /></FormField>
        <FormField label="Catatan"><TextField value={notes} onChange={setNotes} multiline placeholder="Opsional" testID="input-notes" /></FormField>
        {isEdit && existing ? (
          <>
            <Card>
              <Text style={{ color: p.onSurface, fontWeight: "700", marginBottom: spacing.sm }}>Tambah Setoran</Text>
              <TextField value={depositAmt} onChange={(v) => setDepositAmt(v.replace(/[^0-9]/g, ""))} keyboardType="numeric" placeholder="Nominal setoran" testID="input-deposit" />
              <View style={{ marginTop: spacing.sm }}><Button label="Setor" icon="cash-plus" onPress={deposit} testID="btn-deposit" /></View>
            </Card>
            <Button label="Hapus Target" variant="danger" icon="trash-can" onPress={remove} testID="btn-delete" />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

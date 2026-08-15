import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePalette, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";
import { DebtCredit, Account } from "@/src/types";
import { FormField, TextField, OptionRow } from "@/src/form";
import { Button, Card } from "@/src/ui";
import { formatIDR, formatDateID, todayJakarta } from "@/src/format";

export default function DebtEdit() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!params.id;
  const [loading, setLoading] = useState(true);
  const [party, setParty] = useState("");
  const [type, setType] = useState<DebtCredit["type"]>("debt");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayJakarta());
  const [due, setDue] = useState("");
  const [notes, setNotes] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [existing, setExisting] = useState<DebtCredit | null>(null);
  const [payAmount, setPayAmount] = useState("");

  const load = useCallback(async () => {
    const a = await api.get<Account[]>("/accounts");
    setAccounts(a); if (a.length) setAccountId(a[0].id);
    if (params.id) {
      const all = await api.get<DebtCredit[]>("/debts");
      const d = all.find((x) => x.id === params.id);
      if (d) { setExisting(d); setParty(d.party_name); setType(d.type); setAmount(String(d.initial_amount)); setDate(d.date); setDue(d.due_date || ""); setNotes(d.notes || ""); }
    }
    setLoading(false);
  }, [params.id]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!party.trim() || !amount) return;
    const payload: any = { id: existing?.id, party_name: party.trim(), type, initial_amount: parseFloat(amount) || 0, date, due_date: due || null, payments: existing?.payments || [], account_id: accountId || null, notes: notes || null, status: existing?.status || "active" };
    if (isEdit && existing) await api.put(`/debts/${existing.id}`, payload);
    else await api.post("/debts", payload);
    router.back();
  };
  const remove = async () => { if (existing) { await api.del(`/debts/${existing.id}`); router.back(); } };

  const recordPayment = async () => {
    if (!existing || !payAmount) return;
    const amt = parseFloat(payAmount) || 0;
    if (amt <= 0) return;
    const isDebt = existing.type === "debt" || existing.type === "loan";
    // create transaction linked to debt
    await api.post("/transactions", {
      date: todayJakarta(), time: "12:00",
      type: isDebt ? "expense" : "income",
      amount: amt, account_id: accountId,
      payee: existing.party_name, note: `Pembayaran ${isDebt ? "utang" : "piutang"} - ${existing.party_name}`,
      tags: [], is_recurring: false, verified: true, debt_id: existing.id,
    });
    setPayAmount("");
    load();
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: p.surface, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={p.brandPrimary} /></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: p.surface }}>
      <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: p.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable testID="btn-close" onPress={() => router.back()}><MaterialCommunityIcons name="close" size={24} color={p.onSurface} /></Pressable>
        <Text style={{ color: p.onSurface, fontWeight: "700", fontSize: 16 }}>{isEdit ? "Edit" : "Utang / Piutang Baru"}</Text>
        <Pressable testID="btn-save" onPress={save}><Text style={{ color: p.brandPrimary, fontWeight: "700" }}>Simpan</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, gap: spacing.md }}>
        <FormField label="Nama Pihak"><TextField value={party} onChange={setParty} placeholder="cth. Andi" testID="input-party" /></FormField>
        <FormField label="Jenis"><OptionRow options={["debt","credit","loan","cashbon","installment"]} value={type} onChange={(v) => setType(v as any)} labels={{ debt: "Utang", credit: "Piutang", loan: "Pinjaman", cashbon: "Kas Bon", installment: "Cicilan" }} /></FormField>
        <FormField label="Nominal Awal"><TextField value={amount} onChange={(v) => setAmount(v.replace(/[^0-9]/g, ""))} keyboardType="numeric" testID="input-amount" /></FormField>
        <FormField label="Tanggal (YYYY-MM-DD)"><TextField value={date} onChange={setDate} testID="input-date" /></FormField>
        <FormField label="Jatuh Tempo (opsional)"><TextField value={due} onChange={setDue} placeholder="YYYY-MM-DD" testID="input-due" /></FormField>
        <FormField label="Catatan"><TextField value={notes} onChange={setNotes} multiline placeholder="Opsional" testID="input-notes" /></FormField>

        {isEdit && existing ? (
          <>
            <Card>
              <Text style={{ color: p.onSurface, fontWeight: "700", marginBottom: spacing.sm }}>Catat Pembayaran</Text>
              <Text style={{ color: p.onSurfaceTertiary, fontSize: 12, marginBottom: spacing.sm }}>Sisa: {formatIDR(existing.remaining || 0)}</Text>
              <TextField value={payAmount} onChange={(v) => setPayAmount(v.replace(/[^0-9]/g, ""))} keyboardType="numeric" placeholder="Nominal pembayaran" testID="input-payment" />
              <View style={{ marginTop: spacing.sm }}>
                <Button label="Catat Pembayaran" icon="cash-plus" onPress={recordPayment} testID="btn-record-payment" />
              </View>
            </Card>
            {existing.payments.length > 0 ? (
              <Card>
                <Text style={{ color: p.onSurface, fontWeight: "700", marginBottom: spacing.sm }}>Riwayat Pembayaran</Text>
                {existing.payments.map((pm) => (
                  <View key={pm.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
                    <Text style={{ color: p.onSurfaceTertiary, fontSize: 13 }}>{formatDateID(pm.date)}</Text>
                    <Text style={{ color: p.onSurface, fontWeight: "600" }}>{formatIDR(pm.amount)}</Text>
                  </View>
                ))}
              </Card>
            ) : null}
            <Button label="Hapus" variant="danger" icon="trash-can" onPress={remove} testID="btn-delete" />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

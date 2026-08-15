import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePalette, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";
import { Account, Category, Transaction, TxType } from "@/src/types";
import { formatIDR, todayJakarta, formatDateID } from "@/src/format";
import { Button, Card, IconTile } from "@/src/ui";

export default function TransactionForm() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; type?: TxType }>();
  const isEdit = !!params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<TxType>((params.type as TxType) || "expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayJakarta());
  const [time, setTime] = useState("12:00");
  const [accountId, setAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [payee, setPayee] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [method, setMethod] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [existing, setExisting] = useState<Transaction | null>(null);

  const load = useCallback(async () => {
    try {
      const [a, c] = await Promise.all([api.get<Account[]>("/accounts"), api.get<Category[]>("/categories")]);
      setAccounts(a); setCats(c);
      if (a.length && !accountId) setAccountId(a[0].id);
      if (params.id) {
        const all = await api.get<Transaction[]>("/transactions");
        const t = all.find((x) => x.id === params.id);
        if (t) {
          setExisting(t);
          setType(t.type);
          setAmount(String(t.amount));
          setDate(t.date);
          setTime(t.time);
          setAccountId(t.account_id);
          setToAccountId(t.to_account_id || "");
          setCategoryId(t.category_id || "");
          setPayee(t.payee || "");
          setNote(t.note || "");
          setTags((t.tags || []).join(", "));
          setMethod(t.method || "");
        }
      }
    } finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  const filteredCats = cats.filter((c) => !c.archived && (type === "income" || type === "refund" ? c.type === "income" : type === "expense" ? c.type === "expense" : true));

  const save = async () => {
    const amt = parseFloat(amount.replace(/[^0-9.,]/g, "").replace(",", "."));
    if (!amt || amt <= 0) return;
    if (!accountId) return;
    if (type === "transfer" && !toAccountId) return;
    setSaving(true);
    try {
      const payload: any = {
        id: existing?.id || undefined,
        date, time, type, amount: amt, account_id: accountId,
        to_account_id: type === "transfer" ? toAccountId : null,
        category_id: type === "transfer" || type === "adjustment" ? null : categoryId || null,
        payee: payee || null, method: method || null, note: note || null,
        tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
        is_recurring: false, verified: true,
      };
      if (isEdit && existing) {
        await api.put(`/transactions/${existing.id}`, { ...existing, ...payload });
      } else {
        await api.post("/transactions", payload);
      }
      router.back();
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!existing) return;
    await api.del(`/transactions/${existing.id}`);
    router.back();
  };

  if (loading) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: p.surface }}><ActivityIndicator color={p.brandPrimary} /></View>;

  const typeColors: Record<TxType, string> = { income: p.success, expense: p.error, transfer: p.info, refund: p.brandPrimary, adjustment: p.warning };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: p.surface }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: p.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable testID="btn-close" onPress={() => router.back()}><MaterialCommunityIcons name="close" size={24} color={p.onSurface} /></Pressable>
        <Text style={{ color: p.onSurface, fontWeight: "700", fontSize: 16 }}>{isEdit ? "Edit Transaksi" : "Transaksi Baru"}</Text>
        <Pressable testID="btn-save" onPress={save} disabled={saving}>
          <Text style={{ color: p.brandPrimary, fontWeight: "700" }}>{saving ? "..." : "Simpan"}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, gap: spacing.md }}>
        {/* Type selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {(["income", "expense", "transfer", "refund", "adjustment"] as TxType[]).map((t) => (
            <Pressable
              key={t}
              testID={`type-${t}`}
              onPress={() => setType(t)}
              style={{
                height: 36, paddingHorizontal: spacing.lg, borderRadius: radius.pill,
                backgroundColor: type === t ? typeColors[t] : p.surfaceSecondary,
                borderWidth: 1, borderColor: type === t ? typeColors[t] : p.border,
                alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <Text style={{ color: type === t ? "#fff" : p.onSurface, fontWeight: "600", fontSize: 13 }}>
                {t === "income" ? "Pemasukan" : t === "expense" ? "Pengeluaran" : t === "transfer" ? "Transfer" : t === "refund" ? "Refund" : "Penyesuaian"}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Amount */}
        <View style={{ alignItems: "center", paddingVertical: spacing.lg }}>
          <Text style={{ color: p.onSurfaceTertiary, fontSize: 12 }}>Nominal</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 }}>
            <Text style={{ color: typeColors[type], fontSize: 24, fontWeight: "700" }}>Rp</Text>
            <TextInput
              testID="input-amount"
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={p.onSurfaceTertiary}
              style={{ color: p.onSurface, fontSize: 40, fontWeight: "800", minWidth: 120, textAlign: "left" }}
            />
          </View>
          {amount ? <Text style={{ color: p.onSurfaceTertiary, fontSize: 13 }}>{formatIDR(parseFloat(amount || "0"))}</Text> : null}
        </View>

        {/* Account */}
        <Field label={type === "transfer" ? "Dari Akun" : "Akun"}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {accounts.map((a) => (
              <Pressable key={a.id} testID={`acc-${a.id}`} onPress={() => setAccountId(a.id)} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.md, height: 36, borderRadius: radius.pill, backgroundColor: accountId === a.id ? p.brandTertiary : p.surfaceSecondary, borderWidth: 1, borderColor: accountId === a.id ? p.brandPrimary : p.border, flexShrink: 0 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: a.color }} />
                <Text style={{ color: p.onSurface, fontSize: 13, fontWeight: "600" }}>{a.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Field>

        {type === "transfer" ? (
          <Field label="Ke Akun">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {accounts.filter((a) => a.id !== accountId).map((a) => (
                <Pressable key={a.id} testID={`to-acc-${a.id}`} onPress={() => setToAccountId(a.id)} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.md, height: 36, borderRadius: radius.pill, backgroundColor: toAccountId === a.id ? p.brandTertiary : p.surfaceSecondary, borderWidth: 1, borderColor: toAccountId === a.id ? p.brandPrimary : p.border, flexShrink: 0 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: a.color }} />
                  <Text style={{ color: p.onSurface, fontSize: 13, fontWeight: "600" }}>{a.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Field>
        ) : null}

        {type !== "transfer" && type !== "adjustment" ? (
          <Field label="Kategori">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {filteredCats.map((c) => (
                <Pressable key={c.id} testID={`cat-${c.id}`} onPress={() => setCategoryId(c.id)} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.md, height: 34, borderRadius: radius.pill, backgroundColor: categoryId === c.id ? c.color + "22" : p.surfaceSecondary, borderWidth: 1, borderColor: categoryId === c.id ? c.color : p.border }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.color }} />
                  <Text style={{ color: p.onSurface, fontSize: 12, fontWeight: "600" }}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          </Field>
        ) : null}

        <Field label="Tanggal">
          <TextInputRow value={date} onChange={setDate} placeholder="YYYY-MM-DD" testID="input-date" />
        </Field>
        <Field label="Waktu">
          <TextInputRow value={time} onChange={setTime} placeholder="HH:MM" testID="input-time" />
        </Field>
        {type !== "transfer" ? (
          <Field label="Penerima / Sumber">
            <TextInputRow value={payee} onChange={setPayee} placeholder="cth. Warteg Mama" testID="input-payee" />
          </Field>
        ) : null}
        <Field label="Metode Pembayaran">
          <TextInputRow value={method} onChange={setMethod} placeholder="cth. QRIS, Tunai" testID="input-method" />
        </Field>
        <Field label="Catatan">
          <TextInputRow value={note} onChange={setNote} placeholder="Opsional" testID="input-note" multiline />
        </Field>
        <Field label="Tag (pisahkan dengan koma)">
          <TextInputRow value={tags} onChange={setTags} placeholder="cth. jajan, weekly" testID="input-tags" />
        </Field>

        {isEdit ? (
          <Button label="Hapus Transaksi" variant="danger" icon="trash-can" onPress={remove} testID="btn-delete" style={{ marginTop: spacing.lg }} />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const p = usePalette();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: p.onSurfaceTertiary, fontSize: 12, fontWeight: "600" }}>{label}</Text>
      {children}
    </View>
  );
}

function TextInputRow({ value, onChange, placeholder, testID, multiline }: { value: string; onChange: (v: string) => void; placeholder: string; testID?: string; multiline?: boolean }) {
  const p = usePalette();
  return (
    <TextInput
      testID={testID}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={p.onSurfaceTertiary}
      multiline={multiline}
      style={{
        backgroundColor: p.surfaceSecondary, color: p.onSurface,
        borderWidth: 1, borderColor: p.border, borderRadius: radius.md,
        paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 14,
        minHeight: multiline ? 60 : undefined,
      }}
    />
  );
}

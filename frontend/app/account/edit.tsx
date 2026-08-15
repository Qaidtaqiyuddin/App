import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePalette, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { Account, AccountType } from "@/src/types";
import { FormField, TextField, OptionRow, ColorPicker } from "@/src/form";
import { Button } from "@/src/ui";

const TYPE_LABELS = { bank: "Bank", cash: "Tunai", ewallet: "E-Wallet", credit_card: "Kartu Kredit", savings: "Tabungan", investment: "Investasi" };

export default function AccountEdit() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!params.id;
  const [loading, setLoading] = useState(isEdit);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [initial, setInitial] = useState("0");
  const [masked, setMasked] = useState("");
  const [color, setColor] = useState("#4A7C59");
  const [active, setActive] = useState(true);
  const [existing, setExisting] = useState<Account | null>(null);

  const load = useCallback(async () => {
    if (!params.id) return;
    const all = await api.get<Account[]>("/accounts");
    const a = all.find((x) => x.id === params.id);
    if (a) {
      setExisting(a); setName(a.name); setType(a.type); setInitial(String(a.initial_balance));
      setMasked(a.masked_number || ""); setColor(a.color); setActive(a.active);
    }
    setLoading(false);
  }, [params.id]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!name.trim()) return;
    const payload: any = {
      id: existing?.id, name: name.trim(), type,
      initial_balance: parseFloat(initial.replace(/[^0-9.-]/g, "")) || 0,
      current_balance: existing?.current_balance ?? (parseFloat(initial) || 0),
      masked_number: masked || null, color, icon: type, active,
    };
    if (isEdit && existing) await api.put(`/accounts/${existing.id}`, payload);
    else await api.post("/accounts", payload);
    router.back();
  };
  const remove = async () => { if (existing) { await api.del(`/accounts/${existing.id}`); router.back(); } };

  if (loading) return <View style={{ flex: 1, backgroundColor: p.surface, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={p.brandPrimary} /></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: p.surface }}>
      <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: p.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable testID="btn-close" onPress={() => router.back()}><MaterialCommunityIcons name="close" size={24} color={p.onSurface} /></Pressable>
        <Text style={{ color: p.onSurface, fontWeight: "700", fontSize: 16 }}>{isEdit ? "Edit Akun" : "Akun Baru"}</Text>
        <Pressable testID="btn-save" onPress={save}><Text style={{ color: p.brandPrimary, fontWeight: "700" }}>Simpan</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60, gap: spacing.md }}>
        <FormField label="Nama Akun"><TextField value={name} onChange={setName} placeholder="cth. BCA Utama" testID="input-name" /></FormField>
        <FormField label="Jenis"><OptionRow options={["bank","cash","ewallet","credit_card","savings","investment"] as AccountType[]} value={type} onChange={setType} labels={TYPE_LABELS} /></FormField>
        <FormField label="Saldo Awal"><TextField value={initial} onChange={(v) => setInitial(v.replace(/[^0-9-]/g, ""))} keyboardType="numeric" testID="input-initial" /></FormField>
        <FormField label="Nomor Rekening (sebagian, cth. **** 3421)"><TextField value={masked} onChange={setMasked} placeholder="**** 0000" testID="input-masked" /></FormField>
        <FormField label="Warna"><ColorPicker value={color} onChange={setColor} /></FormField>
        <Pressable testID="toggle-active" onPress={() => setActive(!active)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm }}>
          <Text style={{ color: p.onSurface, fontWeight: "600" }}>Status Aktif</Text>
          <MaterialCommunityIcons name={active ? "toggle-switch" : "toggle-switch-off-outline"} size={40} color={active ? p.brandPrimary : p.onSurfaceTertiary} />
        </Pressable>
        {isEdit ? <Button label="Hapus Akun" variant="danger" icon="trash-can" onPress={remove} testID="btn-delete" style={{ marginTop: spacing.md }} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

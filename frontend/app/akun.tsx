import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { usePalette, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";
import { Account } from "@/src/types";
import { formatIDR } from "@/src/format";
import { Card, EmptyState, IconTile } from "@/src/ui";
import { ScreenHeader } from "@/src/screen-header";

const TYPE_LABEL: Record<string, string> = { bank: "Bank", cash: "Tunai", ewallet: "E-Wallet", credit_card: "Kartu Kredit", savings: "Tabungan", investment: "Investasi" };
const TYPE_ICON: Record<string, any> = { bank: "bank", cash: "wallet", ewallet: "cellphone", credit_card: "credit-card", savings: "piggy-bank", investment: "chart-line" };

export default function AkunScreen() {
  const p = usePalette();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setAccounts(await api.get<Account[]>("/accounts")); } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const total = accounts.filter((a) => a.active).reduce((s, a) => s + a.current_balance, 0);

  return (
    <View style={{ flex: 1, backgroundColor: p.surface }}>
      <ScreenHeader title="Akun & Dompet" onAdd={() => router.push("/account/edit")} addTestID="btn-add-account" />
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={p.brandPrimary} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40, gap: spacing.md }}>
          <Card testID="acc-total">
            <Text style={{ color: p.onSurfaceTertiary, fontSize: 12 }}>Total saldo aktif</Text>
            <Text style={{ color: p.onSurface, fontSize: 26, fontWeight: "800", marginTop: 4 }}>{formatIDR(total)}</Text>
          </Card>
          {accounts.length === 0 ? (
            <EmptyState icon="wallet" title="Belum ada akun" cta="Tambah Akun" onPress={() => router.push("/account/edit")} testID="empty-acc" />
          ) : accounts.map((a) => (
            <Pressable key={a.id} testID={`account-${a.id}`} onPress={() => router.push({ pathname: "/account/edit", params: { id: a.id } })}>
              <Card style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, opacity: a.active ? 1 : 0.5 }}>
                <IconTile name={TYPE_ICON[a.type]} color={a.color} bg={a.color + "22"} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: p.onSurface, fontWeight: "700" }}>{a.name}</Text>
                  <Text style={{ color: p.onSurfaceTertiary, fontSize: 12 }}>{TYPE_LABEL[a.type]}{a.masked_number ? ` · ${a.masked_number}` : ""}{a.active ? "" : " · Nonaktif"}</Text>
                </View>
                <Text style={{ color: a.current_balance < 0 ? p.error : p.onSurface, fontWeight: "800" }}>{formatIDR(a.current_balance)}</Text>
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

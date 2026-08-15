import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { usePalette, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { DebtCredit } from "@/src/types";
import { formatIDR, formatDateID, relativeDayID } from "@/src/format";
import { Card, EmptyState, IconTile, ProgressBar, Chip, SectionHeader } from "@/src/ui";
import { ScreenHeader } from "@/src/screen-header";

const TYPE_LABEL: Record<string, string> = { debt: "Utang", credit: "Piutang", loan: "Pinjaman", cashbon: "Kas Bon", installment: "Cicilan" };

export default function UtangScreen() {
  const p = usePalette();
  const router = useRouter();
  const [items, setItems] = useState<DebtCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "debt" | "credit">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await api.get<DebtCredit[]>("/debts")); } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isDebtType = (t: string) => t === "debt" || t === "loan";
  const filtered = items.filter((i) => tab === "all" ? true : tab === "debt" ? isDebtType(i.type) : !isDebtType(i.type));
  const totalDebt = items.filter((i) => i.status === "active" && isDebtType(i.type)).reduce((s, i) => s + (i.remaining || 0), 0);
  const totalCredit = items.filter((i) => i.status === "active" && !isDebtType(i.type)).reduce((s, i) => s + (i.remaining || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: p.surface }}>
      <ScreenHeader title="Utang & Piutang" onAdd={() => router.push("/debt/edit")} addTestID="btn-add-debt" />
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={p.brandPrimary} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40, gap: spacing.md }}>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <Card style={{ flex: 1 }} testID="total-debt"><Text style={{ color: p.onSurfaceTertiary, fontSize: 12 }}>Total Utang</Text><Text style={{ color: p.error, fontSize: 18, fontWeight: "800", marginTop: 4 }}>{formatIDR(totalDebt, { compact: true })}</Text></Card>
            <Card style={{ flex: 1 }} testID="total-credit"><Text style={{ color: p.onSurfaceTertiary, fontSize: 12 }}>Total Piutang</Text><Text style={{ color: p.success, fontSize: 18, fontWeight: "800", marginTop: 4 }}>{formatIDR(totalCredit, { compact: true })}</Text></Card>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Chip label="Semua" active={tab === "all"} onPress={() => setTab("all")} testID="chip-all" />
            <Chip label="Utang" active={tab === "debt"} onPress={() => setTab("debt")} testID="chip-debt" />
            <Chip label="Piutang" active={tab === "credit"} onPress={() => setTab("credit")} testID="chip-credit" />
          </View>
          {filtered.length === 0 ? (
            <EmptyState icon="hand-heart" title="Belum ada catatan" cta="Tambah" onPress={() => router.push("/debt/edit")} testID="empty-debt" />
          ) : filtered.map((d) => {
            const isDebt = isDebtType(d.type);
            const paid = d.paid_amount || 0;
            return (
              <Pressable key={d.id} testID={`debt-${d.id}`} onPress={() => router.push({ pathname: "/debt/edit", params: { id: d.id } })}>
                <Card>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                    <IconTile name={isDebt ? "arrow-up-bold-circle" : "arrow-down-bold-circle"} color={isDebt ? p.error : p.success} bg={(isDebt ? p.error : p.success) + "22"} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: p.onSurface, fontWeight: "700" }}>{d.party_name}</Text>
                      <Text style={{ color: p.onSurfaceTertiary, fontSize: 12 }}>{TYPE_LABEL[d.type]}{d.due_date ? ` · Tempo ${relativeDayID(d.due_date)}` : ""}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: d.status === "paid" ? p.success : p.onSurface, fontWeight: "800" }}>{formatIDR(d.remaining || 0, { compact: true })}</Text>
                      <Text style={{ color: p.onSurfaceTertiary, fontSize: 10 }}>{d.status === "paid" ? "Lunas" : "sisa"}</Text>
                    </View>
                  </View>
                  <View style={{ marginTop: spacing.md }}>
                    <ProgressBar value={paid} max={d.initial_amount} color={isDebt ? p.error : p.success} />
                    <Text style={{ color: p.onSurfaceTertiary, fontSize: 11, marginTop: 4 }}>Terbayar {formatIDR(paid, { compact: true })} dari {formatIDR(d.initial_amount, { compact: true })}</Text>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

import React, { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePalette, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";
import { Category, Transaction, SavingsGoal } from "@/src/types";
import { formatIDR } from "@/src/format";
import { Card, IconTile, ProgressBar, SectionHeader, Chip } from "@/src/ui";

type Tab = "laporan" | "tabungan" | "kekayaan";

export default function LaporanScreen() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("laporan");
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [net, setNet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, c, s, n] = await Promise.all([
        api.get<Transaction[]>("/transactions"),
        api.get<Category[]>("/categories"),
        api.get<SavingsGoal[]>("/savings"),
        api.get<any>("/reports/net-worth"),
      ]);
      setTxns(t); setCats(c); setSavings(s); setNet(n);
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const catMap = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c])), [cats]);

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthTxns = txns.filter((t) => t.date.startsWith(monthPrefix));

  const expenseByCat = useMemo(() => {
    const map: Record<string, number> = {};
    monthTxns.filter((t) => t.type === "expense").forEach((t) => {
      const k = t.category_id || "_none";
      map[k] = (map[k] || 0) + t.amount;
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [monthTxns]);

  const totalExpense = expenseByCat.reduce((s, [, v]) => s + v, 0);

  const monthBars = useMemo(() => {
    const bars: { label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const m = txns.filter((t) => t.date.startsWith(prefix));
      bars.push({
        label: ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][d.getMonth()],
        income: m.filter((t) => t.type === "income" || t.type === "refund").reduce((s, t) => s + t.amount, 0),
        expense: m.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      });
    }
    return bars;
  }, [txns]);

  const maxBar = Math.max(1, ...monthBars.flatMap((b) => [b.income, b.expense]));

  return (
    <View style={{ flex: 1, backgroundColor: p.surface }}>
      <View style={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: p.border }}>
        <Text style={{ color: p.onSurface, fontSize: 22, fontWeight: "800", marginBottom: spacing.md }}>Laporan</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          <Chip label="Laporan" active={tab === "laporan"} onPress={() => setTab("laporan")} testID="chip-laporan" />
          <Chip label="Tabungan" active={tab === "tabungan"} onPress={() => setTab("tabungan")} testID="chip-tabungan" />
          <Chip label="Kekayaan" active={tab === "kekayaan"} onPress={() => setTab("kekayaan")} testID="chip-kekayaan" />
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={p.brandPrimary} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40, gap: spacing.md }}>
          {tab === "laporan" ? (
            <>
              <SectionHeader title="Perbandingan 6 Bulan" />
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", height: 160 }}>
                  {monthBars.map((b, i) => (
                    <View key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                      <View style={{ flexDirection: "row", gap: 3, alignItems: "flex-end", height: 130 }}>
                        <View style={{ width: 10, height: Math.max(3, (b.income / maxBar) * 130), backgroundColor: p.brandPrimary, borderRadius: 3 }} />
                        <View style={{ width: 10, height: Math.max(3, (b.expense / maxBar) * 130), backgroundColor: p.error, borderRadius: 3 }} />
                      </View>
                      <Text style={{ color: p.onSurfaceTertiary, fontSize: 10 }}>{b.label}</Text>
                    </View>
                  ))}
                </View>
              </Card>

              <SectionHeader title="Pengeluaran per Kategori (Bulan Ini)" />
              {expenseByCat.length === 0 ? (
                <Card><Text style={{ color: p.onSurfaceTertiary, textAlign: "center" }}>Belum ada pengeluaran bulan ini</Text></Card>
              ) : (
                <Card>
                  {expenseByCat.map(([cid, amt], i) => {
                    const c = catMap[cid];
                    const pct = totalExpense > 0 ? amt / totalExpense : 0;
                    return (
                      <View key={cid} style={{ marginTop: i === 0 ? 0 : spacing.md }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: 6 }}>
                          <IconTile name={(c?.icon as any) || "tag"} color={c?.color || p.brandPrimary} bg={p.brandTertiary} />
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                              <Text style={{ color: p.onSurface, fontWeight: "600" }}>{c?.name || "Lainnya"}</Text>
                              <Text style={{ color: p.onSurface, fontWeight: "700" }}>{formatIDR(amt, { compact: true })}</Text>
                            </View>
                            <Text style={{ color: p.onSurfaceTertiary, fontSize: 11 }}>{(pct * 100).toFixed(1)}%</Text>
                          </View>
                        </View>
                        <ProgressBar value={amt} max={totalExpense} color={c?.color || p.brandPrimary} />
                      </View>
                    );
                  })}
                </Card>
              )}
            </>
          ) : tab === "tabungan" ? (
            <>
              <SectionHeader title="Target Tabungan" />
              {savings.length === 0 ? (
                <Card><Text style={{ color: p.onSurfaceTertiary, textAlign: "center" }}>Belum ada target</Text></Card>
              ) : (
                savings.map((s) => {
                  const pct = s.target_amount > 0 ? s.current_amount / s.target_amount : 0;
                  return (
                    <Card key={s.id}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                        <Text style={{ color: p.onSurface, fontWeight: "700" }}>{s.name}</Text>
                        <Text style={{ color: p.brandPrimary, fontWeight: "700" }}>{(pct * 100).toFixed(0)}%</Text>
                      </View>
                      <Text style={{ color: p.onSurfaceTertiary, fontSize: 12, marginBottom: spacing.sm }}>
                        {formatIDR(s.current_amount)} / {formatIDR(s.target_amount)}
                      </Text>
                      <ProgressBar value={s.current_amount} max={s.target_amount} />
                    </Card>
                  );
                })
              )}
            </>
          ) : (
            <>
              <SectionHeader title="Kekayaan Bersih" />
              <Card>
                <Text style={{ color: p.onSurfaceTertiary, fontSize: 12 }}>Total kekayaan bersih</Text>
                <Text style={{ color: p.onSurface, fontSize: 30, fontWeight: "800", marginTop: 4 }}>{formatIDR(net?.net_worth || 0)}</Text>
                <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                  <NetRow label="Aset Likuid" value={net?.liquid || 0} color={p.brandPrimary} />
                  <NetRow label="Tabungan" value={net?.savings || 0} color={p.brandSecondary} />
                  <NetRow label="Investasi" value={net?.investments || 0} color={p.warning} />
                  <NetRow label="Piutang" value={net?.receivables || 0} color={p.success} />
                  <View style={{ height: 1, backgroundColor: p.divider, marginVertical: spacing.sm }} />
                  <NetRow label="Total Aset" value={net?.assets || 0} bold />
                  <NetRow label="Utang" value={-(net?.debts || 0)} color={p.error} />
                  <NetRow label="Utang Kartu Kredit" value={-(net?.credit_card_debt || 0)} color={p.error} />
                  <View style={{ height: 1, backgroundColor: p.divider, marginVertical: spacing.sm }} />
                  <NetRow label="Total Liabilitas" value={-(net?.liabilities || 0)} bold />
                </View>
              </Card>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function NetRow({ label, value, color, bold }: { label: string; value: number; color?: string; bold?: boolean }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ color: p.onSurface, fontWeight: bold ? "700" : "500" }}>{label}</Text>
      <Text style={{ color: color || p.onSurface, fontWeight: bold ? "800" : "600" }}>{formatIDR(value)}</Text>
    </View>
  );
}

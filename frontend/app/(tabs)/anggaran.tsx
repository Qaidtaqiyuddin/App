import React, { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePalette, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";
import { Budget, Category, Transaction } from "@/src/types";
import { formatIDR, monthYearID } from "@/src/format";
import { Card, EmptyState, IconTile, ProgressBar, Button, SectionHeader } from "@/src/ui";

export default function AnggaranScreen() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [month] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, c, t] = await Promise.all([
        api.get<Budget[]>(`/budgets?month=${month}&year=${year}`),
        api.get<Category[]>("/categories"),
        api.get<Transaction[]>(`/transactions?date_from=${year}-${String(month).padStart(2, "0")}-01&date_to=${year}-${String(month).padStart(2, "0")}-31`),
      ]);
      setBudgets(b); setCats(c); setTxns(t);
    } finally { setLoading(false); }
  }, [month, year]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const catMap = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c])), [cats]);
  const spendByCat = useMemo(() => {
    const map: Record<string, number> = {};
    txns.filter((t) => t.type === "expense").forEach((t) => {
      const k = t.category_id || "_none";
      map[k] = (map[k] || 0) + t.amount;
    });
    return map;
  }, [txns]);

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = Object.values(spendByCat).reduce((s, v) => s + v, 0);

  const copyPrev = async () => {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    await api.post(`/budgets/copy?from_month=${prevMonth}&from_year=${prevYear}&to_month=${month}&to_year=${year}`);
    load();
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.surface }}>
      <View style={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: p.border }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ color: p.onSurface, fontSize: 22, fontWeight: "800" }}>Anggaran</Text>
            <Text style={{ color: p.onSurfaceTertiary, fontSize: 12 }}>{monthYearID(year, month)}</Text>
          </View>
          <Pressable testID="btn-add-budget" onPress={() => router.push("/budget/edit")} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: p.brandPrimary, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="plus" size={22} color={p.onBrandPrimary} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={p.brandPrimary} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40, gap: spacing.md }}>
          {/* Total Overview */}
          <Card testID="budget-total">
            <Text style={{ color: p.onSurfaceTertiary, fontSize: 12 }}>Total anggaran bulan ini</Text>
            <Text style={{ color: p.onSurface, fontSize: 26, fontWeight: "800", marginTop: 4 }}>{formatIDR(totalBudget)}</Text>
            <View style={{ marginTop: spacing.md }}>
              <ProgressBar value={totalSpent} max={totalBudget || 1} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                <Text style={{ color: p.onSurfaceTertiary, fontSize: 12 }}>Terpakai {formatIDR(totalSpent)}</Text>
                <Text style={{ color: p.onSurface, fontSize: 12, fontWeight: "600" }}>Sisa {formatIDR(Math.max(0, totalBudget - totalSpent))}</Text>
              </View>
            </View>
          </Card>

          {budgets.length === 0 ? (
            <Card>
              <EmptyState icon="chart-donut" title="Belum ada anggaran" subtitle="Buat anggaran bulanan untuk memantau pengeluaran Anda" cta="Buat Anggaran" onPress={() => router.push("/budget/edit")} testID="empty-budgets" />
              <View style={{ marginTop: spacing.md }}>
                <Button label="Salin dari bulan lalu" variant="secondary" icon="content-copy" onPress={copyPrev} testID="btn-copy-prev" />
              </View>
            </Card>
          ) : (
            <>
              <SectionHeader title="Per Kategori" />
              {budgets.map((b) => {
                const c = b.category_id ? catMap[b.category_id] : null;
                const spent = b.category_id ? (spendByCat[b.category_id] || 0) : totalSpent;
                const pct = b.amount > 0 ? spent / b.amount : 0;
                const status = pct >= 1 ? "Melebihi" : pct >= 0.8 ? "Mendekati batas" : "Aman";
                const statusColor = pct >= 1 ? p.error : pct >= 0.8 ? p.warning : p.brandPrimary;
                return (
                  <Pressable key={b.id} testID={`budget-item-${b.id}`} onPress={() => router.push({ pathname: "/budget/edit", params: { id: b.id } })}>
                    <Card>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                        <IconTile name={(c?.icon as any) || "chart-donut"} color={c?.color || p.brandPrimary} bg={p.brandTertiary} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={{ color: p.onSurface, fontWeight: "700" }}>{c?.name || "Total"}</Text>
                            <Text style={{ color: statusColor, fontSize: 11, fontWeight: "700" }}>{status}</Text>
                          </View>
                          <Text style={{ color: p.onSurfaceTertiary, fontSize: 12, marginTop: 2 }}>
                            {formatIDR(spent, { compact: true })} / {formatIDR(b.amount, { compact: true })}
                          </Text>
                        </View>
                      </View>
                      <View style={{ marginTop: spacing.md }}>
                        <ProgressBar value={spent} max={b.amount} />
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
              <Button label="Salin dari bulan lalu" variant="secondary" icon="content-copy" onPress={copyPrev} testID="btn-copy-prev-2" />
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

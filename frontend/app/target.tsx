import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { usePalette, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { SavingsGoal } from "@/src/types";
import { formatIDR, formatDateID } from "@/src/format";
import { Card, EmptyState, ProgressBar } from "@/src/ui";
import { ScreenHeader } from "@/src/screen-header";

export default function TargetScreen() {
  const p = usePalette();
  const router = useRouter();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setGoals(await api.get<SavingsGoal[]>("/savings")); } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const estimate = (g: SavingsGoal): string => {
    const remaining = g.target_amount - g.current_amount;
    if (remaining <= 0) return "Tercapai";
    if (g.periodic_deposit && g.periodic_deposit > 0) {
      const months = Math.ceil(remaining / g.periodic_deposit);
      return `± ${months} bulan lagi`;
    }
    return g.target_date ? `Target: ${formatDateID(g.target_date)}` : "";
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.surface }}>
      <ScreenHeader title="Target Tabungan" onAdd={() => router.push("/savings/edit")} addTestID="btn-add-savings" />
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={p.brandPrimary} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40, gap: spacing.md }}>
          {goals.length === 0 ? (
            <EmptyState icon="piggy-bank" title="Belum ada target" cta="Buat Target" onPress={() => router.push("/savings/edit")} testID="empty-savings" />
          ) : goals.map((g) => {
            const pct = g.target_amount > 0 ? g.current_amount / g.target_amount : 0;
            return (
              <Pressable key={g.id} testID={`savings-${g.id}`} onPress={() => router.push({ pathname: "/savings/edit", params: { id: g.id } })}>
                <Card>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <Text style={{ color: p.onSurface, fontWeight: "700", fontSize: 15 }}>{g.name}</Text>
                    <Text style={{ color: p.brandPrimary, fontWeight: "800" }}>{(pct * 100).toFixed(0)}%</Text>
                  </View>
                  <Text style={{ color: p.onSurfaceTertiary, fontSize: 12, marginBottom: spacing.sm }}>{formatIDR(g.current_amount)} / {formatIDR(g.target_amount)}</Text>
                  <ProgressBar value={g.current_amount} max={g.target_amount} color={p.brandPrimary} />
                  <Text style={{ color: p.onSurfaceTertiary, fontSize: 11, marginTop: 6 }}>{estimate(g)}</Text>
                </Card>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

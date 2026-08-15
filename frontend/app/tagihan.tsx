import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePalette, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";
import { Bill } from "@/src/types";
import { formatIDR, relativeDayID, formatDateID, parseDate, todayJakarta } from "@/src/format";
import { Card, EmptyState, IconTile, SectionHeader } from "@/src/ui";
import { ScreenHeader } from "@/src/screen-header";

export default function TagihanScreen() {
  const p = usePalette();
  const router = useRouter();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setBills(await api.get<Bill[]>("/bills")); } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const togglePaid = async (b: Bill) => { await api.put(`/bills/${b.id}`, { ...b, is_paid: !b.is_paid }); load(); };

  const unpaid = bills.filter((b) => !b.is_paid);
  // 30-day cashflow forecast
  const today = new Date(todayJakarta());
  const in30 = unpaid.filter((b) => { const d = parseDate(b.due_date); const diff = (d.getTime() - today.getTime()) / 86400000; return diff >= 0 && diff <= 30; });
  const forecast30 = in30.reduce((s, b) => s + b.amount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: p.surface }}>
      <ScreenHeader title="Tagihan & Berulang" onAdd={() => router.push("/bill/edit")} addTestID="btn-add-bill" />
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={p.brandPrimary} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40, gap: spacing.md }}>
          <Card testID="cashflow-forecast" style={{ backgroundColor: p.brandTertiary, borderColor: p.brandSecondary }}>
            <Text style={{ color: p.onBrandTertiary, fontSize: 12 }}>Perkiraan arus kas keluar 30 hari</Text>
            <Text style={{ color: p.onBrandTertiary, fontSize: 24, fontWeight: "800", marginTop: 4 }}>{formatIDR(forecast30)}</Text>
            <Text style={{ color: p.onBrandTertiary, fontSize: 12, marginTop: 2 }}>{in30.length} tagihan belum dibayar</Text>
          </Card>

          {bills.length === 0 ? (
            <EmptyState icon="calendar-clock" title="Belum ada tagihan" cta="Tambah Tagihan" onPress={() => router.push("/bill/edit")} testID="empty-bills" />
          ) : (
            <>
              <SectionHeader title="Semua Tagihan" />
              {bills.map((b) => (
                <Card key={b.id} testID={`bill-${b.id}`} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                  <Pressable testID={`bill-toggle-${b.id}`} onPress={() => togglePaid(b)}>
                    <MaterialCommunityIcons name={b.is_paid ? "check-circle" : "circle-outline"} size={28} color={b.is_paid ? p.success : p.onSurfaceTertiary} />
                  </Pressable>
                  <Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: "/bill/edit", params: { id: b.id } })}>
                    <Text style={{ color: p.onSurface, fontWeight: "700", textDecorationLine: b.is_paid ? "line-through" : "none" }}>{b.name}</Text>
                    <Text style={{ color: b.is_paid ? p.onSurfaceTertiary : p.warning, fontSize: 12 }}>{b.is_paid ? "Sudah dibayar" : relativeDayID(b.due_date)} · {formatDateID(b.due_date)}</Text>
                  </Pressable>
                  <Text style={{ color: p.onSurface, fontWeight: "800" }}>{formatIDR(b.amount, { compact: true })}</Text>
                </Card>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

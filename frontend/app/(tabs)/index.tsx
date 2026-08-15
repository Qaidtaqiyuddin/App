import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { usePalette, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";
import { Account, DashboardData } from "@/src/types";
import { formatIDR, formatDateID, relativeDayID } from "@/src/format";
import { Card, EmptyState, IconTile, SectionHeader } from "@/src/ui";

export default function BerandaScreen() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  const load = useCallback(async () => {
    try {
      await api.post("/seed").catch(() => {});
      const d = await api.get<DashboardData>("/dashboard");
      setData(d);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <View testID="beranda-loading" style={{ flex: 1, backgroundColor: p.surface, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={p.brandPrimary} size="large" />
      </View>
    );
  }
  if (!data) return null;

  const health = data.expense === 0 ? "Belum ada pengeluaran bulan ini" : data.income >= data.expense ? "Kondisi keuangan sehat" : "Pengeluaran melebihi pemasukan";
  const healthColor = data.income >= data.expense ? p.success : p.warning;

  const maxChart = Math.max(1, ...data.chart_6m.flatMap((c) => [c.income, c.expense]));

  return (
    <ScrollView
      testID="beranda-scroll"
      style={{ flex: 1, backgroundColor: p.surface }}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={p.brandPrimary} />}
    >
      <View style={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
          <View>
            <Text style={{ color: p.onSurfaceTertiary, fontSize: 12 }}>Selamat datang di</Text>
            <Text testID="app-title" style={{ color: p.onSurface, fontSize: 22, fontWeight: "800" }}>LifeDesk</Text>
          </View>
          <Pressable testID="btn-search" onPress={() => router.push("/lainnya")} style={{ padding: spacing.sm }}>
            <MaterialCommunityIcons name="magnify" size={22} color={p.onSurface} />
          </Pressable>
        </View>

        {/* Hero Balance Card */}
        <View testID="hero-balance" style={{ borderRadius: radius.lg, overflow: "hidden" }}>
          <LinearGradient colors={[p.brandPrimary, "#2F4F38"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: spacing.xl, gap: spacing.md }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>Saldo Total Semua Akun</Text>
              <Pressable testID="btn-toggle-balance" onPress={() => setShowBalance(!showBalance)}>
                <MaterialCommunityIcons name={showBalance ? "eye-outline" : "eye-off-outline"} size={20} color="#fff" />
              </Pressable>
            </View>
            <Text testID="total-balance-text" style={{ color: "#fff", fontSize: 30, fontWeight: "800" }}>
              {showBalance ? formatIDR(data.total_balance) : "Rp ••••••"}
            </Text>
            {data.primary_account ? (
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
                Akun utama: {data.primary_account.name} · {formatIDR(data.primary_account.current_balance)}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
              <QuickAction icon="arrow-down-bold" label="Pemasukan" onPress={() => router.push({ pathname: "/transaction/new", params: { type: "income" } })} testID="qa-income" />
              <QuickAction icon="arrow-up-bold" label="Pengeluaran" onPress={() => router.push({ pathname: "/transaction/new", params: { type: "expense" } })} testID="qa-expense" />
              <QuickAction icon="swap-horizontal" label="Transfer" onPress={() => router.push({ pathname: "/transaction/new", params: { type: "transfer" } })} testID="qa-transfer" />
            </View>
          </LinearGradient>
        </View>

        {/* Monthly Summary */}
        <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
          <SummaryTile label="Pemasukan" amount={data.income} color={p.success} icon="arrow-down-bold" testID="tile-income" />
          <SummaryTile label="Pengeluaran" amount={data.expense} color={p.error} icon="arrow-up-bold" testID="tile-expense" />
        </View>
        <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md }}>
          <SummaryTile label="Sisa Anggaran" amount={data.remaining_budget} color={data.remaining_budget < 0 ? p.error : p.brandPrimary} icon="chart-donut" testID="tile-budget" />
          <SummaryTile label="Utang - Piutang" amount={data.total_credit - data.total_debt} color={p.info} icon="hand-heart" testID="tile-net-debt" />
        </View>

        {/* Health */}
        <Card style={{ marginTop: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.md }} testID="health-card">
          <IconTile name="heart-pulse" color={healthColor} bg={data.income >= data.expense ? p.brandTertiary : "#FFE9D6"} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: p.onSurface, fontWeight: "700", fontSize: 14 }}>{health}</Text>
            <Text style={{ color: p.onSurfaceTertiary, fontSize: 12, marginTop: 2 }}>
              Selisih {formatIDR(Math.abs(data.income - data.expense))} bulan ini
            </Text>
          </View>
        </Card>

        {/* Chart 6 months */}
        <SectionHeader title="Arus Kas 6 Bulan" testID="section-chart" />
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", height: 140 }}>
            {data.chart_6m.map((c, i) => {
              const [y, m] = c.label.split("-");
              const monthShort = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][Number(m) - 1];
              return (
                <View key={i} style={{ alignItems: "center", gap: 4, flex: 1 }}>
                  <View style={{ flexDirection: "row", gap: 3, alignItems: "flex-end", height: 100 }}>
                    <View style={{ width: 8, height: Math.max(3, (c.income / maxChart) * 100), backgroundColor: p.brandPrimary, borderRadius: 3 }} />
                    <View style={{ width: 8, height: Math.max(3, (c.expense / maxChart) * 100), backgroundColor: p.error, borderRadius: 3 }} />
                  </View>
                  <Text style={{ color: p.onSurfaceTertiary, fontSize: 10 }}>{monthShort}</Text>
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: spacing.lg, marginTop: spacing.md }}>
            <LegendDot color={p.brandPrimary} label="Pemasukan" />
            <LegendDot color={p.error} label="Pengeluaran" />
          </View>
        </Card>

        {/* Upcoming Bills */}
        {data.upcoming_bills.length > 0 ? (
          <>
            <SectionHeader title="Tagihan Terdekat" action="Lihat semua" onActionPress={() => router.push("/tagihan")} testID="section-bills" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.lg }}>
              {data.upcoming_bills.slice(0, 5).map((b) => (
                <View key={b.id} testID={`bill-card-${b.id}`} style={{ width: 200, backgroundColor: p.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: p.border, gap: 4 }}>
                  <Text style={{ color: p.onSurfaceTertiary, fontSize: 11 }}>{relativeDayID(b.due_date)}</Text>
                  <Text style={{ color: p.onSurface, fontWeight: "700", fontSize: 14 }} numberOfLines={1}>{b.name}</Text>
                  <Text style={{ color: p.error, fontWeight: "700", fontSize: 15 }}>{formatIDR(b.amount)}</Text>
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* Top Expenses */}
        {data.top_expenses.length > 0 ? (
          <>
            <SectionHeader title="Pengeluaran Terbesar Bulan Ini" testID="section-top-expenses" />
            <Card>
              {data.top_expenses.slice(0, 3).map((t, i) => (
                <View key={t.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: p.divider }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: p.onSurface, fontWeight: "600" }} numberOfLines={1}>{t.payee || t.note || "Pengeluaran"}</Text>
                    <Text style={{ color: p.onSurfaceTertiary, fontSize: 12 }}>{formatDateID(t.date)}</Text>
                  </View>
                  <Text style={{ color: p.onSurface, fontWeight: "700" }}>{formatIDR(t.amount)}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {/* Recent Transactions */}
        <SectionHeader title="Transaksi Terakhir" action="Semua" onActionPress={() => router.push("/transaksi")} testID="section-recent" />
        {data.recent_transactions.length === 0 ? (
          <Card>
            <EmptyState icon="tray" title="Belum ada transaksi" subtitle="Mulai catat pemasukan atau pengeluaran pertama Anda" cta="Tambah Transaksi" onPress={() => router.push("/transaction/new")} testID="empty-recent" />
          </Card>
        ) : (
          <Card>
            {data.recent_transactions.slice(0, 6).map((t, i) => (
              <TransactionRow key={t.id} t={t} first={i === 0} onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: t.id } })} />
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

function QuickAction({ icon, label, onPress, testID }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.18)", padding: spacing.md, borderRadius: radius.md, alignItems: "center", gap: 4 }}>
      <MaterialCommunityIcons name={icon} size={20} color="#fff" />
      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

function SummaryTile({ label, amount, color, icon, testID }: { label: string; amount: number; color: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; testID?: string }) {
  const p = usePalette();
  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: p.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: p.border, gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <MaterialCommunityIcons name={icon} size={14} color={color} />
        <Text style={{ color: p.onSurfaceTertiary, fontSize: 11 }}>{label}</Text>
      </View>
      <Text style={{ color: p.onSurface, fontSize: 16, fontWeight: "800" }} numberOfLines={1}>{formatIDR(amount, { compact: true })}</Text>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color: p.onSurfaceTertiary, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

export function TransactionRow({ t, first, onPress, categoryName, accountName }: { t: any; first?: boolean; onPress?: () => void; categoryName?: string; accountName?: string }) {
  const p = usePalette();
  const isIncome = t.type === "income" || t.type === "refund";
  const isTransfer = t.type === "transfer";
  const amountColor = isIncome ? p.success : p.onSurface;
  const icon = isIncome ? "arrow-down-bold" : isTransfer ? "swap-horizontal" : t.type === "adjustment" ? "tune" : "arrow-up-bold";
  const bg = isIncome ? p.brandTertiary : isTransfer ? p.surfaceTertiary : "#FFE9D6";
  const iconColor = isIncome ? p.brandPrimary : isTransfer ? p.info : "#FF6B35";
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, gap: spacing.md, borderTopWidth: first ? 0 : 1, borderTopColor: p.divider }}>
      <IconTile name={icon as any} color={iconColor} bg={bg} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: p.onSurface, fontWeight: "600" }} numberOfLines={1}>{t.payee || t.note || (isTransfer ? "Transfer" : categoryName || "Transaksi")}</Text>
        <Text style={{ color: p.onSurfaceTertiary, fontSize: 12 }} numberOfLines={1}>
          {formatDateID(t.date)}{accountName ? ` · ${accountName}` : ""}
        </Text>
      </View>
      <Text style={{ color: amountColor, fontWeight: "700" }}>{isIncome ? "+" : isTransfer ? "" : "-"}{formatIDR(t.amount).replace("Rp ", "Rp ")}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({});

import React, { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, TextInput, FlatList } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePalette, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";
import { Transaction, Category, Account } from "@/src/types";
import { formatIDR, formatDateID } from "@/src/format";
import { Card, EmptyState, IconTile, Chip } from "@/src/ui";
import { TransactionRow } from "./index";

type Filter = "all" | "income" | "expense" | "transfer";

export default function TransaksiScreen() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [accs, setAccs] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, c, a] = await Promise.all([
        api.get<Transaction[]>("/transactions"),
        api.get<Category[]>("/categories"),
        api.get<Account[]>("/accounts"),
      ]);
      setTxns(t); setCats(c); setAccs(a);
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const catMap = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c])), [cats]);
  const accMap = useMemo(() => Object.fromEntries(accs.map((a) => [a.id, a])), [accs]);

  const filtered = useMemo(() => {
    return txns.filter((t) => {
      if (filter !== "all" && t.type !== filter) {
        if (!(filter === "income" && t.type === "refund")) return false;
      }
      if (q) {
        const s = q.toLowerCase();
        const hay = `${t.note || ""} ${t.payee || ""} ${catMap[t.category_id || ""]?.name || ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [txns, filter, q, catMap]);

  const grouped = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    filtered.forEach((t) => { (map[t.date] = map[t.date] || []).push(t); });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  return (
    <View style={{ flex: 1, backgroundColor: p.surface }}>
      {/* Sticky header */}
      <View style={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg, backgroundColor: p.surface, borderBottomWidth: 1, borderBottomColor: p.border, paddingBottom: spacing.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
          <Text style={{ color: p.onSurface, fontSize: 22, fontWeight: "800" }}>Transaksi</Text>
          <Pressable testID="btn-add-tx" onPress={() => router.push("/transaction/new")} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: p.brandPrimary, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="plus" size={22} color={p.onBrandPrimary} />
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: p.surfaceTertiary, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 42, gap: spacing.sm, marginBottom: spacing.md }}>
          <MaterialCommunityIcons name="magnify" size={18} color={p.onSurfaceTertiary} />
          <TextInput
            testID="input-search"
            value={q}
            onChangeText={setQ}
            placeholder="Cari catatan, penerima..."
            placeholderTextColor={p.onSurfaceTertiary}
            style={{ flex: 1, color: p.onSurface, fontSize: 14 }}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {(["all", "income", "expense", "transfer"] as Filter[]).map((f) => (
            <Chip key={f} testID={`chip-${f}`} label={f === "all" ? "Semua" : f === "income" ? "Pemasukan" : f === "expense" ? "Pengeluaran" : "Transfer"} active={filter === f} onPress={() => setFilter(f)} />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={p.brandPrimary} /></View>
      ) : filtered.length === 0 ? (
        <EmptyState icon="tray" title="Belum ada transaksi" subtitle="Tekan tombol + untuk menambah" cta="Tambah Transaksi" onPress={() => router.push("/transaction/new")} testID="empty-tx" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40, gap: spacing.md }}>
          {grouped.map(([date, list]) => {
            const income = list.filter((t) => t.type === "income" || t.type === "refund").reduce((s, t) => s + t.amount, 0);
            const expense = list.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
            return (
              <View key={date}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm }}>
                  <Text style={{ color: p.onSurface, fontWeight: "700", fontSize: 13 }}>{formatDateID(date, "long")}</Text>
                  <Text style={{ color: p.onSurfaceTertiary, fontSize: 11 }}>
                    {income > 0 ? `+${formatIDR(income, { compact: true })}` : ""}{income > 0 && expense > 0 ? "  " : ""}{expense > 0 ? `-${formatIDR(expense, { compact: true })}` : ""}
                  </Text>
                </View>
                <Card style={{ padding: spacing.md }}>
                  {list.map((t, i) => (
                    <TransactionRow
                      key={t.id}
                      t={t}
                      first={i === 0}
                      categoryName={catMap[t.category_id || ""]?.name}
                      accountName={accMap[t.account_id]?.name}
                      onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: t.id } })}
                    />
                  ))}
                </Card>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({});

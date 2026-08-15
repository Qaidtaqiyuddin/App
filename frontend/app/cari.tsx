import React, { useState } from "react";
import { View, Text, ScrollView, TextInput, ActivityIndicator, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePalette, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";
import { formatIDR, formatDateID } from "@/src/format";
import { Card, EmptyState, SectionHeader } from "@/src/ui";
import { ScreenHeader } from "@/src/screen-header";

export default function CariScreen() {
  const p = usePalette();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const search = async (text: string) => {
    setQ(text);
    if (text.trim().length < 2) { setResults(null); return; }
    setLoading(true);
    try { setResults(await api.get<any>(`/search?q=${encodeURIComponent(text.trim())}`)); } finally { setLoading(false); }
  };

  const hasResults = results && (results.transactions.length || results.accounts.length || results.categories.length || results.debts.length || results.savings.length || results.notes.length);

  return (
    <View style={{ flex: 1, backgroundColor: p.surface }}>
      <ScreenHeader title="Pencarian Global" />
      <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: p.surfaceTertiary, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 46, gap: spacing.sm }}>
          <MaterialCommunityIcons name="magnify" size={20} color={p.onSurfaceTertiary} />
          <TextInput testID="input-global-search" value={q} onChangeText={search} placeholder="Cari transaksi, akun, catatan..." placeholderTextColor={p.onSurfaceTertiary} autoFocus style={{ flex: 1, color: p.onSurface, fontSize: 15 }} />
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color={p.brandPrimary} style={{ marginTop: spacing.xl }} />
      ) : !results ? (
        <EmptyState icon="magnify" title="Ketik untuk mencari" subtitle="Minimal 2 karakter" testID="search-idle" />
      ) : !hasResults ? (
        <EmptyState icon="magnify-close" title="Tidak ditemukan" subtitle={`Tidak ada hasil untuk "${q}"`} testID="search-empty" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: 40 }}>
          {results.transactions.length > 0 && (
            <>
              <SectionHeader title={`Transaksi (${results.transactions.length})`} />
              <Card style={{ padding: spacing.md }}>
                {results.transactions.map((t: any, i: number) => (
                  <Pressable key={t.id} onPress={() => router.push({ pathname: "/transaction/[id]", params: { id: t.id } })} style={{ paddingVertical: spacing.sm, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: p.divider, flexDirection: "row", justifyContent: "space-between" }}>
                    <View style={{ flex: 1 }}><Text style={{ color: p.onSurface, fontWeight: "600" }}>{t.payee || t.note || "Transaksi"}</Text><Text style={{ color: p.onSurfaceTertiary, fontSize: 12 }}>{formatDateID(t.date)}</Text></View>
                    <Text style={{ color: p.onSurface, fontWeight: "700" }}>{formatIDR(t.amount, { compact: true })}</Text>
                  </Pressable>
                ))}
              </Card>
            </>
          )}
          {results.accounts.length > 0 && (
            <><SectionHeader title={`Akun (${results.accounts.length})`} /><Card style={{ padding: spacing.md }}>{results.accounts.map((a: any, i: number) => (<Pressable key={a.id} onPress={() => router.push({ pathname: "/account/edit", params: { id: a.id } })} style={{ paddingVertical: spacing.sm, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: p.divider }}><Text style={{ color: p.onSurface, fontWeight: "600" }}>{a.name}</Text></Pressable>))}</Card></>
          )}
          {results.categories.length > 0 && (
            <><SectionHeader title={`Kategori (${results.categories.length})`} /><Card style={{ padding: spacing.md }}>{results.categories.map((c: any, i: number) => (<View key={c.id} style={{ paddingVertical: spacing.sm, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: p.divider }}><Text style={{ color: p.onSurface, fontWeight: "600" }}>{c.name}</Text></View>))}</Card></>
          )}
          {results.debts.length > 0 && (
            <><SectionHeader title={`Utang/Piutang (${results.debts.length})`} /><Card style={{ padding: spacing.md }}>{results.debts.map((d: any, i: number) => (<Pressable key={d.id} onPress={() => router.push({ pathname: "/debt/edit", params: { id: d.id } })} style={{ paddingVertical: spacing.sm, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: p.divider }}><Text style={{ color: p.onSurface, fontWeight: "600" }}>{d.party_name}</Text></Pressable>))}</Card></>
          )}
          {results.savings.length > 0 && (
            <><SectionHeader title={`Target (${results.savings.length})`} /><Card style={{ padding: spacing.md }}>{results.savings.map((s: any, i: number) => (<Pressable key={s.id} onPress={() => router.push({ pathname: "/savings/edit", params: { id: s.id } })} style={{ paddingVertical: spacing.sm, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: p.divider }}><Text style={{ color: p.onSurface, fontWeight: "600" }}>{s.name}</Text></Pressable>))}</Card></>
          )}
          {results.notes.length > 0 && (
            <><SectionHeader title={`Catatan (${results.notes.length})`} /><Card style={{ padding: spacing.md }}>{results.notes.map((n: any, i: number) => (<Pressable key={n.id} onPress={() => router.push({ pathname: "/note/edit", params: { id: n.id } })} style={{ paddingVertical: spacing.sm, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: p.divider }}><Text style={{ color: p.onSurface, fontWeight: "600" }}>{n.title}</Text></Pressable>))}</Card></>
          )}
        </ScrollView>
      )}
    </View>
  );
}

import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { usePalette, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { Card, Button, Toast } from "@/src/ui";
import { ScreenHeader } from "@/src/screen-header";
import { formatDateID } from "@/src/format";

export default function BackupScreen() {
  const p = usePalette();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api.get<any>("/export/backup")); } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2000); };

  const copyJSON = async () => {
    await Clipboard.setStringAsync(JSON.stringify(data, null, 2));
    showToast("Backup JSON disalin ke clipboard");
  };

  const copyTransactionsCSV = async () => {
    const header = "tanggal,waktu,jenis,nominal,akun,kategori,penerima,catatan\n";
    const rows = (data.transactions || []).map((t: any) => {
      const acc = data.accounts.find((a: any) => a.id === t.account_id)?.name || "";
      const cat = data.categories.find((c: any) => c.id === t.category_id)?.name || "";
      return `${t.date},${t.time},${t.type},${t.amount},"${acc}","${cat}","${t.payee || ""}","${(t.note || "").replace(/"/g, "'")}"`;
    }).join("\n");
    await Clipboard.setStringAsync(header + rows);
    showToast(`${data.transactions.length} transaksi disalin (CSV)`);
  };

  const copyTemplate = async () => {
    await Clipboard.setStringAsync("tanggal,waktu,jenis,nominal,akun,kategori,penerima,catatan\n2026-01-01,12:00,expense,50000,BCA Utama,Makanan,Warteg,Contoh");
    showToast("Template CSV disalin");
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: p.surface, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={p.brandPrimary} /></View>;

  const counts = data ? [
    ["Transaksi", data.transactions.length],
    ["Akun", data.accounts.length],
    ["Kategori", data.categories.length],
    ["Anggaran", data.budgets.length],
    ["Tagihan", data.bills.length],
    ["Utang/Piutang", data.debts.length],
    ["Target Tabungan", data.savings.length],
    ["Catatan", data.notes.length],
  ] : [];

  return (
    <View style={{ flex: 1, backgroundColor: p.surface }}>
      <ScreenHeader title="Ekspor & Backup" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40, gap: spacing.md }}>
        <Card>
          <Text style={{ color: p.onSurface, fontWeight: "700", marginBottom: spacing.sm }}>Ringkasan Data</Text>
          {counts.map(([label, count]) => (
            <View key={label as string} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
              <Text style={{ color: p.onSurfaceTertiary }}>{label}</Text>
              <Text style={{ color: p.onSurface, fontWeight: "700" }}>{count}</Text>
            </View>
          ))}
        </Card>
        <Card style={{ gap: spacing.sm }}>
          <Text style={{ color: p.onSurface, fontWeight: "700" }}>Ekspor</Text>
          <Text style={{ color: p.onSurfaceTertiary, fontSize: 12, marginBottom: spacing.sm }}>Data disalin ke clipboard, dapat ditempel ke aplikasi lain / file .csv / .json.</Text>
          <Button label="Ekspor Transaksi (CSV)" icon="file-delimited" onPress={copyTransactionsCSV} testID="btn-export-csv" />
          <Button label="Backup Semua (JSON)" variant="secondary" icon="code-json" onPress={copyJSON} testID="btn-backup-json" />
          <Button label="Salin Template Import CSV" variant="ghost" icon="download" onPress={copyTemplate} testID="btn-template-csv" />
        </Card>
        <Text style={{ color: p.onSurfaceTertiary, fontSize: 11, textAlign: "center" }}>Backup dibuat {formatDateID((data?.exported_at || "").slice(0, 10) || "2026-01-01", "long")}</Text>
      </ScrollView>
      <Toast message={toast} visible={!!toast} />
    </View>
  );
}

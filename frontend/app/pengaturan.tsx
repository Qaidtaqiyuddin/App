import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable, Modal } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePalette, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";
import { Settings } from "@/src/types";
import { Card, Button, Toast } from "@/src/ui";
import { FormField, TextField } from "@/src/form";
import { ScreenHeader } from "@/src/screen-header";

export default function PengaturanScreen() {
  const p = usePalette();
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [confirmStep, setConfirmStep] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try { setSettings(await api.get<Settings>("/settings")); } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2000); };

  const update = async (patch: Partial<Settings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    await api.put("/settings", next);
  };

  const resetDummy = async () => {
    await api.post("/seed?force=true");
    showToast("Data dummy berhasil dibuat ulang");
  };

  const deleteAll = async () => {
    await api.post("/reset?confirm=HAPUS_SEMUA");
    setConfirmStep(0);
    showToast("Seluruh data telah dihapus");
    load();
  };

  if (loading || !settings) return <View style={{ flex: 1, backgroundColor: p.surface, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={p.brandPrimary} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: p.surface }}>
      <ScreenHeader title="Pengaturan" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40, gap: spacing.md }}>
        <Card style={{ gap: spacing.md }}>
          <Text style={{ color: p.onSurface, fontWeight: "700" }}>Profil</Text>
          <FormField label="Nama Pengguna"><TextField value={settings.user_name} onChange={(v) => setSettings({ ...settings, user_name: v })} testID="input-username" /></FormField>
          <Button label="Simpan Nama" variant="secondary" onPress={() => { update({ user_name: settings.user_name }); showToast("Tersimpan"); }} testID="btn-save-name" />
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text style={{ color: p.onSurface, fontWeight: "700" }}>Preferensi</Text>
          <Row label="Mata Uang" value="Rupiah (IDR)" />
          <Row label="Format Tanggal" value="DD/MM/YYYY" />
          <Row label="Zona Waktu" value="Asia/Jakarta (WIB)" />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm }}>
            <Text style={{ color: p.onSurface }}>Notifikasi Anggaran (80% & 100%)</Text>
            <Pressable testID="toggle-notify" onPress={() => update({ notify_budget: !settings.notify_budget })}>
              <MaterialCommunityIcons name={settings.notify_budget ? "toggle-switch" : "toggle-switch-off-outline"} size={40} color={settings.notify_budget ? p.brandPrimary : p.onSurfaceTertiary} />
            </Pressable>
          </View>
          <Text style={{ color: p.onSurfaceTertiary, fontSize: 11 }}>Tema mengikuti sistem HP (terang/gelap otomatis).</Text>
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text style={{ color: p.onSurface, fontWeight: "700" }}>Data</Text>
          <Button label="Kelola Kategori Default" variant="secondary" icon="shape" onPress={() => router.push("/kategori")} testID="btn-manage-cat" />
          <Button label="Ekspor & Backup" variant="secondary" icon="database-export" onPress={() => router.push("/backup")} testID="btn-backup" />
          <Button label="Reset Data Dummy" variant="secondary" icon="refresh" onPress={resetDummy} testID="btn-reset-dummy" />
          <Button label="Hapus Seluruh Data" variant="danger" icon="trash-can" onPress={() => setConfirmStep(1)} testID="btn-delete-all" />
        </Card>

        <View style={{ alignItems: "center", padding: spacing.md }}>
          <Text style={{ color: p.onSurfaceTertiary, fontSize: 12 }}>LifeDesk · Keuangan Pribadi</Text>
          <Text style={{ color: p.onSurfaceTertiary, fontSize: 10, marginTop: 2, textAlign: "center" }}>Aplikasi ini tidak terhubung ke bank dan tidak menyimpan nomor rekening lengkap, PIN, atau data kartu.</Text>
        </View>
      </ScrollView>

      {/* Double confirm delete */}
      <Modal visible={confirmStep > 0} transparent animationType="fade" onRequestClose={() => setConfirmStep(0)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.xl }}>
          <View style={{ backgroundColor: p.surfaceSecondary, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md }}>
            <MaterialCommunityIcons name="alert-circle" size={40} color={p.error} style={{ alignSelf: "center" }} />
            <Text style={{ color: p.onSurface, fontSize: 18, fontWeight: "800", textAlign: "center" }}>
              {confirmStep === 1 ? "Hapus Seluruh Data?" : "Konfirmasi Terakhir"}
            </Text>
            <Text style={{ color: p.onSurfaceTertiary, fontSize: 13, textAlign: "center" }}>
              {confirmStep === 1 ? "Semua transaksi, akun, dan catatan akan dihapus permanen. Tindakan ini tidak dapat dibatalkan." : "Anda benar-benar yakin? Data tidak dapat dikembalikan."}
            </Text>
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {confirmStep === 1 ? (
                <Button label="Lanjutkan" variant="danger" onPress={() => setConfirmStep(2)} testID="btn-confirm-1" />
              ) : (
                <Button label="Ya, Hapus Semua" variant="danger" icon="trash-can" onPress={deleteAll} testID="btn-confirm-2" />
              )}
              <Button label="Batal" variant="ghost" onPress={() => setConfirmStep(0)} testID="btn-cancel-delete" />
            </View>
          </View>
        </View>
      </Modal>

      <Toast message={toast} visible={!!toast} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ color: p.onSurfaceTertiary }}>{label}</Text>
      <Text style={{ color: p.onSurface, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

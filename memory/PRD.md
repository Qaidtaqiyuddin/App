# LifeDesk — PRD & Progress

## Original Problem Statement
Aplikasi web mobile-first "LifeDesk" — keuangan pribadi single-user (bukan sosial/multi-user). Bahasa Indonesia, Rupiah, format tanggal Indonesia, timezone Asia/Jakarta. Tema terang & gelap. Navigasi bawah di mobile. Fokus: pencatatan, perencanaan, dan analisis keuangan pribadi.

## Architecture
- **Frontend**: Expo Router (React Native), bottom tabs + modal stack. Sage-green iOS-clean theme (light/dark via system). MaterialCommunityIcons. Fetch via `src/api.ts`.
- **Backend**: FastAPI + MongoDB (Motor). All IDs are UUID strings (no ObjectId leakage). Balances recomputed server-side from transactions.
- **State**: Server is source of truth; screens refetch on focus.

## User Persona
Individu yang ingin mencatat & menganalisis keuangan pribadi dari HP: gaji, pengeluaran harian, tagihan, utang/piutang, target tabungan.

## Core Requirements (static)
- IDR formatting, Indonesian dates, Asia/Jakarta tz.
- Transfer tidak dihitung sebagai pemasukan/pengeluaran.
- Saldo berjalan konsisten (initial + transaksi).
- No bank integration; no full account numbers/PIN/card data.
- Empty/loading/error/success states.
- Data dummy: 5 akun, 35 transaksi, 5 tagihan, 3 utang/piutang, 4 target.

## Implemented (2026-08-15)
- **Dashboard**: saldo total, akun utama, pemasukan/pengeluaran bulan ini, sisa anggaran, utang−piutang, grafik arus kas 6 bulan (calendar-accurate), tagihan terdekat, pengeluaran terbesar, transaksi terakhir, quick-add (pemasukan/pengeluaran/transfer), hide-balance.
- **Transaksi**: list grouped by date, filter chips (semua/pemasukan/pengeluaran/transfer), search, add/edit/delete. 5 jenis (income/expense/transfer/refund/adjustment), amount-first entry, kategori/akun/penerima/metode/catatan/tag.
- **Akun & Dompet**: 6 jenis, saldo awal/berjalan, nomor tersamar, warna, status aktif, transfer antar-akun.
- **Kategori**: default income+expense, warna/ikon, arsip, tambah/edit.
- **Anggaran**: bulanan/mingguan, per-kategori & total, status aman/mendekati/melebihi, salin dari bulan lalu.
- **Tagihan & Berulang**: frekuensi, jatuh tempo, tandai lunas, perkiraan arus kas 30 hari.
- **Utang/Piutang**: 5 jenis, saldo = nominal − pembayaran, catat pembayaran → transaksi otomatis, status aktif/lunas, riwayat.
- **Target Tabungan**: progress %, setoran, estimasi waktu tercapai.
- **Laporan**: pie pengeluaran per kategori, bar 6-bulan, kekayaan bersih (aset/liabilitas breakdown), tab tabungan.
- **Catatan Keuangan**: 5 jenis (rencana/pembelian/utang/ide hemat/jurnal).
- **Pencarian Global**: transaksi/akun/kategori/utang/target/catatan.
- **Ekspor & Backup**: CSV transaksi, JSON backup, template import (via clipboard).
- **Pengaturan**: nama pengguna, info mata uang/tanggal/tz, notifikasi anggaran, reset dummy, hapus semua (konfirmasi ganda).
- Audit log untuk create/update/delete transaksi.

## Testing
- Backend: 18/18 pytest passed. Frontend: all critical flows verified (iteration_1.json).

## Backlog (P1/P2)
- P1: CSV import parsing (saat ini template + ekspor; import file belum di-parse).
- P1: Duplikasi transaksi & undo setelah hapus (UI action).
- P2: Kalender tagihan visual (grid), subkategori UI, lampiran (object storage), pagination transaksi besar.
- P2: Toggle tema manual (saat ini ikut sistem).

## Next Tasks
- Implement CSV import with validation.
- Add transaction duplicate + undo snackbar.

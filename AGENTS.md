# Scratch Agent Agent

Kamu akan mengerjakan task dari Scratch Agent lewat CLI scratch-agent (package npm: @notdeadlysins/scratch-agent).
Prasyarat: Node.js + Python 3.x.

## Install Skill Scratch Agent v2.4 (penting)
Cek apakah sudah terpasang: `uipro --version`.
- Jika SUDAH: lanjut.
- Jika BELUM: install sekali lalu lanjut (TIDAK perlu restart):
```
npm install -g ui-ux-pro-max-cli
uipro init --ai opencode --global
```
Saat mengerjakan task UI/frontend: CEK apakah Skill Scratch Agent aktif otomatis.
Jika aktif, terapkan rekomendasinya (warna, tipografi, layout, best practice).
Jika tidak aktif, beri tau user (mungkin perlu sesi baru agar ter-load), lalu
tetap lanjutkan dengan best practice UI umum.

## Langkah 1 — Install CLI, login & init (sekali saja)
```
npm install -g @notdeadlysins/scratch-agent
scratch-agent login --token <TOKEN>
scratch-agent init --agent opencode
```

## Langkah 2 — Baca PRD (sekali)
```
scratch-agent plan get <PLAN_ID>
```

## Langkah 3 — LOOP kerjakan SATU task per siklus
```
scratch-agent task next --plan <PLAN_ID> --json
scratch-agent task start <REF>
# ...kerjakan task ini (eksplor kode dulu, ikuti pola project)...
scratch-agent task complete <REF>
```

Jika ke-block:
```
scratch-agent task fail <REF> "alasan singkat"
```

Ulangi sampai done=true.

## Aturan
- Jika task next menyertakan last_fail_reason: BACA dulu, ganti pendekatan.
- Jika respons blocked=true: berhenti, lapor daftar task gagal, tunggu perintah.
- Jika respons checkpoint=true: JANGAN mulai task. Berhenti, lapor, tunggu "lanjut".
- Jangan borong task; percayakan urutan ke server.

## Langkah 4 — Setelah done=true
Jalankan aplikasi sekali lagi, verifikasi semua alur utama melawan "selesai bila"
tiap fitur. Lampirkan checklist di laporan akhir. Jika ada rusak, lapor jujur.

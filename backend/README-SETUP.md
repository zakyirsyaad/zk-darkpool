# Backend setup & solusi EACCES

## 1. Error "EACCES: permission denied, open 'input.json'"

**Sudah diperbaiki.** Semua file proof (input.json, witness.wtns, proof.json, public.json) sekarang ditulis ke **folder temp** (`os.tmpdir()`), bukan ke direktori kerja. Jadi tidak ada lagi tulis file di tempat yang read-only.

## 2. Menjalankan backend (lokal)

- **Wajib** jalankan dari folder `backend/`:
  ```bash
  cd backend
  node index.js
  # atau
  pnpm dev
  ```
- Folder **`backend/build/`** harus berisi artifact circuit (copy dari root `build/`):
  - `backend/build/trade_check_js/` (generate_witness.js, trade_check.wasm)
  - `backend/build/circuit_final.zkey`
- Kalau belum ada: compile circuit di root repo, lalu **copy seluruh isi root `build/` ke `backend/build/`**.

## 3. Deploy ke Vercel (match-and-settle)

Circuit artifacts dipakai dari **`backend/build/`**. Copy isi root `build/` ke `backend/build/`, commit (termasuk `circuit_final.zkey` — backend/.gitignore mengizinkan `build/*.zkey`). Deploy backend ke Vercel; folder `backend/build/` ikut deploy sehingga proof generation jalan.

## 4. Cek cepat

- Lokal: dari `backend/` jalankan `node index.js`, lalu tes trade yang matched → tidak ada EACCES.  
- Pastikan **`backend/build/`** ada dan berisi `trade_check_js/` + `circuit_final.zkey`.

# Panduan Deployment ke Plesk (Node.js)

Aplikasi ini menggunakan **React (Frontend)** dan **Express (Backend)** yang disatukan. Frontend sudah dibuild menjadi file statis dan akan diserve oleh backend Express.

## 1. Persiapan File
Folder `server/` adalah folder utama yang akan diupload. Folder ini sekarang sudah berisi:
- Kode Backend (`index.js`, dll)
- Frontend Build (`public/` folder - **Pastikan folder ini ada!**)
- `package.json` (Daftar library backend)

**Langkah membuat ZIP:**
1. Masuk ke folder `server`.
2. Select semua file dan folder DI DALAM folder `server` (`index.js`, `package.json`, `public`, `uploads`, dll).
   * **PENTING**: JANGAN sertakan folder `node_modules` atau file `.env` lokal Anda.
3. Klik kanan -> Send to -> Compressed (zipped) folder. Beri nama `deployment.zip`.

## 2. Setup Database di Plesk
1. Masuk ke Plesk Panel -> **Databases**.
2. Klik **Add Database**.
   - Database name: `keuangan_rdr` (atau nama lain)
   - Database user: Buat user baru (catat username & password)
3. Klik **Import Dump** -> Pilih file `server/schema.sql` dari komputer Anda.

## 3. Setup Node.js App di Plesk
1. Masuk ke Plesk Panel -> **Node.js**.
2. Klik **Enable Node.js** (jika belum).
3. Buat Aplikasi Baru (atau gunakan yang ada):
   - **Document Root**: Folder tempat file akan diupload (misal: `/httpdocs` atau `/subdomain`).
   - **Application Mode**: `Production`.
   - **Application Startup File**: `index.js`.
   - **Package Manager**: `npm`.
4. Upload `deployment.zip` ke Document Root melalui **File Manager**, lalu Extract.
5. Klik tombol **NPM Install** di halaman Node.js Plesk untuk menginstall dependency.

## 4. Konfigurasi Environment (.env)
Karena file `.env` tidak ikut diupload (untuk keamanan), Anda perlu menambahkannya manual di Plesk.

1. Di halaman Node.js App Plesk, cari tombol **Environment variables** (atau buat file `.env` manual di File Manager).
2. Masukkan variabel berikut:

```
PORT=3000
DB_HOST=127.0.0.1  <-- Biasanya localhost atau 127.0.0.1 di Plesk
DB_USER=nama_user_db_anda
DB_PASSWORD=password_db_anda
DB_NAME=nama_database_anda
JWT_SECRET=rahasia_super_aman_ganti_ini
```

## 5. Jalankan Aplikasi
1. Klik **Restart App** di Plesk.
2. Buka domain Anda di browser.

---

## Troubleshooting
- **Error 500/502**: Cek Logs di Plesk. Pastikan `npm install` sukses dan variabel database benar.
- **Gambar tidak muncul**: Pastikan folder `uploads` memiliki permission Write (755 atau 777).

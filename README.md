# Mari Jua Jastip - Sistem Pemesanan & Dashboard Admin Otomatis

Aplikasi web lengkap untuk bisnis jastip (Jasa Titip) dengan integrasi otomatis antara:
1. **Halaman Form Pemesanan Pelanggan (`index.html`)**
2. **Dashboard Admin & Invoice (`admin.html`)**

Setiap kali pelanggan mengisi form pemesanan dan menekan tombol kirim, data pesanan akan **otomatis langsung masuk dan ter-update di Dashboard Admin secara real-time** tanpa perlu refresh!

---

## 🚀 Fitur Utama

### 1. Halaman Pelanggan (`index.html`)
- Desain ramah mobile (HP) dengan tema khas Mari Jua Jastip (cream/rose/dark chocolate).
- Pelanggan mengisi nama, nomor WhatsApp, pilihan pengiriman (dikirim / ambil sendiri), dan daftar barang titipan.
- Setiap barang bisa dilengkapi nama toko/link produk, varian/warna/ukuran, jumlah, dan perkiraan harga satuan.
- Menghitung subtotal perkiraan secara otomatis.
- Saat tombol **"Kirim pesanan lewat WhatsApp"** ditekan:
  - Pesanan **otomatis dibuatkan nomor invoice resmi** (contoh: `MJJ-2611-001`).
  - Pesanan **langsung tersimpan dan terkirim ke Dashboard Admin secara real-time**.
  - Browser langsung membuka chat WhatsApp ke admin dengan pesan terstruktur rapi.

### 2. Dashboard Admin (`admin.html`)
- **Proteksi Kata Sandi (Login)**:
  - Password admin: `juaAmbon@`
  - Fitur *"Ingat saya di perangkat ini"* agar tidak perlu login berulang kali di komputer yang sama.
  - Tombol **Keluar (Logout)** di pojok kanan atas dan menu Pengaturan.
- **Ringkasan (Dashboard Utama)**:
  - Statistik bulanan: Jumlah pesanan, Total nilai pesanan, Total dana masuk, dan Belum dibayar.
  - Grafik pipa *Perjalanan pesanan* (Baru masuk, Sudah dibelikan, Dikirim, Selesai).
  - Daftar pesanan terbaru & daftar pesanan yang perlu ditagih (dengan tombol 1-klik tagih via WA).
- **Semua Pesanan**:
  - Filter status: *Semua, Baru masuk, Sudah dibelikan, Dikirim, Selesai, Belum lunas, Dibatalkan*.
  - Kolom pencarian instan (nama pelanggan, nomor invoice, barang).
  - Ekspor seluruh data pesanan ke **Excel (.xlsx)**.
  - Label penanda pesanan baru masuk dari form web.
- **Buat / Ubah Pesanan**:
  - Form pencatatan pesanan manual (untuk pesanan yang masuk langsung dari WA atau offline).
- **Nota & Invoice Interaktif (`#nota-{id}`)**:
  - Tampilan nota estetik bergradasi kertas nota bergerigi khas Mari Jua Jastip.
  - Pembuat pesan WhatsApp otomatis (Template: Invoice, Pengingat Bayar, Barang Dikirim).
  - **Simpan Nota sebagai Gambar (.PNG)** menggunakan canvas rendering resolusi tinggi untuk dikirim di chat WhatsApp.
  - Pencatatan pembayaran DP atau Lunas.
- **Pengaturan Usaha**:
  - Ubah nama usaha, nomor WhatsApp, awalan nomor invoice, fee jasa standar (%), rekening pembayaran, dan kalimat penutup nota.
  - Cadangan data: Unduh cadangan `.json` dan Pulihkan data kapan saja.
- **Notifikasi Real-time**:
  - Bunyi lonceng notifikasi (Web Audio chime) saat ada pesanan baru masuk.
  - Notifikasi desktop browser.
  - Tombol tes simulasi pesanan masuk di menu Pengaturan.

---

## ⚡ Cara Kerja Update Otomatis (Real-time)

Sistem ini mendukung **2 metode sinkronisasi**:

### Metode 1: Browser Sync Instan (Out-of-the-Box / 0 Konfigurasi)
- Menggunakan `BroadcastChannel` dan `StorageEvent`.
- **Langsung bekerja 100% tanpa setup apapun.**
- Sangat cocok untuk pengujian langsung: buka `index.html` di satu tab dan `admin.html` di tab/jendela lain. Saat form dikirim, admin langsung bunyi lonceng dan pesanan baru langsung muncul di daftar!

### Metode 2: Cloud Real-time Antar-Perangkat (Supabase)
- Cocok untuk produksi di mana **Pelanggan membuka web dari HP** dan **Admin membuka dashboard dari Komputer / Laptop di tempat lain**.
- Cukup isi `supabaseUrl` dan `supabaseKey` di `config.js`:
  1. Buka [Supabase](https://supabase.com/dashboard)
  2. Buka menu **SQL Editor**, tempel dan jalankan isi file `supabase-schema.sql`.
  3. Buka **Project Settings > API**, salin `URL` dan `anon public key` ke dalam `config.js`.
  4. Selesai! Pesanan dari HP pelanggan di mana pun akan otomatis melompat masuk ke laptop admin via WebSocket dalam hitungan milidetik.

---

## 🧪 Cara Menguji / Menjalankan di Komputer

1. Buka file `admin.html` di browser Anda (Dashboard Admin).
2. Di tab browser lain, buka `index.html` (Form Pelanggan).
3. Isi data pemesan dan barang di `index.html`, lalu klik **"Kirim pesanan lewat WhatsApp"**.
4. Lihat tab `admin.html`:
   - Lonceng notifikasi akan berbunyi.
   - Banner notifikasi hijau akan muncul: `🔔 Pesanan baru masuk dari ...!`.
   - Pesanan langsung muncul di tab *Semua pesanan* dengan status **Baru masuk**.

---

## 🌐 Deploy ke Hosting (Netlify / Vercel)

### Deploy ke Netlify
1. Buka [Netlify Drop](https://app.netlify.com/drop).
2. Seret folder `mari-jua-jastip-pesan` ke halaman Netlify.
3. Alamat web Anda siap digunakan:
   - Pelanggan membuka: `https://nama-situs.netlify.app/`
   - Admin membuka: `https://nama-situs.netlify.app/admin` (atau `/admin.html`)

### Deploy ke Vercel
1. Buka terminal di folder ini, jalankan:
   ```bash
   npx vercel --prod
   ```
2. Routing otomatis sudah dikonfigurasi melalui `vercel.json`.

---

## 📁 Struktur File
- `index.html` : Halaman form pemesanan untuk pelanggan.
- `admin.html` : Dashboard admin, nota, manajemen pesanan & pengaturan.
- `config.js` : Konfigurasi kontak, biaya, rekening, dan Supabase.
- `sync.js` : Engine sinkronisasi real-time & notifikasi.
- `supabase-schema.sql` : Query SQL untuk aktivasi cloud sync Supabase.
- `favicon.png` : Ikon tab browser.
- `netlify.toml` & `vercel.json` : Pengaturan hosting & clean URLs.

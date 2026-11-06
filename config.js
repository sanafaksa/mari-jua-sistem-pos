// ==============================================================
// PENGATURAN MARI JUA JASTIP (config.js)
// Dipakai oleh Halaman Pemesanan (index.html) & Dashboard Admin (admin.html)
// ==============================================================

window.MJJ_CONFIG = {
  // 1. Profil Usaha & Kontak Admin
  biz: 'Mari Jua Jastip',
  logo: 'aset foto/logo.PNG', // Path file logo usaha
  wa: '6282148505323', // Nomor WhatsApp admin (format 62..., tanpa + dan spasi)
  tagline: 'Titip beli apa saja, kami belikan. Pesan cukup lewat WhatsApp.',
  notice: '', // Contoh: 'Pesanan untuk trip Bandung ditutup tiap Jumat jam 20.00'

  // 2. Format Invoice & Biaya Jasa
  prefix: 'MJJ', // Awalan nomor invoice (contoh: MJJ-2611-001)
  defFee: 10,    // Fee jasa standar dalam persen (%)
  defParkir: 2000, // Fee parkir standar dalam rupiah (Rp)

  // 3. Rekening & Cara Pembayaran (Tampil di Nota & Pesan WhatsApp)
  pay: 'Transfer SeaBank 901505338280 a.n. Amanda',

  // 4. Catatan Penutup Nota
  foot: 'Terima kasih sudah jastip di Mari Jua Jastip!',

  // 5. Tanya Jawab (FAQ) di Halaman Pemesanan
  faq: [
    {
      q: 'Berapa fee jasanya?',
      a: 'Fee jasa dan ongkir dihitung admin setelah barang dan harganya dikonfirmasi, lalu dicantumkan di invoice.'
    },
    {
      q: 'Kapan saya harus membayar?',
      a: 'Pembayaran dilakukan setelah admin mengirim invoice. Barang dibelikan setelah DP atau pelunasan masuk.'
    },
    {
      q: 'Harga di form ini sudah final?',
      a: 'Belum. Perkiraan harga hanya membantu admin. Harga final bisa berbeda sesuai kondisi toko saat dibelikan.'
    }
  ],

  // 6. Sinkronisasi Cloud Antar-Perangkat (Supabase) - OPSIONAL
  // Jika diisi, pesanan dari HP pelanggan akan OTOMATIS langsung masuk ke Dashboard Admin di Laptop/PC mana saja secara online real-time.
  // Jika dikosongkan, sistem tetap berjalan otomatis menggunakan penyimpanan browser lokal & sinkronisasi antar-tab.
  supabaseUrl: 'https://rbnoqgtjcpxxacoaxndm.supabase.co',
  supabaseKey: 'sb_publishable__75AxsIbKX6WMc2ESnNPhw_iaV61hR3'
};

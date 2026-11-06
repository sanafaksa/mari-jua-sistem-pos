-- ==============================================================
-- SKEMA SUPABASE UNTUK MARI JUA JASTIP (supabase-schema.sql)
-- ==============================================================
-- Jalankan query ini di Supabase SQL Editor jika Anda ingin sinkronisasi
-- otomatis antar-perangkat (misal: Pelanggan pesan dari HP, Admin buka di Laptop).
--
-- Langkah mudah:
-- 1. Buka dashboard proyek Supabase Anda (https://supabase.com/dashboard)
-- 2. Pilih menu "SQL Editor" di sidebar kiri
-- 3. Tempel (paste) seluruh isi file ini, lalu klik "Run"
-- 4. Buka Project Settings > API, salin URL dan anon public key ke config.js

-- 1. Buat tabel pesanan
create table if not exists public.mjj_orders (
  id text primary key,
  no text not null,
  customer_name text,
  customer_wa text,
  status text default 'baru',
  data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Buat index agar pencarian cepat
create index if not exists idx_mjj_orders_created_at on public.mjj_orders(created_at desc);
create index if not exists idx_mjj_orders_no on public.mjj_orders(no);

-- 3. Buka izin akses (Row Level Security) agar form pelanggan & admin bisa membaca dan menyimpan
alter table public.mjj_orders enable row level security;

create policy "Akses publik mjj_orders"
  on public.mjj_orders
  for all
  using (true)
  with check (true);

-- 4. Aktifkan Realtime agar setiap ada pesanan baru langsung terdorong ke Dashboard Admin
alter publication supabase_realtime add table public.mjj_orders;


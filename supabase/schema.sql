-- ═══════════════════════════════════════════════════════════════════════════
-- MAMBAQ — Esquema de base de datos
-- Correr este script completo en: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════════════

-- ── children: niños registrados con nombre + avatar ─────────────────────────
create table if not exists children (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  avatar       text not null,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- ── artworks: obras registradas ─────────────────────────────────────────────
create table if not exists artworks (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references children(id) on delete cascade,
  name        text not null,
  author      text not null,
  age         int  not null check (age between 3 and 12),
  style_key   text not null,
  style_label text not null,
  color       text not null,
  filter      text not null,
  emoji       text default '✨',
  image_url   text,
  image_path  text,
  created_at  timestamptz not null default now()
);
create index if not exists artworks_child_id_idx   on artworks (child_id);
create index if not exists artworks_created_at_idx on artworks (created_at desc);

-- ── likes: relación niño ↔ obra (1 like por par) ────────────────────────────
create table if not exists likes (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references children(id) on delete cascade,
  artwork_id uuid not null references artworks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (child_id, artwork_id)
);
create index if not exists likes_artwork_id_idx on likes (artwork_id);

-- ── vista con conteo de likes derivado ──────────────────────────────────────
create or replace view artworks_with_likes as
select a.*, coalesce(l.likes, 0)::int as likes
from artworks a
left join (
  select artwork_id, count(*) as likes
  from likes
  group by artwork_id
) l on l.artwork_id = a.id;

-- ═══════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════════════════
alter table children enable row level security;
alter table artworks enable row level security;
alter table likes    enable row level security;

-- Lectura abierta (es un museo público)
drop policy if exists "read children"  on children;
drop policy if exists "read artworks"  on artworks;
drop policy if exists "read likes"     on likes;
create policy "read children" on children for select using (true);
create policy "read artworks" on artworks for select using (true);
create policy "read likes"    on likes    for select using (true);

-- Inserts permitidos desde el frontend anónimo
drop policy if exists "insert children" on children;
drop policy if exists "insert artworks" on artworks;
drop policy if exists "insert likes"    on likes;
create policy "insert children" on children for insert with check (true);
create policy "insert artworks" on artworks for insert with check (true);
create policy "insert likes"    on likes    for insert with check (true);

-- Delete permitido en likes (para "unlike"), artworks y children
drop policy if exists "delete own like"    on likes;
drop policy if exists "delete own artwork" on artworks;
drop policy if exists "delete own child"   on children;
create policy "delete own like"    on likes    for delete using (true);
create policy "delete own artwork" on artworks for delete using (true);
create policy "delete own child"   on children for delete using (true);

-- Update permitido en children (last_seen_at) y artworks (image_url tras upload)
drop policy if exists "update children" on children;
drop policy if exists "update artworks" on artworks;
create policy "update children" on children for update using (true) with check (true);
create policy "update artworks" on artworks for update using (true) with check (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- Storage policies (correr DESPUÉS de crear el bucket 'artworks' en
-- Storage → New bucket → Public)
-- ═══════════════════════════════════════════════════════════════════════════
-- Estas policies están en el espacio de Storage; si Supabase no las acepta
-- desde aquí, copia este bloque al SQL Editor con el bucket ya creado:

drop policy if exists "public read artworks bucket"  on storage.objects;
drop policy if exists "anon upload artworks bucket"  on storage.objects;
create policy "public read artworks bucket"
  on storage.objects for select
  using (bucket_id = 'artworks');
create policy "anon upload artworks bucket"
  on storage.objects for insert
  with check (bucket_id = 'artworks');
drop policy if exists "anon delete artworks bucket" on storage.objects;
create policy "anon delete artworks bucket"
  on storage.objects for delete
  using (bucket_id = 'artworks');

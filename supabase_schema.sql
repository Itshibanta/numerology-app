-- ============================================================================
-- Clés Des Nombres — Recréation complète du schéma Supabase
-- À coller dans : Supabase Dashboard > SQL Editor > New query > Run
-- Idempotent : peut être relancé sans casser l'existant.
-- ============================================================================

-- Extensions nécessaires (gen_random_uuid)
create extension if not exists pgcrypto;

-- ============================================================================
-- 1) TABLE profiles
--    1 ligne par utilisateur auth. plan = 'free' par défaut, 'oneshot' une fois
--    un thème acheté. Les colonnes stripe_/quota_ restent pour compat backend.
-- ============================================================================
create table if not exists public.profiles (
  id                      uuid primary key references auth.users(id) on delete cascade,
  plan                    text not null default 'free',
  first_name              text,
  last_name               text,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  stripe_price_id         text,
  subscription_status     text,
  quota_period_start      timestamptz,
  quota_period_end        timestamptz,
  current_period_end      timestamptz,
  created_at              timestamptz not null default now()
);

-- ============================================================================
-- 2) TABLE generations
--    Historique des thèmes générés. pdf_path = chemin du PDF dans le bucket
--    Storage 'themes'. payload = état civil envoyé. result_text = thème brut.
-- ============================================================================
create table if not exists public.generations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         text not null default 'theme',   -- 'theme' (one-shot) | 'summary' (legacy)
  label        text,
  payload      jsonb,
  result_text  text,
  pdf_path     text,
  created_at   timestamptz not null default now()
);

create index if not exists generations_user_id_idx  on public.generations (user_id);
create index if not exists generations_created_idx   on public.generations (user_id, created_at desc);

-- ============================================================================
-- 3) TABLE generation_counters + RPC consume_generation
--    Utilisée par l'ancienne route /generate-theme (quota mensuel).
--    Conservée pour ne rien casser ; inoffensive dans le modèle one-shot.
--    Contrat attendu par le backend (server/index.js) :
--      consume_generation(p_user uuid, p_limit bigint)
--      -> (allowed bool, reason text, new_count int, quota_limit bigint, month_key_out text)
-- ============================================================================
create table if not exists public.generation_counters (
  user_id    uuid not null references auth.users(id) on delete cascade,
  month_key  text not null,                 -- 'YYYY-MM'
  count      integer not null default 0,
  primary key (user_id, month_key)
);

create or replace function public.consume_generation(p_user uuid, p_limit bigint)
returns table (
  allowed       boolean,
  reason        text,
  new_count     integer,
  quota_limit   bigint,
  month_key_out text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month   text := to_char(now(), 'YYYY-MM');
  v_current integer;
begin
  -- ligne du mois (créée si absente)
  insert into public.generation_counters (user_id, month_key, count)
  values (p_user, v_month, 0)
  on conflict (user_id, month_key) do nothing;

  select count into v_current
  from public.generation_counters
  where user_id = p_user and month_key = v_month
  for update;

  if v_current >= p_limit then
    return query select false, 'QUOTA_EXCEEDED'::text, v_current, p_limit, v_month;
    return;
  end if;

  update public.generation_counters
  set count = count + 1
  where user_id = p_user and month_key = v_month
  returning count into v_current;

  return query select true, 'OK'::text, v_current, p_limit, v_month;
end;
$$;

-- ============================================================================
-- 4) TRIGGER : créer automatiquement un profil à l'inscription auth
--    Filet de sécurité (le backend appelle aussi ensureProfileExists).
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, plan, first_name, last_name)
  values (
    new.id,
    'free',
    coalesce(new.raw_user_meta_data->>'firstName', new.raw_user_meta_data->>'first_name'),
    coalesce(new.raw_user_meta_data->>'lastName',  new.raw_user_meta_data->>'last_name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 5) RLS (Row Level Security)
--    Le backend utilise la SERVICE ROLE KEY -> bypass RLS (lecture/écriture OK).
--    Ces policies protègent l'accès direct via la clé anon : un user ne peut
--    voir QUE ses propres données.
-- ============================================================================
alter table public.profiles            enable row level security;
alter table public.generations         enable row level security;
alter table public.generation_counters enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "generations_select_own" on public.generations;
create policy "generations_select_own" on public.generations
  for select using (auth.uid() = user_id);

-- (generation_counters : aucune policy publique -> seul le service role y accède)

-- ============================================================================
-- 6) STORAGE : bucket privé 'themes' pour les PDF
--    Chemin conseillé : <user_id>/<generation_id>.pdf
--    Le backend upload via service role et sert des signed URLs.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('themes', 'themes', false)
on conflict (id) do nothing;

-- Lecture du PDF par son propriétaire (1er segment du chemin = user_id)
drop policy if exists "themes_read_own" on storage.objects;
create policy "themes_read_own" on storage.objects
  for select using (
    bucket_id = 'themes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- FIN
-- ============================================================================

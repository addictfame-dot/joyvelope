-- Run in the Supabase SQL editor before deploying the Edge Function.
create extension if not exists pgcrypto;

create table if not exists public.joyvelope_gifts (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  revoke_hash text not null unique,
  payload jsonb not null,
  photo_count smallint not null default 0 check (photo_count between 0 and 6),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.joyvelope_gifts enable row level security;
-- Intentionally create no anon/authenticated policies. Only the Edge Function's
-- service-role client can read/write these rows. Never expose the service key.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('joyvelope-private', 'joyvelope-private', false, 2097152, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg'];

-- No object policies for anon/authenticated: only Edge Function service role may access.

create index if not exists joyvelope_gifts_expiry_idx on public.joyvelope_gifts (expires_at);

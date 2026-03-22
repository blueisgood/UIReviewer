create table if not exists public.prototype_review_configs (
  review_slug text primary key,
  title text not null,
  screens jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.prototype_review_configs enable row level security;

drop policy if exists "public can read review configs" on public.prototype_review_configs;
drop policy if exists "public can insert review configs" on public.prototype_review_configs;
drop policy if exists "public can update review configs" on public.prototype_review_configs;

create policy "public can read review configs"
on public.prototype_review_configs
for select
to anon
using (true);

create policy "public can insert review configs"
on public.prototype_review_configs
for insert
to anon
with check (true);

create policy "public can update review configs"
on public.prototype_review_configs
for update
to anon
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('review-assets', 'review-assets', true)
on conflict (id) do nothing;

drop policy if exists "public can read review assets" on storage.objects;
drop policy if exists "public can upload review assets" on storage.objects;
drop policy if exists "public can update review assets" on storage.objects;

create policy "public can read review assets"
on storage.objects
for select
to anon
using (bucket_id = 'review-assets');

create policy "public can upload review assets"
on storage.objects
for insert
to anon
with check (bucket_id = 'review-assets');

create policy "public can update review assets"
on storage.objects
for update
to anon
using (bucket_id = 'review-assets')
with check (bucket_id = 'review-assets');

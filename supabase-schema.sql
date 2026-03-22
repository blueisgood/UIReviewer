create table if not exists public.prototype_reviews (
  review_slug text primary key,
  reviewer_name text,
  product_comments text,
  user_feedback text,
  share_url text,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.prototype_reviews enable row level security;

create policy "public can read prototype reviews"
on public.prototype_reviews
for select
to anon
using (true);

create policy "public can insert prototype reviews"
on public.prototype_reviews
for insert
to anon
with check (true);

create policy "public can update prototype reviews"
on public.prototype_reviews
for update
to anon
using (true)
with check (true);

alter table public.prototype_reviews
add column if not exists submitted_at timestamptz;

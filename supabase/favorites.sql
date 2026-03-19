create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  climb_id uuid not null references climbs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, climb_id)
);

alter table favorites enable row level security;

create policy "Users can view their own favorites"
  on favorites for select
  using (auth.uid() = user_id);

create policy "Users can insert their own favorites"
  on favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own favorites"
  on favorites for delete
  using (auth.uid() = user_id);

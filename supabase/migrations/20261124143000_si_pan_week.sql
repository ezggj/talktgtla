-- Weekly virtual challenge columns for 試盤.
-- Safe to run after 20261124120000_si_pan_board.sql.
-- If that table was never created, this file creates it with the week columns included.

create table if not exists public.si_pan_board (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null,
  equity_hkd numeric not null,
  display_ccy text not null default 'HKD',
  peak_hkd numeric,
  week_pnl_hkd numeric,
  week_key text,
  updated_at timestamptz not null default now(),
  constraint si_pan_nick_len check (char_length(nickname) between 1 and 12),
  constraint si_pan_nick_email check (position('@' in nickname) = 0),
  constraint si_pan_ccy check (display_ccy in ('HKD', 'USD'))
);

alter table public.si_pan_board add column if not exists peak_hkd numeric;
alter table public.si_pan_board add column if not exists week_pnl_hkd numeric;
alter table public.si_pan_board add column if not exists week_key text;

alter table public.si_pan_board enable row level security;

drop policy if exists si_pan_board_read on public.si_pan_board;
create policy si_pan_board_read on public.si_pan_board for select using (true);

drop policy if exists si_pan_board_insert on public.si_pan_board;
create policy si_pan_board_insert on public.si_pan_board for insert with check (auth.uid() = user_id);

drop policy if exists si_pan_board_update on public.si_pan_board;
create policy si_pan_board_update on public.si_pan_board for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select on public.si_pan_board to anon, authenticated;
grant insert, update on public.si_pan_board to authenticated;

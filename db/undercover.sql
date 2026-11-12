-- ============================================================
-- 投行卧底 · 网页发词（v103）
-- 在腾讯云开发控制台 → 数据库 → SQL 执行里整段粘贴运行
-- 环境：ibank-d5gq5pejl54eb2748（ap-shanghai）
--
-- 设计要点（改之前请先读完）：
-- 1. 学生不需要登录、不需要注册、不需要开匿名登录，扫一张卡输 6 位码即可。
--    他们只能通过 uc_peek(令牌) 拿到「自己那一组」的词，函数不返回 is_mole，
--    所以学生拿不到「我是不是卧底」这个字段 —— 与多端版剥字段同理。
-- 2. 学生手里那张卡上只有令牌，没有词。词始终只存在数据库和自己的手机上。
-- 3. 老师端用已登录的教师账号直接读写这两张表（RLS 只放行 teacher/admin）。
-- ============================================================

-- ---------- 表 ----------

create table if not exists public.uc_rooms (
  code       varchar(8) primary key,
  round_no   int not null default 1,
  n_seats    int not null default 12,
  pair_idx   int,
  mole_seat  int,
  order_json jsonb,
  created_by varchar(64) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.uc_seats (
  id        bigserial primary key,
  room_code varchar(8) not null references public.uc_rooms(code) on delete cascade,
  seat      int not null,
  token     varchar(12) not null unique,
  word_zh   text not null,
  word_en   text not null,
  is_mole   boolean not null default false,
  unique (room_code, seat)
);

create index if not exists idx_uc_seats_room on public.uc_seats(room_code, seat);

-- ---------- 学生取词函数 ----------
-- security definer：以函数属主身份读表，绕过 RLS，但只按令牌命中一行。
-- 注意 exclusions：不返回 is_mole、不返回同房间其他行。

create or replace function public.uc_peek(p_token text)
returns table (seat int, word_zh text, word_en text, room_code varchar)
language sql
stable
security definer
set search_path = public
as $$
  select s.seat, s.word_zh, s.word_en, s.room_code
  from public.uc_seats s
  where s.token = lower(trim(p_token))
  limit 1;
$$;

-- ---------- 教师判定函数 ----------
-- security definer 避免与 profiles 自身的 RLS 相互递归

create or replace function public.uc_is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('teacher', 'admin')
  );
$$;

-- ---------- 两层权限：GRANT + RLS ----------

grant execute on function public.uc_peek(text) to anon, authenticated;
grant execute on function public.uc_is_teacher() to authenticated;

grant select, insert, update, delete on public.uc_rooms to authenticated;
grant select, insert, update, delete on public.uc_seats to authenticated;
grant usage, select on sequence public.uc_seats_id_seq to authenticated;

alter table public.uc_rooms enable row level security;
alter table public.uc_seats enable row level security;

drop policy if exists uc_rooms_teacher_all on public.uc_rooms;
create policy uc_rooms_teacher_all on public.uc_rooms
  for all to authenticated
  using (public.uc_is_teacher())
  with check (public.uc_is_teacher());

drop policy if exists uc_seats_teacher_all on public.uc_seats;
create policy uc_seats_teacher_all on public.uc_seats
  for all to authenticated
  using (public.uc_is_teacher())
  with check (public.uc_is_teacher());

-- ============================================================
-- 自检（跑完上一段后单独执行，三项都应返回 true / 1 行）
-- ============================================================
-- select proname from pg_proc where pronamespace = 'auth'::regnamespace;   -- 确认 auth.uid 存在
-- select public.uc_peek('not-a-token');                                    -- 应返回 0 行，不报错
-- select relname, relrowsecurity from pg_class where relname in ('uc_rooms','uc_seats');  -- 两个 t

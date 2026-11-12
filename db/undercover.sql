-- ============================================================
-- 投行卧底 · 网页发词（v103）
-- 在腾讯云开发控制台 → 数据库 → SQL 编辑器里整段粘贴运行
-- 直达：https://tcb.cloud.tencent.com/dev?envId=ibank-d5gq5pejl54eb2748#/overview
-- 环境：ibank-d5gq5pejl54eb2748（ap-shanghai）
--
-- 设计要点（改之前请先读完）：
-- 1. 学生不需要登录、不需要注册、不需要开匿名登录，扫一张卡输 6 位码即可。
--    他们只能通过 uc_peek(令牌) 拿到「自己那一组」的词，函数不返回 is_mole，
--    所以学生拿不到「我是不是卧底」这个字段 —— 与多端版剥字段同理。
-- 2. 学生手里那张卡上只有令牌，没有词。词始终只存在数据库和自己的手机上。
-- 3. 老师端用已登录的教师账号直接读写这两张表（RLS 只放行 teacher/admin）。
-- 4. ★取当前用户 ID 一律走 uc_uid()，不用 auth.uid()。
--    CloudBase 官方文档给的标准写法是
--      current_setting('request.jwt.claims', true)::json->>'sub'
--    auth.uid() 是 Supabase 的函数，CloudBase 未声明提供。
--    另外 current_setting 在没有 JWT 时返回空串，直接 ''::json 会报
--    invalid input syntax for type json，所以要先 nullif 掉空串。
-- ============================================================

-- ---------- 当前用户 ID ----------

create or replace function public.uc_uid()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true), '')::json->>'sub';
$$;

grant execute on function public.uc_uid() to anon, authenticated;

-- ---------- 表 ----------

create table if not exists public.uc_rooms (
  code       varchar(8) primary key,
  round_no   int not null default 1,
  n_seats    int not null default 12,
  pair_idx   int,
  mole_seat  int,
  order_json jsonb,
  created_by varchar(64) default public.uc_uid(),
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

-- 兜底：万一表是早前某次执行留下的，默认值也一并纠正过来
alter table public.uc_rooms alter column created_by set default public.uc_uid();

-- ---------- 学生取词函数 ----------
-- security definer：以函数属主身份读表，绕过 RLS，但只按令牌命中一行。
-- 返回列就是承诺：不返回 is_mole、不返回同房间其他行。
-- 学生端拿到的是 seat + 中英词 + 房间码，永远拿不到「我是不是卧底」。

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
-- （profiles 上的策略会调本函数，本函数又要读 profiles，不绕开就无限递归）

create or replace function public.uc_is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = public.uc_uid()
      and p.role in ('teacher', 'admin')
  );
$$;

-- ---------- 两层权限：GRANT + RLS ----------
-- 两层都得过：只写 RLS 不写 GRANT 一样 403；只写 GRANT 不写 RLS 等于敞开门。

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
-- 自检（跑完上面整段后，单独选中下面四行逐条执行）
-- ============================================================
-- select public.uc_uid();                                                 -- 控制台里无 JWT，返回空值即正常，不应报错
-- select public.uc_peek('not-a-token');                                   -- 0 行，不报错
-- select relname, relrowsecurity from pg_class
--   where relname in ('uc_rooms','uc_seats');                             -- 两行都是 t

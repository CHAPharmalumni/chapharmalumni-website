-- 차 의과학대학교 약학대학 총동문회 홈페이지 — Supabase 표와 권한 규칙
-- 쓰는 법: Supabase 관리 화면의 SQL Editor에 이 파일 전체를 붙여 넣고 Run을 한 번 누른다.
-- 여러 번 실행해도 결과가 같도록 썼다(이미 있으면 건너뛰거나 다시 만든다).
-- 설계 설명: 볼트 projects/2026-CHA-Pharm-Alumni-Website/plan.md 6-1 · 6-3

-------------------------------------------------------------------------------
-- 1. 글쓰기 허용 계정 표 (editors)
--    홈페이지에서는 누구도 읽거나 고칠 수 없다. 사람이 바뀌면 관리 화면에서 이 표만 고친다.
-------------------------------------------------------------------------------
create table if not exists public.editors (
  email text primary key check (email = lower(email))
);
alter table public.editors enable row level security;
revoke all on public.editors from anon, authenticated;

-- 동문회 공용 계정만 여기 적는다. 임원 개인 계정은 공개 코드에 남기지 않으려고
-- Supabase 관리 화면의 Table Editor → editors 표에서 직접 더하고 뺀다(소문자로 적는다).
insert into public.editors (email) values
  ('admin@chapharmalumni.org')
on conflict (email) do nothing;

-------------------------------------------------------------------------------
-- 2. 「지금 로그인한 사람이 글쓰기 허용 계정인가」를 답하는 함수
--    이메일 확인을 마친 계정이고 editors 표에 있으면 true.
--    security definer: editors 표를 직접 못 읽는 사람도 「예/아니오」 답만은 받게 한다.
-------------------------------------------------------------------------------
create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.editors e on e.email = lower(u.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.is_editor() from public, anon;
grant execute on function public.is_editor() to authenticated;

-------------------------------------------------------------------------------
-- 3. 글 표 (posts)
-------------------------------------------------------------------------------
create table if not exists public.posts (
  id         text primary key default ('p-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12)),
  board      text not null check (board ~ '^[a-z]{1,20}$'),
  title      text not null check (char_length(title) between 1 and 200),
  body       text not null default '' check (char_length(body) <= 20000),
  images     text[] not null default '{}' check (cardinality(images) <= 30),
  pinned     boolean not null default false,
  author     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 글쓴이 · 쓴 시각은 저장 서비스가 정한다. 화면에서 보낸 값은 무시한다.
create or replace function public.posts_stamp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.author := (select lower(u.email) from auth.users u where u.id = auth.uid());
    new.created_at := now();
  else
    new.id := old.id;
    new.author := old.author;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.posts_stamp() from public, anon, authenticated;

drop trigger if exists posts_stamp on public.posts;
create trigger posts_stamp
  before insert or update on public.posts
  for each row execute function public.posts_stamp();

alter table public.posts enable row level security;

-- 칸 단위 권한: 글쓴이 이메일(author)은 홈페이지에서 아무도 읽을 수 없다(2026-11-24 부회장 결정).
revoke all on public.posts from anon, authenticated;
grant select (id, board, title, body, images, pinned, created_at, updated_at) on public.posts to anon, authenticated;
grant insert (board, title, body, images, pinned) on public.posts to authenticated;
grant update (board, title, body, images, pinned) on public.posts to authenticated;
grant delete on public.posts to authenticated;

-- 줄 단위 권한(RLS): 읽기는 누구나, 쓰기 · 고치기 · 지우기는 글쓰기 허용 계정만.
drop policy if exists "posts: 누구나 읽기" on public.posts;
create policy "posts: 누구나 읽기" on public.posts
  for select to anon, authenticated using (true);

drop policy if exists "posts: 허용 계정만 쓰기" on public.posts;
create policy "posts: 허용 계정만 쓰기" on public.posts
  for insert to authenticated with check ((select public.is_editor()));

drop policy if exists "posts: 허용 계정만 고치기" on public.posts;
create policy "posts: 허용 계정만 고치기" on public.posts
  for update to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

drop policy if exists "posts: 허용 계정만 지우기" on public.posts;
create policy "posts: 허용 계정만 지우기" on public.posts
  for delete to authenticated using ((select public.is_editor()));

-------------------------------------------------------------------------------
-- 4. 사진 보관함 (photos)
--    누구나 사진 주소로 볼 수 있다(공개 보관함). 올리기 · 지우기는 글쓰기 허용 계정만.
--    한 장 5MB 이하, JPEG만(화면이 올리기 전에 긴 쪽 1600픽셀 JPEG로 줄인다).
-------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos: 허용 계정만 목록 보기" on storage.objects;
create policy "photos: 허용 계정만 목록 보기" on storage.objects
  for select to authenticated using (bucket_id = 'photos' and (select public.is_editor()));

drop policy if exists "photos: 허용 계정만 올리기" on storage.objects;
create policy "photos: 허용 계정만 올리기" on storage.objects
  for insert to authenticated with check (bucket_id = 'photos' and (select public.is_editor()));

drop policy if exists "photos: 허용 계정만 지우기" on storage.objects;
create policy "photos: 허용 계정만 지우기" on storage.objects
  for delete to authenticated using (bucket_id = 'photos' and (select public.is_editor()));

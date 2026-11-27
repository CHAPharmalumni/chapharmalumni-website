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

-- 직함 칸(2026-11-27 추가). 글 화면에 「작성 총무이사」처럼 방문자에게도 보인다(부회장 결정 2026-11-27).
-- 이메일은 계속 숨기고 직함만 보인다. 직함은 Table Editor → editors 표의 role 칸에서 계정마다 적는다.
-- 비워 두면 「총동문회」로 보인다. 사람이 바뀌면 role을 고치고, 이미 쓴 글에는 쓸 때의 직함이 남는다.
alter table public.editors add column if not exists role text;
alter table public.editors drop constraint if exists editors_role_check;
alter table public.editors add constraint editors_role_check check (role is null or char_length(role) between 1 and 30);

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
  files      jsonb not null default '[]' check (jsonb_typeof(files) = 'array' and jsonb_array_length(files) <= 10),
  pinned     boolean not null default false,
  author     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 첨부파일 칸(2026-11-25 추가). 이미 만든 표에는 칸만 더한다. 내용: [{"name": 원래 파일 이름, "path": 보관함 안 위치, "size": 바이트}]
alter table public.posts add column if not exists files jsonb not null default '[]';
alter table public.posts drop constraint if exists posts_files_check;
alter table public.posts add constraint posts_files_check
  check (jsonb_typeof(files) = 'array' and jsonb_array_length(files) <= 10);

-- 작성자 · 수정자 칸(2026-11-27 추가).
--   author_role: 처음 쓴 사람의 그때 직함(방문자에게 보임) / updated_by · updated_by_role: 마지막으로 고친 사람의 이메일(숨김)과 그때 직함(보임)
alter table public.posts add column if not exists author_role text;
alter table public.posts add column if not exists updated_by text;
alter table public.posts add column if not exists updated_by_role text;

-- 계정의 지금 직함. editors 표에 없거나 role이 비었으면 「총동문회」.
create or replace function public.editor_role(p_email text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select nullif(trim(e.role), '') from public.editors e where e.email = lower(p_email)), '총동문회');
$$;
revoke all on function public.editor_role(text) from public, anon, authenticated;

-- 글쓴이 · 고친 사람 · 시각은 저장 서비스가 정한다. 화면에서 보낸 값은 무시한다.
create or replace function public.posts_stamp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.author := (select lower(u.email) from auth.users u where u.id = auth.uid());
    new.author_role := public.editor_role(new.author);
    new.updated_by := null;
    new.updated_by_role := null;
    new.created_at := now();
  else
    new.id := old.id;
    new.author := old.author;
    new.author_role := old.author_role;
    new.updated_by := (select lower(u.email) from auth.users u where u.id = auth.uid());
    new.updated_by_role := case when new.updated_by is null then '관리 화면' else public.editor_role(new.updated_by) end;
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

-- 칸을 더하기 전에 쓴 글에도 작성자 직함을 채운다. 고친 기록이 생기지 않도록 자동 기록을 잠시 끄고 채운다.
alter table public.posts disable trigger user;
update public.posts set author_role = public.editor_role(author) where author_role is null and author is not null;
alter table public.posts enable trigger user;

-------------------------------------------------------------------------------
-- 3-1. 글 기록표 (post_log) — 2026-11-27 추가
--      글을 쓰고 · 고치고 · 지울 때마다 누가, 언제, 어떤 글에 무엇을 했는지 한 줄씩 남는다.
--      지운 글도 제목과 지운 사람이 남는다. 홈페이지에서는 아무도 읽을 수 없고 관리 화면에서만 본다.
--      관리 화면(Table Editor)에서 직접 고치거나 지우면 사람 칸이 비고 직함 칸에 「관리 화면」이 적힌다.
-------------------------------------------------------------------------------
create table if not exists public.post_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  action     text not null check (action in ('작성', '수정', '삭제')),
  post_id    text not null,
  board      text,
  post_title text,
  actor      text,
  actor_role text
);
alter table public.post_log enable row level security;
revoke all on public.post_log from anon, authenticated;

create or replace function public.posts_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text := (select lower(u.email) from auth.users u where u.id = auth.uid());
  r public.posts;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  insert into public.post_log (action, post_id, board, post_title, actor, actor_role)
  values (case tg_op when 'INSERT' then '작성' when 'UPDATE' then '수정' else '삭제' end,
          r.id, r.board, r.title, who,
          case when who is null then '관리 화면' else public.editor_role(who) end);
  return null;
end;
$$;
revoke all on function public.posts_log() from public, anon, authenticated;

drop trigger if exists posts_log on public.posts;
create trigger posts_log
  after insert or update or delete on public.posts
  for each row execute function public.posts_log();

alter table public.posts enable row level security;

-- 칸 단위 권한: 글쓴이 · 고친 사람 이메일(author · updated_by)은 홈페이지에서 아무도 읽을 수 없다(2026-11-24 부회장 결정).
-- 직함(author_role · updated_by_role)은 누구나 읽는다(2026-11-27 부회장 결정).
revoke all on public.posts from anon, authenticated;
grant select (id, board, title, body, images, files, pinned, author_role, updated_by_role, created_at, updated_at) on public.posts to anon, authenticated;
grant insert (board, title, body, images, files, pinned) on public.posts to authenticated;
grant update (board, title, body, images, files, pinned) on public.posts to authenticated;
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

-------------------------------------------------------------------------------
-- 5. 첨부파일 보관함 (files) — 2026-11-25 추가
--    누구나 파일 주소로 내려받을 수 있다(공개 보관함). 올리기 · 지우기는 글쓰기 허용 계정만.
--    한 파일 20MB 이하. 받는 종류는 PDF · 한글 · 워드 · 엑셀 · 파워포인트 · 그림 파일뿐이다.
--    웹 화면(html · svg) · 실행 파일은 막는다: 남이 만든 화면이 동문회 저장 주소로 열리는 일을 막으려는 것.
--    종류 제한은 확장자(아래 정책)와 파일 형식 표시(allowed_mime_types) 두 곳에 건다. 화면(js/store.js의 FILE_TYPES)도 같은 목록을 쓴다.
-------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('files', 'files', true, 20971520, array[
  'application/pdf',
  'application/x-hwp', 'application/vnd.hancom.hwpx',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "files: 허용 계정만 목록 보기" on storage.objects;
create policy "files: 허용 계정만 목록 보기" on storage.objects
  for select to authenticated using (bucket_id = 'files' and (select public.is_editor()));

drop policy if exists "files: 허용 계정만 올리기" on storage.objects;
create policy "files: 허용 계정만 올리기" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'files'
    and (select public.is_editor())
    and lower(storage.extension(name)) = any (array['pdf','hwp','hwpx','doc','docx','xls','xlsx','ppt','pptx','jpg','jpeg','png','gif','webp'])
  );

drop policy if exists "files: 허용 계정만 지우기" on storage.objects;
create policy "files: 허용 계정만 지우기" on storage.objects
  for delete to authenticated using (bucket_id = 'files' and (select public.is_editor()));

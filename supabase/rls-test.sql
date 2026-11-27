-- 권한 규칙 거절 시험: 「로그인은 했지만 글쓰기 허용 계정이 아닌 사람」이 화면을 거치지 않고 직접 시도하면 막히는지 본다.
-- 쓰는 법: Supabase SQL Editor에 전체를 붙여 넣고 Run. 결과 표의 「결과」가 모두 「기대」와 같으면 통과.
-- 시도가 뚫리더라도 바뀐 내용은 곧바로 되돌린다(각 시도 끝에 일부러 오류를 내어 취소한다). 실제 글은 바뀌지 않는다.
-- 가짜 로그인 정보에는 허용 계정의 이메일(admin@)을 적어 둔다. 이메일을 속여 적어도 통하지 않는지까지 본다.

create temp table if not exists rls_test (no int, 시험 text, 기대 text, 결과 text);
truncate rls_test;
grant all on rls_test to authenticated;
insert into rls_test select 0, '시험 글의 글쓴이 기록(관리자만 보임)', '임원 이메일', coalesce((select author from public.posts order by created_at limit 1), '(글 없음)');
insert into rls_test select 0, '시험 글의 작성자 직함(누구나 보임)', '직함 또는 총동문회', coalesce((select author_role from public.posts order by created_at limit 1), '(비어 있음)');

set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","email":"admin@chapharmalumni.org"}', false);

do $$
declare n int; b boolean;
begin
  begin
    insert into public.posts (board, title, body) values ('notice', '거절 시험', 'x');
    raise exception '뚫림';
  exception when others then
    insert into rls_test values (1, '허용 안 된 계정으로 글쓰기', '거절', case when sqlerrm = '뚫림' then '통과됨(문제)' else '거절' end);
  end;

  begin
    update public.posts set title = '거절 시험' where true;
    get diagnostics n = row_count;
    raise exception 'rows=%', n;
  exception when others then
    insert into rls_test values (2, '허용 안 된 계정으로 남의 글 고치기', '0건', case when sqlerrm like 'rows=%' then replace(sqlerrm, 'rows=', '') || '건' else '거절' end);
  end;

  begin
    delete from public.posts where true;
    get diagnostics n = row_count;
    raise exception 'rows=%', n;
  exception when others then
    insert into rls_test values (3, '허용 안 된 계정으로 남의 글 지우기', '0건', case when sqlerrm like 'rows=%' then replace(sqlerrm, 'rows=', '') || '건' else '거절' end);
  end;

  begin
    perform 1 from public.editors;
    raise exception '뚫림';
  exception when others then
    insert into rls_test values (4, '글쓰기 허용 표 읽기', '거절', case when sqlerrm = '뚫림' then '읽힘(문제)' else '거절' end);
  end;

  begin
    perform author from public.posts limit 1;
    raise exception '뚫림';
  exception when others then
    insert into rls_test values (5, '글쓴이 이메일 칸 읽기', '거절', case when sqlerrm = '뚫림' then '읽힘(문제)' else '거절' end);
  end;

  b := public.is_editor();
  insert into rls_test values (6, '「허용 계정인가」 답', 'false', b::text);

  begin
    insert into storage.objects (bucket_id, name) values ('photos', 'rls-test.jpg');
    raise exception '뚫림';
  exception when others then
    insert into rls_test values (7, '허용 안 된 계정으로 사진 올리기', '거절', case when sqlerrm = '뚫림' then '통과됨(문제)' else '거절' end);
  end;

  begin
    insert into storage.objects (bucket_id, name) values ('files', 'rls-test.pdf');
    raise exception '뚫림';
  exception when others then
    insert into rls_test values (8, '허용 안 된 계정으로 첨부파일 올리기', '거절', case when sqlerrm = '뚫림' then '통과됨(문제)' else '거절' end);
  end;

  begin
    delete from storage.objects where bucket_id in ('photos', 'files');
    get diagnostics n = row_count;
    raise exception 'rows=%', n;
  exception when others then
    insert into rls_test values (9, '허용 안 된 계정으로 사진 · 첨부파일 지우기', '0건 또는 거절', case when sqlerrm like 'rows=%' then replace(sqlerrm, 'rows=', '') || '건' else '거절' end);
  end;

  -- 2026-11-27 추가: 고친 사람 이메일 · 글 기록표는 막히고, 직함은 읽힌다.
  begin
    perform updated_by from public.posts limit 1;
    raise exception '뚫림';
  exception when others then
    insert into rls_test values (10, '고친 사람 이메일 칸 읽기', '거절', case when sqlerrm = '뚫림' then '읽힘(문제)' else '거절' end);
  end;

  begin
    perform 1 from public.post_log;
    raise exception '뚫림';
  exception when others then
    insert into rls_test values (11, '글 기록표 읽기', '거절', case when sqlerrm = '뚫림' then '읽힘(문제)' else '거절' end);
  end;

  begin
    perform author_role, updated_by_role from public.posts limit 1;
    insert into rls_test values (12, '작성자 · 수정자 직함 칸 읽기', '읽힘', '읽힘');
  exception when others then
    insert into rls_test values (12, '작성자 · 수정자 직함 칸 읽기', '읽힘', '거절(문제)');
  end;

  begin
    update public.posts set author_role = '회장' where true;
    raise exception '뚫림';
  exception when others then
    insert into rls_test values (13, '직함 칸을 화면에서 직접 고치기', '거절', case when sqlerrm = '뚫림' then '통과됨(문제)' else '거절' end);
  end;
end $$;

reset role;
insert into rls_test select 14, '이번 시험으로 글 기록표에 생긴 줄', '0줄', count(*)::text || '줄' from public.post_log where post_title = '거절 시험' and at > now() - interval '1 minute';
select * from rls_test order by no;

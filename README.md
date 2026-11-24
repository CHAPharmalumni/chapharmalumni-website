# 차 의과학대학교 약학대학 총동문회 홈페이지

회장님 초안(cha-pharmacy-alumni-design.inyoung3931.chatgpt.site, 2026-11-23 내려받음)의 디자인을 그대로 쓰고,
게시판과 임원 글쓰기 기능을 더했다. 글과 사진은 Supabase에 저장하고, 임원은 동문회 구글 계정으로 로그인한다.
아직 인터넷에 공개하지 않았다.

## 내 컴퓨터에서 열어 보기

```bash
cd ~/chapharmalumni-website && python3 -m http.server 8765 --bind ::1
```

그다음 브라우저에서 http://localhost:8765 를 연다(`127.0.0.1`이 아니라 `localhost`로 열어야 구글 로그인 뒤 돌아온다).
글은 실제 Supabase에 저장되므로, 여기서 쓴 글은 공개한 홈페이지에도 그대로 보인다.

## Supabase 설정 파일

- `supabase/schema.sql`: 표 · 권한 규칙 · 사진 보관함. Supabase 관리 화면의 SQL Editor에서 실행한다.
- `supabase/rls-test.sql`: 허용되지 않은 계정의 거절 시험. 권한 규칙을 바꾼 뒤 실행한다.
- 글쓰기 허용 계정 목록은 이 폴더에 두지 않는다. Supabase 관리 화면의 Table Editor → `editors` 표에서 고친다.

## 설명 문서

설명 문서는 이 폴더에 두지 않고 SsubiTwin 볼트의 `projects/2026-CHA-Pharm-Alumni-Website/`에 둔다.

- `spec.md`: 홈페이지의 목적 · 화면 · 기능 · 권한 · 저장 서비스 비교
- `plan.md`: 파일 구성, 저장 담당 파일(`js/store.js`) 설계, 만드는 순서, 확인 목록
- `state.md`: 지금 상태와 남은 일

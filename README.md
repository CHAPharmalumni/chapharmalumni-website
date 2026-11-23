# 차 의과학대학교 약학대학 총동문회 홈페이지 (시안)

회장님 초안(cha-pharmacy-alumni-design.inyoung3931.chatgpt.site, 2026-11-23 내려받음)의 디자인을 그대로 쓰고,
게시판과 임원 글쓰기 기능을 더한 시안이다. 아직 인터넷에 공개하지 않았다.

## 내 컴퓨터에서 열어 보기

```bash
cd ~/chapharmalumni-website && python3 -m http.server 8765
```

그다음 브라우저에서 http://127.0.0.1:8765 를 연다. 맨 아래 「관리자 로그인」에 `admin@chapharmalumni.org`를 넣으면 글쓰기 버튼이 나타난다.
시안에서는 글이 그 브라우저 안에만 저장된다. 다른 컴퓨터나 다른 브라우저에서는 보이지 않는다.

## 설명 문서

설명 문서는 이 폴더에 두지 않고 SsubiTwin 볼트의 `projects/2026-CHA-Pharm-Alumni-Website/`에 둔다.

- `spec.md`: 홈페이지의 목적 · 화면 · 기능 · 권한 · 저장 서비스 비교
- `plan.md`: 파일 구성, 저장 담당 파일(`js/store.js`) 설계, 만드는 순서, 확인 목록
- `state.md`: 지금 상태와 남은 일

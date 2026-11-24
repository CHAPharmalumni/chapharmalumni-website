'use strict';
// 홈페이지 전체 설정. 게시판 목록과 글쓰기 권한을 여기 한곳에서만 고친다.
window.SITE = {
  name: '차 의과학대학교 약학대학 총동문회',
  englishName: 'CHA University College of Pharmacy Alumni Association',

  // 정식으로 열기 전까지 모든 화면 맨 위에 「준비 중」 안내를 보인다. 정식으로 열 때 false로 바꾸고,
  // HTML 6개의 <meta name="robots" content="noindex">(검색 제외 표시)도 함께 지운다.
  preparing: true,

  // 게시판 목록. id는 주소와 저장에 쓰이므로 한번 정하면 바꾸지 않는다(2026-11-25 메뉴 개편 때 새로 정함).
  // group: 같은 group의 게시판은 한 페이지(위 메뉴 하나)에서 탭으로 묶어 보여 준다.
  // photo: true인 게시판은 사진 바둑판으로 보여 주고, 글에 사진이 한 장 이상 있어야 한다.
  boards: [
    { id: 'notice',  name: '공지사항',  group: 'notice',  tag: '공지' },
    { id: 'event',   name: '행사 안내', group: 'notice',  tag: '행사' },
    { id: 'family',  name: '경조사',    group: 'alumni',  tag: '경조사' },
    { id: 'alumni',  name: '동문 소식', group: 'alumni',  tag: '동문' },
    { id: 'gallery', name: '갤러리',    group: 'alumni',  tag: '사진', photo: true },
    { id: 'rules',   name: '회칙·규정', group: 'archive', tag: '규정' },
    { id: 'minutes', name: '회의 자료', group: 'archive', tag: '회의' },
    { id: 'forms',   name: '서식',      group: 'archive', tag: '서식' }
  ],
  groups: {
    notice:  { name: '알림',      eyebrow: 'NOTICE',      description: '총동문회의 공지와 행사 일정을 알려 드립니다.' },
    alumni:  { name: '동문 소식', eyebrow: 'ALUMNI NEWS', description: '동문의 경조사와 소식, 사진을 전합니다.' },
    archive: { name: '자료실',    eyebrow: 'ARCHIVE',     description: '회칙과 규정, 회의 자료, 서식을 모아 둡니다.' }
  },

  // 첫 화면과 회원 가입 안내 화면에서 쓰는 연락처와 후원 계좌.
  kakaoChannel: 'https://pf.kakao.com/_VxmwBX',

  // 저장 서비스(Supabase) 연결 정보. 공개용 키는 누구나 볼 수 있는 것이 정상이고, 지키는 일은 권한 규칙이 한다.
  // secret · service_role 키는 절대 여기에 넣지 않는다.
  // 글을 쓸 수 있는 계정 목록은 코드가 아니라 Supabase의 editors 표에만 둔다(supabase/schema.sql).
  supabase: {
    url: 'https://efcuagemrmnijiaflbat.supabase.co',
    publishableKey: 'sb_publishable_7Ga1Z1NIjEYh215txEVNhQ_uN2YYYu4'
  }
};

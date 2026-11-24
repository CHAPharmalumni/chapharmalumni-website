'use strict';
// 홈페이지 전체 설정. 게시판 목록과 글쓰기 권한을 여기 한곳에서만 고친다.
window.SITE = {
  name: '차 의과학대학교 약학대학 총동문회',
  englishName: 'CHA University College of Pharmacy Alumni Association',

  // 정식으로 열기 전까지 모든 화면 맨 위에 「준비 중」 안내를 보인다. 정식으로 열 때 false로 바꾸고,
  // HTML 5개의 <meta name="robots" content="noindex">(검색 제외 표시)도 함께 지운다.
  preparing: true,

  // 게시판 목록. id는 주소와 저장에 쓰이므로 한번 정하면 바꾸지 않는다.
  // group: 같은 group의 게시판은 한 페이지에서 탭으로 묶어 보여 준다.
  boards: [
    { id: 'notice',  name: '공지사항',  group: 'news',    tag: '공지' },
    { id: 'event',   name: '행사·모임', group: 'news',    tag: '행사' },
    { id: 'family',  name: '경조사',    group: 'news',    tag: '경조사' },
    { id: 'alumni',  name: '동문 소식', group: 'news',    tag: '동문' },
    { id: 'gallery', name: '갤러리',    group: 'gallery', tag: '사진', photo: true },
    { id: 'archive', name: '자료실',    group: 'archive', tag: '자료' }
  ],
  groups: {
    news:    { name: '소식',   eyebrow: 'ALUMNI NEWS',    description: '공지사항, 행사, 경조사와 동문의 소식을 전합니다.' },
    gallery: { name: '갤러리', eyebrow: 'GALLERY',        description: '함께한 순간을 사진으로 남깁니다.' },
    archive: { name: '자료실', eyebrow: 'ARCHIVE',        description: '회칙, 서식, 회의 자료를 모아 둡니다.' }
  },

  // 저장 서비스(Supabase) 연결 정보. 공개용 키는 누구나 볼 수 있는 것이 정상이고, 지키는 일은 권한 규칙이 한다.
  // secret · service_role 키는 절대 여기에 넣지 않는다.
  // 글을 쓸 수 있는 계정 목록은 코드가 아니라 Supabase의 editors 표에만 둔다(supabase/schema.sql).
  supabase: {
    url: 'https://efcuagemrmnijiaflbat.supabase.co',
    publishableKey: 'sb_publishable_7Ga1Z1NIjEYh215txEVNhQ_uN2YYYu4'
  }
};

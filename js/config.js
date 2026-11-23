'use strict';
// 홈페이지 전체 설정. 게시판 목록과 글쓰기 권한을 여기 한곳에서만 고친다.
window.SITE = {
  name: '차 의과학대학교 약학대학 총동문회',
  englishName: 'CHA University College of Pharmacy Alumni Association',

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

  // 글을 쓸 수 있는 구글 계정. 실제 운영 때는 Firebase 보안 규칙에도 같은 목록을 적는다.
  // 시안 단계에서는 동문회 공용 계정만 넣어 두었다. 임원 개인 주소는 연결 단계에서 추가한다.
  editors: ['admin@chapharmalumni.org']
};

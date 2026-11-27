'use strict';
// 회칙 · 규정 화면. 주소 예: rules.html?doc=privacy (개인정보 처리방침), rules.html?doc=bylaws#bylaws-7 (운영규정집 제7장)
// 세 문서 본문은 rules.html에 모두 들어 있고, 고른 문서 하나만 보여 준다.
(function () {
  const docs = [...document.querySelectorAll('.rules-doc')];
  const names = { charter: '회칙', bylaws: '운영규정집', privacy: '개인정보 처리방침' };
  const pick = UI.param('doc');
  const current = names[pick] ? pick : 'charter';
  docs.forEach(d => { d.hidden = d.dataset.doc !== current; });
  document.querySelectorAll('#rules-tabs a').forEach(a => a.setAttribute('aria-selected', String(a.dataset.doc === current)));
  document.title = `${names[current]} | ${SITE.name}`;
  UI.markNav(SITE.groups.archive.home);
  // 첫째 줄: 자료실 게시판 탭(회칙·규정 · 회의 자료 · 서식). 둘째 줄(#rules-tabs)은 rules.html에 적혀 있다.
  document.getElementById('archive-tabs').innerHTML = SITE.boards.filter(b => b.group === 'archive')
    .map(b => `<a role="tab" aria-selected="${b.page === 'rules.html'}" href="${UI.tabHref(b)}">${UI.esc(b.name)}</a>`).join('');
  // 숨겨져 있던 문서를 보인 뒤에 주소의 #장 위치로 다시 이동한다.
  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
})();

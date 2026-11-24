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
  UI.markNav('board.html?g=archive');
  // 숨겨져 있던 문서를 보인 뒤에 주소의 #장 위치로 다시 이동한다.
  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
})();

'use strict';
/*
 * 모든 페이지가 함께 쓰는 머리말(로고·메뉴)과 꼬리말, 관리자 로그인 창, 공통 도우미 함수.
 * 머리말을 고칠 때는 이 파일 한곳만 고친다.
 */
(function () {
  const ICONS = `<svg class="icon-library" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>
  <symbol id="i-people" viewBox="0 0 32 32"><circle cx="12" cy="10" r="4"/><path d="M4 26v-3a8 8 0 0 1 16 0v3M22 6a4 4 0 0 1 0 8M25 18a7 7 0 0 1 4 6v2"/></symbol>
  <symbol id="i-calendar" viewBox="0 0 32 32"><rect x="4" y="6" width="24" height="23" rx="2"/><path d="M10 3v7M22 3v7M4 14h24M10 20h4M19 20h3M10 25h4"/></symbol>
  <symbol id="i-wallet" viewBox="0 0 32 32"><path d="M27 11V7a2 2 0 0 0-2-2L6 9a3 3 0 0 0-2 3v14a2 2 0 0 0 2 2h22V11H7"/><path d="M28 17h-8v6h8M24 20h1"/></symbol>
  <symbol id="i-heart" viewBox="0 0 32 32"><path d="m16 28-11-11C-3 7 10-1 16 8 22-1 35 7 27 17Z"/></symbol>
  <symbol id="i-file" viewBox="0 0 32 32"><path d="M7 3h12l7 7v19H7ZM19 3v8h7M11 17h10M11 22h10"/></symbol>
  <symbol id="i-chat" viewBox="0 0 32 32"><path d="M28 15c0 7-6 11-13 11h-2l-7 4 2-7C-4 12 6 1 17 3c7 0 11 5 11 12Z"/><path d="M9 14h1M15 14h1M21 14h1"/></symbol>
  <symbol id="i-search" viewBox="0 0 32 32"><circle cx="14" cy="14" r="9"/><path d="m21 21 8 8"/></symbol>
  <symbol id="i-pin" viewBox="0 0 32 32"><path d="M26 13c0 8-10 16-10 16S6 21 6 13a10 10 0 0 1 20 0Z"/><circle cx="16" cy="13" r="3"/></symbol>
  <symbol id="i-plus" viewBox="0 0 32 32"><path d="M16 6v20M6 16h20"/></symbol>
  <symbol id="i-pen" viewBox="0 0 32 32"><path d="M21 5l6 6L12 26l-7 1 1-7Z"/><path d="M18 8l6 6"/></symbol>
  <symbol id="i-clip" viewBox="0 0 32 32"><path d="m27 15-11 11a7 7 0 0 1-10-10L18 4a4.5 4.5 0 0 1 7 7L13 23a2 2 0 0 1-3-3l10-10"/></symbol>
  <symbol id="i-image" viewBox="0 0 32 32"><rect x="4" y="6" width="24" height="20" rx="2"/><circle cx="12" cy="13" r="2.5"/><path d="m4 23 7-7 6 6 4-4 7 7"/></symbol>
</defs></svg>`;

  const NAV = [
    { href: 'about.html', label: '동문회 소개', key: 'about' },
    { href: 'board.html?g=notice', label: '알림', key: 'notice' },
    { href: 'board.html?g=alumni', label: '동문 소식', key: 'alumni' },
    { href: 'board.html?g=archive', label: '자료실', key: 'archive' }
  ];

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // 본문은 HTML을 받지 않고 글자로만 저장한다. 줄바꿈과 주소(링크)만 살려서 보여 준다.
  function renderBody(text) {
    return esc(text).split(/\n{2,}/).map(block => {
      const html = block.replace(/\n/g, '<br>')
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
      return `<p>${html}</p>`;
    }).join('');
  }
  const pad = n => String(n).padStart(2, '0');
  function formatDate(iso) { const d = new Date(iso); return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`; }
  const param = k => new URLSearchParams(location.search).get(k);
  const board = id => SITE.boards.find(b => b.id === id);

  function header(active) {
    const nav = NAV.map(n => `<a href="${n.href}"${n.key === active ? ' aria-current="page"' : ''}>${n.label}</a>`).join('');
    return `${ICONS}
<a class="skip-link" href="#main">본문 바로가기</a>
${SITE.preparing ? '<div class="preparing-bar" role="note"><div class="wrap">홈페이지를 준비하고 있습니다. 정식으로 열기 전이라 내용이 바뀔 수 있습니다.</div></div>' : ''}
<div class="utility"><div class="wrap utility-inner"><span class="utility-name official-name">${SITE.englishName}</span><div><a href="https://www.cha.ac.kr/" target="_blank" rel="noopener">차 의과학대학교</a><i></i><a href="https://pharmacy.cha.ac.kr/" target="_blank" rel="noopener">약학대학</a></div></div></div>
<div class="admin-bar" id="admin-bar" hidden></div>
<header class="header" id="top"><div class="wrap header-inner">
  <a href="index.html" class="brand brand--dual" aria-label="${SITE.name} 홈"><span class="school-identity"><img src="assets/cha-logo.png" alt="학교마크와 차 의과학대학교 CHA UNIVERSITY" width="2120" height="414"></span><span class="brand-divider" aria-hidden="true"></span><span class="alumni-identity"><img class="alumni-emblem" src="assets/alumni-emblem-2026.png" alt="약학대학 총동문회 엠블럼" width="559" height="559"><span class="brand-label"><small>약학대학</small><strong>총동문회</strong></span></span></a>
  <nav class="desktop-nav" aria-label="주 메뉴">${nav}</nav>
  <div class="header-actions"><button class="search-button" data-open-search aria-label="사이트 검색"><svg><use href="#i-search"/></svg></button><a class="member-button" href="join.html"${active === 'join' ? ' aria-current="page"' : ''}>회원 가입 안내</a><button class="menu-toggle" aria-label="메뉴 열기" aria-expanded="false" aria-controls="mobile-nav"><span></span><span></span></button></div>
</div><nav class="mobile-nav" id="mobile-nav" aria-label="모바일 메뉴" hidden>${nav}<a href="join.html">회원 가입 안내</a><button data-open-search>사이트 검색</button></nav></header>`;
  }

  function footer() {
    return `<footer><div class="wrap footer-top"><a href="index.html" class="footer-brand"><img src="assets/cha-logo.png" alt="차 의과학대학교" width="2120" height="414"><span>약학대학 총동문회</span></a><div class="footer-links"><a href="rules.html">회칙 및 규정</a><a class="privacy-link" href="rules.html?doc=privacy">개인정보 처리방침</a><a href="about.html#contact">문의 안내</a><button data-admin-login>관리자 로그인</button></div></div><div class="wrap footer-bottom"><p>${SITE.name}<br><span>Copyright © ${SITE.englishName}.</span></p><p class="footer-note"><span>사진: 차 의과학대학교·약학대학</span></p></div></footer>
<dialog id="login-dialog" class="small-dialog" aria-labelledby="login-title"><button class="dialog-close" data-close aria-label="닫기">×</button>
  <p class="dialog-kicker">ADMIN</p><h2 class="dialog-title" id="login-title">관리자 로그인</h2>
  <form id="login-form" class="dialog-body">
    <p>글쓰기는 등록된 임원의 동문회 구글 계정(@chapharmalumni.org)만 할 수 있습니다.</p>
    <p class="form-error" id="login-error" role="alert"></p>
    <button class="dialog-primary google-button" type="submit">Google 계정으로 로그인</button>
  </form>
</dialog>
<dialog id="search-dialog" class="small-dialog" aria-labelledby="search-title"><button class="dialog-close" data-close aria-label="닫기">×</button>
  <p class="dialog-kicker">SEARCH</p><h2 class="dialog-title" id="search-title">무엇을 찾으시나요?</h2>
  <form action="board.html" class="dialog-body"><input type="hidden" name="g" value="all"><input class="search-input" type="search" name="q" placeholder="예: 출범식, 회비, 경조사" autocomplete="off" required><button class="dialog-primary" type="submit">검색</button></form>
</dialog>`;
  }

  function renderAdminBar(user) {
    const bar = document.getElementById('admin-bar');
    if (!bar) return;
    if (!user) { bar.hidden = true; bar.innerHTML = ''; return; }
    const ok = Store.isEditor(user);
    bar.hidden = false;
    bar.innerHTML = `<div class="wrap admin-inner"><span>${ok ? '관리자' : '등록된 임원 계정이 아닙니다(읽기만 가능)'} · ${esc(user.email)}${Store.mode === 'local' ? ' <em>(시안: 이 브라우저에만 저장됩니다)</em>' : ''}</span><div>${ok ? '<a href="write.html">글쓰기</a>' : ''}<button data-sign-out>로그아웃</button></div></div>`;
    document.body.classList.toggle('is-editor', ok);
  }

  function mount() {
    const active = document.body.dataset.page;
    document.getElementById('site-header').outerHTML = header(active);
    document.getElementById('site-footer').outerHTML = footer();

    const toggle = document.querySelector('.menu-toggle'), mnav = document.getElementById('mobile-nav');
    const closeMobile = () => { mnav.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', '메뉴 열기'); };
    toggle.addEventListener('click', () => { const show = mnav.hidden; mnav.hidden = !show; toggle.setAttribute('aria-expanded', String(show)); toggle.setAttribute('aria-label', show ? '메뉴 닫기' : '메뉴 열기'); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMobile(); });

    const login = document.getElementById('login-dialog'), search = document.getElementById('search-dialog');
    document.addEventListener('click', e => {
      if (e.target.closest('[data-admin-login]')) { login.showModal(); login.querySelector('.google-button').focus(); }
      if (e.target.closest('[data-open-search]')) { closeMobile(); search.showModal(); search.querySelector('input[type=search]').focus(); }
      if (e.target.closest('[data-close]')) e.target.closest('dialog').close();
      if (e.target.closest('[data-sign-out]')) Store.signOut().then(() => location.reload());
      if (e.target.tagName === 'DIALOG') e.target.close();
    });
    document.getElementById('login-form').addEventListener('submit', async e => {
      e.preventDefault();
      const err = document.getElementById('login-error'); err.textContent = '';
      try { await Store.signIn(); } // 구글 로그인 화면으로 넘어갔다가 이 화면으로 돌아온다
      catch (ex) { err.textContent = ex.message; }
    });
    Store.onAuthChange(renderAdminBar);
  }

  function markNav(href){document.querySelectorAll('[aria-current=page]').forEach(a=>a.removeAttribute('aria-current'));document.querySelectorAll(`.desktop-nav a[href="${href}"],.mobile-nav a[href="${href}"]`).forEach(a=>a.setAttribute('aria-current','page'))}
  window.UI = { esc, renderBody, formatDate, param, board, mount, markNav };
  mount();
})();

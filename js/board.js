'use strict';
// 게시판 목록 화면. 주소 예: board.html?g=notice (알림 전체), board.html?g=notice&b=event (행사 안내만), board.html?g=all&q=출범식 (검색)
(async function () {
  const PAGE = 12;
  const q = UI.param('q') || '';
  const g = UI.param('g') || 'notice';
  const groupId = q ? 'all' : (SITE.groups[g] ? g : 'notice');
  let current = UI.param('b');
  const boards = groupId === 'all' ? SITE.boards : SITE.boards.filter(b => b.group === groupId);
  if (current && !boards.some(b => b.id === current)) current = null;
  if (!current && boards.length === 1) current = boards[0].id;
  // 자료실처럼 home이 있는 묶음은 「전체」 탭이 없다. 탭을 고르지 않았거나 page가 있는 게시판을 고르면 그 화면으로 보낸다.
  const home = q ? null : SITE.groups[groupId]?.home;
  if (home && (!current || UI.board(current)?.page)) { location.replace(UI.board(current)?.page || home); return; }

  document.body.dataset.page = groupId;
  const group = SITE.groups[groupId] || { name: '검색', eyebrow: 'SEARCH', description: '' };
  document.getElementById('page-eyebrow').textContent = group.eyebrow;
  document.getElementById('page-title').textContent = q ? `「${q}」 검색 결과` : group.name;
  document.getElementById('page-desc').textContent = q ? '모든 게시판에서 찾았습니다.' : group.description;
  document.title = `${q ? '검색' : group.name} | ${SITE.name}`;
  UI.markNav(home || `board.html?g=${groupId}`);

  const tabs = document.getElementById('board-tabs');
  if (boards.length > 1 && !q) {
    const items = home ? boards : [{ id: '', name: '전체' }, ...boards];
    tabs.innerHTML = items.map(b => `<a role="tab" aria-selected="${(b.id || null) === current}" href="${b.id ? UI.tabHref(b) : `board.html?g=${groupId}`}">${UI.esc(b.name)}</a>`).join('');
  } else tabs.remove();

  const write = document.getElementById('write-link');
  write.href = `write.html?b=${current || boards.find(b => !b.page).id}`;

  // 사진 게시판 탭을 골랐거나 묶음 전체가 사진 게시판이면 사진 바둑판으로 보여 준다.
  const isPhoto = !q && (current ? !!UI.board(current)?.photo : boards.every(b => b.photo));
  const list = document.getElementById('board-list');
  const more = document.getElementById('more-button');
  const posts = await Store.listPosts({ boards: current ? [current] : boards.map(b => b.id), query: q });
  let shown = 0;

  const row = p => {
    const b = UI.board(p.board);
    return `<a class="board-row${p.pinned ? ' is-pinned' : ''}" href="post.html?id=${encodeURIComponent(p.id)}">
      <span class="notice-type">${p.pinned ? '고정' : UI.esc(b?.tag || '')}</span>
      <span class="notice-title">${UI.esc(p.title)}${p.images?.length ? ' <svg class="has-photo" aria-label="사진 있음"><use href="#i-image"/></svg>' : ''}${p.files?.length ? ' <svg class="has-photo" aria-label="첨부파일 있음"><use href="#i-clip"/></svg>' : ''}</span>
      <span class="board-name">${UI.esc(b?.name || '')}</span>
      <span class="notice-date">${UI.formatDate(p.createdAt)}</span></a>`;
  };
  const card = p => `<a class="photo-card" href="post.html?id=${encodeURIComponent(p.id)}">
      <div class="photo-thumb">${p.images?.[0] ? `<img src="${UI.esc(p.images[0])}" alt="" loading="lazy">` : '<svg><use href="#i-image"/></svg>'}</div>
      <h3>${UI.esc(p.title)}</h3><span>${UI.formatDate(p.createdAt)}${p.images?.length > 1 ? ` · 사진 ${p.images.length}장` : ''}</span></a>`;

  function render() {
    const slice = posts.slice(0, shown += PAGE);
    if (!posts.length) list.innerHTML = `<p class="board-empty">${q ? '찾는 글이 없습니다. 다른 낱말로 찾아 주세요.' : '아직 올라온 글이 없습니다.'}</p>`;
    else list.innerHTML = isPhoto ? `<div class="photo-grid">${slice.map(card).join('')}</div>` : `<div class="board-list">${slice.map(row).join('')}</div>`;
    more.hidden = shown >= posts.length;
  }
  more.addEventListener('click', render);
  render();
})();

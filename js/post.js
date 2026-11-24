'use strict';
// 글 보기 화면. 주소 예: post.html?id=p-event-launch
(async function () {
  const id = UI.param('id');
  const el = document.getElementById('post');
  const post = id && await Store.getPost(id);
  if (!post) { el.innerHTML = '<p class="board-empty">글을 찾지 못했습니다. 지워졌거나 주소가 잘못되었습니다.</p>'; document.querySelector('.post-actions .editor-only')?.remove(); return; }

  const b = UI.board(post.board);
  const list = `board.html?g=${b.group}&b=${b.id}`;
  document.title = `${post.title} | ${SITE.name}`;
  document.body.dataset.page = b.group;
  UI.markNav(`board.html?g=${b.group}`);
  document.getElementById('breadcrumb').innerHTML = `<a href="board.html?g=${b.group}">${UI.esc(SITE.groups[b.group].name)}</a><span>›</span><a href="${list}">${UI.esc(b.name)}</a>`;
  document.getElementById('back-link').href = list;
  document.getElementById('edit-link').href = `write.html?id=${encodeURIComponent(post.id)}`;

  const edited = post.updatedAt && post.updatedAt.slice(0, 10) !== post.createdAt.slice(0, 10) ? ` · 수정 ${UI.formatDate(post.updatedAt)}` : '';
  el.innerHTML = `<header class="post-head"><span class="tag">${UI.esc(b.name)}</span><h1>${UI.esc(post.title)}</h1><p>${UI.formatDate(post.createdAt)}${edited}</p></header>
    <div class="post-body">${UI.renderBody(post.body)}</div>
    ${post.files?.length ? `<section class="post-files" aria-label="첨부파일"><h2>첨부파일 ${post.files.length}</h2><ul>${post.files.map(f => `<li><a href="${UI.esc(Store.fileUrl(f))}" download><svg><use href="#i-clip"/></svg><span>${UI.esc(f.name)}</span></a><small>${f.size >= 1048576 ? (f.size / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(f.size / 1024)) + 'KB'}</small></li>`).join('')}</ul></section>` : ''}
    ${post.images?.length ? `<div class="post-images">${post.images.map(src => `<a href="${UI.esc(src)}" target="_blank" rel="noopener"><img src="${UI.esc(src)}" alt="" loading="lazy"></a>`).join('')}</div>` : ''}`;

  document.getElementById('delete-button').addEventListener('click', async () => {
    if (!confirm(`「${post.title}」 글을 지울까요?\n사진 및 첨부파일도 함께 삭제됩니다. 지운 글은 되살릴 수 없습니다.`)) return;
    try { await Store.deletePost(post); location.href = list; }
    catch (e) { alert(e.message); if (!(await Store.getPost(post.id))) location.href = list; }
  });
})();

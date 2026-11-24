'use strict';
// 글쓰기·수정 화면. 새 글: write.html?b=notice / 수정: write.html?id=글번호
(async function () {
  const form = document.getElementById('write-form');
  await Store.ready; // 로그인 상태와 글쓰기 허용 여부를 Supabase에서 받아 올 때까지 기다린다
  if (!Store.isEditor()) { document.getElementById('no-permission').hidden = false; return; }
  form.hidden = false;

  const id = UI.param('id');
  const editing = id ? await Store.getPost(id) : null;
  if (id && !editing) { document.getElementById('no-permission').textContent = '고칠 글을 찾지 못했습니다.'; document.getElementById('no-permission').hidden = false; form.hidden = true; return; }

  const select = document.getElementById('board-select');
  select.innerHTML = SITE.boards.map(b => `<option value="${b.id}">${UI.esc(SITE.groups[b.group].name)} › ${UI.esc(b.name)}</option>`).join('');
  select.value = editing?.board || (UI.board(UI.param('b')) ? UI.param('b') : 'notice');

  let images = editing?.images ? editing.images.slice() : [];
  if (editing) {
    document.getElementById('write-title').textContent = '글 수정';
    document.getElementById('save-button').textContent = '고친 내용 저장';
    form.title.value = editing.title; form.body.value = editing.body; form.pinned.checked = !!editing.pinned;
    document.getElementById('cancel-link').href = `post.html?id=${encodeURIComponent(editing.id)}`;
  } else {
    const b = UI.board(select.value);
    document.getElementById('cancel-link').href = `board.html?g=${b.group}`;
  }

  const photoList = document.getElementById('photo-list');
  function drawPhotos() {
    photoList.innerHTML = images.map((src, i) => `<figure><img src="${UI.esc(src)}" alt=""><button type="button" data-remove="${i}" aria-label="${i + 1}번째 사진 빼기">×</button>${i === 0 ? '<figcaption>대표</figcaption>' : ''}</figure>`).join('');
  }
  photoList.addEventListener('click', e => { const i = e.target.dataset.remove; if (i !== undefined) { images.splice(+i, 1); drawPhotos(); } });
  document.getElementById('photo-input').addEventListener('change', async e => {
    const err = document.getElementById('write-error'); err.textContent = '';
    for (const file of e.target.files) {
      try { images.push(await Store.uploadImage(file)); drawPhotos(); }
      catch (ex) { err.textContent = ex.message; }
    }
    e.target.value = '';
  });
  drawPhotos();

  let dirty = false;
  form.addEventListener('input', () => { dirty = true; });
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const err = document.getElementById('write-error'); err.textContent = '';
    const board = UI.board(select.value);
    if (board.photo && !images.length) { err.textContent = '갤러리 글에는 사진을 한 장 이상 넣어 주세요.'; return; }
    const btn = document.getElementById('save-button'); btn.disabled = true;
    try {
      const saved = await Store.savePost({ id: editing?.id, board: board.id, title: form.title.value.trim(), body: form.body.value.trim(), images, pinned: form.pinned.checked });
      dirty = false;
      location.href = `post.html?id=${encodeURIComponent(saved.id)}`;
    } catch (ex) { err.textContent = ex.message; btn.disabled = false; }
  });
})();

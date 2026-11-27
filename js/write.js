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
  // page가 있는 게시판(회칙·규정)은 글 대신 본문 화면을 쓰므로 고를 수 없다. 예전에 그 게시판에 쓴 글을 고칠 때만 보인다.
  select.innerHTML = SITE.boards.filter(b => !b.page || b.id === editing?.board).map(b => `<option value="${b.id}">${UI.esc(SITE.groups[b.group].name)} › ${UI.esc(b.name)}</option>`).join('');
  select.value = editing?.board || (UI.board(UI.param('b')) ? UI.param('b') : 'notice');

  let images = editing?.images ? editing.images.slice() : [];
  let files = editing?.files ? editing.files.map(f => ({ ...f })) : [];
  // 이번 화면에서 새로 올린 사진 · 파일. 저장하지 않고 취소하면 보관함에서 지운다.
  const uploaded = { images: [], files: [] };
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
      try { const url = await Store.uploadImage(file); images.push(url); uploaded.images.push(url); drawPhotos(); dirty = true; }
      catch (ex) { err.textContent = ex.message; }
    }
    e.target.value = '';
  });
  drawPhotos();

  const fileList = document.getElementById('file-list');
  const sizeText = n => n >= 1048576 ? `${(n / 1048576).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`;
  function drawFiles() {
    fileList.innerHTML = files.map((f, i) => `<li><span>${UI.esc(f.name)}</span><small>${sizeText(f.size)}</small><button type="button" data-remove-file="${i}" aria-label="${UI.esc(f.name)} 빼기">×</button></li>`).join('');
  }
  fileList.addEventListener('click', e => { const i = e.target.dataset.removeFile; if (i !== undefined) { files.splice(+i, 1); drawFiles(); dirty = true; } });
  const fileInput = document.getElementById('file-input');
  fileInput.accept = Store.fileLimits.types.map(t => '.' + t).join(',');
  fileInput.addEventListener('change', async e => {
    const err = document.getElementById('write-error'); err.textContent = '';
    const msgs = [];
    for (const file of e.target.files) {
      if (files.length >= Store.fileLimits.perPost) { msgs.push(`첨부파일은 글 하나에 ${Store.fileLimits.perPost}개까지 붙일 수 있습니다.`); break; }
      try { const f = await Store.uploadFile(file); files.push(f); uploaded.files.push(f); drawFiles(); dirty = true; }
      catch (ex) { msgs.push(ex.message); }
    }
    err.textContent = msgs.join(' ');
    e.target.value = '';
  });
  drawFiles();

  // 취소: 이번에 새로 올리고 저장하지 않은 사진 · 파일을 보관함에서 지운 뒤 나간다.
  document.getElementById('cancel-link').addEventListener('click', async e => {
    if (!uploaded.images.length && !uploaded.files.length) return;
    e.preventDefault();
    dirty = false;
    try { await Store.removeStored(uploaded); } catch (ex) { alert(ex.message); }
    location.href = e.currentTarget.href;
  });

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
      const saved = await Store.savePost({ id: editing?.id, board: board.id, title: form.title.value.trim(), body: form.body.value.trim(), images, files, pinned: form.pinned.checked });
      dirty = false;
      // 저장한 글에서 빠진 사진 · 파일(원래 있던 것과 이번에 올렸다가 뺀 것)을 보관함에서 지운다.
      const keptPaths = new Set(files.map(f => f.path));
      const gone = {
        images: [...(editing?.images || []), ...uploaded.images].filter(u => !images.includes(u)),
        files: [...(editing?.files || []), ...uploaded.files].filter(f => !keptPaths.has(f.path))
      };
      try { await Store.removeStored(gone); } catch (ex) { alert(`글은 저장했습니다. ${ex.message}`); }
      location.href = `post.html?id=${encodeURIComponent(saved.id)}`;
    } catch (ex) { err.textContent = ex.message; btn.disabled = false; }
  });
})();

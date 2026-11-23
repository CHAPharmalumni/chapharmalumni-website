'use strict';
/*
 * 글 저장소와 로그인.
 * 지금은 시안용으로 이 브라우저 안(localStorage)에만 저장한다.
 * Firebase를 연결할 때는 이 파일과 같은 함수 이름(window.Store)을 가진 firebase-store.js로 바꾸면 되고,
 * 화면 코드(board.js, post.js, write.js)는 고치지 않는다.
 */
(function () {
  const POSTS_KEY = 'cpa.posts.v1';
  const USER_KEY = 'cpa.user.v1';

  const seed = [
    { id: 'p-event-launch', board: 'event', title: '총동문회 출범식 및 제1회 정기총회 안내',
      body: '차 의과학대학교 약학대학 동문 여러분과 함께 새로운 시작을 준비합니다.\n\n일시: 2027년 2월 21일 일요일 (세부 시간은 추후 안내)\n장소: 차바이오컴플렉스 국제회의실\n\n상세 식순·참가 신청·식사 안내는 준비가 완료되는 대로 공지합니다.',
      images: [], pinned: true, createdAt: '2026-11-20T09:00:00+09:00' },
    { id: 'p-notice-member', board: 'notice', title: '동문회와 함께하는 방법을 안내합니다',
      body: '같은 배움에서 시작된 인연을 이어갑니다.\n\n가입 신청 경로와 필요한 정보는 공식 안내를 통해 공지합니다.',
      images: [], pinned: false, createdAt: '2026-11-18T09:00:00+09:00' },
    { id: 'p-notice-rep', board: 'notice', title: '기수별 대표와 함께, 반가운 만남을 준비합니다',
      body: '동문 여러분의 소식이 빠짐없이 이어질 수 있도록 기수별 대표와 함께 출범식을 준비합니다.\n\n- 출범식 일정과 공식 안내 전달\n- 기수별 참여 의사와 식사 인원 취합\n- 참가 신청 및 최종 안내 확인',
      images: [], pinned: false, createdAt: '2026-11-15T09:00:00+09:00' },
    { id: 'p-gallery-founding', board: 'gallery', title: '총동문회 창립총회',
      body: '2026년 9월 5일 창립총회에 함께해 주신 동문 여러분께 감사드립니다.',
      images: ['assets/founding-group.jpg'], pinned: false, createdAt: '2026-09-06T09:00:00+09:00' },
    { id: 'p-archive-rule', board: 'archive', title: '총동문회 회칙 (예시 글)',
      body: '공개용 확정본을 확인한 뒤 이 글에 파일 링크를 붙입니다.',
      images: [], pinned: false, createdAt: '2026-09-05T09:00:00+09:00' }
  ].map(p => ({ author: 'admin@chapharmalumni.org', updatedAt: p.createdAt, ...p }));

  function readPosts() {
    try {
      const raw = localStorage.getItem(POSTS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* 저장 공간을 못 쓰면 예시 글만 보여 준다 */ }
    return seed.slice();
  }
  function writePosts(posts) {
    try { localStorage.setItem(POSTS_KEY, JSON.stringify(posts)); }
    catch (e) { throw new Error('이 브라우저의 시안용 저장 공간이 가득 찼습니다. 사진 수를 줄여 주세요. (실제 운영에서는 생기지 않는 문제입니다)'); }
  }
  const byNewest = (a, b) => (b.pinned - a.pinned) || b.createdAt.localeCompare(a.createdAt);
  const newId = () => 'p-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // 사진을 긴 변 1600px JPEG로 줄인다. 실제 운영에서도 올리는 용량을 줄이려고 그대로 쓴다.
  function shrinkImage(file, max = 1600) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        c.toBlob(b => b ? resolve(b) : reject(new Error('사진을 줄이지 못했습니다.')), 'image/jpeg', 0.82);
      };
      img.onerror = () => reject(new Error('사진 파일을 읽지 못했습니다.'));
      img.src = URL.createObjectURL(file);
    });
  }
  const blobToDataUrl = blob => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });

  const listeners = new Set();
  function currentUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch (e) { return null; }
  }
  function isEditor(user = currentUser()) {
    return !!user && SITE.editors.map(e => e.toLowerCase()).includes(user.email.toLowerCase());
  }

  window.Store = {
    mode: 'local', // 시안 표시용. Firebase 판에서는 'firebase'
    async listPosts({ board, boards, query, limit } = {}) {
      let posts = readPosts();
      if (board) posts = posts.filter(p => p.board === board);
      if (boards) posts = posts.filter(p => boards.includes(p.board));
      if (query) { const q = query.toLowerCase(); posts = posts.filter(p => (p.title + ' ' + p.body).toLowerCase().includes(q)); }
      posts.sort(byNewest);
      return limit ? posts.slice(0, limit) : posts;
    },
    async getPost(id) { return readPosts().find(p => p.id === id) || null; },
    async savePost(input) {
      if (!isEditor()) throw new Error('글쓰기 권한이 없습니다.');
      const posts = readPosts();
      const now = new Date().toISOString();
      if (input.id) {
        const i = posts.findIndex(p => p.id === input.id);
        if (i < 0) throw new Error('고칠 글을 찾지 못했습니다.');
        posts[i] = { ...posts[i], ...input, updatedAt: now };
        writePosts(posts); return posts[i];
      }
      const post = { ...input, id: newId(), author: currentUser().email, createdAt: now, updatedAt: now };
      posts.push(post); writePosts(posts); return post;
    },
    async deletePost(id) {
      if (!isEditor()) throw new Error('삭제 권한이 없습니다.');
      writePosts(readPosts().filter(p => p.id !== id));
    },
    async uploadImage(file) { return blobToDataUrl(await shrinkImage(file)); },

    currentUser, isEditor,
    // 시안용 로그인: 실제 구글 로그인 창 대신 이메일만 입력받는다.
    async signIn(email) {
      const user = { email: String(email || '').trim() };
      if (!/^[^@\s]+@[^@\s]+$/.test(user.email)) throw new Error('구글 계정 이메일을 입력해 주세요.');
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      listeners.forEach(f => f(user));
      return user;
    },
    async signOut() { localStorage.removeItem(USER_KEY); listeners.forEach(f => f(null)); },
    onAuthChange(f) { listeners.add(f); f(currentUser()); return () => listeners.delete(f); },
    resetDemo() { localStorage.removeItem(POSTS_KEY); }
  };
})();

'use strict';
/*
 * 글 저장소와 로그인 — Supabase 판.
 * 화면 파일은 window.Store에 요청만 하고, 글이 어디에 저장되는지는 이 파일만 안다.
 * 표 · 권한 규칙: supabase/schema.sql / 설계 설명: 볼트 projects/2026-CHA-Pharm-Alumni-Website/plan.md 4 · 6-1 · 6-3
 *
 * 글쓰기 허용 여부는 화면에서 버튼을 보이고 숨기는 데만 쓴다.
 * 실제로 막는 것은 Supabase의 권한 규칙(RLS)이다.
 */
(function () {
  const cfg = SITE.supabase;
  const sb = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
  });

  // 글쓴이 이메일(author)은 방문자에게 막혀 있으므로 읽는 칸을 하나씩 적는다.
  const COLS = 'id,board,title,body,images,pinned,created_at,updated_at';
  const RETURN_KEY = 'cpa.returnTo';
  const toPost = r => r && ({
    id: r.id, board: r.board, title: r.title, body: r.body, images: r.images || [],
    pinned: r.pinned, createdAt: r.created_at, updatedAt: r.updated_at
  });
  const fail = (what, error) => new Error(`${what}: ${error.message || error}`);

  // 사진을 긴 변 1600px JPEG로 줄인다. 저장 공간과 접속 속도 부담을 줄인다.
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

  // 로그인 상태. 화면이 바로 물어볼 수 있게 여기에 담아 둔다.
  let user = null, editor = false;
  const listeners = new Set();
  async function applySession(session) {
    user = session ? { email: session.user.email } : null;
    editor = false;
    if (user) {
      const { data, error } = await sb.rpc('is_editor');
      editor = !error && data === true;
    }
  }

  // 페이지가 열릴 때 한 번: 구글 로그인에서 돌아온 경우 일회용 번호를 로그인으로 바꾸고, 원래 보던 화면으로 돌려보낸다.
  const ready = (async () => {
    const { data: { session } } = await sb.auth.getSession();
    await applySession(session);
    const back = sessionStorage.getItem(RETURN_KEY);
    if (session && back) { sessionStorage.removeItem(RETURN_KEY); if (back !== location.href) location.replace(back); }
    else if (new URLSearchParams(location.search).has('code')) history.replaceState(null, '', location.pathname);
  })();

  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') return; // 처음 상태는 위의 ready가 처리한다
    // 이 알림 안에서 바로 Supabase에 다시 묻지 않도록 한 박자 늦춘다(supabase-js 안내).
    setTimeout(async () => { await applySession(session); listeners.forEach(f => f(user)); }, 0);
  });

  window.Store = {
    mode: 'supabase',
    ready,

    async listPosts({ board, boards, query, limit } = {}) {
      let q = sb.from('posts').select(COLS).order('pinned', { ascending: false }).order('created_at', { ascending: false });
      if (board) q = q.eq('board', board);
      if (boards) q = q.in('board', boards);
      if (limit && !query) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw fail('글 목록을 불러오지 못했습니다', error);
      let posts = data.map(toPost);
      if (query) {
        const s = query.toLowerCase();
        posts = posts.filter(p => (p.title + ' ' + p.body).toLowerCase().includes(s));
        if (limit) posts = posts.slice(0, limit);
      }
      return posts;
    },

    async getPost(id) {
      const { data, error } = await sb.from('posts').select(COLS).eq('id', id).maybeSingle();
      if (error) throw fail('글을 불러오지 못했습니다', error);
      return toPost(data);
    },

    async savePost(input) {
      if (!editor) throw new Error('글쓰기 권한이 없습니다.');
      const row = { board: input.board, title: input.title, body: input.body, images: input.images || [], pinned: !!input.pinned };
      const q = input.id
        ? sb.from('posts').update(row).eq('id', input.id).select(COLS)
        : sb.from('posts').insert(row).select(COLS);
      const { data, error } = await q;
      if (error) throw fail('저장하지 못했습니다', error);
      if (!data.length) throw new Error('고칠 글을 찾지 못했거나 권한이 없습니다.');
      return toPost(data[0]);
    },

    async deletePost(id) {
      if (!editor) throw new Error('삭제 권한이 없습니다.');
      const { data, error } = await sb.from('posts').delete().eq('id', id).select('id');
      if (error) throw fail('지우지 못했습니다', error);
      if (!data.length) throw new Error('지울 글을 찾지 못했거나 권한이 없습니다.');
    },

    async uploadImage(file) {
      if (!editor) throw new Error('사진 올리기 권한이 없습니다.');
      const blob = await shrinkImage(file);
      const d = new Date();
      const path = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.jpg`;
      const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
      if (error) throw fail('사진을 올리지 못했습니다', error);
      return sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
    },

    currentUser: () => user,
    isEditor: () => editor,

    // 구글 로그인 화면으로 갔다가 돌아온다. 돌아올 주소는 Supabase 허용 주소 목록에 있는 홈페이지 첫 주소 하나뿐이고,
    // 원래 보던 화면은 이 브라우저 탭에 적어 두었다가 돌아온 뒤 다시 연다.
    async signIn() {
      sessionStorage.setItem(RETURN_KEY, location.href);
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: location.origin, queryParams: { hd: 'chapharmalumni.org', prompt: 'select_account' } }
      });
      if (error) { sessionStorage.removeItem(RETURN_KEY); throw fail('로그인을 시작하지 못했습니다', error); }
    },
    async signOut() { await sb.auth.signOut(); },
    onAuthChange(f) { listeners.add(f); ready.then(() => f(user)); return () => listeners.delete(f); }
  };
})();

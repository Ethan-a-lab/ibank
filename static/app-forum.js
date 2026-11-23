/* ============================================================
   课程讨论区（v134）
   ------------------------------------------------------------
   一个总版：四个班共用一个讨论区，每条帖子/回帖都带班级标签。
   必须实名登录（手机号）才能发帖 —— 匿名身份一律拦下。

   依赖：static/app-auth.js 暴露的 window.__ibankCloud（app/auth/db/offline）
   数据：db/forum.sql 建的两张表 forum_posts / forum_replies
   ============================================================ */
(function () {
  'use strict';

  var state = {
    loaded: false,
    uid: null,
    prof: null,      // { role, name, class_name }
    posts: [],       // 帖子列表
    replyCount: {},  // post_id -> 回帖数
    detailId: null,  // 当前打开的帖子 id
    busy: false
  };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function cloud() { return window.__ibankCloud || null; }
  function db() { var c = cloud(); return c ? c.db : null; }

  function isTeacher() {
    if (window.__ibankIsAdmin === true) return true;
    return !!(state.prof && (state.prof.role === 'teacher' || state.prof.role === 'admin'));
  }

  /* ---------- 时间显示 ---------- */
  function fmtTime(s) {
    if (!s) return '';
    var t = new Date(s).getTime();
    if (isNaN(t)) return '';
    var d = Date.now() - t;
    if (d < 0) d = 0;
    if (d < 60000) return '刚刚';
    if (d < 3600000) return Math.floor(d / 60000) + ' 分钟前';
    if (d < 86400000) return Math.floor(d / 3600000) + ' 小时前';
    if (d < 7 * 86400000) return Math.floor(d / 86400000) + ' 天前';
    var o = new Date(t);
    return (o.getMonth() + 1) + '-' + pad(o.getDate()) + ' ' + pad(o.getHours()) + ':' + pad(o.getMinutes());
  }

  /* ---------- 身份 ---------- */
  async function loadIdentity() {
    var c = cloud();
    if (!c || c.offline) { state.uid = null; state.prof = null; return; }
    try {
      var s = await c.auth.getSession();
      state.uid = s && s.data && s.data.session && s.data.session.user ? s.data.session.user.id : null;
    } catch (e) { state.uid = null; }
    if (!state.uid) { state.prof = null; return; }
    try {
      var r = await c.db.from('profiles').select('role, name, class_name').eq('id', state.uid);
      var row = (r && r.data && r.data[0]) || null;
      state.prof = row ? { role: row.role || 'student', name: row.name || '', class_name: row.class_name || '' } : { role: 'student', name: '', class_name: '' };
    } catch (e) { state.prof = { role: 'student', name: '', class_name: '' }; }
  }

  function myName() {
    var n = (state.prof && state.prof.name) || '';
    if (n) return n;
    return state.uid ? '同学' + String(state.uid).slice(-4) : '同学';
  }
  function myClass() {
    return (state.prof && state.prof.class_name) || '';
  }

  /* ---------- 渲染：列表 ---------- */
  function renderList() {
    var box = $('forum-list');
    if (!box) return;
    if (!state.posts.length) {
      box.innerHTML = '<div class="forum-empty">还没有帖子。' + (state.uid ? '来发第一条吧。' : '登录后可以发起讨论。') + '</div>';
      return;
    }
    box.innerHTML = state.posts.map(function (p) {
      var n = state.replyCount[p.id] || 0;
      var t = isTeacher();
      return '<article class="forum-item' + (p.pinned ? ' is-pin' : '') + '" data-fid="' + p.id + '">'
        + '<div class="forum-item-h">'
        + (p.pinned ? '<span class="forum-pin">置顶</span>' : '')
        + '<h4>' + esc(p.title) + '</h4>'
        + (p.locked ? '<span class="forum-lock" title="已锁定，学生不能回帖">锁定</span>' : '')
        + '</div>'
        + '<p class="forum-item-b">' + esc((p.body || '').replace(/\s+/g, ' ').slice(0, 90)) + ((p.body || '').length > 90 ? '…' : '') + '</p>'
        + '<div class="forum-item-m">'
        + '<span class="forum-author">' + esc(p.author_name || '同学') + '</span>'
        + (p.author_role === 'teacher' || p.author_role === 'admin'
          ? '<span class="forum-role">教师</span>'
          : (p.class_name ? '<span class="forum-cls">' + esc(p.class_name) + '</span>' : '<span class="forum-cls is-none">未选班级</span>'))
        + '<span class="forum-time">' + fmtTime(p.created_at) + '</span>'
        + '<span class="forum-re">' + n + ' 回复</span>'
        + '</div>'
        + '</article>';
    }).join('');
  }

  /* ---------- 渲染：详情 ---------- */
  function renderDetail(p, replies) {
    var box = $('forum-detail');
    if (!box) return;
    var t = isTeacher();
    var canReply = state.uid && (!p.locked || t);
    var head = '<div class="forum-dt-head">'
      + '<button type="button" class="forum-back" data-forum-back>← 返回列表</button>'
      + '<div class="forum-dt-title">'
      + (p.pinned ? '<span class="forum-pin">置顶</span>' : '')
      + '<h3>' + esc(p.title) + '</h3>'
      + '</div>'
      + '<div class="forum-dt-meta">'
      + '<span class="forum-author">' + esc(p.author_name || '同学') + '</span>'
      + (p.author_role === 'teacher' || p.author_role === 'admin'
        ? '<span class="forum-role">教师</span>'
        : (p.class_name ? '<span class="forum-cls">' + esc(p.class_name) + '</span>' : '<span class="forum-cls is-none">未选班级</span>'))
      + '<span class="forum-time">' + fmtTime(p.created_at) + '</span>'
      + '</div>'
      + (t ? '<div class="forum-dt-ops">'
        + '<button type="button" class="forum-op" data-forum-pin="' + p.id + '">' + (p.pinned ? '取消置顶' : '置顶') + '</button>'
        + '<button type="button" class="forum-op" data-forum-lock="' + p.id + '">' + (p.locked ? '解锁' : '锁定') + '</button>'
        + '<button type="button" class="forum-op is-danger" data-forum-del="' + p.id + '">删除</button>'
        + '</div>' : '')
      + '</div>';

    var body = '<div class="forum-dt-body">' + esc(p.body).replace(/\n/g, '<br>') + '</div>';

    var rHtml = replies.length
      ? replies.map(function (r) {
        return '<article class="forum-rp">'
          + '<div class="forum-rp-m">'
          + '<span class="forum-author">' + esc(r.author_name || '同学') + '</span>'
          + (r.author_role === 'teacher' || r.author_role === 'admin'
            ? '<span class="forum-role">教师</span>'
            : (r.class_name ? '<span class="forum-cls">' + esc(r.class_name) + '</span>' : '<span class="forum-cls is-none">未选班级</span>'))
          + '<span class="forum-time">' + fmtTime(r.created_at) + '</span>'
          + '</div>'
          + '<div class="forum-rp-b">' + esc(r.body).replace(/\n/g, '<br>') + '</div>'
          + '</article>';
      }).join('')
      : '<div class="forum-empty">还没有回复。</div>';

    var composer = canReply
      ? '<div class="forum-rp-box">'
        + '<textarea id="forum-reply-body" rows="3" maxlength="8000" placeholder="写下你的回复…"></textarea>'
        + '<div class="forum-rp-foot"><button type="button" id="forum-reply-btn">回复</button></div>'
        + '</div>'
      : '<div class="forum-locked-tip">'
        + (state.uid
            ? '本帖已锁定，不再接受回复。'
            /* v134：未登录不再只给一行灰字（用户看完不知道该干什么），
               给一个能直接打开登录框的按钮，并说明登录的理由。 */
            : '登录后才能回复。<button type="button" class="forum-ask-login">去登录</button>')
        + '</div>';

    box.innerHTML = head + body
      + '<div class="forum-rp-head">' + replies.length + ' 条回复</div>'
      + '<div class="forum-rp-list">' + rHtml + '</div>'
      + composer;
  }

  /* ---------- 数据 ---------- */
  async function loadList() {
    var d = db();
    if (!d) { renderOffline(); return; }
    var box = $('forum-list');
    if (box && !state.loaded) box.innerHTML = '<div class="forum-empty">加载中…</div>';
    try {
      var r = await d.from('forum_posts')
        .select('id, author_id, author_name, author_role, class_name, title, body, pinned, locked, created_at')
        .eq('deleted', false)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);
      if (r && r.error) throw r.error;
      state.posts = (r && r.data) || [];
      // 回帖数：一次取全部 post_id，前端聚合，避免逐帖查询
      state.replyCount = {};
      try {
        var rr = await d.from('forum_replies').select('post_id').eq('deleted', false).limit(5000);
        ((rr && rr.data) || []).forEach(function (x) {
          state.replyCount[x.post_id] = (state.replyCount[x.post_id] || 0) + 1;
        });
      } catch (e2) { /* 回帖数取不到不影响列表 */ }
      state.loaded = true;
      renderList();
    } catch (e) {
      console.warn('[forum] 列表加载失败', e && e.message);
      if (box) box.innerHTML = '<div class="forum-empty">讨论区暂时加载失败，请稍后再试。</div>';
    }
  }

  async function openPost(id) {
    var d = db();
    if (!d) return;
    state.detailId = id;
    var gateNow = $('forum-gate');
    if (gateNow) gateNow.classList.add('hidden');
    $('forum-list-wrap').classList.add('hidden');
    $('forum-compose').classList.add('hidden');   // 看帖时收起发帖框，避免误以为是回帖
    $('forum-detail').classList.remove('hidden');
    $('forum-detail').innerHTML = '<div class="forum-empty">加载中…</div>';
    try {
      var r = await d.from('forum_posts').select('*').eq('id', id);
      if (r && r.error) throw r.error;
      var p = (r && r.data && r.data[0]) || null;
      if (!p || p.deleted) { $('forum-detail').innerHTML = '<div class="forum-empty">这条帖子已被删除。</div>'; return; }
      var rr = await d.from('forum_replies')
        .select('id, author_id, author_name, author_role, class_name, body, created_at')
        .eq('post_id', id).eq('deleted', false)
        .order('created_at', { ascending: true }).limit(500);
      var replies = (rr && rr.data) || [];
      renderDetail(p, replies);
    } catch (e) {
      $('forum-detail').innerHTML = '<div class="forum-empty">加载失败，请稍后再试。</div>';
    }
  }

  function backToList() {
    state.detailId = null;
    var gateBack = $('forum-gate');
    if (gateBack) gateBack.classList.toggle('hidden', !!state.uid);
    $('forum-detail').classList.add('hidden');
    $('forum-list-wrap').classList.remove('hidden');
    $('forum-compose').classList.toggle('hidden', !state.uid);  // 回列表时按登录态恢复发帖框
    loadList();
  }

  async function submitPost() {
    if (state.busy) return;
    if (!state.uid) { if (window.__ibankAskLogin) window.__ibankAskLogin('发帖需要登录：登录后帖子才会记在你名下。'); else alert('请先登录后再发帖'); return; }
    var ti = $('forum-title'), bo = $('forum-body'), btn = $('forum-submit');
    var title = (ti.value || '').trim();
    var body = (bo.value || '').trim();
    if (!title) { ti.focus(); alert('请填写标题'); return; }
    if (!body) { bo.focus(); alert('请填写正文'); return; }
    state.busy = true;
    if (btn) { btn.disabled = true; btn.textContent = '发布中…'; }
    try {
      var d = db();
      var r = await d.from('forum_posts').insert({
        author_id: state.uid,
        author_name: myName(),
        author_role: (state.prof && state.prof.role) || 'student',
        class_name: myClass(),
        title: title,
        body: body
      });
      if (r && r.error) throw r.error;
      ti.value = ''; bo.value = '';
      await loadList();
    } catch (e) {
      alert('发布失败：' + ((e && e.message) || '请稍后再试'));
    } finally {
      state.busy = false;
      if (btn) { btn.disabled = false; btn.textContent = '发布'; }
    }
  }

  async function submitReply() {
    if (state.busy) return;
    if (!state.uid) { if (window.__ibankAskLogin) window.__ibankAskLogin('回复需要登录：登录后你的回复才会记在你名下，也才能收到别人回复的通知。'); else alert('请先登录后再回复'); return; }
    var ta = $('forum-reply-body'), btn = $('forum-reply-btn');
    var body = ta ? (ta.value || '').trim() : '';
    if (!body) { if (ta) ta.focus(); alert('请填写回复内容'); return; }
    state.busy = true;
    if (btn) { btn.disabled = true; btn.textContent = '发送中…'; }
    try {
      var d = db();
      var r = await d.from('forum_replies').insert({
        post_id: state.detailId,
        author_id: state.uid,
        author_name: myName(),
        author_role: (state.prof && state.prof.role) || 'student',
        class_name: myClass(),
        body: body
      });
      if (r && r.error) throw r.error;
      await openPost(state.detailId);
    } catch (e) {
      alert('回复失败：' + ((e && e.message) || '请稍后再试'));
      if (btn) { btn.disabled = false; btn.textContent = '回复'; }
    } finally {
      state.busy = false;
    }
  }

  /* 教师操作：置顶 / 锁定 / 软删 */
  async function patchPost(id, patch) {
    if (!isTeacher()) return;
    var d = db();
    if (!d) return;
    try {
      var r = await d.from('forum_posts').update(patch).eq('id', id);
      if (r && r.error) throw r.error;
      if (patch.deleted) { backToList(); }
      else { await openPost(id); }
    } catch (e) {
      alert('操作失败：' + ((e && e.message) || '请稍后再试'));
    }
  }

  /* ---------- 视图状态 ---------- */
  function renderOffline() {
    var box = $('forum-list');
    if (box) box.innerHTML = '<div class="forum-empty">当前未连接云服务，讨论区不可用。联网后重新打开即可。</div>';
  }

  function renderLoginGate() {
    var gate = $('forum-gate');
    var compose = $('forum-compose');
    /* v134：详情页不再顶一块「未登录」提示 —— 帖子就在下面，能看就看，
       顶上再压一段说明反而显得自相矛盾（原来写的是「登录后才能浏览」）。
       列表页保留这条提示，因为那里是「要不要参与」的决策点。 */
    if (gate) gate.classList.toggle('hidden', !!state.uid || !!state.detailId);
    if (compose) compose.classList.toggle('hidden', !state.uid);
    var who = $('forum-who');
    if (who) {
      if (state.uid) {
        var cls = myClass();
        who.innerHTML = '以 <b>' + esc(myName()) + '</b>'
          + (cls ? ' · <span class="forum-cls">' + esc(cls) + '</span>' : ' · <span class="forum-cls is-none">未选班级</span>')
          + ' 的身份发言';
      } else {
        who.innerHTML = '';
      }
    }
  }

  async function refresh() {
    await loadIdentity();
    renderLoginGate();
    if (!state.uid) {
      state.posts = [];
      var box = $('forum-list');
      if (box) box.innerHTML = '<div class="forum-empty">登录后即可查看并参与讨论。</div>';
      return;
    }
    await loadList();
  }

  /* ---------- 事件绑定 ---------- */
  function bind() {
    var page = $('p-forum');
    if (!page) return;

    // 列表点击进详情
    var list = $('forum-list');
    if (list) {
      list.addEventListener('click', function (ev) {
        var it = ev.target.closest ? ev.target.closest('[data-fid]') : null;
        if (it) openPost(it.getAttribute('data-fid'));
      });
    }

    // 详情区委托：返回 / 教师操作
    var detail = $('forum-detail');
    if (detail) {
      detail.addEventListener('click', function (ev) {
        var t = ev.target;
        if (t.closest && t.closest('[data-forum-back]')) { backToList(); return; }
        var pin = t.closest && t.closest('[data-forum-pin]');
        if (pin) {
          var id = pin.getAttribute('data-forum-pin');
          var cur = state.posts.filter(function (p) { return String(p.id) === String(id); })[0];
          patchPost(id, { pinned: cur ? !cur.pinned : true });
          return;
        }
        var lk = t.closest && t.closest('[data-forum-lock]');
        if (lk) {
          var id2 = lk.getAttribute('data-forum-lock');
          var cur2 = state.posts.filter(function (p) { return String(p.id) === String(id2); })[0];
          patchPost(id2, { locked: cur2 ? !cur2.locked : true });
          return;
        }
        var dl = t.closest && t.closest('[data-forum-del]');
        if (dl) {
          if (confirm('确定删除这条帖子？学生将不再看到它（记录会保留）。')) {
            patchPost(dl.getAttribute('data-forum-del'), { deleted: true });
          }
          return;
        }
        if (t.closest && t.closest('.forum-ask-login')) {
          if (window.__ibankAskLogin) {
            window.__ibankAskLogin('回复需要登录：登录后你的回复才会记在你名下，也才能收到别人回复的通知。');
          }
          return;
        }
        if (t.id === 'forum-reply-btn') { submitReply(); }
      });
      detail.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey) && ev.target.id === 'forum-reply-body') {
          ev.preventDefault(); submitReply();
        }
      });
    }

    var sb = $('forum-submit');
    if (sb) sb.addEventListener('click', submitPost);

    var gateBtn = $('forum-gate-btn');
    if (gateBtn) gateBtn.addEventListener('click', function () {
      /* v134：统一走 __ibankAskLogin，登录框会带上"为什么让你登录"。
         原来是点 top 登录按钮（说明条为空），用户只看到一个没有上下文的弹窗。 */
      if (window.__ibankAskLogin) {
        window.__ibankAskLogin('发帖和回复需要登录：登录后你的发言才会记在你名下，也才能收到别人回复的通知。');
        return;
      }
      var top = $('login-top-btn');
      if (top && !top.classList.contains('hidden')) { top.click(); return; }
      // 已登录态但被拦截（例如匿名身份）：提示重新登录
      var lo = $('logout-btn');
      if (lo) { lo.click(); setTimeout(function () { if (top) top.click(); }, 400); }
    });

    // 页面切换时刷新
    var mo = new MutationObserver(function () {
      if (page.classList.contains('active')) refresh();
    });
    mo.observe(page, { attributes: true, attributeFilter: ['class'] });

    // 首次若已在当前页（深链）
    if (page.classList.contains('active')) refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  window.IBK_FORUM = {
    refresh: refresh, openPost: openPost, state: state,
    /* 调试/验收钩子：用造好的数据直接渲染，不触数据库 */
    _render: function () { renderList(); },
    _renderDetail: function (p, rs) { renderDetail(p, rs); }
  };
})();

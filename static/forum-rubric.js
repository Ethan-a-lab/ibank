/* ===================================================================
   主题讨论 · 伦理量规（专家建议③ · E 维 40% · v142）
   ------------------------------------------------------------
   用户拍板口径：系统自动打参考分 + 教师只复核异常帖。

   两条数据，权限分明：
     ① 系统参考分：论坛帖子正文是公开给登录学生的，按结构化规则算
        （篇幅 / 论证结构 / 课程概念 / 案例数据 / 互动），只算数字与三级档，
        不调用大模型、不额外落原文；
     ② 教师复核分：教师在讨论管理面板对「异常帖」打分并写理由，
        存本机 ibank_forum_rubric（教师自己的机器），不写云端 forum 表、
        不进 events 统计（教师行为按既有约定不进统计）。

   E 维 e.talk 取数优先级：教师复核分 > 系统参考分；无本人帖子则保留「待采集」。

   本文件不改动 app-forum.js 主体，只在讨论区页面追加一个折叠面板；
   全部中文文案所在容器带 data-i18n-skip（与讨论区一致）。
   =================================================================== */
(function () {
  'use strict';

  var root = document.getElementById('p-forum');
  if (!root) return;

  var STORE = 'ibank_forum_rubric';    // { [postId]: { teacher: 0-100, reason: '', ts, by } }
  var CFG = {
    minLen: 30, goodLen: 200,         // 篇幅
    concepts: ['投行', 'IPO', '承销', '并购', '估值', '债券', '定价', '尽职调查', '发行', '监管', '披露', ' fiduciary', '利益冲突', '合规', '风险', '伦理', '职业道德', '保荐', '路演', '询价'],
    structMarks: ['首先', '其次', '最后', '第一', '第二', '因此', '但是', '然而', '因为', '所以', '综上', '一、', '二、', '三、'],
    caseMarks: ['%', '亿', '元', '年', '案例', '例如', '比亚迪', '数据', '倍', 'bp']
  };

  function q(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function ls(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(v) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch (e) {} }
  function all() { var v = ls(STORE, {}); return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; }
  function toast(s) { try { if (typeof ibankToast === 'function') ibankToast(s); } catch (e) {} }
  function isTeacher() { return window.__ibankIsAdmin === true; }
  // 直接复用论坛模块已经异步取好的 uid（c.auth.getSession() 的结果），
  // 不再自己另起一套同步 session 读取——那套 API 不存在，会永远取到空。
  function uid() { var f = window.IBK_FORUM; return (f && f.state && f.state.uid) || ''; }

  /* ---------- 系统参考分：三级量规 ---------- */
  function scorePost(post, replies) {
    var text = String((post && post.body) || '');
    var n = text.length;
    var hits = function (arr) { var c = 0; arr.forEach(function (k) { if (text.indexOf(k) >= 0) c++; }); return c; };
    var cConc = hits(CFG.concepts), cStruct = hits(CFG.structMarks), cCase = hits(CFG.caseMarks);
    var nr = replies || 0;

    // 篇幅 30 分：30 字以下 0，200 字及以上满
    var sLen = n <= CFG.minLen ? 0 : Math.min(30, Math.round((n - CFG.minLen) / (CFG.goodLen - CFG.minLen) * 30));
    // 论证结构 25 分：有连接词/分层标记
    var sStruct = Math.min(25, cStruct * 7);
    // 课程概念 20 分：扣题到本课程
    var sConc = Math.min(20, cConc * 5);
    // 案例数据 15 分：有具体事实支撑，不空谈
    var sCase = Math.min(15, cCase * 4);
    // 互动 10 分：有人回应（讨论不是自说自话）
    var sInter = Math.min(10, nr * 3);
    var total = Math.max(0, Math.min(100, sLen + sStruct + sConc + sCase + sInter));
    var level = total >= 80 ? 'A' : total >= 60 ? 'B' : 'C';
    return { total: total, level: level, parts: { len: sLen, struct: sStruct, conc: sConc, case: sCase, inter: sInter } };
  }

  function finalOf(postId, sys) {
    var t = all()[postId];
    if (t && typeof t.teacher === 'number') {
      var lv = t.teacher >= 80 ? 'A' : t.teacher >= 60 ? 'B' : 'C';
      return { score: t.teacher, src: 'teacher', reason: t.reason || '', level: lv };
    }
    return { score: sys.total, src: 'system', reason: '', level: sys.level };
  }

  /* 当前用户自己的平均 e.talk（教师复核优先），写进本机供 eval-core 读 */
  function publishMine(posts, replyCounts) {
    var myUid = uid();
    if (!myUid) return;
    var vals = posts.filter(function (p) { return p.author_id === myUid; }).map(function (p) {
      var sys = scorePost(p, (replyCounts && replyCounts[p.id]) || 0);
      return finalOf(p.id, sys).score;
    });
    if (!vals.length) return;
    var avg = Math.round(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length);
    try { localStorage.setItem('ibank_forum_etalk', JSON.stringify({ score: avg, n: vals.length, ts: Date.now() })); } catch (e) {}
    /* v159：量规分上云（type='etalk'，detail 只含 score/n 两个数字）。
       教师端五维 E 维的「讨论量规」观测点据此出分；帖子原文仍只在本机，不上传。 */
    if (typeof window.__ibankTrack === 'function') {
      try { window.__ibankTrack('etalk', { score: avg, n: vals.length }); } catch (e) {}
    }
  }

  /* ---------- 面板渲染 ---------- */
  var box = null;
  function forumState() { var f = window.IBK_FORUM; return (f && f.state) || {}; }
  function render() {
    if (!box) return;
    var st = forumState();
    var posts = st.posts || [];
    var rc = st.replyCount || {};
    if (!posts.length) {
      box.innerHTML = '<div class="frb-empty">登录并发帖后，这里会显示系统给的参考分；教师只复核异常帖。</div>';
      return;
    }
    var mine = uid(), t = isTeacher();
    var rows = posts.map(function (p) {
      var sys = scorePost(p, rc[p.id] || 0);
      var fin = finalOf(p.id, sys);
      var isMine = (p.author_id === mine);
      var abnormal = (sys.total >= 75 && fin.score < 60) || (sys.total < 55 && fin.score > 75);
      return '<div class="frb-row' + (abnormal ? ' is-abn' : '') + '">'
        + '<div class="frb-main"><span class="frb-title">' + esc(p.title || '（无标题）') + '</span>'
        + '<span class="frb-meta">' + esc(p.class_name || '') + ' · ' + esc(p.author_name || '') + '</span></div>'
        + '<div class="frb-sc"><b class="frb-lv lv-' + fin.level + '">' + fin.level + '</b>'
        + '<span class="frb-num">' + fin.score + '</span>'
        + '<span class="frb-src">' + (fin.src === 'teacher' ? '教师复核' : '系统参考') + '</span></div>'
        + (t ? '<div class="frb-rev"><input type="number" min="0" max="100" value="' + fin.score + '" data-frv-score="' + esc(p.id) + '" aria-label="teacher score">'
          + '<input type="text" maxlength="120" placeholder="复核理由（选填）" value="' + esc(fin.reason) + '" data-frv-why="' + esc(p.id) + '">'
          + '<button type="button" class="frb-save" data-frv-save="' + esc(p.id) + '">保存复核</button></div>' : '')
        + (isMine ? '<div class="frb-part">篇幅 ' + sys.parts.len + ' · 结构 ' + sys.parts.struct + ' · 概念 ' + sys.parts.conc + ' · 案例 ' + sys.parts.case + ' · 互动 ' + sys.parts.inter + '（满分 30/25/20/15/10）</div>' : '')
        + '</div>';
    }).join('');
    box.innerHTML = '<div class="frb-h">主题讨论 · 伦理量规 <span class="frb-tag">系统参考分 ＋ 教师复核</span></div>'
      + '<div class="frb-lead">系统按篇幅、论证结构、课程概念、案例数据、互动五项给参考分（A≥80 / B≥60 / C&lt;60）。教师只复核异常帖，复核分优先计入 E 维。</div>'
      + rows;
    publishMine(posts, rc);
    if (window.__ibankAvRefresh) window.__ibankAvRefresh();
  }

  function bind() {
    if (!box) return;
    box.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-frv-save]') : null;
      if (!b) return;
      if (!isTeacher()) { toast('只有教师可以复核'); return; }
      var id = b.getAttribute('data-frv-save');
      var si = box.querySelector('[data-frv-score="' + id + '"]');
      var wi = box.querySelector('[data-frv-why="' + id + '"]');
      var v = parseInt(si && si.value, 10);
      if (!isFinite(v) || v < 0 || v > 100) { toast('请输入 0–100 的分数'); return; }
      var m = all(); m[id] = { teacher: v, reason: (wi && wi.value || '').slice(0, 120), ts: Date.now(), by: uid() };
      save(m); render(); toast('复核分已保存（仅本机，不写云端）');
    });
    // 论坛模块不发事件，展开面板时刷新；另用低频轮询只在「帖子数变化」时重绘，避免无脑刷新冲刷正在输入的分数
    box.addEventListener('toggle', function () { if (box.open) render(); });
    var sig = '';
    setInterval(function () {
      if (!root.classList || !root.classList.contains('active')) return;   // 不在讨论区就不做事
      var st = forumState(), s = (st.posts || []).length + ':' + Object.keys(st.replyCount || {}).length;
      if (s !== sig) { sig = s; render(); }
    }, 1500);
  }

  function init() {
    box = q('frb-box');
    if (!box) return;
    bind(); render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.__ibankForumRubric = {
    score: scorePost,
    render: render,
    reviews: all,
    mine: function () { try { return JSON.parse(localStorage.getItem('ibank_forum_etalk') || 'null'); } catch (e) { return null; } }
  };
})();

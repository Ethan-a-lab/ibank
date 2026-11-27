/* ===================================================================
   探究成果链（专家建议④ · v141）
   —— 把「提问 → 改问 → 迭代 → 质疑修正」这条链做成看得见、可保存、
      可回放、可删除的产物。
   —— 两层数据，隐私口径分明：
      ① 过程统计：只读本机 ibank_events_local 里 qa 事件的结构化数字
         （q_len / turn / follow / revise / regen / sid，v140 已埋），
         全程不读、不存提问原文；云端也只收这些数字。
      ② 对话原文：只有学生主动点「保存这一轮」才从 window.__ibankQaDump()
         取走当前对话快照，落到本机 ibank_qa_chain；随时可删、可导出。
   —— 面板容器在 index.html 里带 data-i18n-skip：展示的是学生自己的
      中文原文，不参与英文翻译；本文件文案也只走中文，不做双语表。
   —— 纯本机、不碰云端、不改数据库；失败一律静默降级，不影响答疑主流程。
   =================================================================== */
(function () {
  'use strict';

  var root = document.getElementById('qc-panel');
  if (!root) return;

  var STORE = 'ibank_qa_chain';        // 学生主动保存的对话原文（本机）
  var EVKEY = 'ibank_events_local';    // 行为埋点（本机镜像，只读统计）
  var MAX_ITEMS = 30;                  // 最多留 30 条成果链，防本机膨胀

  function q(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function ls(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function toast(s) { try { if (typeof ibankToast === 'function') ibankToast(s); } catch (e) {} }
  function fmt(ts) {
    try { var d = new Date(ts); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
      + '-' + ('0' + d.getDate()).slice(-2) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
    catch (e) { return ''; }
  }

  /* ---------- ① 过程统计：只读 qa 埋点里的数字 ---------- */
  function qaEvents() {
    var evs = ls(EVKEY, []);
    if (!Array.isArray(evs)) return [];
    return evs.filter(function (e) { return e && e.type === 'qa'; });
  }
  function parseDetail(e) {
    if (!e || !e.detail) return {};
    try { return JSON.parse(e.detail); } catch (x) { return {}; }
  }
  function stats() {
    var evs = qaEvents(), s = {
      n: evs.length, turns: 0, follow: 0, revise: 0, regen: 0,
      lenSum: 0, sids: {}, lastTs: 0
    };
    evs.forEach(function (e) {
      var d = parseDetail(e);
      // 平均「提问」字数只取 q_len（v140 埋的结构化数字），不读任何原文；
      // e.chars 是回答字数，语义不同，不计入这里。
      var ql = typeof d.q_len === 'number' ? d.q_len : parseInt(d.q_len, 10);
      if (isFinite(ql)) s.lenSum += ql;
      if (d.turn === 1 || d.turn === '1') s.turns++;
      if (d.follow === 1 || d.follow === '1') s.follow++;
      if (d.regen === 1 || d.regen === '1') s.regen++;
      // revise 是与上一问的相似度 0-100：>=50 视为「在上一问基础上改问重提」
      var rv = typeof d.revise === 'number' ? d.revise : parseInt(d.revise, 10);
      if (rv >= 50) s.revise++;
      if (d.sid) s.sids[String(d.sid)] = 1;
      if (e.ts > s.lastTs) s.lastTs = e.ts;
    });
    s.sessions = Object.keys(s.sids).length;
    s.avgQ = s.n ? Math.round(s.lenSum / s.n) : 0;
    return s;
  }

  function renderStats() {
    var s = stats(), box = q('qc-stats');
    if (!box) return;
    var cards = [
      { k: '累计提问', v: s.n, u: '次' },
      { k: '学习会话', v: s.sessions, u: '段' },
      { k: '追问', v: s.follow, u: '次' },
      { k: '改问重提', v: s.revise, u: '次' },
      { k: '要求重生成', v: s.regen, u: '次' },
      { k: '平均提问', v: s.avgQ, u: '字' }
    ];
    box.innerHTML = cards.map(function (c) {
      return '<div class="qc-stat"><div class="qc-stat-v">' + c.v + '<small>' + c.u + '</small></div>'
        + '<div class="qc-stat-k">' + esc(c.k) + '</div></div>';
    }).join('');

    var badge = q('qc-badge'), sub = q('qc-sum-sub');
    if (badge) badge.textContent = s.n ? (s.n + ' 次提问留痕') : '尚无记录';
    if (sub) sub.textContent = s.n
      ? ('已留痕 ' + s.n + ' 次 · ' + s.sessions + ' 段会话 · 追问 ' + s.follow + ' 次 · 改问 ' + s.revise + ' 次')
      : '提问 → 改问 → 迭代 → 质疑修正，全过程留痕';

    var dim = q('qc-dim');
    if (dim) {
      if (!s.n) {
        dim.innerHTML = '<div class="qc-dim-empty">还没有提问记录。去上面问一个问题，回来就能看到过程统计。</div>';
      } else {
        var parts = [];
        if (s.follow) parts.push('有 <b>' + s.follow + '</b> 次追问——你在沿着同一个问题深挖');
        if (s.revise) parts.push('有 <b>' + s.revise + '</b> 次改问重提——你在调整提问方式而不是照单全收');
        if (s.regen) parts.push('有 <b>' + s.regen + '</b> 次要求重生成——你对答案提出了质疑');
        dim.innerHTML = '<div class="qc-dim-h">从数字看你的探究习惯</div><div class="qc-dim-b">'
          + (parts.length ? parts.join('；') + '。' : '目前是单轮提问，试着追问一句或换个说法再问，过程留痕会更丰富。')
          + '</div>';
      }
    }
  }

  /* ---------- ② 对话原文：仅学生主动保存 ---------- */
  function items() { var a = ls(STORE, []); return Array.isArray(a) ? a : []; }
  function saveItems(a) { try { localStorage.setItem(STORE, JSON.stringify(a.slice(-MAX_ITEMS))); } catch (e) { toast('保存失败：本机存储空间不足'); } }

  function renderList() {
    var box = q('qc-list'), arr = items();
    if (!box) return;
    if (!arr.length) {
      box.innerHTML = '<div class="qc-empty">还没有保存的成果链。上面的对话问完后，点「保存这一轮对话」把原文存到这里——不点就不存。</div>';
      return;
    }
    box.innerHTML = arr.map(function (it, i) {
      var turns = (it.items || []).filter(function (m) { return m.role === 'user'; }).length;
      return '<details class="qc-item" data-i="' + i + '">'
        + '<summary><span class="qc-i-no">#' + (arr.length - i) + '</span>'
        + '<span class="qc-i-t">' + esc(it.title || ('第 ' + turns + ' 轮探究')) + '</span>'
        + '<span class="qc-i-meta">' + turns + ' 轮 · ' + fmt(it.ts) + '</span></summary>'
        + '<div class="qc-i-body">' + (it.items || []).map(function (m) {
            return '<div class="qc-msg ' + (m.role === 'user' ? 'u' : 'b') + '"><span class="qc-who">'
              + (m.role === 'user' ? '我' : 'AI 学伴') + '</span><div class="qc-txt">' + esc(m.content) + '</div></div>';
          }).join('') + '</div></details>';
    }).join('');
  }

  function bind() {
    var save = q('qc-save'), exp = q('qc-export'), clear = q('qc-clear');
    if (save) save.addEventListener('click', function () {
      var dump = (typeof window.__ibankQaDump === 'function') ? window.__ibankQaDump() : [];
      var u = dump.filter(function (m) { return m.role === 'user'; });
      if (!u.length) { toast('当前还没有对话可保存，先问一个问题'); return; }
      var s = stats();
      var rec = {
        ts: Date.now(), sid: (window.__ibankSess && window.__ibankSess.sid && window.__ibankSess.sid()) || '',
        title: (u[0].content || '').slice(0, 28),
        turns: u.length,
        meta: { follow: s.follow, revise: s.revise, regen: s.regen },
        items: dump
      };
      var arr = items(); arr.push(rec); saveItems(arr);
      var panel = q('qc-panel'); if (panel) panel.open = true;
      renderList(); renderStats();
      toast('已保存到我的成果链（仅本机），可随时删除或导出');
    });

    if (exp) exp.addEventListener('click', function () {
      var arr = items();
      if (!arr.length) { toast('还没有保存的成果链'); return; }
      var md = ['# 探究成果链', '', '> 导出时间：' + fmt(Date.now()) + '　共 ' + arr.length + ' 条', ''];
      arr.forEach(function (it, idx) {
        md.push('## ' + (idx + 1) + '. ' + (it.title || '第 ' + it.turns + ' 轮探究'));
        md.push('-' + fmt(it.ts) + ' · ' + it.turns + ' 轮对话', '');
        (it.items || []).forEach(function (m) {
          md.push('**' + (m.role === 'user' ? '我' : 'AI 学伴') + '：**');
          md.push(String(m.content || '').trim(), '');
        });
      });
      try {
        var blob = new Blob([md.join('\n')], { type: 'text/markdown;charset=utf-8' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = 'iBank-探究成果链-' + new Date().toISOString().slice(0, 10) + '.md';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        toast('成果链已导出为 Markdown');
      } catch (e) { toast('导出失败：' + (e && e.message ? e.message : '未知错误')); }
    });

    if (clear) clear.addEventListener('click', function () {
      if (!items().length) { toast('成果链已经是空的'); return; }
      if (!window.confirm('确定清空本机的全部成果链吗？此操作不可撤销（云端不受影响）。')) return;
      try { localStorage.removeItem(STORE); } catch (e) {}
      renderList(); renderStats(); toast('已清空本机成果链');
    });

    var panel = q('qc-panel');
    if (panel) panel.addEventListener('toggle', function () { if (panel.open) { renderStats(); renderList(); } });
  }

  function renderAll() { renderStats(); renderList(); }
  bind();
  renderAll();
  // 供外部（答疑发送成功后）刷新统计，也供验收脚本调用
  window.__ibankQaChain = { refresh: renderAll, stats: stats, count: function () { return items().length; } };
})();

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
  var RVKEY = 'ibank_qa_review';       // v154：学生显式提交的质疑/修正（本机）
  var EVKEY = 'ibank_events_local';    // 行为埋点（本机镜像，只读统计）
  var MAX_ITEMS = 30;                  // 最多留 30 条成果链，防本机膨胀

  function q(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function ls(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function toast(s) { try { if (typeof ibankToast === 'function') ibankToast(s); } catch (e) {} }
  /* v154：面板带 data-i18n-skip，双语由本模块自己按 <html lang> 渲染；
     中文态文案与 v141 断言逐字一致，英文态只在这些节点上生效。 */
  function L(zh, en) { return document.documentElement.lang === 'en' ? en : zh; }
  function reviews() { var a = ls(RVKEY, []); return Array.isArray(a) ? a : []; }
  function saveReviews(a) { try { localStorage.setItem(RVKEY, JSON.stringify(a.slice(-200))); } catch (e) {} }
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
      { k: L('累计提问', 'Questions'), v: s.n, u: L('次', 'x') },
      { k: L('学习会话', 'Sessions'), v: s.sessions, u: L('段', 'sess') },
      { k: L('追问', 'Follow-ups'), v: s.follow, u: L('次', 'x') },
      { k: L('改问重提', 'Rephrased'), v: s.revise, u: L('次', 'x') },
      { k: L('要求重生成', 'Regenerated'), v: s.regen, u: L('次', 'x') },
      { k: L('平均提问', 'Avg. length'), v: s.avgQ, u: L('字', 'chars') }
    ];
    box.innerHTML = cards.map(function (c) {
      return '<div class="qc-stat"><div class="qc-stat-v">' + c.v + '<small>' + c.u + '</small></div>'
        + '<div class="qc-stat-k">' + esc(c.k) + '</div></div>';
    }).join('');

    var badge = q('qc-badge'), sub = q('qc-sum-sub');
    if (badge) badge.textContent = s.n ? (s.n + (L(' 次提问留痕', ' answers logged'))) : L('尚无记录', 'No records yet');
    if (sub) sub.textContent = s.n
      ? L('已留痕 ' + s.n + ' 次 · ' + s.sessions + ' 段会话 · 追问 ' + s.follow + ' 次 · 改问 ' + s.revise + ' 次',
         s.n + ' logged · ' + s.sessions + ' sessions · ' + s.follow + ' follow-ups · ' + s.revise + ' rephrasings')
      : L('提问 → 改问 → 迭代 → 质疑修正，全过程留痕',
         'Ask → rephrase → iterate → challenge: the whole chain, visible');

    var dim = q('qc-dim');
    if (dim) {
      if (!s.n) {
        dim.innerHTML = '<div class="qc-dim-empty">' + L('还没有提问记录。去上面问一个问题，回来就能看到过程统计。',
          'No questions logged yet. Ask one above, then come back to see your process log.') + '</div>';
      } else {
        var parts = [];
        if (s.follow) parts.push(L('有 <b>' + s.follow + '</b> 次追问——你在沿着同一个问题深挖',
          '<b>' + s.follow + '</b> follow-ups — you dug deeper into the same question'));
        if (s.revise) parts.push(L('有 <b>' + s.revise + '</b> 次改问重提——你在调整提问方式而不是照单全收',
          '<b>' + s.revise + '</b> rephrasings — you adjusted how you ask instead of accepting the first answer'));
        if (s.regen) parts.push(L('有 <b>' + s.regen + '</b> 次要求重生成——你对答案提出了质疑',
          '<b>' + s.regen + '</b> regenerations — you challenged the answer'));
        dim.innerHTML = '<div class="qc-dim-h">' + L('从数字看你的探究习惯', 'Your inquiry habits in numbers') + '</div><div class="qc-dim-b">'
          + (parts.length ? parts.join(L('；', '; ')) + L('。', '.') : L('目前是单轮提问，试着追问一句或换个说法再问，过程留痕会更丰富。',
             'Single-turn so far. Try a follow-up or rephrase the question to make your chain richer.'))
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
      box.innerHTML = '<div class="qc-empty">' + L('还没有保存的成果链。上面的对话问完后，点「保存这一轮对话」把原文存到这里——不点就不存。',
        'No saved chain yet. After a conversation, tap “Save this conversation” to keep the transcript here — nothing is stored unless you do.') + '</div>';
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

  /* ---------- ③ 显式质疑 / 修正（v154） ---------- */
  function ensureReviewSection() {
    var body = root.querySelector('.qc-body');
    if (!body || q('qc-review-sec')) return;
    var sec = document.createElement('div');
    sec.className = 'qc-sec'; sec.id = 'qc-review-sec';
    sec.innerHTML = '<h4 id="qc-rv-h"></h4>'
      + '<div class="qc-rv-intro" id="qc-rv-intro"></div>'
      + '<div class="qc-reviews" id="qc-reviews"></div>';
    body.appendChild(sec);
  }

  function renderReviews() {
    var box = q('qc-reviews'); if (!box) return;
    var arr = reviews();
    if (!arr.length) {
      box.innerHTML = '<div class="qc-empty">' + L('还没有质疑或修正记录。在 AI 回答下方点「⚑ 质疑」或「✎ 修正」，写下理由即可留痕。',
        'No challenges or fixes yet. Tap “⚑ Challenge” or “✎ Revise” under an AI answer and write your reason.') + '</div>';
      return;
    }
    box.innerHTML = arr.slice().reverse().map(function (r) {
      var t = r.type === 'revise' ? L('修正', 'Fix') : L('质疑', 'Challenge');
      return '<div class="qc-rv"><div class="qc-rv-h"><span class="qc-rv-tag">' + esc(t)
        + '</span><span class="qc-rv-ts">' + fmt(r.ts) + '</span></div>'
        + '<div class="qc-rv-b">' + esc(r.reason) + '</div></div>';
    }).join('');
  }

  function applyLabels() {
    var h4 = root.querySelectorAll('.qc-sec h4');
    if (h4[0]) h4[0].innerHTML = L('① 过程统计 <span class="qc-tag">自动 · 只记数字</span>',
      '① Process log <span class="qc-tag">Automatic · numbers only</span>');
    if (h4[1]) h4[1].innerHTML = L('② 我的成果链 <span class="qc-tag">主动保存 · 可删</span>',
      '② My chain <span class="qc-tag">Saved by you · deletable</span>');
    var h3 = q('qc-rv-h');
    if (h3) h3.innerHTML = L('③ 质疑与修正 <span class="qc-tag">显式留痕 · 本机</span>',
      '③ Challenges & fixes <span class="qc-tag">Explicit · on this device</span>');
    var intro = q('qc-rv-intro');
    if (intro) intro.textContent = L('对答案不同意？点一下、写清楚理由——这条链才算真正经过你的思考。',
      'Disagree with an answer? Say so, and explain why — that is what turns a transcript into your own chain.');
    var lead = root.querySelector('.qc-lead');
    if (lead) lead.innerHTML = L(
      '系统只自动记录<b>次数与轮次</b>（不问你写了什么）；<b>对话原文只有你自己点「保存这一轮」才会存到本机</b>，随时可删、可导出。云端只收结构化数字，不收提问原文。',
      'The system logs <b>counts and turns only</b> (not what you wrote); <b>the transcript is saved to this device only when you tap “Save this conversation”</b>, and can be deleted or exported any time. The cloud receives structured numbers, never your question text.');
    var st = q('qc-save'), ex = q('qc-export'), cl = q('qc-clear');
    if (st) st.textContent = L('保存这一轮对话', 'Save this conversation');
    if (ex) ex.textContent = L('导出成果链', 'Export chain');
    if (cl) cl.textContent = L('清空', 'Clear');
    var tt = root.querySelector('.qc-sum-t');
    if (tt) tt.textContent = L('探究成果链', 'Inquiry chain');
  }

  /* 供答疑页「⚑ 质疑 / ✎ 修正」按钮调用：理由只落本机，云端只收长度数字。 */
  window.__ibankQaReviewSave = function (type, reason, aid, qLen, aLen) {
    reason = String(reason || '').trim();
    if (reason.length < 4) { toast(L('理由至少写 4 个字', 'Please write at least 4 characters')); return false; }
    var rec = {
      ts: Date.now(), type: type === 'revise' ? 'revise' : 'challenge',
      aid: aid || 0, reason: reason.slice(0, 600), q_len: qLen || 0, a_len: aLen || 0,
      sid: (window.__ibankSess && window.__ibankSess.sid && window.__ibankSess.sid()) || ''
    };
    var arr = reviews(); arr.push(rec); saveReviews(arr);
    if (typeof window.__ibankTrack === 'function') {
      try {
        window.__ibankTrack('qa_review', {
          typ: rec.type === 'challenge' ? 1 : 2,
          reason_len: rec.reason.length, q_len: rec.q_len, a_len: rec.a_len, sid: rec.sid
        });
      } catch (e) { /* 上报失败不阻断本地留痕 */ }
    }
    renderReviews(); renderStats();
    toast(rec.type === 'challenge'
      ? L('已记录质疑，可在成果链查看', 'Challenge saved — see it in your inquiry chain')
      : L('已记录修正，可在成果链查看', 'Revision saved — see it in your inquiry chain'));
    return true;
  };

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
      if (!arr.length && !reviews().length) { toast(L('还没有保存的成果链', 'No saved chain yet')); return; }
      var md = ['# 探究成果链 / Inquiry chain', '', L('> 导出时间：', '> Exported: ') + fmt(Date.now()) + '　' + L('共', '') + ' ' + arr.length + ' ' + L('条', 'items'), ''];
      arr.forEach(function (it, idx) {
        md.push('## ' + (idx + 1) + '. ' + (it.title || '第 ' + it.turns + ' 轮探究'));
        md.push('-' + fmt(it.ts) + ' · ' + it.turns + ' 轮对话', '');
        (it.items || []).forEach(function (m) {
          md.push('**' + (m.role === 'user' ? '我' : 'AI 学伴') + '：**');
          md.push(String(m.content || '').trim(), '');
        });
      });
      var rvs = reviews();
      if (rvs.length) {
        md.push('## ' + L('质疑与修正 / Challenges & fixes', 'Challenges & fixes'), '');
        rvs.forEach(function (r, i) {
          md.push((i + 1) + '. ' + (r.type === 'revise' ? L('修正', 'Fix') : L('质疑', 'Challenge'))
            + ' · ' + fmt(r.ts));
          md.push('   ' + String(r.reason || '').trim(), '');
        });
      }
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
      if (!items().length && !reviews().length) { toast(L('成果链已经是空的', 'The chain is already empty')); return; }
      if (!window.confirm(L('确定清空本机的全部成果链（含质疑与修正）吗？此操作不可撤销（云端不受影响）。',
        'Clear the entire chain on this device (including challenges and fixes)? This cannot be undone; the cloud is unaffected.'))) return;
      try { localStorage.removeItem(STORE); localStorage.removeItem(RVKEY); } catch (e) {}
      renderList(); renderReviews(); renderStats(); toast(L('已清空本机成果链', 'Local chain cleared'));
    });

    var panel = q('qc-panel');
    if (panel) panel.addEventListener('toggle', function () { if (panel.open) { renderStats(); renderList(); renderReviews(); } });
  }

  function renderAll() { renderStats(); renderList(); renderReviews(); }
  ensureReviewSection();
  applyLabels();
  bind();
  renderAll();
  try { window.addEventListener('ibk:lang', function () { applyLabels(); renderAll(); }); } catch (e) {}
  // 供外部（答疑发送成功后）刷新统计，也供验收脚本调用
  window.__ibankQaChain = { refresh: renderAll, stats: stats, count: function () { return items().length; } };
})();

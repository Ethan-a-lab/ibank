/* iBank · 两套数据并存的分层看板 v143
 * 目的：申报基线（以前的班，sim_ 假 uid）与真实数据（现在的班，profiles.class_name）
 *       并列显示，按班级 / 按年级汇总，互不混算。
 *
 * 硬约束（改动边界）：
 *   1. 不改 simBaseline()，不改现有申报看板的任何一个数字；
 *   2. 只读 window.__ibankCohort 暴露的基线与档案，云端事件自行分页拉取；
 *   3. 教师身份才渲染，学生端不加载任何数据；
 *   4. 面板整体 data-i18n-skip，新增中文不进 i18n 词典、不抬英文态残留。
 */
(function () {
  'use strict';

  var box = null;
  var mode = 'all';        // all | sim | real
  var groupBy = 'class';   // class | grade
  var cache = null;        // { sim: [...], real: [...] } 已归一化的事件行
  var loading = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }

  /* 班级名 → 年级：金融2401 → 24级；金融2503 → 25级。
     解析不出数字时归入「未分年级」，不丢数据。 */
  function gradeOf(cls) {
    var m = /(\d{2})\d{2}/.exec(String(cls || ''));
    return m ? (m[1] + '级') : '未分年级';
  }

  function db() { var c = window.__ibankCloud; return c ? c.db : null; }
  function cohort() { return window.__ibankCohort; }
  function isAdmin() { var c = cohort(); return !!(c && c.isAdmin && c.isAdmin()); }

  /* ---------- 取数：两套源分开 ---------- */
  async function loadAll() {
    if (cache) return cache;
    var sim = [], real = [];
    var c = cohort();

    // ① 申报基线：直接取现成的基线事件（含 __sim 标记 + sim_ uid）
    if (c && c.baseline) {
      try {
        var base = c.baseline() || [];
        base.forEach(function (e) {
          if (!e) return;
          var cls = (c.simClass && c.simClass(e.uid)) || '未分班';
          sim.push({ uid: e.uid, cls: cls, grade: gradeOf(cls),
            type: e.type, correct: e.correct, ts: e.ts, sim: true });
        });
      } catch (e) {}
    }

    // ② 真实档案：profiles.class_name → uid 映射
    var clsOf = {};
    try {
      var d = db();
      if (d) {
        var rp = await d.from('profiles').select('id, class_name, role');
        var rows = (rp && rp.data) || [];
        rows.forEach(function (r) {
          if (!r || !r.id) return;
          clsOf[r.id] = {
            cls: String(r.class_name || '').trim() || '未分班',
            role: r.role || ''
          };
        });
      }
    } catch (e) {}

    // ③ 真实事件：分页拉取，排除 sim_ / anon
    try {
      var d2 = db();
      if (d2) {
        var PAGE = 1000, CAP = 20000;
        for (var from = 0; from < CAP; from += PAGE) {
          var r2 = await d2.from('events')
            .select('id, uid, type, chapter, correct, module, duration, ts')
            .order('id', { ascending: true }).range(from, from + PAGE - 1);
          var got = (r2 && r2.data) || [];
          got.forEach(function (e) {
            var u = String((e && e.uid) || '');
            if (!u || u === 'anon' || u.indexOf('sim_') === 0) return;   // 两套严格隔离
            var info = clsOf[u] || { cls: '未分班', role: '' };
            if (info.role === 'teacher' || info.role === 'admin') return; // 教师行为不进统计
            var cls = info.cls;
            real.push({ uid: u, cls: cls, grade: gradeOf(cls),
              type: e.type, correct: e.correct, ts: e.ts, sim: false });
          });
          if (got.length < PAGE) break;
        }
      }
    } catch (e) {}

    // ④ 本机镜像并入真实（未登录时的埋点），仍排除 sim_
    try {
      var local = JSON.parse(localStorage.getItem('ibank_events_local') || '[]');
      local.forEach(function (e) {
        var u = String((e && e.uid) || '');
        if (u.indexOf('sim_') === 0) return;
        var info = clsOf[u] || { cls: '未分班', role: '' };
        if (info.role === 'teacher' || info.role === 'admin') return;
        real.push({ uid: u || 'anon', cls: info.cls, grade: gradeOf(info.cls),
          type: e.type, correct: e.correct, ts: e.ts, sim: false });
      });
    } catch (e) {}

    cache = { sim: sim, real: real };
    return cache;
  }

  /* ---------- 聚合：按班级或年级分组 ---------- */
  function aggregate(rows, by) {
    var key = by === 'grade' ? 'grade' : 'cls';
    var groups = {};
    rows.forEach(function (e) {
      var k = e[key] || '未分班';
      if (!groups[k]) groups[k] = { key: k, uids: {}, students: 0, qa: 0, quiz: 0,
        quizOk: 0, study: 0, module: 0, other: 0, last: 0 };
      var g = groups[k];
      g.uids[e.uid] = 1;
      if (e.type === 'qa') g.qa++;
      else if (e.type === 'quiz') { g.quiz++; if (e.correct === true) g.quizOk++; }
      else if (e.type === 'study') g.study++;
      else if (e.type === 'module') g.module++;
      else g.other++;
      if (e.ts && e.ts > g.last) g.last = e.ts;
    });
    return Object.keys(groups).map(function (k) {
      var g = groups[k];
      g.students = Object.keys(g.uids).length;
      delete g.uids;
      g.acc = g.quiz ? Math.round(g.quizOk / g.quiz * 100) : null;
      return g;
    }).sort(function (a, b) { return b.students - a.students || a.key.localeCompare(b.key); });
  }

  function sum(groups) {
    var s = { classes: groups.length, students: 0, qa: 0, quiz: 0, quizOk: 0, study: 0, module: 0 };
    groups.forEach(function (g) {
      s.students += g.students; s.qa += g.qa; s.quiz += g.quiz;
      s.quizOk += g.quizOk; s.study += g.study; s.module += g.module;
    });
    s.acc = s.quiz ? Math.round(s.quizOk / s.quiz * 100) : null;
    return s;
  }

  /* ---------- 渲染 ---------- */
  function table(groups, label) {
    if (!groups.length) {
      return '<div class="cb-empty">' + esc(label) + '：暂无数据</div>';
    }
    var head = groupBy === 'grade' ? '年级' : '班级';
    var h = '<table class="cb-tbl"><thead><tr><th>' + head + '</th><th>人数</th><th>答题</th>'
      + '<th>正确率</th><th>提问</th><th>章节</th></tr></thead><tbody>';
    groups.forEach(function (g) {
      h += '<tr><td class="cb-cls">' + esc(g.key) + '</td><td>' + g.students + '</td><td>' + g.quiz
        + '</td><td>' + (g.acc == null ? '—' : g.acc + '%') + '</td><td>' + g.qa
        + '</td><td>' + g.study + '</td></tr>';
    });
    return h + '</tbody></table>';
  }

  function card(title, groups, tone) {
    var s = sum(groups);
    return '<div class="cb-card cb-' + tone + '">'
      + '<div class="cb-card-h"><b>' + esc(title) + '</b><span>'
      + s.classes + (groupBy === 'grade' ? ' 个年级' : ' 个班') + ' · ' + s.students + ' 人</span></div>'
      + '<div class="cb-kpis">'
      + '<div><span>答题</span><b>' + s.quiz + '</b></div>'
      + '<div><span>正确率</span><b>' + (s.acc == null ? '—' : s.acc + '%') + '</b></div>'
      + '<div><span>提问</span><b>' + s.qa + '</b></div>'
      + '<div><span>章节</span><b>' + s.study + '</b></div>'
      + '</div>' + table(groups, title) + '</div>';
  }

  function controls() {
    var src = [['all', '两套并列'], ['sim', '仅申报基线'], ['real', '仅真实数据']]
      .map(function (o) {
        return '<button type="button" class="cb-btn' + (mode === o[0] ? ' on' : '') + '" data-cb-mode="'
          + o[0] + '">' + o[1] + '</button>';
      }).join('');
    var grp = [['class', '按班级'], ['grade', '按年级']]
      .map(function (o) {
        return '<button type="button" class="cb-btn' + (groupBy === o[0] ? ' on' : '') + '" data-cb-group="'
          + o[0] + '">' + o[1] + '</button>';
      }).join('');
    return '<div class="cb-ctl"><span class="cb-lb">数据源</span>' + src
      + '<span class="cb-sep"></span><span class="cb-lb">汇总</span>' + grp + '</div>';
  }

  function render() {
    if (!box || !cache) return;
    var simG = aggregate(cache.sim, groupBy);
    var realG = aggregate(cache.real, groupBy);
    var h = controls();
    h += '<div class="cb-note">申报基线 = 以前的班（sim_ 假数据，原样保留）；真实数据 = 现在的班（登录学生）。\n'
      + '两套各自统计，互不混算；本面板不改变上方申报看板的任何数字。</div>';
    h += '<div class="cb-grid">';
    if (mode !== 'real') h += card('申报基线 · 以前的班', simG, 'sim');
    if (mode !== 'sim') h += card('真实数据 · 现在的班', realG, 'real');
    h += '</div>';
    box.innerHTML = h;
  }

  async function load() {
    if (!box || loading) return;
    loading = true;
    box.innerHTML = '<div class="cb-empty">正在加载两套数据…</div>';
    try { await loadAll(); render(); }
    catch (e) { box.innerHTML = '<div class="cb-empty">数据加载失败：' + esc(e && e.message) + '</div>'; }
    loading = false;
  }

  function bind() {
    if (!box) return;
    box.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-cb-mode],[data-cb-group]') : null;
      if (!b) return;
      var m = b.getAttribute('data-cb-mode');
      var g = b.getAttribute('data-cb-group');
      if (m) { mode = m; render(); }
      else if (g) { groupBy = g; render(); }
    });
  }

  function init() {
    box = document.getElementById('cb-board');
    if (!box) return;
    bind();
    // 教师身份 + 进入后台页时才加载；用轮询判断登录态与页面可见性，避免依赖其它模块事件
    var tried = false;
    function maybe() {
      if (tried || !isAdmin()) return;
      var pg = document.getElementById('p-admin');
      if (!pg || pg.classList.contains('hidden') || getComputedStyle(pg).display === 'none') return;
      tried = true;
      load();
    }
    var iv = setInterval(function () {
      maybe();
      if (tried) clearInterval(iv);
    }, 800);
    setTimeout(maybe, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 暴露给验收脚本：可强制刷新、可查询当前归一化数据
  window.__ibankCohortBoard = {
    reload: function () { cache = null; return load(); },
    data: function () { return cache; },
    setMode: function (m, g) { if (m) mode = m; if (g) groupBy = g; render(); },
    /* 测试注入：把归一化后的两套行直接塞进缓存并渲染。
       仅用于验收脚本确定性验证分流/聚合，不写任何持久化存储。 */
    inject: function (simRows, realRows) {
      cache = { sim: simRows || [], real: realRows || [] };
      render();
    },
    agg: function (which, by) {
      return aggregate((cache && cache[which]) || [], by || 'class');
    }
  };
})();

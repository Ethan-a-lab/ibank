/* ============================================================
   五维能力达成评价 · 计算与渲染  v2
   数据口径：
     · 课程目标 / 指标点 / 考核环节比例  —— 《投资银行学》教学大纲（思政版）表1、表3，实数
     · 班级规模 42 人                  —— 教学日历（2025-2026-1，金融 2303 班），实数
     · 本班达成度分布                  —— 示例数据集（n=42，用于权重敏感性检验）
     · 个人五维得分                    —— 由本机真实行为事件现算（ibank_events_local 等）
                                          算不出来的一律显示「待采集」，不用 0 分冒充
     · 知识整合维度                    —— 六个业务模块，与「个人学情画像」同一套算法（两页已合并）
   本文件不改动 app-core.js 的任何行为，只往 #p-eval 里渲染。
   ============================================================ */
(function () {
  'use strict';
  var root = document.getElementById('p-eval');
  if (!root) return;

  /* ---------------- 1. 大纲实数：考核环节 → 课程目标 ---------------- */
  var LINKS = [
    { n: '在线学习', p: 10, g: ['G1'] },
    { n: '单元测验', p: 10, g: ['G1', 'G2'] },
    { n: '课堂表现', p: 10, g: ['G1', 'G2'] },
    { n: '主题讨论', p: 10, g: ['G3'] },
    { n: '小组报告', p: 10, g: ['G2', 'G3'] },
    { n: '期末闭卷', p: 50, g: ['G1', 'G2'] }
  ];

  var GOALS = [
    { id: 'G1', name: '课程目标 1 · 知识', pts: '2-1、2-3', hml: [3, 3], kind: '知识类' },
    { id: 'G2', name: '课程目标 2 · 能力', pts: '2-8、2-9', hml: [3, 3], kind: '能力类' },
    { id: 'G3', name: '课程目标 3 · 素养', pts: '2-4、2-7', hml: [2, 3], kind: '素养类' }
  ];

  /* 由表3 均分反推现状权重 */
  var BACK = (function () {
    var o = { G1: 0, G2: 0, G3: 0 };
    LINKS.forEach(function (l) {
      var each = l.p / l.g.length;
      l.g.forEach(function (g) { o[g] += each; });
    });
    return o;
  })();

  /* H/M/L 归一化 */
  var HMLSUM = GOALS.reduce(function (a, g) { return a + g.hml[0] + g.hml[1]; }, 0);
  var HMLW = {};
  GOALS.forEach(function (g) { HMLW[g.id] = (g.hml[0] + g.hml[1]) / HMLSUM * 100; });

  /* ---------------- 2. 六业务模块（与旧画像页同一映射） ---------------- */
  var CHS = ['第0章', '第1章', '第2章', '第3章', '第4章', '第5章', '第6章', '第7章'];
  var MODS = [
    { n: '承销实务', chs: ['第0章', '第1章', '第3章', '第4章'], demo: 84, note: '投行职业与业务范围、IPO 承销、再融资' },
    { n: '估值方法', chs: ['第2章', '第3章', '第7章'], demo: 79, note: '融资方案、发行定价、并购估值' },
    { n: '并购重组', chs: ['第7章'], demo: 64, note: '并购动因、支付方式、杠杆收购' },
    { n: '债券业务', chs: ['第4章', '第5章'], demo: 72, note: '可转债 / 可交换债、债券承销与评级' },
    { n: '宏观市场', chs: ['第2章', '第5章'], demo: 68, note: '利率环境与融资成本（无专章，由 2 / 5 章映射）' },
    { n: '尽职调查', chs: ['第3章', '第6章', '第7章'], demo: 75, note: 'IPO / 资产证券化 / 并购三类尽调' }
  ];
  var MODSUM = MODS.reduce(function (a, m) { return a + m.chs.length; }, 0);
  var NCASE = 13;   // 合并后全站功能模块数（个人学情画像已并入本页）

  /* ---------------- 3. 五维定义（key 对应实时取数） ---------------- */
  var DIMS = [
    {
      k: 'K', name: '知识整合与高阶思维', short: '知识整合', goal: 'G1', pts: '2-1、2-3',
      line: 75, c: 'var(--av-c1)', tag: '六业务模块 × 过程证据',
      metric: '六个业务模块的章节作答、错题消化与学习投入',
      src: '题库作答 ＋ 错题本回流 ＋ 章节学习时长',
      obs: MODS.map(function (m) {
        return {
          n: m.n, p: m.chs.length / MODSUM, key: 'm.' + m.n, demo: m.demo,
          s: m.chs.join(' / ') + '　' + m.note
        };
      })
    },
    {
      k: 'D', name: '风险预判与决策能力', short: '决策预判', goal: 'G2', pts: '2-8、2-9',
      line: 70, c: 'var(--av-c2)', tag: '选得对不对',
      metric: '定价偏离度 · 押注与复盘',
      src: 'IPO 仿真 ＋ 簿记仿真 ＋ 课程项目',
      obs: [
        { n: 'IPO 定价各步得分率', p: 0.40, key: 'd.ipo', demo: 66, s: 'IPO 定价配售仿真日志（每步提交即记分）' },
        { n: '簿记定价偏离真值', p: 0.40, key: 'd.bond', demo: 58, s: '债券簿记仿真（改价次数与最终利率）' },
        { n: '路线押注与项目推进', p: 0.20, key: 'd.proj', demo: 85, s: '课程项目（押注 + 状态推进）' }
      ]
    },
    {
      k: 'E', name: '价值认同与职业伦理', short: '职业伦理', goal: 'G3', pts: '2-4',
      line: 70, c: 'var(--av-c3)', tag: '定性为主 · 三级量规',
      metric: '合规情境判断与理由质量',
      src: '投行教学案例库 ＋ 主题讨论量规',
      obs: [
        { n: '合规情境判断与理由', p: 0.6, key: 'e.case', demo: 84, s: '投行教学案例库（决策 + 书面理由）' },
        { n: '主题讨论 · 伦理量规', p: 0.4, key: 'e.talk', demo: 78, s: '教师三级量规评分（尚未建）' }
      ]
    },
    {
      k: 'S', name: '自主学习与自我管理', short: '自主学习', goal: 'G3', pts: '2-7',
      line: 70, c: 'var(--av-c4)', tag: '行为留痕为主',
      metric: '模块使用广度 · 章节完成与时长 · 错题消化率',
      src: '全站访问埋点 ＋ 章节学习 ＋ 错题本',
      obs: [
        { n: '功能模块使用广度', p: 0.25, key: 's.cov', demo: 71, s: '全站 module 埋点（去重计 13 个模块）' },
        { n: '章节完成度与学习时长', p: 0.35, key: 's.done', demo: 75, s: '章节完成标记 ＋ ibank_time_第X章' },
        { n: '错题消化率', p: 0.40, key: 's.digest', demo: 68, s: '错题本 status=mastered 占比' }
      ]
    },
    {
      k: 'R', name: '压力应对与心理韧性', short: '心理韧性', goal: 'G2', pts: '2-8（压力情境）',
      line: 70, c: 'var(--av-c5)', tag: '行为观测 · 独立计分',
      metric: '反复试错的收敛速度 · 回撤后的仓位调整',
      src: 'IPO 重试记录 ＋ 股市模拟委托流水',
      obs: [
        { n: 'IPO 反复试错的收敛', p: 0.6, key: 'r.tries', demo: 64, s: 'IPO 仿真的重试次数（tries）' },
        { n: '回撤期调仓幅度', p: 0.4, key: 'r.trade', demo: 70, s: '股市模拟委托流水（待接入）' }
      ]
    }
  ];
  var SCORED = DIMS.filter(function (d) { return d.line > 0; });
  var TOTAL_OBS = DIMS.reduce(function (a, d) { return a + d.obs.length; }, 0);

  /* ---------------- 3.5 权重状态 ---------------- */
  var state = { W: { G1: 35, G2: 35, G3: 30 }, mix: 50, sel: 'K' };

  function weights() {
    var w = { G1: state.W.G1, G2: state.W.G2, G3: state.W.G3 };
    var sum = w.G1 + w.G2 + w.G3 || 1;
    return {
      G1: w.G1 / sum * 100,
      G2: w.G2 / sum * 100,
      G3: w.G3 / sum * 100,
      E: (w.G3 / sum * 100) * (state.mix / 100),
      S: (w.G3 / sum * 100) * (1 - state.mix / 100)
    };
  }

  function dimWeights() {
    var w = weights();
    /* G2 的 35 分内部再切：预判与选择 25、压力下的稳定性 10。
       比例写死为 25:10，是为了当 G1/G2/G3 被调参时，这个内部结构不被拉歪。
       切分依据是证据来源不同（定价/押注 vs 反复试错/回撤调仓），
       不是把 2-8、2-9 两个指标点的权重拆开——G2 仍整体挂在 2-8、2-9 上。 */
    return { K: w.G1, D: w.G2 * 25 / 35, R: w.G2 * 10 / 35, E: w.E, S: w.S };
  }

  /* ---------------- 4. 实时取数：从本机事件流现算 ---------------- */
  var MODE = 'live';
  var M = { val: {}, ev: {}, n: 0 };

  function ls(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function num(k) { try { return parseInt(localStorage.getItem(k) || '0', 10) || 0; } catch (e) { return 0; } }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function computeM() {
    var evs = ls('ibank_events_local', []);
    if (!Array.isArray(evs)) evs = [];
    var done = ls('ibank_chapter_done', {}) || {};
    var wb = ls('ibank_wrongbook', null);
    var items = (wb && wb.items && typeof wb.items === 'object')
      ? Object.keys(wb.items).map(function (k) { return wb.items[k]; }) : [];
    items = items.filter(function (w) { return w && !w.isSeed; });
    var times = {};
    CHS.forEach(function (c) { times[c] = num('ibank_time_' + c); });

    var Out = { val: {}, ev: {}, n: evs.length, quiz: 0, qok: 0, tries: 0 };
    var qs = evs.filter(function (e) { return e && e.type === 'quiz' && typeof e.correct === 'boolean'; });
    Out.quiz = qs.length;
    Out.qok = qs.filter(function (e) { return e.correct; }).length;

    /* 六业务模块：正确率 .50 / 完成度 .22 / 错题消化 .18 / 时长 .10，缺项归一化 */
    MODS.forEach(function (m) {
      var mq = qs.filter(function (e) { return m.chs.indexOf(e.chapter) >= 0; });
      var mAcc = mq.length ? mq.filter(function (e) { return e.correct; }).length / mq.length : null;
      var anyDone = Object.keys(done).length > 0;
      var dn = 0; m.chs.forEach(function (c) { if (done[c]) dn++; });
      var mProg = anyDone ? dn / m.chs.length : null;
      var mw = items.filter(function (w) { return m.chs.indexOf(w.chapter) >= 0; });
      var mDig = mw.length ? mw.filter(function (w) { return w.status === 'mastered'; }).length / mw.length : null;
      var sec = 0; m.chs.forEach(function (c) { sec += times[c] || 0; });
      var mTime = sec >= 60 ? Math.min(1, (sec / m.chs.length) / 5400) : null;

      var parts = [];
      if (mAcc != null) parts.push([mAcc, 0.50]);
      if (mProg != null) parts.push([mProg, 0.22]);
      if (mDig != null) parts.push([mDig, 0.18]);
      if (mTime != null) parts.push([mTime, 0.10]);
      var v = null;
      if (parts.length) {
        var sw = 0, sa = 0;
        parts.forEach(function (p) { sw += p[1]; sa += p[0] * p[1]; });
        v = sa / sw * 100;
        /* 证据越少越往 50 拉：答 1 题就判 0 分是把「还没学」当成「学了 0 分」 */
        var evid = mq.length + mw.length;
        if (evid < 8) v = v + (50 - v) * (8 - evid) / 8;
      }
      Out.val['m.' + m.n] = v == null ? null : Math.round(v);
      Out.ev['m.' + m.n] = mq.length + ' 题作答 · ' + mw.length + ' 条错题'
        + (sec ? ' · ' + Math.round(sec / 60) + ' 分钟' : '');
    });

    /* IPO：各步得分率均值 */
    var ios = evs.filter(function (e) { return e && e.type === 'ipo' && e.max > 0 && typeof e.score === 'number'; });
    if (ios.length) {
      var s = 0;
      ios.forEach(function (e) { s += e.score / e.max; });
      Out.val['d.ipo'] = Math.round(s / ios.length * 100);
      Out.tries = Math.max.apply(null, ios.map(function (e) { return e.tries || 1; }));
      Out.ev['d.ipo'] = ios.length + ' 次分步提交 · 最多重试 ' + Out.tries + ' 次';
    } else { Out.val['d.ipo'] = null; }

    /* 簿记：定价偏离 1.72% 每 bp 扣 4 分；流标直接判 45 */
    var bs = evs.filter(function (e) { return e && e.type === 'bond'; });
    var bv = null;
    if (bs.length) {
      var last = bs[bs.length - 1], dt = null;
      try { dt = JSON.parse(last.detail || '{}'); } catch (e) { dt = null; }
      if (dt && dt.fail) {
        bv = 45;
        Out.ev['d.bond'] = '本次流标 · 改价 ' + (dt.edits || 0) + ' 次';
      } else if (dt && typeof dt.rate === 'number' && dt.rate > 0) {
        var dev = Math.abs(dt.rate - 1.72) * 100;
        bv = clamp(100 - dev * 4, 0, 100);
        Out.ev['d.bond'] = '定价 ' + dt.rate.toFixed(2) + '% · 偏离 ' + dev.toFixed(0) + ' bp · 改价 ' + (dt.edits || 0) + ' 次';
      }
    }
    Out.val['d.bond'] = bv == null ? null : Math.round(bv);

    /* 课程项目：押注 30 + 推进状态 40 起 */
    var ps = evs.filter(function (e) { return e && e.type === 'project'; });
    if (ps.length) {
      var picked = ps.some(function (e) { return e.pick; });
      var stated = ps.some(function (e) { return e.state === 'done'; });
      var anyState = ps.some(function (e) { return e.state; });
      Out.val['d.proj'] = Math.min(100, 40 + (picked ? 30 : 0) + (stated ? 30 : (anyState ? 15 : 0)));
      Out.ev['d.proj'] = (picked ? '已押注路线' : '未押注') + ' · ' + (stated ? '已完成' : anyState ? '进行中' : '未启动');
    } else { Out.val['d.proj'] = null; }

    /* 合规情境判断：有决策 + 理由 ≥20 字 */
    var cbs = evs.filter(function (e) { return e && e.type === 'cb_decision'; });
    var cv = null;
    if (cbs.length) {
      cbs.forEach(function (e) {
        var L = 0;
        try { var d2 = JSON.parse(e.detail || '{}'); L = String(d2.reason || '').length; } catch (x) { L = 0; }
        var v2 = L >= 20 ? 100 : (L > 0 ? 80 : 60);
        cv = cv == null ? v2 : Math.max(cv, v2);
      });
      Out.ev['e.case'] = cbs.length + ' 次情境决策提交';
    }
    Out.val['e.case'] = cv;

    /* 模块使用广度 */
    var seen = {};
    evs.forEach(function (e) { if (e && e.type === 'module' && e.module) seen[e.module] = 1; });
    var nMod = Object.keys(seen).length;
    Out.val['s.cov'] = nMod ? Math.round(clamp(nMod / NCASE * 100, 0, 100)) : null;
    Out.ev['s.cov'] = nMod + ' / ' + NCASE + ' 个模块';

    /* 章节完成度 + 时长 */
    var dk = Object.keys(done).filter(function (k) { return done[k]; }).length;
    var hasDone = Object.keys(done).length > 0;
    var secAll = 0; CHS.forEach(function (c) { secAll += times[c] || 0; });
    var dv = null;
    if (hasDone || secAll >= 60) {
      var prog = hasDone ? dk / CHS.length * 100 : null;
      var tS = secAll >= 60 ? clamp(secAll / CHS.length / 5400 * 100, 0, 100) : null;
      if (prog != null && tS != null) dv = prog * 0.6 + tS * 0.4;
      else dv = prog != null ? prog : tS;
    }
    Out.val['s.done'] = dv == null ? null : Math.round(dv);
    Out.ev['s.done'] = dk + ' / 8 章完成 · ' + (secAll / 3600).toFixed(1) + ' 小时';

    /* 错题消化率 */
    Out.val['s.digest'] = items.length
      ? Math.round(items.filter(function (w) { return w.status === 'mastered'; }).length / items.length * 100) : null;
    Out.ev['s.digest'] = items.length
      ? items.filter(function (w) { return w.status === 'mastered'; }).length + ' / ' + items.length + ' 题已消化' : '';

    /* 韧性：试错收敛 */
    Out.val['r.tries'] = Out.tries ? clamp(100 - (Out.tries - 1) * 12, 0, 100) : null;
    Out.ev['r.tries'] = Out.tries ? '最多重试 ' + Out.tries + ' 次' : '';

    /* 尚未接入的观测点一律 null，不用示例值冒充 */
    ['d.stress', 'e.talk', 'r.trade'].forEach(function (k) { Out.val[k] = null; });

    return Out;
  }

  function hasRealData() {
    return M.n > 0 || Object.keys(M.val).some(function (k) { return M.val[k] != null; });
  }

  /* ---------------- 5. 取数与合成 ---------------- */
  function valOf(o) {
    if (MODE === 'demo') return o.demo == null ? null : o.demo;
    return M.val[o.key] == null ? null : M.val[o.key];
  }
  function evOf(o) {
    if (MODE === 'demo') return '示例数据';
    return M.ev[o.key] || '';
  }
  function dimScore(d) {
    var sum = 0, wp = 0, have = 0;
    d.obs.forEach(function (o) {
      var v = valOf(o);
      if (v == null) return;
      sum += o.p * v; wp += o.p; have++;
    });
    if (!wp) return null;
    var raw = sum / wp;
    /* 证据缺项越多，越把分数往 50 拉：只有一项观测就判 100 分，比判 0 分更容易误导 */
    var missing = (d.obs.length - have) / d.obs.length;
    return raw + (50 - raw) * missing * 0.5;
  }
  function dimEvidence(d) {
    var n = 0;
    d.obs.forEach(function (o) { if (valOf(o) != null) n++; });
    return n;
  }

  /* ---------------- 6. 班级示例集（n=42，仅用于敏感性检验） ---------------- */
  function rngOf(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  }
  var CLASS = (function () {
    var r = rngOf(20260207), out = [], i;
    var mean = { K: 77.8, D: 63.6, R: 68.5, E: 81.0, S: 71.7 };
    var sd = { K: 8.5, D: 10.2, R: 9.6, E: 7.4, S: 8.8 };
    for (i = 0; i < 42; i++) {
      var o = { id: i + 1 };
      ['K', 'D', 'R', 'E', 'S'].forEach(function (k) {
        var g = (r() + r() + r() - 1.5) / 1.5;
        o[k] = Math.max(38, Math.min(99, mean[k] + g * sd[k]));
      });
      out.push(o);
    }
    return out;
  })();
  var CLASS_AVG = (function () {
    var a = { K: 0, D: 0, R: 0, E: 0, S: 0 };
    CLASS.forEach(function (s) { ['K', 'D', 'R', 'E', 'S'].forEach(function (k) { a[k] += s[k]; }); });
    ['K', 'D', 'R', 'E', 'S'].forEach(function (k) { a[k] /= CLASS.length; });
    return a;
  })();

  function totalOf(s, dw) { return s.K * dw.K / 100 + s.D * dw.D / 100 + s.R * dw.R / 100 + s.E * dw.E / 100 + s.S * dw.S / 100; }
  function levelOf(t) { return t >= 90 ? 5 : t >= 80 ? 4 : t >= 70 ? 3 : t >= 60 ? 2 : 1; }
  var BASE_LV = CLASS.map(function (s) { return levelOf(totalOf(s, { K: 35, D: 25, R: 10, E: 15, S: 15 })); });
  function classStat(dw) {
    var sum = 0, pass = 0, flip = 0;
    CLASS.forEach(function (s, i) {
      var t = totalOf(s, dw);
      sum += t;
      if (t >= 60) pass++;
      if (levelOf(t) !== BASE_LV[i]) flip++;
    });
    return { avg: sum / CLASS.length, pass: pass, n: CLASS.length, flip: flip, flipRate: flip / CLASS.length * 100 };
  }

  /* ---------------- 7. 工具 ---------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function f1(n) { return n == null ? '—' : (Math.round(n * 10) / 10).toFixed(1); }
  function cssv(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }
  function q(id) { return document.getElementById(id); }

  /* ---------------- 8. 权重推导 ---------------- */
  function remainderRound(vals) {
    var fl = vals.map(function (v) { return Math.floor(v); });
    var gap = 100 - fl.reduce(function (a, b) { return a + b; }, 0);
    var order = vals.map(function (v, i) { return { i: i, f: v - Math.floor(v) }; })
      .sort(function (a, b) { return b.f - a.f; });
    for (var k = 0; k < gap; k++) fl[order[k % order.length].i]++;
    return fl;
  }
  var HML_ROUND = remainderRound(GOALS.map(function (g) { return HMLW[g.id]; }));

  function renderWeights() {
    var linkRows = LINKS.map(function (l) {
      var per = l.g.map(function (g) { return g + ' ' + f1(l.p / l.g.length); }).join('　');
      return '<tr><td>' + esc(l.n) + '</td><td class="n">' + l.p + '%</td><td>'
        + l.g.join('、') + '</td><td class="n">' + per + '</td></tr>';
    }).join('');

    var goalRows = GOALS.map(function (g, gi) {
      var back = BACK[g.id], hml = g.hml[0] + g.hml[1];
      var fb = (g.kind === '素养类') ? 'var(--av-warn)' : 'var(--text)';
      return '<tr>'
        + '<td><b>' + esc(g.name) + '</b><div class="av-ev">' + g.kind + ' · 指标点 ' + g.pts + '</div></td>'
        + '<td class="n" style="color:' + fb + '">' + f1(back) + '</td>'
        + '<td class="n">' + g.hml[0] + ' + ' + g.hml[1] + ' = ' + hml + '</td>'
        + '<td class="n">' + f1(hml / HMLSUM * 100) + '%</td>'
        + '<td class="n"><b>' + HML_ROUND[gi] + '</b></td>'
        + '</tr>';
    }).join('');

    q('av-w-table').innerHTML = ''
      + '<table class="av-tbl">'
      + '<thead><tr><th style="width:30%">课程目标</th><th class="n" style="width:20%">表3 反推<br><span style="font-weight:400">（现状）</span></th>'
      + '<th class="n" style="width:20%">H/M/L 赋分</th><th class="n" style="width:15%">归一化</th><th class="n" style="width:15%">取整</th></tr></thead>'
      + '<tbody>' + goalRows
      + '<tr class="sum"><td>合计</td><td class="n">100.0</td><td class="n">' + HMLSUM + '</td><td class="n">100%</td><td class="n">100</td></tr>'
      + '</tbody></table>';

    q('av-w-links').innerHTML = ''
      + '<table class="av-tbl">'
      + '<thead><tr><th style="width:28%">考核环节</th><th class="n" style="width:16%">占总成绩</th><th style="width:22%">支撑目标</th><th class="n" style="width:34%">均分后</th></tr></thead>'
      + '<tbody>' + linkRows
      + '<tr class="sum"><td>合计</td><td class="n">100%</td><td colspan="2">过程性 50 ＋ 期末 50</td></tr>'
      + '</tbody></table>';
  }

  /* ---------------- 9. 雷达图 ---------------- */
  function radarSVG() {
    var W = 460, H = 356, cx = 230, cy = 184, R = 100;
    var ang = function (i) { return (-90 + i * 72) * Math.PI / 180; };
    var pt = function (i, r) { return [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r]; };
    var poly = function (rs) {
      return rs.map(function (r, i) { var p = pt(i, R * r / 100); return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
    };
    var gridC = cssv('--chart-grid') || '#eef2f7';
    var axisC = cssv('--chart-axis') || '#cbd5e1';
    var labelC = cssv('--chart-value') || '#1a2233';
    var subC = cssv('--chart-label') || '#64748b';
    var acc = cssv('--accent') || '#6366f1';
    var warn = cssv('--av-warn') || '#b45309';

    var vals = DIMS.map(function (d) { var v = dimScore(d); return v == null ? 0 : v; });
    var anyNull = DIMS.map(function (d) { return dimScore(d); }).some(function (v) { return v == null; });

    var s = '<svg id="av-radar" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="五维能力雷达图">';
    [20, 40, 60, 80, 100].forEach(function (r) {
      s += '<polygon points="' + poly([r, r, r, r, r]) + '" fill="none" stroke="' + gridC + '" stroke-width="1"/>';
    });
    for (var i = 0; i < 5; i++) {
      var e = pt(i, R);
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0].toFixed(1) + '" y2="' + e[1].toFixed(1) + '" stroke="' + axisC + '" stroke-width="1"/>';
    }
    s += '<polygon points="' + poly([60, 60, 60, 60, 60]) + '" fill="none" stroke="' + subC + '" stroke-width="1.2" stroke-dasharray="5 4" opacity="0.65"/>';
    s += '<polygon points="' + poly([75, 70, 70, 70, 70]) + '" fill="none" stroke="' + warn + '" stroke-width="1.2" stroke-dasharray="2 4" opacity="0.85"/>';
    s += '<polygon points="' + poly(vals) + '" fill="' + acc + '" fill-opacity="0.16" stroke="' + acc + '" stroke-width="2" stroke-linejoin="round"/>';

    vals.forEach(function (v, idx) {
      var p = pt(idx, R * v / 100);
      var hollow = DIMS[idx].line === 0;
      s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.6" fill="' + (hollow ? 'var(--panel-solid)' : acc) + '" stroke="' + acc + '" stroke-width="1.6"/>';
    });

    DIMS.forEach(function (d, idx) {
      var real = dimScore(d);
      var p = pt(idx, R + 30);
      var anchor = 'middle';
      if (p[0] > cx + 20) anchor = 'start';
      else if (p[0] < cx - 20) anchor = 'end';
      var x = p[0], y = p[1];
      if (anchor === 'start') x += 4;
      if (anchor === 'end') x -= 4;
      var dy = (idx === 0) ? -14 : (p[1] > cy ? 4 : -14);
      s += '<text x="' + x.toFixed(1) + '" y="' + (y + dy).toFixed(1) + '" text-anchor="' + anchor
        + '" font-size="12" font-weight="600" fill="' + labelC + '">' + d.short + '</text>';
      s += '<text x="' + x.toFixed(1) + '" y="' + (y + dy + 15).toFixed(1) + '" text-anchor="' + anchor
        + '" font-size="11.5" fill="' + (d.line === 0 ? subC : labelC) + '">'
        + (real == null ? '待采集' : f1(real) + (d.line === 0 ? '　不计分' : '')) + '</text>';
    });

    var dw = dimWeights();
    var wp = 0, comp = 0;
    DIMS.forEach(function (d, idx) {
      if (d.line <= 0) return;
      var v = dimScore(d);
      if (v == null) return;
      comp += v * dw[d.k] / 100; wp += dw[d.k];
    });
    if (wp > 0) comp = comp / wp * 100;
    s += '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-size="26" font-weight="700" fill="' + labelC + '">'
      + (wp > 0 ? f1(comp) : '—') + '</text>';
    s += '<text x="' + cx + '" y="' + (cy + 17) + '" text-anchor="middle" font-size="11" fill="' + subC + '">'
      + (anyNull ? '综合达成度（部分维度待采集）' : '综合达成度') + '</text>';
    s += '</svg>';

    q('av-radar-box').innerHTML = '<div class="av-radar-wrap">' + s
      + '<div class="av-legend">'
      + '<span><i style="border-color:' + acc + '"></i>实际得分</span>'
      + '<span><i style="border-color:' + subC + ';border-top-style:dashed"></i>入学基线 60</span>'
      + '<span><i style="border-color:' + warn + ';border-top-style:dotted"></i>达标线（各维不同）</span>'
      + '</div></div>';
    return wp > 0 ? comp : null;
  }

  /* ---------------- 10. 五维明细 + KPI ---------------- */
  function renderProfile() {
    var dw = dimWeights();
    var comp = radarSVG();

    var under = 0, evid = 0;
    SCORED.forEach(function (d) {
      var v = dimScore(d);
      if (v != null && v < d.line) under++;
      evid += dimEvidence(d);
    });
    var pending = 0;
    DIMS.forEach(function (d) { d.obs.forEach(function (o) { if (valOf(o) == null) pending++; }); });

    q('av-kpis').innerHTML = ''
      + '<div class="av-kpi' + (comp == null ? '' : (comp >= 70 ? ' ok' : ' bad')) + '"><div class="lb">综合达成度</div>'
      + '<div class="v">' + (comp == null ? '待采集' : f1(comp) + '<small>分</small>') + '</div>'
      + '<div class="sub">' + (comp == null ? '先做几道题、走一遍仿真' : '加权自 5 个计分维度') + '</div></div>'
      + '<div class="av-kpi' + (under ? ' bad' : ' ok') + '"><div class="lb">未达标维度</div>'
      + '<div class="v">' + under + '<small>个</small></div>'
      + '<div class="sub">' + (under ? '低于各自达标线' : '均在达标线以上') + '</div></div>'
      + '<div class="av-kpi"><div class="lb">有数据的观测点</div>'
      + '<div class="v">' + (TOTAL_OBS - pending) + '<small>/' + TOTAL_OBS + '</small></div>'
      + '<div class="sub">' + (pending ? pending + ' 项待采集' : '全部已接入') + '</div></div>'
      + '<div class="av-kpi ok"><div class="lb">量表计入分数</div>'
      + '<div class="v">0<small>%</small></div>'
      + '<div class="sub">CD-RISC 仅作预警触发器</div></div>';

    var rows = DIMS.map(function (d) {
      var v = dimScore(d);
      var w = dw[d.k] || 0;
      var on = state.sel === d.k ? ' on' : '';
      var line = d.line;
      var color = v == null ? 'var(--dim)' : (d.line > 0 ? (v >= line ? d.c : 'var(--av-bad)') : 'var(--av-c5)');
      var tick = line > 0 ? '<u style="left:' + line + '%"></u>' : '';
      return '<div class="av-dim' + on + '" data-k="' + d.k + '">'
        + '<div class="nm"><i style="background:' + d.c + '"></i>' + esc(d.name)
        + ' <span class="av-chip' + (d.line > 0 ? '' : ' gray') + '">' + (d.line > 0 ? '权重 ' + f1(w) + '%' : '并入决策') + '</span></div>'
        + '<div class="sc" style="color:' + color + '">' + (v == null ? '待采集' : f1(v))
        + '<small>' + (v == null ? '缺数据' : (d.line > 0 ? '达标 ' + line : '不计分')) + '</small></div>'
        + '<div class="mt">' + esc(d.metric) + '　·　来源：' + esc(d.src) + '</div>'
        + '<div class="av-bar"><i style="width:' + (v == null ? 0 : Math.min(100, v)) + '%;background:' + d.c + '"></i>' + tick + '</div>'
        + '</div>';
    }).join('');

    q('av-dims').innerHTML = rows;
    q('av-dims').querySelectorAll('.av-dim').forEach(function (el) {
      el.addEventListener('click', function () {
        state.sel = el.getAttribute('data-k');
        renderProfile();
      });
    });

    renderDrill();
    renderGoals();
  }

  /* ---------------- 11. 下钻 ---------------- */
  function renderDrill() {
    var d = DIMS.filter(function (x) { return x.k === state.sel; })[0] || DIMS[0];
    var v = dimScore(d);
    var rows = d.obs.map(function (o) {
      var ov = valOf(o);
      var contrib = ov == null ? null : o.p * ov;
      return '<tr><td>' + esc(o.n) + '<div class="av-ev">' + esc(o.s) + '</div></td>'
        + '<td class="n">' + Math.round(o.p * 100) + '%</td>'
        + '<td class="n">' + (ov == null ? '<span class="av-chip gray">待采集</span>' : '<b>' + ov + '</b>') + '</td>'
        + '<td class="n">' + (contrib == null ? '—' : f1(contrib)) + '</td>'
        + '<td class="n" style="color:var(--dim)">' + esc(evOf(o)) + '</td></tr>';
    }).join('');

    var kNote = '';
    if (d.k === 'K') {
      kNote = '<div class="av-note">这一维<b>就是原来的「个人学情画像」</b>，两页已合并：六个业务模块的得分即本维的六个观测点，权重按各模块覆盖的章节数分摊（'
        + MODS.map(function (m) { return m.n + ' ' + Math.round(m.chs.length / MODSUM * 100) + '%'; }).join('、')
        + '）。每个模块由正确率 50%、章节完成度 22%、错题消化率 18%、学习时长 10% 合成，缺项按剩余权重归一化。<br>'
        + '<b>期末闭卷（占总成绩 50%）尚未接入</b>——它在教务系统里，学期末导入后按 40% 权重并入本维，届时达成度才完整。</div>';
    }

    q('av-drill').innerHTML = ''
      + '<div class="av-card">'
      + '<div class="av-dh">' + esc(d.name)
      + ' <span class="av-chip">' + esc(d.tag) + '</span>'
      + (v == null
        ? '<span class="av-chip gray">数据不足，暂不判定</span>'
        : (d.line > 0
          ? '<span class="av-chip' + (v >= d.line ? ' ok' : ' bad') + '">' + (v >= d.line ? '已达达标线 ' + d.line : '低于达标线 ' + d.line) + '</span>'
          : '<span class="av-chip gray">不独立计分，观测值并入决策维度</span>'))
      + '<span class="av-ev" style="margin-left:auto">下钻：分数 → 观测点 → 原始记录</span></div>'
      + '<div class="av-cap" style="font-size:12px;color:var(--dim);margin-bottom:10px">'
      + '度量词：' + esc(d.metric) + '　｜　指标点：' + esc(d.pts) + '　｜　数据来源：' + esc(d.src) + '</div>'
      + '<table class="av-tbl"><thead><tr><th style="width:34%">观测点 / 数据源</th><th class="n" style="width:11%">权重</th>'
      + '<th class="n" style="width:12%">得分</th><th class="n" style="width:12%">加权贡献</th><th class="n" style="width:31%">证据量</th></tr></thead>'
      + '<tbody>' + rows
      + '<tr class="sum"><td>该维度小计</td><td class="n">100%</td><td class="n">' + (v == null ? '—' : f1(v)) + '</td><td class="n">' + (v == null ? '—' : f1(v)) + '</td><td class="n">' + dimEvidence(d) + ' / ' + d.obs.length + ' 项有数据</td></tr>'
      + '</tbody></table>'
      + kNote
      + (d.k === 'R'
        ? '<div class="av-note">本维 10 分来自 <b>G2 内部切分</b>：课程目标 2 的 35 分没有变，其中 25 分记「预判与选择」（定价、路线押注），10 分记「压力下的稳定性」（反复试错后的收敛、回撤期调仓）。切分依据是证据来源不同，不是把 2-8、2-9 的权重拆开——G2 整体仍挂在 2-8、2-9 上。<br><b>自陈量表（CD-RISC-10）不计分</b>，只作预警；这 10 分全部来自行为记录，学生改不了也答不出「标准答案」。</div>'
        : '')
      + '</div>';
  }

  /* ---------------- 12. 达成度 ---------------- */
  function renderGoals() {
    var w = weights();
    var mine = {};
    ['K', 'D', 'R', 'E', 'S'].forEach(function (k) {
      var d = DIMS.filter(function (x) { return x.k === k; })[0];
      mine[k] = dimScore(d);
    });
    var useReal = mine.K != null && mine.D != null;
    function pick(k) { return mine[k] == null ? CLASS_AVG[k] : mine[k]; }

    var gv = {
      G1: pick('K'),
      G2: pick('D') * 25 / 35 + pick('R') * 10 / 35,
      G3: pick('E') * (state.mix / 100) + pick('S') * (1 - state.mix / 100)
    };
    var cls = { G1: CLASS_AVG.K, G2: CLASS_AVG.D * 25 / 35 + CLASS_AVG.R * 10 / 35, G3: CLASS_AVG.E * (state.mix / 100) + CLASS_AVG.S * (1 - state.mix / 100) };

    var map = {
      G1: '知识整合与高阶思维',
      G2: '风险预判与决策能力（预判 25 ＋ 韧性 10）',
      G3: '价值认同与职业伦理 ＋ 自主学习与自我管理'
    };

    q('av-goals').innerHTML = GOALS.map(function (g) {
      var v = gv[g.id], ww = w[g.id];
      var ok = v >= 65;
      return '<div class="av-goal">'
        + '<div class="gh"><b>' + esc(g.name) + '</b><span class="w">权重 ' + f1(ww) + '%</span></div>'
        + '<div class="gt">指标点 ' + g.pts + '　·　' + esc(map[g.id]) + '</div>'
        + '<div class="gv" style="color:' + (ok ? 'var(--av-good)' : 'var(--av-bad)') + '">'
        + f1(v) + '<small>%　' + (ok ? '达成（阈值 65%）' : '未达成（阈值 65%）') + '</small></div>'
        + '<div class="av-bar" style="margin-top:10px"><i style="width:' + Math.min(100, v) + '%;background:'
        + (ok ? 'var(--av-good)' : 'var(--av-bad)') + '"></i><u style="left:65%"></u></div>'
        + '<div class="av-note" style="margin-top:10px">'
        + (useReal ? '本人得分，基于本机行为事件现算。' : '本机数据不足，暂用班级示例集均分。')
        + '班级示例均分 ' + f1(cls[g.id]) + '%。'
        + (g.id === 'G3' ? '按伦理 : 自主 = ' + state.mix + ' : ' + (100 - state.mix) + ' 加权。' : '')
        + '</div>'
        + '</div>';
    }).join('');
  }

  /* ---------------- 13. 权重敏感性 ---------------- */
  function renderSens() {
    var dw = dimWeights();
    var st = classStat(dw);
    var unstable = st.flipRate > 5;

    q('av-sens-out').innerHTML = ''
      + '<div class="av-kpis" style="grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:12px">'
      + '<div class="av-kpi"><div class="lb">班级平均</div><div class="v">' + f1(st.avg) + '<small>分</small></div><div class="sub">n=' + st.n + '（示例集）</div></div>'
      + '<div class="av-kpi"><div class="lb">及格人数</div><div class="v">' + st.pass + '<small>/' + st.n + '</small></div><div class="sub">≥60 分</div></div>'
      + '<div class="av-kpi' + (st.flip > 0 ? ' warn' : '') + '"><div class="lb">等级翻转</div><div class="v">' + st.flip + '<small>人</small></div><div class="sub">相对 35/35/30</div></div>'
      + '<div class="av-kpi' + (unstable ? ' bad' : ' ok') + '"><div class="lb">翻转率</div><div class="v">' + f1(st.flipRate) + '<small>%</small></div><div class="sub">阈值 5%</div></div>'
      + '</div>'
      + '<div class="av-flag' + (unstable ? '' : ' ok') + '"><i>' + (unstable ? '!' : '✓') + '</i><div>'
      + (unstable
        ? '翻转率 <b>' + f1(st.flipRate) + '%</b> 超过 5% 阈值。这套权重下结论不稳，<b>不宜直接用于评优、推免等去向性判断</b>；应先收敛档位再定稿。'
        : '翻转率 <b>' + f1(st.flipRate) + '%</b>，在 5% 阈值内。权重小幅调整不会改变绝大多数学生的等级判定，可用于正式结论。')
      + '</div></div>'
      + '<table class="av-tbl" style="margin-top:14px">'
      + '<thead><tr><th style="width:34%">维度</th><th class="n" style="width:16%">当前权重</th><th class="n" style="width:16%">默认权重</th><th class="n" style="width:18%">变化</th><th class="n" style="width:16%">对均分影响</th></tr></thead><tbody>'
      + DIMS.filter(function (d) { return d.line > 0; }).map(function (d) {
        var cur = dw[d.k], def = ({ K: 35, D: 25, R: 10, E: 15, S: 15 })[d.k];
        var delta = cur - def;
        return '<tr><td>' + esc(d.name) + '</td><td class="n"><b>' + f1(cur) + '%</b></td><td class="n">' + def + '%</td>'
          + '<td class="n" style="color:' + (Math.abs(delta) < .05 ? 'var(--dim)' : (delta > 0 ? 'var(--av-good)' : 'var(--av-bad)')) + '">'
          + (Math.abs(delta) < .05 ? '—' : (delta > 0 ? '+' : '') + f1(delta)) + '</td>'
          + '<td class="n" style="color:var(--dim)">按维度均分折算</td></tr>';
      }).join('')
      + '</tbody></table>';
  }

  function renderSliders() {
    var w = weights();
    q('av-sliders').innerHTML = ''
      + sl('G1', '课程目标 1 · 知识', state.W.G1, 10, 60)
      + sl('G2', '课程目标 2 · 能力', state.W.G2, 10, 60)
      + sl('G3', '课程目标 3 · 素养', state.W.G3, 10, 60)
      + sl('mix', '目标3 内部：伦理 : 自主', state.mix, 0, 100)
      + '<div class="av-note">当前归一化结果：目标1 <b>' + f1(w.G1) + '%</b> · 目标2 <b>' + f1(w.G2) + '%</b> · 目标3 <b>' + f1(w.G3) + '%</b>'
      + '　→　伦理 <b>' + f1(w.E) + '%</b> · 自主 <b>' + f1(w.S) + '%</b>。拖动即重算，无需刷新。</div>';

    q('av-sliders').querySelectorAll('input[type="range"]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var k = inp.getAttribute('data-k');
        if (k === 'mix') state.mix = +inp.value;
        else state.W[k] = +inp.value;
        renderSliders();
        renderProfile();
        renderSens();
      });
    });

    function sl(k, label, val, min, max) {
      var txt = (k === 'mix') ? (val + ' : ' + (100 - val)) : String(val);
      return '<div class="av-sl"><label>' + label + '<b>' + txt + '</b></label>'
        + '<input type="range" data-k="' + k + '" value="' + val + '" min="' + min + '" max="' + max + '" step="1"></div>';
    }
  }

  /* ---------------- 14. 量表定位 ---------------- */
  function renderScale() {
    var r = DIMS.filter(function (d) { return d.k === 'R'; })[0];
    var rv = dimScore(r);
    q('av-scale').innerHTML = ''
      + '<div class="av-card">'
      + '<h4>自陈量表 <span class="av-tag">自陈不计分</span></h4>'
      + '<div class="av-cap">CD-RISC-10 简版 · 10 题 · 只做预警信号</div>'
      + '<table class="av-tbl"><tbody>'
      + '<tr><td>量表折算分</td><td class="n"><span class="av-chip gray">尚未施测</span></td></tr>'
      + '<tr><td>同源行为指标（韧性观测）</td><td class="n"><b>' + (rv == null ? '待采集' : f1(rv)) + '</b></td></tr>'
      + '<tr><td>差值</td><td class="n" style="color:var(--dim)">' + (rv == null ? '—' : '待量表施测后计算') + '</td></tr>'
      + '<tr class="sum"><td>判定</td><td class="n">量表不计分 · 行为指标计 10 分</td></tr>'
      + '</tbody></table>'
      + '<div class="av-note">差值超过 15 分才触发一次教师约谈——自陈说“扛得住”、行为却在回撤期放大换手，这种背离才值得看一眼。量表本身零计分。</div>'
      + '</div>'
      + '<div class="av-card">'
      + '<h4>量表为何不计分 <span class="av-tag">取舍</span></h4>'
      + '<div class="av-cap">量表与行为指标分开走，理由写在评价方法公示里</div>'
      + '<div class="av-note" style="border-left-color:var(--accent);margin-top:0">'
      + '<b>一、量表的 10 分给了行为，不给自陈。</b>心理韧性在课程里计 10 分（G2 内部切分），但这 10 分只认行为记录：反复试错后能不能收敛、回撤期会不会乱调仓。自陈量表答得好不加分，答得差也不直接扣分。<br><br>'
      + '<b>二、自陈项举证成本大于收益。</b>一个约 3 分的自陈项，对总分影响不到 0.5 分，却要背上整套信效度举证（n≥100 才够做因子分析，一个班 42 人不够）。<br><br>'
      + '<b>三、量表放在预警位作用更大。</b>它不进成绩，但能决定“要不要多看一眼”。'
      + '</div>'
      + '</div>';
  }

  /* ---------------- 15. 数据源状态条 ---------------- */
  function renderSrc() {
    var box = q('av-src');
    if (!box) return;
    var real = hasRealData();
    if (MODE === 'demo') {
      box.innerHTML = '<span><span class="av-dot"></span>教学大纲表1、表3 实数</span>'
        + '<span><span class="av-dot demo"></span><b>当前为示例数据集</b>：数值用于演示界面与算法，不代表任何真实学生</span>'
        + '<button type="button" class="sim-btn ghost" id="av-mode">切回真实数据</button>';
    } else {
      box.innerHTML = '<span><span class="av-dot"></span>教学大纲表1、表3 实数</span>'
        + '<span><span class="av-dot"></span>金融 2303 班 42 人</span>'
        + '<span><span class="av-dot' + (real ? '' : ' demo') + '"></span>'
        + (real
          ? '本机真实行为：<b>' + M.n + '</b> 条事件，分数实时现算'
          : '<b>本机暂无学习记录</b>：做几道题即可看到真实分数')
        + '</span>'
        + '<button type="button" class="sim-btn ghost" id="av-mode">载入示例数据</button>';
    }
    var btn = q('av-mode');
    if (btn) btn.onclick = function () { MODE = (MODE === 'demo' ? 'live' : 'demo'); renderAll(); };
  }

  /* ---------------- 16. 初始化 ---------------- */
  function renderAll() {
    M = computeM();
    if (!hasRealData()) MODE = 'demo';
    else if (MODE !== 'demo') MODE = 'live';
    renderWeights();
    renderSrc();
    renderProfile();
    renderSliders();
    renderSens();
    renderScale();
  }
  renderAll();
  window.__ibankAvRefresh = renderAll;

  /* 深链直达 */
  function gotoEval() {
    var b = document.querySelector('.tab-btn[data-page="p-eval"]');
    if (b) b.click();
  }
  if ((location.hash || '').indexOf('p-eval') >= 0) {
    if (document.readyState === 'complete') gotoEval();
    else window.addEventListener('load', gotoEval);
  }

  /* 子页签 */
  var tabs = document.getElementById('av-tabs');
  if (tabs) {
    tabs.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      var t = b.getAttribute('data-t');
      Array.prototype.forEach.call(tabs.querySelectorAll('button'), function (x) {
        x.classList.toggle('on', x === b);
      });
      Array.prototype.forEach.call(root.querySelectorAll('.av-blk'), function (k) {
        var show = (t === 'all') || (k.getAttribute('data-b') === t);
        if (show) k.removeAttribute('hidden'); else k.setAttribute('hidden', '');
      });
      if (t === 'p' || t === 'all') radarSVG();
    });
  }

  var mo = new MutationObserver(function () { renderProfile(); });
  mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();

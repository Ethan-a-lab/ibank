/* ============================================================
   债券发行与承销 · 簿记建档仿真（#p-bond）
   IIFE 自包含，不改动 app-core.js 任何行为。
   数据来源：26比亚迪MTN003 公开披露的簿记建档记录
     · 发行规模 50 亿元，期限 3 年
     · 申购区间 1.50%—2.00%（最低/最高申报价位 1.62% / 2.00%）
     · 合规申购 18 家 / 109.2 亿元；有效申购 11 家 / 56.9 亿元
     · 最终票面利率 1.72%
   下表 11 行为按公告总额还原的教学用簿记簿（合计 71.5 亿元：有效 56.9 亿
   与公告一致；落标 14.6 亿是 18 家压成 11 组的简化），页面已明示。
   ============================================================ */
(function () {
  'use strict';

  var root = document.getElementById('p-bond');
  if (!root) return;

  /* 答案封存（与「项目实践」同一口径）
     未揭晓时本页只留演算台：真实结果、融资时间线都不显示，
     由教师课上投屏。教师揭晓：网址后加 ?reveal=1（与任务书共用同一个标记）。 */
  (function () {
    var ok = false;
    try {
      if (/[?&]reveal=1/.test(location.search)) ok = true;
      else if (/[?&]reveal=0/.test(location.search)) ok = false;
      else ok = localStorage.getItem('ibank_project_reveal') === '1';
    } catch (e) { ok = false; }
    if (!ok) document.body.classList.add('bd-sealed');
  })();

  var SIZE = 50;          // 发行规模（亿元）
  var YEARS = 3;          // 期限
  var REAL_RATE = 1.72;   // 真实票面利率
  var BP_VALUE = 150;     // 1bp 对应 3 年利息（万元）：50亿 × 0.01% × 3

  /* 初始簿记簿（=「还原真实簿记」按钮载入的示例底稿）：报价、金额（亿元）
     按底稿模拟表（对齐公告真值）压成课堂 11 行：1.62 一行 8 亿、1.67 一行 10 亿、
     1.72 七行共 38.9 亿、1.82 与 1.87 各一行（落标，压给成本最高的保险资管两组）。
     这样有效申购 8+10+38.9 = 56.9 亿、边际档 38.9 亿、配售 32÷38.9 = 82.26%，
     三个数与公告一致；合规 71.5 亿 < 公告 109.2 亿，是因为 18 家合规压成了 11 组。
     注意：示例的利率/金额沿真实底稿，与各组身份卡的资金成本只大致对应——
     上课时请逐行改成各组的实际报价。 */
  var SEED = [
    { n: '第 1 组 · 大行自营', c: 1.45, r: 1.62, a: 8.0 },
    { n: '第 2 组 · 股份行理财', c: 1.58, r: 1.67, a: 10.0 },
    { n: '第 3 组 · 券商公募', c: 1.68, r: 1.72, a: 6.5 },
    { n: '第 4 组 · 大行自营', c: 1.45, r: 1.72, a: 6.0 },
    { n: '第 5 组 · 保险资管', c: 1.78, r: 1.82, a: 8.0 },
    { n: '第 6 组 · 股份行理财', c: 1.58, r: 1.72, a: 6.0 },
    { n: '第 7 组 · 券商公募', c: 1.68, r: 1.72, a: 5.5 },
    { n: '第 8 组 · 大行自营', c: 1.45, r: 1.72, a: 5.0 },
    { n: '第 9 组 · 保险资管', c: 1.78, r: 1.87, a: 6.6 },
    { n: '第 10 组 · 股份行理财', c: 1.58, r: 1.72, a: 5.0 },
    { n: '第 11 组 · 券商公募', c: 1.68, r: 1.72, a: 4.9 }
  ];

  /* 每家的资金成本（与桌面「学生用-11 组身份卡」一一对应，教学习设定）
     1、4、8 = 大行自营 1.45｜2、6、10 = 股份行理财 1.58
     3、7、11 = 券商资管·公募 1.68｜5、9 = 保险资管 1.78
     报价低于它就是「赔本抢量」：页面不拦，但算给你看——这一单亏多少 bp。 */

  /* ---------- 自动保存：各组录入的报价/金额/轮次落到本机浏览器 ----------
     刷新不丢、误关重开还在；「还原真实簿记」（两段确认）会覆盖。 */
  var SAVE_KEY = 'ibank_bd_state_v1';
  function bdLoadState() {
    try {
      var s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!s || !Array.isArray(s.b) || s.b.length !== SEED.length) return null;
      for (var i = 0; i < s.b.length; i++) {
        if (!Array.isArray(s.b[i]) || typeof s.b[i][0] !== 'number' || !(s.b[i][0] > 0) ||
            typeof s.b[i][1] !== 'number' || !(s.b[i][1] >= 0)) return null;
      }
      return s;
    } catch (e) { return null; }
  }
  function saveState() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        no: roundNo,
        b: bids.map(function (x) { return [x.r, x.a]; }),
        rs: rounds.map(function (rd) {
          if (!rd || typeof rd.rate !== 'number') return null;
          return { no: rd.no, rate: rd.rate, failed: rd.failed,
                   book: rd.book ? rd.book.map(function (x) { return [x.r, x.a]; }) : null,
                   alloc: Array.isArray(rd.alloc) && rd.alloc.length === SEED.length ? rd.alloc.slice() : null };
        })
      }));
    } catch (e) { /* 写不进（隐私模式等）不影响页面 */ }
  }
  var bdSaved = bdLoadState();
  var bids = SEED.map(function (b, i) {
    return { n: b.n, c: b.c, r: bdSaved ? bdSaved.b[i][0] : b.r, a: bdSaved ? bdSaved.b[i][1] : b.a };
  });

  var tbody = document.getElementById('bdRows');
  var barBox = document.getElementById('bdBar');
  var curAlloc = bids.map(function () { return 0; });   // 当前轮每组实时获配（评分依据）

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  /* 动态拼串（成本徽标、与成本的差、亏本家数）自带双语：
     这类文本每次渲染都变，塞不进 i18n 字典，所以就地判断语言。
     静态长句仍走 static/i18n-dict.js 的 block 词条。 */
  function L() { return document.documentElement.lang === 'en' ? 'en' : 'zh'; }

  /* ---------- 渲染报价表 ---------- */
  function renderTable() {
    var en = L() === 'en';
    tbody.innerHTML = bids.map(function (b, i) {
      return '<tr data-row="' + i + '">'
        + '<td class="rk" id="bdRk' + i + '">—</td>'
        + '<td class="nm">' + esc(b.n) + '<em class="bd-cost">' + (en ? 'Cost ' : '成本 ') + b.c.toFixed(2) + '%</em></td>'
        + '<td><div class="bd-bidwrap"><input type="number" step="0.01" min="0" max="9" value="' + b.r.toFixed(2) + '" data-i="' + i + '" data-k="r" aria-label="' + esc(b.n) + ' 报价">'
        + '<em class="bd-cmp" id="bdCmp' + i + '"></em></div></td>'
        + '<td><input type="number" step="0.1" min="0" max="99" value="' + b.a.toFixed(1) + '" data-i="' + i + '" data-k="a" aria-label="' + esc(b.n) + ' 申购金额"></td>'
        + '<td class="dl" id="bdDl' + i + '">—</td>'
        + '<td class="got" id="bdGot' + i + '">—</td>'
        + '</tr>';
    }).join('');
    cmpAll();
  }

  /* 报价与自家资金成本的距离：正数＝这一单赚，负数＝赔本抢量。
     11 家全程在场，不设淘汰——落标只是本轮没拿到量，下一轮照常报。 */
  function cmpAll() {
    var en = L() === 'en';
    bids.forEach(function (b, i) {
      var el = document.getElementById('bdCmp' + i);
      if (!el) return;
      var bp = Math.round((b.r - b.c) * 100);
      if (bp === 0) { el.className = 'bd-cmp zero'; el.textContent = en ? 'at cost' : '正好等于成本'; return; }
      el.className = 'bd-cmp' + (bp < 0 ? ' loss' : '');
      el.textContent = bp > 0
        ? (en ? '+' + bp + 'bp over cost' : '高于成本 +' + bp + 'bp')
        : (en ? (Math.abs(bp)) + 'bp under cost' : '低于成本 ' + Math.abs(bp) + 'bp');
    });
  }

  /* ---------- 核心计算：边际利率 + 比例配售 ----------
     抽成 settle() 是因为边际曲线每帧都要重排一次——两处必须用同一套规则，
     否则动画里的切口和右侧结果会对不上。 */
  /* 上一轮（已记下）的簿记，用来算表格里的「较上轮」 */
  function prevRoundBook() {
    var prev = rounds[roundNo - 2];
    return (prev && prev.book) ? prev.book : null;
  }

  function settle(list) {
    var sorted = list.slice().sort(function (x, y) { return x.r - y.r || x.i - y.i; });
    var total = 0, cums = [], run = 0;

    sorted.forEach(function (b) {
      total += b.a;
      run += b.a;
      cums.push(run);
    });

    var alloc = sorted.map(function () { return 0; });
    var failed = total < SIZE - 1e-9;
    var cum = 0, marginal = null;

    if (!failed) {
      for (var k = 0; k < sorted.length; k++) {
        if (cum + sorted[k].a <= SIZE + 1e-9) {
          cum += sorted[k].a;
          marginal = sorted[k].r;
          if (Math.abs(cum - SIZE) < 1e-9) break;
        } else {
          marginal = sorted[k].r;
          break;
        }
      }
      /* 边际档：同一利率的所有行【按比例】分剩余量，不是谁排在前面谁先拿满。
         这一档常常不止一家（真实簿记里好几家都报 1.72%），按序发放会把同价的行
         劈成「有的拿满、有的未获配」，与页面自己的规则说明冲突。 */
      var below = 0, mTotal = 0;
      sorted.forEach(function (b) {
        if (b.r < marginal - 1e-9) below += b.a;
        else if (Math.abs(b.r - marginal) < 1e-9) mTotal += b.a;
      });
      var r0 = mTotal > 0 ? Math.min(1, (SIZE - below) / mTotal) : 1;
      sorted.forEach(function (b, j) {
        if (b.r < marginal - 1e-9) alloc[j] = b.a;
        else if (Math.abs(b.r - marginal) < 1e-9) alloc[j] = b.a * r0;
      });
    }
    if (marginal === null) {
      marginal = sorted.length ? sorted[sorted.length - 1].r : 0;
    }
    return { sorted: sorted, total: total, cums: cums, alloc: alloc, marginal: marginal };
  }

  function calc() {
    cmpAll();
    var S = settle(bids.map(function (b, i) {
      return { i: i, n: b.n, r: b.r, a: b.a };
    }));
    var sorted = S.sorted, total = S.total, alloc = S.alloc, marginal = S.marginal;

    /* 把 settle() 的获配（按报价排序后的下标）映回 11 个组的固定下标 */
    curAlloc = bids.map(function () { return 0; });
    sorted.forEach(function (b, k) { curAlloc[b.i] = alloc[k]; });

    /* 边际档配售比例 */
    var mAmt = 0, mGot = 0;
    for (var k2 = 0; k2 < sorted.length; k2++) {
      if (Math.abs(sorted[k2].r - marginal) < 1e-9) {
        mAmt += sorted[k2].a;
        mGot += alloc[k2];
      }
    }
    var ratio = mAmt > 0 ? mGot / mAmt : 1;

    /* 「有效申购」只算报价 ≤ 边际的那几档；报价更高的属于落标，不进有效、也不算认购倍数。
       这一条是公告口径（有效 56.9 亿 / 1.14 倍），也是页脚那句「2.2 倍是热闹、1.14 倍才是真买」的算法出处。 */
    var valid = 0;
    sorted.forEach(function (b) { if (b.r <= marginal + 1e-9) valid += b.a; });
    var failAmt = total - valid;

    /* 写回每行获配 + 边际档高亮 */
    sorted.forEach(function (b, k) {
      var cell = document.getElementById('bdGot' + b.i);
      var tr = tbody.querySelector('tr[data-row="' + b.i + '"]');
      if (cell) {
        cell.textContent = alloc[k] > 0.001 ? alloc[k].toFixed(1) : '未获配';
        cell.className = 'got' + (alloc[k] > 0.001 ? ' on' : '');
      }
      if (tr) {
        var isM = Math.abs(b.r - marginal) < 1e-9 && alloc[k] > 0.001 && total >= SIZE - 1e-9;
        tr.className = isM ? 'marg' : '';
      }
    });

    /* 较上轮：跟上一轮记下的簿记逐行比价、比量——学生改了什么，一眼看得见 */
    var base = prevRoundBook();
    bids.forEach(function (b, i) {
      var cell = document.getElementById('bdDl' + i);
      if (!cell) return;
      var p = base && base[i];
      if (!p) { cell.innerHTML = '<span class="nl">—</span>'; return; }
      var dp = Math.round((b.r - p.r) * 100);
      var da = b.a - p.a;
      var bits = [];
      if (dp !== 0) bits.push('<i class="' + (dp > 0 ? 'up' : 'down') + '">价' + (dp > 0 ? '+' : '') + dp + 'bp</i>');
      if (Math.abs(da) >= 0.05) bits.push('<i class="amt">量' + (da > 0 ? '+' : '') + da.toFixed(1) + '</i>');
      cell.innerHTML = bits.length ? bits.join('') : '<span class="nl">未改</span>';
    });

    /* ---------- 结果面板 ---------- */
    var elRate = document.getElementById('bdRate');
    var elDesc = document.getElementById('bdRateDesc');
    var elTotal = document.getElementById('bdTotal');
    var elCover = document.getElementById('bdCover');
    var elRatio = document.getElementById('bdRatio');
    var elFail = document.getElementById('bdFail');
    var failed = total < SIZE - 1e-9;

    if (failed) {
      elRate.innerHTML = '流标';
      elDesc.textContent = '有效申购仅 ' + total.toFixed(1) + ' 亿元，不足 ' + SIZE
        + ' 亿元。本期发行失败——按余额包销约定，承销商要么自掏腰包吃下缺口，要么解散承销团重来。';
      elRatio.textContent = '—';
    } else {
      elRate.innerHTML = marginal.toFixed(2) + '<small>%</small>';
      elDesc.textContent = '从最低报价往上累加，加到 ' + SIZE + ' 亿元时落在 '
        + marginal.toFixed(2) + '% 这一档，全场统一按此利率计息。';
      elRatio.textContent = (ratio * 100).toFixed(0) + '%';
    }

    elTotal.textContent = valid.toFixed(1) + ' 亿';
    elCover.textContent = (valid / SIZE).toFixed(2) + ' 倍';
    elFail.textContent = failed
      ? '缺口 ' + (SIZE - total).toFixed(1) + ' 亿'
      : (failAmt > 0.05 ? failAmt.toFixed(1) + ' 亿' : '无');

    /* 赔本报价：报价低于自家资金成本的组。不拦，但要让学生看见自己有多少家在做亏钱单。 */
    var lossN = 0, lossAmt = 0;
    bids.forEach(function (b) {
      if (b.a <= 0.001) return;
      if (Math.round((b.r - b.c) * 100) < 0) { lossN++; lossAmt += b.a; }
    });
    var elLoss = document.getElementById('bdLoss');
    if (elLoss) {
      var en2 = L() === 'en';
      elLoss.textContent = lossN
        ? (en2 ? lossN + (lossN > 1 ? ' groups · RMB ' : ' group · RMB ') + (lossAmt / 10).toFixed(2) + 'bn'
               : lossN + ' 家 · ' + lossAmt.toFixed(1) + ' 亿')
        : (en2 ? 'None' : '无');
      elLoss.className = lossN ? 'loss' : '';
    }

    /* ---------- 条形图 ---------- */
    var html = '';
    sorted.forEach(function (b, k) {
      if (alloc[k] <= 0.001) return;
      var w = alloc[k] / total * 100;
      var isM = Math.abs(b.r - marginal) < 1e-9 && !failed;
      html += '<i style="width:' + w.toFixed(3) + '%;background:'
        + (isM ? 'var(--bd-b)' : 'var(--bd-a)') + '" title="'
        + esc(b.n) + ' ' + b.r.toFixed(2) + '% · 获配 ' + alloc[k].toFixed(1) + ' 亿"></i>';
    });
    if (failAmt > 0.001) {
      html += '<i style="width:' + (failAmt / total * 100).toFixed(3) + '%;background:var(--bd-gray)" title="落标 ' + failAmt.toFixed(1) + ' 亿"></i>';
    }
    barBox.innerHTML = html;
    if (!failed) {
      var ln = document.createElement('span');
      ln.className = 'l50';
      ln.style.left = (total > SIZE + 1e-9 ? (SIZE / total * 100) : 99.7) + '%';
      barBox.appendChild(ln);
    }

    /* ---------- 判定条 ---------- */
    var vEl = document.getElementById('bdVerdict');
    var cover = valid / SIZE;
    if (failed) {
      vEl.className = 'bd-verdict bad';
      vEl.innerHTML = '<b>发行失败。</b>申购不足是承销商最不愿看到的结果——余额包销意味着它要用自有资金买下卖不掉的债，占资本金、占额度。所以定价不是越低越好。';
    } else if (cover < 1.2) {
      vEl.className = 'bd-verdict warn';
      vEl.innerHTML = '<b>紧平衡发行。</b>有效申购倍数只有 ' + cover.toFixed(2)
        + ' 倍，边际档配售比例却高达 ' + (ratio * 100).toFixed(0)
        + '%——报价落在这一档的机构大多只是试试看。真实发行也正好在这个区间（1.14 倍）。上市后一旦有风吹草动，这批人最先抛。';
    } else if (cover < 2.0) {
      vEl.className = 'bd-verdict ok';
      vEl.innerHTML = '<b>发行顺畅。</b>有效申购 ' + cover.toFixed(2)
        + ' 倍认购、边际档配售 ' + (ratio * 100).toFixed(0)
        + '%，投资者认可这个价，二级市场也有承接基础。';
    } else {
      vEl.className = 'bd-verdict warn';
      vEl.innerHTML = '<b>超募 ' + cover.toFixed(2) + ' 倍。</b>钱抢着进来，说明定价偏保守——发行人本可以把利率再压低一些，少付利息。但压过头会让老投资者吃亏，下次不来了。';
    }

    /* ---------- 省息换算 ---------- */
    var elSaveBig = document.getElementById('bdSaveBig');
    var elSaveSub = document.getElementById('bdSaveSub');
    if (elSaveBig && elSaveSub) {
      if (failed) {
        elSaveBig.textContent = '—';
        elSaveSub.textContent = '定价未成立，无法计算利息。';
      } else {
        var bp = (REAL_RATE - marginal) * 100;
        var money = bp * BP_VALUE;             // 万元
        var abs = Math.abs(money);
        if (Math.abs(bp) < 0.05) {
          elSaveBig.textContent = '与你一致';
          elSaveSub.innerHTML = '你定的利率就是真实发行利率 <b>1.72%</b>。接下来要回答的是：这个数是怎么定出来的，不是猜出来的。';
        } else {
          elSaveBig.textContent = (money > 0 ? '省 ' : '多付 ')
            + (abs >= 10000 ? (abs / 10000).toFixed(2) + ' 亿' : abs.toFixed(0) + ' 万');
          elSaveSub.innerHTML = '与真实发行利率 1.72% 相比，偏离 <b>' + (bp > 0 ? '−' + bp.toFixed(0) : '+' + Math.abs(bp).toFixed(0))
            + ' bp</b>；按 50 亿元、3 年期计，1 个 bp 就是 <b>150 万元</b>利息。';
        }
      }
    }

    /* 供里程碑/埋点引用 */
    root.dataset.rate = failed ? 'fail' : marginal.toFixed(2);
    root.dataset.cover = cover.toFixed(2);

    scheduleTrack(failed ? 0 : marginal, cover, ratio, failed);

    curveSet();
    renderRank();
    saveState();
  }

  /* ---------- 行为留痕：最终定价 + 改价次数 ----------
     五维「风险预判与决策能力」里的「簿记定价偏离真值」由这条事件现算。
     防抖 2.5 秒：学生拖数字时会连发几十次 input，没必要每次上报。 */
  var edits = 0, trackTimer = null, lastTrack = '';
  function scheduleTrack(rate, cover, ratio, failed) {
    if (typeof window.__ibankTrack !== 'function') return;
    if (trackTimer) clearTimeout(trackTimer);
    trackTimer = setTimeout(function () {
      var key = (failed ? 'fail' : rate.toFixed(2)) + '|' + edits;
      if (key === lastTrack) return;          // 状态没变就不重复上报
      lastTrack = key;
      try {
        window.__ibankTrack('bond', {
          module: '债券簿记', correct: null,
          detail: JSON.stringify({
            rate: failed ? 0 : +rate.toFixed(2),
            cover: +cover.toFixed(2),
            ratio: +(ratio * 100).toFixed(0),
            edits: edits,
            fail: !!failed
          })
        });
      } catch (e) { /* 上报失败不影响页面 */ }
    }, 2500);
  }

  /* ============================================================
     v96 · 边际曲线（阶梯需求曲线）
     横轴＝累计申购金额，纵轴＝报价；台阶垒到 50 亿元处，切线就是边际利率。
     数据一变先记目标值，再按 380ms 缓动重画——台阶是「滑」过去的，不是跳。
     另有「排队演示」：一条扫描线按报价由低到高，把台阶一家一家垒起来。
     ============================================================ */
  var cWrap = document.getElementById('bdCurveWrap');
  var cSvg = document.getElementById('bdCurve');
  var cRead = document.getElementById('bdCurveRead');

  var cCur = null;             // 屏幕上正在显示的值 [{n,r,a}]
  var cGoal = null;            // 目标值
  var cFrom = null;            // 本轮插值的起点
  var cT0 = 0, C_DUR = 380;
  var cPlayT = 1, cPlayFrom = -1, C_PLAY = 1700, cPlayReveal = false;
  var cRaf = 0, cLastKey = '';

  /* 课堂三轮：每轮讲评前把当前簿记记下来，前几轮在图上留虚线 */
  var rounds = [];             // [{no, rate, failed, book:[{n,r,a}]}]
  var roundNo = 1;             // 当前轮（1..3）
  /* 恢复上次自动保存的轮次（book 的利率/金额按行序还原，名字用当前组号） */
  if (bdSaved && bdSaved.no >= 1 && bdSaved.no <= 3) {
    roundNo = bdSaved.no;
    /* v120：按实际保存的轮次恢复，不再用 roundNo-1 截断。
       第三轮记下后 roundNo 仍为 3，旧写法会漏掉 rounds[2]，刷新后总榜少一轮。
       无效项必须 continue，不能赋 null——稀疏数组会让 renderDebrief 读到 null。 */
    for (var ri = 0; ri < 3; ri++) {
      var rd = bdSaved.rs && bdSaved.rs[ri];
      if (!rd || typeof rd.rate !== 'number') continue;
      rounds[ri] = {
        no: rd.no, rate: rd.rate, failed: !!rd.failed,
        book: (Array.isArray(rd.book) && rd.book.length === SEED.length)
          ? rd.book.map(function (v, ix) { return { n: SEED[ix].n, r: v[0], a: v[1] }; })
          : null,
        alloc: (Array.isArray(rd.alloc) && rd.alloc.length === SEED.length) ? rd.alloc.slice() : null
      };
    }
  }
  var pills = [document.getElementById('bdPill1'), document.getElementById('bdPill2'), document.getElementById('bdPill3')];

  function cNow() {
    return (window.performance && window.performance.now) ? window.performance.now() : Date.now();
  }
  function cClone(list) {
    return list.map(function (b) { return { n: b.n, r: b.r, a: b.a }; });
  }

  /* 一次重算 → 记目标值、更新解说、启动动画 */
  function curveSet() {
    if (!cSvg) return;
    cGoal = cClone(bids);
    if (!cCur) cCur = cClone(cGoal);
    else { cFrom = cClone(cCur); cT0 = cNow(); }
    if (cPlayFrom >= 0) { cPlayT = 1; cPlayFrom = -1; cPlayReveal = false; }   // 排队演示中改数 → 直接给全貌
    cText(cGoal);
    cStart();
  }

  function cStart() { if (!cRaf) cRaf = requestAnimationFrame(cStep); }

  function cStep(ts) {
    cRaf = 0;
    var t = Math.min(1, (ts - cT0) / C_DUR);
    if (cFrom) {
      var e = 1 - Math.pow(1 - t, 3);
      cCur = cFrom.map(function (f, i) {
        var g = cGoal[i] || f;
        return { n: g.n, r: f.r + (g.r - f.r) * e, a: f.a + (g.a - f.a) * e };
      });
    }
    var playing = false;
    if (cPlayFrom >= 0) {
      cPlayT = Math.min(1, (ts - cPlayFrom) / C_PLAY);
      playing = true;
      if (cPlayT >= 1) {
        cPlayFrom = -1; playing = false;
        if (cPlayReveal) { cPlayReveal = false; cText(cGoal); }   // 排完了才揭晓切口
      }
    }
    cRender(cCur);
    if (t < 1 || playing) cStart();
    else cFrom = null;
  }

  function cRender(pos) {
    if (!cSvg || !pos) return;
    var W = Math.round(cWrap.clientWidth || 0);
    if (W < 240) return;                       // 页面还没显示（display:none），等 ResizeObserver
    var H = W < 620 ? 250 : 300;
    var PL = 52, PR = 16, PT = 16, PB = 30;
    var iw = W - PL - PR, ih = H - PT - PB;
    cLastKey = W + 'x' + H;

    var S = settle(pos.map(function (b, i) { return { i: i, n: b.n, r: b.r, a: b.a }; }));
    var total = S.total;

    var minR = 9, maxR = -9;
    pos.forEach(function (b) { if (b.r < minR) minR = b.r; if (b.r > maxR) maxR = b.r; });
    rounds.forEach(function (rd) {
      if (!rd || !rd.book) return;
      rd.book.forEach(function (b) { if (b.r < minR) minR = b.r; if (b.r > maxR) maxR = b.r; });
    });
    if (minR > maxR) { minR = 1.62; maxR = 2.00; }
    var yLo = Math.min(1.60, minR - 0.02), yHi = Math.max(2.02, maxR + 0.02);
    var yStep = (yHi - yLo) > 0.62 ? 0.2 : ((yHi - yLo) > 0.32 ? 0.1 : 0.05);

    var xNeed = Math.max(SIZE, total) * 1.04;
    var xStep = xNeed <= 60 ? 10 : (xNeed <= 120 ? 20 : (xNeed <= 300 ? 50 : 100));
    var xMax = Math.ceil(xNeed / xStep) * xStep;

    function X(v) { return PL + v / xMax * iw; }
    function Y(r) { return PT + (1 - (r - yLo) / (yHi - yLo)) * ih; }

    var failed = total < SIZE - 1e-9;
    var frontier = cPlayT >= 1 ? PL + iw : PL + cPlayT * iw;
    var out = [];

    /* 底色：左＝中标区，右＝落标区 */
    out.push('<rect class="bd-band-win" x="' + PL + '" y="' + PT + '" width="' + Math.max(0, X(SIZE) - PL).toFixed(1) + '" height="' + ih + '"/>');
    out.push('<rect class="bd-band-fail" x="' + X(SIZE).toFixed(1) + '" y="' + PT + '" width="' + Math.max(0, PL + iw - X(SIZE)).toFixed(1) + '" height="' + ih + '"/>');

    /* 横向刻度（利率） */
    for (var yr = Math.ceil(yLo / yStep) * yStep; yr <= yHi + 1e-9; yr += yStep) {
      var yy = Y(yr);
      out.push('<line class="bd-gl" x1="' + PL + '" y1="' + yy.toFixed(1) + '" x2="' + (PL + iw) + '" y2="' + yy.toFixed(1) + '"/>');
      out.push('<text class="bd-tick" x="' + (PL - 8) + '" y="' + (yy + 3.6).toFixed(1) + '" text-anchor="end">' + yr.toFixed(2) + '</text>');
    }
    /* 纵向刻度（金额） */
    for (var xv = 0; xv <= xMax + 1e-9; xv += xStep) {
      var xx = X(xv);
      out.push('<line class="bd-gl" x1="' + xx.toFixed(1) + '" y1="' + PT + '" x2="' + xx.toFixed(1) + '" y2="' + (PT + ih) + '"/>');
      out.push('<text class="bd-tick' + (Math.abs(xv - SIZE) < 1e-9 ? ' bd-tick-50' : '') + '" x="' + xx.toFixed(1)
        + '" y="' + (PT + ih + 15) + '" text-anchor="middle">' + xv + '</text>');
    }

    /* 分区标签 */
    out.push('<text class="bd-bandtag" x="' + (PL + 8) + '" y="' + (PT + 13) + '">中标区 · 全额获配</text>');
    if (X(SIZE) + 110 < PL + iw) {
      // 落标区标签放右下角：右上角通常正好是报价最高的那几级台阶
      out.push('<text class="bd-bandtag" x="' + (PL + iw - 8) + '" y="' + (PT + ih - 8) + '" text-anchor="end">落标区 · 一分钱拿不到</text>');
    }

    /* 已记下的前几轮：先铺虚线台阶，再压上本轮的实线 */
    rounds.forEach(function (rd, ri) {
      if (!rd || !rd.book) return;
      var Sg = settle(rd.book.map(function (b, i) { return { i: i, n: b.n, r: b.r, a: b.a }; }));
      var d = '', cum2 = 0, started = false;
      Sg.sorted.forEach(function (b) {
        var gy = Y(b.r);
        if (!started) { d += 'M' + X(0).toFixed(1) + ' ' + gy.toFixed(1); started = true; }
        d += 'L' + X(cum2).toFixed(1) + ' ' + gy.toFixed(1) + 'L' + X(cum2 + b.a).toFixed(1) + ' ' + gy.toFixed(1);
        cum2 += b.a;
      });
      if (d) {
        out.push('<path class="bd-ghost" style="opacity:' + (0.78 - ri * 0.16).toFixed(2) + '" d="' + d + '"><title>第 '
          + (rd.no || (ri + 1)) + ' 轮 · ' + (rd.failed ? '流标' : rd.rate.toFixed(2) + '%') + '</title></path>');
      }
    });

    /* 台阶本体：报价 = 边际的那几段全涂红（这一档是同价、按比例配售），
       低于边际蓝、高于边际灰——不能按「过没过 50 亿」判色，否则同一档会被劈成红+灰。 */
    var segs = '', links = '', cum = 0, prevY = null;
    S.sorted.forEach(function (b) {
      var x1 = X(cum), x2 = X(cum + b.a), yy = Y(b.r);
      var cls = failed ? 'win'
        : (Math.abs(b.r - S.marginal) < 1e-9 ? 'marg' : (b.r < S.marginal ? 'win' : 'fail'));
      if (x1 < frontier - 0.3) {
        var x2v = Math.min(x2, frontier);
        if (x2v - x1 > 0.3) {
          segs += '<line class="bd-seg ' + cls + '" x1="' + x1.toFixed(1) + '" y1="' + yy.toFixed(1)
            + '" x2="' + x2v.toFixed(1) + '" y2="' + yy.toFixed(1) + '"><title>'
            + esc(b.n) + ' · ' + b.r.toFixed(2) + '% · 申购 ' + b.a.toFixed(1) + ' 亿</title></line>';
        }
        if (prevY !== null && Math.abs(prevY - yy) > 0.2) {
          links += '<line class="bd-link" x1="' + x1.toFixed(1) + '" y1="' + prevY.toFixed(1)
            + '" x2="' + x1.toFixed(1) + '" y2="' + yy.toFixed(1) + '"/>';
        }
      }
      cum += b.a;
      prevY = yy;
    });
    if (links) out.push(links);
    if (segs) out.push(segs);

    /* 50 亿发行线 */
    out.push('<line class="bd-line50" x1="' + X(SIZE).toFixed(1) + '" y1="' + (PT - 4) + '" x2="' + X(SIZE).toFixed(1) + '" y2="' + (PT + ih) + '"/>');
    if (!failed && cPlayT >= 1) {
      var my = Y(S.marginal), mx = X(SIZE);
      out.push('<line class="bd-mline" x1="' + PL + '" y1="' + my.toFixed(1) + '" x2="' + mx.toFixed(1) + '" y2="' + my.toFixed(1) + '"/>');
      out.push('<circle class="bd-dot" cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="4.5"/>');
      var label = '边际 ' + S.marginal.toFixed(2) + '%';
      var tw = label.length * 7 + 14;
      var tx = mx - 10 - tw;                       // 默认贴左边：右侧紧接着是落标台阶
      if (tx < PL + 4) tx = mx + 10;
      var ty = my - 24;
      if (ty < PT) ty = my + 8;
      out.push('<rect class="bd-tagrect" x="' + tx.toFixed(1) + '" y="' + ty.toFixed(1) + '" width="' + tw + '" height="19" rx="5"/>');
      out.push('<text class="bd-tagtext" x="' + (tx + 7).toFixed(1) + '" y="' + (ty + 13.5).toFixed(1) + '">' + label + '</text>');
    }

    /* 轴标题：窄屏上让位给刻度，说明文字在卡片里已经写了 */
    if (W >= 520) {
      out.push('<text class="bd-axistitle" x="' + (PL + iw) + '" y="' + (H - 2) + '" text-anchor="end">累计申购金额（亿元）</text>');
      out.push('<text class="bd-axistitle" transform="translate(12,' + (PT + ih / 2).toFixed(1) + ') rotate(-90)" text-anchor="middle">报价（%）</text>');
    }

    cSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    cSvg.setAttribute('height', H);
    cSvg.innerHTML = out.join('');
  }

  /* 曲线下方那句话：这一段是老师投屏时最省口舌的地方 */
  function cText(pos) {
    if (!cRead) return;
    var S = settle(pos.map(function (b, i) { return { i: i, n: b.n, r: b.r, a: b.a }; }));
    var total = S.total, failed = total < SIZE - 1e-9;

    if (failed) {
      cRead.innerHTML = '<b>还没排满。</b>全场累计只有 <span class="hot">' + total.toFixed(1)
        + ' 亿</span>，离 50 亿元发行线还差 <b>' + (SIZE - total).toFixed(1)
        + ' 亿</b>——曲线根本没走到那条线。这时候不存在「边际利率」，只有发行失败与余额包销。';
      return;
    }

    var k = 0;
    while (k < S.cums.length && S.cums[k] < SIZE - 1e-9) k++;
    var b = S.sorted[k], cum = S.cums[k];

    /* 边际档常常不止一家——这几家同价、一起按比例分剩下的量；再往上的才是落标 */
    var mAmt = 0, mGot = 0, mCnt = 0, above = 0, aboveCnt = 0;
    S.sorted.forEach(function (x, j) {
      if (Math.abs(x.r - S.marginal) < 1e-9) { mAmt += x.a; mGot += S.alloc[j]; mCnt++; }
      else if (x.r > S.marginal) { above += x.a; aboveCnt++; }
    });
    var ratio = mAmt > 0 ? mGot / mAmt : 1;
    var exact = Math.abs(cum - SIZE) < 1e-9;

    cRead.innerHTML = '<b>切口在这里。</b>按报价从低到高垒，排到第 ' + (k + 1) + ' 家（<b>' + esc(b.n)
      + '</b>）时累计到 <span class="hot">' + cum.toFixed(1) + ' 亿</span>，' + (exact ? '正好凑满' : '越过了')
      + ' 50 亿发行线——所以 <span class="hot">' + b.r.toFixed(2) + '%</span> 就是全场票面利率。'
      + '落在这一档的 <b>' + mCnt + ' 家</b>共 ' + mAmt.toFixed(1) + ' 亿，按 <b>' + (ratio * 100).toFixed(0) + '%</b> 配售'
      + (aboveCnt > 0
        ? '；再往上 ' + aboveCnt + ' 家（合计 ' + above.toFixed(1) + ' 亿）报价更高，一分钱也拿不到。'
        : '；这一档之上没有人落标。');
  }

  /* ---------- v120 · 实时排名：以「本轮成功拿到的配额」为唯一评分口径 ----------
     表格 11 行位置固定，只填名次（学生录入时不跳行、不丢光标）；整宽榜单按成绩从高到低排。
     三轮都记下后，主排序从「本轮获配」切成「三轮累计」，形成总排名。
     评分只看获配额；报价低于自家资金成本的组标红——拿得多不等于赚得多。 */
  function rankOf(vals) {
    var idx = vals.map(function (v, i) { return { i: i, v: v }; });
    idx.sort(function (a, b) { return (b.v - a.v) || (a.i - b.i); });
    var last = null, pos = 0;
    return idx.map(function (x, k) {
      if (last === null || Math.abs(x.v - last) > 1e-9) pos = k + 1;
      last = x.v;
      return { i: x.i, v: x.v, rank: pos };
    });
  }

  function totals() {
    var t = bids.map(function () { return 0; });
    var done = 0;
    for (var r = 0; r < 3; r++) {
      var rd = rounds[r];
      if (!rd || !Array.isArray(rd.alloc)) continue;
      done++;
      for (var i = 0; i < t.length; i++) t[i] += (rd.alloc[i] || 0);
    }
    /* 三轮都记下后，总榜锁定在三轮快照，不再叠加学生后来又改动的当前簿记 */
    if (done < 3) for (var j = 0; j < t.length; j++) t[j] += curAlloc[j];
    return { t: t, done: done };
  }

  function renderRank() {
    var en = L() === 'en';
    var T = totals();
    var done = T.done, acc = T.t;
    var final = done >= 3;
    var primary = final ? acc : curAlloc;
    var order = rankOf(primary);
    var rankByGroup = [];
    order.forEach(function (x) { rankByGroup[x.i] = x.rank; });

    /* 表格里的名次列：行位置不动，只更新数字 */
    bids.forEach(function (b, i) {
      var cell = document.getElementById('bdRk' + i);
      if (!cell) return;
      cell.textContent = rankByGroup[i];
      cell.className = 'rk' + (rankByGroup[i] <= 3 ? ' top' : '') + (curAlloc[i] <= 0.001 ? ' zero' : '');
    });

    var th = document.getElementById('bdThRank');
    if (th) th.textContent = final ? (en ? 'Total' : '总名次') : (en ? 'Round' : '本轮名次');

    var title = document.getElementById('bdRankTitle');
    var hint = document.getElementById('bdRankHint');
    var head = document.getElementById('bdRankHead');
    var body = document.getElementById('bdRankBody');
    var foot = document.getElementById('bdRankFoot');
    if (!title || !head || !body) return;

    title.textContent = final
      ? (en ? 'Final leaderboard · three rounds combined' : '总排名 · 三轮累计')
      : (en ? 'Live leaderboard · round ' + roundNo : '实时排名 · 第 ' + roundNo + ' 轮');
    if (hint) hint.textContent = final
      ? (en ? 'Ranked by total allocated quota across all three rounds. Each round is an independent CNY 5bn book.'
            : '按三轮累计拿到的配额从高到低排。每轮都是一次独立的 50 亿元簿记，配额可以累加比较。')
      : (en ? 'Ranked by the quota won in this round. Change any bid or amount and the order updates immediately; completed rounds stay in the scorecard.'
            : '按本轮成功拿到的配额从高到低排。改动任何一格报价或金额，名次立刻重排；已记下的轮次进成绩单，三轮累计出总榜。');

    var cols = [en ? 'Rank' : '名次', en ? 'Group' : '机构',
                (en ? 'R1' : '第 1 轮'), (en ? 'R2' : '第 2 轮'), (en ? 'R3' : '第 3 轮'),
                en ? 'Total' : '累计获配'];
    head.innerHTML = cols.map(function (c, k) {
      return '<th class="' + (k === 1 ? '' : 'r') + '">' + esc(c) + '</th>';
    }).join('');

    var lossN = 0;
    bids.forEach(function (b, i) {
      if (b.a > 0.001 && Math.round((b.r - SEED[i].c) * 100) < 0) lossN++;
    });

    body.innerHTML = order.map(function (x) {
      var i = x.i, b = bids[i];
      var cells = [];
      for (var r = 0; r < 3; r++) {
        var rd = rounds[r];
        var v = (rd && Array.isArray(rd.alloc)) ? (rd.alloc[i] || 0) : null;
        if (v === null && r + 1 === roundNo && !final) v = curAlloc[i];
        cells.push(v === null ? '<span class="bd-rk-na">—</span>' : v.toFixed(1));
      }
      var bp = Math.round((b.r - SEED[i].c) * 100);
      var loss = b.a > 0.001 && bp < 0;
      var nm = esc(b.n) + (loss
        ? '<em class="bd-rk-loss">' + (en ? 'under cost ' + Math.abs(bp) + 'bp' : '亏 ' + Math.abs(bp) + 'bp') + '</em>'
        : '');
      return '<tr class="' + (x.rank <= 3 ? 'top' : '') + (loss ? ' loss' : '') + '" data-g="' + i + '">'
        + '<td class="rk">' + x.rank + '</td>'
        + '<td class="nm">' + nm + '</td>'
        + '<td class="r">' + cells[0] + '</td>'
        + '<td class="r">' + cells[1] + '</td>'
        + '<td class="r">' + cells[2] + '</td>'
        + '<td class="r tot">' + acc[i].toFixed(1) + '</td>'
        + '</tr>';
    }).join('');

    if (foot) {
      var score = en ? 'Scoring: allocated quota only (CNY 100m). ' : '评分口径：只看成功拿到的配额（亿元）。';
      var warn = lossN
        ? (en ? ' ' + lossN + ' group(s) bid below their own funding cost — more quota is not more profit.'
              : '红色标记是赔本抢量的组（' + lossN + ' 家）：拿得多不等于赚得多。')
        : (en ? ' No group is bidding below its funding cost.' : '当前报价没有赔本抢量的组。');
      var progress = final ? '' : (en ? ' Completed rounds: ' + done + ' / 3; the total includes the round being edited.'
                                      : ' 已记下 ' + done + ' / 3 轮，累计含当前正在改的这一轮。');
      foot.innerHTML = score + progress + warn
        + (en ? ' Ties share a rank; the next rank is skipped.' : ' 获配相同并列同名次，下一名跳过。');
    }
  }

  /* ---------- 环节三收尾：三轮都记下才出现 ----------
     这一环节的重点概念（边际利率 / 票面利率 / 配售比例 / 1bp）在页面上都实时算过了，
     这里只把「你们三轮走到哪」和「四个概念各自是什么」并排放一次，作为环节讲解。 */
  function renderDebrief() {
    var box = document.getElementById('bdDebrief');
    if (!box) return;
    /* 只认真正记下的轮次：稀疏数组（老存档 / 中途重来）不能当成三轮走完 */
    var done = [];
    for (var d = 0; d < 3; d++) if (rounds[d] && typeof rounds[d].rate === 'number') done.push(rounds[d]);
    if (done.length < 3) { box.hidden = true; return; }
    box.hidden = false;

    var seq = [];
    for (var i = 0; i < 3; i++) {
      var rd = done[i];
      if (!rd) continue;
      seq.push('<span class="bd-db-p"><b>第 ' + (i + 1) + ' 轮</b>'
        + '<i>' + (rd.failed ? '流标' : rd.rate.toFixed(2) + '%') + '</i></span>');
    }
    var host = document.getElementById('bdDbRounds');
    if (host) host.innerHTML = seq.join('<span class="bd-db-arrow">→</span>');

    var note = document.getElementById('bdDbNote');
    if (!note) return;
    var rt = done[2];
    if (rt.failed) {
      note.innerHTML = '<b>第三轮流标了。</b>累计申购没到 50 亿元，场上不存在「边际利率」——这时候只剩发行失败和余额包销两条路。把利率往上放一点再走一轮，就能看到边际利率是怎么被「刚好卖完」这一档顶出来的。';
      return;
    }
    var first = done[0];
    var bpAll = Math.round((rt.rate - first.rate) * 100);
    note.innerHTML = '<b>三轮从 ' + first.rate.toFixed(2) + '% 走到 ' + rt.rate.toFixed(2) + '%（'
      + (bpAll === 0 ? '没动' : (bpAll > 0 ? '+' : '') + bpAll + 'bp') + '）。</b>'
      + '每下调 1bp，发行人三年省 150 万元；但边际档的配售比例会同步往上抬，'
      + '抬到有效申购倍数撑不住的时候，就变成余额包销。真实发行落在 1.72%——'
      + '那个数不是算出来的，是把订单簿排到 50 亿元那一条线上读出来的。';
  }

  /* 三轮状态条：已记下的显示该轮边际利率，以及相邻两轮的 bp 变化 */
  function refreshRounds() {
    var last = null;
    for (var r = 1; r <= 3; r++) {
      var el = pills[r - 1];
      if (!el) continue;
      var rd = rounds[r - 1];
      el.className = 'bd-pill ' + (rd ? 'done' : (r === roundNo ? 'now' : 'todo'));
      var html = '<b>第 ' + r + ' 轮</b>';
      if (rd) {
        html += '<i>' + (rd.failed ? '流标' : rd.rate.toFixed(2) + '%') + '</i>';
        if (last !== null && !rd.failed) {
          var bp = Math.round((rd.rate - last) * 100);
          html += '<u class="' + (bp > 0 ? 'up' : (bp < 0 ? 'down' : '')) + '">'
            + (bp === 0 ? '持平' : (bp > 0 ? '+' : '') + bp + 'bp') + '</u>';
        }
        last = rd.failed ? null : rd.rate;
      } else if (r === roundNo) {
        html += '<i>进行中</i>';
      } else {
        html += '<i>—</i>';
      }
      el.innerHTML = html;
    }
    var btn = root.querySelector('[data-bd="lock"]');
    if (btn) btn.textContent = roundNo < 3 ? '记下本轮 →' : '记下本轮（收尾）';
    var tag = document.getElementById('bdRoundTag');
    if (tag) tag.textContent = '第 ' + roundNo + ' 轮 · 改报价或金额，右侧立即重算';
  }

  /* 尺寸变了重画（页面从 display:none 变可见也走这里） */
  if (cSvg && cWrap) {
    if (window.ResizeObserver) {
      var cRo = new window.ResizeObserver(function () {
        var W = Math.round(cWrap.clientWidth || 0);
        if (W < 240) return;
        var key = W + 'x' + (W < 620 ? 250 : 300);
        if (key === cLastKey) return;
        cRender(cCur);
      });
      cRo.observe(cWrap);
    }
    var cResizeTimer = 0;
    window.addEventListener('resize', function () {
      clearTimeout(cResizeTimer);
      cResizeTimer = setTimeout(function () { cLastKey = ''; cRender(cCur); }, 120);
    });
  }

  /* ---------- 输入监听（事件委托，重渲染后无需重绑） ---------- */
  tbody.addEventListener('input', function (e) {
    var el = e.target;
    if (!el || !el.dataset || el.dataset.i === undefined) return;
    var i = parseInt(el.dataset.i, 10);
    var v = parseFloat(el.value);
    if (isNaN(v) || v < 0) return;
    bids[i][el.dataset.k] = v;
    if (el.dataset.k === 'r') edits++;      // 改价次数：决策犹豫的直接证据
    calc();
  });

  /* ---------- 操作按钮 ---------- */
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-bd]');
    if (!b) return;
    var act = b.getAttribute('data-bd');

    if (act === 'reset') {
      // 两段确认：数据有改动时，第一下只点亮确认文案，再点一下才真的覆盖
      var dirty = rounds.length > 0;
      if (!dirty) {
        for (var di = 0; di < bids.length; di++) {
          if (Math.abs(bids[di].r - SEED[di].r) > 1e-9 || Math.abs(bids[di].a - SEED[di].a) > 1e-9) { dirty = true; break; }
        }
      }
      if (dirty && b.textContent.indexOf('确认') !== 0) {
        b.textContent = '确认覆盖？再点一次';
        setTimeout(function () { if (b.textContent.indexOf('确认') === 0) b.textContent = '还原真实簿记'; }, 4000);
        return;
      }
      b.textContent = '还原真实簿记';
      bids = SEED.map(function (x) { return { n: x.n, c: x.c, r: x.r, a: x.a }; });
      renderTable(); calc();
    } else if (act === 'fail') {
      // 演示余额包销：每户只报 1 亿，合计 11 亿，远不足 50 亿
      bids.forEach(function (x) { x.a = 1.0; });
      renderTable(); calc();
    } else if (act === 'squeeze') {
      // 演示压价：把 1.72% 那一档整体压到 1.67%，边际利率跟着下移一级
      bids.forEach(function (x) { if (Math.abs(x.r - 1.72) < 1e-9) x.r = 1.67; });
      renderTable(); calc();
    } else if (act === 'play') {
      // 排队演示：扫描线按报价由低到高把台阶垒起来，正好落在 50 亿那一档
      if (!cSvg) return;
      cPlayT = 0; cPlayFrom = cNow(); cPlayReveal = true; cStart();
      if (cRead) cRead.innerHTML = '<b>正在排队……</b>报价从低到高一家一家垒上去，撞到 50 亿元那条线的那一级，就是本场的票面利率。';
    } else if (act === 'lock') {
      // 记下本轮：把这一轮的簿记留成虚线，进入下一轮
      var Sl = settle(bids.map(function (x, ix) { return { i: ix, n: x.n, r: x.r, a: x.a }; }));
      var bad = Sl.total < SIZE - 1e-9;
      rounds[roundNo - 1] = {
        no: roundNo,
        rate: bad ? 0 : Sl.marginal,
        failed: bad,
        book: cClone(bids),
        alloc: curAlloc.slice()
      };
      if (roundNo < 3) roundNo++;
      refreshRounds();
      renderTable();
      calc();
      renderDebrief();
    } else if (act === 'clear-rounds') {
      rounds = [];
      roundNo = 1;
      refreshRounds();
      renderTable();
      calc();
      renderDebrief();
    }
  });

  /* 语言切换：i18n 层派发 ibk:lang，把带数字的动态文本重新拼一遍 */
  window.addEventListener('ibk:lang', function () {
    renderTable(); calc(); refreshRounds(); renderDebrief();
  });

  renderTable();
  calc();
  refreshRounds();
})();

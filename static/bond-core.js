/* ============================================================
   债券发行与承销 · 簿记建档仿真（#p-bond）
   IIFE 自包含，不改动 app-core.js 任何行为。
   数据来源：26比亚迪MTN003 公开披露的簿记建档记录
     · 发行规模 50 亿元，期限 3 年
     · 申购区间 1.62%—2.00%
     · 合规申购 18 家 / 109.2 亿元；有效申购 11 家 / 56.9 亿元
     · 最终票面利率 1.72%
   下表 11 家机构为按上述区间与总额还原的教学用簿记簿（合计 57.4 亿元，
   与真实 56.9 亿元的 0.5 亿元差额来自单笔金额取整），页面已明示。
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

  /* 初始簿记簿：报价、金额（亿元） */
  var SEED = [
    { n: '国有大行 A', r: 1.62, a: 8.0 },
    { n: '国有大行 B', r: 1.65, a: 9.0 },
    { n: '股份行 C', r: 1.68, a: 10.0 },
    { n: '股份行 D', r: 1.70, a: 11.0 },
    { n: '城商行 E', r: 1.72, a: 12.5 },
    { n: '公募基金 F', r: 1.75, a: 2.0 },
    { n: '理财子 G', r: 1.78, a: 1.5 },
    { n: '保险资管 H', r: 1.82, a: 1.2 },
    { n: '公募基金 I', r: 1.86, a: 0.8 },
    { n: '券商自营 J', r: 1.92, a: 0.7 },
    { n: '其他机构 K', r: 2.00, a: 0.7 }
  ];

  var bids = SEED.map(function (b) { return { n: b.n, r: b.r, a: b.a }; });

  var tbody = document.getElementById('bdRows');
  var barBox = document.getElementById('bdBar');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  /* ---------- 渲染报价表 ---------- */
  function renderTable() {
    tbody.innerHTML = bids.map(function (b, i) {
      return '<tr data-row="' + i + '">'
        + '<td class="nm">' + esc(b.n) + '</td>'
        + '<td><input type="number" step="0.01" min="0" max="9" value="' + b.r.toFixed(2) + '" data-i="' + i + '" data-k="r" aria-label="' + esc(b.n) + ' 报价"></td>'
        + '<td><input type="number" step="0.1" min="0" max="99" value="' + b.a.toFixed(1) + '" data-i="' + i + '" data-k="a" aria-label="' + esc(b.n) + ' 申购金额"></td>'
        + '<td class="got" id="bdGot' + i + '">—</td>'
        + '</tr>';
    }).join('');
  }

  /* ---------- 核心计算：边际利率 + 比例配售 ---------- */
  function calc() {
    var sorted = bids.map(function (b, i) {
      return { i: i, n: b.n, r: b.r, a: b.a };
    }).sort(function (x, y) { return x.r - y.r || x.i - y.i; });

    var total = sorted.reduce(function (s, b) { return s + b.a; }, 0);
    var alloc = sorted.map(function () { return 0; });
    var cum = 0, marginal = null;

    for (var k = 0; k < sorted.length; k++) {
      if (cum >= SIZE - 1e-9) break;
      var take = Math.min(sorted[k].a, SIZE - cum);
      alloc[k] = take;
      cum += take;
      if (take < sorted[k].a - 1e-9) {
        // 该档未全额获配 → 它就是边际档
        marginal = sorted[k].r;
        break;
      }
      if (Math.abs(cum - SIZE) < 1e-9) { marginal = sorted[k].r; break; }
    }
    if (marginal === null) {
      marginal = sorted.length ? sorted[sorted.length - 1].r : 0;
    }

    /* 边际档配售比例 */
    var mAmt = 0, mGot = 0;
    for (var k2 = 0; k2 < sorted.length; k2++) {
      if (Math.abs(sorted[k2].r - marginal) < 1e-9) {
        mAmt += sorted[k2].a;
        mGot += alloc[k2];
      }
    }
    var ratio = mAmt > 0 ? mGot / mAmt : 1;
    var filled = total < SIZE - 1e-9 ? total : SIZE;
    var failAmt = total - filled;

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

    elTotal.textContent = total.toFixed(1) + ' 亿';
    elCover.textContent = (total / SIZE).toFixed(2) + ' 倍';
    elFail.textContent = failed
      ? '缺口 ' + (SIZE - total).toFixed(1) + ' 亿'
      : (failAmt > 0.05 ? failAmt.toFixed(1) + ' 亿' : '无');

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
    var ln = document.createElement('span');
    ln.className = 'l50';
    ln.style.left = (failAmt > 0.001 ? (SIZE / total * 100) : 99.7) + '%';
    barBox.appendChild(ln);

    /* ---------- 判定条 ---------- */
    var vEl = document.getElementById('bdVerdict');
    var cover = total / SIZE;
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

    /* 供里程碑/埋点引用 */
    root.dataset.rate = failed ? 'fail' : marginal.toFixed(2);
    root.dataset.cover = cover.toFixed(2);

    scheduleTrack(failed ? 0 : marginal, cover, ratio, failed);
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
      bids = SEED.map(function (x) { return { n: x.n, r: x.r, a: x.a }; });
      renderTable(); calc();
    } else if (act === 'fail') {
      // 演示余额包销：每户只报 1 亿，合计 11 亿，远不足 50 亿
      bids.forEach(function (x) { x.a = 1.0; });
      renderTable(); calc();
    } else if (act === 'squeeze') {
      // 演示压价：把报 1.72% 的城商行压到 1.68%，看边际利率怎么往下走
      if (bids[4]) bids[4].r = 1.68;
      renderTable(); calc();
    }
  });

  renderTable();
  calc();
})();

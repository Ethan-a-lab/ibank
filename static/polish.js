/* polish.js — v163 质感层（滚动入场 stagger / 切页补入场 / 视差光斑）
 *
 * 设计约束（对应 VERSION_LOG v163）：
 * - 颜色零改动：本文件只动 class 和 transform，不碰任何颜色/布局属性
 * - 渐进增强：系统开启「减少动效」→ 整层退出（不加 polish-on、不藏任何元素）
 * - 只作用于 index.html 的 .page/.panel/.section 与三个 .bg-blob，
 *   对其它页面挂载时自动空转（选择器查不到目标即无行为）
 * - 全程无第三方依赖，出错也不影响业务脚本（不抛出）
 */
(function () {
  'use strict';
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq.matches) return;                       // 系统要求减少动效：整层退出

  var docEl = document.documentElement;
  docEl.classList.add('polish-on');

  /* ---------- 1. 候选目标：每个 .page 下的面板级块 + 卡片级元素 ---------- */
  var BLOCK_SEL = '.panel, .section';
  var CARD_SEL = '.home-card, .kpi-card, .case-item';
  var targets = [];
  document.querySelectorAll('.page').forEach(function (page) {
    page.querySelectorAll(BLOCK_SEL + ', ' + CARD_SEL).forEach(function (el) {
      if (targets.indexOf(el) === -1) targets.push(el);
    });
  });
  /* 嵌套去重：块级元素若祖先也是块级则不重复挂入场；
     卡片级元素保留（面板先入场、卡片段落级联，正是要的 stagger 层次） */
  targets = targets.filter(function (el) {
    if (el.matches(CARD_SEL)) return true;
    for (var p = el.parentElement; p; p = p.parentElement) {
      if (targets.indexOf(p) !== -1 && !p.matches(CARD_SEL)) return false;
    }
    return true;
  });

  function revealNow(el, delay) {
    el.style.setProperty('--rv-d', delay + 'ms');
    el.classList.add('rv-in');
  }

  /* ---------- 2. 滚动入场：IntersectionObserver + 同屏 stagger ---------- */
  if ('IntersectionObserver' in window && targets.length) {
    var io = new IntersectionObserver(function (entries) {
      var i = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        revealNow(en.target, Math.min(i * 70, 350));
        i += 1;
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
    targets.forEach(function (el) {
      el.classList.add('rv');
      io.observe(el);
    });
  }

  /* ---------- 3. 切页补入场：.page 由 display:none 变 active 时，
       IO 对隐藏元素可能尚未触发，这里立即按序补 stagger，保证切页无内容滞留 ---------- */
  if ('MutationObserver' in window) {
    var mo = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        var page = m.target;
        if (!page.classList || !page.classList.contains('active')) return;
        var pend = page.querySelectorAll('.rv:not(.rv-in)');
        if (!pend.length) return;
        Array.prototype.forEach.call(pend, function (el, i) {
          revealNow(el, Math.min(i * 60, 300));
        });
      });
    });
    document.querySelectorAll('.page').forEach(function (p) {
      mo.observe(p, { attributes: true, attributeFilter: ['class'] });
    });
  }

  /* ---------- 4. 视差光斑：滚动时三个光斑按不同系数轻移 ---------- */
  var blobs = [
    [document.querySelector('.bg-blob-1'), -0.06],
    [document.querySelector('.bg-blob-2'), 0.05],
    [document.querySelector('.bg-blob-3'), 0.09]
  ].filter(function (pair) { return pair[0]; });
  if (blobs.length) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY || 0;
        blobs.forEach(function (pair) {
          pair[0].style.transform =
            'translate3d(0,' + (y * pair[1]).toFixed(1) + 'px,0)';
        });
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 5. 会话中途切到「减少动效」：立即还原，不留隐藏元素 ---------- */
  var onMqChange = function (e) {
    if (!e.matches) return;
    docEl.classList.remove('polish-on');
    document.querySelectorAll('.rv:not(.rv-in)').forEach(function (el) {
      el.classList.add('rv-in');                 // 直接标完成，内容绝不滞留隐藏
    });
    blobs.forEach(function (pair) { pair[0].style.transform = ''; });
  };
  if (mq.addEventListener) mq.addEventListener('change', onMqChange);
  else if (mq.addListener) mq.addListener(onMqChange);
})();

/* iBank 中英双语语言层（运行时）
 *
 * 设计边界：
 *  1. 不碰业务逻辑，只在 DOM 层替换文本；切回中文时按快照无损还原。
 *  2. 双层字典：node（按钮/标签/表头/动态拼串）+ block（整段，值可含行内标签）。
 *     整段替换是为了避免 <b>/<code> 把一句话切碎后译成互不相连的片段。
 *  3. 短语表 + 正则兜底「选择 · 第3章 · 发行制度 ·」这类每次渲染都变的拼串。
 *  4. 属性层（placeholder/title/aria-label/alt）单独处理：它们不是文本节点，
 *     TreeWalker 走不到，而搜索框提示恰好藏在这里。
 *  5. MutationObserver 覆盖 app-core.js 动态渲染出来的文案。
 *  6. <option> 没有 value 时不翻译：浏览器会把显示文字当作值，改了会让
 *     教师/学生角色判断失效；系统 TTS 语音列表正是这种，而且语音包名本不该翻。
 */
(function () {
  var DATA = window.IBK_I18N;
  if (!DATA) return;

  var DICT = DATA.node || {};
  var BLOCK = DATA.block || {};
  var PHR = DATA.phrase || {};
  var RXR = (DATA.regex || []).map(function (r) {
    return [new RegExp(r[0], 'g'), r[1], !!r[2]];
  });
  var PK = Object.keys(PHR).sort(function (a, b) { return b.length - a.length; });

  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, TEMPLATE: 1 };
  /* 整段替换只用于「语义段落」，且子元素必须都是行内强调标签。
     否则会把卡片容器拼成一根字符串、毁掉布局。 */
  var BLOCKTAGS = { P: 1, LI: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, TD: 1, TH: 1, FIGCAPTION: 1, BLOCKQUOTE: 1 };
  var INLINE = { B: 1, STRONG: 1, EM: 1, I: 1, SPAN: 1, BR: 1, A: 1, SMALL: 1, CODE: 1, U: 1, S: 1, MARK: 1, SUP: 1, SUB: 1, ABBR: 1, TIME: 1 };

  var BTN = document.getElementById('ibk-lang-btn');
  var TXT = document.getElementById('ibk-lang-txt');
  var TITLE_ZH = document.title;
  var savedText = [], savedAttr = [], savedBlock = [];
  var qs = new URLSearchParams(location.search);
  var ZH = /[\u4e00-\u9fff]/;

  function hasChinese(s) { return ZH.test(s || ''); }

  function pageOf(el) {
    var p = el;
    while (p && p !== document.body) {
      if (p.id && p.id.indexOf('p-') === 0) return p.id;
      p = p.parentNode;
    }
    return '-';
  }

  var lang = (function () {
    var q = qs.get('lang');
    if (q === 'en' || q === 'zh') return q;
    try { return localStorage.getItem('ibank_lang') || 'zh'; } catch (e) { return 'zh'; }
  })();

  function save(v) { try { localStorage.setItem('ibank_lang', v); } catch (e) {} }

  function skipped(n) {
    var p = n.parentNode;
    while (p) {
      if (p.nodeType === 1) {
        if (p === BTN || SKIP[p.tagName]) return true;
        if (p.hasAttribute && p.hasAttribute('data-i18n-skip')) return true;
      }
      p = p.parentNode;
    }
    return false;
  }

  function trPhrase(v) {
    /* 在 trim 后的串上跑规则：正则用 ^...$ 锚定，带前后空白的原文会失配。
       命中后把结果套回原串，保留原有空白，避免行内排版被挤在一起。 */
    var s = v.trim(), o = s, i, before, allowZh = false;
    for (i = 0; i < RXR.length; i++) {
      before = o;
      o = o.replace(RXR[i][0], RXR[i][1]);
      if (o !== before && RXR[i][2]) allowZh = true;
    }
    for (i = 0; i < PK.length; i++) {
      if (o.indexOf(PK[i]) >= 0) o = o.split(PK[i]).join(PHR[PK[i]]);
    }
    if (o === s) return null;
    if (hasChinese(o) && !allowZh) return null;  /* 词表不全就宁可留原文，别拼出半中半英 */
    return v.replace(s, o);
  }

  function trNode(n) {
    if (n.nodeType !== 3 || skipped(n)) return 0;
    var pn = n.parentNode;
    if (pn && pn.tagName === 'OPTION' && !pn.hasAttribute('value')) return 0;
    var v = n.nodeValue;
    if (!v || !hasChinese(v)) return 0;
    var key = v.trim(), en = DICT[key] || BLOCK[key];
    if (en && en.indexOf('<') !== 0) {
      savedText.push({ n: n, v: v });
      n.nodeValue = v.replace(key, en);
      return 1;
    }
    var ph = trPhrase(v);
    if (ph !== null) {
      savedText.push({ n: n, v: v });
      n.nodeValue = ph;
      return 1;
    }
    return 0;
  }

  function trBlock(el) {
    if (!el || el.nodeType !== 1) return 0;
    var tag = el.tagName;
    /* p/li/h1-h6/td 直接允许；div/span 只有字典里显式给了整段译文才替换 */
    if (!BLOCKTAGS[tag] && tag !== 'DIV' && tag !== 'SPAN') return 0;
    if (el.hasAttribute && el.hasAttribute('data-i18n-skip')) return 0;
    var ch = el.children;
    if (ch.length > 6) return 0;
    for (var i = 0; i < ch.length; i++) { if (!INLINE[ch[i].tagName]) return 0; }
    var key = (el.textContent || '').trim();
    if (!key || !hasChinese(key)) return 0;
    var en = BLOCK[key];
    if (!en) return 0;
    savedBlock.push({ el: el, html: el.innerHTML });
    el.innerHTML = en;
    return 1;
  }

  function walkEl(el) {
    if (!el) return 0;
    if (el.nodeType === 3) return trNode(el);
    if (el.nodeType !== 1) return 0;
    if (el === BTN || SKIP[el.tagName]) return 0;
    if (trBlock(el)) return 1;
    var n = 0, ch = el.childNodes;
    for (var i = 0; i < ch.length; i++) {
      var c = ch[i];
      if (c.nodeType === 3) n += trNode(c);
      else if (c.nodeType === 1) n += walkEl(c);
    }
    return n;
  }

  function doAttrs(root) {
    var els = root.querySelectorAll('[placeholder],[title],[aria-label],[alt]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el === BTN || (BTN && BTN.contains(el))) continue;
      for (var j = 0; j < ATTRS.length; j++) {
        var a = ATTRS[j], v = el.getAttribute(a);
        if (!v || !hasChinese(v)) continue;
        var en = DICT[v.trim()] || BLOCK[v.trim()];
        if (en && en.indexOf('<') !== 0) {
          savedAttr.push({ el: el, a: a, v: v });
          el.setAttribute(a, v.replace(v.trim(), en));
        } else {
          var ph = trPhrase(v);
          if (ph !== null) { savedAttr.push({ el: el, a: a, v: v }); el.setAttribute(a, ph); }
        }
      }
    }
  }

  function restore() {
    for (var i = savedBlock.length - 1; i >= 0; i--) {
      try { savedBlock[i].el.innerHTML = savedBlock[i].html; } catch (e) {}
    }
    for (var k = 0; k < savedText.length; k++) {
      try { savedText[k].n.nodeValue = savedText[k].v; } catch (e) {}
    }
    for (var m = 0; m < savedAttr.length; m++) {
      try { savedAttr[m].el.setAttribute(savedAttr[m].a, savedAttr[m].v); } catch (e) {}
    }
    savedBlock = []; savedText = []; savedAttr = [];
  }

  function zhLeft() {
    var tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false), n, c = 0;
    while ((n = tw.nextNode())) {
      if (!hasChinese(n.nodeValue || '')) continue;
      if (skipped(n)) continue;
      c++;
    }
    return c;
  }

  function attrLeft() {
    var els = document.querySelectorAll('[placeholder],[title],[aria-label],[alt]'), c = 0;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el === BTN) continue;
      for (var j = 0; j < ATTRS.length; j++) {
        var v = el.getAttribute(ATTRS[j]);
        if (v && hasChinese(v)) c++;
      }
    }
    return c;
  }

  function refresh() {
    document.documentElement.lang = (lang === 'en') ? 'en' : 'zh-CN';
    /* 通知自带文案的独立模块（如 undercover.js）同步重渲染。
       必须同步派发：selftest 是在 setLang() 返回后立刻统计残留的，
       MutationObserver 的回调要等微任务，赶不上那一次统计。 */
    try { window.dispatchEvent(new CustomEvent('ibk:lang', { detail: lang })); } catch (e) {}
    var tt = DICT[TITLE_ZH] || BLOCK[TITLE_ZH];
    document.title = (lang === 'en' && tt) ? tt : TITLE_ZH;
    if (TXT) TXT.textContent = (lang === 'en') ? '中文' : 'EN';
    if (BTN) {
      /* 用 classList 而不是直接赋 className：赋值会把悬浮态的 ibk-floating 冲掉 */
      if (lang === 'en') BTN.classList.add('ibk-en'); else BTN.classList.remove('ibk-en');
      BTN.title = (lang === 'en')
        ? 'Switch back to Chinese / 切回中文'
        : 'Switch to English / 切换到英文';
    }
  }

  function setLang(next) {
    lang = next;
    save(lang);
    restore();
    if (lang === 'en') {
      try { walkEl(document.body); doAttrs(document.body); } catch (e) {}
    }
    refresh();
  }

  if (BTN) {
    BTN.addEventListener('click', function () { setLang(lang === 'en' ? 'zh' : 'en'); });
  }

  var mo = new MutationObserver(function (muts) {
    if (lang !== 'en') return;
    for (var m = 0; m < muts.length; m++) {
      var ns = muts[m].addedNodes;
      for (var i = 0; i < ns.length; i++) {
        var n = ns[i];
        if (n.nodeType === 3) trNode(n);
        else if (n.nodeType === 1 && n !== BTN) walkEl(n);
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  /* 首次进入：如果是英文态就先翻译一遍 */
  if (lang === 'en') { try { walkEl(document.body); doAttrs(document.body); } catch (e) {} }
  refresh();

  /* 验收钩子：?selftest=1 —— 中/英/中/英 的残留中文文本节点数，再接属性残留数。
     期望输出 正数,0,正数,0,0：说明切英文无残留，切回中文能完整还原。 */
  if (qs.get('selftest') === '1') {
    var c = [];
    c.push(zhLeft());
    setLang('en'); c.push(zhLeft());
    setLang('zh'); c.push(zhLeft());
    setLang('en'); c.push(zhLeft()); c.push(attrLeft());
    document.body.setAttribute('data-i18n-selftest', c.join(','));
  }

  /* 验收钩子：?selftest=2&page=p-bond —— 先切到指定页、等它渲染完再统计。
     必须逐页跑：图表、账簿表这些是切页时才生成的，只看首页会漏。 */
  if (qs.get('selftest') === '2') {
    (function () {
      var tp = qs.get('page');
      setLang('en');
      if (tp) {
        var secs = document.querySelectorAll('.page');
        for (var i = 0; i < secs.length; i++) {
          secs[i].classList.toggle('active', secs[i].id === tp);
        }
      }
      setTimeout(function () {
        try { walkEl(document.body); doAttrs(document.body); } catch (e) {}
        document.body.setAttribute('data-i18n-selftest', zhLeft() + ',' + attrLeft());
      }, 1500);
    })();
  }
})();

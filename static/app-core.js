
    // ===== 班级清单（全校唯一数据源）=====
    // 以贵州大学本科金融专业学号规则为依据：**两位入学年份 + 四位专业代码 + 四位序号**，
    // 例如 2000050031 = 2020 级 / 0005 金融学专业 / 0031 序号，全长 10 位。
    // 一届金融专业不会有几千人，故序号位固定 4 位即可；本班制下2024 级为 24 + 0005 + 00xx。
    // 之前班级选项在 HTML 里散落硬编码（注册表、顶部下拉、后台 KPI、页脚各写一份），
    // 加班级要改四处、极易漏。现改为集中定义 + 运行时回填，以后只改这一处。
    const CLASS_LIST = ['金融2401', '金融2402', '金融2403', '金融2404'];
    window.IBANK_CLASSES = CLASS_LIST;

    // 回填所有 select 中的班级选项；keep 保留当前已选值（切换页面/刷新时不丢）
    function fillClassSelects(keep) {
      const keepVal = keep === undefined ? null : keep;
      document.querySelectorAll('select').forEach(function (sel) {
        if (!sel.id || !/class/i.test(sel.id)) return;          // 只动 id 含 class 的下拉
        const placeholder = sel.querySelector('option[value=""]');
        const cur = keepVal !== null && keepVal !== undefined && keepVal !== '' ? keepVal : sel.value;
        sel.innerHTML = '';
        if (placeholder) sel.appendChild(placeholder);
        CLASS_LIST.forEach(function (c) {
          const o = document.createElement('option');
          o.value = c; o.textContent = c;
          sel.appendChild(o);
        });
        if (cur && CLASS_LIST.indexOf(cur) >= 0) sel.value = cur;
      });
    }
    document.addEventListener('DOMContentLoaded', function () {
      fillClassSelects();
      // 页脚班级范围同步（同样由 CLASS_LIST 单一来源驱动）
      const fc = document.getElementById('footer-classes');
      if (fc) fc.textContent = CLASS_LIST[0] + ' – ' + CLASS_LIST[CLASS_LIST.length - 1];
    });

    // ===== 深色模式切换（localStorage 持久化；全站统一跟随，admin 页不再强制浅色） =====
    const themeToggle = document.getElementById('theme-toggle');
    function applyTheme(t) {
      document.body.classList.toggle('dark', t === 'dark');
      document.body.classList.remove('light'); // admin 页旧豁免已取消，body.light 不再残留
      if (themeToggle) themeToggle.textContent = (t === 'dark') ? '☀️' : '🌙';
      try { localStorage.setItem('ibank-theme', t); } catch (e) {}
    }
    let savedTheme = 'light';
    try { savedTheme = localStorage.getItem('ibank-theme') || 'light'; } catch (e) {}
    applyTheme(savedTheme);
    if (themeToggle) themeToggle.addEventListener('click', function () {
      applyTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
    });

    // ===== 页内跳转按钮（Hero / CTA / 页脚的 data-goto） =====
    document.querySelectorAll('[data-goto]').forEach(function (b) {
      b.addEventListener('click', function () {
        const t = b.getAttribute('data-goto');
        const btn = document.querySelector('.tab-btn[data-page="' + t + '"]');
        if (btn) btn.click();
      });
    });

    // ===== 页面标签切换 =====
    window.__ibankIsAdmin = false; // 角色守卫初值：未登录/学生均不可进后台
    const tabs = document.querySelectorAll('.tab-btn');
    const pages = document.querySelectorAll('.page');
    tabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const target = btn.getAttribute('data-page');
        if (target === 'p-admin' && !window.__ibankIsAdmin) return; // 守卫：仅教师/管理员可进后台统计
        tabs.forEach(function (b) { b.classList.remove('active'); });
        pages.forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        document.getElementById(target).classList.add('active');
        if (target === 'p-wrong' && window.renderWrong) window.renderWrong(); // 进入错题页即渲染/刷新账本（避免首次空白）
        if (target === 'p-profile' && window.__ibankProfileRefresh) window.__ibankProfileRefresh(); // 学情画像按真实数据实时重算
        // v58.8.2：取消 admin 页强制浅色豁免，后台跟随全局主题切换
        if (target === 'p-admin') { if (window.__ibankAdminLive) window.__ibankAdminLive.start(); }
        else { if (window.__ibankAdminLive) window.__ibankAdminLive.stop(); }
        if (window.__ibankTrack) window.__ibankTrack('module', { module: target });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    // ===== 分组下拉导航（点击开合，键盘/触屏可用） =====
    (function () {
      var groups = Array.prototype.slice.call(document.querySelectorAll('.nav-group'));
      function closeAll(except) {
        groups.forEach(function (g) {
          if (g === except) return;
          g.classList.remove('open');
          var t = g.querySelector('.nav-trigger');
          if (t) t.setAttribute('aria-expanded', 'false');
        });
      }
      groups.forEach(function (g) {
        var trigger = g.querySelector('.nav-trigger');
        if (!trigger) return;
        trigger.addEventListener('click', function (e) {
          e.stopPropagation();
          var willOpen = !g.classList.contains('open');
          closeAll(g);
          g.classList.toggle('open', willOpen);
          trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        });
        // 已有面板打开时，鼠标移到其他分组即刻切换
        g.addEventListener('mouseenter', function () {
          if (!document.querySelector('.nav-group.open')) return;
          closeAll(g);
          g.classList.add('open');
          trigger.setAttribute('aria-expanded', 'true');
        });
      });
      document.addEventListener('click', function () { closeAll(null); });
document.addEventListener('keydown', function (e) {
        // Shift+D：**一键清理**本机埋点并刷新看板
        // 为什么做成「直接清」而不是「打印」：清本机数据需开 DevTools 粘代码，
        // 非技术用户容易卡在这一步。改成一个键即可完成，不必碰控制台。
  if (e.key === 'D' && e.shiftKey) {
    e.preventDefault();
          if (typeof window.__ibankResetLocal === 'function') window.__ibankResetLocal(false);
    return;
        }
    if (e.key !== 'Escape') return;
        var open = document.querySelector('.nav-group.open');
     if (!open) return;
        closeAll(null);
      var t = open.querySelector('.nav-trigger');
  if (t) t.focus();
      });
      // 选中二级项后收起面板，并把一级项标为激活
      function syncGroupActive() {
        groups.forEach(function (g) {
          var on = !!g.querySelector('.tab-btn.active');
          var t = g.querySelector('.nav-trigger');
          if (t) t.classList.toggle('active', on);
        });
      }
      document.querySelectorAll('.tab-btn').forEach(function (b) {
        b.addEventListener('click', function () { closeAll(null); syncGroupActive(); });
      });
      syncGroupActive();
    })();

    // ===== 悬浮助手：开合聊天面板 =====
    const floatBtn = document.getElementById('float-btn');
    const chatPanel = document.getElementById('chat-panel');
    floatBtn.addEventListener('click', function () {
      chatPanel.classList.toggle('open');
    });

    // ===== 案例库 v43：章节分组 + 检索 + 手风琴 =====
    (function () {
      var root = document.getElementById('p-case');
      var bar = document.getElementById('case-filter');
      var qEl = document.getElementById('cl-q');
      var clr = document.getElementById('cl-q-clear');
      var emptyEl = document.getElementById('cl-empty');
      if (!root || !bar) return;

      var items = Array.prototype.slice.call(root.querySelectorAll('.case-item'));
      var groups = Array.prototype.slice.call(root.querySelectorAll('.case-chapter'));

      // 检索索引：标题 + 标签 + 一句话摘要 + 关键词 + 章节
      items.forEach(function (el) {
        var g = function (s) { var n = el.querySelector(s); return n ? n.textContent : ''; };
        el.setAttribute('data-search', (g('.case-title') + ' ' + g('.case-tag') + ' ' + g('.case-sub') + ' '
          + (el.getAttribute('data-search-key') || '') + ' ' + (el.getAttribute('data-chapter') || '')).toLowerCase());
      });

      // 章节 chips：按「第N章」的数值排序（修原 DOM 顺序造成的第3/7/5/1…乱序）
      var chs = [];
      items.forEach(function (el) {
        var ch = el.getAttribute('data-chapter');
        if (ch && chs.indexOf(ch) === -1) chs.push(ch);
      });
      var numOf = function (ch) { var n = parseInt(String(ch).replace(/[^0-9]/g, ''), 10); return isNaN(n) ? 99 : n; };
      chs.sort(function (a, b) { return numOf(a) - numOf(b); });
      var cntOf = function (ch) {
        var n = 0;
        items.forEach(function (el) { if (el.getAttribute('data-chapter') === ch) n++; });
        return n;
      };
      bar.innerHTML = '<button class="cf-btn active" type="button" data-ch="" aria-pressed="true">全部'
        + '<span class="cf-n">' + items.length + '</span></button>'
        + chs.map(function (ch) {
            return '<button class="cf-btn" type="button" data-ch="' + ch + '" aria-pressed="false">' + ch
              + '<span class="cf-n">' + cntOf(ch) + '</span></button>';
          }).join('');

      var state = { ch: '', q: '' };
      function apply() {
        var shown = 0;
        items.forEach(function (el) {
          var okCh = !state.ch || el.getAttribute('data-chapter') === state.ch;
          var okQ = !state.q || (el.getAttribute('data-search') || '').indexOf(state.q) !== -1;
          var vis = okCh && okQ;
          el.style.display = vis ? '' : 'none';
          if (vis) shown++;
        });
        groups.forEach(function (hd) {
          var ch = hd.getAttribute('data-ch'), any = false;
          items.forEach(function (el) {
            if (el.getAttribute('data-chapter') === ch && el.style.display !== 'none') any = true;
          });
          hd.style.display = any ? '' : 'none';
        });
        if (emptyEl) emptyEl.style.display = shown ? 'none' : 'block';
      }

      bar.addEventListener('click', function (e) {
        var b = e.target.closest('.cf-btn'); if (!b) return;
        state.ch = b.getAttribute('data-ch') || '';
        Array.prototype.forEach.call(bar.querySelectorAll('.cf-btn'), function (x) {
          var on = x === b;
          x.classList.toggle('active', on);
          x.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        apply();
      });

      if (qEl) {
        qEl.addEventListener('input', function () {
          state.q = qEl.value.trim().toLowerCase();
          apply();
        });
      }
      if (clr && qEl) {
        clr.addEventListener('click', function () {
          qEl.value = ''; state.q = ''; apply(); qEl.focus();
        });
      }

      // 手风琴（事件委托挂容器，避免重绘丢监听）
      root.addEventListener('click', function (e) {
        var h = e.target.closest('.case-head'); if (!h) return;
        var it = h.parentElement;
        var open = it.classList.toggle('open');
        h.setAttribute('aria-expanded', open ? 'true' : 'false');
      });

      // 章节页深链：先清空筛选与检索 → 展开 → 平滑定位（供 p-graph 章节页「案例拓展」调用）
      window.__ibankCaseShow = function (id) {
        state.ch = ''; state.q = '';
        if (qEl) qEl.value = '';
        Array.prototype.forEach.call(bar.querySelectorAll('.cf-btn'), function (x) {
          var on = !x.getAttribute('data-ch');
          x.classList.toggle('active', on);
          x.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        apply();
        var el = document.getElementById(id); if (!el) return;
        el.classList.add('open');
        var h = el.querySelector('.case-head'); if (h) h.setAttribute('aria-expanded', 'true');
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };

      // 默认展开第一个案例，保证首屏有内容
      if (items[0]) {
        items[0].classList.add('open');
        var h0 = items[0].querySelector('.case-head');
        if (h0) h0.setAttribute('aria-expanded', 'true');
      }
      apply();
    })();


    // ===== 宏观市场：情景推演 · 联动关系图 · 资产卡下钻详解（v38） =====
    const escM = function (t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    const MACRO = {
      usd: {
        ico: '$', name: '美元', tag: '储备货币', desc: '全球最主要的计价与结算货币', drivers: ['美联储政策', '通胀', '避险情绪'],
        overview: '美元（USD）是全球最主要的<strong>储备货币</strong>与计价结算货币，多数国际贸易与大宗商品（如石油、黄金）以美元计价结算。',
        driver: '美元汇率的核心驱动是<strong>美联储货币政策</strong>——加息通常吸引资本回流、推升美元，降息则相反；同时美国经济基本面、通胀与全球避险情绪也会影响美元强弱。',
        ib: '美元汇率影响跨境并购的收购成本、外币债券的发行成本与企业的<strong>汇兑风险管理</strong>，跨国投行业务需密切关注美元利率与汇率走势。',
        q: ['美联储加息为什么通常会推升美元？这对企业的外币债务成本意味着什么？', '美元走强或走弱，对黄金、美债价格分别有何影响？']
      },
      gold: {
        ico: '金', name: '黄金', tag: '避险资产', desc: '通胀与动荡期的价值贮藏工具', drivers: ['实际利率', '美元', '避险'],
        overview: '黄金是典型的<strong>避险资产</strong>与价值贮藏工具，在通胀上行或市场动荡时往往受到追捧。',
        driver: '金价常与美元、<strong>实际利率</strong>反向变动：美元走弱、实际利率（名义利率减通胀）下行时金价走强，通胀上行也推高金价。',
        ib: '黄金与股票、债券相关性较低，可起到<strong>分散投资组合风险</strong>的作用，是投行为客户做资产配置或大宗商品交易时的重要工具。',
        q: ['为什么说「实际利率」比名义利率更能解释金价？', '通胀上行时，黄金和股票通常各自如何反应？']
      },
      stock: {
        ico: '股', name: '股票', tag: '权益资产', desc: '企业的所有权凭证与剩余索取权', drivers: ['盈利预期', '流动性'],
        overview: '股票是公司发行的<strong>所有权凭证</strong>，代表股东对公司的剩余索取权。',
        driver: '股价长期由<strong>企业盈利与成长预期</strong>决定，短期受市场情绪、流动性与资金面影响。',
        ib: '在一级市场，投行帮助企业通过 IPO、增发等发行股票融资并负责定价承销；在二级市场，投资者自由买卖。投行连接了企业与资本市场。',
        q: ['一级市场与二级市场在功能上有什么区别？投行主要活跃在哪一级？', '为什么说「估值」是投行在股票发行中的核心工作？']
      },
      bond: {
        ico: '债', name: '美债', tag: '利率基准', desc: '全球无风险利率的定价锚', drivers: ['美联储政策', '通胀预期'],
        overview: '美国国债（美债）是全球金融市场的<strong>定价基准</strong>，其收益率常被视为「无风险利率」。',
        driver: '债券价格与收益率<strong>反向变动</strong>：收益率上行则债券价格下跌；美债收益率受美联储政策、通胀预期与经济前景影响。',
        ib: '美债收益率是估值中<strong>折现率（DCF）</strong>的重要参照，直接影响股票与债券估值水平，也是判断全球流动性松紧的关键指标。',
        q: ['为什么债券价格与收益率反向变动？', '美债收益率上行，对股票估值（尤其是成长股）通常意味着什么？']
      }
    };
    const MORDER = ['usd', 'gold', 'stock', 'bond'];
    // 五类宏观情景：每类资产的方向（up 走强 / down 走弱 / flat 双向·震荡）与原因
    const SCEN = [
      { id: 'hike', name: '美联储加息', note: '政策利率上行、美元流动性收紧：资金回流美元资产，同时抬高全球折现率，估值端普遍承压。',
        d: { usd: ['up', '走强：利差扩大吸引国际资本回流'], gold: ['down', '承压：实际利率上行抬高持金机会成本'], stock: ['down', '估值承压：折现率上行，成长股最敏感'], bond: ['down', '价格下跌：收益率与价格反向变动'] } },
      { id: 'cut', name: '美联储降息', note: '政策利率下行、流动性转松：折现率回落、美元走弱，利率敏感资产与权益估值修复。',
        d: { usd: ['down', '走弱：利差收窄，资本流出美元资产'], gold: ['up', '走强：实际利率下行，持金成本降低'], stock: ['up', '估值修复：折现率回落提振权益估值'], bond: ['up', '价格上涨：收益率下行推升债券价格'] } },
      { id: 'infl', name: '通胀超预期', note: '通胀高于目标：名义利率与实际利率相互博弈，实物资产与计价货币走势分化。',
        d: { usd: ['flat', '双向：央行被迫转鹰利好美元，但通胀侵蚀购买力'], gold: ['up', '走强：抗通胀属性凸显'], stock: ['flat', '分化：成本上升挤压毛利，估值同步承压'], bond: ['down', '价格下跌：通胀预期推高名义收益率'] } },
      { id: 'risk', name: '避险情绪升温', note: '地缘冲突或金融条件恶化：资金涌向安全资产，风险资产普遍承压，这是四类资产联动最典型的一幕。',
        d: { usd: ['up', '走强：美元作为首要避险与结算货币受益'], gold: ['up', '走强：传统避险资产需求上升'], stock: ['down', '下跌：风险偏好回落，资金流出权益'], bond: ['up', '价格上涨：避险资金买入压低收益率'] } },
      { id: 'reces', name: '衰退担忧加剧', note: '增长预期下修：盈利端受压、宽松预期升温，形成「股弱债强」的经典组合。',
        d: { usd: ['flat', '震荡：避险需求与宽松预期相互抵消'], gold: ['up', '走强：宽松预期叠加避险需求'], stock: ['down', '下跌：盈利预期下修是主要压制'], bond: ['up', '价格上涨：宽松预期带动收益率下行'] } }
    ];
    // 四类资产两两关系（定性，非统计相关系数）
    const LINKS = [
      { a: 'usd', b: 'gold', r: 'neg', sym: '−', lab: '反向', why: '美元与黄金多数时期反向：美元走弱、实际利率下行时金价往往走强。' },
      { a: 'usd', b: 'bond', r: 'pos', sym: '+', lab: '同向', why: '同源驱动：加息同时推升美元与美债收益率，二者常同向变动。' },
      { a: 'usd', b: 'stock', r: 'mix', sym: '±', lab: '双向', why: '双向作用：强美元吸引全球资金回流美股，却压制美国跨国企业的海外盈利。' },
      { a: 'gold', b: 'bond', r: 'neg', sym: '−', lab: '反向', why: '共同的锚是实际利率：美债实际收益率上行抬高持金成本，金价承压。' },
      { a: 'gold', b: 'stock', r: 'weak', sym: '~', lab: '弱相关', why: '相关性长期偏低，这正是黄金可用于分散组合风险的根本原因。' },
      { a: 'bond', b: 'stock', r: 'neg', sym: '−', lab: '反向', why: '估值传导：美债收益率是折现率基准，上行压制股票估值，成长股最敏感。' }
    ];
    const NODE = { usd: [280, 54], bond: [494, 170], stock: [280, 286], gold: [66, 170] };
    let macroAsset = 'usd', macroScen = 'hike';
    const scenOf = function () { for (let i = 0; i < SCEN.length; i++) { if (SCEN[i].id === macroScen) return SCEN[i]; } return SCEN[0]; };

    function renderScenBar() {
      const bar = document.getElementById('macro-scen'); if (!bar) return;
      bar.innerHTML = SCEN.map(function (s) {
        return '<button class="msc' + (s.id === macroScen ? ' active' : '') + '" data-scen="' + s.id + '">' + escM(s.name) + '</button>';
      }).join('');
      const note = document.getElementById('scen-note');
      if (note) note.innerHTML = '<span class="sn-tag">当前情景</span>' + escM(scenOf().note);
    }

    function renderCards() {
      const g = document.getElementById('macro-grid'); if (!g) return;
      const s = scenOf();
      g.innerHTML = MORDER.map(function (k) {
        const m = MACRO[k], dv = s.d[k] || ['flat', ''];
        const cls = dv[0] === 'up' ? 'up' : (dv[0] === 'down' ? 'down' : 'flat');
        const arrow = dv[0] === 'up' ? '↑' : (dv[0] === 'down' ? '↓' : '→');
        return '<button class="macro-card' + (k === macroAsset ? ' active' : '') + '" data-asset="' + k + '" aria-pressed="' + (k === macroAsset) + '">' +
          '<div class="mc-top"><span class="mc-ico">' + escM(m.ico) + '</span><span class="mc-name">' + escM(m.name) + '</span><span class="mc-tag">' + escM(m.tag) + '</span></div>' +
          '<div class="mc-desc">' + escM(m.desc) + '</div>' +
          '<div class="mc-mv ' + cls + '"><span class="mv-a">' + arrow + '</span><span class="mv-t">' + escM(dv[1]) + '</span></div>' +
          '<div class="mc-drivers">' + m.drivers.map(function (d) { return '<span>' + escM(d) + '</span>'; }).join('') + '</div>' +
          '<span class="mc-live">正在查看</span>' +
          '</button>';
      }).join('');
    }

    function renderDetail() {
      const el = document.getElementById('macro-detail'); if (!el) return;
      const m = MACRO[macroAsset]; if (!m) return;
      el.innerHTML =
        '<div class="md-head"><span class="md-h-ico">' + escM(m.ico) + '</span><div class="md-h-txt">' +
        '<div class="md-h-name">' + escM(m.name) + '<span class="md-h-tag">' + escM(m.tag) + '</span></div>' +
        '<div class="md-h-sub">' + escM(m.desc) + '</div></div></div>' +
        '<div class="md-row" style="--c:#4f46e5"><div class="md-k">概述</div><div class="md-v">' + m.overview + '</div></div>' +
        '<div class="md-row" style="--c:#0e7490"><div class="md-k">关键驱动</div><div class="md-v">' + m.driver + '</div></div>' +
        '<div class="md-row" style="--c:#8b5cf6"><div class="md-k">投行视角</div><div class="md-v">' + m.ib + '</div></div>' +
        '<div class="md-q"><div class="md-k">讨论题</div><ul>' +
        m.q.map(function (t, i) { return '<li><span class="n">' + (i + 1) + '</span><span class="t">' + t + '</span></li>'; }).join('') +
        '</ul></div>';
    }

    // 关系标签位置：黄金—美债为横向对角线，标签偏移避开纵向的美元—股票标签
    const labPos = function (l) {
      const p1 = NODE[l.a], p2 = NODE[l.b];
      const t = ((l.a === 'gold' && l.b === 'bond') || (l.a === 'bond' && l.b === 'gold')) ? 0.72 : 0.5;
      return [Math.round(p1[0] + (p2[0] - p1[0]) * t), Math.round(p1[1] + (p2[1] - p1[1]) * t)];
    };

    function renderRel() {
      const svg = document.getElementById('rel-svg'); if (!svg) return;
      let s = '';
      LINKS.forEach(function (l) {
        const p1 = NODE[l.a], p2 = NODE[l.b];
        const on = (l.a === macroAsset || l.b === macroAsset);
        s += '<line class="rl r-' + l.r + (on ? ' on' : '') + '" x1="' + p1[0] + '" y1="' + p1[1] + '" x2="' + p2[0] + '" y2="' + p2[1] + '" />';
      });
      LINKS.forEach(function (l) {
        const p = labPos(l);
        const on = (l.a === macroAsset || l.b === macroAsset);
        const w = l.lab.length * 12 + 18;
        s += '<g class="rl-g' + (on ? ' on' : '') + '">' +
          '<rect class="rl-bg r-' + l.r + (on ? ' on' : '') + '" rx="8" x="' + (p[0] - w / 2) + '" y="' + (p[1] - 11) + '" width="' + w + '" height="22" />' +
          '<text class="rl-lab" x="' + p[0] + '" y="' + (p[1] + 4) + '" text-anchor="middle">' + escM(l.sym + ' ' + l.lab) + '</text>' +
          '</g>';
      });
      MORDER.forEach(function (k) {
        const p = NODE[k], m = MACRO[k], on = (k === macroAsset);
        s += '<g class="rn-g' + (on ? ' on' : '') + '" data-asset="' + k + '">' +
          '<circle class="rn" cx="' + p[0] + '" cy="' + p[1] + '" r="36" />' +
          '<text class="rn-s" x="' + p[0] + '" y="' + (p[1] - 1) + '" text-anchor="middle">' + escM(m.ico) + '</text>' +
          '<text class="rn-n" x="' + p[0] + '" y="' + (p[1] + 19) + '" text-anchor="middle">' + escM(m.name) + '</text>' +
          '</g>';
      });
      svg.innerHTML = s;
    }

    function renderRelList() {
      const el = document.getElementById('rel-list'); if (!el) return;
      const rel = LINKS.filter(function (l) { return l.a === macroAsset || l.b === macroAsset; });
      el.innerHTML = rel.map(function (l) {
        const other = MACRO[l.a === macroAsset ? l.b : l.a];
        return '<div class="rel-item r-' + l.r + '"><div class="ri-pair">' + escM(MACRO[macroAsset].name) +
          '<span class="ri-sym">' + escM(l.sym) + '</span>' + escM(other.name) +
          '<span class="ri-lab">' + escM(l.lab) + '</span></div>' +
          '<div class="ri-why">' + escM(l.why) + '</div></div>';
      }).join('');
    }

    function selectAsset(k, scroll) {
      if (!MACRO[k]) return;
      macroAsset = k;
      renderCards(); renderDetail(); renderRel(); renderRelList();
      if (scroll) {
        const el = document.getElementById('macro-detail');
        if (el && el.scrollIntoView) { try { el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (err) { el.scrollIntoView(); } }
      }
    }

    (function bindMacro() {
      const g = document.getElementById('macro-grid'), bar = document.getElementById('macro-scen'), svg = document.getElementById('rel-svg');
      if (g) g.addEventListener('click', function (e) {
        const b = e.target.closest && e.target.closest('.macro-card');
        if (b) selectAsset(b.getAttribute('data-asset'), true);
      });
      if (bar) bar.addEventListener('click', function (e) {
        const b = e.target.closest && e.target.closest('.msc');
        if (b) { macroScen = b.getAttribute('data-scen'); renderScenBar(); renderCards(); }
      });
      if (svg) svg.addEventListener('click', function (e) {
        const n = e.target.closest && e.target.closest('.rn-g');
        if (n) selectAsset(n.getAttribute('data-asset'), true);
      });
    })();

    renderScenBar(); renderCards(); renderDetail(); renderRel(); renderRelList();

    // ===== 本地知识库问答 =====
    const KNOWLEDGE = [
      { keys: ['美元','汇率','美联储','加息','降息','美元指数','usd','汇兑'], ans: '美元是全球最主要的储备货币与计价结算货币。美联储货币政策（加息/降息）是影响美元汇率的核心因素：加息通常推升美元、吸引资本回流，降息则相反。对投行而言，美元汇率影响跨境并购成本、外币债券发行与企业的汇兑风险管理。' },
      { keys: ['黄金','金价','避险','gold'], ans: '黄金是典型的避险资产，常与美元、实际利率反向变动：美元走弱、实际利率下行时金价往往走强，通胀上行也会推高金价。从资产配置看，黄金与股债相关性较低，可起到分散风险的作用。' },
      { keys: ['股票','股价','a股','股市','权益','二级市场'], ans: '股票是公司的所有权凭证。一级市场上，投行帮助企业通过 IPO、增发等发行股票融资；二级市场上投资者自由买卖。股价长期由企业盈利与成长预期决定，短期受情绪与资金面影响。' },
      { keys: ['美债','美国国债','国债','收益率','十年期'], ans: '美国国债是全球金融市场的定价基准，其收益率常被视为「无风险利率」。债券价格与收益率反向变动：收益率上行则价格下跌。在估值中，美债收益率是折现率的重要参照，直接影响股票与债券的估值水平。' },
      { keys: ['熊猫债券','熊猫债'], ans: '熊猫债券（熊猫债）是指境外机构（外国政府、金融机构、跨国企业等）在中国境内债券市场发行的、以人民币计价的债券。它与"点心债"（在境外发行的人民币债券）相对应，是人民币国际化的重要体现。对投行而言，熊猫债承销涉及跨境发行主体的尽调、评级与人民币定价。' },
      { keys: ['可转债','可转换债券','可转换'], ans: '可转债（可转换债券）兼具"债性"和"股性"：持有人可在约定条件下把债券转换为发行公司的股票。对发行人而言票面利率较低、融资成本低；对投资者而言有保底收益又能分享股价上涨。投行常负责可转债的发行设计与定价。' },
      { keys: ['绿色债券','绿色债','绿色金融'], ans: '绿色债券是指募集资金专门投向绿色项目（清洁能源、节能环保、绿色交通等）的债券，需经第三方认证其"绿色"属性。近年来受政策鼓励，绿色债券在审核和融资成本上常有一定支持。' },
      { keys: ['资产证券化','abs','资产支持证券'], ans: '资产证券化（ABS）是把缺乏流动性但能产生稳定现金流的资产（如信贷、应收账款、租金）打包，转化为可在市场流通的证券。投行在其中的核心工作是资产筛选、结构设计（分层增信）与发行承销。' },
      { keys: ['信用评级','评级机构','aaa'], ans: '信用评级是评级机构对发行人偿债能力给出的等级评价（如 AAA、AA、BBB），直接影响债券的发行利率与投资者认可度。投行在债券发行前通常会协助发行人获得评级。' },
      { keys: ['承销','包销','代销','簿记建档'], ans: '承销是投行核心业务：帮助企业发行证券并销售给投资者。包销是投行全额买下再卖出、承担未售出风险、发行人募资确定；代销是只代理销售、卖不完退给发行人、风险小但募资不确定。二者风险分担与费率不同。' },
      { keys: ['ipo','上市','首次公开','新股','路演','询价'], ans: 'IPO（首次公开发行）是公司首次向公众发行股票。流程大致为：改制设立、上市辅导、申报受理、审核注册、发行定价、路演询价、上市交易。投行承担保荐与承销职能，负责尽调、辅导、估值定价与销售。' },
      { keys: ['并购','收购','重组','m&a','合并'], ans: '并购（M&A）是投行重要业务，包括兼并与收购。投行提供标的尽调、估值定价、交易结构设计（现金/换股/混合）、融资安排与反垄断合规等顾问服务。并购核心在于估值合理与结构设计，平衡买卖双方利益。' },
      { keys: ['估值','市盈率','市净率','市销率','折现','dcf','现金流','pe','pb','定价'], ans: '常见估值方法：①相对估值（市盈率 PE、市净率 PB、市销率 PS、EV/EBITDA），与可比公司比较；②绝对估值（现金流折现 DCF），预测未来现金流并折现。成长型公司常用 PE/PS，金融重资产类常用 PB，DCF 适用于现金流稳定的公司。' },
      { keys: ['尽职调查','尽调','dd','调查'], ans: '尽职调查是投行在交易前对目标公司进行的全面核查，涵盖业务、财务、法律三大方面。目的是缓解信息不对称、发现风险、为估值与交易条款提供依据，是 IPO、并购等投行业务的必备环节。' },
      { keys: ['投行','投资银行','保荐','券商'], ans: '投资银行主要开展证券承销保荐、并购重组顾问、财务顾问、资产证券化等业务，核心是「信息中介」与「定价中枢」。保荐人是企业上市的「第一责任人」，负责推荐上市并持续督导。' },
      { keys: ['案例','案例库','中芯国际','美的集团','阿里巴巴','五洋','欣泰','永煤','超日','宝万','库卡','沃尔沃','宁德时代','蚂蚁','抗疫特别国债'], dyn: true, ans: caseListAnswer },
      { keys: ['你好','您好','hi','hello','在吗','你是谁','谢谢','thanks'], ans: '你好，我是 iBank 助手 👋 可以问我美元、黄金、股票、美债等宏观话题，以及 IPO、并购、承销、估值、尽职调查等投行知识。' }
    ];
    const FALLBACK = '这个问题我暂时没收录。你可以换个关键词，或问我：美元 / 黄金 / 股票 / 美债 / IPO / 并购 / 承销 / 估值 / 尽职调查。也可以看「宏观市场」「案例库」和「股市模拟」页。';
    // 案例库清单在运行时从 DOM 实时读取（v43 教训：此前硬编码 4 个案例名，案例增删后会指向已删除的条目）
    function caseListAnswer() {
      try {
        var items = document.querySelectorAll('.case-item');
        if (!items || !items.length) return '本课程案例库正在整理中，可切换到「案例库」页查看。';
        var byCh = {}, order = [], n = 0;
        for (var i = 0; i < items.length; i++) {
          var ch = items[i].getAttribute('data-chapter') || '其他';
          var t = items[i].querySelector('.case-title');
          var title = t ? String(t.textContent || '').replace(/\s+/g, ' ').trim() : '';
          if (!title) continue;
          if (!byCh[ch]) { byCh[ch] = []; order.push(ch); }
          byCh[ch].push(title); n++;
        }
        var lines = [];
        for (var j = 0; j < order.length; j++) lines.push(order[j] + '：' + byCh[order[j]].join('、'));
        return '本课程案例库共收录 ' + n + ' 个真实案例，按教学章节组织 —— ' + lines.join('；') + '。可切换到「案例库」页按章节筛选、检索关键词并展开阅读完整内容（每例含背景、时间轴、关键数据、投行角色、争议难点、讨论题与资料来源）。';
      } catch (e) {
        return '本课程案例库按教学章节组织（第0章导论至第7章），覆盖 IPO、再融资、债券承销、资产证券化与并购重组等真实事件。可切换到「案例库」页查看完整内容。';
      }
    }
    function answer(q) {
      const s = q.toLowerCase();
      for (let i = 0; i < KNOWLEDGE.length; i++) {
        if (KNOWLEDGE[i].keys.some(function (k) { return s.indexOf(k.toLowerCase()) !== -1; })) {
          return typeof KNOWLEDGE[i].ans === 'function' ? KNOWLEDGE[i].ans() : KNOWLEDGE[i].ans;
        }
      }
      return FALLBACK;
    }

    // ===== 接入智谱大模型 =====
    const SCF_URL = 'https://1490473252-kur02r1gqf.ap-guangzhou.tencentscf.com';

    async function streamFromSCF(history, onDelta) {
      const resp = await fetch(SCF_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          const s = line.trim();
          if (!s.startsWith('data:')) continue;
          const ds = s.slice(5).trim();
          if (ds === '[DONE]') continue;
          try {
            const obj = JSON.parse(ds);
            if (obj.content) onDelta(obj.content);
            if (obj.error) onDelta('（出错：' + obj.error + '）');
          } catch (e) { /* 跳过非 JSON 行 */ }
        }
      }
    }

    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatBody = document.getElementById('chat-body');
    const floatHistory = [];
    function addMsg(text, who) {
      const div = document.createElement('div');
      div.className = 'msg ' + who;
      div.textContent = text;
      chatBody.appendChild(div);
      chatBody.scrollTop = chatBody.scrollHeight;
      return div;
    }
    chatForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const q = chatInput.value.trim();
      if (!q) return;
      addMsg(q, 'user');
      chatInput.value = '';
      floatHistory.push({ role: 'user', content: q });
      const replyDiv = addMsg('正在思考…', 'bot');
      let fullText = '';
      try {
        await streamFromSCF(floatHistory, function (delta) {
          fullText += delta;
          replyDiv.textContent = fullText;
          chatBody.scrollTop = chatBody.scrollHeight;
        });
        if (!fullText) { fullText = '（无返回内容）'; replyDiv.textContent = fullText; }
        floatHistory.push({ role: 'assistant', content: fullText });
      } catch (err) {
        const fb = answer(q);
        replyDiv.textContent = fb;
        floatHistory.push({ role: 'assistant', content: fb });
      }
    });


    // ===== 课程思政 v44：育人维度主从下钻 + 真实案例深链 + B 站视频 =====
    (function () {
      var THEMES = [{"id":"sz-t1","no":"01","icon":"🇨🇳","name":"金融报国","sub":"服务实体经济","claim":"金融是国民经济的血脉，为实体经济服务是金融的天职。把更多金融资源配置到经济社会发展的重点领域和薄弱环节，是投行专业能力的第一落点。","points":[{"k":"承销保荐","v":"把好资本市场入口关，让资本流向国家需要的产业方向"},{"k":"注册制与科创板","v":"以制度创新支持硬科技企业，助力高水平科技自立自强"},{"k":"融资方案设计","v":"为企业设计合理融资结构，服务战略性新兴产业成长"},{"k":"国债承销与财政协同","v":"承销国债支持积极财政政策，服务宏观大局"}],"cases":["case-07","case-05","case-13"],"videos":[{"title":"【中央财经大学】《投资学》【全200课】国家级精品课","up":"复利的奇迹ETF基金理财（搬运）","url":"https://www.bilibili.com/video/BV1qa411q7zV/","duration":"45小时6分","pages":200,"bv":"BV1qa411q7zV","note":"股份公司设立、发行方式与定价（国家级精品课）"},{"title":"【投行搬客03】创业板注册制改革十问十答","up":"投行搬客","duration":"10分11秒","note":"注册制改革如何改变投行的入口与价值","url":"https://www.bilibili.com/video/BV1uA411t7Ho/","bv":"BV1uA411t7Ho","pages":1},{"title":"创业板注册制改革，带来哪些机遇？","up":"东莞证券股份有限公司","duration":"2分25秒","note":"创业板注册制下的投行机遇（券商视角）","url":"https://www.bilibili.com/video/BV1rq4y1e7j8/","bv":"BV1rq4y1e7j8","pages":1}],"take":"投行的专业能力用在哪，资本就流向哪 —— 这是「金融报国」最具体的落点，也是本职工作的价值所在。"},{"id":"sz-t2","no":"02","icon":"⚖️","name":"职业操守","sub":"诚信合规","claim":"勤勉尽责、如实披露是中介机构的立身之本。守住证券法红线、防范内幕交易与利益冲突，不是外加的约束，而是这个职业得以存在的前提。","points":[{"k":"尽职调查","v":"勤勉尽责不是程序动作，而是专业判断与责任担当"},{"k":"信息披露","v":"真实、准确、完整，是资本市场信任的基石"},{"k":"看门人责任","v":"保荐与中介机构承担连带责任，失职必被追责"},{"k":"利益冲突管理","v":"信息隔离墙、限制清单 —— 把「不能做」变成制度约束"}],"cases":["case-01","case-02","case-03"],"videos":[{"title":"【耶鲁大学】公开课：金融市场","up":"迦南金融学院（搬运）","url":"https://www.bilibili.com/video/BV1mk2gB4EGL/","duration":"28小时29分","pages":25,"bv":"BV1mk2gB4EGL","note":"金融市场体系与投资银行的功能定位"},{"title":"【股市犯罪剖析】内幕交易、信息披露造假、操纵市场，一次讲透！","up":"周任轩Rex","duration":"16分53秒","note":"内幕交易、披露造假与操纵市场的法律后果","url":"https://www.bilibili.com/video/BV1UEnczQEFH/","bv":"BV1UEnczQEFH","pages":1},{"title":"证券法-强制信息披露","up":"压路机飚到160","duration":"14分18秒","note":"强制信息披露制度的法条与实务","url":"https://www.bilibili.com/video/BV1v64y1o7nv/","bv":"BV1v64y1o7nv","pages":1},{"title":"【无痛CPA】《经济法》第7章【证券法律制度】","up":"缝合自由账","duration":"1小时31分","note":"证券法律制度系统性讲解（含信息披露、收购、内幕交易）","url":"https://www.bilibili.com/video/BV1oaTJ6qEmr/","bv":"BV1oaTJ6qEmr","pages":1},{"title":"上市公司收购（3）：协议收购及信息披露—《证券法》—CPA经济法","up":"宗菲菲","duration":"23分24秒","note":"协议收购中的信息披露义务与流程","url":"https://www.bilibili.com/video/BV1C5eGeDEtE/","bv":"BV1C5eGeDEtE","pages":1}],"take":"案例里的判赔金额与罚单，其实就是「诚信」二字在市场上的定价。"},{"id":"sz-t3","no":"03","icon":"🛡️","name":"风险意识","sub":"金融安全","claim":"守住不发生系统性金融风险的底线。防范债务风险与高杠杆并购风险，是维护资本市场健康稳定运行的必修课。","points":[{"k":"杠杆与流动性","v":"高杠杆在顺境放大收益，在逆境吞噬本金"},{"k":"信用风险与违约","v":"打破刚兑之后，识别违约风险成为承销的核心能力"},{"k":"资产证券化分层","v":"通过优先 / 次级分层隔离与重新分配风险"},{"k":"并购杠杆与整合","v":"「蛇吞象」式跨境并购，融资结构往往决定成败"}],"cases":["case-04","case-15","case-06"],"videos":[{"title":"央视纪录片《华尔街 Wall Street》全10集 国语中字 720P高清","up":"杜滑滑（搬运）","url":"https://www.bilibili.com/video/BV1pW411R7pS/","duration":"7小时32分","pages":11,"bv":"BV1pW411R7pS","note":"现代金融体系的来龙去脉与风险演化"},{"title":"达利欧《债务危机》精读，三次危机复盘 + 双周期共振：1929/1990/2008 的教训，2027 我们该怎么办？","up":"阿基米的支点","duration":"39分37秒","note":"达利欧《债务危机》精读：1929/1990/2008 三次复盘","url":"https://www.bilibili.com/video/BV1aHE16hE8k/","bv":"BV1aHE16hE8k","pages":1},{"title":"【猩猩财经】硬核见证历史！深度复盘金融危机背后推手，看懂危机酝酿始末！","up":"猩猩财经","duration":"21分13秒","note":"金融危机背后的推手与危机酝酿过程","url":"https://www.bilibili.com/video/BV1vV411C7ag/","bv":"BV1vV411C7ag","pages":1}],"take":"风险不会被消灭，只会被转移 —— 投行的工作是把它配置给真正有能力承担的人。"},{"id":"sz-t4","no":"04","icon":"🌱","name":"社会责任","sub":"普惠与绿色金融","claim":"绿色债券、ESG 与普惠金融，是投行服务共同富裕与可持续发展的着力点；把资金引导到低碳、小微与民生领域，是这一代投行人的新考题。","points":[{"k":"绿色债券与 ESG","v":"以融资工具引导资金流向低碳与可持续项目"},{"k":"普惠金融","v":"让小微与消费金融获得可负担、可持续的融资渠道"},{"k":"住房金融与民生","v":"资产证券化盘活存量信贷，服务「住有所居」"},{"k":"利益分配与共同富裕","v":"中介取费与服务实体之间需要长期平衡"}],"cases":["case-17","case-16","case-13"],"videos":[{"title":"ESG前导课|关于ESG你所需要知道的","up":"李斯克聊ESG","duration":"48分54秒","note":"ESG 体系入门：概念、评级与投资应用","url":"https://www.bilibili.com/video/BV12M411U7ZM/","bv":"BV12M411U7ZM","pages":1},{"title":"教你学债券-绿色债&蓝色债&碳中和债介绍","up":"金融小沙弥","duration":"8分38秒","note":"绿色债、蓝色债与碳中和债的品种区分","url":"https://www.bilibili.com/video/BV1sQ4y1S71w/","bv":"BV1sQ4y1S71w","pages":1},{"title":"绿色债券那些事儿","up":"债之我见","duration":"3分26秒","note":"绿色债券的机制与定价逻辑","url":"https://www.bilibili.com/video/BV1Hy4y1V7T8/","bv":"BV1Hy4y1V7T8","pages":1},{"title":"聊聊普惠金融是啥","up":"万物皆显微","duration":"2分6秒","note":"普惠金融的定义、对象与政策目标","url":"https://www.bilibili.com/video/BV1Z7411R7Ef/","bv":"BV1Z7411R7Ef","pages":1}],"take":"把「赚钱的生意」做成「有意义的生意」，是这一代投行人要回答的考题。"}];

      // 案例标题 / 标签运行时从案例库 DOM 读取 —— 案例增删后自动同步，不会指向已删除条目
      function caseMeta(id) {
        var el = document.getElementById(id);
        if (!el || !el.classList.contains('case-item')) return null;
        var t = el.querySelector('.case-title'), g = el.querySelector('.case-tag');
        var title = t ? String(t.textContent || '').replace(/\s+/g, ' ').trim() : '';
        if (!title) return null;
        return { id: id, title: title, tag: g ? String(g.textContent || '').replace(/\s+/g, ' ').trim() : '' };
      }

      function renderDetail(id) {
        var t = THEMES.filter(function (x) { return x.id === id; })[0] || THEMES[0];
        var box = document.getElementById('sz-detail');
        if (!box) return;
        var head = '<div class="sz-dhead"><span class="di" aria-hidden="true">' + t.icon + '</span>' +
          '<span class="dt"><b>' + t.name + ' · ' + t.sub + '</b><span>育人维度 ' + t.no + ' / 04</span></span>' +
          '<span class="sz-now">正在查看</span></div>';
        var claim = '<div class="sz-claim"><b>价值内涵</b>' + t.claim + '</div>';

        var pts = '<div class="sz-lab"><span class="bar"></span>知识融入点</div><div class="sz-pts">' +
          t.points.map(function (p) { return '<div class="sz-pt"><b>' + p.k + '</b><span>' + p.v + '</span></div>'; }).join('') + '</div>';

        var missing = [];
        var caseCards = t.cases.map(function (cid) {
          var m = caseMeta(cid);
          if (!m) { missing.push(cid); return ''; }
          return '<button class="sz-case" type="button" data-szcase="' + m.id + '">' +
            '<span class="cn">' + m.title + '</span>' +
            (m.tag ? '<span class="ct">' + m.tag + '</span>' : '') +
            '<span class="cg">点击展开案例详情 ↗</span></button>';
        }).join('');
        var cases = '<div class="sz-lab"><span class="bar"></span>真实案例（点击跳转案例库）</div>' +
          (caseCards ? '<div class="sz-cases">' + caseCards + '</div>' : '<div class="sz-empty">本维度对应案例正在补充中。</div>');

        var vids = '<div class="sz-lab"><span class="bar"></span>视频学习（跳转哔哩哔哩）</div><div class="sz-vids vc-list">' +
          t.videos.map(function (v) {
            return '<a class="video-card" href="' + v.url + '" target="_blank" rel="noopener noreferrer">' +
              '<span class="vc-play" aria-hidden="true">▶</span><span class="vc-info">' +
              '<b class="vc-title">' + v.title + '</b>' +
              '<span class="vc-meta">' + v.up + (v.duration ? ' · ' + v.duration : '') +
              (v.pages > 1 ? ' · ' + v.pages + ' 分P' : '') + ' · B 站外链 ↗</span>' +
              (v.note ? '<span class="vc-note">' + v.note + '</span>' : '') +
              '</span></a>';
          }).join('') +
          '<div class="vc-foot">以上 ' + t.videos.length + ' 条链接已于 2026-10-07 逐条通过 B 站 view 接口核验（标题 / UP / 时长均取自接口返回）。UP 名以实际搬运号为准；如原视频下架，请更换卡片。</div></div>';

        var take = '<div class="sz-take"><b>育人落点</b>' + t.take + '</div>';

        box.innerHTML = head + claim + pts + cases + vids + take;
        if (missing.length && window.console) console.warn('[sz] 案例库中未找到：' + missing.join(', '));
      }

      function paint(id) {
        var btns = document.querySelectorAll('#sz-themes .sz-theme');
        for (var i = 0; i < btns.length; i++) {
          var on = btns[i].getAttribute('data-sz') === id;
          btns[i].classList[on ? 'add' : 'remove']('active');
          btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
        }
      }

      var themes = document.getElementById('sz-themes');
      if (themes) {
        themes.addEventListener('click', function (e) {
          var b = e.target.closest('.sz-theme'); if (!b) return;
          var id = b.getAttribute('data-sz');
          paint(id); renderDetail(id); b.focus();
        });
      }

      var detail = document.getElementById('sz-detail');
      if (detail) {
        detail.addEventListener('click', function (e) {
          var c = e.target.closest('[data-szcase]'); if (!c) return;
          var cid = c.getAttribute('data-szcase');
          var tab = document.querySelector('.tab-btn[data-page="p-case"]'); if (tab) tab.click();
          setTimeout(function () {
            if (window.__ibankCaseShow) { window.__ibankCaseShow(cid); return; }
            var el = document.getElementById(cid); if (el) { el.classList.add('open'); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
          }, 80);
        });
      }

      renderDetail('sz-t1');

      // 供验收使用（确定性触发）
      window.__ibankSzPick = function (id) { paint(id); renderDetail(id); };
    })();

    // ===== 股市模拟（v39：A股规则 + 持仓/流水 + 图表交互 + 基准对比）=====
    (function () {
      // 名称/代码/板块/交易规则参照真实 A 股；base 为接近真实量级的取整基准价（v41 校准，原先比亚迪 250 与真实价差 3 倍）
      // 价格本身由 genSeed / nextDay 随机生成，非真实行情
      // v59：股票池改为教材第 4 章的案例公司，五只票各挂一种再融资工具，招商银行作对照
      const STOCKS = [
        { code: '300750', name: '宁德时代', base: 290.0, board: '创业板', limit: 0.20, beta: 1.40, tool: '定向增发' },
        { code: '601012', name: '隆基股份', base: 18.5, board: '沪主板', limit: 0.10, beta: 1.15, tool: '配股 · 可转债' },
        { code: '300607', name: '拓斯达', base: 15.0, board: '创业板', limit: 0.20, beta: 1.30, tool: '公开增发' },
        { code: '000488', name: '晨鸣纸业', base: 4.20, board: '深主板', limit: 0.10, beta: 0.95, tool: '优先股' },
        { code: '002703', name: '浙江世宝', base: 11.0, board: '深主板', limit: 0.10, beta: 1.10, tool: '可交换债' },
        { code: '600036', name: '招商银行', base: 41.0, board: '沪主板', limit: 0.10, beta: 0.80, tool: '对照' }
      ];
      // v59：第 4 章再融资事件（依据教材第 131–163 页改编）。day 为 30 日窗口内第几个交易日；
      // shock 为当日冲击幅度；exDiv 表示配股除权按公式改写；convPct 表示转股价相对现价的溢价
      const EVENTS = [
        { day: 6, code: '300750', type: '定向增发', title: '定增预案公告', shock: 0.04,
          cells: [['募资规模', '450 亿'], ['增发对象', '35 名以内特定对象'], ['折价率', '20%'], ['锁定期', '6 / 18 个月']],
          note: '定增属非公开发行，向不超过 35 名特定对象折价发行，常与引入战投、收购资产等财务战略绑定；二级市场通常视为利好。' },
        { day: 10, code: '300607', type: '公开增发', title: '公开增发公告', shock: -0.05,
          cells: [['募资规模', '12 亿'], ['增发对象', '不特定对象'], ['原股东', '享有优先配售权'], ['教材结论', '股价往往下跌']],
          note: '公开增发稀释原股东权益、发行条件更高，教材结论是二级市场股价往往下跌——与宁德时代定增形成正反对照。' },
        { day: 12, code: '601012', type: '配股', title: '配股股权登记日', exDiv: true, ratio: 0.25, price: 0.75 },
        { day: 15, code: '000488', type: '优先股', title: '优先股发行', shock: 0.008,
          cells: [['发行规模', '20 亿'], ['股息率', '5.0% 固定'], ['表决权', '一般无'], ['清偿次序', '先于普通股']],
          note: '优先股兼具股债特征：股息固定、清偿先于普通股、一般不摊薄表决权，因此对普通股股价影响中性。' },
        { day: 18, code: '002703', type: '可交换债', title: '控股股东发行可交换债', shock: -0.03, convPct: 0.10,
          cells: [['发行主体', '上市公司股东'], ['总股本', '不变（不增发）'], ['实质', '溢价减持'], ['标的股票', '所持上市公司股份']],
          note: '可交换债用股东所持股票抵押发行，是现有股份转让，不增发股份；转股价高于市价，等于给股东一个溢价减持的通道。' },
        { day: 22, code: '601012', type: '可转债', title: '可转换公司债发行', shock: 0.02, convPct: 0.15,
          cells: [['发行规模', '30 亿'], ['期限', '5 年'], ['票面利率', '低于普通公司债'], ['转股价', '高于现价']],
          note: '可转债是债券加买入看涨期权：票面利率低于普通公司债，转股价高于现价，股价走高后发行人可用赎回条款促使转股。' },
        { day: 25, code: '601012', type: '条款提示', title: '股价跌破转股价 15%',
          cells: [['触发条款', '回售 / 下修'], ['发行人压力', '面临回售'], ['常见应对', '下修转股价']],
          note: '股价持续低于转股价一定幅度，持有人可按约定回售，发行人往往选择下修转股价以避免回售压力。' },
        // v61：day25 跌破后发行人下修转股价（降至原转股价 67%），强赎线随之下降，
        //      day26 股价才站得上去 —— 单日涨幅 3%，不虚构暴涨、不突破涨跌停。
        //      真实机制：下修 → 强赎门槛同步下移 → 更容易触发强赎 → 债务转权益。
        { day: 26, code: '601012', type: '强赎触发', title: '下修后股价站上强赎线', shock: 0.03, revise: 0.67,
          cells: [['当期转股价', '下修至原转股价 67%'], ['强赎线', '当期转股价 × 130%'], ['持有人反应', '转股或卖出'], ['不操作后果', '按赎回价被赎回']],
          note: '下修把强赎门槛一起拉低：转股价降到原值 67%，强赎线随之降到 1.3 × 0.67，股价稍有反弹就站了上去。发行人用「下修 + 强赎」的组合把债转成股，债务彻底转为权益。' },
        { day: 28, code: '300750', type: '风险提示', title: '股价跌破定增发行价',
          cells: [['后果', '新发股份难以售出'], ['承担方', '主承销商'], ['对应教材', '4.5 再融资的承销风险']],
          note: '再融资定价与现行股价存在比照关系，一旦破发，新发股份难以售出，未售出部分由主承销商包销——这就是承销风险。' }
      ];
      const DAYS = 30, START_CASH = 1000000, IDX_BASE = 3800, KEY = 'ibank_sim';
      const DEFAULT_SEED = 20261023;   // v59：默认行情种子（可复现）
      const FEE = { comm: 0.00025, commMin: 5, stamp: 0.0005, transfer: 0.00001 };
      const CW = 560, CH = 240, PL = 50, PR = 56, PT = 16, PB = 30;
      const X = function (i) { return PL + i / (DAYS - 1) * (CW - PL - PR); };
      const nameOf = function (c) { const s = STOCKS.filter(function (x) { return x.code === c; })[0]; return s ? s.name : c; };
      const stockOf = function (c) { const s = STOCKS.filter(function (x) { return x.code === c; })[0]; return s || STOCKS[0]; };
      const fmt2 = function (v) { return v.toFixed(2); };
      const fmtW = function (v) { return (v / 10000).toFixed(2); };
      const money = function (v) { return '¥' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
      const isoOf = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
      const mdOf = function (s) { return String(s).slice(5); };
      const toast = function (m) { try { if (typeof ibankToast === 'function') ibankToast(m); } catch (e) {} };

      // ===== v42 A：确定性随机数 mulberry32（与站内 IPO 模块 3852 行同源，保证两个数据模拟模块口径一致）=====
      function mulberry32(a) {
        return function () {
          a |= 0; a = a + 0x6D2B79F5 | 0;
          let t = Math.imul(a ^ a >>> 15, 1 | a);
          t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
          return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
      }
      // 任意输入映射为 32 位整数种子：支持纯数字（20261007）或文本种子（如「期中考」）
      function seedOf(v) {
        const s = String(v == null ? '' : v).trim();
        if (!s) return 1;
        if (/^\d+$/.test(s)) { const n = parseInt(s, 10) % 2147483647; return n === 0 ? 1 : n; }
        let h = 2166136261;
        for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
        h = h >>> 0; return h === 0 ? 1 : h;
      }

      // v42 C：行情情景（确定性市况）。mu=市场日均漂移，sg=市场日波动，mr=均值回复强度
      const MODES = [
        { id: 'rand',  name: '随机行情', mu: 0.0002, sg: 0.0080, mr: 0,     desc: '无主导方向的随机走势，用作对照基准' },
        { id: 'bull',  name: '单边上涨', mu: 0.0060, sg: 0.0040, mr: 0,     desc: '市场日均 +0.6% 的低波动慢牛：趋势市里，拿得住往往比择时更重要' },
        { id: 'bear',  name: '单边下跌', mu: -0.0060, sg: 0.0040, mr: 0,    desc: '市场日均 -0.6% 的低波动阴跌：看不同策略能否控制回撤' },
        { id: 'range', name: '宽幅震荡', mu: 0,      sg: 0.0160, mr: 0.020, desc: '零漂移 + 波动翻倍 + 均值回复：来回反复的震荡最容易放大交易成本' },
        { id: 'shock', name: '波动骤升', mu: 0.0005, sg: 0.0060, mr: 0,     desc: '第 12 个交易日起波动放大 3 倍：检验极端行情下的表现', shockAt: 12, shockMul: 3 },
        { id: 'gap',   name: '跳空缺口', mu: 0.0003, sg: 0.0070, mr: 0.010, desc: '第 16 个交易日一次性跳空 -7%：跳空无法在盘中从容止损', gapAt: 16, gap: -0.07 }
      ];
      const modeOf = function (id) { const m = MODES.filter(function (x) { return x.id === id; })[0]; return m || MODES[0]; };

      // 市场因子序列：完全由 (seed, mode) 决定 —— 同参数必得同一条行情，这是可复现的基础
      function marketSeq(seed, mode, n, tag) {
        const md = modeOf(mode);
        const rnd = mulberry32(seedOf(seed) + (tag || 0) * 7919 + 11);
        const out = []; let dev = 0;
        for (let i = 0; i < n; i++) {
          let sg = md.sg;
          if (md.shockAt != null && i >= md.shockAt) sg *= md.shockMul;
          let m = md.mu + (rnd() - 0.5) * 2 * sg;
          if (md.gapAt != null && i === md.gapAt) m += md.gap;
          if (md.mr) { dev += m; m -= md.mr * dev; }
          out.push(m);
        }
        return out;
      }

      // 生成一条完整行情：个股收益 = β × 市场收益 + 特异性收益（便于演示 β 与分散化）
      function genPath(seed, mode) {
        const ms = marketSeq(seed, mode, DAYS - 1, 0);
        const rnd = mulberry32(seedOf(seed) * 31 + 7);
        const idx = [IDX_BASE * (0.98 + rnd() * 0.04)];
        for (let i = 0; i < DAYS - 1; i++) idx.push(Math.max(800, idx[i] * (1 + ms[i])));
        const hist = {};
        STOCKS.forEach(function (s) {
          const a = [s.base * (0.93 + rnd() * 0.12)];
          for (let i = 0; i < DAYS - 1; i++) {
            let p = a[i] * (1 + s.beta * ms[i] + (rnd() - 0.5) * 0.03);
            p = Math.min(a[i] * (1 + s.limit), Math.max(a[i] * (1 - s.limit), p));
            a.push(Math.max(0.5, p));
          }
          hist[s.code] = a;
        });
        applyEvents(hist);
        return { idx: idx, hist: hist };
      }

      // v59：把融资事件注入行情。冲击类改写当日并按同比例平移其后走势（缺口连续、不出现跳回）；
      // 条款类用斜坡逼近目标价，避免单日涨跌幅突破涨跌停
      function applyEvents(hist) {
        const issueOf = {};
        const ramp = function (a, i0, i1, target) {
          const k = target / a[i1];
          for (let j = i0 + 1; j <= i1; j++) a[j] *= 1 + (k - 1) * (j - i0) / (i1 - i0);
          for (let j = i1 + 1; j < DAYS; j++) a[j] *= k;   // 之后的走势按终点比例平移，避免事件日之后跳回
        };
        EVENTS.forEach(function (ev) {
          const a = hist[ev.code]; if (!a) return;
          const i = ev.day - 1; if (i < 1 || i >= DAYS) return;
          const prev = a[i - 1];
          // 事件当日的涨跌幅由事件本身决定（除权按公式、其余按教材结论），不叠加当日市场因子
          let t = null;
          if (ev.exDiv) t = prev * (1 + ev.price * ev.ratio) / (1 + ev.ratio);
          else if (ev.shock) t = prev * (1 + ev.shock);
          if (t !== null) {
            const k = t / a[i];
            for (let j = i; j < DAYS; j++) a[j] *= k;
          }
          if (ev.type === '定向增发') issueOf[ev.code] = prev * 0.80;
          // 破发：从定增日斜坡跌到发行价下方，保证「跌破」是真跌下去的，不是贴上去的标签
          if (ev.type === '风险提示' && issueOf[ev.code]) {
            const i0 = (EVENTS.filter(function (x) { return x.code === ev.code && x.type === '定向增发'; })[0] || {}).day - 1 || 5;
            ramp(a, i0, i, issueOf[ev.code] * 0.985);
          }
          // 下修：从可转债发行日斜坡跌到转股价下方 15%
          if (ev.type === '条款提示' && ev.day > 1) {
            const ce = EVENTS.filter(function (x) { return x.code === ev.code && x.type === '可转债'; })[0];
            if (ce) ramp(a, ce.day - 1, i, a[ce.day - 2] * (1 + ce.convPct) * 0.85);
          }
        });
      }
      function dateSeq() {
        const ds = [], d0 = new Date(2026, 8, 1), d = new Date(d0);
        while (ds.length < DAYS) { if (d.getDay() !== 0 && d.getDay() !== 6) ds.push(isoOf(d)); d.setDate(d.getDate() + 1); }
        return ds;
      }
      function fresh(seed, mode) {
        // v59：未指定种子时用固定默认值，保证每次打开行情一致（拍照、课堂讲评、材料里的数字都对得上）；
        // 想要换一组仍可点「随机换一组」
        const sd = seedOf(seed == null ? DEFAULT_SEED : seed);
        const md = mode || 'rand';
        const g = genPath(sd, md);
        return { cash: START_CASH, holdings: {}, trades: [], day: DAYS, rule: true, selected: STOCKS[0].code,
          dates: dateSeq(), idx: g.idx, idx0: g.idx[DAYS - 1], hist: g.hist,
          seed: sd, mode: md, step: 0 };
      }

      let S = null;
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const o = JSON.parse(raw);
          let good = !!(o && o.hist && o.holdings && o.dates && o.idx && o.dates.length === DAYS && o.idx.length === DAYS);
          if (good) STOCKS.forEach(function (s) { if (!Array.isArray(o.hist[s.code]) || o.hist[s.code].length !== DAYS) good = false; });
          if (good) S = o;
        }
      } catch (e) { S = null; }
      if (!S) S = fresh();
      // 字段迁移：v41 及更早的存档没有 seed / mode / step
      if (S.seed == null) S.seed = seedOf(20261007);
      if (!S.mode) S.mode = 'rand';
      if (S.step == null) S.step = 0;
      // v59：股票池已换，旧存档里选中的代码可能不存在，回落到第一只
      if (!STOCKS.some(function (s) { return s.code === S.selected; })) S.selected = STOCKS[0].code;

      const save = function () { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
      const px = function (c) { return S.hist[c][DAYS - 1]; };
      const prevPx = function (c) { return S.hist[c][DAYS - 2]; };
      const chg = function (c) { return (px(c) / prevPx(c) - 1) * 100; };
      const mv = function () { let t = 0; Object.keys(S.holdings).forEach(function (c) { t += S.holdings[c].qty * px(c); }); return t; };
      const total = function () { return S.cash + mv(); };
      const pnlPct = function () { return (total() / START_CASH - 1) * 100; };
      const benchPct = function () { return (S.idx[DAYS - 1] / S.idx0 - 1) * 100; };
      function feeOf(amount, isSell) {
        if (!S.rule) return 0;
        let f = Math.max(amount * FEE.comm, FEE.commMin) + amount * FEE.transfer;
        if (isSell) f += amount * FEE.stamp;
        return f;
      }
      const qtyOf = function (code) { const e = document.getElementById('q-' + code); const n = parseInt(e && e.value, 10); return isNaN(n) ? 0 : n; };

      function renderStats() {
        const t = total(), p = pnlPct(), b = benchPct(), a = p - b;
        setHtml('sim-cash', fmtW(S.cash) + '<span class="sk-u">万</span>', null);
        setHtml('sim-mv', fmtW(mv()) + '<span class="sk-u">万</span>', null);
        setHtml('sim-total', fmtW(t) + '<span class="sk-u">万</span>', null);
        setHtml('sim-pnl', (p >= 0 ? '+' : '') + fmt2(p) + '<span class="sk-u">%</span>', p);
        setHtml('sim-bench', (b >= 0 ? '+' : '') + fmt2(b) + '<span class="sk-u">%</span>', b);
        setHtml('sim-alpha', (a >= 0 ? '+' : '') + fmt2(a) + '<span class="sk-u">%</span>', a);
        const de = document.getElementById('sim-date'); if (de) de.textContent = '第 ' + S.day + ' 交易日';
        const dy = document.getElementById('sim-day'); if (dy) dy.textContent = '模拟日期 ' + mdOf(S.dates[0]) + ' → ' + mdOf(S.dates[DAYS - 1]) + '（虚构）';
      }

      function renderStocks() {
        const box = document.getElementById('sim-stocks'); if (!box) return;
        const keep = {};
        Array.prototype.forEach.call(box.querySelectorAll('.sl-qty'), function (i) { keep[i.id] = i.value; });
        box.innerHTML = STOCKS.map(function (s) {
          const c = chg(s.code), cls = c > 0 ? 'up' : (c < 0 ? 'down' : 'flat');
          const hold = S.holdings[s.code], on = s.code === S.selected;
          return '<div class="sl-row' + (on ? ' active' : '') + '" data-code="' + s.code + '">' +
            '<button class="sl-name" data-code="' + s.code + '"' + (on ? ' aria-current="true"' : '') + ' aria-label="查看 ' + s.name + ' 走势">' +
              '<span class="sl-n">' + s.name + '<span class="sl-tool">' + (s.tool || '对照') + '</span><span class="sl-live">正在查看</span></span>' +
              '<span class="sl-c">' + s.code + ' · ' + s.board + ' · 涨跌停 ±' + Math.round(s.limit * 100) + '%' + (hold ? ' · 持有 ' + hold.qty + ' 股' : '') + '</span>' +
            '</button>' +
            '<div class="sl-price"><span class="sl-p ' + cls + '">' + fmt2(px(s.code)) + '</span>' +
              '<span class="sl-chg ' + cls + '">' + (c >= 0 ? '+' : '') + fmt2(c) + '%</span>' +
              '<span class="sl-sim">模拟价</span></div>' +
            '<div class="sl-act">' +
              '<input class="sl-qty" id="q-' + s.code + '" type="number" value="100" min="100" step="100" aria-label="' + s.name + '交易数量（股）" />' +
              '<button class="sl-buy" data-code="' + s.code + '" aria-label="买入 ' + s.name + '">买入</button>' +
              '<button class="sl-sell" data-code="' + s.code + '" aria-label="卖出 ' + s.name + '">卖出</button>' +
            '</div></div>';
        }).join('');
        Object.keys(keep).forEach(function (id) { const e = document.getElementById(id); if (e) e.value = keep[id]; });
      }

      // 选中态同步：只切 class 不重建 DOM（避免打断数量输入框），保证「图表显示的是哪只」一眼可见
      function paintActive() {
        Array.prototype.forEach.call(document.querySelectorAll('#sim-stocks .sl-row'), function (r) {
          const on = r.getAttribute('data-code') === S.selected;
          r.classList.toggle('active', on);
          const n = r.querySelector('.sl-name');
          if (n) { if (on) n.setAttribute('aria-current', 'true'); else n.removeAttribute('aria-current'); }
        });
      }

      // 切换走势图标的（点名称 / 买入 / 卖出 都走这里，做到「操作谁就看谁」）
      function selectStock(code) {
        if (!code || !stockOf(code)) return;
        S.selected = code; save(); paintActive(); renderChart(); renderEventCard();
      }

      function ma5(a) {
        const out = [];
        for (let i = 0; i < a.length; i++) {
          if (i < 4) { out.push(null); continue; }
          let s = 0; for (let k = i - 4; k <= i; k++) s += a[k];
          out.push(s / 5);
        }
        return out;
      }

      // v61：可转债/可交换债的参考线口径 —— 当期转股价（已下修则取下修后）+ 强赎线（×130%）。
      //      K 线纵轴范围、K 线画线、事件卡三处共用这一份，避免各算一遍数字对不上。
      function convLinesOf(code, a) {
        const ce = EVENTS.filter(function (x) {
          return x.code === code && (x.type === '可转债' || x.type === '可交换债');
        })[0];
        if (!ce || !ce.convPct) return null;
        const cp0 = a[ce.day - 2] * (1 + ce.convPct);          // 发行时设定的转股价
        const isConv = ce.type === '可转债';
        const rv = isConv ? EVENTS.filter(function (x) {
          return x.code === code && x.type === '强赎触发' && x.revise;
        })[0] : null;
        const cp = rv ? cp0 * rv.revise : cp0;                  // 下修后的当期转股价
        return { cp0: cp0, cp: cp, call: cp * 1.3, revised: !!rv, isConv: isConv };
      }

      // v59：纵轴范围。若该股有转债或可交换债，把转股价与强赎线一并纳入，保证参考线落在可见区
      function rangeOf(a) {
        let mn = Math.min.apply(null, a), mx = Math.max.apply(null, a);
        if (a === S.hist[S.selected]) {
          const cl = convLinesOf(S.selected, a);
          if (cl) {
            const ys = cl.isConv ? [cl.cp, cl.call] : [cl.cp];
            ys.forEach(function (v) { if (v > mx) mx = v; if (v < mn) mn = v; });
          }
        }
        const pad = (mx - mn) * 0.14 || 1;
        return { mn: mn - pad, mx: mx + pad };
      }

      let curG = null;
      function renderChart() {
        const s = stockOf(S.selected);
        const tt = document.getElementById('sim-chart-title');
        if (tt) tt.textContent = s.name + ' ' + s.code + ' · ' + s.board + ' · 近 ' + DAYS + ' 个交易日';
        const svg = document.getElementById('sim-chart'); if (!svg) return;
        const a = S.hist[S.selected];
        const rg = rangeOf(a), mn = rg.mn, mx = rg.mx;
        const Y = function (v) { return PT + (1 - (v - mn) / (mx - mn)) * (CH - PT - PB); };
        let g = '';
        for (let k = 0; k <= 3; k++) {
          const v = mn + (mx - mn) * k / 3, y = Y(v);
          g += '<line x1="' + PL + '" y1="' + y.toFixed(1) + '" x2="' + (CW - PR) + '" y2="' + y.toFixed(1) + '" stroke="var(--chart-axis)" stroke-width="0.6" stroke-dasharray="3 3"/>' +
               '<text x="' + (PL - 6) + '" y="' + (y + 3.5).toFixed(1) + '" fill="var(--chart-label)" font-size="10.5" text-anchor="end">' + v.toFixed(1) + '</text>';
        }
        for (let i = 0; i < DAYS; i += 6) g += '<text x="' + X(i).toFixed(1) + '" y="' + (CH - PB + 16) + '" fill="var(--chart-label)" font-size="10.5" text-anchor="middle">' + mdOf(S.dates[i]) + '</text>';
        g += '<text x="' + X(DAYS - 1).toFixed(1) + '" y="' + (CH - PB + 16) + '" fill="var(--chart-label)" font-size="10.5" text-anchor="middle">' + mdOf(S.dates[DAYS - 1]) + '</text>';
        const up = a[DAYS - 1] >= a[0], col = up ? 'var(--up)' : 'var(--down)';
        g += '<polyline points="' + a.map(function (v, i) { return X(i).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
        const l5 = ma5(a).map(function (v, i) { return v === null ? '' : X(i).toFixed(1) + ',' + Y(v).toFixed(1); }).filter(Boolean).join(' ');
        g += '<polyline points="' + l5 + '" fill="none" stroke="var(--accent2)" stroke-width="1.4" stroke-dasharray="5 4" stroke-linejoin="round"/>';
        // v59：融资事件标记（竖虚线 + 圆点 + 类型标签）
        // v61：标签按横向间距自动分层 —— day25/day26 只差 1 天，原来的 ei%2 会撞在一起
        let ei = 0, lastX = -999, row = 0;
        EVENTS.filter(function (e) { return e.code === S.selected; }).forEach(function (ev) {
          const i = ev.day - 1; if (i < 0 || i >= DAYS) return;
          const x = X(i), y = Y(a[i]);
          g += '<line x1="' + x.toFixed(1) + '" y1="' + PT + '" x2="' + x.toFixed(1) + '" y2="' + (CH - PB) + '" stroke="var(--accent)" stroke-width="1" stroke-dasharray="2 3" opacity="0.5"/>';
          g += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.4" fill="var(--accent-solid)" stroke="var(--panel-solid)" stroke-width="1.4"/>';
          const tx = x + 4;
          row = (tx - lastX < 46) ? (row + 1) % 3 : 0;
          lastX = tx;
          g += '<text x="' + tx.toFixed(1) + '" y="' + (PT + 11 + row * 12) + '" fill="var(--accent)" font-size="9.5" font-weight="600">' + ev.type + '</text>';
          ei++;
        });
        // v61：转股价参考线（可转债 / 可交换债）+ 强赎线（可转债，×130%），两条线各带标签
        const cl = convLinesOf(S.selected, a);
        if (cl) {
          const cpY = Y(cl.cp);
          if (cpY > PT && cpY < CH - PB) {
            g += '<line x1="' + PL + '" y1="' + cpY.toFixed(1) + '" x2="' + (CW - PR) + '" y2="' + cpY.toFixed(1) + '" stroke="var(--down)" stroke-width="1" stroke-dasharray="6 4" opacity="0.75"/>';
            g += '<text x="' + (CW - PR) + '" y="' + (cpY - 5).toFixed(1) + '" fill="var(--down)" font-size="9.5" text-anchor="end">转股价 ' + fmt2(cl.cp) + (cl.revised ? '（下修后）' : '') + '</text>';
          }
          if (cl.isConv) {
            const callY = Y(cl.call);
            if (callY > PT && callY < CH - PB) {
              // 强赎线紧贴股价时，标签放右侧会压住末尾价格与刻度，改到左端起始位置
              g += '<line x1="' + PL + '" y1="' + callY.toFixed(1) + '" x2="' + (CW - PR) + '" y2="' + callY.toFixed(1) + '" stroke="var(--up)" stroke-width="1.1" stroke-dasharray="3 3" opacity="0.85"/>';
              g += '<text x="' + (PL + 4) + '" y="' + (callY + 11).toFixed(1) + '" fill="var(--up)" font-size="9.5" text-anchor="start">强赎线 ' + fmt2(cl.call) + '</text>';
            }
          }
        }
        g += '<text x="' + (CW - PR + 8) + '" y="' + (Y(a[DAYS - 1]) + 4).toFixed(1) + '" fill="' + col + '" font-size="12.5" font-weight="700">' + fmt2(a[DAYS - 1]) + '</text>';
        g += '<g id="sim-cursor" style="display:none">' +
          '<line id="sc-x" x1="0" y1="' + PT + '" x2="0" y2="' + (CH - PB) + '" stroke="var(--accent)" stroke-width="1" stroke-dasharray="4 3"/>' +
          '<circle id="sc-dot" cx="0" cy="0" r="4" fill="var(--accent-solid)" stroke="var(--panel-solid)" stroke-width="1.5"/>' +
          '<rect id="sc-bg" x="0" y="0" width="116" height="42" rx="7" fill="var(--panel-solid)" stroke="var(--panel-border)" stroke-width="1"/>' +
          '<text id="sc-t1" x="0" y="0" fill="var(--text)" font-size="11.5"></text>' +
          '<text id="sc-t2" x="0" y="0" fill="var(--muted)" font-size="11.5"></text>' +
        '</g>';
        svg.innerHTML = g;
        curG = svg.querySelector('#sim-cursor');
      }

      function showCursor(i) {
        if (!curG) return;
        const a = S.hist[S.selected], x = X(i), y = PT + 0;
        const yy = (function () {
          const rg = rangeOf(a);
          return PT + (1 - (a[i] - rg.mn) / (rg.mx - rg.mn)) * (CH - PT - PB);
        })();
        curG.style.display = '';
        const lx = curG.querySelector('#sc-x'); lx.setAttribute('x1', x); lx.setAttribute('x2', x);
        const dot = curG.querySelector('#sc-dot'); dot.setAttribute('cx', x); dot.setAttribute('cy', yy);
        const tw = 116, th = 42;
        let bx = x + 12; if (bx + tw > CW - 2) bx = x - 12 - tw;
        if (bx < 2) bx = 2;
        let by = yy - th - 12; if (by < 2) by = yy + 14;
        curG.querySelector('#sc-bg').setAttribute('x', bx);
        curG.querySelector('#sc-bg').setAttribute('y', by);
        const t1 = curG.querySelector('#sc-t1'); t1.setAttribute('x', bx + 10); t1.setAttribute('y', by + 17);
        t1.textContent = S.dates[i] + '　' + fmt2(a[i]);
        const pc = i > 0 ? (a[i] / a[i - 1] - 1) * 100 : 0;
        const t2 = curG.querySelector('#sc-t2'); t2.setAttribute('x', bx + 10); t2.setAttribute('y', by + 33);
        t2.textContent = i > 0 ? '较前日 ' + (pc >= 0 ? '+' : '') + fmt2(pc) + '%' : '区间首日';
        t2.setAttribute('fill', i > 0 ? (pc >= 0 ? 'var(--up)' : 'var(--down)') : 'var(--muted)');
      }
      const hideCursor = function () { if (curG) curG.style.display = 'none'; };

      function renderHoldings() {
        const box = document.getElementById('sim-holdings'); if (!box) return;
        const note = document.getElementById('sim-hold-note');
        const codes = Object.keys(S.holdings);
        if (!codes.length) {
          box.innerHTML = '<div class="hd-empty">暂无持仓。在上方行情列表中输入数量后点击「买入」。</div>';
          if (note) note.textContent = '';
          return;
        }
        let tc = 0, tv = 0;
        codes.forEach(function (c) { tc += S.holdings[c].cost; tv += S.holdings[c].qty * px(c); });
        if (note) note.textContent = '合计成本 ' + money(tc) + ' · 合计市值 ' + money(tv);
        box.innerHTML = '<div class="hd-head"><span>股票</span><span>持股</span><span>成本价</span><span>现价</span><span>市值</span><span>浮动盈亏</span></div>' +
          codes.map(function (c) {
            const h = S.holdings[c], p = px(c), val = h.qty * p, fl = val - h.cost, r = h.cost ? fl / h.cost * 100 : 0;
            const cls = fl > 0 ? 'up' : (fl < 0 ? 'down' : 'flat');
            return '<div class="hd-row">' +
              '<span class="hd-name" data-l="股票">' + nameOf(c) + '</span>' +
              '<span data-l="持股">' + h.qty + ' 股' + (h.locked ? ' · 锁定 ' + h.locked : '') + '</span>' +
              '<span data-l="成本价">' + fmt2(h.cost / h.qty) + '</span>' +
              '<span data-l="现价">' + fmt2(p) + '</span>' +
              '<span data-l="市值">' + fmtW(val) + ' 万</span>' +
              '<span class="' + cls + '" data-l="浮动盈亏">' + (fl >= 0 ? '+' : '') + fmt2(fl) + '（' + (r >= 0 ? '+' : '') + fmt2(r) + '%）</span>' +
            '</div>';
          }).join('');
      }

      function renderFlow() {
        const box = document.getElementById('sim-flow'); if (!box) return;
        const note = document.getElementById('sim-flow-note');
        if (note) note.textContent = S.rule ? '含佣金（万2.5·最低5元）、印花税（卖出 0.05%）、过户费（0.001%）' : '当前为简化模式，不计交易费用';
        if (!S.trades.length) { box.className = ''; box.innerHTML = '<div class="fl-empty">暂无成交记录。</div>'; return; }
        box.className = 'sim-scroll';
        box.innerHTML = S.trades.slice(0, 40).map(function (t) {
          const isBuy = t.side === 'buy';
          return '<div class="fl-row">' +
            '<span class="fl-date">' + t.date + '</span>' +
            '<span class="fl-side ' + (isBuy ? 'buy' : 'sell') + '">' + (isBuy ? '买入' : '卖出') + '</span>' +
            '<span class="fl-stock">' + nameOf(t.code) + '</span>' +
            '<span class="fl-mut">' + t.qty + ' 股</span>' +
            '<span class="fl-mut">@ ' + fmt2(t.price) + '</span>' +
            '<span class="fl-mut">金额 ' + fmtW(t.amount) + ' 万</span>' +
            (t.fee > 0 ? '<span class="fl-fee">费用 ' + fmt2(t.fee) + '</span>' : '') +
            (!isBuy && t.realized != null ? '<span class="' + (t.realized >= 0 ? 'up' : 'down') + '">' + (t.realized >= 0 ? '盈利 +' : '亏损 ') + fmt2(Math.abs(t.realized)) + '</span>' : '') +
          '</div>';
        }).join('');
      }

      function setHtml(id, html, colorV) {
        const e = document.getElementById(id); if (!e) return;
        e.innerHTML = html;
        if (colorV !== null && colorV !== undefined) e.style.color = colorV > 0.0001 ? 'var(--up)' : (colorV < -0.0001 ? 'var(--down)' : 'var(--text)');
      }

      function buy(code, q) {
        if (!q || q <= 0 || q % 100 !== 0) { toast('请输入 100 的整数倍股数'); return; }
        const p = px(code), amount = q * p, fee = feeOf(amount, false);
        if (amount + fee > S.cash) { toast('可用资金不足：本次需 ' + money(amount + fee) + '，可用 ' + money(S.cash)); return; }
        const h = S.holdings[code] || { qty: 0, cost: 0, locked: 0 };
        h.cost += amount + fee; h.qty += q; if (S.rule) h.locked += q;
        S.holdings[code] = h;
        S.cash -= (amount + fee);
        S.trades.unshift({ date: mdOf(S.dates[DAYS - 1]), side: 'buy', code: code, qty: q, price: p, amount: amount, fee: fee });
        S.selected = code;              // 买入后走势图自动切到该标的
        save(); renderAll();
        toast('买入 ' + nameOf(code) + ' ' + q + ' 股 @ ' + money(p) + (fee > 0 ? '，费用 ' + money(fee) : ''));
      }

      function sell(code, q) {
        const h = S.holdings[code];
        if (!h || h.qty <= 0) { toast('你当前未持有 ' + nameOf(code)); return; }
        if (!q || q <= 0) { toast('请输入有效股数'); return; }
        const avail = S.rule ? h.qty - (h.locked || 0) : h.qty;
        if (avail <= 0) { toast('T+1 限制：当日买入的股票，次一交易日才可卖出'); return; }
        if (q > avail) { toast('可卖不足：当前可卖 ' + avail + ' 股' + (h.locked ? '（另有 ' + h.locked + ' 股当日买入锁定）' : '')); return; }
        const p = px(code), amount = q * p, fee = feeOf(amount, true);
        const costOut = h.cost * (q / h.qty);
        h.qty -= q; h.cost -= costOut;
        if (h.qty === 0) delete S.holdings[code];
        S.cash += (amount - fee);
        const realized = amount - fee - costOut;
        S.trades.unshift({ date: mdOf(S.dates[DAYS - 1]), side: 'sell', code: code, qty: q, price: p, amount: amount, fee: fee, realized: realized });
        S.selected = code;              // 卖出后走势图自动切到该标的
        save(); renderAll();
        toast('卖出 ' + nameOf(code) + ' ' + q + ' 股 @ ' + money(p) + '，本笔' + (realized >= 0 ? '盈利 ' : '亏损 ') + money(Math.abs(realized)) + (fee > 0 ? '（含费用 ' + money(fee) + '）' : ''));
      }

      function nextDay() {
        // v42：推进同样可复现——由「种子 + 情景 + 第几步」唯一决定，不再依赖 Math.random
        const step = (S.step || 0) + 1;
        const mdz = modeOf(S.mode);
        let m = marketSeq(S.seed, S.mode, 1, 100000 + step)[0];
        if (mdz.shockAt != null) m = mdz.mu + (m - mdz.mu) * mdz.shockMul;  // 推进阶段已处于冲击后半段
        const rs = mulberry32(seedOf(S.seed) + 100003 * step + 17);
        STOCKS.forEach(function (s) {
          const a = S.hist[s.code], last = a[DAYS - 1];
          let p = last * (1 + s.beta * m + (rs() - 0.5) * 0.03);
          p = Math.min(last * (1 + s.limit), Math.max(last * (1 - s.limit), p));
          a.push(Math.max(0.5, p)); a.shift();
        });
        const ip = S.idx[DAYS - 1];
        S.idx.push(Math.max(800, ip * (1 + m))); S.idx.shift();
        const nd = new Date(S.dates[DAYS - 1] + 'T00:00:00');
        do { nd.setDate(nd.getDate() + 1); } while (nd.getDay() === 0 || nd.getDay() === 6);
        S.dates.push(isoOf(nd)); S.dates.shift();
        S.day++; S.step = step;
        Object.keys(S.holdings).forEach(function (c) { S.holdings[c].locked = 0; });
        save(); renderAll();
        toast('已推进到 ' + S.dates[DAYS - 1] + '（第 ' + S.day + ' 个模拟交易日）');
      }

      function reset() {
        try { localStorage.removeItem(KEY); } catch (e) {}
        // v42：重置只重置「账户」，行情仍由当前种子决定 —— 这样课堂上不会出现「一按重置就对不上答案」
        S = fresh(S.seed, S.mode);
        save(); renderAll(); renderSeedBar();
        toast('账户已重置：资金 100 万元、持仓与流水清空；行情仍为种子 ' + S.seed + '（要换行情请点「随机换一组」）');
      }

      function renderAll() { renderStats(); renderStocks(); renderChart(); renderEventCard(); renderHoldings(); renderFlow(); }

      // v59：融资事件卡。选中股票若有多次融资，用卡头的芯片切换要看哪一次（拍照时按分镜点一下即可）
      function renderEventCard() {
        const box = document.getElementById('sim-ev-card'); if (!box) return;
        const evs = EVENTS.filter(function (e) { return e.code === S.selected; })
          .sort(function (x, y) { return x.day - y.day; });
        if (!evs.length) { box.hidden = true; box.innerHTML = ''; return; }
        let ev = evs[evs.length - 1];
        const want = String(S.evSel || '').split('#');
        if (want[0] === S.selected) {
          const hit = evs.filter(function (e) { return String(e.day) === want[1]; })[0];
          if (hit) ev = hit;
        }
        const a = S.hist[S.selected];
        const i = Math.max(1, Math.min(DAYS - 1, ev.day - 1));
        const prev = a[i - 1];
        let cells = ev.cells || [], calc = ev.note || '';
        if (ev.exDiv) {
          const per = prev * ev.price;
          const ex = prev * (1 + ev.price * ev.ratio) / (1 + ev.ratio);
          cells = [['登记日收盘', fmt2(prev)], ['配股价', fmt2(per)], ['每股配股数', String(ev.ratio)], ['除权价', fmt2(ex)]];
          calc = '除权价 =（登记日收盘价 ' + fmt2(prev) + ' + 配股价 ' + fmt2(per) + ' × 每股配股数 ' + ev.ratio + '）÷（1 + ' + ev.ratio + '）= <b>' + fmt2(ex) + '</b>，相当于登记日收盘价的 <b>' + (ex / prev * 100).toFixed(1) + '%</b>。图中第 ' + ev.day + ' 个交易日收盘 ' + fmt2(a[i]) + '，与公式结果一致。';
        } else if (ev.type === '定向增发') {
          const issue = prev * 0.80;
          cells = [['募资规模', '450 亿'], ['发行价', fmt2(issue)], ['折价率', '20%'], ['锁定期', '6 / 18 个月']];
          calc = '发行价取前 20 日均价八折，即 ' + fmt2(issue) + ' 元；公告当日上涨 ' + (ev.shock * 100).toFixed(1) + '%，是教材表 4-4 说的「股价往往受利好刺激而上升」。';
        } else if (ev.type === '风险提示') {
          const ie = EVENTS.filter(function (x) { return x.code === ev.code && x.type === '定向增发'; })[0];
          const issue = ie ? a[ie.day - 2] * 0.80 : prev * 0.8;
          const now = a[DAYS - 1];
          cells = [['定增发行价', fmt2(issue)], ['当前股价', fmt2(now)], ['破发幅度', ((now / issue - 1) * 100).toFixed(1) + '%'], ['承担方', '主承销商']];
          calc = '发行价 ' + fmt2(issue) + '，股价已跌到 ' + fmt2(now) + '。新发股份难以售出，未售出部分由主承销商包销，这就是教材 4.5 说的再融资承销风险。';
        } else if (ev.type === '条款提示') {
          const ce = EVENTS.filter(function (x) { return x.code === ev.code && x.type === '可转债'; })[0];
          const conv = ce ? a[ce.day - 2] * (1 + ce.convPct) : prev;
          const now = a[DAYS - 1];
          cells = [['转股价', fmt2(conv)], ['当前股价', fmt2(now)], ['低于转股价', ((1 - now / conv) * 100).toFixed(1) + '%'], ['触发条款', '回售 / 下修']];
          calc = '转股价 ' + fmt2(conv) + ' 高于现价，股价跌破转股价达到一定幅度即触发回售压力，发行人通常选择下修转股价。';
        } else if (ev.type === '强赎触发') {
          // v61：下修后的当期转股价与强赎线，与 K 线上画的两条线同口径
          const cl = convLinesOf(ev.code, a);
          const conv = cl ? cl.cp : prev, call = cl ? cl.call : prev * 1.3;
          const now = a[i];
          const shares = 100 / conv;
          const val = shares * now;
          cells = [['当期转股价', fmt2(conv) + (cl && cl.revised ? '（下修后）' : '')], ['强赎线', fmt2(call)], ['当日收盘', fmt2(now)], ['转股价值', fmt2(val)]];
          calc = '下修后转股价 ' + fmt2(conv) + '，强赎线随之降到 <b>' + fmt2(call) + '</b> 元（= 转股价 × 130%）；当日收盘 ' + fmt2(now) +
            ' 已站上该线，触发有条件赎回。每张可转 <b>' + shares.toFixed(4) + '</b> 股，转股价值 <b>' + fmt2(val) +
            '</b> 元，高于赎回价 100.18 元 —— 理性持有人只能选择转股，债务就此转为权益。';
        }
        box.hidden = false;
        box.innerHTML =
          '<div class="ev-head">' +
            '<span class="ev-tag">' + ev.type + '</span>' +
            '<b class="ev-title">' + nameOf(ev.code) + ' · ' + ev.title + '</b>' +
            '<span class="ev-day">第 ' + ev.day + ' 个交易日</span>' +
          '</div>' +
          (evs.length > 1 ? '<div class="ev-chips">' + evs.map(function (e) {
            return '<button class="ev-chip' + (e.day === ev.day ? ' active' : '') + '" data-day="' + e.day + '" type="button">' + e.type + '</button>';
          }).join('') + '</div>' : '') +
          '<div class="ev-row">' + cells.map(function (c) {
            return '<div class="ev-c"><span>' + c[0] + '</span><b>' + c[1] + '</b></div>';
          }).join('') + '</div>' +
          (calc ? '<div class="ev-calc">' + calc + '</div>' : '') +
          '<div class="ev-note">融资事件依据《投资银行学》第 4 章改编，公司名取自教材案例，金额与比例均为教学模拟值，不代表该公司真实融资记录。</div>';
      }

      // ===== v42 A/C：种子栏与情景切换 =====
      function renderSeedBar() {
        const inp = document.getElementById('sim-seed'); if (inp) inp.value = S.seed;
        const box = document.getElementById('sim-modes');
        if (box) box.innerHTML = MODES.map(function (m) {
          return '<button class="sm-chip' + (m.id === S.mode ? ' active' : '') + '" data-mode="' + m.id + '" aria-pressed="' + (m.id === S.mode) + '">' + m.name + '</button>';
        }).join('');
        const nt = document.getElementById('sim-mode-note');
        if (nt) nt.textContent = modeOf(S.mode).desc;
      }
      // 换种子 / 换情景时行情变了，账户必须一并归零，否则历史成本价与新行情对不上
      function relaunch(seed, mode) {
        try { localStorage.removeItem(KEY); } catch (e) {}
        S = fresh(seed, mode); save(); renderAll(); renderSeedBar();
        const eo = document.getElementById('se-out'); if (eo) eo.innerHTML = '';
      }
      function applySeed() {
        const inp = document.getElementById('sim-seed');
        const v = (inp && inp.value || '').trim();
        if (!v) { toast('请输入种子号，例如 20261007'); return; }
        const sd = seedOf(v); relaunch(sd, S.mode);
        toast('已应用种子 ' + sd + '：全班输入同一个号，即得到完全相同的一条走势');
      }
      function randomSeed() {
        relaunch(100000 + Math.floor(Math.random() * 899999), S.mode);
        toast('已随机换一组行情，当前种子 ' + S.seed);
      }

      // ===== v42 B：重复实验（把随机变成教学点：运气 vs 技能 / 交易成本拖累）=====
      function feeCalc(amount, isSell) {
        if (!S.rule) return 0;
        let f = Math.max(amount * FEE.comm, FEE.commMin) + amount * FEE.transfer;
        if (isSell) f += amount * FEE.stamp;
        return f;
      }
      // policy: 'hold' 买入并持有 | 'turn' 每日换手（受 T+1 约束）；不触碰当前账户 S
      function runTrial(seed, mode, policy) {
        const g = genPath(seed, mode);
        const n = STOCKS.length;
        let cash = START_CASH;
        const H = {};
        const buyDay = function (i) {
          const per = cash / n;
          STOCKS.forEach(function (s) {
            const p = g.hist[s.code][i];
            let q = Math.floor(per / p / 100) * 100;
            for (; q > 0; q -= 100) { const t0 = q * p, f0 = feeCalc(t0, false); if (t0 + f0 <= cash) break; }
            if (q <= 0) return;
            const amt = q * p, fee = feeCalc(amt, false);
            cash -= amt + fee;
            const h = H[s.code] || (H[s.code] = { qty: 0, cost: 0, locked: 0 });
            h.qty += q; h.cost += amt + fee; h.locked += q;
          });
        };
        const sellDay = function (i) {
          STOCKS.forEach(function (s) {
            const h = H[s.code]; if (!h || h.qty <= 0) return;
            const avail = S.rule ? (h.qty - h.locked) : h.qty;
            const q = Math.floor(avail / 100) * 100;
            if (q <= 0) return;
            const p = g.hist[s.code][i], amt = q * p, fee = feeCalc(amt, true);
            const part = h.cost * (q / h.qty);
            cash += amt - fee;
            h.qty -= q; h.cost -= part; h.locked = Math.max(0, h.locked - q);
          });
        };
        buyDay(0);
        if (policy === 'turn') {
          for (let i = 1; i < DAYS; i++) {
            STOCKS.forEach(function (s) { const h = H[s.code]; if (h) h.locked = 0; });  // 次一交易日解除 T+1 锁定
            sellDay(i); buyDay(i);
          }
        }
        let mkt = 0;
        STOCKS.forEach(function (s) { const h = H[s.code]; if (h) mkt += h.qty * g.hist[s.code][DAYS - 1]; });
        return (cash + mkt) / START_CASH * 100 - 100;
      }
      function statOf(arr) {
        let s = 0; arr.forEach(function (x) { s += x; });
        const mean = s / arr.length;
        let v = 0; arr.forEach(function (x) { v += (x - mean) * (x - mean); });
        return { mean: mean, sd: Math.sqrt(v / arr.length), min: Math.min.apply(null, arr), max: Math.max.apply(null, arr) };
      }
      function runExperiment() {
        const out = document.getElementById('se-out'); if (!out) return;
        const el = document.getElementById('se-n');
        let n = parseInt(el && el.value, 10);
        if (!n || n < 5) n = 20; n = Math.min(200, Math.max(5, n));
        if (el) el.value = n;
        out.innerHTML = '<div class="sb-hint">正在生成 ' + n + ' 条行情并跑两套策略…</div>';
        setTimeout(function () {
          const A = [], B = [], base = seedOf(S.seed);
          for (let k = 0; k < n; k++) {
            const sd = seedOf(String(base) + '-' + (k + 1));   // 每条路径的派生种子：确定且互不重复
            A.push(runTrial(sd, S.mode, 'hold'));
            B.push(runTrial(sd, S.mode, 'turn'));
          }
          renderExp(A, B, n, out);
        }, 30);
      }
      function renderExp(A, B, n, out) {
        const sa = statOf(A), sb = statOf(B);
        let win = 0; for (let i = 0; i < n; i++) if (A[i] > B[i]) win++;
        const wr = win / n * 100, diff = sa.mean - sb.mean;
        const all = A.concat(B);
        let lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
        if (lo > 0) lo = 0; if (hi < 0) hi = 0;
        if (hi - lo < 0.5) hi = lo + 0.5;
        const NB = 12, bw = (hi - lo) / NB;
        const ha = [], hb = []; for (let k = 0; k < NB; k++) { ha.push(0); hb.push(0); }
        const put = function (arr, dst) {
          arr.forEach(function (v) { let k = Math.floor((v - lo) / bw); if (k < 0) k = 0; if (k > NB - 1) k = NB - 1; dst[k]++; });
        };
        put(A, ha); put(B, hb);
        const mx = Math.max.apply(null, ha.concat(hb).concat([1]));
        const W = 560, Hh = 200, pl = 28, pr = 8, pt = 10, pb = 30;
        const iw = W - pl - pr, ih = Hh - pt - pb;
        let svg = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="两种策略在 ' + n + ' 条行情上的收益率分布直方图"><title>买入并持有与每日换手的收益率分布</title>';
        for (let gi = 0; gi <= 4; gi++) {
          const y = pt + ih * gi / 4;
          svg += '<line x1="' + pl + '" y1="' + y.toFixed(1) + '" x2="' + (W - pr) + '" y2="' + y.toFixed(1) + '" stroke="var(--chart-axis)" stroke-width="0.5"/>';
        }
        const stp = iw / NB, bwid = stp * 0.34;
        for (let k = 0; k < NB; k++) {
          const cx = pl + stp * (k + 0.5);
          if (ha[k] > 0) { const h1 = ha[k] / mx * ih; svg += '<rect x="' + (cx - bwid).toFixed(1) + '" y="' + (pt + ih - h1).toFixed(1) + '" width="' + bwid.toFixed(1) + '" height="' + h1.toFixed(1) + '" fill="var(--up)" rx="2"/>'; }
          if (hb[k] > 0) { const h2 = hb[k] / mx * ih; svg += '<rect x="' + (cx + 1).toFixed(1) + '" y="' + (pt + ih - h2).toFixed(1) + '" width="' + bwid.toFixed(1) + '" height="' + h2.toFixed(1) + '" fill="var(--down)" rx="2"/>'; }
        }
        if (lo < 0 && hi > 0) {
          const zy = pt + ih - (0 - lo) / (hi - lo) * ih;
          svg += '<line x1="' + pl + '" y1="' + zy.toFixed(1) + '" x2="' + (W - pr) + '" y2="' + zy.toFixed(1) + '" stroke="var(--muted)" stroke-width="1" stroke-dasharray="4 3"/>';
        }
        for (let k = 0; k < NB; k += 2) {
          const cx = pl + stp * (k + 0.5);
          svg += '<text x="' + cx.toFixed(1) + '" y="' + (Hh - 10) + '" fill="var(--muted)" font-size="10" text-anchor="middle">' + (lo + bw * k).toFixed(1) + '</text>';
        }
        svg += '</svg>';
        const ia = '<i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--up);margin-right:5px;"></i>';
        const ib = '<i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--down);margin-right:5px;"></i>';
        const concl = S.rule
          ? '在 <b>' + n + ' 条行情</b>上做的配对比较里，<b class="pol-a">买入并持有</b>平均 ' + sa.mean.toFixed(2) + '%，<b class="pol-b">每日换手</b>平均 ' + sb.mean.toFixed(2) + '%，持有策略平均领先 <b>' + diff.toFixed(2) + ' 个百分点</b>，并在 <b>' + wr.toFixed(0) + '%</b> 的路径上占优。但要看清楚：持有策略自己的成绩也在 ' + sa.min.toFixed(1) + '% ~ ' + sa.max.toFixed(1) + '% 之间大幅摆动（标准差 ' + sa.sd.toFixed(1) + '%）——<b>单次结果主要由运气决定，只有反复出现、稳定存在的差异，才属于策略本身</b>。'
          : '当前已<b>关闭 A 股交易费用</b>，两种策略的差距压缩到 <b>' + diff.toFixed(2) + ' 个百分点</b>。请勾选上方「按 A 股真实规则」再跑一次：多出来的那部分差距，就是佣金、印花税与过户费对<b>频繁交易</b>的惩罚。';
        out.innerHTML =
          '<div class="se-stats">' +
            '<div class="se-s"><div class="k">买入持有 · 平均收益</div><div class="v">' + (sa.mean >= 0 ? '+' : '') + sa.mean.toFixed(2) + '<small>%</small></div></div>' +
            '<div class="se-s"><div class="k">每日换手 · 平均收益</div><div class="v">' + (sb.mean >= 0 ? '+' : '') + sb.mean.toFixed(2) + '<small>%</small></div></div>' +
            '<div class="se-s"><div class="k">持有占优的路径占比</div><div class="v">' + wr.toFixed(0) + '<small>%</small></div></div>' +
            '<div class="se-s"><div class="k">平均领先幅度</div><div class="v">' + (diff >= 0 ? '+' : '') + diff.toFixed(2) + '<small>pp</small></div></div>' +
          '</div>' + svg +
          '<div class="sim-legend"><span>' + ia + '买入并持有</span><span>' + ib + '每日换手</span>' +
          '<span class="sim-tip">横轴为收益率区间（%），纵轴为落入该区间的次数</span></div>' +
          '<div class="se-concl">' + concl + '</div>';
      }

      const list = document.getElementById('sim-stocks');
      if (list) list.addEventListener('click', function (e) {
        const btn = e.target.closest ? e.target.closest('button') : null; if (!btn) return;
        const code = btn.getAttribute('data-code'); if (!code) return;
        if (btn.classList.contains('sl-name')) { selectStock(code); return; }
        const q = qtyOf(code);
        if (btn.classList.contains('sl-buy')) buy(code, q);
        else if (btn.classList.contains('sl-sell')) sell(code, q);
      });
      const svgEl = document.getElementById('sim-chart');
      if (svgEl) {
        svgEl.addEventListener('mousemove', function (e) {
          const r = svgEl.getBoundingClientRect(); if (!r.width) return;
          const vx = (e.clientX - r.left) / r.width * CW;
          let i = Math.round((vx - PL) / (CW - PL - PR) * (DAYS - 1));
          i = Math.max(0, Math.min(DAYS - 1, i));
          showCursor(i);
        });
        svgEl.addEventListener('mouseleave', hideCursor);
      }
      const evBox = document.getElementById('sim-ev-card');
      if (evBox) evBox.addEventListener('click', function (e) {
        const b = e.target.closest ? e.target.closest('.ev-chip') : null; if (!b) return;
        const d = parseInt(b.getAttribute('data-day'), 10); if (!d) return;
        S.evSel = S.selected + '#' + d; save(); renderEventCard();
      });
      const btnNext = document.getElementById('sim-next'); if (btnNext) btnNext.addEventListener('click', nextDay);
      const btnReset = document.getElementById('sim-reset'); if (btnReset) btnReset.addEventListener('click', reset);

      // v42 A/C：种子与情景
      const btnApply = document.getElementById('sim-seed-apply'); if (btnApply) btnApply.addEventListener('click', applySeed);
      const btnRandSeed = document.getElementById('sim-seed-rand'); if (btnRandSeed) btnRandSeed.addEventListener('click', randomSeed);
      const inpSeed = document.getElementById('sim-seed');
      if (inpSeed) inpSeed.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.keyCode === 13) { e.preventDefault(); applySeed(); } });
      const boxMode = document.getElementById('sim-modes');
      if (boxMode) boxMode.addEventListener('click', function (e) {
        const b = e.target.closest ? e.target.closest('.sm-chip') : null; if (!b) return;
        const id = b.getAttribute('data-mode'); if (!id || id === S.mode) return;
        relaunch(S.seed, id);
        toast('已切换到「' + modeOf(id).name + '」情景：' + modeOf(id).desc);
      });
      // v42 B：重复实验
      const btnRun = document.getElementById('se-run'); if (btnRun) btnRun.addEventListener('click', runExperiment);
      const inpN = document.getElementById('se-n');
      if (inpN) inpN.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.keyCode === 13) { e.preventDefault(); runExperiment(); } });

      renderSeedBar();
      const ruleBox = document.getElementById('sim-rule');
      if (ruleBox) {
        ruleBox.checked = !!S.rule;
        ruleBox.addEventListener('change', function () {
          S.rule = this.checked; save(); renderAll();
          toast(S.rule ? '已启用 A 股真实规则：佣金 · 印花税 · 过户费 · T+1' : '已切换为简化模式：不计费用、不受 T+1 限制');
        });
      }
      renderAll();
    })();

    // ===== 首页模块卡片：点击跳转 =====
    document.querySelectorAll('.home-card').forEach(function (c) {
      c.addEventListener('click', function () {
        const t = c.getAttribute('data-page');
        const btn = document.querySelector('.tab-btn[data-page="' + t + '"]');
        if (btn) btn.click();
      });
    });

// ===== 智能答疑页（v46 重做：单栏沉浸式对话 + 音色可调语音，删知识地图；v47 文案对齐 RAG）=====
    (function () {
      var log = document.getElementById('qa-log');
      var form = document.getElementById('qa-form');
      var input = document.getElementById('qa-input');
      var sendBtn = document.getElementById('qa-send');
      var voiceBtn = document.getElementById('qa-voice');
      var vsetBtn = document.getElementById('qa-vset');
      var vpanel = document.getElementById('qa-vpanel');
      var statusEl = document.getElementById('qa-status');
      var history = [];
      var aborted = false;
      var busy = false;
      var lastReply = '';
      // 运行时 HTML 转义（构建期的 esc 只存在于生成器内，不可在此引用）
      function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
      }); }

      // ---------- 轻量 Markdown（段落 / 有序无序列表 / 加粗 / 行内代码） ----------
      function mdToHtml(t) {
        var lines = String(t || '').replace(/\r/g, '').split('\n');
        var out = [], list = null;
        function inline(s) {
          return esc(s)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
            .replace(/`([^`\n]+)`/g, '<code>$1</code>');
        }
        function closeList() { if (list) { out.push('</' + list + '>'); list = null; } }
        for (var i = 0; i < lines.length; i++) {
          var ln = lines[i], m;
          if ((m = ln.match(/^\s*\d+[.、]\s+(.*)$/))) {
            if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
            out.push('<li>' + inline(m[1]) + '</li>');
          } else if ((m = ln.match(/^\s*[-*]\s+(.*)$/))) {
            if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
            out.push('<li>' + inline(m[1]) + '</li>');
          } else if (!ln.trim()) { closeList(); }
          else { closeList(); out.push('<p>' + inline(ln) + '</p>'); }
        }
        closeList();
        return out.join('');
      }

      // ---------- 状态胶囊 ----------
      function setStatus(mode, text) {
        statusEl.classList.toggle('busy', mode === 'busy');
        statusEl.innerHTML = '<i></i>' + esc(text);
      }

      // ---------- 相关跳转：从案例库 / 章节实时读取，增删后自动跟随 ----------
      var chTitlesQA = { '第0章': '导论', '第1章': '投资银行概述', '第2章': '企业融资方案设计', '第3章': '股份有限公司与首次公开发行', '第4章': '上市公司再融资', '第5章': '债券的发行与承销', '第6章': '资产证券化', '第7章': '公司并购' };
      // ---------- v48-依据面板：回答依据（全部可核验，不编造云端检索细节） ----------
      // 知识库规模为人工核实过的常量（4 个 md，切片数取自控制台实测）
      var KB_DOCS = 4, KB_CHUNKS = 67;
      function qaMatch(q) {
        var r = { ch: '', title: '', cases: [] };
        var s = String(q || '').toLowerCase();
        var marks = [
          { re: /(中芯|芯片|科创板|半导体|ipo|上市|发行|定价)/, ch: '第3章' },
          { re: /(可转债|可交换|转债|增发|配股|优先股|再融资|再募)/, ch: '第4章' },
          { re: /(债券|国债|信用评级|票面|收益率|承销|超日|永煤|违约)/, ch: '第5章' },
          { re: /(abs|资产证券化|证券化|次级|分层|mbs|花呗|借呗)/, ch: '第6章' },
          { re: /(并购|收购|重组|杠杆收购|lbo|要约|库卡|沃尔沃|宝万|恒大|万科)/, ch: '第7章' },
          { re: /(融资方案|股权融资|债权融资|融资需求|资本结构|蔚来|合肥)/, ch: '第2章' },
          { re: /(美元|黄金|美联储|加息|降息|美债|汇率|避险|熊债)/, ch: '第0章' }
        ];
        var i, hit = null;
        for (i = 0; i < marks.length; i++) { if (marks[i].re.test(s)) { hit = marks[i]; break; } }
        if (hit) { r.ch = hit.ch; r.title = (chTitlesQA && chTitlesQA[hit.ch]) || ''; }
        try {
          var els = document.querySelectorAll('#p-case .case-item');
          for (i = 0; i < els.length && r.cases.length < 2; i++) {
            if (hit && els[i].getAttribute('data-chapter') === hit.ch) {
              var t = els[i].querySelector('.case-title');
              var ttl = t ? t.textContent : '';
              if (ttl) r.cases.push({ id: els[i].id, title: ttl });
            }
          }
        } catch (e) { /* 案例库未渲染时静默跳过 */ }
        return r;
      }
      function esc2(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }
      function addBasis(main, q, local, ms) {
        var m = qaMatch(q);
        var box = document.createElement('details');
        box.className = 'qa-basis';
        // v49：默认折叠（不写 open 属性），标题行给出可核验摘要
        var tip = local
          ? '本地题库回落'
          : '知识库检索 + 大模型生成';
        var h = '<summary><span>📚 本次回答依据</span>'
          + '<span class="btip">' + esc2(tip) + '</span>'
          + '<span class="caret" aria-hidden="true">▶</span></summary>'
          + '<div class="bbody">';
        if (local) {
          h += '<div class="brow"><span class="bk">依据来源</span><span class="bv off">⚠ 本次未使用知识库</span></div>';
          h += '<div class="brow"><span class="bk">原因</span><span class="bv">联网调用大模型失败（断网 / 服务不可达），已自动回落到站内本地题库</span></div>';
        } else {
          h += '<div class="brow"><span class="bk">知识库</span><span class="bv">iBank 课程知识库（' + KB_DOCS + ' 篇文档 / ' + KB_CHUNKS + ' 切片）· 检索增强</span></div>';
          h += '<div class="brow"><span class="bk">推理引擎</span><span class="bv">智谱 GLM（大模型生成，答案不限于原文）</span></div>';
        }
        if (m.ch) {
          h += '<div class="brow"><span class="bk">命中章节</span><span class="bv"><a data-goto="p-graph" data-ch="' + esc2(m.ch) + '">' + esc2(m.ch + (m.title ? ' ' + m.title : '')) + ' ↗</a></span></div>';
        }
        if (m.cases.length) {
          var cs = m.cases.map(function (x) {
            return '<a data-goto="p-case" data-case="' + esc2(x.id) + '">' + esc2(x.title) + ' ↗</a>';
          }).join('　');
          h += '<div class="brow"><span class="bk">参考案例</span><span class="bv">' + cs + '</span></div>';
        }
        if (ms) {
          var tsec = function (v) { return (v > 0 ? v : 0) / 1000; };
          h += '<div class="brow"><span class="bk">实测用时</span><span class="bv">首字 ' + tsec(ms.ttfbMs).toFixed(2) + 's · 总耗时 ' + tsec(ms.totalMs).toFixed(2) + 's · 输出 ' + ms.chars + ' 字</span></div>';
        }
        h += '<div class="warn">回答由大模型生成，可能存在偏差；关键数据请点开上方章节与案例核对原文。</div>';
        h += '</div>';
        box.innerHTML = h;
        main.appendChild(box);
        // v50：展开时把日志滚到底，确保正文完整可见。
        // 原因：#qa-log 是 max-height + overflow-y:auto 的内部滚动容器，
        // 面板位于消息流末尾，展开后向下溢出，不滚动则正文会被容器裁掉（表现为「展不开 / 没内容」）。
        box.addEventListener('toggle', function () {
          if (!box.open) return;
          var bring = function () { log.scrollTop = log.scrollHeight; };
          requestAnimationFrame(function () { requestAnimationFrame(bring); });
          setTimeout(bring, 60);
          setTimeout(bring, 220);
        });
      }
      // 阶段指示器：由真实事件驱动 —— 请求发出 / 首字到达；不声称云端检索条数
      function phaseHTML(stage) {
        var S = [
          { t: '连接智谱 GLM', on: 0 },
          { t: '检索课程知识库并组织答案', on: 1 },
          { t: '已生成', on: 2 }
        ];
        var h = '';
        for (var i = 0; i < S.length; i++) {
          var cls = i < stage ? 'done' : (i === stage ? 'on' : '');
          h += '<span class="pstep ' + cls + '"><i class="pdot"></i>' + S[i].t + '</span>';
          if (i < S.length - 1) h += '<span class="parrow">→</span>';
        }
        return '<div class="qa-phase">' + h + '</div>';
      }
      function qaRelated(q) {
        var s = q.toLowerCase(), seen = {};
        var marks = [
          { re: /(中芯|芯片|科创板|半导体|ipo|上市|发行|定价)/, ch: '第3章', kw: 'IPO' },
          { re: /(可转债|可交换|转债|增发|配股|优先股|再融资|再募)/, ch: '第4章', kw: '再融资' },
          { re: /(债券|国债|信用评级|票面|收益率|承销|超日|永煤|违约)/, ch: '第5章', kw: '债券' },
          { re: /(abs|资产证券化|证券化|次级|分层|mbs|花呗|借呗)/, ch: '第6章', kw: '证券化' },
          { re: /(并购|收购|重组|杠杆收购|lbo|要约|库卡|沃尔沃|宝万|恒大|万科)/, ch: '第7章', kw: '并购' },
          { re: /(融资方案|股权融资|债权融资|融资需求|资本结构|蔚来|合肥)/, ch: '第2章', kw: '融资方案' },
          { re: /(美元|黄金|美联储|加息|降息|美债|汇率|避险|熊债)/, ch: '第0章', kw: '宏观货币' }
        ];
        var hit = null, i;
        for (i = 0; i < marks.length; i++) { if (marks[i].re.test(s)) { hit = marks[i]; break; } }
        if (!hit) return '';
        var links = ['<span class="rl">相关</span>'];
        links.push('<a data-goto="p-graph" data-ch="' + esc(hit.ch) + '">' + esc(hit.ch + ' ' + chTitlesQA[hit.ch]) + ' ↗</a>');
        try {
          var els = document.querySelectorAll('#p-case .case-item'), n = 0;
          for (i = 0; i < els.length && n < 2; i++) {
            if (els[i].getAttribute('data-chapter') === hit.ch) {
              var t = els[i].querySelector('.case-title');
              var title = t ? t.textContent : '';
              if (title && !seen[els[i].id]) {
                seen[els[i].id] = 1;
                links.push('<a data-goto="p-case" data-case="' + esc(els[i].id) + '">' + esc(title.length > 14 ? title.slice(0, 14) + '…' : title) + ' ↗</a>');
                n++;
              }
            }
          }
        } catch (e) { /* 案例库尚未渲染时静默跳过 */ }
        return links.join('');
      }

      // ---------- 语音朗读：浏览器内置 synthesis；不导出、不下载、不克隆真人 ----------
      // 参数持久化到 localStorage，用户可调出最满意的「轻柔感」
      var VKEY = 'ibank.qa.voice';
      var vcfg = { voiceURI: '', rate: 0.95, pitch: 1.1 };
      try {
        var saved = JSON.parse(localStorage.getItem(VKEY) || '{}');
        if (saved.voiceURI != null) vcfg.voiceURI = String(saved.voiceURI);
        if (saved.rate != null && isFinite(saved.rate)) vcfg.rate = Math.min(1.3, Math.max(0.7, Number(saved.rate)));
        if (saved.pitch != null && isFinite(saved.pitch)) vcfg.pitch = Math.min(1.4, Math.max(0.8, Number(saved.pitch)));
      } catch (e) { }
      function saveVcfg() { try { localStorage.setItem(VKEY, JSON.stringify(vcfg)); } catch (e) { } }
      var tts = { on: false, ready: false, voice: null };
      function zhVoices() {
        if (!('speechSynthesis' in window)) return [];
        var vs = [];
        try { vs = window.speechSynthesis.getVoices() || []; } catch (e) { return []; }
        var zh = vs.filter(function (v) { return /^zh[-_]?(CN|Hans)?/i.test(v.lang || ''); });
        if (!zh.length) zh = vs.filter(function (v) { return /^zh/i.test(v.lang || ''); });
        return zh;
      }
      // 打分挑「轻柔女声」：柔和女声关键词 + 本机优先 - 排除 Siri/粤语/台湾口音
      function pickVoice() {
        var zh = zhVoices();
        if (!zh.length) return null;
        var soft = ['xiaoxiao', 'xiaoyi', 'yaoyao', 'huihui', '晓晓', '晓伊', '瑶瑶', '慧慧', '婷婷', 'tingting', 'ting-ting', 'meijia', '美佳', 'xiaohan', '晓涵', 'xiaomo', '晓墨'];
        function score(v) {
          var nm = ((v.name || '') + ' ' + (v.lang || '')).toLowerCase(), sc = 0, i;
          for (i = 0; i < soft.length; i++) if (nm.indexOf(soft[i]) !== -1) { sc += 10; break; }
          if (v.localService) sc += 4;
          if (/siri|yue|canton|hk|tw|hant|繁/.test(nm)) sc -= 8;
          return sc;
        }
        var best = zh[0], bs = score(zh[0]);
        for (var i = 1; i < zh.length; i++) { var s2 = score(zh[i]); if (s2 > bs) { bs = s2; best = zh[i]; } }
        return best;
      }
      function ttsAvailable() {
        if (!tts.ready) return false;
        if (tts.voice) return true;
        try { return window.speechSynthesis.getVoices().length > 0; } catch (e) { return false; }
      }
      // 长文本按标点断句，避免 iOS / 部分引擎长句被截断
      function chunkText(t, size) {
        var out = [], cur = '';
        for (var i = 0; i < t.length; i++) {
          cur += t[i];
          if (cur.length >= size && /[。！？!?；;，,.]/.test(t[i])) { out.push(cur); cur = ''; }
        }
        if (cur) out.push(cur);
        return out.length ? out : [t];
      }
      // 检测微信/QQ 等内嵌浏览器（它们常禁用或阉割 speechSynthesis）
      function isInAppBrowser() {
        var ua = (navigator.userAgent || '').toLowerCase();
        return /micromessenger|wechat|qq\//.test(ua);
      }
      var speakToken = 0;
      var isSpeaking = false;
      function speak(text) {
        // 没有锁定中文音色时，若系统已有任意音色也允许朗读（用默认音色兜底，移动端首触发即可出声）
        if (!tts.voice) { try { var z = zhVoices(); if (z.length) tts.voice = pickVoice(); } catch (e) { } }
        if (!ttsAvailable()) {
          if (isInAppBrowser()) ibankToast('微信内置浏览器不支持语音朗读，请用系统浏览器（Chrome/Safari/Edge）打开本页');
          return;
        }
        try {
          // 移动端取消必须在同一手势内，且不应在朗读未开始时就 cancel，否则 iOS 可能锁定音频
          if (isSpeaking) { try { window.speechSynthesis.cancel(); } catch (e) { } }
          var raw = String(text || '').replace(/[#*>`]/g, '').slice(0, 3000);
          var chunks = chunkText(raw, 180);
          var my = ++speakToken;
          isSpeaking = true;
          (function next(i) {
            if (my !== speakToken) { isSpeaking = false; return; } // 已被新朗读 / 停止取代
            if (i >= chunks.length) { tts.utter = null; isSpeaking = false; return; }
            var u = new SpeechSynthesisUtterance(chunks[i]);
            if (tts.voice) u.voice = tts.voice;
            u.lang = (tts.voice && tts.voice.lang) || 'zh-CN';
            u.rate = vcfg.rate; u.pitch = vcfg.pitch; u.volume = 0.95;
            u.onend = function () { next(i + 1); };
            u.onerror = function (e) {
              isSpeaking = false;
              if (isInAppBrowser()) ibankToast('当前浏览器不支持朗读，请用系统浏览器打开');
              else next(i + 1);
            };
            tts.utter = u;
            window.speechSynthesis.speak(u);
          })(0);
        } catch (e) {
          isSpeaking = false;
          if (isInAppBrowser()) ibankToast('当前浏览器不支持朗读，请用系统浏览器打开');
        }
      }
      function stopSpeak() {
        speakToken++;                                 // 终止进行中的朗读链
        try { window.speechSynthesis.cancel(); } catch (e) { }
        tts.utter = null;
        isSpeaking = false;
      }
      function syncVoiceBtn() {
        voiceBtn.classList.toggle('on', tts.on);
        voiceBtn.setAttribute('aria-pressed', tts.on ? 'true' : 'false');
        voiceBtn.innerHTML = tts.on ? '🔈 朗读中' : '🔊 朗读关';
        voiceBtn.title = tts.on ? '关闭自动朗读' : '开启自动朗读：每条回答完成后自动朗读';
      }
      // 设置面板
      var vsel = document.getElementById('qa-vsel');
      var vrate = document.getElementById('qa-vrate');
      var vpitch = document.getElementById('qa-vpitch');
      var vrateV = document.getElementById('qa-vrate-v');
      var vpitchV = document.getElementById('qa-vpitch-v');
      var vname = document.getElementById('qa-vname');
      function fillVoicePanel() {
        var zh = zhVoices();
        vsel.innerHTML = '';
        for (var i = 0; i < zh.length; i++) {
          var o = document.createElement('option');
          o.value = zh[i].voiceURI;
          o.textContent = zh[i].name + (zh[i].localService ? '（本机）' : '（网络）');
          vsel.appendChild(o);
        }
        // 选中：优先用户记忆音色，否则自动挑选的柔和女声
        var want = vcfg.voiceURI;
        var found = false;
        for (var j = 0; j < zh.length; j++) if (zh[j].voiceURI === want) { found = true; break; }
        tts.voice = found ? zh.filter(function (v) { return v.voiceURI === want; })[0] : pickVoice();
        if (tts.voice) { vcfg.voiceURI = tts.voice.voiceURI; vsel.value = tts.voice.voiceURI; }
        vname.textContent = tts.voice ? ('当前：' + tts.voice.name) : '未检测到中文音色';
      }
      function initTTS() {
        if (!('speechSynthesis' in window)) {
          voiceBtn.disabled = true; vsetBtn.disabled = true;
          voiceBtn.title = '当前浏览器不支持语音朗读（可换 Chrome / Edge / Safari）';
          vname.textContent = '当前浏览器不支持语音合成';
          return;
        }
        tts.ready = true;
        fillVoicePanel();
        try { window.speechSynthesis.onvoiceschanged = fillVoicePanel; } catch (e) { }
        var tries = 0;
        var iv = setInterval(function () {
          if (tts.voice || ++tries > 12) { clearInterval(iv); return; }
          fillVoicePanel();
        }, 350);
        vrate.value = String(vcfg.rate); vpitch.value = String(vcfg.pitch);
        vrateV.textContent = vcfg.rate.toFixed(2); vpitchV.textContent = vcfg.pitch.toFixed(2);
        vsel.addEventListener('change', function () {
          vcfg.voiceURI = vsel.value; saveVcfg(); fillVoicePanel();
        });
        vrate.addEventListener('input', function () {
          vcfg.rate = Number(vrate.value); vrateV.textContent = vcfg.rate.toFixed(2); saveVcfg();
        });
        vpitch.addEventListener('input', function () {
          vcfg.pitch = Number(vpitch.value); vpitchV.textContent = vcfg.pitch.toFixed(2); saveVcfg();
        });
        document.getElementById('qa-vtest').addEventListener('click', function () {
          if (!ttsAvailable()) { ibankToast('未检测到可用的系统中文语音'); return; }
          speak('你好，我是 iBank 学伴。可以问我投资银行、IPO、并购、承销、估值的任何问题。');
          ibankToast('正在试听（' + tts.voice.name + '）');
        });
        // ★移动端解锁：iOS / 部分 Android 上 speechSynthesis 必须先在「用户手势」内触发一次，
        //   否则 getVoices() 永远为空、tts.voice 恒为 null、speak() 静默返回 —— 这就是「手机听不到」的根因。
        //   监听首次指针/键盘/触摸，静默预热一次空朗读加载音色并解锁音频通道，随后重填音色表，
        //   保证桌面 / 移动双端都能拿到可用中文音色并出声。
        var unlocked = false;
        function unlock() {
          if (unlocked) return; unlocked = true;
          try {
            if (!tts.voice) fillVoicePanel();
            var u = new SpeechSynthesisUtterance(' ');
            u.volume = 0; u.rate = 1; u.pitch = 1;
            window.speechSynthesis.speak(u);
          } catch (e) { }
          setTimeout(function () { if (!tts.voice) fillVoicePanel(); }, 400);
          window.removeEventListener('pointerdown', unlock);
          window.removeEventListener('keydown', unlock);
          window.removeEventListener('touchstart', unlock);
        }
        window.addEventListener('pointerdown', unlock);
        window.addEventListener('keydown', unlock);
        window.addEventListener('touchstart', unlock);
      }
      // 验收探针用：返回当前实际选中的音色名
      window.__qa46Voice = function () { return tts.voice ? tts.voice.name : ''; };

      // ---------- 渲染消息 ----------
      var BOT_AV = '<svg viewBox="0 0 48 48" fill="none"><line x1="24" y1="13" x2="24" y2="8" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="24" cy="6.5" r="2.6" fill="#fbbf24"/><rect x="10" y="13" width="28" height="23" rx="10" fill="#fff"/><circle cx="19" cy="23" r="3" fill="#4f46e5"/><circle cx="29" cy="23" r="3" fill="#4f46e5"/><path d="M19 29 Q24 33 29 29" stroke="#4f46e5" stroke-width="2.2" fill="none" stroke-linecap="round"/><rect x="14" y="36" width="20" height="9" rx="4.5" fill="#a5b4fc"/><circle cx="16" cy="27" r="1.8" fill="#fb7185" opacity="0.55"/><circle cx="32" cy="27" r="1.8" fill="#fb7185" opacity="0.55"/></svg>';
      var USER_AV = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5"/></svg>';
      function addRow(who) {
        var row = document.createElement('div');
        row.className = 'qa-row ' + who;
        var av = document.createElement('div');
        av.className = 'qa-av';
        av.setAttribute('aria-hidden', 'true');
        av.innerHTML = who === 'u' ? USER_AV : BOT_AV;
        // v49：头像 + 内容列（.qa-main）纵向结构，气泡/工具条/相关/依据都在内容列内堆叠
        var main = document.createElement('div');
        main.className = 'qa-main';
        var bub = document.createElement('div');
        bub.className = 'qa-bub';
        main.appendChild(bub);
        row.appendChild(av);
        row.appendChild(main);
        log.appendChild(row);
        log.scrollTop = log.scrollHeight;
        return { row: row, bub: bub, main: main };
      }
      function addTools(row, main, host, text, rel) {
        var box = document.createElement('div');
        box.className = 'qa-tools';
        var bCopy = document.createElement('button');
        bCopy.type = 'button'; bCopy.textContent = '⧉ 复制';
        bCopy.addEventListener('click', function () {
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).then(function () { ibankToast('已复制回答'); }, function () { ibankToast('复制失败，请手动选中'); });
            } else { ibankToast('当前环境不支持一键复制'); }
          } catch (e) { ibankToast('复制失败，请手动选中'); }
        });
        var bRe = document.createElement('button');
        bRe.type = 'button'; bRe.textContent = '↻ 重新生成';
        bRe.addEventListener('click', function () {
          var u = host.getAttribute('data-ask');
          if (!u) { ibankToast('这条内容没有对应问题'); return; }
          var stale = row.querySelector('.qa-tools');
          if (stale) stale.remove();
          var staleRel = row.querySelectorAll('.qa-rel');
          for (var i = 0; i < staleRel.length; i++) staleRel[i].remove();
          var staleBasis = row.querySelectorAll('.qa-basis');
          for (var j = 0; j < staleBasis.length; j++) staleBasis[j].remove();
          host.innerHTML = '';
          ask(u, { fresh: true });
        });
        var bRead = document.createElement('button');
        bRead.type = 'button'; bRead.textContent = '🔊 朗读';
        bRead.addEventListener('click', function () {
          if (!ttsAvailable()) { ibankToast('未检测到可用的系统中文语音'); return; }
          if (tts.on) { tts.on = false; stopSpeak(); syncVoiceBtn(); ibankToast('已停止朗读'); }
          else { tts.on = true; syncVoiceBtn(); speak(text); ibankToast('开始朗读（' + tts.voice.name + '）'); }
        });
        box.appendChild(bCopy); box.appendChild(bRe); box.appendChild(bRead);
        main.appendChild(box);
        if (rel) {
          var wrap = document.createElement('span');
          wrap.className = 'qa-rel';
          wrap.innerHTML = rel;
          main.appendChild(wrap);
        }
      }

      // ---------- 欢迎卡 ----------
      var QUICK = ['什么是 IPO？', '包销和代销的区别', '并购估值怎么做', '美元为什么影响黄金'];
      function renderWelcome() {
        var w = addRow('b');
        w.bub.innerHTML = '<div class="qa-welcome">'
          + '<div class="wt">你好，我是 iBank AI 学伴 👋</div>'
          + '<div class="ws">可以问我投资银行、IPO、并购、承销、估值，以及美元、黄金、股票、美债。<br>回答支持复制、重新生成与语音朗读，还可以一键跳到相关章节和真实案例。</div>'
          + '<div class="wq">' + QUICK.map(function (q) { return '<button type="button" data-q="' + esc(q) + '">' + esc(q) + '</button>'; }).join('') + '</div>'
          + '</div>';
      }

      // ---------- 热门话题分组 ----------
      var GROUPS = [
        { c: '投行业务', qs: ['什么是 IPO？', '包销和代销的区别', '市盈率 PE 怎么用', '尽职调查查什么'] },
        { c: '融资工具', qs: ['可转债和可交换债的区别', '资产证券化 ABS 是什么', '信用评级影响发行利率吗', '债券定价怎么算'] },
        { c: '并购重组', qs: ['并购估值怎么做', '杠杆收购 LBO 是什么', '并购支付方式有哪几种', '要约收购怎么理解'] },
        { c: '宏观货币', qs: ['美元为什么影响黄金', '美债收益率是什么', '加息降息如何影响汇率', '股票和债券的区别'] }
      ];
      var chipset = document.getElementById('qa-chipset');
      function renderChips(cat) {
        var g = GROUPS.filter(function (x) { return x.c === cat; })[0] || GROUPS[0];
        chipset.innerHTML = '';
        g.qs.forEach(function (q) {
          var b = document.createElement('button');
          b.type = 'button'; b.textContent = q; b.setAttribute('data-q', q);
          chipset.appendChild(b);
        });
      }
      document.getElementById('qa-tabs').addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('button[data-cat]') : null;
        if (!b) return;
        var all = this.querySelectorAll('button');
        for (var i = 0; i < all.length; i++) all[i].classList.toggle('on', all[i] === b);
        renderChips(b.getAttribute('data-cat'));
      });
      chipset.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('button[data-q]') : null;
        if (b) ask(b.getAttribute('data-q'));
      });

      // ---------- 提问 ----------
      var SEND_SVG = sendBtn.innerHTML;
      var STOP_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="#fff"><rect x="5" y="5" width="14" height="14" rx="2.5"/></svg>';
      function ask(q, opts) {
        opts = opts || {};
        q = String(q || '').trim();
        if (!q || busy) return;
        var u = addRow('u');
        u.bub.innerHTML = '<p>' + esc(q) + '</p>';
        var b = addRow('b');
        b.bub.setAttribute('data-ask', q);
        // v48：阶段指示器（真实事件驱动）+ 首字计时
        b.bub.innerHTML = phaseHTML(0) + '<span class="qa-typing" aria-label="正在思考"><i></i><i></i><i></i></span>';
        history.push({ role: 'user', content: q });
        busy = true; aborted = false;
        sendBtn.classList.add('stop');
        sendBtn.innerHTML = STOP_SVG;
        sendBtn.setAttribute('aria-label', '停止生成');
        setStatus('busy', '思考中…');
        var full = '';
        var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
        var ttfb = 0;
        var done = function (finalText, local) {
          b.bub.classList.remove('streaming');
          b.bub.innerHTML = (local ? '' : phaseHTML(2)) + mdToHtml(finalText);
          var foot = document.createElement('span');
          foot.className = 'qf';
          foot.innerHTML = local
            ? '来源：<b>本地知识库</b>（联网调用大模型失败时自动回落）'
            : '来源：<b>智谱 GLM + 课程知识库检索</b> · 生成内容仅供学习参考，不构成投资建议';
          b.bub.appendChild(foot);
          addTools(b.row, b.main, b.bub, finalText, qaRelated(q));
          // v49：可核验依据面板（默认折叠的 details；实测用时 + 站内匹配到的章节/案例 + 兜底如实标注）
          var nowT = (window.performance && performance.now) ? performance.now() : Date.now();
          addBasis(b.main, q, local, local ? null : { ttfbMs: ttfb, totalMs: nowT - t0, chars: (finalText || '').length });
          history.push({ role: 'assistant', content: finalText });
          lastReply = finalText;
          // ★行为埋点：AI 问答次数。此前全站没有任何 track('qa', …) 调用，
          //   导致教师看板「AI 问答」永远是 0 —— 作答/学习都记，唯独提问没记。
          //   埋点放在 done（无论云端还是本地知识库回落，都会走到），保证问答必计。
          //  § q 不入库，沿用既有做法只记类型与长度，避免把学生提问原文写进行为表。
          if (window.__ibankTrack) {
            try { window.__ibankTrack('qa', { chars: (finalText || '').length, local: local ? 1 : 0 }); } catch (e) {}
          }
          busy = false;
          sendBtn.classList.remove('stop');
          sendBtn.innerHTML = SEND_SVG;
          sendBtn.setAttribute('aria-label', '发送');
          setStatus('ready', '就绪');
          log.scrollTop = log.scrollHeight;
          if (tts.on && ttsAvailable()) speak(finalText);
        };
        if (opts.fresh) { history.pop(); }
        var msgs = history.slice(-12);
        streamFromSCF(msgs, function (delta) {
          if (aborted) return;
          if (!full) {
            ttfb = ((window.performance && performance.now) ? performance.now() : Date.now()) - t0;
            b.bub.classList.add('streaming');
            b.bub.innerHTML = phaseHTML(2) + mdToHtml(full);
          }
          full += delta;
          b.bub.classList.add('streaming');
          b.bub.innerHTML = phaseHTML(2) + mdToHtml(full);
          log.scrollTop = log.scrollHeight;
        }).then(function () {
          if (aborted) { done(full || '（已停止生成）', false); return; }
          if (!full) { done(answer(q), true); return; }
          done(full, false);
        }).catch(function () {
          done(answer(q), true);
        });
      }

      // ---------- 事件绑定 ----------
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (busy) {
          aborted = true;
          try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (err) { }
          return;
        }
        var q = input.value.trim();
        if (!q) return;
        input.value = '';
        input.style.height = 'auto';
        ask(q);
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.dispatchEvent(new Event('submit', { cancelable: true })); }
      });
      input.addEventListener('input', function () {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      });
      // 欢迎卡快问 + 相关跳转（事件委托挂对话容器；站内 data-goto 委托只在 #chapter-main 内，本区自行委托）
      log.addEventListener('click', function (e) {
        var qb = e.target.closest ? e.target.closest('button[data-q]') : null;
        if (qb) { ask(qb.getAttribute('data-q')); return; }
        var a = e.target.closest ? e.target.closest('[data-goto]') : null;
        if (!a) return;
        e.preventDefault(); e.stopPropagation();
        var t = a.getAttribute('data-goto');
        if (t === 'p-case' && a.getAttribute('data-case')) {
          var cid = a.getAttribute('data-case');
          var b = document.querySelector('.tab-btn[data-page="p-case"]'); if (b) b.click();
          setTimeout(function () {
            if (window.__ibankCaseShow) { window.__ibankCaseShow(cid); return; }
            var el = document.getElementById(cid);
            if (el) { el.classList.add('open'); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
          }, 80);
          return;
        }
        var b2 = document.querySelector('.tab-btn[data-page="' + t + '"]'); if (b2) b2.click();
        var ch = a.getAttribute('data-ch');
        if (ch && window.__ibankChapterGo) setTimeout(function () { window.__ibankChapterGo(ch); }, 60);
      });
      // 清空对话
      document.getElementById('qa-clear').addEventListener('click', function () {
        history.length = 0; lastReply = ''; log.innerHTML = ''; renderWelcome();
        ibankToast('对话已清空');
      });
      // 自动朗读开关
      voiceBtn.addEventListener('click', function () {
        if (!ttsAvailable()) { ibankToast('未检测到可用的系统中文语音'); return; }
        if (tts.on) { tts.on = false; stopSpeak(); syncVoiceBtn(); ibankToast('已关闭自动朗读'); return; }
        tts.on = true; syncVoiceBtn();
        ibankToast('已开启自动朗读（' + tts.voice.name + '）');
        if (lastReply) speak(lastReply);
      });
      // 音色设置浮层
      vsetBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = vpanel.hidden;
        vpanel.hidden = !open;
        vsetBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.addEventListener('click', function (e) {
        if (vpanel.hidden) return;
        if (vpanel.contains(e.target) || vsetBtn.contains(e.target)) return;
        vpanel.hidden = true;
        vsetBtn.setAttribute('aria-expanded', 'false');
      });

      renderWelcome();
      renderChips('投行业务');
      initTTS();
      syncVoiceBtn();
      window.addEventListener('beforeunload', function () { stopSpeak(); });
    })();

    // ===== 学习计时器（章节 / 习题复用） + 全局提示 =====
    function ibankFmtTime(s) { var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60; var p = function (n) { return (n < 10 ? '0' : '') + n; }; return h > 0 ? h + ':' + p(m) + ':' + p(ss) : p(m) + ':' + p(ss); }
    function ibankMakeTimer(mountEl, storeKey, autoDoneKey, onAuto) {
      var acc = 0; try { acc = parseInt(localStorage.getItem(storeKey) || '0', 10) || 0; } catch (e) {}
      var sess = 0;
      mountEl.innerHTML = '<span class="timer-chip">⏱ 本次 <b class="t-sess">00:00</b> · 累计 <b class="t-acc">' + ibankFmtTime(acc) + '</b></span>';
      var sessEl = mountEl.querySelector('.t-sess'), accEl = mountEl.querySelector('.t-acc');
      var last = Date.now(), saved = 0, fired = false;
      document.addEventListener('visibilitychange', function () { if (!document.hidden) last = Date.now(); });
      var iv = setInterval(function () {
        var now = Date.now();
        if (document.hidden) { last = now; return; }
        var dt = Math.floor((now - last) / 1000); last = now;
        if (dt < 1) return; sess += dt; acc += dt;
        sessEl.textContent = ibankFmtTime(sess); accEl.textContent = ibankFmtTime(acc);
        saved += dt; if (saved >= 5) { try { localStorage.setItem(storeKey, String(acc)); } catch (e) {} saved = 0; }
        if (acc >= 3600 && !fired) {
          var done = false; try { done = !!localStorage.getItem(autoDoneKey); } catch (e) {}
          if (!done) { fired = true; try { localStorage.setItem(autoDoneKey, '1'); } catch (e) {} if (onAuto) onAuto(); }
        }
      }, 1000);
      return { stop: function () { clearInterval(iv); try { localStorage.setItem(storeKey, String(acc)); } catch (e) {} } };
    }
    function ibankToast(msg) {
      var t = document.getElementById('ibank-toast');
      if (!t) { t = document.createElement('div'); t.id = 'ibank-toast'; document.body.appendChild(t); }
      t.textContent = msg; t.classList.add('show');
      clearTimeout(window.__ibankToastT); window.__ibankToastT = setTimeout(function () { t.classList.remove('show'); }, 2600);
    }

    // ===== 习题训练 + 错题定位（按章节 / 题型分类） =====
    (function () {
      const TYPES = ['名词解释', '选择', '简答', '案例'];
      // 题库：覆盖第0章 导论 + 第1–7章（与教学日历一致）；题量按教学大纲「各章学时」加权（第3、4章各8学时，题量最多）
      //   客观题（单选）：{ q, opts:[4-5项], a:正确项下标, kp, chapter, type:'选择' }
      //   客观题（多选）：{ q, opts:[4-5项], a:[正确项下标...], multi:true, kp, chapter, type:'选择' }
      //   主观题：{ q, opts:null, a:-1, kp, chapter, type:'名词解释'|'简答'|'案例', pts:[要点关键词...], ans:'参考答案' }
      const QUIZ = [
        /* ================= 第1章 投资银行概述（14题） ================= */
        { q: '下列关于投资银行与商业银行区别的说法，正确的是？', opts: ['投资银行主要经营存贷款业务', '商业银行主要经营证券承销业务', '投资银行主要服务于资本市场，商业银行主要服务于货币市场', '两者的监管机构完全相同', '两者都不受金融监管'], a: 2, kp: '投行与商行区别', chapter: '第1章', type: '选择' },
        { q: '我国投资银行最主要的存在形式是？', opts: ['独立的私人投资银行', '证券公司', '商业银行内设投行部', '财务公司'], a: 1, kp: '投行存在形式', chapter: '第1章', type: '选择' },
        { q: '投资银行最传统、最本源的核心业务是？', opts: ['证券承销', '资产管理', '证券投资咨询', '做市交易'], a: 0, kp: '投行主要业务', chapter: '第1章', type: '选择' },
        { q: '下列属于投资银行「卖方业务」（为发行人服务）的是？', opts: ['证券承销', '证券经纪', '资产管理', '投资顾问'], a: 0, kp: '投行主要业务', chapter: '第1章', type: '选择' },
        { q: '合伙制投资银行区别于公司制的最大特点是？', opts: ['普通合伙人对债务承担无限责任', '需要双重征税', '股东人数无上限', '不能开展承销业务'], a: 0, kp: '组织形式', chapter: '第1章', type: '选择' },
        { q: '下列不属于投资银行对经济促进作用的是？', opts: ['促进储蓄向投资转化', '提高资源配置效率', '直接创造基础货币', '推动企业完善治理结构'], a: 2, kp: '投行经济功能', chapter: '第1章', type: '选择' },
        { q: '我国证券公司的日常监管机构是？', opts: ['中国人民银行', '中国证监会', '国家金融监督管理总局', '财政部'], a: 1, kp: '投行监管', chapter: '第1章', type: '选择' },
        { q: '「一行一局一会」中的「一局」指的是？', opts: ['国家外汇管理局', '国家金融监督管理总局', '国家税务总局', '国务院国资委'], a: 1, kp: '投行监管', chapter: '第1章', type: '选择' },
        { q: '投资银行在资本市场中主要发挥的核心中介功能是？', opts: ['为资金盈余方与需求方提供期限转换与信用转换', '创造货币供给', '承担最后贷款人职责', '办理国际结算'], a: 0, kp: '投行经济功能', chapter: '第1章', type: '选择' },
        { q: '下列关于投资银行与商业银行资金来源与风险特征的比较，正确的有？', opts: ['投资银行不得吸收公众存款', '商业银行以存款为主要负债来源', '投资银行市场风险与操作风险较为突出', '商业银行信用风险与流动性风险较为突出', '投资银行以吸收存款为主要资金来源'], a: [0, 1, 2, 3], multi: true, kp: '投行与商行区别', chapter: '第1章', type: '选择' },
        { q: '投资银行', opts: null, a: -1, kp: '投行概念', chapter: '第1章', type: '名词解释', pts: ['资本市场', '非银行金融机构', '证券发行与承销', '资金供求', '中介'], ans: '投资银行是主要从事证券发行与承销、证券交易经纪、企业并购重组、资产管理、财务顾问等资本市场业务的非银行金融机构，是资本市场上连接资金供求双方的核心中介，与商业银行同属金融中介但业务领域不同。' },
        { q: '证券承销', opts: null, a: -1, kp: '证券承销', chapter: '第1章', type: '名词解释', pts: ['代销', '包销', '发行风险', '代为销售'], ans: '证券承销是指投资银行接受证券发行人委托，依照协议代为向社会投资者销售其发行证券的行为。按风险承担方式可分为代销（不承担发行风险）与包销（承担未售出部分风险）。' },
        { q: '简述投资银行与商业银行的主要区别。', opts: null, a: -1, kp: '投行与商行区别', chapter: '第1章', type: '简答', pts: ['业务领域', '资金来源', '直接融资', '间接融资', '监管', '风险特征'], ans: '①业务领域：投行主营资本市场业务（承销、经纪、并购、资管），商业银行主营货币市场业务（存贷款、结算）；②资金来源：投行不得吸收公众存款，主要依靠自有资本与短期融资，商业银行以存款为主要负债；③服务功能：投行服务直接融资，商业银行服务间接融资；④监管要求：资本充足率、流动性、风险准备等监管指标不同，投行更强调信息隔离与合规；⑤风险特征：投行市场风险与操作风险突出，商业银行信用风险与流动性风险突出。' },
        { q: '简述投资银行的主要组织形式及其优缺点。', opts: null, a: -1, kp: '组织形式', chapter: '第1章', type: '简答', pts: ['合伙制', '有限责任', '股份', '无限责任', '双重征税', '金融控股'], ans: '①合伙制：普通合伙人承担无限责任，出资人有限、规模受制约，但激励直接、决策灵活、声誉约束强；②有限责任公司制：股东以出资额为限承担有限责任，但存在公司税与股东税的双重征税问题；③股份有限公司制：可通过资本市场融资、规模易于扩张、治理相对规范，但决策链条长、易出现内部人控制；④金融控股集团：业务协同、范围经济显著，但存在风险传染、利益冲突与监管空白等问题，需以信息隔离墙与并表监管加以约束。' },
        { q: '某券商在为某上市公司提供并购财务顾问服务的同时，其自营账户持有并交易该公司股票。这属于什么问题？应采取哪些管理措施？', opts: null, a: -1, kp: '利益冲突', chapter: '第1章', type: '案例', pts: ['信息隔离墙', '限制清单', '内幕信息', '合规审查', '利益冲突', '信息披露'], ans: '属于典型的利益冲突与内幕信息风险。管理措施：①建立并严格执行信息隔离墙（Chinese Wall），将投行部门与研究、自营部门在物理、人员、信息系统上隔离；②建立限制清单/观察清单，对涉密项目相关人员实施交易限制；③严禁利用内幕信息从事交易或建议他人交易；④合规部门事前审查与事后监控，异常交易实时报告；⑤按规定进行信息披露与利益冲突声明；⑥对违规人员追究内部纪律与法律责任。' },

        /* ================= 第2章 企业融资方案设计（18题） ================= */
        { q: '销售百分比法预测融资需求的核心假设是？', opts: ['资产负债项目随销售收入同比例变动', '市场利率固定不变', '企业资产规模保持不变', '净利润全部留存'], a: 0, kp: '融资需求预测', chapter: '第2章', type: '选择' },
        { q: '内部融资的主要来源是？', opts: ['留存收益与折旧', '银行贷款', '增发股票', '发行债券'], a: 0, kp: '内部融资', chapter: '第2章', type: '选择' },
        { q: '按照优序融资理论，企业融资方式的首选是？', opts: ['公开增发股票', '发行公司债券', '内部留存收益', '银行短期借款'], a: 2, kp: '优序融资理论', chapter: '第2章', type: '选择' },
        { q: '下列融资方式中，会直接稀释原有股东控制权的是？', opts: ['发行公司债券', '公开增发新股', '银行长期借款', '融资租赁'], a: 1, kp: '控制权稀释', chapter: '第2章', type: '选择' },
        { q: '债务融资相对于股权融资的核心优势是？', opts: ['没有还本付息压力', '利息可税前扣除，具有税盾效应', '不增加财务风险', '无须对外信息披露'], a: 1, kp: '融资方式比较', chapter: '第2章', type: '选择' },
        { q: '企业处于满负荷运转状态时，销售增长所需的资产增加应？', opts: ['全部由内部留存解决', '按同比例追加资产，形成外部融资需求', '无须追加资产', '全部由折旧提供'], a: 1, kp: '外部融资需求', chapter: '第2章', type: '选择' },
        { q: '关于认股权证（warrant），下列说法正确的是？', opts: ['持有人有权在约定期间按约定价格认购公司新股', '持有人可获得固定利息', '认股权证属于纯债务融资工具', '行使时不会增加公司股本'], a: 0, kp: '认股权证', chapter: '第2章', type: '选择' },
        { q: '融资租赁相较于银行借款的主要特点是？', opts: ['兼具融资与融物功能，租期长且通常不可随意解约', '租金可随时调整', '不构成企业的负债', '无须支付任何费用'], a: 0, kp: '融资租赁', chapter: '第2章', type: '选择' },
        { q: '关于留存收益（内部股权）融资，下列说法正确的是？', opts: ['其机会成本相当于股东要求的必要报酬率', '完全没有成本', '必须支付固定股息', '会稀释控制权'], a: 0, kp: '内部融资', chapter: '第2章', type: '选择' },
        { q: '企业提高资产负债率可能带来的主要后果是？', opts: ['财务杠杆收益增大，但财务风险与破产成本同步上升', '财务风险下降', '利息支出减少', '股东控制权被稀释'], a: 0, kp: '资本结构', chapter: '第2章', type: '选择' },
        { q: '企业进行融资方案设计时，通常需要权衡的核心关系包括？', opts: ['融资成本与融资风险', '控制权稀释程度', '资本结构与企业价值', '融资期限与资产期限的匹配', '承销商的品牌知名度'], a: [0, 1, 2, 3], multi: true, kp: '融资方式选择', chapter: '第2章', type: '选择' },
        { q: '「融资需求预测」', opts: null, a: -1, kp: '融资需求预测', chapter: '第2章', type: '名词解释', pts: ['销售增长', '资金总量', '外部融资缺口', '销售百分比法'], ans: '融资需求预测是指企业依据未来经营计划与销售增长目标，测算所需资金总量及其结构（内部可提供量与外部缺口）的过程，常用方法包括销售百分比法、回归分析法与资金习性法，是制定融资方案的前提。' },
        { q: '「优序融资理论」', opts: null, a: -1, kp: '优序融资理论', chapter: '第2章', type: '名词解释', pts: ['信息不对称', '内部留存收益', '债务融资', '股权融资', '负面信号'], ans: '优序融资理论由迈尔斯（Myers）提出，认为在信息不对称条件下，企业的融资偏好顺序为「内部留存收益 → 债务融资 → 股权融资」。因为外部股权融资向市场传递股价被高估的负面信号，且发行成本最高，故企业管理者会优先使用内部资金，其次举债，最后才增发股票。' },
        { q: '「销售百分比法」', opts: null, a: -1, kp: '融资需求预测', chapter: '第2章', type: '名词解释', pts: ['销售收入', '同比例变动', '外部融资需求', '留存收益'], ans: '销售百分比法是以预计销售收入为基础，假设资产负债表中的经营性资产与经营性负债随销售收入同比例变动，据此测算预计资产增加额、负债自然增加额与留存收益增加额，进而倒推出外部融资需求（EFN）的方法。其优点是简便直观，局限是假设资产周转率与销售净利率保持不变。' },
        { q: '简述企业选择融资方式时应考虑的主要因素。', opts: null, a: -1, kp: '融资方式选择', chapter: '第2章', type: '简答', pts: ['资金需求', '融资成本', '控制权', '财务风险', '信息不对称', '政策环境'], ans: '①资金需求规模与期限结构匹配；②融资成本（利息、股息、发行费用、税盾效应）；③对控制权的影响（是否稀释股权、是否引入新股东）；④财务风险与偿债能力（资产负债率、利息保障倍数、现金流覆盖倍数）；⑤企业与资本市场之间的信息不对称程度及当前股价水平；⑥宏观与政策环境（利率走势、信贷政策、注册制下的再融资条件、行业景气度）。' },
        { q: '简述权益融资与债务融资的要点差异。', opts: null, a: -1, kp: '融资方式比较', chapter: '第2章', type: '简答', pts: ['还本付息', '税盾', '稀释控制权', '财务风险', '融资成本'], ans: '权益融资（IPO、增发、配股）：无须还本付息、降低财务风险、改善资产负债结构，但会稀释原有股东控制权、股息不可税前扣除、发行成本较高且可能传递负面信号。债务融资（借款、债券）：具有税盾效应、不稀释控制权、融资成本相对较低，但须按期付息还本、增加财务风险与偿债压力、可能触发财务困境成本。实务中应权衡成本—风险—控制权三者关系，优化资本结构。' },
        { q: '简述内部融资与外部融资的主要区别。', opts: null, a: -1, kp: '内部融资', chapter: '第2章', type: '简答', pts: ['留存收益', '折旧', '融资成本', '控制权', '信息披露'], ans: '①来源不同：内部融资来自企业自身的留存收益与折旧等内部积累；外部融资来自银行贷款、发行债券、增发股票等外部资金。②成本不同：内部融资无须支付发行费用与承销费，成本相对较低，但存在股东要求必要报酬率的机会成本。③对控制权影响：内部融资不稀释股权、不改变控制权结构；外部股权融资会稀释原股东持股比例。④信息与约束：外部融资通常需履行信息披露义务，并受债权人或监管条款约束（如募集资金用途、财务指标限制）。⑤规模与速度：内部融资规模受企业盈利能力限制，外部融资可快速募集较大规模资金。' },
        { q: '某制造企业销售净利率 8%、股利支付率 40%，预计销售收入增长 25%，资产与负债均随销售同比例变动。若仅依靠内部留存，能否满足扩张需要？请说明测算思路。', opts: null, a: -1, kp: '外部融资需求', chapter: '第2章', type: '案例', pts: ['留存比率', '资产同比例增加', '外部融资需求', '资产负债率', '财务风险'], ans: '仅靠内部留存难以完全满足。留存比率=1−40%=60%。销售增长 25% 需要资产同比例增加 25%，而内部留存收益的增加幅度取决于销售净利率与留存比率（本例约为 8%×60%=4.8% 的销售增长支撑能力），小于 25% 的资产扩张需求，故存在外部融资缺口。测算思路：外部融资需求 EFN = 预计资产增加额（基期资产×销售增长率）− 预计负债自然增加额（基期负债×销售增长率）− 预计留存收益增加额（预计销售收入×销售净利率×留存比率）。缺口可通过债务融资（优先）或股权融资（其次）弥补，并需评估资产负债率上升带来的财务风险。' },
        { q: '某企业现有资产负债率 65%，拟投资 5 亿元新项目，方案 A 为全部银行借款（利率 5%），方案 B 为增发股票。该项目预计年息税前利润 1.2 亿元，企业所得税率 25%。请从财务风险与股东回报角度分析两种方案的利弊。', opts: null, a: -1, kp: '资本结构', chapter: '第2章', type: '案例', pts: ['利息', '税盾', '摊薄', '财务风险', '资产负债率', '混合融资'], ans: '方案A（全借款）：年利息 = 5 × 5% = 0.25 亿元，税后利润 =（1.2 − 0.25）×（1 − 25%）= 0.7125 亿元，全部归原股东，原有股东回报被增厚（财务杠杆的正向作用）；但资产负债率将升至约 70% 以上，财务风险与再融资压力显著上升，若项目收益不达预期，利息负担可能吞噬利润甚至引发流动性危机。方案B（增发股票）：无固定利息负担、财务风险低，但会摊薄原股东持股比例与每股收益，并可能向市场传递股价被高估的负面信号。建议：在项目现金流稳定、可覆盖本息的前提下，优先采用适度债务融资以利用税盾效应；同时控制杠杆水平，可考虑「部分借款 + 部分股权」的混合方案，兼顾税盾收益与财务安全。' },

        /* ================= 第3章 股份有限公司与首次公开发行（24题） ================= */
        { q: '我国股票发行目前实行的审核（注册）制度是？', opts: ['行政审批制', '核准制', '注册制', '备案登记制'], a: 2, kp: '发行制度', chapter: '第3章', type: '选择' },
        { q: '市盈率法确定股票发行价的基本公式是？', opts: ['发行价 = 每股收益 × 可比市盈率', '发行价 = 每股净资产 × 市净率', '发行价 = 未来现金流折现值', '发行价 = 每股收入 × 市销率'], a: 0, kp: '发行定价', chapter: '第3章', type: '选择' },
        { q: '关于 IPO 折价（underpricing）现象，下列说法正确的是？', opts: ['发行人让渡部分利益，中签投资者获得正的初始收益', '说明本次发行失败', '与信息不对称无关', '折价幅度越高对发行人越有利'], a: 0, kp: 'IPO折价', chapter: '第3章', type: '选择' },
        { q: '保荐机构开展尽职调查的核心目的是？', opts: ['抬高发行价格', '缓解信息不对称、揭示并控制风险，保证信息披露真实准确完整', '缩短审核周期', '扩大募集资金规模'], a: 1, kp: '尽职调查', chapter: '第3章', type: '选择' },
        { q: '我国股票发行中「网上定价发行」主要的申购对象是？', opts: ['仅限战略投资者', '社会公众投资者（网上投资者）', '仅限机构投资者', '仅限内部职工'], a: 1, kp: '股票发行方式', chapter: '第3章', type: '选择' },
        { q: '借壳上市相较于首次公开发行的主要特点是？', opts: ['审核环节相对较少、上市周期较短，但需支付壳资源成本并承担整合风险', '无须达到任何上市标准', '无法实现融资功能', '不会稀释任何股东的控制权'], a: 0, kp: '借壳上市', chapter: '第3章', type: '选择' },
        { q: 'IPO 中「绿鞋机制」（超额配售选择权）的主要作用是？', opts: ['稳定上市后一段时期内的股价波动', '提高承销费率', '延长股份锁定期', '降低发行市盈率'], a: 0, kp: '绿鞋机制', chapter: '第3章', type: '选择' },
        { q: '股份公司公开发行股票并上市，通常不需要满足的财务条件是？', opts: ['最近三年净利润为正且累计达到一定规模', '发行后股本总额符合规定要求', '最近三年营业收入累计达到一定规模', '必须连续三年分红且不低于净利润的50%'], a: 3, kp: '上市条件', chapter: '第3章', type: '选择' },
        { q: '招股说明书在法律性质上属于？', opts: ['要约邀请', '要约', '承诺', '正式合同'], a: 0, kp: '信息披露', chapter: '第3章', type: '选择' },
        { q: '关于我国科创板、创业板对未盈利企业上市的安排，正确的是？', opts: ['设置多元上市标准，允许符合条件的企业在未盈利状态下上市', '完全不允许未盈利企业上市', '是否盈利由发行人自行声明决定', '由承销商担保发行人盈利'], a: 0, kp: '上市条件', chapter: '第3章', type: '选择' },
        { q: '绿鞋机制中，承销商超额发售股份的数量通常不超过本次发行数量的？', opts: ['15%', '30%', '50%', '没有上限'], a: 0, kp: '绿鞋机制', chapter: '第3章', type: '选择' },
        { q: '注册制下的股票发行审核，具有下列哪些特点？', opts: ['以信息披露为中心', '监管机构不对投资价值作实质性判断', '中介机构承担核查把关的看门人责任', '发行人需充分披露信息并对真实性负责', '审核通过即代表监管机构保证其投资价值'], a: [0, 1, 2, 3], multi: true, kp: '发行制度', chapter: '第3章', type: '选择' },
        { q: 'IPO 过程中，投资银行（保荐承销机构）的主要工作包括？', opts: ['改制辅导与规范运作', '开展尽职调查', '承销保荐与发行定价', '上市后持续督导', '代替发行人作出日常经营决策'], a: [0, 1, 2, 3], multi: true, kp: 'IPO流程', chapter: '第3章', type: '选择' },
        { q: '首次公开发行中，可能影响发行定价的因素包括？', opts: ['公司盈利水平与每股收益', '同行业可比公司市盈率', '行业景气度与市场情绪', '发行规模与募集资金用途', '承销商办公地址'], a: [0, 1, 2, 3], multi: true, kp: '发行定价', chapter: '第3章', type: '选择' },
        { q: '「首次公开发行（IPO）」', opts: null, a: -1, kp: 'IPO', chapter: '第3章', type: '名词解释', pts: ['首次', '社会公众', '公开发行股票', '证券交易所', '直接融资'], ans: '首次公开发行（Initial Public Offering）是指股份有限公司首次向社会公众公开发行股票并在证券交易所申请上市交易的行为，是企业进入资本市场进行直接融资、实现股权社会化与规范化运作的关键环节。' },
        { q: '「借壳上市」', opts: null, a: -1, kp: '借壳上市', chapter: '第3章', type: '名词解释', pts: ['收购控制权', '壳公司', '反向收购', '间接上市', '壳资源'], ans: '借壳上市是指非上市公司通过收购已上市公司（壳公司）的控制权，再由壳公司反向收购自身资产与业务，从而绕过 IPO 实现间接上市的方式。其特点是周期相对较短，但需支付壳资源成本，并面临整合与合规风险。' },
        { q: '「IPO 折价」', opts: null, a: -1, kp: 'IPO折价', chapter: '第3章', type: '名词解释', pts: ['发行定价', '低于', '首日价格', '初始收益', '信息不对称'], ans: 'IPO 折价（underpricing）是指新股发行定价普遍低于上市首日市场价格的現象，使中签投资者获得正的初始收益。主要解释包括：信息不对称导致的「赢家诅咒」、承销商为降低销售风险而压低定价、以及向投资者让渡利益以换取询价配合等。' },
        { q: '「尽职调查」', opts: null, a: -1, kp: '尽职调查', chapter: '第3章', type: '名词解释', pts: ['核查验证', '信息披露', '真实准确完整', '中介机构', '风险揭示'], ans: '尽职调查（Due Diligence）是指保荐机构、会计师、律师等中介机构在证券发行前，对发行人的经营、财务、法律、税务等各方面情况进行全面核查与验证的过程。其目的是揭示风险、保证信息披露真实准确完整，缓解发行人与投资者之间的信息不对称，是注册制下中介机构履行「看门人」责任的基础。' },
        { q: '「询价制度」', opts: null, a: -1, kp: '发行定价', chapter: '第3章', type: '名词解释', pts: ['机构投资者', '累计投标', '发行价格', '配售'], ans: '询价制度是指在股票发行定价中，向符合条件的机构投资者进行初步询价与累计投标询价，根据其报价与申购数量确定发行价格与配售结果的定价机制。它是我国现行市场化定价的主流方式，能够反映机构投资者对公司价值的判断，减少发行人与投资者之间的信息不对称。' },
        { q: '简述首次公开发行的主要流程。', opts: null, a: -1, kp: 'IPO流程', chapter: '第3章', type: '简答', pts: ['改制', '尽职调查', '申报', '审核注册', '路演与定价', '发行承销', '上市'], ans: '①改制设立股份公司并规范运作；②聘请保荐机构、会计师事务所、律师事务所等中介机构并开展尽职调查；③制作招股说明书等申报文件并提交申请；④证券交易所审核、中国证监会注册；⑤路演推介、询价与定价；⑥发行承销（网下向机构配售、网上向社会公众发行，可设超额配售选择权）；⑦刊登上市公告书并挂牌交易；⑧上市后持续督导与信息披露。' },
        { q: '简述股票发行定价的主要方法及其适用范围。', opts: null, a: -1, kp: '发行定价', chapter: '第3章', type: '简答', pts: ['市盈率法', '市净率法', '现金流折现', '可比公司法', '询价'], ans: '①市盈率法：发行价=每股收益×可比市盈率，适用于盈利稳定、可比公司较多的企业；②市净率法：适用于银行、保险等重资产或金融类企业；③现金流折现法（DCF）：绝对估值法，适用于现金流可预测、增长稳定的企业；④可比公司/可比交易法：横向比较定价，适用于行业可比样本充分的情形；⑤累计投标询价（市场竞价）法：由机构投资者询价形成价格，市场化程度最高，是我国现行主流方式。定价还需考虑公司基本面、行业景气、市场情绪与发行规模。' },
        { q: '简述注册制与核准制的主要区别。', opts: null, a: -1, kp: '发行制度', chapter: '第3章', type: '简答', pts: ['信息披露', '实质判断', '审核效率', '中介机构责任', '市场自主决策'], ans: '①审核理念：核准制下监管机构对发行人的投资价值作实质性判断并决定是否核准；注册制下以信息披露为中心，监管机构不作实质价值判断。②审核效率：注册制下审核流程更透明、周期更可预期（如交易所审核 + 证监会注册）。③责任划分：注册制强化发行人信息披露第一责任与中介机构的核查把关责任（看门人责任），违规成本更高。④定价与配售：注册制下市场化询价定价，定价权更多交给市场。⑤投资者保护：由「监管背书」转向「买者自负」，同时以更严格的信息披露与事后追责保护投资者。' },
        { q: '某公司发行前股本 1 亿股、净资产 4 亿元、净利润 5000 万元，拟公开发行 2500 万股。若按 20 倍市盈率定价，承销费率 5%，请计算发行价、募集资金总额与净额、发行后每股净资产分别约为多少。', opts: null, a: -1, kp: '发行定价', chapter: '第3章', type: '案例', pts: ['每股收益', '市盈率', '募集资金', '承销费', '每股净资产'], ans: '①发行后总股本 = 10000 + 2500 = 12500 万股；②摊薄每股收益 = 5000 万 ÷ 12500 万 = 0.40 元/股；③发行价 = 0.40 × 20 = 8.00 元/股；④募集资金总额 = 2500 万股 × 8 元 = 2.00 亿元；⑤承销保荐费 = 2.00 亿 × 5% = 0.10 亿元；⑥募集资金净额 = 2.00 − 0.10 = 1.90 亿元；⑦发行后净资产 = 4.00 + 1.90 = 5.90 亿元；⑧发行后每股净资产 = 5.90 亿 ÷ 1.25 亿股 = 4.72 元/股。可见发行价（8 元）显著高于发行后每股净资产（4.72 元），差额体现了市场对公司盈利能力的溢价，也提示投资者关注市盈率与实际盈利的匹配性。' },
        /* ================= 第4章 上市公司再融资（24题） ================= */
        { q: '下列不属于上市公司再融资方式的是？', opts: ['公开增发', '配股', '发行可转换公司债券', '首次公开发行'], a: 3, kp: '再融资方式', chapter: '第4章', type: '选择' },
        { q: '配股与增发的核心区别在于？', opts: ['配股向原股东按持股比例优先配售，增发面向不特定对象或特定对象', '配股不能募集资金', '增发不会稀释股权', '配股必须在交易所之外进行'], a: 0, kp: '配股与增发', chapter: '第4章', type: '选择' },
        { q: '关于可转换公司债券，下列说法正确的是？', opts: ['持有人可在约定期间按转股价格将其转换为发行人股票', '票面利率通常高于同期限普通公司债', '不具有任何债权性质', '转股价格越高对投资者越有利'], a: 0, kp: '可转换公司债券', chapter: '第4章', type: '选择' },
        { q: '可交换公司债券与可转换公司债券的关键区别是？', opts: ['可交换债的标的为发行人持有的其他公司股票，可转债的标的为发行人自身股票', '可交换债不能上市交易', '可转债不设转股价格', '两者在条款设计上完全相同'], a: 0, kp: '可交换公司债券', chapter: '第4章', type: '选择' },
        { q: '非公开发行（定向增发）的主要特点是？', opts: ['向不超过规定数量的特定投资者发行，定价可有一定折价、股份有锁定期', '面向全体社会公众投资者发行', '无须履行任何审核程序', '发行价必须高于市场价格'], a: 0, kp: '非公开发行', chapter: '第4章', type: '选择' },
        { q: '上市公司发行股份购买资产时，投资银行通常承担的角色是？', opts: ['独立财务顾问', '会计师事务所审计', '资产评估机构', '交易所审核人员'], a: 0, kp: '财务顾问', chapter: '第4章', type: '选择' },
        { q: '可转债「转股价格向下修正条款」的主要作用是？', opts: ['当股价持续低于转股价时下调转股价，保护投资者并促进转股', '提高债券票面利率', '延长债券到期期限', '赋予发行人强制赎回权'], a: 0, kp: '可转换公司债券', chapter: '第4章', type: '选择' },
        { q: '再融资业务中承销风险的主要来源是？', opts: ['定价过高导致发行失败或产生包销余额', '信息披露过于充分', '市场利率持续下降', '投资者认购过于踊跃'], a: 0, kp: '承销风险', chapter: '第4章', type: '选择' },
        { q: '配股除权后，公司股票价格通常如何变化？', opts: ['因总股本扩大而向下调整（除权）', '因总股本扩大而向上调整', '始终保持不变', '由交易所随机确定'], a: 0, kp: '配股', chapter: '第4章', type: '选择' },
        { q: '公开增发的发行对象通常是？', opts: ['不特定的社会公众投资者', '仅控股股东', '仅机构投资者', '仅公司内部职工'], a: 0, kp: '增发', chapter: '第4章', type: '选择' },
        { q: '关于非公开发行（定向增发），下列说法正确的有？', opts: ['向不超过规定数量的特定投资者发行', '发行价可相对市价有一定折价', '认购股份通常设有锁定期', '面向全体社会公众公开发行', '不需要履行任何信息披露义务'], a: [0, 1, 2], multi: true, kp: '非公开发行', chapter: '第4章', type: '选择' },
        { q: '可转换公司债券通常包含的条款有？', opts: ['转股价格与转股期', '转股价格向下修正条款', '赎回条款（发行人权利）', '回售条款（投资者权利）', '无限制的随时转股条款'], a: [0, 1, 2, 3], multi: true, kp: '可转换公司债券', chapter: '第4章', type: '选择' },
        { q: '「配股」', opts: null, a: -1, kp: '配股', chapter: '第4章', type: '名词解释', pts: ['现有股东', '持股比例', '优先配售', '低于市价', '稀释'], ans: '配股是指上市公司向现有股东按其持股比例、以低于市价的价格优先配售新股的行为。原股东可自主决定认购或放弃，若放弃认购，其持股比例将因总股本扩大而被稀释。配股募集资金通常用于特定项目投资或补充流动资金。' },
        { q: '「可转换公司债券」', opts: null, a: -1, kp: '可转换公司债券', chapter: '第4章', type: '名词解释', pts: ['转换为', '普通股', '公司债券', '票面利率低', '期权'], ans: '可转换公司债券是指发行人依照约定条件，在一定期间内可转换为发行人普通股股票的公司债券，兼具债性与股性。其票面利率通常低于同期限普通公司债，一般设有转股价格与转股期、转股价向下修正条款、赎回条款（发行人）与回售条款（投资者）。' },
        { q: '「可交换公司债券」', opts: null, a: -1, kp: '可交换公司债券', chapter: '第4章', type: '名词解释', pts: ['股东发行', '其他公司股票', '交换', '不增加股本'], ans: '可交换公司债券是指上市公司股东依法发行、在一定期间内依据约定条件可交换为该股东所持有的其他公司股票（通常为其持有的上市公司股票）的公司债券。与可转债不同，其转换标的是发行人持有的他人股票，换股不会导致发行人（发债主体）自身股本增加。' },
        { q: '「非公开发行」', opts: null, a: -1, kp: '非公开发行', chapter: '第4章', type: '名词解释', pts: ['特定投资者', '不超过规定数量', '折价', '锁定期'], ans: '非公开发行（定向增发）是指上市公司向不超过规定数量的特定投资者（如机构投资者、控股股东、战略投资者等）发行股份的再融资方式。其定价可相对市价有一定折价，认购股份通常设有锁定期（如控股股东 18 个月、其他投资者 6 个月），具有程序相对简便、对二级市场冲击较小等特点，但会稀释原股东持股比例。' },
        { q: '「转股价格」', opts: null, a: -1, kp: '可转换公司债券', chapter: '第4章', type: '名词解释', pts: ['可转债', '约定价格', '转换为股票', '向下修正'], ans: '转股价格是可转换公司债券持有人将其持有的债券转换为发行人股票时所适用的每股价格，通常在发行时约定。转股价值 =（股票市价 ÷ 转股价格）× 100（每张面值 100 元）。转股价格越低，可转债的股性越强、转股价值越高；发行人通常还设置向下修正条款，在股价长期低于转股价时下调转股价。' },
        { q: '简述配股与增发（公开增发、非公开增发）的比较。', opts: null, a: -1, kp: '配股与增发', chapter: '第4章', type: '简答', pts: ['发行对象', '定价方式', '控制权', '锁定期', '市场影响'], ans: '①发行对象：配股面向原股东按比例配售；公开增发面向不特定对象；非公开发行面向规定数量以内的特定投资者。②定价方式：配股价通常显著低于市价；公开增发多以市价或询价确定；非公开增发定价基准日与折价空间有明确规定。③控制权影响：原股东全额认购配股则不稀释；增发一般会稀释。④锁定期：非公开增发认购股份有锁定期要求（如控股股东18个月、其他投资者6个月）。⑤市场影响：配股常被视为负面信号（尤其是大比例低价配股），非公开增发若引入产业或战略投资者则偏正面。' },
        { q: '简述可转换公司债券的主要条款及其作用。', opts: null, a: -1, kp: '可转换公司债券', chapter: '第4章', type: '简答', pts: ['票面利率', '转股价格', '向下修正', '赎回', '回售'], ans: '①票面利率：低于同期限普通公司债，因为内含转股期权价值；②转股价格与转股期：决定可转债的股性价值与转股时点；③转股价格向下修正条款：股价长期低迷时下调转股价，保护投资者、促进转股、减轻发行人偿付压力；④赎回条款（发行人权利）：当股价持续高于转股价一定比例时，发行人可按约定价格强制赎回，促使持有人尽快转股；⑤回售条款（投资者权利）：股价长期低于转股价一定幅度时，投资者可按约定价格将债券回售给发行人，形成价格保护。' },
        { q: '简述上市公司再融资的主要方式及其适用情形。', opts: null, a: -1, kp: '再融资方式', chapter: '第4章', type: '简答', pts: ['配股', '公开增发', '非公开发行', '可转债', '可交换债', '适用'], ans: '①配股：向原股东按比例配售，适用于原股东持股集中、希望保持控制权结构的情形，但大比例低价配股易被市场视为负面信号；②公开增发：面向不特定公众，适用于市场认可度高、股价处于合理区间、需募集较大规模资金的公司；③非公开发行（定向增发）：向特定投资者发行，适用于引入战略投资者、并购配套融资或控股股东增持，程序相对简便；④可转换公司债券：兼具债性与股性、票面利率低，适用于股价有上涨预期、希望延迟摊薄股权的公司；⑤可交换公司债券：由股东发行，适用于股东减持或融资而不直接冲击标的股价。选择时需权衡融资成本、控制权稀释、市场承受力与监管条件。' },
        { q: '简述可转换公司债券的「债性」与「股性」。', opts: null, a: -1, kp: '可转换公司债券', chapter: '第4章', type: '简答', pts: ['债性', '到期还本付息', '股性', '转股价值', '期权'], ans: '债性：可转债在未转股前是公司债券，持有人享有按期收取利息、到期收回本金的权利，并在发行人破产时享有优于股东的清偿顺序；其票面利率虽低于普通公司债，但提供了价格下限（债底）。股性：转股期内持有人可按转股价格将债券转换为股票，从而分享公司股价上涨的收益；转股价值 =（股价 ÷ 转股价）× 100，股价上涨时转股价值上升，可转债价格随之上涨。二者共同构成为「下有债底、上不封顶」的收益结构，其实质是一张债券 + 一份看涨期权的组合。' },
        { q: '某公司发行 10 亿元可转债，转股价格 20 元/股，期限 5 年。发行 3 年后股价升至 28 元，发行人宣布行使赎回权（赎回价约 103 元/张）。理性持有人应如何选择？', opts: null, a: -1, kp: '可转换公司债券', chapter: '第4章', type: '案例', pts: ['转股价值', '赎回价', '理性选择', '承销商提示'], ans: '转股价值 =（股价 ÷ 转股价）× 100 =（28 ÷ 20）× 100 = 140 元/张，明显高于赎回价的约 103 元/张。因此理性持有人应选择转股（或直接在二级市场卖出），否则将被按 103 元赎回，每股损失约 37 元的价值。投行作为承销与持续服务机构，应在赎回提示性公告期内主动提醒投资者及时转股或卖出，避免客户权益受损与投诉风险。' },
        { q: '某公司配股前总股本 4 亿股、股价 10 元，拟按「10 配 3」的比例配股，配股价 6 元。配股除权参考价约为多少？某股东原持有 1000 股，若全额认购需缴款多少？', opts: null, a: -1, kp: '配股', chapter: '第4章', type: '案例', pts: ['配股比例', '除权价', '缴款', '每股'], ans: '①配股比例 = 3 ÷ 10 = 0.3；②除权参考价 =（配股前股价 + 配股价 × 配股比例）÷（1 + 配股比例）=（10 + 6 × 0.3）÷（1 + 0.3）=（10 + 1.8）÷ 1.3 = 11.8 ÷ 1.3 ≈ 9.08 元/股；③该股东原持 1000 股，可配售 1000 × 0.3 = 300 股；④需缴款 = 300 × 6 = 1800 元。可见配股后股价被除权向下调整（由 10 元降至约 9.08 元），原股东若放弃认购，其持股比例将被稀释且承受除权损失；若全额认购，则可通过低价买入新股部分对冲除权影响。' },

        /* ================= 第5章 债券的发行与承销（18题） ================= */
        { q: '债券价格与市场收益率之间的关系是？', opts: ['同向变动', '反向变动', '没有关系', '始终固定不变'], a: 1, kp: '债券定价', chapter: '第5章', type: '选择' },
        { q: '我国国债的主要发行方式是？', opts: ['承购包销与招标发行', '行政摊派', '定向募集', '纯私募发行'], a: 0, kp: '国债发行', chapter: '第5章', type: '选择' },
        { q: '下列不属于公司信用类债券的是？', opts: ['企业债券', '公司债券', '中期票据', '国债'], a: 3, kp: '债券分类', chapter: '第5章', type: '选择' },
        { q: '债券票面利率的确定主要参考的因素是？', opts: ['市场利率水平、发行人信用等级、债券期限与流动性', '发行人的注册资本规模', '承销商的数量', '交易所统一规定的固定值'], a: 0, kp: '票面利率', chapter: '第5章', type: '选择' },
        { q: '关于债券信用评级，下列说法正确的是？', opts: ['评级越高，通常票面利率越低、发行成本越小', '评级结果与发行成本无关', '评级只考察发行人的盈利能力', '评级由发行人自行确定'], a: 0, kp: '信用评级', chapter: '第5章', type: '选择' },
        { q: '地方政府专项债券的基本特点是？', opts: ['对应有一定收益的公益性项目，以项目对应的政府性基金或专项收入偿还', '以一般公共预算收入作为偿还来源', '发行前无须进行信用评级', '只能由一家商业银行独家承销'], a: 0, kp: '地方政府债券', chapter: '第5章', type: '选择' },
        { q: '我国债券交易市场不包括？', opts: ['银行间债券市场', '交易所债券市场', '商业银行柜台市场', '商品期货市场'], a: 3, kp: '债券交易市场', chapter: '第5章', type: '选择' },
        { q: '债券承销中的「余额包销」是指？', opts: ['承销商承诺在发行期结束后按约定价格购入未售出部分', '承销商仅代理销售且不承担任何风险', '由发行人自行组织销售', '承销商全额买断后即时转售'], a: 0, kp: '承销方式', chapter: '第5章', type: '选择' },
        { q: '衡量债券价格对市场利率变动敏感程度的指标是？', opts: ['久期（Duration）', '信用等级', '换手率', '票面利率'], a: 0, kp: '债券定价', chapter: '第5章', type: '选择' },
        { q: '债券的久期越长，通常意味着？', opts: ['价格对市场利率变动越敏感', '价格对利率变动越不敏感', '票面利率越高', '信用风险越低'], a: 0, kp: '债券定价', chapter: '第5章', type: '选择' },
        { q: '下列属于债券基本要素的有？', opts: ['面值', '票面利率', '债券期限', '市场收益率', '承销商的注册资本'], a: [0, 1, 2, 3], multi: true, kp: '债券定价', chapter: '第5章', type: '选择' },
        { q: '「余额包销」', opts: null, a: -1, kp: '承销方式', chapter: '第5章', type: '名词解释', pts: ['未售出', '自行购入', '发行风险', '承销报酬'], ans: '余额包销是指承销商在约定的发行期结束后，对未能售出的债券余额按约定价格自行购入的承销方式。承销商由此承担部分发行风险，相应地可获得更高的承销报酬；与之相对的是代销（不承担风险）与全额包销（承担全部发行风险）。' },
        { q: '「信用评级」', opts: null, a: -1, kp: '信用评级', chapter: '第5章', type: '名词解释', pts: ['评级机构', '偿还能力', '等级符号', '发行利率'], ans: '信用评级是由独立、专业的评级机构对债券发行人按期足额偿还债务本息的能力与意愿进行评价，并以 AAA、AA、A 等等级符号表示的活动。评级结果是投资者识别信用风险、确定发行利率与发行条件的重要依据，也常被监管规则用作投资准入标准。' },
        { q: '「久期」', opts: null, a: -1, kp: '债券定价', chapter: '第5章', type: '名词解释', pts: ['加权平均', '到期时间', '利率敏感性', '现值'], ans: '久期（Duration）是以债券各期现金流现值为权重计算的加权平均到期时间，用以衡量债券价格对市场利率变动的敏感程度。久期越长，价格对利率变动越敏感（利率上升时价格下跌幅度越大）。麦考利久期与修正久期是最常用的两种口径，修正久期 × 利率变动幅度 ≈ 债券价格变动百分比，是债券风险管理与免疫策略的核心工具。' },
        { q: '简述债券的基本要素及其对债券价格的影响。', opts: null, a: -1, kp: '债券定价', chapter: '第5章', type: '简答', pts: ['面值', '票面利率', '期限', '市场收益率', '内含条款', '信用等级'], ans: '①面值：到期偿还的本金金额，面值越高价格越高；②票面利率：决定每期利息的大小，票面利率越高，债券价格越高；③债券期限：期限越长，价格对利率变动越敏感（久期越大）；④市场收益率（折现率）：与债券价格反向变动；⑤付息频率：影响现金流的现值分布；⑥内含条款（赎回、回售、可转换、担保等）：改变现金流结构，进而影响定价；⑦发行人信用等级与流动性：影响投资者要求的风险溢价。' },
        { q: '简述债券承销的主要方式及其风险分担。', opts: null, a: -1, kp: '承销方式', chapter: '第5章', type: '简答', pts: ['代销', '余额包销', '全额包销', '发行风险', '承销报酬'], ans: '①代销（尽力销售）：承销商仅代理销售，不承担未售出部分的购入义务，发行风险由发行人承担，承销报酬最低；②余额包销：承销商承诺购入发行期结束后未售出的余额，承担部分发行风险，报酬较高；③全额包销（承购包销）：承销商先以约定价格全额买断本期债券，再自行向投资者销售，承担全部发行风险，报酬最高，通常以承销团形式分散风险。实务中选择何种方式取决于发行人的信用等级、市场环境、发行规模与承销商的销售能力；招标发行（如国债）则通过价格招标、利率招标等方式实现市场化定价。' },
        { q: '某企业拟发行 5 年期公司债，面值 100 元、票面利率 4%、每年付息一次。同期限国债收益率 2.5%，该企业信用评级 AA，市场要求信用利差 1.2%。其理论发行利率约为多少？若一年后市场要求收益率上升至 6%，债券价格将如何变化？', opts: null, a: -1, kp: '债券定价', chapter: '第5章', type: '案例', pts: ['信用利差', '反向变动', '折价', '市场收益率'], ans: '①理论发行利率 ≈ 无风险利率 + 信用利差 = 2.5% + 1.2% = 3.7%，发行人将票面利率设为 4% 略高于理论值，以增强对投资者的吸引力；②一年后市场要求收益率升至 6%，债券剩余期限 4 年，理论价格 P = 4÷1.06 + 4÷1.06² + 4÷1.06³ + 104÷1.06⁴ ≈ 3.77 + 3.56 + 3.36 + 82.38 ≈ 93.07 元，低于面值 100 元，转为折价交易。③结论：债券价格与市场收益率反向变动；当票面利率低于市场要求收益率时债券折价，反之溢价，且期限越长、票面利率越低，价格对利率变动越敏感。' },
        { q: '某债券面值 1000 元、票面利率 5%、每年付息一次、剩余期限 3 年。当市场收益率为 4% 时其理论价格约为多少？若市场收益率升至 6%，价格将如何变化？', opts: null, a: -1, kp: '债券定价', chapter: '第5章', type: '案例', pts: ['折现', '反向变动', '溢价', '折价', '久期'], ans: '市场收益率 4% 时：P = 50/1.04 + 50/1.04² + 1050/1.04³ ≈ 48.08 + 46.23 + 933.44 ≈ 1027.7 元。因票面利率（5%）高于市场收益率（4%），债券溢价交易。市场收益率升至 6% 时：P = 50/1.06 + 50/1.06² + 1050/1.06³ ≈ 47.17 + 44.50 + 881.60 ≈ 973.3 元，转为折价交易。这说明债券价格与市场收益率反向变动，且期限越长、票面利率越低，价格对利率变动越敏感。' },

        /* ================= 第6章 资产证券化（18题） ================= */
        { q: '资产证券化的核心融资逻辑是？', opts: ['以基础资产未来产生的稳定现金流为支撑发行证券', '以发起人的主体信用为支撑发行证券', '以政府信用担保发行证券', '以股权质押方式发行证券'], a: 0, kp: '资产证券化概念', chapter: '第6章', type: '选择' },
        { q: '资产证券化中设立 SPV（特殊目的载体）的主要目的是？', opts: ['实现基础资产与发起人的破产隔离', '提供外部信用增级', '承担证券承销职能', '充当信用评级机构'], a: 0, kp: 'SPV与破产隔离', chapter: '第6章', type: '选择' },
        { q: '下列属于资产证券化内部信用增级手段的是？', opts: ['优先/次级分层结构（超额抵押、现金储备）', '第三方担保', '购买信用保险', '银行提供流动性支持'], a: 0, kp: '信用增级', chapter: '第6章', type: '选择' },
        { q: 'MBS 与 ABS 的主要区别是？', opts: ['MBS 的基础资产为住房抵押贷款，ABS 的基础资产为其他各类资产', '两者完全相同', 'MBS 不能在交易所挂牌交易', 'ABS 只能由商业银行发行'], a: 0, kp: '资产证券化类型', chapter: '第6章', type: '选择' },
        { q: '2007 年美国次贷危机中，资产证券化扮演的角色是？', opts: ['次级抵押贷款证券化的风险通过分层与衍生品被放大并跨机构扩散', '提高了住房贷款质量', '有效隔离了全部风险', '与危机无关'], a: 0, kp: '资产证券化风险', chapter: '第6章', type: '选择' },
        { q: '我国资产证券化的主要类型不包括？', opts: ['信贷资产证券化', '企业资产证券化', '资产支持票据（ABN）', '股权质押式回购'], a: 3, kp: '我国资产证券化实践', chapter: '第6章', type: '选择' },
        { q: '资产证券化中，SPV 通常采取的组织形式是？', opts: ['特殊目的公司（SPC）或特殊目的信托（SPT）', '商业银行分行', '证券公司营业部', '基金管理公司'], a: 0, kp: 'SPV与破产隔离', chapter: '第6章', type: '选择' },
        { q: '我国信贷资产证券化的主管机构主要是？', opts: ['中国人民银行与国家金融监督管理总局（原银保监会）', '中国证监会', '财政部', '国家发展改革委'], a: 0, kp: '我国资产证券化实践', chapter: '第6章', type: '选择' },
        { q: '下列属于资产证券化内部信用增级手段的有？', opts: ['优先/次级分层结构', '超额抵押', '现金储备账户', '第三方担保', '购买信用保险'], a: [0, 1, 2], multi: true, kp: '信用增级', chapter: '第6章', type: '选择' },
        { q: '「资产证券化」', opts: null, a: -1, kp: '资产证券化概念', chapter: '第6章', type: '名词解释', pts: ['基础资产', '稳定现金流', '结构化重组', '信用增级', '可流通证券'], ans: '资产证券化是指以基础资产（如住房抵押贷款、企业应收账款、租赁债权、基础设施收费权等）未来产生的稳定、可预测现金流为支持，通过结构化重组与信用增级，在金融市场上发行可流通证券的融资方式。其核心机制是现金流重组与破产隔离。' },
        { q: '「真实出售」', opts: null, a: -1, kp: 'SPV与破产隔离', chapter: '第6章', type: '名词解释', pts: ['全部权利', '转移给SPV', '出表', '破产隔离'], ans: '真实出售是指发起人将与基础资产相关的全部权利、收益与风险实质性地转移给 SPV 的法律行为。它使基础资产从发起人的资产负债表中出表，从而实现与发起人破产风险的隔离——即使发起人日后破产，其债权人也不能追索已出售的基础资产。' },
        { q: '「破产隔离」', opts: null, a: -1, kp: 'SPV与破产隔离', chapter: '第6章', type: '名词解释', pts: ['真实出售', '基础资产', '发起人破产', '不得追索', '出表'], ans: '破产隔离是指通过将基础资产「真实出售」给 SPV，使该资产在法律上与发起人的自有资产相分离的机制。其效果是：当发起人破产时，其债权人不得对已出售的基础资产行使追索权，资产池现金流继续按约定偿付证券投资者。破产隔离是资产证券化区别于普通担保融资的核心特征，也是其获得高于发起人主体信用评级的基础。' },
        { q: '简述资产证券化的基本交易结构。', opts: null, a: -1, kp: '交易结构', chapter: '第6章', type: '简答', pts: ['发起人', '资产池', '真实出售', 'SPV', '信用增级', '评级', '承销发行'], ans: '①发起人（原始权益人）筛选并组建基础资产池；②将基础资产「真实出售」给 SPV，实现破产隔离；③对资产池进行信用增级（内部：优先/次级分层、超额抵押、现金储备账户；外部：第三方担保、保险、流动性支持）；④聘请评级机构对证券进行信用评级；⑤由承销商向投资者发行资产支持证券；⑥委托服务机构（通常由发起人担任）负责基础资产的日常管理与现金流归集；⑦按约定顺序向不同层级证券投资者分配本息。' },
        { q: '简述资产证券化的收益与主要风险。', opts: null, a: -1, kp: '资产证券化风险', chapter: '第6章', type: '简答', pts: ['盘活存量', '出表', '降低融资成本', '信用风险', '提前偿付', '评级依赖'], ans: '收益：①发起人可盘活存量资产、提前回收资金、优化资产负债表（实现出表）、降低融资成本、拓宽融资渠道；②投资者可获得风险分层、结构清晰、收益相对稳定的固定收益产品；③提高金融体系资金配置效率。风险：①基础资产信用风险（借款人违约、现金流不足）；②提前偿付风险（利率下行时借款人提前还款，导致投资者面临再投资风险）；③利率风险与流动性风险；④结构化设计的杠杆放大与对评级的过度依赖风险（次贷危机的教训）；⑤法律风险与破产隔离不彻底的风险。' },
        { q: '简述资产证券化的主要参与主体及其职责。', opts: null, a: -1, kp: '交易结构', chapter: '第6章', type: '简答', pts: ['发起人', 'SPV', '承销商', '评级机构', '服务机构', '投资者'], ans: '①发起人（原始权益人）：筛选与组建基础资产池，并将其真实出售给 SPV，通常是基础资产的服务机构；②SPV（特殊目的载体）：作为发行人持有基础资产并发行证券，实现破产隔离；③承销商（通常为投资银行）：设计交易结构、组织信用增级、向投资者承销发行证券；④信用增级机构：提供第三方担保、保险或流动性支持；⑤信用评级机构：对资产支持证券进行评级并跟踪评级；⑥服务机构（通常由发起人兼任）：负责基础资产的日常管理、本息回收与现金流归集分配；⑦受托机构/托管机构：代表投资者持有资产池权益、监督现金流分配；⑧投资者：购买资产支持证券并获取本息。' },
        { q: '简述我国资产证券化的主要类型及其监管分工。', opts: null, a: -1, kp: '我国资产证券化实践', chapter: '第6章', type: '简答', pts: ['信贷资产证券化', '企业资产证券化', '资产支持票据', '监管分工'], ans: '①信贷资产证券化：由银行业金融机构发起，经中国人民银行、国家金融监督管理总局（原银保监会）监管，在银行间债券市场发行；②企业资产证券化：以企业应收款、租赁债权、基础设施收费权等为基础资产，由证券公司或基金子公司设立专项计划发行，由中国证监会监管，在交易所市场挂牌；③资产支持票据（ABN）：由非金融企业在银行间债券市场发行，由交易商协会注册管理；④项目资产支持计划等保险资管产品：由国家金融监督管理总局监管。三类产品的共同点是均以基础资产现金流为偿付支持，并通过 SPV 实现破产隔离。' },
        { q: '某发起人将 20 亿元应收账款证券化，分为优先级 16 亿元（AAA，票面 3.6%）与次级 4 亿元（由发起人自持）。若资产池实际回收率为 96%，优先级本息能否全额兑付？次级层承担了多少损失？', opts: null, a: -1, kp: '信用增级', chapter: '第6章', type: '案例', pts: ['回收率', '优先级', '次级', '损失', '信用增级'], ans: '①资产池实际回收额 = 20 × 96% = 19.2 亿元；②优先级应付本息 = 16 ×（1 + 3.6%）= 16.576 亿元；③19.2 > 16.576，优先级本息可全额兑付，剩余 19.2 − 16.576 = 2.624 亿元用于偿付次级；④次级本金 4 亿元，实际收回 2.624 亿元，次级层承担损失 = 4 − 2.624 = 1.376 亿元，损失率约 34.4%。⑤结论：次级层充当第一损失缓冲，使优先级得以以 AAA 高评级、较低票面利率发行；发起人自持次级层意味着其保留资产池的第一损失风险与超额收益，实现利益绑定、降低道德风险。' },
        /* ================= 第7章 公司并购（18题） ================= */
        { q: '按并购双方行业关系划分，纵向并购是指？', opts: ['处于同一产业链上下游企业之间的并购', '同行业竞争对手之间的并购', '无关联行业企业之间的混合并购', '母公司与子公司之间的内部重组'], a: 0, kp: '并购类型', chapter: '第7章', type: '选择' },
        { q: '横向并购最主要的动因是？', opts: ['扩大市场份额、提升行业集中度与议价能力', '降低交易成本、稳定上游供应', '分散单一行业经营风险', '获取上市壳资源'], a: 0, kp: '并购动因', chapter: '第7章', type: '选择' },
        { q: '杠杆收购（LBO）的基本特点是？', opts: ['以目标公司资产及未来现金流为担保大量举债以完成收购', '完全依靠收购方自有资金完成', '仅通过换股方式完成', '不需要目标公司现金流支持'], a: 0, kp: '杠杆收购', chapter: '第7章', type: '选择' },
        { q: '下列属于反收购策略的是？', opts: ['毒丸计划', '白衣骑士', '金降落伞', '以上都是'], a: 3, kp: '反收购策略', chapter: '第7章', type: '选择' },
        { q: '换股并购中，换股比例的核心决定因素是？', opts: ['双方股票的相对估值（目标公司每股价值 ÷ 收购方每股价值）', '收购方的注册资本规模', '收购方董事会人数', '收购方上市时间的早晚'], a: 0, kp: '支付方式', chapter: '第7章', type: '选择' },
        { q: '要约收购是指？', opts: ['收购人向目标公司全体股东公开发出收购其股份的要约', '收购人与大股东私下协议转让股份', '通过二级市场逐步买入股份', '通过司法拍卖取得股权'], a: 0, kp: '要约收购', chapter: '第7章', type: '选择' },
        { q: '并购的一般操作程序中，投行财务顾问的首要工作是？', opts: ['协助制定并购战略并筛选、评估目标公司', '直接代表双方签署收购协议', '对外发布并购公告', '办理工商变更登记'], a: 0, kp: '并购程序', chapter: '第7章', type: '选择' },
        { q: '并购估值中，可比交易法的核心做法是？', opts: ['参考类似已发生交易的估值倍数（如 EV/EBITDA）确定标的估值', '按目标公司账面净资产直接定价', '按收购方市盈率定价', '按目标公司历史股价均价定价'], a: 0, kp: '并购估值', chapter: '第7章', type: '选择' },
        { q: '并购中的「协同效应」通常是指？', opts: ['并购后整体价值大于双方独立价值之和（1 + 1 > 2）', '收购方支付了过高的收购溢价', '并购后大规模裁员降低成本', '目标公司股价在公告后下跌'], a: 0, kp: '并购动因', chapter: '第7章', type: '选择' },
        { q: '敌意收购中，目标公司可采取的防御措施包括？', opts: ['毒丸计划', '白衣骑士', '金降落伞', '焦土战术', '主动提高收购溢价'], a: [0, 1, 2, 3], multi: true, kp: '反收购策略', chapter: '第7章', type: '选择' },
        { q: '「杠杆收购（LBO）」', opts: null, a: -1, kp: '杠杆收购', chapter: '第7章', type: '名词解释', pts: ['债务融资', '目标公司资产', '现金流', '控制权', '高杠杆'], ans: '杠杆收购（Leveraged Buyout）是指收购方以目标公司的资产及未来现金流作为担保与偿债来源，主要通过大规模债务融资（银行贷款、高收益债券、夹层融资）取得目标公司控制权的收购方式。其特点是自有资金投入少、财务杠杆高、潜在收益与风险均被放大。' },
        { q: '「反收购策略」', opts: null, a: -1, kp: '反收购策略', chapter: '第7章', type: '名词解释', pts: ['敌意收购', '毒丸计划', '白衣骑士', '金降落伞', '防御措施'], ans: '反收购策略是目标公司管理层为防止公司被敌意收购而采取的一系列防御措施，常见包括：毒丸计划（股东权利计划）、白衣骑士（引入友好收购方竞价）、金降落伞（高管离职补偿）、焦土战术、股份回购、以及修改公司章程设置「驱鲨剂」条款等。' },
        { q: '「换股并购」', opts: null, a: -1, kp: '支付方式', chapter: '第7章', type: '名词解释', pts: ['发行股票', '支付对价', '换股比例', '不占用现金'], ans: '换股并购是指收购方以其自身（或控股公司）新发行的股票作为支付对价，按约定的换股比例换取目标公司股东所持股份的并购方式。换股比例的核心决定因素是双方的相对估值（目标公司每股价值 ÷ 收购方每股价值）。其优点是不占用现金、可实现风险共担与税收递延，缺点是会稀释收购方原股东控制权、程序较为复杂。' },
        { q: '简述公司并购的主要动因。', opts: null, a: -1, kp: '并购动因', chapter: '第7章', type: '简答', pts: ['协同效应', '市场份额', '多元化', '战略资源', '纵向一体化', '代理问题'], ans: '①协同效应：经营协同（规模经济、渠道互补）、财务协同（降低融资成本、提高举债能力）、管理协同（提升效率）；②扩大市场份额、提升市场势力与定价权；③多元化经营、分散单一行业风险；④获取战略资源（技术、品牌、牌照、渠道、人才）；⑤纵向一体化降低交易成本、稳定供应链；⑥税收与融资便利等财务动因；⑦管理层扩张偏好与代理问题（需警惕「帝国建造」动机损害股东价值）。' },
        { q: '简述并购的主要支付方式及其优缺点。', opts: null, a: -1, kp: '支付方式', chapter: '第7章', type: '简答', pts: ['现金支付', '换股', '混合支付', '控制权', '税负', '融资能力'], ans: '①现金支付：交易确定性强、速度快、不稀释控制权，但占用大量资金、加重财务压力，且目标公司股东需即时承担税负；②股票（换股）支付：不占用现金、可实现风险共担与税收递延，但会稀释原股东控制权、程序较复杂、耗时较长；③混合支付（现金＋股票/可转债/承付票据）：兼顾双方诉求、灵活性高，是实务中的主流选择；④承担债务式支付：适用于目标公司高负债的情形。选择时需综合考虑估值差异、税负、控制权安排与自身融资能力。' },
        { q: '简述公司并购的一般操作流程以及投资银行在其中发挥的作用。', opts: null, a: -1, kp: '并购程序', chapter: '第7章', type: '简答', pts: ['战略制定', '筛选目标', '尽职调查', '估值', '方案设计', '谈判', '融资安排', '整合'], ans: '操作流程：①制定并购战略、明确并购标准；②筛选与初步评估目标公司；③签订保密协议、开展尽职调查；④估值与定价，设计交易方案与支付方式；⑤谈判并签署收购协议，履行审批与信息披露程序；⑥完成交割与整合。投行的作用：①作为财务顾问协助制定战略、筛选与评估目标公司；②组织尽职调查、开展估值与定价；③设计交易结构与融资方案（含过桥贷款、债务融资安排）；④参与谈判、协调会计师与律师等中介机构；⑤在要约收购中担任财务顾问并出具专业意见；⑥协助完成监管审批、信息披露与并购后整合。' },
        { q: '收购方净利润 8 亿元、股本 2 亿股（EPS 4 元）；目标公司净利润 1 亿元、市值 10 亿元。若以 12 亿元现金收购（溢价 20%），收购后 EPS 如何变化？若改为按 20 元/股换股收购，结果又如何？', opts: null, a: -1, kp: '并购估值', chapter: '第7章', type: '案例', pts: ['每股收益', '增厚', '摊薄', '现金收购', '换股'], ans: '现金收购：收购后净利润 = 8 + 1 = 9 亿元，股本不变仍为 2 亿股，EPS = 9 ÷ 2 = 4.5 元，较收购前的 4 元增厚 0.5 元（12.5%）。但该测算未计入收购对价 12 亿元的机会成本与融资成本——若 12 亿元来自借款，需扣除利息后重新测算，实际增厚幅度会明显缩小。换股收购：按 20 元/股发行 12 亿 ÷ 20 = 6000 万股，股本增至 2.6 亿股，EPS = 9 ÷ 2.6 ≈ 3.46 元，较 4 元被摊薄约 13.5%。可见在双方市盈率相近时，现金收购对 EPS 更有利，但会消耗现金、抬高杠杆；换股支付则把风险与收益与目标方股东共担。' },
        { q: '目标公司最近一年 EBITDA 为 2 亿元、净利润 1.2 亿元，可比交易 EV/EBITDA 平均为 9 倍，可比公司市盈率 18 倍，目标公司净债务 3 亿元。请分别用 EV/EBITDA 法与市盈率法估算其股权价值，并说明差异原因。', opts: null, a: -1, kp: '并购估值', chapter: '第7章', type: '案例', pts: ['EV/EBITDA', '市盈率', '股权价值', '净债务', '估值区间'], ans: '①EV/EBITDA 法：企业价值 EV = EBITDA × 倍数 = 2 × 9 = 18 亿元；股权价值 = EV − 净债务 = 18 − 3 = 15 亿元。②市盈率法：股权价值 = 净利润 × 市盈率 = 1.2 × 18 = 21.6 亿元。③差异原因：EV/EBITDA 从企业整体价值出发，剔除了资本结构、折旧摊销与所得税政策的影响，受财务杠杆影响较小，更适合资本结构差异较大的可比公司之间比较；市盈率法直接对应股东权益价值，但净利润易受会计政策、非经常性损益与杠杆水平影响。实务中通常同时采用多种方法交叉验证，并结合可比交易溢价水平形成估值区间，作为谈判与定价的依据。' },

      ];

      // 状态模型（答题结果与"看过答案"分离，避免互相覆盖）：
      //   ansStatus: Map<题, 'ok' | 'bad'>  —— 答题结果（客观题自动判定；主观题由学生自评）
      //   seenSet:   Set<题>                —— 是否查看过参考答案（仅作答题卡右上角紫点角标，不覆盖结果）
      //   draft:     Map<题, string>        —— 主观题作答草稿（跨筛选、跨题切换保留）
      //   picked:    Map<题, number[]>      —— 客观题已选/已勾选项下标
      const ansStatus = new Map();
      const seenSet = new Set();
      const draft = new Map();
      const picked = new Map();
      // ===== 错题定位诊断（v36）：本地持久化「错题账本」+ 五要素（概览/热力/错因/排程/重练） =====
      var WB_KEY = 'ibank_wrongbook';
      var SPACED = [1, 3, 7, 15];                  // 间隔重复：错后 1 → 3 → 7 → 15 天
      var CAUSES = [
        { name: '概念不清', color: '#ef4444' },
        { name: '方法不会', color: '#f59e0b' },
        { name: '粗心失误', color: '#3b82f6' },
        { name: '审题偏差', color: '#94a3b8' }
      ];
      var DAY = 86400000;
      var WB = null;
      var wbView = { kp: null, due: false };       // 当前筛选：知识点 / 仅今日待复习
      var wbOpen = {};                             // 卡片展开态（qid → true）
      var wbVari = {};                             // 变式重练态（qid → {q,picked,fb,fbOk}）
      function wbKey(src) { return 'w|' + (src.chapter || '') + '|' + String(src.q || '').replace(/\s+/g, '').slice(0, 64); }
      function mkItem(src, pickedArr) {
        var isObj = !!src.opts;
        return {
          qid: wbKey(src), q: src.q, kp: src.kp || '', chapter: src.chapter || '', type: src.type || '',
          opts: isObj ? src.opts : null, a: isObj ? (Array.isArray(src.a) ? src.a.slice() : src.a) : null, multi: !!src.multi,
          aLab: isObj ? ansLabel(src) : '', aTxt: isObj ? ansText(src) : (src.ans || ''),
          exp: src.exp || '', picked: pickedArr || null,
          wrongCount: 1, firstTs: 0, lastTs: 0, cause: isObj ? '概念不清' : '方法不会',
          status: 'todo', stage: 0, nextTs: 0, hist: [], isSeed: false
        };
      }
      // 空账本时播种 8 条示例错题（覆盖 4 类错因），供演示；学生在训练中答错后自动归入真实错题并可一键清除示例。
      function wbSeed() {
        var demo = [
          { chapter: '第1章', type: '名词解释', kp: '承销业务', cause: '概念不清', stage: 1, q: '包销与代销在风险分担上有何区别？', ans: '包销由投行承担未售出风险；代销风险小但募资不确定。', exp: '抓住「风险由谁承担」这一关键，而非只记名词。' },
          { chapter: '第2章', type: '选择', kp: '相对估值', cause: '概念不清', stage: 0, q: '市盈率法与市净率法分别适用于什么类型公司？', ans: '成长型、盈利稳定的公司常用 PE；重资产、金融类公司常用 PB。', exp: '容易混淆 PE 与 PB 的适用场景，需结合公司资产结构与盈利特征判断。' },
          { chapter: '第3章', type: '简答', kp: '发行制度', cause: '粗心失误', stage: 2, q: '注册制与核准制的核心区别是什么？', ans: '核准制由监管实质审核并作价值判断；注册制仅作形式审查，把价值判断交给市场。', exp: '区别的落点是审核主体与判断标准，不是「谁管」这么简单。' },
          { chapter: '第4章', type: '选择', kp: '估值方法', cause: '方法不会', stage: 0, q: '现金流折现 DCF 中，折现率上升会如何影响估值？', ans: '折现率上升会降低未来现金流的现值，从而拉低估值。', exp: '折现率与估值反向变动，是 DCF 模型的核心逻辑。' },
          { chapter: '第5章', type: '选择', kp: '债券定价', cause: '方法不会', stage: 1, q: '市场利率上升时，已发行固定利率债券的价格会怎样变化？', ans: '价格下跌；市场利率高于票面利率时债券折价交易。', exp: '债券价格与市场利率反向变动，久期越长越敏感。' },
          { chapter: '第6章', type: '名词解释', kp: '资产证券化', cause: '概念不清', stage: 0, q: '资产证券化中 SPV（特殊目的载体）起什么作用？', ans: 'SPV 受让基础资产，实现破产隔离与真实出售，使证券化资产与原始权益人信用分离。', exp: 'SPV 的核心价值是「破产隔离」，而不是单纯走账。' },
          { chapter: '第7章', type: '案例', kp: '并购估值', cause: '审题偏差', stage: 3, q: '判断并购协同效应时，最容易高估的是哪一类？', ans: '收入协同（交叉销售、渠道扩张）最易被高估；成本协同相对可测、更易实现。', exp: '收入协同比成本协同更难兑现，实务中常被高估。' },
          { chapter: '第1章', type: '选择', kp: '承销业务', cause: '审题偏差', stage: 0, q: '超额配售选择权（绿鞋机制）的主要功能是什么？', ans: '稳定新股上市后一段时间的股价，抑制破发或过度波动。', exp: '绿鞋是稳定后市价格，不是给承销商加杠杆。' }
        ];
        var items = {}, now = Date.now();
        demo.forEach(function (d, i) {
          var it = mkItem(d, null);
          it.isSeed = true; it.cause = d.cause; it.stage = d.stage;
          it.firstTs = now - (d.stage + 2) * DAY - i * 3600000;
          it.lastTs = now - (d.stage + 1) * DAY;
          if (it.stage >= SPACED.length) { it.status = 'mastered'; it.nextTs = 0; }
          else it.nextTs = it.lastTs + SPACED[it.stage] * DAY;
          items[it.qid] = it;
        });
        return { v: 1, items: items };
      }
      function wbLoad() {
        try {
          var raw = JSON.parse(localStorage.getItem(WB_KEY) || 'null');
          if (raw && raw.items && typeof raw.items === 'object' && Object.keys(raw.items).length) return raw;
        } catch (e) {}
        var seeded = wbSeed();
        try { localStorage.setItem(WB_KEY, JSON.stringify(seeded)); } catch (e) {}
        return seeded;
      }
      function wbSave() { try { localStorage.setItem(WB_KEY, JSON.stringify(WB)); } catch (e) {} }
      function wbList() { return Object.keys(WB.items).map(function (k) { return WB.items[k]; }); }
      function isDue(it) { return it.status !== 'mastered' && (it.nextTs || 0) <= Date.now(); }
      let curList = QUIZ.slice(), cur = 0, exCh = null, exType = null, listOpen = false;
      const quizBox = document.getElementById('quiz-box');

      function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
      function chNum(c) { return parseInt(String(c).replace(/[^0-9]/g, ''), 10) || 0; }
      function isMulti(q) { return !!(q.multi && Array.isArray(q.a)); }
      function normTxt(s) { return String(s == null ? '' : s).replace(/[\s，。、；：,.;:！？!?（）()《》〈〉【】\[\]"'“”‘’·—\-~\/]/g, ''); }
      function ansIndexes(q) { return Array.isArray(q.a) ? q.a.slice().sort(function (a, b) { return a - b; }) : [q.a]; }
      function ansLabel(q) { return ansIndexes(q).map(function (i) { return String.fromCharCode(65 + i); }).join('、'); }
      function ansText(q) { return ansIndexes(q).map(function (i) { return String.fromCharCode(65 + i) + '. ' + q.opts[i]; }).join('　'); }
      function doneCount() { return curList.filter(function (q) { return ansStatus.has(q); }).length; }
      function okCount() { return curList.filter(function (q) { return ansStatus.get(q) === 'ok'; }).length; }
      function trackAns(item, ok) {
        if (!window.__ibankTrack) return;
        var cause = null;
        try { if (WB && WB.items) { var w = WB.items[wbKey(item)]; if (w) cause = w.cause; } } catch (e) {}
        window.__ibankTrack('quiz', { chapter: item.chapter, qtype: item.type, correct: !!ok, kp: item.kp || null, cause: cause });
      }

      function wbCauseOf(it) {
        for (var i = 0; i < CAUSES.length; i++) if (CAUSES[i].name === it.cause) return CAUSES[i];
        return { name: it.cause || '未归类', color: '#94a3b8' };
      }
      function wbStateTxt(it, now) {
        if (it.status === 'mastered') return '已掌握';
        if (isDue(it)) return '今日待复习';
        return '下次复习 ' + Math.max(1, Math.ceil((it.nextTs - now) / DAY)) + ' 天后';
      }
      function wbVariHtml(it) {
        var st = wbVari[it.qid];
        if (!st) return '';
        var q = st.q, answered = st.picked != null;
        var opts = q.opts.map(function (o, i) {
          var cls = 'vopt';
          if (answered) { cls += ' disabled'; if (i === q.a) cls += ' correct'; else if (i === st.picked) cls += ' wrong'; }
          return '<button class="' + cls + '" data-act="vans" data-qid="' + esc(it.qid) + '" data-i="' + i + '">' + String.fromCharCode(65 + i) + '. ' + esc(o) + '</button>';
        }).join('');
        return '<div class="wd-vari"><div class="vh">变式重练 · 同知识点「' + esc(it.kp || '相关') + '」</div>'
          + '<div class="vq">' + esc(q.q) + '</div>' + opts
          + (answered
            ? '<div class="vfb ' + (st.fbOk ? 'ok' : 'bad') + '">' + esc(st.fb) + '</div>'
              + '<div class="wd-actions"><button class="wd-btnsm ghost" data-act="vari" data-qid="' + esc(it.qid) + '">再来一题</button>'
              + '<button class="wd-btnsm ghost" data-act="vcollapse" data-qid="' + esc(it.qid) + '">收起重练</button></div>'
            : '')
          + '</div>';
      }
      function wbItemHtml(it, idx, now) {
        var open = !!wbOpen[it.qid], c = wbCauseOf(it);
        var chips = '<span class="wd-badge">' + esc(it.type || '题目') + '</span>'
          + (it.kp ? '<span class="wd-badge">' + esc(it.kp) + '</span>' : '')
          + (it.chapter ? '<span class="wd-badge">' + esc(it.chapter) + '</span>' : '')
          + (it.wrongCount > 1 ? '<span class="wd-badge red">错 ' + it.wrongCount + ' 次</span>' : '')
          + '<span class="wd-badge amber">错因：' + esc(c.name) + '</span>'
          + (it.isSeed ? '<span class="wd-badge seed">示例</span>' : '')
          + '<span class="st">' + esc(wbStateTxt(it, now)) + (it.stage ? ' · 已复习 ' + it.stage + ' 次' : '') + '</span>';
        var body = '';
        if (open) {
          var myAns = (!it.opts) ? '（主观题，自评未掌握）'
            : (it.picked && it.picked.length ? it.picked.map(function (pi) { return String.fromCharCode(65 + pi) + '. ' + (it.opts[pi] || ''); }).join('　') : '（未记录所选选项）');
          var okAns = it.opts ? (it.aLab + '. ' + (it.aTxt || '')) : (it.aTxt || '（请对照参考要点复习）');
          body = '<div class="wd-body">'
            + '<div class="wd-cmp">'
            + '<div class="bx bad"><div class="lb">我的答案</div><div class="ct">' + esc(myAns) + '</div></div>'
            + '<div class="bx ok"><div class="lb">正确答案</div><div class="ct">' + esc(okAns) + '</div></div>'
            + '</div>'
            + (it.exp ? '<div class="wd-exp">解析：' + esc(it.exp) + '</div>' : '')
            + '<div class="wd-actions">'
            + '<button class="wd-btnsm" data-act="vari" data-qid="' + esc(it.qid) + '">再练一遍（变式题）</button>'
            + (it.status === 'mastered'
              ? '<button class="wd-btnsm ghost" data-act="unmaster" data-qid="' + esc(it.qid) + '">取消已掌握</button>'
              : '<button class="wd-btnsm ghost" data-act="master" data-qid="' + esc(it.qid) + '">我已掌握</button>')
            + '<button class="wd-btnsm ghost" data-act="del" data-qid="' + esc(it.qid) + '">移出错题本</button>'
            + '</div>'
            + '<div class="wd-causesel"><span class="lb">错因标签：</span>'
            + CAUSES.map(function (x) { return '<button class="wd-chip' + (it.cause === x.name ? ' active' : '') + '" data-act="cause" data-qid="' + esc(it.qid) + '" data-cause="' + esc(x.name) + '">' + x.name + '</button>'; }).join('')
            + '</div>'
            + wbVariHtml(it)
            + '</div>';
        }
        return '<div class="wd-item' + (it.status === 'mastered' ? ' mastered' : '') + '" data-qid="' + esc(it.qid) + '">'
          + '<div class="top">' + chips + '</div>'
          + '<div class="q" data-act="toggle" data-qid="' + esc(it.qid) + '" style="cursor:pointer"><span class="no">' + (idx + 1) + '</span>' + esc(it.q) + '</div>'
          + body + '</div>';
      }
      function renderWrong() {
        var app = document.getElementById('wrong-app');
        if (!app) return;
        WB = WB || wbLoad();
        var all = wbList(), now = Date.now();
        var total = all.length;
        var mastered = all.filter(function (x) { return x.status === 'mastered'; }).length;
        var due = all.filter(isDue).length;
        var seedN = all.filter(function (x) { return x.isSeed; }).length;

        var kpi = '<div class="wd-kpi">'
          + '<div class="cell"><div class="k">错题总数</div><div class="v">' + total + '</div></div>'
          + '<div class="cell"><div class="k">已掌握</div><div class="v green">' + mastered + '</div></div>'
          + '<div class="cell"><div class="k">待复习</div><div class="v">' + (total - mastered) + '</div></div>'
          + '<div class="cell"><div class="k">今日待复习</div><div class="v red">' + due + '</div></div>'
          + '</div>';

        var byKp = {};
        all.forEach(function (it) { var k = it.kp || '未标注'; byKp[k] = (byKp[k] || 0) + 1; });
        var kpArr = Object.keys(byKp).map(function (k) { return { k: k, n: byKp[k] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8);
        var maxKp = kpArr.length ? kpArr[0].n : 1;
        var heat = '<div class="wd-card"><div class="hd">薄弱知识点 · 错题数</div>'
          + (kpArr.length ? kpArr.map(function (x) {
            return '<div class="wd-heat-row" data-kp="' + esc(x.k) + '" title="点击筛选该知识点"><div class="nm">' + esc(x.k) + '</div>'
              + '<div class="tk"><i style="width:' + Math.round(x.n / maxKp * 100) + '%"></i></div><div class="vl">' + x.n + '</div></div>';
          }).join('') : '<div class="wd-empty">暂无错题，先去「实务习题训练」做几道吧。</div>')
          + '</div>';

        var byCause = {};
        all.forEach(function (it) { var n = it.cause || '未归类'; byCause[n] = (byCause[n] || 0) + 1; });
        var segs = '', legs = '';
        CAUSES.forEach(function (c) {
          var n = byCause[c.name] || 0;
          if (n) segs += '<i style="width:' + (n / (total || 1) * 100).toFixed(1) + '%;background:' + c.color + '"></i>';
          legs += '<span><em style="background:' + c.color + '"></em>' + c.name + ' ' + (total ? Math.round(n / total * 100) : 0) + '%</span>';
        });
        var cause = '<div class="wd-card"><div class="hd">错因分布</div>'
          + (total ? '<div class="wd-seg">' + segs + '</div>' : '')
          + '<div class="wd-legend">' + legs + '</div></div>';

        var sched = '<div class="wd-due"><div class="tx">今日待复习 <b>' + due + '</b> 题 &nbsp;·&nbsp; 间隔重复 <b>1 → 3 → 7 → 15</b> 天 &nbsp;·&nbsp; 每日上限 20 题'
          + (seedN ? '<br><span style="color:var(--dim)">含 ' + seedN + ' 条示例错题（演示用），你在训练中答错后会自动归入真实错题。</span>' : '')
          + '</div><div style="display:flex;gap:8px;flex-wrap:wrap;">'
          + (due ? '<button class="wd-btnsm" data-act="review-all">开始复习（' + Math.min(due, 20) + '）</button>' : '<span class="wd-badge green">今日已复习完 ✓</span>')
          + (seedN ? '<button class="wd-btnsm ghost" data-act="clear-seed">清除示例错题</button>' : '')
          + '</div></div>';

        var tb = '<div class="wd-toolbar">'
          + '<button class="wd-chip' + (!wbView.kp && !wbView.due ? ' active' : '') + '" data-act="all">全部 ' + total + '</button>'
          + '<button class="wd-chip' + (wbView.due ? ' active' : '') + '" data-act="due">今日待复习 ' + due + '</button>'
          + (wbView.kp ? '<button class="wd-chip active" data-act="kpclear">知识点：' + esc(wbView.kp) + ' ✕</button>' : '')
          + '<span style="flex:1"></span>'
          + '<button class="wd-btnsm ghost" data-act="export">导出错题清单</button>'
          + '</div>';

        var list = all.slice();
        if (wbView.kp) list = list.filter(function (it) { return (it.kp || '未标注') === wbView.kp; });
        if (wbView.due) list = list.filter(isDue);
        list.sort(function (a, b) {
          var ma = a.status === 'mastered' ? 1 : 0, mb = b.status === 'mastered' ? 1 : 0;
          if (ma !== mb) return ma - mb;
          var ua = isDue(a) ? 0 : 1, ub = isDue(b) ? 0 : 1;
          if (ua !== ub) return ua - ub;
          return (b.wrongCount || 0) - (a.wrongCount || 0) || (b.lastTs || 0) - (a.lastTs || 0);
        });
        var listHtml = list.length ? list.map(function (it, i) { return wbItemHtml(it, i, now); }).join('') : '<div class="wd-empty">该筛选条件下暂无错题。</div>';

        app.innerHTML = kpi + '<div class="wd-cols">' + heat + cause + '</div>' + sched + tb + listHtml;
      }
      function startVari(it) {
        if (!it) return;
        var pool = QUIZ.filter(function (q) { return q.opts && !isMulti(q) && wbKey(q) !== it.qid; });
        var score = function (q) { var s = 0; if (q.kp && it.kp && q.kp === it.kp) s += 4; if (q.chapter === it.chapter) s += 2; if (q.type === it.type) s += 1; return s; };
        pool.sort(function (a, b) { return score(b) - score(a); });
        var pick = pool[0] || null;
        if (pick && score(pick) < 4 && pool.length > 1) pick = pool[Math.floor(Math.random() * Math.min(pool.length, 6))];
        if (!pick) { if (typeof ibankToast === 'function') ibankToast('题库中暂无可用变式题'); return; }
        wbVari[it.qid] = { q: pick, picked: null, fb: '', fbOk: false };
        wbOpen[it.qid] = true;
        renderWrong();
      }
      function answerVari(it, i) {
        var st = it && wbVari[it.qid]; if (!st || st.picked != null) return;
        var q = st.q, ok = (i === q.a), now = Date.now();
        st.picked = i; st.fbOk = ok;
        if (ok) {
          it.stage = Math.min(it.stage + 1, SPACED.length);
          it.hist.push(now);
          if (it.stage >= SPACED.length) { it.status = 'mastered'; it.nextTs = 0; st.fb = '✓ 答对了！已连续答对 ' + SPACED.length + ' 次，标记为「已掌握」。'; }
          else { it.nextTs = now + SPACED[it.stage] * DAY; st.fb = '✓ 答对了！复习阶段推进到第 ' + (it.stage + 1) + ' 级，' + SPACED[it.stage] + ' 天后再次复习。'; }
        } else {
          it.stage = 0; it.status = 'todo'; it.nextTs = now + SPACED[0] * DAY;
          st.fb = '✗ 又答错了，正确答案是 ' + String.fromCharCode(65 + q.a) + '。复习阶段回到起点，1 天后重来。';
        }
        wbSave(); renderWrong();
        if (window.__ibankTrack) window.__ibankTrack('quiz', { chapter: it.chapter, qtype: it.type, correct: ok, kp: it.kp, cause: it.cause, redo: 1 });
      }
      function addWrong(item, pickedArr) {
        WB = WB || wbLoad();
        var k = wbKey(item), it = WB.items[k], now = Date.now();
        if (!it) { it = mkItem(item, pickedArr); it.firstTs = now; it.wrongCount = 0; WB.items[k] = it; }
        if (pickedArr) it.picked = pickedArr.slice();
        it.wrongCount++; it.lastTs = now; it.status = 'todo'; it.stage = 0; it.nextTs = now + SPACED[0] * DAY;
        wbSave(); renderWrong();
      }
      // 事件委托：整个 #wrong-app 只挂一个 click 监听，规避 innerHTML 重绘丢监听（本项目历史踩坑）
      (function () {
        var app = document.getElementById('wrong-app');
        if (!app) return;
        app.addEventListener('click', function (e) {
          var row = e.target.closest('[data-kp]');
          if (row) { wbView.kp = row.getAttribute('data-kp'); wbView.due = false; renderWrong(); return; }
          var t = e.target.closest('[data-act]');
          if (!t) return;
          var act = t.getAttribute('data-act'), qid = t.getAttribute('data-qid'), it = (qid && WB) ? WB.items[qid] : null;
          if (act === 'toggle') { wbOpen[qid] = !wbOpen[qid]; renderWrong(); return; }
          if (act === 'all') { wbView.kp = null; wbView.due = false; renderWrong(); return; }
          if (act === 'due') { wbView.due = !wbView.due; wbView.kp = null; renderWrong(); return; }
          if (act === 'kpclear') { wbView.kp = null; renderWrong(); return; }
          if (act === 'review-all') { wbView.due = true; wbView.kp = null; renderWrong(); return; }
          if (act === 'master') { if (it) { it.status = 'mastered'; it.nextTs = 0; it.hist.push(Date.now()); wbSave(); } renderWrong(); return; }
          if (act === 'unmaster') { if (it) { it.status = 'todo'; it.stage = 0; it.nextTs = Date.now() + DAY; wbSave(); } renderWrong(); return; }
          if (act === 'del') { if (it) { delete WB.items[qid]; delete wbVari[qid]; wbSave(); } renderWrong(); return; }
          if (act === 'cause') { if (it) { it.cause = t.getAttribute('data-cause'); wbSave(); } renderWrong(); return; }
          if (act === 'vari') { startVari(it); return; }
          if (act === 'vcollapse') { delete wbVari[qid]; renderWrong(); return; }
          if (act === 'vans') { answerVari(it, parseInt(t.getAttribute('data-i'), 10)); return; }
          if (act === 'clear-seed') { Object.keys(WB.items).forEach(function (k2) { if (WB.items[k2].isSeed) delete WB.items[k2]; }); wbSave(); renderWrong(); return; }
          if (act === 'export') { wbExport(); return; }
        });
      })();
      function wbExport() {
        var rows = [['题目', '知识点', '章节', '题型', '错误次数', '错因标签', '状态', '复习阶段', '下次复习']];
        wbList().forEach(function (it) {
          rows.push([it.q, it.kp, it.chapter, it.type, it.wrongCount, it.cause,
            it.status === 'mastered' ? '已掌握' : '待复习', it.stage,
            it.nextTs ? new Date(it.nextTs).toLocaleDateString('zh-CN') : '—']);
        });
        var csv = '\ufeff' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
        try {
          var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
          a.download = 'iBank错题清单_' + new Date().toISOString().slice(0, 10) + '.csv';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          if (typeof ibankToast === 'function') ibankToast('已导出 ' + (rows.length - 1) + ' 条错题');
        } catch (e) { if (typeof ibankToast === 'function') ibankToast('导出失败，请检查浏览器权限'); }
      }

      function buildChips() {
        const chBox = document.getElementById('ex-chips-ch'), typeBox = document.getElementById('ex-chips-type');
        const chapters = []; QUIZ.forEach(function (x) { if (chapters.indexOf(x.chapter) === -1) chapters.push(x.chapter); });
        chapters.sort(function (a, b) { return chNum(a) - chNum(b); });
        chBox.innerHTML = '<button class="ex-chip' + (exCh === null ? ' active' : '') + '" data-ch="">全部<span class="cnt">' + QUIZ.length + '</span></button>' + chapters.map(function (c) { var n = QUIZ.filter(function (q) { return q.chapter === c; }).length; return '<button class="ex-chip' + (exCh === c ? ' active' : '') + '" data-ch="' + c + '">' + c + '<span class="cnt">' + n + '</span></button>'; }).join('');
        typeBox.innerHTML = '<button class="ex-chip' + (exType === null ? ' active' : '') + '" data-t="">全部<span class="cnt">' + QUIZ.length + '</span></button>' + TYPES.map(function (t) { var n = QUIZ.filter(function (q) { return q.type === t; }).length; return '<button class="ex-chip' + (exType === t ? ' active' : '') + '" data-t="' + t + '">' + t + '<span class="cnt">' + n + '</span></button>'; }).join('');
      }
      function applyFilter() {
        curList = QUIZ.filter(function (q) { return (exCh === null || q.chapter === exCh) && (exType === null || q.type === exType); });
        cur = 0; renderQuiz();
      }
      function metaHtml() {
        const byType = {}; TYPES.forEach(function (t) { byType[t] = curList.filter(function (q) { return q.type === t; }).length; });
        const multiN = curList.filter(isMulti).length;
        const parts = TYPES.filter(function (t) { return byType[t]; }).map(function (t) { return t + ' ' + byType[t]; });
        const scope = (exCh || '全部章节') + (exType ? ' · ' + exType : '');
        return '<div class="ex-meta">📍 当前：<b>' + scope + '</b> · 共 <b>' + curList.length + '</b> 题（' + parts.join(' / ') + (multiN ? '，其中多选 ' + multiN : '') + '）</div>';
      }
      function navHtml() {
        const total = curList.length, done = doneCount(), ok = okCount();
        const pct = total ? Math.round(done / total * 100) : 0;
        let grid = '';
        curList.forEach(function (q, i) {
          const s = ansStatus.get(q);
          const cls = 'qn-btn' + (s === 'ok' ? ' ok' : s === 'bad' ? ' bad' : '') + (i === cur ? ' cur' : '') + (seenSet.has(q) ? ' seen-dot' : '');
          grid += '<button class="' + cls + '" data-jump="' + i + '" title="第 ' + (i + 1) + ' 题 · ' + q.type + ' · ' + q.chapter + (seenSet.has(q) ? ' · 已看答案' : '') + '">' + (i + 1) + '</button>';
        });
        const pos = cur >= total ? '已完成' : '第 ' + (cur + 1) + ' / ' + total + ' 题';
        return '<div class="qn-box"><div class="qn-head"><div class="qn-t">答题卡 · ' + pos + '</div>'
          + '<div class="qn-legend"><span><i class="lg-cur"></i>当前</span><span><i class="lg-ok"></i>答对</span><span><i class="lg-bad"></i>答错</span><span><i class="lg-dot"></i>看过答案</span></div></div>'
          + '<div class="ex-prog"><div class="pbar"><i style="width:' + pct + '%"></i></div><span>已作答 <b>' + done + '</b> / ' + total + '　答对 <b>' + ok + '</b>　正确率 ' + (done ? Math.round(ok / done * 100) : 0) + '%</span></div>'
          + '<div class="qn-grid">' + grid + '</div></div>';
      }
      function listHtml() {
        let items = '';
        curList.forEach(function (q, i) {
          const s = ansStatus.get(q), seen = seenSet.has(q);
          const lab = s === 'ok' ? '已答对' : s === 'bad' ? '答错' : (seen ? '已看答案' : '未作答');
          const cls = s === 'ok' ? 'ok' : s === 'bad' ? 'bad' : (seen ? 'seen' : '');
          items += '<div class="ql-item' + (i === cur ? ' cur' : '') + '" data-jump="' + i + '" title="点击跳到第 ' + (i + 1) + ' 题">'
            + '<span class="ql-no">' + (i + 1) + '</span>'
            + '<span class="ql-body"><span class="ql-q">' + esc(q.q) + '</span><span class="ql-meta">' + q.type + (isMulti(q) ? '（多选）' : '') + ' · ' + q.chapter + ' · ' + esc(q.kp) + '</span></span>'
            + '<span class="ql-st ' + cls + '">' + lab + '</span></div>';
        });
        return '<details class="ql-wrap" id="ql-wrap"' + (listOpen ? ' open' : '') + '><summary>题目一览（共 ' + curList.length + ' 题，点击任意题可跳转）</summary><div class="ql-list">' + items + '</div></details>';
      }
      function footHtml() {
        const prev = cur > 0 ? '<button class="sim-btn" id="quiz-prev">← 上一题</button>' : '';
        const next = cur < curList.length - 1
          ? '<button class="sim-btn primary" id="quiz-next">下一题 →</button>'
          : '<button class="sim-btn primary" id="quiz-finish">完成本轮 ✓</button>';
        return '<div class="ex-navbtns">' + prev + next + '</div>';
      }
      function headHtml() { return metaHtml() + navHtml() + listHtml(); }
      function refreshNav() {
        const box = quizBox.querySelector('.qn-box'); if (box) box.outerHTML = navHtml();
        const wrap = quizBox.querySelector('#ql-wrap'); if (wrap) wrap.outerHTML = listHtml();
      }

      // —— 要点命中：把学生作答与要点关键词做归一化包含匹配，仅作提示，不作判分依据 ——
      function ptsHit(item) {
        const txt = normTxt(draft.get(item) || '');
        return (item.pts || []).map(function (p) { const k = normTxt(p); return { t: p, hit: k.length > 0 && txt.indexOf(k) > -1 }; });
      }

      function renderObjective(item, head) {
        const s = ansStatus.get(item), multi = isMulti(item);
        const chosen = picked.get(item) || [];
        let html = head + '<div class="quiz-opts">';
        item.opts.forEach(function (o, i) {
          let cls = 'quiz-opt' + (multi ? ' multi' : '') + (chosen.indexOf(i) > -1 ? ' on' : '');
          if (s) {
            const isAns = ansIndexes(item).indexOf(i) > -1;
            if (isAns) cls += ' correct';
            else if (chosen.indexOf(i) > -1) cls += ' wrong';
            cls += ' disabled';
          }
          html += '<button class="' + cls + '" data-i="' + i + '">' + String.fromCharCode(65 + i) + '. ' + esc(o) + '</button>';
        });
        html += '</div>';
        if (multi && !s) html += '<div class="ex-navbtns" id="multi-submit-row"><button class="sim-btn primary" id="quiz-submit-multi">提交答案</button><span class="sub-tip">多选题：可勾选多个选项，全部选对才算正确</span></div>';
        html += '<div class="quiz-score" id="quiz-feedback"></div>' + footHtml();
        quizBox.innerHTML = headHtml() + html;
        if (s) {
          const fb = document.getElementById('quiz-feedback');
          if (fb) fb.innerHTML = s === 'ok' ? '✅ 回答正确' : '❌ 回答错误，正确答案是 ' + ansLabel(item);
        }
      }

      function renderSubjective(item, head) {
        const s = ansStatus.get(item), seen = seenSet.has(item);
        const hits = ptsHit(item), hitN = hits.filter(function (h) { return h.hit; }).length;
        let html = head
          + '<div class="sub-ans-wrap"><textarea id="sub-input" placeholder="在此写下你的作答：先独立思考，再对照参考要点。">' + esc(draft.get(item) || '') + '</textarea>'
          + '<div class="sub-tip">主观题没有唯一标准答案：提交后系统会标出你覆盖到的<b>要点关键词</b>，最终由你自己对照参考答案自评掌握程度。</div></div>'
          + '<div class="ex-navbtns"><button class="sim-btn primary" id="sub-submit">' + (seen ? '重新提交并对照要点' : '提交作答并对照要点') + '</button>'
          + (seen ? '' : '<button class="sim-btn" id="quiz-reveal">直接查看参考要点</button>') + '</div>';
        if (seen) {
          html += '<div class="pts-hit"><div class="hd">要点覆盖：命中 <b>' + hitN + '</b> / ' + hits.length + ' 个要点关键词</div><div class="pts-list">'
            + hits.map(function (h) { return '<span class="pt' + (h.hit ? ' hit' : '') + '">' + (h.hit ? '✓ ' : '○ ') + esc(h.t) + '</span>'; }).join('')
            + '</div></div>'
            + '<div class="quiz-ans-box" id="quiz-ans"><b>参考要点：</b>' + esc(item.ans) + '</div>';
          if (s) {
            html += '<div class="quiz-score" id="quiz-feedback">' + (s === 'ok' ? '✅ 已自评：掌握' : '❌ 已自评：还需复习') + '　<span class="sub-tip">（自评结果已计入答题卡与学习统计）</span></div>';
          } else {
            html += '<div class="self-assess"><span>对照参考要点后自评：</span><button class="sim-btn primary" id="sub-ok">✅ 我掌握了</button><button class="sim-btn" id="sub-bad">❌ 还需复习</button></div>';
          }
        }
        html += footHtml();
        quizBox.innerHTML = headHtml() + html;
      }

      function renderQuiz() {
        if (!curList.length) { quizBox.innerHTML = '<div class="todo-note">该筛选条件下暂无题目，请切换章节或题型。</div>'; return; }
        if (cur >= curList.length) {
          const total = curList.length, done = doneCount();
          quizBox.innerHTML = headHtml() + '<div class="quiz-score">🎉 本轮练习已完成！共 ' + total + ' 题，已作答 <strong>' + done + '</strong> 题，答对 <strong>' + okCount() + '</strong> 题' + (done ? '，正确率 ' + Math.round(okCount() / done * 100) + '%' : '') + '。</div><div class="ex-navbtns"><button class="sim-btn primary" id="quiz-restart">清空重做</button><button class="sim-btn" id="quiz-first">回到第 1 题</button></div>';
          return;
        }
        const item = curList[cur];
        const tag = item.type + (isMulti(item) ? '（多选）' : '') + ' · ' + item.chapter;
        const head = '<div class="quiz-q"><strong>第 ' + (cur + 1) + ' / ' + curList.length + ' 题</strong>　' + esc(item.q) + '　<span class="q-tag">' + tag + '</span></div>';
        if (!item.opts) renderSubjective(item, head);
        else renderObjective(item, head);
      }

      function pickOption(item, i) {
        if (ansStatus.has(item)) return;           // 已作答，忽略重复点击
        picked.set(item, [i]);
        const ok = i === item.a;
        ansStatus.set(item, ok ? 'ok' : 'bad');
        const btns = quizBox.querySelectorAll('.quiz-opt');
        Array.prototype.forEach.call(btns, function (b) {
          const bi = parseInt(b.getAttribute('data-i'), 10);
          if (bi === item.a) b.classList.add('correct');
          else if (bi === i) b.classList.add('wrong');
          b.classList.add('disabled');
        });
        const fb = document.getElementById('quiz-feedback');
        if (fb) fb.innerHTML = ok ? '✅ 回答正确' : '❌ 回答错误，正确答案是 ' + ansLabel(item);
        if (!ok) addWrong(item);
        trackAns(item, ok);
        refreshNav();
      }

      function submitMulti(item) {
        if (ansStatus.has(item)) return;
        const chosen = (picked.get(item) || []).slice().sort(function (a, b) { return a - b; });
        if (!chosen.length) { if (typeof ibankToast === 'function') ibankToast('请先勾选至少一个选项再提交'); return; }
        const ok = chosen.join(',') === ansIndexes(item).join(',');
        ansStatus.set(item, ok ? 'ok' : 'bad');
        const btns = quizBox.querySelectorAll('.quiz-opt');
        Array.prototype.forEach.call(btns, function (b) {
          const bi = parseInt(b.getAttribute('data-i'), 10);
          b.classList.remove('on');
          b.classList.add('disabled');
          if (ansIndexes(item).indexOf(bi) > -1) b.classList.add('correct');
          else if (chosen.indexOf(bi) > -1) b.classList.add('wrong');
        });
        const row = document.getElementById('multi-submit-row'); if (row) row.style.display = 'none';
        const fb = document.getElementById('quiz-feedback');
        if (fb) fb.innerHTML = ok ? '✅ 回答正确' : '❌ 回答错误，正确答案是 ' + ansLabel(item);
        if (!ok) addWrong(item);
        trackAns(item, ok);
        refreshNav();
      }

      quizBox.addEventListener('click', function (e) {
        const jump = e.target.closest('[data-jump]');
        if (jump) { if (cur < curList.length) { const ta = document.getElementById('sub-input'); if (ta) draft.set(curList[cur], ta.value); } cur = parseInt(jump.getAttribute('data-jump'), 10); renderQuiz(); return; }
        const opt = e.target.closest('.quiz-opt');
        if (opt) {
          if (cur >= curList.length) return;
          const item = curList[cur];
          if (!item || !item.opts || ansStatus.has(item)) return;
          const i = parseInt(opt.getAttribute('data-i'), 10);
          if (isMulti(item)) {
            let arr = (picked.get(item) || []).slice();
            if (arr.indexOf(i) > -1) arr = arr.filter(function (x) { return x !== i; }); else arr.push(i);
            picked.set(item, arr);
            opt.classList.toggle('on');
          } else pickOption(item, i);
          return;
        }
        const id = e.target.id;
        if (id === 'sub-submit') {
          const item = curList[cur];
          const ta = document.getElementById('sub-input');
          if (ta) draft.set(item, ta.value);
          if (!seenSet.has(item) && !(ta && ta.value.trim())) { if (typeof ibankToast === 'function') ibankToast('先写下你的作答，再对照参考要点吧'); return; }
          seenSet.add(item); renderQuiz(); refreshNav(); return;
        }
        if (id === 'sub-ok' || id === 'sub-bad') {
          const item = curList[cur];
          const ok = id === 'sub-ok';
          ansStatus.set(item, ok ? 'ok' : 'bad');
          if (!ok) addWrong(item);
          trackAns(item, ok); renderQuiz(); return;
        }
        if (id === 'quiz-reveal') { const item = curList[cur]; const ta = document.getElementById('sub-input'); if (ta) draft.set(item, ta.value); seenSet.add(item); renderQuiz(); return; }
        if (id === 'quiz-submit-multi') { submitMulti(curList[cur]); return; }
        if (id === 'quiz-next') { const ta = document.getElementById('sub-input'); if (ta) draft.set(curList[cur], ta.value); cur++; renderQuiz(); return; }
        if (id === 'quiz-prev') { const ta = document.getElementById('sub-input'); if (ta) draft.set(curList[cur], ta.value); cur--; renderQuiz(); return; }
        if (id === 'quiz-finish') { cur = curList.length; renderQuiz(); return; }
        if (id === 'quiz-first') { cur = 0; renderQuiz(); return; }
        if (id === 'quiz-restart') { curList.forEach(function (q) { ansStatus.delete(q); seenSet.delete(q); picked.delete(q); draft.delete(q); }); cur = 0; renderQuiz(); return; }
      });
      quizBox.addEventListener('input', function (e) { const t = e.target; if (t && t.id === 'sub-input' && cur < curList.length) draft.set(curList[cur], t.value); });
      quizBox.addEventListener('toggle', function (e) { if (e.target && e.target.id === 'ql-wrap') listOpen = e.target.open; }, true);

      const chBox = document.getElementById('ex-chips-ch'), typeBox = document.getElementById('ex-chips-type');
      chBox.addEventListener('click', function (e) { const b = e.target.closest('.ex-chip'); if (!b) return; exCh = b.getAttribute('data-ch') || null; buildChips(); applyFilter(); });
      typeBox.addEventListener('click', function (e) { const b = e.target.closest('.ex-chip'); if (!b) return; exType = b.getAttribute('data-t') || null; buildChips(); applyFilter(); });
      const exTab = document.querySelector('.tab-btn[data-page="p-exercise"]');
      if (exTab) exTab.addEventListener('click', function () { let ch = null; try { ch = sessionStorage.getItem('ibank_exercise_filter'); } catch (e) {} exCh = ch || null; buildChips(); applyFilter(); });

      const exDoneBtn = document.getElementById('ex-done-btn');
      function syncExDone() { let d = false; try { d = localStorage.getItem('ibank_exercise_done') === '1'; } catch (e) {} exDoneBtn.classList.toggle('done', d); exDoneBtn.textContent = d ? '✓ 本次训练完成' : '标记本次训练完成'; }
      exDoneBtn.addEventListener('click', function () { const d = exDoneBtn.classList.contains('done'); try { localStorage.setItem('ibank_exercise_done', d ? '0' : '1'); } catch (e) {} syncExDone(); });
      syncExDone();
      ibankMakeTimer(document.getElementById('ex-timer'), 'ibank_exercise_time', 'ibank_exercise_auto', function () { try { localStorage.setItem('ibank_exercise_done', '1'); } catch (e) {} syncExDone(); ibankToast('实务习题训练已学满 1 小时，自动标记为完成 ✓'); });

      buildChips(); applyFilter(); renderWrong();
      // v36：跨 IIFE 暴露错题账本核心给标签切换处理器（2258 块）与教师端聚合面板（登录 IIFE）
      window.wbSeed = wbSeed; window.CAUSES = CAUSES; window.renderWrong = renderWrong;
      // 只读测试钩子：返回某错题当前变式题的正确选项下标（供自动化验收确定性点击，不影响用户交互）
      window.__wbVariA = function (qid) { var st = wbVari[qid]; return st ? st.q.a : -1; };
    })();

// ===== 学情画像（v56：真实数据驱动 + 雷达/条形双向联动 + 下钻）=====
    // 设计对标：ECharts/Highcharts radar 的 emphasis 联动 + Tableau 的 linked highlighting
    //（点/悬停一侧，另一侧同步高亮），再叠一层下钻明细。v55 前本页是纯静态假分（78/71/82…），
    // 与章节进度、答题记录、错题账本三路真实数据完全无连线，雷达与条形也各画各的。
    // 本版把六维映射到第 0–7 章真实章节，分数由本机学习行为加权算出；无数据不编造，显示「待测评」。
    (function () {
      // 六维 → 真实章节映射（章节号与教学大纲一致；「宏观市场」无对应专章，
      // 由第2章融资环境 / 第5章债券定价的内容映射而来，页面上如实标注）
      const DIMS = [
        { name: '承销实务', chs: ['第0章', '第1章', '第3章', '第4章'], note: '投行职业与业务范围、IPO 发行承销、上市公司再融资' },
        { name: '估值方法', chs: ['第2章', '第3章', '第7章'], note: '融资方案与资本结构、发行定价方法、并购估值' },
        { name: '并购重组', chs: ['第7章'], note: '并购动因、支付方式、杠杆收购与反收购' },
        { name: '债券业务', chs: ['第4章', '第5章'], note: '可转债 / 可交换债、债券发行承销与信用评级' },
        { name: '宏观市场', chs: ['第2章', '第5章'], note: '利率环境与融资成本（由第 2 / 5 章内容映射）' },
        { name: '尽职调查', chs: ['第3章', '第6章', '第7章'], note: 'IPO / 资产证券化 / 并购三类业务的尽调要点' }
      ];
      const CAUSE_NAMES = ['概念不清', '方法不会', '粗心失误', '审题偏差'];
      const CAUSE_COLOR = { '概念不清': '#ef4444', '方法不会': '#f59e0b', '粗心失误': '#3b82f6', '审题偏差': '#94a3b8' };
      const DEMO_KEY = 'ibank_demo_profile';
      const ALL_CHS = ['第0章', '第1章', '第2章', '第3章', '第4章', '第5章', '第6章', '第7章'];
      // 每章 1.5 小时视为「时长维度满分」，防止长时段把分数拉满
      const TIME_FULL = 5400;
      const DAY = 86400000;

      const svg = document.getElementById('radar');
      const barsEl = document.getElementById('profile-bars');
      const kpisEl = document.getElementById('pf-kpis');
      const detEl = document.getElementById('pf-detail');
      const srcEl = document.getElementById('pf-src');
      const footEl = document.getElementById('pf-foot');
      const cx = 180, cy = 158, R = 104, n = DIMS.length;
      let sel = -1;                                   // 锁定的维度下标，-1 = 未锁定
      let SCORES = [];                                // 最近一次 compute 的结果

      function pt(i, r) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
      function pe(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
      function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
      function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
      function num(k) { try { return parseInt(localStorage.getItem(k) || '0', 10) || 0; } catch (e) { return 0; } }
      function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

      // ---- 数据源：优先读本机真实记录；存在示例数据集时改读示例（两者物理隔离，绝不覆盖真实数据）----
      function readStore() {
        var demo = lsGet(DEMO_KEY, null);
        if (demo && demo.quiz) {
          return { demo: true, done: demo.done || {}, evs: demo.quiz || [], wrong: demo.wrong || [], times: demo.times || {}, at: demo.built || 0 };
        }
        var done = lsGet('ibank_chapter_done', {}) || {};
        var evs = lsGet('ibank_events_local', []);
        if (!Array.isArray(evs)) evs = [];
        var wb = lsGet('ibank_wrongbook', null);
        var items = (wb && wb.items && typeof wb.items === 'object') ? Object.keys(wb.items).map(function (k) { return wb.items[k]; }) : [];
        // ★ 错题账本空时会自动播种 8 条 isSeed 示例错题（v36 起的行为，供演示用）。
        //   那些不是学生真实表现，若计入会把六维算成 0 分——正是本页要消除的「假数据」问题，故剔除。
        items = items.filter(function (w) { return w && !w.isSeed; });
        var times = {};
        ALL_CHS.forEach(function (c) { times[c] = num('ibank_time_' + c); });
        return { demo: false, done: done, evs: evs, wrong: items, times: times, at: 0 };
      }

      // 示例数据用固定种子生成，可复现；单独存 DEMO_KEY，不污染真实键。
      // 章节正确率参照"学期过半的学生"设定（0.62–0.85），使六维呈现可信且有区分度的分布。
      function buildDemo() {
        var rnd = mulberry32(20261007);
        var plan = [['第0章', 6, 0.85], ['第1章', 10, 0.80], ['第2章', 8, 0.70], ['第3章', 12, 0.75],
        ['第4章', 9, 0.65], ['第5章', 8, 0.78], ['第6章', 6, 0.62], ['第7章', 9, 0.68]];
        var quiz = [], wrong = [], i = 0;
        plan.forEach(function (p) {
          for (var k = 0; k < p[1]; k++) {
            var ok = rnd() < p[2];
            quiz.push({ type: 'quiz', chapter: p[0], qtype: '选择', correct: ok, ts: Date.now() - (40 - i) * 3600000 });
            if (!ok) wrong.push({ chapter: p[0], status: rnd() < 0.35 ? 'mastered' : 'todo', cause: CAUSE_NAMES[Math.floor(rnd() * 4)], kp: '演示知识点' });
            i++;
          }
        });
        return {
          done: { '第0章': 1, '第1章': 1, '第2章': 1, '第3章': 1, '第5章': 1 },
          times: { '第0章': 2400, '第1章': 5400, '第2章': 4200, '第3章': 5100, '第4章': 1800, '第5章': 3600, '第6章': 900, '第7章': 2700 },
          quiz: quiz, wrong: wrong, built: Date.now()
        };
      }

      // ---- 维度打分：四项加权，缺项按剩余权重归一化（而不是当成 0 拉低分数）----
      // 关键：某一项若「完全没有数据信号」，必须置 null（不参与计分 → 整维显示待测评），
      // 不能当成 0 分计入——否则全新用户六维全是 0，看起来像"考了 0 分"而不是"还没数据"。
      // 章节完成度的信号判据是 done 映射表非空：表为空 = 用户还没标记过任何章节，属无信号。
      function computeDim(d, st) {
        var chs = d.chs;
        var q = st.evs.filter(function (e) { return e && e.type === 'quiz' && chs.indexOf(e.chapter) >= 0; });
        var okN = 0; q.forEach(function (e) { if (e.correct === true) okN++; });
        var acc = q.length ? okN / q.length : null;
        var doneAny = !!(st.done && Object.keys(st.done).length);
        var doneN = 0; chs.forEach(function (c) { if (st.done && st.done[c]) doneN++; });
        var prog = (doneAny && chs.length) ? doneN / chs.length : null;
        var ws = st.wrong.filter(function (w) { return w && chs.indexOf(w.chapter) >= 0; });
        var mastered = 0; ws.forEach(function (w) { if (w.status === 'mastered') mastered++; });
        var digest = ws.length ? mastered / ws.length : null;
        var sec = 0; chs.forEach(function (c) { sec += (st.times && st.times[c]) || 0; });
        var perCh = chs.length ? sec / chs.length : 0;
        // 时长信号门槛 60 秒：翻页几秒会被计时器写进localStorage，那不构成「学习时长」，
        // 若照算会把维度算成 0 分（看起来像挂了），不如判定为无信号。
        var time = sec >= 60 ? Math.min(1, perCh / TIME_FULL) : null;

        var parts = [];
        if (acc !== null) parts.push([acc, 0.50]);
        if (prog !== null) parts.push([prog, 0.22]);
        if (digest !== null) parts.push([digest, 0.18]);
        if (time !== null) parts.push([time, 0.10]);
        var score = null;
        if (parts.length) {
          var ws2 = 0, acc2 = 0;
          parts.forEach(function (p) { ws2 += p[1]; acc2 += p[0] * p[1]; });
          score = Math.round(acc2 / ws2 * 100);
          // ★ 置信度下限：只答了 1 题就判 0 分会严重误导（实测答错 1 题 → 并购重组 0 分）。
          //   证据越少，越把分数往50 拉（50 =完全无证据），样本 ≥8 题时不再干预。
          var evid = q.length + ws.length;
          if (evid < 8) score = Math.round(score + (50 - score) * (8 - evid) / 8);
        }
        var cz = {};
        ws.forEach(function (w) { var c = w.cause || '未标注'; cz[c] = (cz[c] || 0) + 1; });
        var evid = q.length + ws.length;
        return { d: d, score: score, evid: evid, conf: evid >= 8 ? '高' : evid >= 4 ? '中' : '低', acc: acc, okN: okN, qN: q.length, doneN: doneN, chN: chs.length, digest: digest, wN: ws.length, mastered: mastered, sec: sec, time: time, causes: cz };
      }

      function fmtHms(s) { var h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return (h ? h + ' 小时 ' : '') + (m ? m + ' 分' : (h ? '' : '不足 1 分')); }
      function pct(x) { return x === null ? '—' : Math.round(x * 100) + '%'; }

      // ---- 雷达骨架（只建一次，之后只改多边形点位 / 顶点 / 数值）----
      const dots = [], vals = [], axes = [], labs = [];
      function buildRadar() {
        var h = '';
        [0.25, 0.5, 0.75, 1].forEach(function (f) {
          var pts = '';
          for (var i = 0; i < n; i++) { var p = pt(i, R * f); pts += p[0].toFixed(1) + ',' + p[1].toFixed(1) + ' '; }
          h += '<polygon points="' + pts + '" fill="none" stroke="var(--chart-grid)" stroke-width="1"/>';
        });
        h += '<circle class="rd-center-bg" cx="' + cx + '" cy="' + cy + '" r="27"/>';
        h += '<text class="rd-center-v" id="rd-cv" x="' + cx + '" y="' + (cy - 1) + '">—</text>';
        h += '<text class="rd-center-k" x="' + cx + '" y="' + (cy + 15) + '">综合掌握度</text>';
        h += '<polygon id="rd-poly" fill="var(--chart-area)" stroke="var(--chart-indigo)" stroke-width="2"/>';
        for (var i2 = 0; i2 < n; i2++) {
          var e = pt(i2, R);
          h += '<line class="rd-axis" data-i="' + i2 + '" x1="' + cx + '" y1="' + cy + '" x2="' + e[0].toFixed(1) + '" y2="' + e[1].toFixed(1) + '" stroke="var(--chart-axis)" stroke-width="1"/>';
        }
        for (var i3 = 0; i3 < n; i3++) {
          var lp = pt(i3, R + 25);
          h += '<text class="rd-lab" data-i="' + i3 + '" x="' + lp[0].toFixed(1) + '" y="' + lp[1].toFixed(1) + '" font-size="12" text-anchor="middle" dominant-baseline="middle">' + DIMS[i3].name + '</text>';
          h += '<text class="rd-val na" data-i="' + i3 + '" id="rdv' + i3 + '">—</text>';
          h += '<circle class="rd-dot" data-i="' + i3 + '" id="rdd' + i3 + '" r="3.6" fill="var(--chart-indigo)" stroke="var(--chart-bg)" stroke-width="1.5"/>';
          h += '<line class="rd-hit" data-i="' + i3 + '" x1="' + cx + '" y1="' + cy + '" x2="' + lp[0].toFixed(1) + '" y2="' + lp[1].toFixed(1) + '"/>';
        }
        svg.innerHTML = h;
        for (var k2 = 0; k2 < n; k2++) {
          axes.push(svg.querySelector('.rd-axis[data-i="' + k2 + '"]'));
          labs.push(svg.querySelector('.rd-lab[data-i="' + k2 + '"]'));
          vals.push(svg.querySelector('#rdv' + k2));
          dots.push(svg.querySelector('#rdd' + k2));
        }
      }

      function updateRadar(rows) {
        var pts = '', any = false;
        rows.forEach(function (r, i) {
          if (r.score === null) {
            vals[i].textContent = '待测评'; vals[i].setAttribute('class', 'rd-val na');
            dots[i].setAttribute('r', '2.4'); dots[i].setAttribute('fill', 'var(--chart-axis)');
            pts += pt(i, 0)[0].toFixed(1) + ',' + pt(i, 0)[1].toFixed(1) + ' ';
            return;
          }
          any = true;
          var rr = R * r.score / 100;
          pts += pt(i, rr)[0].toFixed(1) + ',' + pt(i, rr)[1].toFixed(1) + ' ';
          dots[i].setAttribute('r', '3.6'); dots[i].setAttribute('fill', 'var(--chart-indigo)');
          // 数值标签固定落在 R-20 的环上：若贴着顶点走，低分维度的数字会挤到圆心的
          // 「综合掌握度」上（实测 44/51 与 58 重叠），固定环位可彻底避开。
          var vp = pt(i, R - 20);
          vals[i].setAttribute('x', vp[0].toFixed(1)); vals[i].setAttribute('y', vp[1].toFixed(1));
          vals[i].setAttribute('class', 'rd-val'); vals[i].textContent = r.score;
        });
        svg.querySelector('#rd-poly').setAttribute('points', pts);
        var ok = rows.filter(function (r) { return r.score !== null; });
        var avg = ok.length ? Math.round(ok.reduce(function (s, r) { return s + r.score; }, 0) / ok.length) : 0;
        svg.querySelector('#rd-cv').textContent = ok.length ? String(avg) : '—';
        return { avg: avg, graded: ok.length, any: any };
      }

      // ---- KPI 条 ----
      function renderKpis(st, rows, agg) {
        var qAll = st.evs.filter(function (e) { return e && e.type === 'quiz'; });
        var okAll = 0; qAll.forEach(function (e) { if (e.correct === true) okAll++; });
        var due = 0, open = 0;
        st.wrong.forEach(function (w) {
          if (w.status === 'mastered') return;
          open++;
          if ((w.nextTs || 0) <= Date.now()) due++;
        });
        var doneN = 0; ALL_CHS.forEach(function (c) { if (st.done && st.done[c]) doneN++; });
        var cards = [
          { k: '综合掌握度', v: agg.graded ? agg.avg : '—', s: agg.graded ? agg.graded + ' / ' + n + ' 个维度已计分' : '暂无学习数据' },
          { k: '章节完成', v: doneN + '<small>/8</small>', s: '进度取自课程学习页' },
          { k: '累计答题', v: String(qAll.length), s: okAll > 0 ? '答对 ' + okAll + ' 题' : '去习题训练产生记录' },
          { k: '总体正确率', v: qAll.length ? pct(okAll / qAll.length) : '—', s: qAll.length ? '基于本机 ' + qAll.length + ' 条答题记录' : '尚无答题记录' },
          { k: '未掌握错题', v: String(open), s: due ? ('其中 ' + due + ' 题今日待复习') : (open ? '今日无到期复习（按间隔重复排程）' : '错题账本为空') }
        ];
        kpisEl.innerHTML = cards.map(function (c) {
          return '<div class="pf-kpi"><div class="k">' + c.k + '</div><div class="v">' + c.v + '</div><div class="s">' + pe(c.s) + '</div></div>';
        }).join('');
      }

      // ---- 维度条 ----
      function renderBars(rows) {
        barsEl.innerHTML = rows.map(function (r, i) {
          var w = r.score === null ? 0 : r.score;
          var sub = r.score === null
            ? '本维度尚无学习记录：去「课程学习」或「习题训练」产生数据后自动计分'
            : '答题 ' + r.okN + '/' + r.qN + '（' + pct(r.acc) + '）· 章节 ' + r.doneN + '/' + r.chN + ' · 错题消化 ' + r.mastered + '/' + r.wN + ' · 时长 ' + fmtHms(r.sec);
          return '<button class="profile-bar' + (r.score === null ? ' na' : '') + '" type="button" data-i="' + i + '" aria-pressed="false">'
            + '<span class="name">' + r.d.name + '</span>'
            + '<span class="track"><span class="fill" style="width:' + w + '%"></span></span>'
            + '<span class="val">' + (r.score === null ? '待测评' : r.score) + '</span>'
            + '<span class="sub">' + pe(sub) + '</span></button>';
        }).join('');
      }

      // ---- 下钻明细 ----
      function renderDetail(i) {
        var r = SCORES[i];
        if (!r) { detEl.innerHTML = '<div class="pd-h"><h5>维度明细</h5></div><div class="pf-empty">点击左侧雷达任一顶点，或右侧任一维度行，查看该维度的下钻明细。</div>'; return; }
        var st = readStore();
        var chRows = r.d.chs.map(function (c) {
          var q = st.evs.filter(function (e) { return e && e.type === 'quiz' && e.chapter === c; });
          var ok = 0; q.forEach(function (e) { if (e.correct === true) ok++; });
          var w = st.wrong.filter(function (x) { return x && x.chapter === c && x.status !== 'mastered'; }).length;
          var isDone = !!(st.done && st.done[c]);
          return '<button class="pf-ch" type="button" data-ch="' + c + '">'
            + '<span class="cn">' + c + (isDone ? '<span class="ok">✓ 已完成</span>' : '') + '</span>'
            + '<span class="cm">答题 <b>' + (q.length ? ok + '/' + q.length : '—') + '</b>' + (q.length ? '（' + pct(ok / q.length) + '）' : '') + ' · 待复习错题 <b>' + w + '</b></span>'
            + '</button>';
        }).join('');
        var czKeys = Object.keys(r.causes).sort(function (a, b) { return r.causes[b] - r.causes[a]; });
        var czHtml = czKeys.length ? '<div class="pf-causes">' + czKeys.map(function (k) {
          return '<div class="pf-cz"><span>' + pe(k) + '</span><span class="ct"><i style="width:' + Math.round(r.causes[k] / r.wN * 100) + '%;background:' + (CAUSE_COLOR[k] || '#64748b') + '"></i></span><span class="cv">' + r.causes[k] + '</span></div>';
        }).join('') + '</div>' : '<div class="pf-empty" style="padding:6px 0;text-align:left">该维度暂无错题记录。</div>';
        var weakest = r.d.chs.filter(function (c) { return !(st.done && st.done[c]); })[0] || r.d.chs[0];
        detEl.innerHTML =
          '<div class="pd-h"><h5>' + r.d.name + '</h5>'
          + '<span class="pd-score">' + (r.score === null ? '待测评' : r.score) + '</span>'
          + '<span class="pd-tag">' + (r.score === null ? '无数据' : (r.score >= 80 ? '掌握较好' : r.score >= 65 ? '基本掌握' : '仍需补强')) + '</span>'
          + (r.score !== null && r.conf !== '高' ? '<span class="pd-tag">置信度' + r.conf + '（样本 ' + r.evid + '，继续练习即自动校正）</span>' : '')
          + '<span class="pd-tag">覆盖 ' + r.d.chs.join(' / ') + '</span></div>'
          + '<div class="pd-sub">' + pe(r.d.note) + '</div>'
          + '<div class="pf-sec-t">逐章明细（点击卡片跳转到该章）</div>'
          + '<div class="pf-chs">' + chRows + '</div>'
          + '<div class="pf-sec-t">错因分布（本维度 ' + r.wN + ' 道错题）</div>'
          + czHtml
          + '<div class="pf-acts">'
          + '<button class="sim-btn primary" type="button" data-goch="' + weakest + '">去练这一维度（' + weakest + '）</button>'
          + '<button class="sim-btn ghost" type="button" data-gop="p-wrong">查看错题定位</button>'
          + '</div>';
      }

      // ---- 联动：悬停/点击任一侧，另一侧同步 ----
      function focus(i) {
        for (var k = 0; k < n; k++) {
          var on = (k === i);
          if (axes[k]) { axes[k].setAttribute('class', 'rd-axis' + (on ? ' on' : '')); axes[k].setAttribute('stroke-width', on ? '2' : '1'); }
          if (labs[k]) labs[k].setAttribute('class', 'rd-lab' + (on ? ' on' : ''));
          if (dots[k]) dots[k].setAttribute('r', on ? '5.4' : (SCORES[k] && SCORES[k].score !== null ? '3.6' : '2.4'));
          var row = barsEl.querySelector('.profile-bar[data-i="' + k + '"]');
          if (row) row.classList.toggle('on', on);
        }
      }
      function select(i) { sel = (sel === i ? -1 : i); renderDetail(sel); focus(sel); syncPressed(); }
      function syncPressed() {
        Array.prototype.forEach.call(barsEl.querySelectorAll('.profile-bar'), function (b) {
          b.setAttribute('aria-pressed', (+b.getAttribute('data-i') === sel) ? 'true' : 'false');
        });
      }

      svg.addEventListener('mouseover', function (e) {
        var t = e.target.closest('[data-i]'); if (!t) return;
        var i = +t.getAttribute('data-i');
        if (i !== sel) { focus(i); if (sel < 0) renderDetail(i); }
      });
      svg.addEventListener('mouseleave', function () { focus(sel); });
      svg.addEventListener('click', function (e) {
        var t = e.target.closest('[data-i]'); if (!t) return;
        select(+t.getAttribute('data-i'));
      });
      barsEl.addEventListener('mouseover', function (e) {
        var b = e.target.closest('.profile-bar'); if (!b) return;
        var i = +b.getAttribute('data-i');
        if (i !== sel) { focus(i); if (sel < 0) renderDetail(i); }
      });
      barsEl.addEventListener('mouseleave', function () { focus(sel); });
      barsEl.addEventListener('click', function (e) {
        var b = e.target.closest('.profile-bar'); if (!b) return;
        select(+b.getAttribute('data-i'));
      });
      barsEl.addEventListener('focusin', function (e) {
        var b = e.target.closest('.profile-bar'); if (!b) return;
        var i = +b.getAttribute('data-i'); focus(i); if (sel < 0) renderDetail(i);
      });
      detEl.addEventListener('click', function (e) {
        var ch = e.target.closest('[data-ch]');
        if (ch) { gotoChapter(ch.getAttribute('data-ch')); return; }
        var g = e.target.closest('[data-goch]');
        if (g) { gotoExercise(g.getAttribute('data-goch')); return; }
        var p = e.target.closest('[data-gop]');
        if (p) { var btn = document.querySelector('.tab-btn[data-page="' + p.getAttribute('data-gop') + '"]'); if (btn) btn.click(); }
      });

      function gotoChapter(no) {
        var btn = document.querySelector('.tab-btn[data-page="p-graph"]');
        if (btn) btn.click();
        setTimeout(function () { if (window.__ibankChapterGo) window.__ibankChapterGo(no); }, 80);
      }
      function gotoExercise(no) {
        try { sessionStorage.setItem('ibank_exercise_filter', no); } catch (e) {}
        var btn = document.querySelector('.tab-btn[data-page="p-exercise"]');
        if (btn) btn.click(); else ibankToast('未找到习题训练页');
      }

      // ---- 数据源说明 + 页脚口径 ----
      function renderSrc(st, rows) {
        var graded = rows.filter(function (r) { return r.score !== null; }).length;
        if (st.demo) {
          srcEl.innerHTML = '当前为<b>示例数据集</b>（固定种子生成，可复现），用于演示联动效果。已计分 <b>' + graded + '/' + n + '</b> 个维度。'
            + '<span class="pf-flag demo">示例数据</span>';
        } else {
          srcEl.innerHTML = '数据源：本机学习记录（章节完成 · 习题答题 · 错题账本 · 学习时长）。已计分 <b>' + graded + '/' + n + '</b> 个维度。'
            + '<span class="pf-flag live">真实记录</span>';
        }
        footEl.innerHTML = '计分口径：习题正确率 50% + 章节完成度 22% + 错题消化率 18% + 学习时长 10%（每章满时长按 1.5 小时计）。'
          + '某维度缺少某一类数据时，该项权重按剩余项重新归一化，不按 0 分计入；四类数据全缺则显示「待测评」，不使用估算值。'
          + '样本不足 8 题时会把分数向 50 分（无证据基准）收敛，并在明细里标出置信度，避免「答 1 题错就判0 分」的误导。'
          + '时长与答题数据来自本机 localStorage，换浏览器或清理站点数据后会重新为空。';
      }

      // ---- 总渲染 ----
      function render() {
        var st = readStore();
        SCORES = DIMS.map(function (d) { return computeDim(d, st); });
        var agg = updateRadar(SCORES);
        renderKpis(st, SCORES, agg);
        renderBars(SCORES);
        renderSrc(st, SCORES);
        if (sel >= 0 && sel < n) { renderDetail(sel); } else { renderDetail(-1); }
        syncPressed(); focus(sel);
      }
      window.__ibankProfileRefresh = render;

      var demoBtn = document.getElementById('pf-demo');
      if (demoBtn) demoBtn.addEventListener('click', function () {
        lsSet(DEMO_KEY, buildDemo());
        sel = -1; render();
        ibankToast('已载入示例数据（独立存放，不覆盖你的真实记录）');
      });
      var wipeBtn = document.getElementById('pf-wipe');
      if (wipeBtn) wipeBtn.addEventListener('click', function () {
        try { localStorage.removeItem(DEMO_KEY); } catch (e) {}
        sel = -1; render();
        ibankToast('已切回本机真实记录');
      });

      buildRadar();
      render();
    })();
    // ===== 科创板 IPO 定价配售仿真（参照上海师范大学虚仿实验：可算法化规则链）=====
    // v32：判分从「唯一正解」改为「合规区间 + 质量分档 + 可重试」；新增实时定价体检、
    //      逐项解析、决策后果传导、分步得分明细与导出。
    (function () {
      function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
      function fmtMoney(n){if(!isFinite(n))return '—';if(n>=1e8)return (n/1e8).toFixed(2)+' 亿元';if(n>=1e4)return (n/1e4).toFixed(1)+' 万元';return Math.round(n).toLocaleString('zh-CN')+' 元';}
      function fmtN(n){return isFinite(n)?Math.round(n).toLocaleString('zh-CN'):'—';}
      function pc(x,d){return isFinite(x)?(x*100).toFixed(d==null?1:d)+'%':'—';}

      // 虚构情景公司（种子化，可反复练，学生查不到标准答案）
      const CO = { name:'芯辰微电子', code:'688CXX', industry:'半导体器件制造', industryPE:45.2,
        offerShares:12000000, postTotal:100000000, planRaise:456000000, netProfit:120000000,
        offlineInit:0.70, onlineInit:0.30 };
      const EPS = CO.netProfit/CO.postTotal;

      let Q=[], onlineMult=0, seedNow=0;
      function genQuotes(seed){
        const rnd=mulberry32(seed); const N=480; const arr=[];
        for(let i=0;i<N;i++){
          const r=rnd(); const cls=r<0.42?'A':(r<0.66?'B':'C');
          const base=44, disp=cls==='A'?2.8:5.2;
          let p=base+(rnd()+rnd()+rnd()-1.5)*disp*1.6; p=Math.max(18,Math.min(70,+p.toFixed(2)));
          const qty=Math.round((80000+rnd()*1800000)/100)*100;
          arr.push({cls:cls,price:p,qty:qty});
        }
        return arr;
      }
      // 网上超额认购倍数每轮随机 → 回拨档位随之变化（≤50 不回拨 / 51–100 回拨 10% / >100 回拨 20%）
      function genOnlineMult(seed){
        const r=mulberry32(seed+7777); const t=r();
        if(t<0.34) return Math.round(30+r()*20);
        if(t<0.68) return Math.round(55+r()*45);
        return Math.round(110+r()*1390);
      }
      function cbRate(mult){ return mult>100?0.20:(mult>50?0.10:0); }

      const STEPS=[
        {key:'collect',title:'报价收集',weight:0},
        {key:'excludeHigh',title:'高价剔除',weight:15},
        {key:'reference',title:'定价参考',weight:10},
        {key:'setPrice',title:'确定发行价',weight:30},
        {key:'excludeLow',title:'低价剔除',weight:10},
        {key:'callback',title:'回拨机制',weight:20},
        {key:'allocate',title:'网下配售',weight:15}
      ];
      const MAXTRY=3;

      const REF_OPTS=[
        {t:'中位数与加权平均数的孰低值', why:'科创板规定发行价格不得高于剔除最高报价后网下投资者报价中位数与加权平均数的孰低值，这是询价结果对定价的硬约束。'},
        {t:'全部报价的算术平均', why:'算术平均不剔除极端高报价，会系统性抬高上限，不符合「剔除最高报价后」的口径。'},
        {t:'按行业市盈率倒推的价格', why:'行业市盈率是判断定价合理性的参照系，不是询价的直接约束，不能用来推导区间上限。'},
        {t:'拟募资额对应的发行底价', why:'募资底价是参考区间的「下限」，方向相反。'}
      ];
      const ALLOC_OPTS=[
        {t:'不低于（优先配售）', why:'科创板网下配售按 A→B→C 顺序优先，A 类（公募基金、社保、养老金、年金、保险资管等）获配比例最高。'},
        {t:'不高于', why:'方向相反——A 类是被优先照顾的对象，获配比例只会更高。'},
        {t:'等于', why:'若各类等比例配售，优先配售制度就失去意义。'},
        {t:'与类别无关，平均分配', why:'科创板明确区分 A/B/C 类投资者并给予差异化配售，不存在无差别平均分配。'}
      ];
      function cbOpts(){
        return [
          {t:'不回拨（0%）', why:'仅当网上超额认购倍数未超过 50 倍时适用。'},
          {t:'回拨 10%', why:'适用于 50 倍 < 网上超额认购倍数 ≤ 100 倍。'},
          {t:'回拨 20%', why:'适用于网上超额认购倍数 > 100 倍。'}
        ];
      }
      function lowSamples(P){
        return [1.16,1.05,1.00,0.982,0.84].map(function(k){
          const price=+(P*k).toFixed(2);
          return {t:'报价 '+price.toFixed(2)+' 元', price:price, cut:price<P-1e-9};
        });
      }

      let si=0;
      const dec={}, stepScore={}, fbMap={}, resMap={}, tried={}, solved={};
      const doneSteps=new Set(), logs=[];
      let reportTracked=false;

      const navEl=document.getElementById('ipo-steps');
      const coEl=document.getElementById('ipo-co');
      const stage=document.getElementById('ipo-stage');
      const prev=document.getElementById('ipo-prev');
      const next=document.getElementById('ipo-next');
      const restart=document.getElementById('ipo-restart');
      const scoreEl=document.getElementById('ipo-score');
      const logEl=document.getElementById('ipo-log');

      function totalQtyOf(){ return Q.reduce(function(s,q){return s+q.qty;},0); }
      function exclAt(line){
        if(!(line>0)) return null;
        const t=totalQtyOf();
        const ex=Q.filter(function(q){return q.price>=line;}).reduce(function(s,q){return s+q.qty;},0);
        return {qty:ex, ratio:ex/t};
      }
      function core(Pline){
        const totalQty=totalQtyOf();
        const valid=Q.filter(function(q){return q.price<Pline;});
        const excluded=Q.filter(function(q){return q.price>=Pline;});
        const aValid=valid.filter(function(q){return q.cls==='A';});
        if(aValid.length<5) return null;
        const exclQty=excluded.reduce(function(s,q){return s+q.qty;},0);
        const aPrices=aValid.map(function(q){return q.price;}).sort(function(x,y){return x-y;});
        const med=aPrices[Math.floor(aPrices.length/2)];
        const wavg=aValid.reduce(function(s,q){return s+q.price*q.qty;},0)/aValid.reduce(function(s,q){return s+q.qty;},0);
        return {totalQty:totalQty,valid:valid,excluded:excluded,exclQty:exclQty,exclRatio:exclQty/totalQty,aValid:aValid,med:med,wavg:wavg};
      }
      function pipeline(){
        const totalQty=totalQtyOf();
        const sorted=Q.slice().sort(function(a,b){return b.price-a.price;});
        const thr=totalQty*0.10; let acc=0,cutIdx=0;
        for(let i=0;i<sorted.length;i++){acc+=sorted[i].qty;cutIdx=i;if(acc>=thr)break;}
        const Pcut=sorted[cutIdx].price;
        const std=exclAt(Pcut);
        // 决策后果传导：学生设定的剔除线若合规（≥10%），后续所有计算都按他的线执行
        const mine=exclAt(dec.excludeHigh);
        let c = (mine && mine.ratio>=0.10-1e-9) ? core(dec.excludeHigh) : null;
        const usedMine = !!c;
        if(!c) c = core(Pcut);
        const floor=CO.planRaise/CO.offerShares;
        let cap=Math.min(c.med,c.wavg);
        if(!isFinite(cap) || cap<floor+0.5) cap=floor+0.5;
        const Plow=+floor.toFixed(2), Phigh=+cap.toFixed(2);
        const priceOK = dec.setPrice!=null && dec.setPrice>=Plow-1e-9 && dec.setPrice<=Phigh+1e-9;
        const Pissue = priceOK ? dec.setPrice : +((Plow+Phigh)/2).toFixed(2);
        const raise=Pissue*CO.offerShares, PE=Pissue/EPS, disc=1-PE/CO.industryPE;
        const eff=c.valid.filter(function(q){return q.price>=Pissue;});
        const effQty=eff.reduce(function(s,q){return s+q.qty;},0);
        const offlineNeed=CO.offerShares*CO.offlineInit;
        const offlineMult=offlineNeed>0?effQty/offlineNeed:0;
        const cb=cbRate(onlineMult);
        const offlineFinal=CO.offerShares*(CO.offlineInit-cb);
        const onlineFinal=CO.offerShares*(CO.onlineInit+cb);
        const clsQty={A:0,B:0,C:0}; eff.forEach(function(q){clsQty[q.cls]+=q.qty;});
        const pri={A:1.25,B:1.0,C:0.85}; const priSum=clsQty.A*pri.A+clsQty.B*pri.B+clsQty.C*pri.C;
        const alloc={}, rate={};
        ['A','B','C'].forEach(function(k){
          alloc[k]= priSum>0?offlineFinal*clsQty[k]*pri[k]/priSum:0;
          rate[k]= clsQty[k]>0?alloc[k]/clsQty[k]:0;
        });
        return {totalQty:totalQty,Pcut:Pcut,stdRatio:std?std.ratio:0,stdQty:std?std.qty:0,
          usedMine:usedMine,valid:c.valid,exclRatio:c.exclRatio,exclQty:c.exclQty,
          med:c.med,wavg:c.wavg,floor:floor,cap:cap,Plow:Plow,Phigh:Phigh,
          Pissue:Pissue,priceOK:priceOK,raise:raise,PE:PE,disc:disc,eff:eff,effQty:effQty,
          offlineMult:offlineMult,onlineMult:onlineMult,cb:cb,offlineFinal:offlineFinal,onlineFinal:onlineFinal,
          clsQty:clsQty,alloc:alloc,rate:rate,lowOpts:lowSamples(Pissue),EPS:EPS};
      }
      function baseScore(key){ const s=STEPS.filter(function(x){return x.key===key;})[0]; return s?s.weight:0; }
      function tries(key){ return tried[key]||0; }
      function decay(n){ return n<=1?1:(n===2?0.7:0.4); }
      function lockedOf(key){ return solved[key]===true || tries(key)>=MAXTRY; }
      function curTotal(){let t=0;STEPS.forEach(function(s){if(stepScore[s.key]!=null)t+=stepScore[s.key];});return t;}
      function trackIpo(step,score,max){ if(window.__ibankTrack) window.__ibankTrack('ipo',{step:step,score:score,max:max,total:curTotal(),tries:tries(step)}); }

      function renderNav(){
        navEl.innerHTML='';
        STEPS.forEach(function(s,i){
          const d=document.createElement('div');
          const cls='st'+(i===si?' active':((i<si||doneSteps.has(s.key))?' done':''));
          d.className=cls;
          const w=s.weight||0;
          const sc = stepScore[s.key]!=null ? '<span class="sc '+(w>0&&stepScore[s.key]>=w*0.6?'ok':'bad')+'">'+stepScore[s.key]+'/'+(w||'–')+'</span>' : '';
          d.innerHTML='<span class="no">'+(i+1)+'</span><span>'+s.title+'</span>'+sc;
          d.onclick=function(){ if(i<=si||doneSteps.has(s.key)){ si=i; renderAll(); } };
          navEl.appendChild(d);
        });
      }
      function renderCo(){
        coEl.innerHTML='<div class="ci"><span class="k">公司</span><span class="v">'+CO.name+'（'+CO.code+'）</span></div>'
          +'<div class="ci"><span class="k">行业</span><span class="v">'+CO.industry+'</span></div>'
          +'<div class="ci"><span class="k">行业市盈率</span><span class="v">'+CO.industryPE+'x</span></div>'
          +'<div class="ci"><span class="k">拟发行股数</span><span class="v">'+fmtN(CO.offerShares)+' 股</span></div>'
          +'<div class="ci"><span class="k">拟募资额</span><span class="v">'+fmtMoney(CO.planRaise)+'</span></div>'
          +'<div class="ci"><span class="k">发行后总股本</span><span class="v">'+fmtN(CO.postTotal)+' 股</span></div>';
      }
      function renderScore(){
        const t=curTotal(); const pct=Math.min(100,t);
        const rating=t>=85?'优秀':(t>=70?'良好':(t>=60?'及格':'待加强'));
        scoreEl.innerHTML='<div class="sm">实时得分</div><div class="big">'+t+'<span style="font-size:15px;color:var(--muted)">/100</span></div>'
          +'<div class="bar2"><i style="width:'+pct+'%"></i></div>'
          +'<div class="sm">'+(si>=STEPS.length?('评级：'+rating):'每步最多可提交 '+MAXTRY+' 次，重复提交分数递减')+'</div>';
      }
      function renderLog(){
        logEl.innerHTML = logs.length ? logs.map(function(l){return '<div class="lg"><span class="dot '+l.k+'"></span><span class="tx">'+l.t+'</span></div>';}).join('') : '<div class="lg"><span class="dot info"></span><span class="tx">尚未开始决策。</span></div>';
      }
      function histHTML(){
        const ps=Q.map(function(q){return q.price;}); const mn=Math.min.apply(null,ps),mx=Math.max.apply(null,ps);
        const bins=14; const w=(mx-mn)/bins; const cnt=new Array(bins).fill(0);
        Q.forEach(function(q){let b=Math.min(bins-1,Math.floor((q.price-mn)/w));cnt[b]+=q.qty;});
        const mxv=Math.max.apply(null,cnt);
        let bars=''; for(let i=0;i<bins;i++){bars+='<i style="height:'+Math.max(4,cnt[i]/mxv*100)+'%"></i>';}
        return '<div class="ipo-hist"><div class="bar">'+bars+'</div><div class="sm" style="color:var(--muted);font-size:11px;margin-top:4px">网下投资者报价分布（横轴价格由低到高，柱高=申购量）</div></div>';
      }
      // 高价剔除用：按价位分档的累计剔除量表（学生据此自行判断剔除线，不再给出答案）
      function cutTableHTML(){
        const total=totalQtyOf();
        const lvl=new Map();
        Q.forEach(function(q){ const k=Math.floor(q.price); lvl.set(k,(lvl.get(k)||0)+q.qty); });
        const keys=Array.from(lvl.keys()).sort(function(a,b){return b-a;});
        let acc=0, rows='';
        for(let i=0;i<keys.length;i++){
          const k=keys[i]; acc+=lvl.get(k); const cum=acc/total;
          rows+='<tr><td>≥ '+k+' 元</td><td>'+fmtN(lvl.get(k))+'</td><td>'+fmtN(acc)+'</td><td class="hi">'+pc(cum)+'</td></tr>';
          if(cum>=0.30||i>=13) break;
        }
        return '<table class="ipo-tbl"><thead><tr><th>剔除线（报价 ≥ 该价即剔除）</th><th>该价位申报量</th><th>累计剔除量</th><th>累计占比</th></tr></thead><tbody>'+rows+'</tbody></table>'
          +'<div class="ipo-tr-head">用法：自上而下逐行累加，找到<b>累计占比首次 ≥ 10% 的那一行</b>——把剔除线设在该行的价位上，就等于只剔掉了「必须剔的最少部分」，是合规且最克制（也最优）的做法。剔除线设得越低，剔掉的报价越多，定价基准被压得越低。</div>';
      }
      function mcqHTML(domId, storeKey, opts, multi, locked, res){
        const sel = multi ? (dec[storeKey]||[]) : (dec[storeKey]==null?[]:[dec[storeKey]]);
        let h='<div class="opt" id="'+domId+'" data-store="'+storeKey+'" data-multi="'+(multi?'1':'0')+'" data-locked="'+(locked?'1':'0')+'">';
        opts.forEach(function(o,i){
          let cls='';
          if(res){
            if(res.correct.indexOf(i)>=0) cls=' correct';
            else if(sel.indexOf(i)>=0) cls=' wrong';
          } else if(sel.indexOf(i)>=0) cls=' on';
          h+='<button data-i="'+i+'"'+(cls?' class="'+cls.trim()+'"':'')+(locked?' disabled':'')+'>'+(multi?(sel.indexOf(i)>=0?'☑ ':'☐ '):'')+o.t+'</button>';
        });
        h+='</div>';
        if(res){
          h+='<ul class="opt-why">'+opts.map(function(o,i){
            const right = res.correct.indexOf(i)>=0;
            const why = right ? (o.why||'正确依据。') : (o.why||'不符合科创板规则。');
            return '<li class="'+(right?'y':'n')+'"><b>'+o.t+'</b>：'+why+'</li>';
          }).join('')+'</ul>';
        }
        return h;
      }
      function trialRow(key){
        const n=tries(key);
        if(solved[key]===true) return '<span class="tries">已答对'+(n>1?'（第 '+n+' 次提交）':'')+'</span>';
        if(n>=MAXTRY) return '<span class="tries">已用完 '+MAXTRY+' 次机会，本步锁定</span>';
        return '<span class="tries">已提交 '+n+'/'+MAXTRY+' 次'+(n>0?'，可修改后重试（分数递减）':'')+'</span>';
      }
      function fb(ok,head,body){ return '<div class="ipo-fb show '+(ok?'ok':'bad')+'"><span class="tt">'+(ok?'✓ 判分通过':'✗ 需改进')+'</span>'+head+'<div class="ans">'+body+'</div></div>'; }
      // 定价实时体检：回答「我这个价合不合适」
      function healthHTML(price){
        const p=pipeline();
        if(!(price>0)) return '<div class="ipo-health"><div class="hd">💡 定价体检<span class="chip w">待输入</span></div>'
          +'<div class="hint">输入发行价后，这里会实时给出<b>发行市盈率</b>、<b>相对行业折价</b>、<b>募集资金与募资完成度</b>，并判断是否落在合规区间内。</div></div>';
        const pe=price/EPS, disc=1-pe/CO.industryPE, raise=price*CO.offerShares, cover=raise/CO.planRaise;
        let cls,chip,hint;
        if(price<p.Plow-1e-9){
          cls='r'; chip='不合规';
          hint='低于募资底价 '+p.Plow.toFixed(2)+' 元，募集资金不足以覆盖拟募资额。';
        } else if(price>p.Phigh+1e-9){
          cls='r'; chip='不合规';
          hint='高于询价结果约束（孰低值 '+p.Phigh.toFixed(2)+' 元），不符合科创板定价规则。';
        } else if(disc>=0.28){
          cls='w'; chip='偏保守';
          hint='折价高于区间内常见水平：发行人少募资金，但给二级市场留出的价差空间更大。';
        } else if(disc>=0.20){
          cls='g'; chip='稳健';
          hint='折价处于区间内的常见水平，兼顾募资效率与投资者空间。';
        } else {
          cls='g'; chip='贴近上限';
          hint='定价贴近询价结果上限，募资效率最高，但留给二级市场的价差空间较小。';
        }
        return '<div class="ipo-health"><div class="hd">💡 定价体检<span class="chip '+cls+'">'+chip+'</span></div>'
          +'<div class="hg">'
          +'<div class="hx"><div class="k">发行市盈率</div><div class="v">'+pe.toFixed(1)+'x（行业 '+CO.industryPE+'x）</div></div>'
          +'<div class="hx"><div class="k">相对行业折价</div><div class="v">'+pc(disc)+'</div></div>'
          +'<div class="hx"><div class="k">募集资金</div><div class="v">'+fmtMoney(raise)+'</div></div>'
          +'<div class="hx"><div class="k">募资完成度</div><div class="v">'+pc(cover)+'</div></div>'
          +'</div><div class="hint">'+hint+'</div></div>';
      }

      function renderStage(){
        if(si>=STEPS.length){ renderReport(); return; }
        const p=pipeline(); const key=STEPS[si].key;
        let h='<h4>'+(si+1)+'. '+STEPS[si].title+'<span style="font-size:12px;font-weight:600;color:var(--muted);margin-left:8px">满分 '+(STEPS[si].weight||0)+' 分</span></h4>';
        if(key==='collect'){
          h+='<div class="lead">主承销商已完成网下询价：共 <b>480</b> 家网下投资者提交报价与申购意向。科创板实行市场化询价，发行价格的<b>上限</b>由剔除最高报价后的报价分布决定，<b>下限</b>由募资需求决定。请先熟悉报价分布，再进入定价环节。</div>';
          h+='<div class="ipo-data">'
            +'<div class="dx"><div class="k">报价家数</div><div class="v">480 家</div></div>'
            +'<div class="dx"><div class="k">报价区间</div><div class="v">'+Math.min.apply(null,Q.map(function(q){return q.price;})).toFixed(1)+' – '+Math.max.apply(null,Q.map(function(q){return q.price;})).toFixed(1)+' 元</div></div>'
            +'<div class="dx"><div class="k">加权均价</div><div class="v">'+(Q.reduce(function(s,q){return s+q.price*q.qty;},0)/p.totalQty).toFixed(2)+' 元</div></div>'
            +'<div class="dx"><div class="k">拟申购总量</div><div class="v">'+fmtN(p.totalQty)+' 股</div></div></div>';
          h+=histHTML();
          h+='<div class="lead" style="margin-top:12px">本步为<b>信息准备</b>，不计分，看清数据后点「下一步」。</div>';
        } else if(key==='excludeHigh'){
          window.__ipoStdCut = +p.Pcut.toFixed(2);
          h+='<div class="lead">规则：主承销商应剔除拟申购总量中报价<b>最高的部分</b>，剔除比例<b>不低于 10%</b>。请依据下方分档表自行推算并设定<b>高价剔除线</b>（元）——报价 ≥ 该价格的申报将被剔除。</div>';
          h+='<div class="ipo-data">'
            +'<div class="dx"><div class="k">拟申购总量</div><div class="v">'+fmtN(p.totalQty)+' 股</div></div>'
            +'<div class="dx"><div class="k">10% 最低剔除量</div><div class="v">'+fmtN(Math.ceil(p.totalQty*0.10))+' 股</div></div></div>';
          h+=cutTableHTML();
          h+='<div class="ipo-dec"><div class="row"><label>高价剔除线（元）</label>'
            +'<input type="number" id="ipo-in-cut" step="0.01" placeholder="输入你推算出的报价线" value="'+(dec.excludeHigh!=null?dec.excludeHigh:'')+'">'
            +'<button class="sim-btn primary" id="ipo-sub">提交本步</button>'+trialRow(key)+'</div>'
            +'<div class="ipo-tr-head" style="margin:0">判分只看<b>剔除比例是否合规、是否克制</b>，不要求精确到某一分钱：剔除 10%–12% 满分，12%–16% 良好，16%–22% 一般，超过 22% 视为过度剔除。低于 10% 判 0 分。</div></div>';
          if(doneSteps.has(key)) h+=fbMap[key]||'';
        } else if(key==='reference'){
          h+='<div class="lead">剔除最高报价后，发行价格<b>不得高于</b>网下投资者报价的<b>中位数与加权平均数的孰低值</b>；<b>下限</b>由募资需求决定（不低于募资底价）。请判断<b>参考区间上限</b>的来源。</div>';
          h+='<div class="ipo-data">'
            +'<div class="dx"><div class="k">A 类报价中位数</div><div class="v">'+p.med.toFixed(2)+' 元</div></div>'
            +'<div class="dx"><div class="k">A 类加权均价</div><div class="v">'+p.wavg.toFixed(2)+' 元</div></div>'
            +'<div class="dx"><div class="k">上限（孰低值）</div><div class="v">'+p.Phigh.toFixed(2)+' 元</div></div>'
            +'<div class="dx"><div class="k">下限（募资底价）</div><div class="v">'+p.Plow.toFixed(2)+' 元</div></div>'
            +'<div class="dx"><div class="k">定价参考区间</div><div class="v">['+p.Plow+', '+p.Phigh+']</div></div></div>';
          h+='<div class="ipo-tr-head">已按'+(p.usedMine?'<b>你设定的 '+Number(dec.excludeHigh).toFixed(2)+' 元</b>剔除线':'<b>标准剔除线 '+p.Pcut.toFixed(2)+' 元</b>（你的设定未达 10% 下限，系统按标准线执行）')
            +'剔除，剔除比例 '+pc(p.exclRatio)+'；上方参考值随该剔除结果重新计算。</div>';
          const locked=lockedOf(key);
          h+='<div class="ipo-dec"><div class="row"><label>参考区间上限应取自</label></div>'
            +mcqHTML('ipo-opt-ref','__ref',REF_OPTS,false,locked,doneSteps.has(key)?resMap[key]:null)
            +'<div class="row"><button class="sim-btn primary" id="ipo-sub">提交本步</button>'+trialRow(key)+'</div></div>';
          if(doneSteps.has(key)) h+=fbMap[key]||'';
        } else if(key==='setPrice'){
          h+='<div class="lead">在参考区间内确定发行价：不低于募资底价 <b>'+p.Plow.toFixed(2)+' 元</b>，且不高于上限（孰低值）<b>'+p.Phigh.toFixed(2)+' 元</b>。区间内<b>任意价格都合规</b>，差别在于募资效率与留给二级市场的空间。</div>';
          h+='<div class="ipo-data">'
            +'<div class="dx"><div class="k">参考区间</div><div class="v">['+p.Plow+', '+p.Phigh+'] 元</div></div>'
            +'<div class="dx"><div class="k">募资底价</div><div class="v">'+p.Plow.toFixed(2)+' 元</div></div>'
            +'<div class="dx"><div class="k">拟募资额</div><div class="v">'+fmtMoney(CO.planRaise)+'</div></div></div>';
          h+='<div class="ipo-dec"><div class="row"><label>确定发行价（元）</label>'
            +'<input type="number" id="ipo-in-price" step="0.01" placeholder="输入你的定价" value="'+(dec.setPrice!=null?dec.setPrice:'')+'">'
            +'<button class="sim-btn primary" id="ipo-sub">提交本步</button>'+trialRow(key)+'</div></div>';
          h+='<div id="ipo-health"></div>';
          if(doneSteps.has(key)) h+=fbMap[key]||'';
        } else if(key==='excludeLow'){
          h+='<div class="lead">报价<b>低于发行价 '+p.Pissue.toFixed(2)+' 元</b>的申报被剔除，剩余为有效申购（注意边界：报价<b>等于</b>发行价的申报仍然有效）。下表是本次询价中的 5 笔代表性申报，请勾选<b>将被剔除</b>的申报。</div>';
          const locked=lockedOf(key);
          h+='<div class="ipo-dec"><div class="row"><label>将被剔除的申报（多选）</label></div>'
            +mcqHTML('ipo-opt-low','__low',p.lowOpts,true,locked,doneSteps.has(key)?resMap[key]:null)
            +'<div class="row"><button class="sim-btn primary" id="ipo-sub">提交本步</button>'+trialRow(key)+'</div></div>';
          h+='<div class="ipo-data">'
            +'<div class="dx"><div class="k">有效申购家数</div><div class="v">'+p.eff.length+' 家（共 480 家）</div></div>'
            +'<div class="dx"><div class="k">有效申购总量</div><div class="v">'+fmtN(p.effQty)+' 股</div></div>'
            +'<div class="dx"><div class="k">网下有效倍数</div><div class="v">'+p.offlineMult.toFixed(1)+'x</div></div></div>';
          if(doneSteps.has(key)) h+=fbMap[key]||'';
        } else if(key==='callback'){
          h+='<div class="lead">网上初始发行比例 '+pc(CO.onlineInit,0)+'、网下初始 '+pc(CO.offlineInit,0)+'。回拨规则：网上超额认购倍数<b>超 50 倍回拨 10%</b>、<b>超 100 倍回拨 20%</b>（由网下回拨至网上）；未超过 50 倍不回拨。本次网上超额认购 <b>'+p.onlineMult+' 倍</b>，请判断应回拨多少。</div>';
          h+='<div class="ipo-data">'
            +'<div class="dx"><div class="k">网上超额认购倍数</div><div class="v">'+p.onlineMult+' 倍</div></div>'
            +'<div class="dx"><div class="k">网下初始发行</div><div class="v">'+pc(CO.offlineInit,0)+'</div></div>'
            +'<div class="dx"><div class="k">网上初始发行</div><div class="v">'+pc(CO.onlineInit,0)+'</div></div></div>';
          const locked=lockedOf(key);
          h+='<div class="ipo-dec"><div class="row"><label>应回拨比例</label></div>'
            +mcqHTML('ipo-opt-cb','__cb',cbOpts(),false,locked,doneSteps.has(key)?resMap[key]:null)
            +'<div class="row"><button class="sim-btn primary" id="ipo-sub">提交本步</button>'+trialRow(key)+'</div></div>';
          if(doneSteps.has(key)) h+=fbMap[key]||'';
        } else if(key==='allocate'){
          h+='<div class="lead">回拨后网下发行量为 <b>'+fmtN(p.offlineFinal)+' 股</b>。科创板按 A/B/C 类投资者优先顺序配售，A 类（公募/社保等）获配比例最高。请判断 A 类与 B 类的获配比例关系。</div>';
          h+='<div class="ipo-tbl-wrap"><table class="ipo-tbl"><thead><tr><th>类别</th><th>有效申购量（股）</th><th>占比</th></tr></thead><tbody>'
            +['A','B','C'].map(function(k){
              return '<tr><td>'+k+' 类</td><td>'+fmtN(p.clsQty[k])+'</td><td class="hi">'+(p.effQty>0?pc(p.clsQty[k]/p.effQty):'—')+'</td></tr>';
            }).join('')+'</tbody></table></div>';
          const locked=lockedOf(key);
          h+='<div class="ipo-dec"><div class="row"><label>A 类获配比例应（ ）B 类</label></div>'
            +mcqHTML('ipo-opt-alloc','__alloc',ALLOC_OPTS,false,locked,doneSteps.has(key)?resMap[key]:null)
            +'<div class="row"><button class="sim-btn primary" id="ipo-sub">提交本步</button>'+trialRow(key)+'</div></div>';
          if(doneSteps.has(key)) h+=fbMap[key]||'';
        }
        stage.innerHTML=h;
        bindStep(key);
        next.disabled = (STEPS[si].weight>0 && !doneSteps.has(key));
        next.textContent = si===STEPS.length-1 ? '生成定价配售报告' : '下一步';
        prev.disabled = si===0;
      }

      function bindStep(key){
        const sub=document.getElementById('ipo-sub');
        if(sub) sub.onclick=function(){ submitStep(key); };
        document.querySelectorAll('#ipo-stage .opt').forEach(function(box){
          if(box.dataset.locked==='1') return;
          const multi=box.dataset.multi==='1'; const store=box.dataset.store;
          box.querySelectorAll('button').forEach(function(b){
            b.onclick=function(){
              const i=+b.dataset.i;
              if(multi){
                let arr=(dec[store]||[]).slice();
                const k=arr.indexOf(i); if(k>=0)arr.splice(k,1); else arr.push(i);
                dec[store]=arr;
              } else { dec[store]=i; }
              renderStage();
            };
          });
        });
        const pin=document.getElementById('ipo-in-price');
        const hbox=document.getElementById('ipo-health');
        if(pin&&hbox){
          const upd=function(){ hbox.innerHTML=healthHTML(parseFloat(pin.value)); };
          pin.addEventListener('input',upd);
          upd();
        }
      }

      function submitStep(key){
        if(lockedOf(key)) return;
        // ① 先落盘本步输入，再据此重算全链路（决策有后果）
        if(key==='excludeHigh'){ const el=document.getElementById('ipo-in-cut'); const v=el?parseFloat(el.value):NaN; dec.excludeHigh=(v>0?v:null); }
        if(key==='setPrice'){ const el=document.getElementById('ipo-in-price'); const v=el?parseFloat(el.value):NaN; dec.setPrice=(v>0?v:null); }
        const p=pipeline();
        const w=baseScore(key);
        tried[key]=(tried[key]||0)+1; const n=tried[key];
        let ratio=0, ok=false, head='', ans='';
        if(key==='excludeHigh'){
          const v=dec.excludeHigh; const ex=exclAt(v);
          ans='标准剔除线 <b>'+p.Pcut.toFixed(2)+' 元</b>（累计占比首次 ≥10% 的价位），对应剔除拟申购量 <b>'+pc(p.stdRatio)+'</b>。';
          if(!ex){ ratio=0; head='请先输入一个有效的剔除线（元）。'; }
          else if(ex.ratio<0.10-1e-9){
            ratio=0;
            head='你设定 '+v.toFixed(2)+' 元，剔除 '+pc(ex.ratio)+'（'+fmtN(ex.qty)+' 股），<b>低于 10% 的强制下限</b>，违反科创板规则，本步 0 分。';
          } else {
            const d=ex.ratio-0.10;
            if(d<=0.02) ratio=1; else if(d<=0.06) ratio=0.73; else if(d<=0.12) ratio=0.4; else ratio=0.13;
            head='你设定 '+v.toFixed(2)+' 元，剔除 '+pc(ex.ratio)+'（'+fmtN(ex.qty)+' 股）。'
              +(d<=0.02?'合规且克制——只剔掉必须剔的部分，是最优做法。'
                :(d<=0.06?'合规，但比最低要求多剔了一些高报价，定价基准会被略微压低。'
                  :(d<=0.12?'剔除比例明显偏高，会压低询价基准、影响发行人募资效率。'
                    :'剔除比例过高，属于过度剔除，严重偏离市场化询价的本意。')));
          }
          ok=ratio>=0.73;
        } else if(key==='reference'){
          const sel=dec.__ref;
          resMap[key]={correct:[0],picked:sel==null?[]:[sel]};
          ratio=(sel===0)?1:0;
          head = ratio>0 ? '判断正确：发行价格的上限取自中位数与加权平均数的<b>孰低值</b>。'
            : (sel==null ? '请先选择一个选项再提交。'
              : '判断有误。上限不是全部报价的平均值（未剔除极端高价），也不是行业市盈率倒推价（那是估值参照系，不是询价约束），更不是募资底价（那是下限）。');
          ans='A 类中位数 '+p.med.toFixed(2)+' 元、加权均价 '+p.wavg.toFixed(2)+' 元，孰低值 '+p.Phigh.toFixed(2)+' 元；下限取募资底价 '+p.Plow.toFixed(2)+' 元，故参考区间 ['+p.Plow+', '+p.Phigh+']。';
          ok=ratio>0;
        } else if(key==='setPrice'){
          const v=dec.setPrice;
          const inInt = v!=null && v>=p.Plow-1e-9 && v<=p.Phigh+1e-9;
          if(inInt) ratio=1; else if(v!=null && v>p.Phigh && v<=p.Phigh*1.02) ratio=0.5; else ratio=0;
          head = inInt ? ('发行价 '+v.toFixed(2)+' 元，募资 '+fmtMoney(v*CO.offerShares)+'，发行 PE '+(v/EPS).toFixed(1)+'x（行业 '+CO.industryPE+'x，折价 '+pc(1-(v/EPS)/CO.industryPE)+'）。区间内定价均合规。')
            : (v==null?'请先输入发行价。'
              : (v<p.Plow ? ('发行价 '+v.toFixed(2)+' 元低于募资底价 '+p.Plow.toFixed(2)+' 元，募集资金不足，本步 0 分。')
                : ('发行价 '+v.toFixed(2)+' 元高于询价结果上限（孰低值）'+p.Phigh.toFixed(2)+' 元，不符合科创板定价规则。')));
          ans='合规区间 ['+p.Plow+', '+p.Phigh+']：下限=募资底价，上限=A 类报价中位数与加权均价的孰低值。区间内建议靠近上限，募资效率更高。';
          ok=ratio>=1;
        } else if(key==='excludeLow'){
          const samples=p.lowOpts; const sel=(dec.__low||[]).slice().sort(function(a,b){return a-b;});
          const correct=[]; samples.forEach(function(s,i){ if(s.cut) correct.push(i); });
          resMap[key]={correct:correct,picked:sel};
          const miss = correct.filter(function(x){return sel.indexOf(x)<0;}).length + sel.filter(function(x){return correct.indexOf(x)<0;}).length;
          const same = miss===0 && sel.length===correct.length;
          ratio = same?1:(miss===1?0.5:0);
          head = same ? '全部判断正确。边界规则是易错点：<b>报价等于发行价的申报属于有效申购</b>，只有严格低于发行价的才被剔除。'
            : (miss===1?'基本正确，但漏选/多选了 1 笔申报——注意「报价等于发行价」仍为有效申购这一边界。'
              :'判断偏差较大。剔除标准是「申报价格严格低于发行价」，等于发行价的申报依然有效。');
          ans='本次应剔除 '+correct.length+' 笔（'+correct.map(function(i){return samples[i].t.replace('报价 ','');}).join('、')+'）；剔除后有效申购 <b>'+p.eff.length+' 家</b>、总量 <b>'+fmtN(p.effQty)+' 股</b>、网下有效倍数 <b>'+p.offlineMult.toFixed(1)+'x</b>。';
          ok=ratio>=0.5;
        } else if(key==='callback'){
          const sel=dec.__cb;
          const correct = p.cb===0.20?2:(p.cb===0.10?1:0);
          resMap[key]={correct:[correct],picked:sel==null?[]:[sel]};
          ratio=(sel===correct)?1:0;
          const tier = p.cb===0.20?'网上超额认购 '+p.onlineMult+' 倍 >100 倍，触发最高档，应回拨 20%'
            : (p.cb===0.10?'网上超额认购 '+p.onlineMult+' 倍，处于 50–100 倍区间，应回拨 10%'
              :'网上超额认购 '+p.onlineMult+' 倍，未超过 50 倍，无需回拨');
          head = ratio>0 ? ('判断正确：'+tier+'。') : ('判断有误：'+tier+'。回拨比例由「网上超额认购倍数」落在那一个档位唯一决定，回拨后网下与网上的最终发行量随之改变。');
          ans='回拨 '+pc(p.cb,0)+' 后：网下最终 <b>'+fmtN(p.offlineFinal)+' 股</b>（'+pc(CO.offlineInit-p.cb,0)+'）、网上最终 <b>'+fmtN(p.onlineFinal)+' 股</b>（'+pc(CO.onlineInit+p.cb,0)+'）。';
          ok=ratio>0;
        } else if(key==='allocate'){
          const sel=dec.__alloc;
          resMap[key]={correct:[0],picked:sel==null?[]:[sel]};
          ratio=(sel===0)?1:0;
          head = ratio>0 ? '判断正确：A 类投资者优先配售，获配比例不低于 B、C 类。' : '判断有误。科创板网下配售按 A→B→C 优先顺序执行，A 类获配比例最高。';
          ans='各类获配：A <b>'+fmtN(p.alloc.A)+'</b> 股（获配率 '+(p.clsQty.A>0?pc(p.rate.A,2):'—')+'）/ B <b>'+fmtN(p.alloc.B)+'</b> 股（'+(p.clsQty.B>0?pc(p.rate.B,2):'—')+'）/ C <b>'+fmtN(p.alloc.C)+'</b> 股（'+(p.clsQty.C>0?pc(p.rate.C,2):'—')+'）。A 类获配率最高。';
          ok=ratio>0;
        }
        if(ratio>=1) solved[key]=true;
        stepScore[key]=Math.round(w*ratio*decay(n));
        doneSteps.add(key);
        fbMap[key]=fb(ok,head,ans);
        logs.push({k:ok?'ok':'bad',t:'<b>第'+(si+1)+'步 '+STEPS[si].title+'</b>：'+stepScore[key]+'/'+w+' 分'+(n>1?'（第 '+n+' 次提交，分数递减）':'')+'。'});
        trackIpo(key,stepScore[key],w);
        renderNav(); renderScore(); renderLog(); renderStage();
      }

      function reportText(p,t,rating,rows){
        const line=function(a,b){ return a+'：'+b; };
        const out=[];
        out.push('科创板 IPO 定价配售报告 · '+CO.name+'（'+CO.code+'）');
        out.push('综合评分：'+t+'/100（'+rating+'）');
        out.push('');
        out.push('【分步得分】');
        rows.forEach(function(r){ out.push('  '+r[0]+'  '+r[1]+'  '+r[2]); });
        out.push('');
        out.push('【关键结果】');
        out.push('  '+line('发行价格', p.Pissue.toFixed(2)+' 元'));
        out.push('  '+line('募集资金', fmtMoney(p.raise)+'（拟募资 '+fmtMoney(CO.planRaise)+'）'));
        out.push('  '+line('发行市盈率', p.PE.toFixed(1)+'x（行业 '+CO.industryPE+'x，折价 '+pc(p.disc)+'）'));
        out.push('  '+line('高价剔除', pc(p.exclRatio)+'（剔除线 '+(p.usedMine?Number(dec.excludeHigh).toFixed(2):p.Pcut.toFixed(2))+' 元）'));
        out.push('  '+line('定价参考区间', '['+p.Plow+', '+p.Phigh+'] 元'));
        out.push('  '+line('低价剔除后有效申购', p.eff.length+' 家 / '+fmtN(p.effQty)+' 股 / 网下有效倍数 '+p.offlineMult.toFixed(1)+'x'));
        out.push('  '+line('回拨比例', pc(p.cb,0)+'（网下 '+fmtN(p.offlineFinal)+' 股 / 网上 '+fmtN(p.onlineFinal)+' 股）'));
        out.push('  '+line('网下配售 A/B/C', fmtN(p.alloc.A)+' / '+fmtN(p.alloc.B)+' / '+fmtN(p.alloc.C)+' 股'));
        out.push('');
        out.push('【与其他同学的比较】请将本报告提交至课程平台。');
        return out.join('\n');
      }

      function renderReport(){
        const p=pipeline(); const t=curTotal();
        const rating=t>=85?'优秀':(t>=70?'良好':(t>=60?'及格':'待加强'));
        const stepRows=STEPS.filter(function(s){return s.weight>0;}).map(function(s){
          const sc=stepScore[s.key]; const w=s.weight;
          const tag=sc==null?'未作答':(sc>=w?'满分':(sc>=w*0.6?'良好':'需加强'));
          return [('第'+(STEPS.indexOf(s)+1)+'步 '+s.title),((sc==null?'—':sc)+' / '+w),tag+(tries(s.key)>1?'（提交 '+tries(s.key)+' 次）':'')];
        });
        const cmpRows=[
          ['高价剔除线', dec.excludeHigh!=null?(Number(dec.excludeHigh).toFixed(2)+' 元，剔除 '+pc(p.exclRatio)):'未作答', p.Pcut.toFixed(2)+' 元（剔除 '+pc(p.stdRatio)+'）'],
          ['参考区间上限来源', dec.__ref!=null?REF_OPTS[dec.__ref].t:'未作答', '中位数与加权平均数的孰低值'],
          ['发行价', dec.setPrice!=null?Number(dec.setPrice).toFixed(2)+' 元'+(p.priceOK?'':'（不合规，系统按区间执行）'):'未作答', '区间 ['+p.Plow+', '+p.Phigh+']，建议靠近上限 '+p.Phigh+' 元'],
          ['低价剔除判断', dec.__low&&dec.__low.length?('勾选 '+dec.__low.length+' 笔'):'未作答', '应剔除 '+p.lowOpts.filter(function(s){return s.cut;}).length+' 笔'],
          ['回拨比例', dec.__cb!=null?cbOpts()[dec.__cb].t:'未作答', pc(p.cb,0)+'（网上 '+p.onlineMult+' 倍）'],
          ['A/B 类配售', dec.__alloc!=null?ALLOC_OPTS[dec.__alloc].t:'未作答', 'A 类优先，获配比例不低于 B、C 类']
        ];
        const sug=[];
        if(stepScore.excludeHigh!=null && stepScore.excludeHigh<15) sug.push('高价剔除：按分档表自上而下累加，取<b>累计占比首次 ≥10%</b> 的价位即可，不必剔得更多——剔得越多，定价基准被压得越低。');
        if(stepScore.reference!=null && stepScore.reference<10) sug.push('定价参考：记住约束是「中位数与加权平均数的<b>孰低值</b>」，不是平均值、也不是行业市盈率倒推价。');
        if(stepScore.setPrice!=null && stepScore.setPrice<30) sug.push('发行定价：科创板要求落在 [募资底价, 孰低值] 之间，低于下限会募资不足，高于上限属违规。');
        if(stepScore.excludeLow!=null && stepScore.excludeLow<10) sug.push('低价剔除：判断标准是「申报价格<b>严格低于</b>发行价」，等于发行价的申报仍然有效。');
        if(stepScore.callback!=null && stepScore.callback<20) sug.push('回拨机制：先看网上超额认购倍数落在哪一档（≤50 / 50–100 / >100），再定 0% / 10% / 20%。');
        if(stepScore.allocate!=null && stepScore.allocate<15) sug.push('网下配售：A 类（公募、社保、养老金、年金等）是优先配售对象，获配比例最高。');
        if(!sug.length) sug.push('全流程决策质量很高：剔除克制、定价合规、回拨与配售判断准确。可以点「重置仿真」换一组报价池与网上申购倍数再练一次。');
        if(!p.usedMine) sug.push('提示：你设定的剔除线未达 10% 合规下限，系统按标准线执行；请回看第 2 步。');
        if(t<60) sug.push('建议先复习教材第 3 章「股份有限公司与首次公开发行」中关于询价、定价与配售的规则，再重置仿真重做一遍。');

        stage.innerHTML='<div class="ipo-report">'
          +'<div class="rp-head"><div class="rp-big">'+t+'<span>/100</span></div><div class="rp-txt">综合评级：<b>'+rating+'</b><br>本报告由 '+CO.name+'（'+CO.code+'）科创板 IPO 定价配售全流程决策生成。</div></div>'
          +'<h6>分步得分</h6><table class="ipo-tbl"><thead><tr><th>步骤</th><th>得分</th><th>评价</th></tr></thead><tbody>'
          +stepRows.map(function(r){return '<tr><td>'+r[0]+'</td><td class="hi">'+r[1]+'</td><td>'+r[2]+'</td></tr>';}).join('')+'</tbody></table>'
          +'<h6>关键结果</h6><table class="ipo-tbl"><tbody>'
          +'<tr><td>发行价格</td><td class="hi">'+p.Pissue.toFixed(2)+' 元</td></tr>'
          +'<tr><td>募集资金</td><td class="hi">'+fmtMoney(p.raise)+'（拟募资 '+fmtMoney(CO.planRaise)+'）</td></tr>'
          +'<tr><td>发行市盈率</td><td class="hi">'+p.PE.toFixed(1)+'x（行业 '+CO.industryPE+'x，折价 '+pc(p.disc)+'）</td></tr>'
          +'<tr><td>高价剔除</td><td class="hi">'+pc(p.exclRatio)+'（剔除线 '+(p.usedMine?Number(dec.excludeHigh).toFixed(2):p.Pcut.toFixed(2))+' 元）</td></tr>'
          +'<tr><td>定价参考区间</td><td class="hi">['+p.Plow+', '+p.Phigh+'] 元</td></tr>'
          +'<tr><td>低价剔除后有效申购</td><td class="hi">'+p.eff.length+' 家 / '+fmtN(p.effQty)+' 股 / 倍数 '+p.offlineMult.toFixed(1)+'x</td></tr>'
          +'<tr><td>回拨比例</td><td class="hi">'+pc(p.cb,0)+'（网下 '+fmtN(p.offlineFinal)+' / 网上 '+fmtN(p.onlineFinal)+' 股）</td></tr>'
          +'<tr><td>网下配售 A/B/C</td><td class="hi">'+fmtN(p.alloc.A)+' / '+fmtN(p.alloc.B)+' / '+fmtN(p.alloc.C)+' 股</td></tr>'
          +'</tbody></table>'
          +'<h6>你的决策 vs 标准做法</h6><table class="ipo-tbl"><thead><tr><th>决策点</th><th>你的选择</th><th>标准做法</th></tr></thead><tbody>'
          +cmpRows.map(function(r){return '<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td class="hi">'+r[2]+'</td></tr>';}).join('')+'</tbody></table>'
          +'<h6>改进建议</h6><ul class="rp-sug">'+sug.map(function(s){return '<li>'+s+'</li>';}).join('')+'</ul>'
          +'<div class="ipo-foot"><button class="sim-btn ghost" id="ipo-export">导出报告（.txt）</button></div>'
          +'</div>';
        const ex=document.getElementById('ipo-export');
        if(ex) ex.onclick=function(){
          try{
            const blob=new Blob([reportText(p,t,rating,stepRows)],{type:'text/plain;charset=utf-8'});
            const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
            a.download='IPO定价配售报告_'+CO.name+'_'+t+'分.txt';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(function(){ URL.revokeObjectURL(a.href); },3000);
          }catch(e){ /* 离线或受限环境静默降级 */ }
        };
        next.disabled=true; prev.disabled=false; next.textContent='已完成';
        if(!reportTracked){ reportTracked=true; trackIpo('report',t,100); }
      }

      function reset(){
        si=0;
        for(const k in dec)delete dec[k];
        for(const k in stepScore)delete stepScore[k];
        for(const k in fbMap)delete fbMap[k];
        for(const k in resMap)delete resMap[k];
        for(const k in tried)delete tried[k];
        for(const k in solved)delete solved[k];
        doneSteps.clear(); logs.length=0; reportTracked=false;
        seedNow=Math.floor(Math.random()*1e9);
        Q=genQuotes(seedNow); onlineMult=genOnlineMult(seedNow);
        renderAll();
      }
      function renderAll(){ renderNav(); renderCo(); renderScore(); renderLog(); renderStage(); }

      prev.onclick=function(){ if(si>0){si--; renderAll();} };
      next.onclick=function(){ const key=STEPS[si].key; if(STEPS[si].weight>0 && !doneSteps.has(key)){ return; } if(si<STEPS.length-1){si++; renderAll();} else {si=STEPS.length; renderAll();} };
      restart.onclick=reset;

      seedNow=Math.floor(Math.random()*1e9);
      Q=genQuotes(seedNow); onlineMult=genOnlineMult(seedNow);
      renderAll();
    })();

    // ===== 估值实验（完整版：滑块 + 情景 + 三方法 + 足球场 + 敏感性热力图） =====
    // v63：净利润 / 总股本改「对数滑块 + 可直接输入的数字框」，并加案例预设。
    //      原量程是净利润 ≤2 亿元、股本 ≤5 亿股，案例库 20 家公司（净利润几十亿到上千亿）一家都套不上。
    (function () {
      const ids = ['profit', 'g', 'r', 'pe', 'shares'];
      const els = {}; ids.forEach(function (k) { els[k] = document.getElementById('val-' + k); });
      const outs = {}; ids.forEach(function (k) { outs[k] = document.getElementById('vo-' + k); });
      const result = document.getElementById('val-result');
      const presetEl = document.getElementById('val-preset');
      const presetNote = document.getElementById('val-preset-note');

      // 对数量程：净利润 0.05–3000 亿元、总股本 0.1–3000 亿股。上界按中国银行（2165.59 亿 / 2943.88 亿股）留余量。
      const LOGCFG = { profit: { min: 0.05, max: 3000 }, shares: { min: 0.1, max: 3000 } };
      function fromSlider(k, v) {
        const c = LOGCFG[k], a = Math.log(c.min), b = Math.log(c.max);
        return Math.exp(a + (v / 1000) * (b - a));
      }
      function toSlider(k, val) {
        const c = LOGCFG[k], a = Math.log(c.min), b = Math.log(c.max);
        const t = (Math.log(Math.max(c.min, Math.min(c.max, val))) - a) / (b - a);
        return Math.round(Math.max(0, Math.min(1000, t * 1000)));
      }
      // 滑块拖出来的值四舍五入到「看得懂」的位数：0.05 亿不该显示成 0.0524376 亿
      function roundNice(v) {
        if (v < 1) return Math.round(v * 100) / 100;
        if (v < 10) return Math.round(v * 10) / 10;
        return Math.round(v);
      }
      function valOf(k) {
        if (LOGCFG[k]) {
          const n = parseFloat(outs[k].value);
          return isFinite(n) && n > 0 ? n : (k === 'profit' ? 0.8 : 1);
        }
        const n = parseFloat(els[k].value);
        return isFinite(n) ? n : 0;
      }
      function paintOut(k, v) {
        const o = outs[k]; if (!o) return;
        if (o.tagName === 'INPUT') o.value = v; else o.textContent = v;
      }

      // 案例预设：净利润与总股本取自 2021 年年报（实数），g / r / PE 是教学假设初值。
      // 想改数据只改这张表：数值与 case 页正文的 2021 年报口径一致。
      const CASE = {
        dfcf:  { name: '东方财富', code: '300059', profit: 85.53,   shares: 110.12,  g: 20, r: 12, pe: 48,  detail: '归母净利润 85.53 亿元 / 总股本 110.12 亿股' },
        catl:  { name: '宁德时代', code: '300750', profit: 159.31,  shares: 23.30,   g: 22, r: 12, pe: 86,  detail: '归母净利润 159.31 亿元 / 总股本 23.30 亿股' },
        smic:  { name: '中芯国际', code: '688981', profit: 107.33,  shares: 79.00,   g: 15, r: 12, pe: 38,  detail: '归母净利润 107.33 亿元 / 总股本 79.00 亿股' },
        midea: { name: '美的集团', code: '000333', profit: 285.74,  shares: 69.97,   g: 8,  r: 10, pe: 18,  detail: '归母净利润 285.74 亿元 / 总股本 69.97 亿股' },
        vanke: { name: '万科A',    code: '000002', profit: 225.24,  shares: 116.25,  g: 3,  r: 11, pe: 10,  detail: '归母净利润 225.24 亿元 / 总股本 116.25 亿股' },
        boc:   { name: '中国银行', code: '601988', profit: 2165.59, shares: 2943.88, g: 5,  r: 9,  pe: 4.5, detail: '归母净利润 2165.59 亿元 / 总股本 2943.88 亿股' }
      };
      // 情景按钮的基准：选案例后跟着换，自定义时是虚拟公司
      const BASE = { profit: 0.8, shares: 1, g: 10, r: 15, pe: 40 };
      const SCN = {
        pess: { dp: -0.15, dg: -4, dr: 3,  kpe: 0.75 },
        base: { dp: 0,     dg: 0,  dr: 0,  kpe: 1 },
        opt:  { dp: 0.15,  dg: 4,  dr: -3, kpe: 1.25 }
      };
      function applyCase(id) {
        const c = CASE[id];
        if (!c) {
          BASE.profit = 0.8; BASE.shares = 1; BASE.g = 10; BASE.r = 15; BASE.pe = 40;
          if (presetNote) presetNote.textContent = '净利润、股本为 2021 年报实数；g / r / PE 是教学假设初值，可自行调。';
        } else {
          BASE.profit = c.profit; BASE.shares = c.shares; BASE.g = c.g; BASE.r = c.r; BASE.pe = c.pe;
          if (presetNote) presetNote.textContent = c.detail + '（2021 年报）；g / r / PE 为教学假设初值。';
        }
        applyScenario('base');
      }
      function applyScenario(sc) {
        const s = SCN[sc]; if (!s) return;
        const p = Math.max(LOGCFG.profit.min, Math.min(LOGCFG.profit.max, BASE.profit * (1 + s.dp)));
        const sh = Math.max(LOGCFG.shares.min, Math.min(LOGCFG.shares.max, BASE.shares));
        const g = Math.max(-5, Math.min(30, BASE.g + s.dg));
        const r = Math.max(5, Math.min(30, BASE.r + s.dr));
        const pe = Math.max(3, Math.min(100, Math.round(BASE.pe * s.kpe * 2) / 2));
        outs.profit.value = Math.round(p * 100) / 100;
        outs.shares.value = Math.round(sh * 100) / 100;
        els.profit.value = toSlider('profit', p);
        els.shares.value = toSlider('shares', sh);
        els.g.value = g; els.r.value = r; els.pe.value = pe;
        document.querySelectorAll('.val-scenarios button').forEach(function (x) { x.classList.remove('on'); });
        const b = document.querySelector('.val-scenarios button[data-sc="' + sc + '"]');
        if (b) b.classList.add('on');
        calc();
      }
      const fieldEl = document.getElementById('val-field-chart');
      const heatEl = document.getElementById('val-heat');
      function fmt(n) { return Math.round(n).toLocaleString('zh-CN'); }
      function lum(rgb) { const m = rgb.match(/\d+/g).map(Number); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; }
      function heatColor(t) { // t∈[0,1]：蓝(低)→红(高)
        const r = Math.round(37 + (220 - 37) * t), g = Math.round(99 + (38 - 99) * t), b = Math.round(235 + (38 - 235) * t);
        return 'rgb(' + r + ',' + g + ',' + b + ')';
      }

      function calc() {
        // 输入统一按「亿元 / 亿股」读，内部一律换成万元 / 万股，跟原来的公式完全一致
        const p = valOf('profit') * 10000, sh = valOf('shares') * 10000;
        const g = valOf('g') / 100, r = valOf('r') / 100, pe = valOf('pe');
        paintOut('g', els.g.value); paintOut('r', els.r.value); paintOut('pe', els.pe.value);
        const yi = function (v) { return v >= 10000 ? '（合 ' + (v / 10000).toFixed(v >= 1e7 ? 0 : 1) + ' 亿元）' : ''; };
        const peLo = p * pe * 0.85, peHi = p * pe * 1.15, peMid = (peLo + peHi) / 2;
        const cLo = p * pe * 0.80, cHi = p * pe * 1.20, cMid = (cLo + cHi) / 2;
        const dcfDef = r > g;
        const dcfAt = function (gg, rr) { return rr > gg ? p * (1 + gg) / (rr - gg) : null; };
        const dLo = dcfAt(g - 0.02, r + 0.02), dHi = dcfAt(g + 0.02, r - 0.02), dMid = dcfDef ? p * (1 + g) / (r - g) : null;
        const methods = [
          { name: '市盈率法', lo: peLo, hi: peHi, mid: peMid },
          { name: '可比公司法', lo: cLo, hi: cHi, mid: cMid },
          { name: '现金流折现 DCF', lo: dLo, hi: dHi, mid: dMid, def: dcfDef }
        ];
        let html = '<div class="val-cards">';
        methods.forEach(function (m) {
          if (m.mid == null) { html += '<div class="val-item bad"><div class="m">' + m.name + '</div><div class="v">无意义</div><div class="note">需 r &gt; g，当前 r≤g，DCF 不成立</div></div>'; return; }
          html += '<div class="val-item"><div class="m">' + m.name + '</div><div class="v">' + fmt(m.mid) + ' 万元' + yi(m.mid) + '</div><div class="note">区间 ' + fmt(m.lo) + ' ~ ' + fmt(m.hi) + ' 万元 · 每股 ' + (m.mid / sh).toFixed(2) + ' 元</div></div>';
        });
        html += '</div>';
        const valid = methods.filter(function (m) { return m.mid != null; });
        if (valid.length) {
          const mids = valid.map(function (m) { return m.mid; });
          const chord = mids.reduce(function (a, b) { return a + b; }, 0) / mids.length;
          const ps = chord / sh;
          html += '<div class="val-suggest">三法交叉验证中枢 <b>' + fmt(chord) + ' 万元</b>' + yi(chord) + '（每股 <b>' + ps.toFixed(2) + ' 元</b>）' + (valid.length < 3 ? '；DCF 因 r≤g 未纳入' : '') + '。三种方法区间重叠越多、估值确定性越高；分歧大时优先核查 g、r 与可比 PE 假设。</div>';
        }
        result.innerHTML = html;
        fieldEl.innerHTML = footballField(methods, sh);
        heatEl.innerHTML = heatMap(p, g, r, sh);
      }

      // 足球场图：每种方法一条横杠（下限→上限），红虚线标建议中枢
      function footballField(methods, sh) {
        const defs = methods.filter(function (m) { return m.lo != null && m.hi != null; });
        if (!defs.length) return '<div class="um-empty">当前参数下三种方法均不成立（需 r&gt;g），无法绘制估值区间。</div>';
        const allLo = defs.map(function (m) { return m.lo; });
        const allHi = methods.filter(function (m) { return m.hi != null; }).map(function (m) { return m.hi; });
        let lo = Math.min.apply(null, allLo), hi = Math.max.apply(null, allHi);
        const useLog = lo > 0 && (hi / lo) > 6; // 跨度大时用对数刻度，避免相对估值被 DCF 极宽区间压扁
        let a, b;
        if (useLog) { const kl = Math.log(lo), kh = Math.log(hi), pd = (kh - kl) * 0.12; a = kl - pd; b = kh + pd; }
        else { const pd = (hi - lo) * 0.14 || 1; a = lo - pd; b = hi + pd; }
        const W = 560, H = 178, L = 112, R = W - 18, pw = R - L;
        const X = useLog ? function (v) { return L + (Math.log(v) - a) / (b - a) * pw; } : function (v) { return L + (v - a) / (b - a) * pw; };
        const dLo = useLog ? Math.exp(a) : a, dHi = useLog ? Math.exp(b) : b;
        const validMids = methods.filter(function (m) { return m.mid != null; }).map(function (m) { return m.mid; });
        const chord = validMids.length ? validMids.reduce(function (x, y) { return x + y; }, 0) / validMids.length : null;
        let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="display:block">';
        s += '<line x1="' + L + '" y1="150" x2="' + R + '" y2="150" stroke="var(--panel-border)"/>';
        methods.forEach(function (m, i) {
          const y = 24 + i * 40;
          if (m.lo == null || m.hi == null) { s += '<text x="6" y="' + (y + 4) + '" fill="var(--muted)" font-size="11.5">' + m.name + '：r≤g 无意义</text>'; return; }
          const x1 = Math.max(L, X(m.lo)), x2 = Math.min(R, X(m.hi));
          const fill = i === 2 ? '#4f46e5' : '#15803d';
          s += '<text x="6" y="' + (y - 7) + '" fill="var(--text)" font-size="12" font-weight="700">' + m.name + '</text>';
          s += '<rect x="' + x1 + '" y="' + y + '" width="' + Math.max(3, x2 - x1) + '" height="15" rx="7.5" fill="' + fill + '" opacity="0.9"/>';
          s += '<text x="' + ((x1 + x2) / 2) + '" y="' + (y + 11) + '" fill="#fff" font-size="10" text-anchor="middle" font-weight="700">' + (m.mid / sh).toFixed(2) + ' 元</text>';
        });
        if (chord != null) {
          const cx = X(chord);
          s += '<line class="val-ff-line" x1="' + cx + '" y1="12" x2="' + cx + '" y2="150" stroke="#b91c1c" stroke-width="2" stroke-dasharray="4 3"/>';
          s += '<text class="val-ff-txt" x="' + cx + '" y="9" fill="#b91c1c" font-size="10.5" text-anchor="middle" font-weight="700">中枢 ' + (chord / sh).toFixed(2) + ' 元</text>';
        }
        // 轴刻度（万元）+ 刻度类型说明
        s += '<text x="' + L + '" y="' + (H - 4) + '" fill="var(--muted)" font-size="10">' + fmt(dLo) + '</text>';
        s += '<text x="' + R + '" y="' + (H - 4) + '" fill="var(--muted)" font-size="10" text-anchor="end">' + fmt(dHi) + '</text>';
        if (useLog) s += '<text x="' + R + '" y="14" fill="var(--muted)" font-size="10" text-anchor="end">对数刻度</text>';
        s += '</svg>';
        return s;
      }

      // 双因素敏感性热力图（DCF）：横轴 r、纵轴 g，格内为每股估值
      function heatMap(p, g, r, sh) {
        const gs = [], rs = [];
        for (let i = 0; i < 7; i++) { gs.push(g + (i - 3) * 0.02); rs.push(r + (i - 3) * 0.02); }
        let vals = [];
        gs.forEach(function (gg) { rs.forEach(function (rr) { if (rr > gg) vals.push(p * (1 + gg) / (rr - gg)); }); });
        const lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
        let s = '<div class="heat"><div class="heat-row heat-head"><div class="hc hl">g ＼ r</div>' + rs.map(function (rr) { return '<div class="hc hl">r=' + (rr * 100).toFixed(0) + '%</div>'; }).join('') + '</div>';
        gs.forEach(function (gg) {
          let row = '<div class="heat-row"><div class="hc hl">g=' + (gg * 100).toFixed(0) + '%</div>';
          rs.forEach(function (rr) {
            if (rr <= gg) { row += '<div class="hc na">—</div>'; }
            else {
              const v = p * (1 + gg) / (rr - gg);
              const t = (v - lo) / (hi - lo || 1);
              const bg = heatColor(t);
              const txt = lum(bg) > 150 ? '#1f2937' : '#fff';
              row += '<div class="hc" style="background:' + bg + ';color:' + txt + '">' + (v / sh).toFixed(2) + '</div>';
            }
          });
          s += row + '</div>';
        });
        s += '</div>';
        return s;
      }

      // 情景按钮：基于当前基准（案例或虚拟公司）按比例推演，不再写死 6500 / 8000 / 9500
      document.querySelectorAll('.val-scenarios button').forEach(function (b) {
        b.addEventListener('click', function () { applyScenario(b.dataset.sc); });
      });

      // 滑块 → 数字框；数字框 → 滑块。两侧都改值，任何一边动都能实时联动。
      ['profit', 'shares'].forEach(function (k) {
        els[k].addEventListener('input', function () {
          outs[k].value = roundNice(fromSlider(k, +els[k].value));
          clearScen(); calc();
        });
        outs[k].addEventListener('input', function () {
          const n = parseFloat(outs[k].value);
          if (isFinite(n) && n > 0) els[k].value = toSlider(k, n);
          clearScen(); calc();
        });
        outs[k].addEventListener('blur', function () {
          const n = parseFloat(outs[k].value);
          if (!isFinite(n) || n <= 0) {           // 清空或填 0 时回到下限，别让整个估值面板变 NaN
            const d = k === 'profit' ? 0.8 : 1;
            outs[k].value = d; els[k].value = toSlider(k, d); calc();
          }
        });
      });
      ['g', 'r', 'pe'].forEach(function (k) {
        els[k].addEventListener('input', function () { clearScen(); calc(); });
      });
      function clearScen() {
        document.querySelectorAll('.val-scenarios button').forEach(function (x) { x.classList.remove('on'); });
      }
      if (presetEl) presetEl.addEventListener('change', function () { applyCase(presetEl.value); });
      applyCase('');
    })();

    // ===== v61 · 可转债价值计算（4.3 可转债 · 环节二）=====
    // 转股价值 = 面值 ÷ 转股价 × 正股股价；再与赎回价比，判断「转股 / 被赎回 / 持有」
    (function () {
      const faceEl = document.getElementById('cb-face');
      const convEl = document.getElementById('cb-conv');
      const priceEl = document.getElementById('cb-price');
      const callEl = document.getElementById('cb-call');
      const outEl = document.getElementById('cb-out');
      const tipEl = document.getElementById('cb-tip');
      if (!faceEl || !convEl || !priceEl || !callEl || !outEl) return;   // 面板不在本页时静默跳过

      // v63：标的切换。原来标题、默认值、验证口径全写死东财转3，学生拿别的转债来算就对不上记录卡。
      // 数据来源：东财转3 = 募集说明书 / 赎回结果公告；隆22转债 = 2026-10-20 回售核查意见。
      const TARGETS = {
        dongcai: {
          name: '东财转3',
          title: '可转债价值计算 · 东财转3',
          note: '四个数字都可以改，下面的结果会实时重算。这就是《东财转3 条款卡》第二栏「转股价值」的算法：转股价值 = 面值 ÷ 转股价 × 正股股价。',
          src: '来源：东财转3 募集说明书 / 赎回结果公告（初始转股价 28.08，分红送转后当期 23.35）',
          face: 100, conv: 23.35, price: 30.36, call: 100.18
        },
        longi: {
          name: '隆22转债',
          title: '可转债价值计算 · 隆22转债',
          note: '同样是「面值 ÷ 转股价 × 正股股价」。隆22转债把转股价从 82.65 元一路调到 17.5 元，股价却只有 10.99 元 —— 门槛降了七成，转股价值仍在赎回价下方。',
          src: '来源：隆基绿能 2026-10-20 回售核查意见；转股价 17.5 元（2025-03-08 下修后）；股价 10.99 元（2026-10-21 收盘）',
          face: 100, conv: 17.5, price: 10.99, call: 101.29
        },
        custom: {
          name: '自定义',
          title: '可转债价值计算 · 自定义',
          note: '四个数字自己填，任意一只可转债都能用这个公式算：转股价值 = 面值 ÷ 转股价 × 正股股价。',
          src: '自定义标的只算数，不写记录卡（记录卡对应具体条款卡）',
          face: 100, conv: 20, price: 20, call: 100
        }
      };
      const targetSel = document.getElementById('cb-target');
      const titleEl = document.getElementById('cb-title');
      const noteEl2 = document.getElementById('cb-note');
      const srcEl = document.getElementById('cb-src');
      const recBtnEl = document.getElementById('cb-record-btn');
      const recMsgEl = document.getElementById('cb-rec-msg');
      let curTarget = 'dongcai';

      function applyTarget(id) {
        const t = TARGETS[id] || TARGETS.dongcai;
        curTarget = TARGETS[id] ? id : 'dongcai';
        if (titleEl) titleEl.textContent = t.title;
        if (noteEl2) noteEl2.textContent = t.note;
        if (srcEl) srcEl.textContent = t.src;
        faceEl.value = t.face; convEl.value = t.conv; priceEl.value = t.price; callEl.value = t.call;
        const canRecord = curTarget !== 'custom';
        if (recBtnEl) {
          recBtnEl.disabled = !canRecord;
          recBtnEl.classList.toggle('disabled', !canRecord);
        }
        if (recMsgEl) {
          recMsgEl.textContent = canRecord
            ? '算完点这里，结果会存进案例页的「4.3 实验记录卡」（当前标的：' + t.name + '）。'
            : '自定义标的只算数，不写记录卡 —— 记录卡判对标准对应具体条款。';
          recMsgEl.className = 'cb-rec-msg';
        }
        const api = window.__ibankCBRecord;
        if (canRecord && api && api.setTarget) api.setTarget(curTarget);
        paint();
      }

      const f4 = function (v) { return v.toFixed(4); };
      const f2 = function (v) { return v.toFixed(2); };
      const sgn2 = function (v) { return (v >= 0 ? '+' : '') + v.toFixed(2); };
      const sgnPct = function (v) { return (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%'; };
      // 输入容错：空值 / 非法 / 非正数一律回退到安全默认值，避免 NaN、Infinity 上屏
      const pos = function (el, dft) {
        const n = parseFloat(el.value);
        return isFinite(n) && n > 0 ? n : dft;
      };

      let CUR = null;   // 当前一屏的输入与结果，供「记录本次结果」取用

      function paint() {
        const face = pos(faceEl, 100), conv = pos(convEl, 23.35), call = pos(callEl, 100.18);
        const pn = parseFloat(priceEl.value);
        const price = isFinite(pn) && pn > 0 ? pn : 0;      // 股价允许为 0（极端下跌）

        const shares = face / conv;          // 每张可转股数
        const value = shares * price;        // 转股价值（元/张）
        const diff = value - call;           // 与赎回价差额
        const pct = call > 0 ? diff / call : 0;
        const line = conv * 1.3;             // 强赎触发线 = 转股价 × 130%

        // 三档判定，顺序不能换：先看强赎（硬性），再比转股价值与赎回价
        let state, cls;
        if (price >= line - 1e-9) { state = '已触发强赎线，必须转股'; cls = 'st-call'; }
        else if (value >= call) { state = '转股优于被赎回'; cls = 'st-conv'; }
        else { state = '债性保护生效，不转股'; cls = 'st-hold'; }
        // v62：三档各配一个几何符号。投影偏色 / 黑白打印时红黄绿会糊成一片，符号仍可辨
        const sym = cls === 'st-call' ? '● ' : (cls === 'st-conv' ? '▲ ' : '■ ');

        const cell = function (k, v, n, c) {
          return '<div class="cb-o' + (c ? ' ' + c : '') + '">' +
                   '<span class="k">' + k + '</span>' +
                   '<span class="v">' + v + '</span>' +
                   (n ? '<span class="n">' + n + '</span>' : '') +
                 '</div>';
        };
        outEl.innerHTML =
          cell('每张可转股数（股）', f4(shares), '面值 ÷ 转股价') +
          cell('转股价值（元/张）', f2(value), '股数 × 正股股价') +
          cell('与赎回价差额（元）', sgn2(diff), sgnPct(pct) + '，赎回价 ' + f2(call)) +
          cell('状态判定', sym + state, '', cls);

        // 供「＋ 记录本次结果」读取当前这一屏的输入与结果（不重复计算）
        CUR = { face: face, conv: conv, price: price, call: call, shares: shares, value: value, diff: diff, state: state, cls: cls };

        tipEl.innerHTML = '强赎线 = 转股价 × 130% = <b>' + f2(line) + '</b> 元。正股股价站上这条线，' +
          '发行人就可按面值加应计利息（这里取 ' + f2(call) + ' 元）赎回；持有人不转股，只能按赎回价被赎回。';
      }

      function markCalcStart() {
        const api = window.__ibankCBRecord;
        if (api && api.mark) api.mark('calc');
      }
      [faceEl, convEl, priceEl, callEl].forEach(function (el) {
        el.addEventListener('input', function () { markCalcStart(); paint(); });
      });

      // v62：把这一屏的结果推进案例页的「4.3 实验记录卡」（最多留 3 条，可逐条删）
      const recBtn = document.getElementById('cb-record-btn');
      const recMsg = document.getElementById('cb-rec-msg');
      if (recBtn) {
        recBtn.addEventListener('click', function () {
          const api = window.__ibankCBRecord;
          if (!api || !CUR) return;
          markCalcStart();
          const r = api.record(CUR);
          if (recMsg) {
            recMsg.textContent = r.msg;
            recMsg.className = 'cb-rec-msg ' + (r.ok ? 'ok' : 'bad');
          }
        });
      }

      if (targetSel) targetSel.addEventListener('change', function () { applyTarget(targetSel.value); });
      // 恢复上次用的标的：与记录卡共用 localStorage 里的 target 字段，两边不会各说各话
      let initT = 'dongcai';
      try {
        const raw = JSON.parse(localStorage.getItem('ibank_cb_record_v1') || 'null');
        if (raw && raw.target === 'longi') initT = 'longi';
      } catch (e) { /* 读不到就用东财转3 */ }
      if (targetSel) targetSel.value = initT;
      applyTarget(initT);
    })();

    // ===== v62 · 4.3 实验记录卡：网页代替纸质表格 =====
    // 设计书原本让学生填在纸上（条款卡 / 两次测算 / 决策单），这里做成页面内可填、可留、可入教师端：
    //   ① 四个关键数：即时判对错（✓ / ✗）       ② 两次测算：复用转股面板，点「记录本次结果」入卡
    //   ③ 赎回决策：发行人（董秘）视角二选一 + 理由（≥10 字），无标准答案，不做正误判定
    // 数据只落 localStorage（纯静态站无服务端），三段动作各上报一次埋点，教师端「4.3 三环节」面板聚合。
    (function () {
      const KEY = 'ibank_cb_record_v1';
      // 答案常量集中这一处：不写进 DOM、不写进 data 属性（否则 F12 一眼看穿）
      // v63：记录卡支持两个标的，答案与「两次测算」目标价各一套；存储按标的分桶，互不覆盖
      const ANS_OF = {
        dongcai: { amount: 158, conv: 23.35, callLine: 30.36, callPrice: 100.18 },
        longi:   { amount: 70,  conv: 17.5,  callLine: 22.75, callPrice: 101.29 }
      };
      const NEED_OF = {
        dongcai: [{ price: 30.36, label: '已触发强赎线' }, { price: 20, label: '债性保护生效' }],
        longi:   [{ price: 22.75, label: '已触发强赎线' }, { price: 10, label: '债性保护生效' }]
      };
      const NAME_OF = { dongcai: '东财转3', longi: '隆22转债' };
      // v64：第三栏的立场从「持有人」改为「发行人（董秘）」。设计书环节三的原话是
      //   「如果你是 2022 年 1 月的董秘，赎还是不赎」，而页面原来问的是持有人接不接受赎回，
      //   主体与选项动词（赎回/不赎回）互相打架。改为发行人立场后，情境句也必须按标的写实。
      const SITU_OF = {
        dongcai: {
          lead: '站到 2022 年 1 月董秘的位置：正股 30.36 元已站上强赎线，158 亿元债还挂在账上，未转股的按',
          tail: '元/张被赎回。赎，还是不赎？选一边，并说清理由。'
        },
        longi: {
          lead: '站到 2026 年 10 月董秘的位置：正股 10.99 元，强赎线 22.75 元，回售压力已起，未转股的按',
          tail: '元/张回售。隆22 还没触发强赎 —— 真要赎，得先让股价站上 22.75 元；这一栏先留作对照。'
        }
      };
      let targetId = 'dongcai';
      let ANS = ANS_OF.dongcai;
      let NEED = NEED_OF.dongcai;
      const FIELDS = ['amount', 'conv', 'callLine', 'callPrice'];
      const FIELD_LABEL = { amount: '发行总额（亿元）', conv: '当期转股价（元/股）', callLine: '强赎触发线（元/股）', callPrice: '强赎价格（元/张）' };
      const MAXC = 3;          // 最多留 3 条测算（够两次，留一次改错的余量）
      const CAP_SEC = 900;     // 耗时封顶，防挂机出现几万秒把班级均值拉坏
      const REASON_MIN = 10;
      const TOL = 0.01;

      const root = document.getElementById('cb-record');
      if (!root) return;       // 记录卡不在本页时静默跳过

      const el = function (id) { return document.getElementById(id); };
      const $save = el('cbr-save'), $c1 = el('cbr-c1'), $c2 = el('cbr-c2'), $c3 = el('cbr-c3');
      const $calcs = el('cbr-calcs'), $c2hint = el('cbr-c2hint'), $choice = el('cbr-choice');
      const $reason = el('cbr-reason'), $msg = el('cbr-msg'), $state = el('cbr-state');
      const inputs = {};
      FIELDS.forEach(function (k) { inputs[k] = el('cbr-' + k); });

      const f2 = function (v) { return (Math.round(v * 100) / 100).toFixed(2); };
      const SYM = { 'st-call': '● ', 'st-conv': '▲ ', 'st-hold': '■ ' };

      // 学生可能直接粘「158亿元」「1,580」这类写法：先归一化再比
      function num(v) {
        let s = String(v == null ? '' : v).trim();
        if (!s) return NaN;
        s = s.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
             .replace(/[，,]/g, '')
             .replace(/[。．]/g, '.')
             .replace(/[^\d.\-]/g, '');
        const n = parseFloat(s);
        return isFinite(n) ? n : NaN;
      }
      function okOf(k) { const n = num(S.terms[k]); return isFinite(n) && Math.abs(n - ANS[k]) < TOL; }

      const EMPTY = function () {
        return { terms: { amount: '', conv: '', callLine: '', callPrice: '' },
          calcs: [], decision: null, draftChoice: '', reasonText: '', started: {}, tracked: {}, wrong: [] };
      };

      function readAllStores() {
        try {
          const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
          if (!raw || typeof raw !== 'object') return { target: 'dongcai', targets: {} };
          if (raw.targets && typeof raw.targets === 'object') {
            return { target: raw.target === 'longi' ? 'longi' : 'dongcai', targets: raw.targets };
          }
          // v1 旧格式是平铺的：整张卡归到东财转3 桶，学生已填内容不会因为升级丢掉
          return { target: 'dongcai', targets: { dongcai: raw } };
        } catch (e) { return { target: 'dongcai', targets: {} }; }
      }
      function hydrate(raw) {
        const base = EMPTY();
        try {
          if (!raw || typeof raw !== 'object') return base;
          if (raw.terms && typeof raw.terms === 'object') {
            FIELDS.forEach(function (k) { if (typeof raw.terms[k] === 'string') base.terms[k] = raw.terms[k]; });
          }
          if (Array.isArray(raw.calcs)) {
            base.calcs = raw.calcs.filter(function (c) {
              return c && isFinite(num(c.price)) && isFinite(num(c.value));
            }).slice(0, MAXC).map(function (c) {
              return { price: Number(c.price), conv: Number(c.conv), value: Number(c.value),
                state: String(c.state || ''), cls: String(c.cls || ''), ts: Number(c.ts) || 0 };
            });
          }
          if (raw.decision && typeof raw.decision === 'object' && raw.decision.choice) {
            base.decision = { choice: raw.decision.choice === 'hold' ? 'hold' : 'call',
              reason: String(raw.decision.reason || ''), ts: Number(raw.decision.ts) || 0 };
          }
          base.draftChoice = raw.draftChoice === 'hold' || raw.draftChoice === 'call' ? raw.draftChoice : '';
          if (typeof raw.reasonText === 'string') base.reasonText = raw.reasonText;
          if (raw.started && typeof raw.started === 'object') base.started = raw.started;
          if (raw.tracked && typeof raw.tracked === 'object') base.tracked = raw.tracked;
          if (Array.isArray(raw.wrong)) base.wrong = raw.wrong.filter(function (k) { return FIELDS.indexOf(k) >= 0; });
        } catch (e) { /* 隐私模式 / 脏数据：退回空白卡，不白屏 */ }
        return base;
      }

      const ALL = readAllStores();
      targetId = ALL.target;
      ANS = ANS_OF[targetId]; NEED = NEED_OF[targetId];
      let S = hydrate(ALL.targets[targetId]);

      function save(touch) {
        try {
          ALL.targets[targetId] = S;
          ALL.target = targetId;
          localStorage.setItem(KEY, JSON.stringify(ALL));
          if (touch !== false && $save) {
            const d = new Date();
            const p2 = function (n) { return (n < 10 ? '0' : '') + n; };
            $save.textContent = '已保存 ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ' · 本机';
          }
        } catch (e) {
          if ($save) $save.textContent = '本机保存不可用（隐私模式？）';
        }
      }

      function mark(seg) {
        if (!S.started[seg]) { S.started[seg] = Date.now(); save(false); }
      }
      function elapsed(seg) {
        const t = Number(S.started[seg]) || 0;
        if (!t) return 1;
        const s = Math.round((Date.now() - t) / 1000);
        return Math.max(1, Math.min(CAP_SEC, s));
      }
      function trackOnce(kind, type, payload) {
        if (S.tracked[kind]) return;
        S.tracked[kind] = true;
        save(false);
        if (typeof window.__ibankTrack === 'function') {
          try { window.__ibankTrack(type, payload); } catch (e) { /* 上报失败不阻断填写 */ }
        }
      }

      // ── ① 四个关键数 ─────────────────────────────
      function paintMarks(forceJudge) {
        let n = 0;
        FIELDS.forEach(function (k) {
          const raw = S.terms[k];
          const ok = okOf(k);
          const box = inputs[k].parentNode.parentNode;
          const mk = el('cbr-m-' + k);
          box.classList.remove('ok', 'bad');
          if (!raw) { mk.textContent = ''; mk.className = 'cbr-m'; return; }
          if (ok) {
            n++;
            box.classList.add('ok'); mk.textContent = '✓'; mk.className = 'cbr-m ok';
          } else if (forceJudge) {
            box.classList.add('bad'); mk.textContent = '✗'; mk.className = 'cbr-m bad';
          } else {
            // 正在输入时先不判错，避免「23」还没打完就被打叉
            const was = mk.textContent === '✗';
            mk.textContent = was ? '✗' : '';
            mk.className = 'cbr-m' + (was ? ' bad' : '');
            if (was) box.classList.add('bad');
          }
        });
        $c1.textContent = n + ' / 4';
        $c1.className = n === 4 ? 'done' : '';
        if (n === 4) {
          trackOnce('terms', 'cb_terms', { chapter: '第4章', module: '投行教学案例库', correct: true,
            duration: elapsed('terms'), detail: JSON.stringify({ wrong: S.wrong.slice() }) });
        }
        paintFoot();
      }

      // ── ② 两次测算 ───────────────────────────────
      function covered(p) {
        return S.calcs.some(function (c) { return Math.abs(c.price - p) < TOL; });
      }
      function calcCount() { return NEED.filter(function (n) { return covered(n.price); }).length; }
      function calcRight() {
        const base = 100 / ANS.conv;   // 每张可转股数（按标准转股价）
        return NEED.every(function (n) {
          return S.calcs.some(function (c) {
            return Math.abs(c.price - n.price) < TOL &&
                   Math.abs(c.conv - ANS.conv) < 0.011 &&
                   Math.abs(c.value - base * n.price) < 0.02;
          });
        });
      }
      function paintCalcs() {
        const n = calcCount();
        $c2.textContent = n + ' / 2';
        $c2.className = n === 2 ? 'done' : '';

        $calcs.innerHTML = S.calcs.length
          ? S.calcs.map(function (c, i) {
              return '<div class="cbr-calc">' +
                       '<span class="cbr-calc-k">股价 ' + f2(c.price) + '</span>' +
                       '<span class="cbr-calc-v">转股价值 ' + f2(c.value) + '</span>' +
                       '<span class="cbr-calc-s ' + (c.cls || '') + '">' + (SYM[c.cls] || '') + c.state + '</span>' +
                       '<button type="button" class="cbr-del" data-i="' + i + '">删</button>' +
                     '</div>';
            }).join('')
          : '<div class="cbr-empty">还没有记录。先到「企业估值实验」页算一次，再点面板下方的「＋ 记录本次结果」。</div>';

        if (n >= 2) {
          $c2hint.textContent = S.calcs.length >= MAXC ? '两次已够（最多留 3 条，记满要先删一条）' : '两次已够 ✓';
          $c2hint.className = 'cbr-hint ok';
        } else {
          const miss = NEED.filter(function (x) { return !covered(x.price); })
            .map(function (x) { return '股价 ' + f2(x.price); }).join('、');
          $c2hint.textContent = '还差 ' + (2 - n) + ' 次：' + miss;
          $c2hint.className = 'cbr-hint';
        }
        if (n >= 2) {
          trackOnce('calc', 'cb_calc', { chapter: '第4章', module: '企业估值实验', correct: calcRight(),
            duration: elapsed('calc'),
            detail: JSON.stringify({ prices: S.calcs.map(function (c) { return c.price; }) }) });
        }
        paintFoot();
      }

      // ── ③ 赎回决策 ───────────────────────────────
      const CHOICE_TXT = { call: '赎回', hold: '不赎回' };
      function paintChoice() {
        Array.prototype.forEach.call($choice.querySelectorAll('button'), function (b) {
          const on = b.getAttribute('data-choice') === S.draftChoice;
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        if (S.decision) {
          $c3.textContent = '已提交 · ' + CHOICE_TXT[S.decision.choice]; $c3.className = 'done';
        } else if (S.draftChoice) {
          $c3.textContent = '待提交'; $c3.className = '';
        } else {
          $c3.textContent = '未提交'; $c3.className = '';
        }
      }

      function submitDecision() {
        if (!S.draftChoice) { setMsg('先选「赎回」或「不赎回」，再提交。', 'bad'); return; }
        const reason = String($reason.value || '').trim();
        const n = Array.from(reason).length;
        if (n < REASON_MIN) { setMsg('再补几个字（现在 ' + n + ' 个字，至少 ' + REASON_MIN + ' 个字）。', 'bad'); $reason.focus(); return; }
        S.decision = { choice: S.draftChoice, reason: reason, ts: Date.now() };
        S.reasonText = reason;
        save();
        paintChoice();
        paintFoot();
        setMsg('已提交：' + CHOICE_TXT[S.decision.choice] + '。理由随时可改，改完再点一次提交即覆盖。', 'ok');
        if (typeof window.__ibankTrack === 'function') {
          try {
            window.__ibankTrack('cb_decision', { chapter: '第4章', module: '投行教学案例库', correct: null,
              duration: elapsed('decision'),
              detail: JSON.stringify({ choice: S.decision.choice, reason: reason }) });
          } catch (e) { /* 上报失败不影响本机留档 */ }
        }
      }
      function setMsg(t, cls) { $msg.textContent = t; $msg.className = 'cbr-msg ' + (cls || ''); }

      // ── 底部状态 ─────────────────────────────────
      function doneFlags() {
        const t = FIELDS.filter(okOf).length === 4;
        const c = calcCount() >= 2;
        const d = !!S.decision;
        return { t: t, c: c, d: d, n: (t ? 1 : 0) + (c ? 1 : 0) + (d ? 1 : 0) };
      }
      function paintFoot() {
        const f = doneFlags();
        $state.innerHTML = '完成度 ' + f.n + '/3 · ' +
          (f.t ? '四个数 ✓' : '四个数 —') + ' · ' +
          (f.c ? '两次测算 ✓' : '两次测算 —') + ' · ' +
          (f.d ? '决策 ✓' : '决策 —');
      }

      // ── 结论卡文本（复制到群 / 贴作业本）─────────────
      function plainText() {
        const L = [];
        L.push('【4.3 实验记录卡 · ' + (NAME_OF[targetId] || '东财转3') + '】');
        L.push('① 四个关键数');
        FIELDS.forEach(function (k) {
          const v = String(S.terms[k] || '').trim();
          L.push('  ' + FIELD_LABEL[k] + '：' + (v || '（未填）') + (v ? (okOf(k) ? ' ✓' : ' ✗') : ''));
        });
        L.push('② 两次测算');
        if (!S.calcs.length) L.push('  （未记录）');
        S.calcs.forEach(function (c) {
          L.push('  股价 ' + f2(c.price) + ' → 转股价值 ' + f2(c.value) + ' · ' + c.state);
        });
        L.push('③ 赎回决策（董秘视角）：' + (S.decision ? CHOICE_TXT[S.decision.choice] : '（未提交）'));
        if (S.decision && S.decision.reason) L.push('  理由：' + S.decision.reason);
        const f = doneFlags();
        L.push('完成度：' + f.n + '/3');
        return L.join('\n');
      }

      function copyText(t) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return legacyCopy(t); });
        }
        return Promise.resolve(legacyCopy(t));
      }
      function legacyCopy(t) {
        try {
          const ta = document.createElement('textarea');
          ta.value = t;
          ta.setAttribute('readonly', '');
          ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
          document.body.appendChild(ta);
          ta.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(ta);
          return ok;
        } catch (e) { return false; }
      }

      // ── 事件绑定 ─────────────────────────────────
      FIELDS.forEach(function (k) {
        const inp = inputs[k];
        inp.value = S.terms[k] || '';
        inp.addEventListener('focus', function () { mark('terms'); });
        inp.addEventListener('input', function () {
          S.terms[k] = inp.value;
          mark('terms');
          save(false);
          paintMarks(false);
        });
        // blur / 回车才算「定稿」：这时才把 ✗ 记进 wrong[]，否则边打边判会把「一次全对」判死
        inp.addEventListener('change', function () {
          S.terms[k] = inp.value;
          const raw = String(inp.value || '').trim();
          if (raw && !okOf(k) && S.wrong.indexOf(k) < 0) { S.wrong.push(k); save(false); }
          save();
          paintMarks(true);
        });
        inp.addEventListener('blur', function () { paintMarks(true); });
      });

      $calcs.addEventListener('click', function (e) {
        const b = e.target.closest ? e.target.closest('.cbr-del') : null;
        if (!b) return;
        const i = Number(b.getAttribute('data-i'));
        if (!isFinite(i) || i < 0 || i >= S.calcs.length) return;
        S.calcs.splice(i, 1);
        save();
        paintCalcs();
      });

      $choice.addEventListener('click', function (e) {
        const b = e.target.closest ? e.target.closest('button[data-choice]') : null;
        if (!b) return;
        S.draftChoice = b.getAttribute('data-choice');
        S.reasonText = $reason.value;
        mark('decision');
        save();
        paintChoice();
        setMsg('', '');
      });

      $reason.value = S.decision ? S.decision.reason : (S.reasonText || '');
      $reason.addEventListener('focus', function () { mark('decision'); });
      $reason.addEventListener('input', function () { S.reasonText = $reason.value; mark('decision'); save(false); });

      el('cbr-submit').addEventListener('click', submitDecision);

      el('cbr-toval').addEventListener('click', function () {
        const b = document.querySelector('.tab-btn[data-page="p-valuation"]');
        if (b) b.click();
        setTimeout(function () {
          const card = document.querySelector('.cb-card');
          if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
      });

      el('cbr-copy').addEventListener('click', function () {
        copyText(plainText()).then(function (ok) {
          setMsg(ok ? '结论卡已复制，可以直接粘进班级群或作业本。' : '复制失败，请手动选中文字复制。', ok ? 'ok' : 'bad');
        });
      });

      el('cbr-reset').addEventListener('click', function () {
        if (!window.confirm('确定清空这张记录卡？本机已填的内容会全部删除，且不能撤销。')) return;
        S = EMPTY();
        delete ALL.targets[targetId];
        try { localStorage.setItem(KEY, JSON.stringify(ALL)); } catch (e) { }
        FIELDS.forEach(function (k) { inputs[k].value = ''; });
        $reason.value = '';
        setMsg('', '');
        $save.textContent = '本机自动保存';
        paintAll();
      });

      // 记录卡跟标的切了，但案例页上方的条款表永远是东财转3 的 —— 用一行黄字把这件事说清
      function paintTargetHint() {
        const h = el('cbr-target-hint');
        if (h) {
          h.textContent = targetId === 'longi'
            ? '当前标的：隆22转债。上方条款表是东财转3 的，别照抄 —— 隆22 的条款见「企业估值实验」页的转股面板。'
            : '';
        }
        // 两次测算的目标价、决策里的赎回价都跟着标的走 —— 原先把 30.36 / 20 / 100.18 写死在 HTML 里
        const n1 = el('cbr-need1'), n2 = el('cbr-need2'), cn = el('cbr-callnum');
        if (n1) n1.textContent = f2(NEED[0].price);
        if (n2) n2.textContent = f2(NEED[1].price);
        if (cn) cn.textContent = f2(ANS.callPrice);
        // v64：第三栏改成发行人（董秘）立场后，情境句也必须随标的换 ——
        //   隆22 的股价离强赎线还有一倍，照抄东财那句「已站上强赎线」就是说假话。
        const situ = SITU_OF[targetId] || SITU_OF.dongcai;
        const ld = el('cbr-situ-lead'), tl = el('cbr-situ-tail');
        if (ld) ld.textContent = situ.lead;
        if (tl) tl.textContent = situ.tail;
      }

      function paintAll() { paintMarks(true); paintCalcs(); paintChoice(); paintFoot(); }

      // ── 对外接口：供转股面板「记录本次结果」调用 ─────────
      window.__ibankCBRecord = {
        mark: function (seg) { mark(seg); },
        // v63：转股面板切标的时调用 —— 记录卡跟着换一套判对标准，两套记录分开存
        setTarget: function (id) {
          if (id !== 'dongcai' && id !== 'longi') return { ok: false, msg: '记录卡只支持东财转3 / 隆22转债' };
          if (id === targetId) return { ok: true, target: targetId };
          targetId = id;
          ANS = ANS_OF[id]; NEED = NEED_OF[id];
          ALL.target = targetId;
          S = hydrate(ALL.targets[id]);
          FIELDS.forEach(function (k) { inputs[k].value = S.terms[k] || ''; });
          $reason.value = S.decision ? S.decision.reason : (S.reasonText || '');
          const t = el('cbr-title');
          if (t) t.textContent = '4.3 实验记录卡 · ' + NAME_OF[id];
          paintTargetHint();
          paintAll();
          save(false);
          return { ok: true, target: targetId };
        },
        currentTarget: function () { return targetId; },
        record: function (cur) {
          if (!cur || !isFinite(cur.price)) return { ok: false, msg: '当前没有可记录的结果' };
          const price = Number(cur.price), value = Number(cur.value);
          const item = { price: price, conv: Number(cur.conv) || 0, value: value,
            state: String(cur.state || ''), cls: String(cur.cls || ''), ts: Date.now() };
          // 同一股价重复记录时更新原条目，不占新名额（学生反复点不会把 3 个名额浪费在同一个数上）
          const same = S.calcs.findIndex(function (c) { return Math.abs(c.price - price) < TOL; });
          let msg;
          if (same >= 0) {
            S.calcs[same] = item;
            msg = '已更新「股价 ' + f2(price) + '」的记录';
          } else if (S.calcs.length >= MAXC) {
            return { ok: false, msg: '已记录 ' + MAXC + ' 次，先删一条再记' };
          } else {
            S.calcs.push(item);
            msg = '已记录：股价 ' + f2(price) + ' → 转股价值 ' + f2(value) + '（' + calcCount() + '/2）';
          }
          save();
          paintCalcs();
          return { ok: true, msg: msg };
        },
        // 测试与排障用：只读快照，不外泄答案
        state: function () {
          return { terms: JSON.parse(JSON.stringify(S.terms)), calcs: JSON.parse(JSON.stringify(S.calcs)),
            decision: S.decision ? JSON.parse(JSON.stringify(S.decision)) : null,
            draftChoice: S.draftChoice, tracked: JSON.parse(JSON.stringify(S.tracked)),
            wrong: S.wrong.slice(), started: JSON.parse(JSON.stringify(S.started)) };
        },
        text: plainText
      };

      // v63：标题跟着当前标的走（localStorage 里可能停在隆22转债）
      const titleEl0 = el('cbr-title');
      if (titleEl0) titleEl0.textContent = '4.3 实验记录卡 · ' + (NAME_OF[targetId] || '东财转3');
      paintTargetHint();
      paintAll();
      save(false);
    })();

    // ===== 课程学习 · 章节式学习器（基于教学大纲 8 章：第0章导论 + 第1–7章） =====
    (function () {
      const CHAPTERS = [
        { no: '第0章', title: '导论', zhong: '投资银行的职业种类与必备素质；投行从业者的职业定位与道德标准', nan: '结合自身兴趣与能力做合理的职业规划' },
        { no: '第1章', title: '投资银行概述', zhong: '投资银行的定义与业务范围；与商业银行的异同；承销、并购、证券交易等主要业务', nan: '投资银行功能的经济学解释（信息不对称、委托代理理论）' },
        { no: '第2章', title: '企业融资方案设计', zhong: '融资需求分析；股权融资与债权融资的权衡；融资方式选择', nan: '融资需求预测的方法（销售百分比法、回归分析法）' },
        { no: '第3章', title: '股份有限公司与首次公开发行', zhong: '股份有限公司的设立；IPO 流程；股票发行方式与发行定价', nan: '股票发行定价方法（市盈率法、现金流折现、市场竞价）；借壳上市' },
        { no: '第4章', title: '上市公司再融资', zhong: '增发、配股、优先股、可转换公司债券、可交换公司债券', nan: '可转债与可交换债的区别与定价；再融资的承销风险' },
        { no: '第5章', title: '债券的发行与承销', zhong: '债券基础知识；国债、地方政府债、金融债、公司信用类债券的发行与承销', nan: '债券定价（票面利率的确定）；信用评级' },
        { no: '第6章', title: '资产证券化', zhong: '资产证券化的概念与交易结构；主要类型（MBS、ABS 等）', nan: '资产证券化的收益与风险分析；信用增级与分层结构' },
        { no: '第7章', title: '公司并购', zhong: '并购的概念与类型；并购动因；一般操作程序；支付方式', nan: '杠杆收购（LBO）；反收购策略；要约收购' }
      ];
      // v52 配套视频：全部经 B 站 view API 逐条核验（2026-10-07）
      // bv / title / duration / pages 均取自接口真实返回，up 为接口返回的账号名（已标注是否搬运）
      // 维护方式：新增视频先用 _private/verify_videos52c.cjs 核验，通过后再把 BV 号填入下方
      const VIDEOS = {
        '第0章': [
          { bv: 'BV1JK411R7Cu', title: '【北京大学】《投资银行学》主讲：冯科（全60讲）从业教授带你 风趣幽默看投行', up: '哔哩大学財经学院（搬运：北京大学公开课）', duration: '18小时27分', pages: 61, note: '国内最系统的高校投行学课程，从「投行是什么」讲起，61 分 P' },
          { bv: 'BV1B7411d7oY', title: '【干货科普】投行业务全面介绍', up: '晓樵求职学院', duration: '46分2秒', pages: 3, note: '投行四大业务板块全景概览，3 分 P' },
          { bv: 'BV1ni4y1C7NR', title: '投行中的承揽、承销、承做是什么？投行鄙视链大揭秘', up: '投行小魔女', duration: '3分56秒', pages: 1, note: '投行内部岗位分工，对应本章「职业种类」' },
          { bv: 'BV1Sw411779M', title: '【北大·冯科】讲投资，大道至简，建议听听', up: '投资思维室', duration: '6分10秒', pages: 1, note: '从职业视角理解投行的价值定位与职业要求' }
        ],
        '第1章': [
          { bv: 'BV1mk2gB4EGL', title: '【耶鲁大学】公开课：金融市场', up: '迦南金融学院（搬运：耶鲁大学公开课）', duration: '28小时29分', pages: 25, note: '金融市场体系与投资银行功能（耶鲁公开课）' }
        ],
        '第2章': [
          { bv: 'BV1AM411T73Z', title: '【股权融资】股权融资全流程', up: '渔多米', duration: '5h32m', pages: 11, note: '股权融资全流程，含融资需求测算' },
          { bv: 'BV1qS4y1q7FW', title: '2022年中级财务管理0504资本结构（上）资本结构理论', up: '圆月当空老师', duration: '18m', pages: 1, note: '资本结构理论：MM 定理与权衡理论' }
        ],
        '第3章': [
          { bv: 'BV1qa411q7zV', title: '【中央财经大学】《投资学》【全200课】国家级精品课', up: '复利的奇迹ETF基金理财（搬运：中央财经大学精品课）', duration: '45小时6分', pages: 200, note: '股份公司设立、发行方式与定价（国家级精品课）' }
        ],
        '第4章': [
          { bv: 'BV1cZ4y1h7jn', title: '可转债进阶教程', up: '图图复盘', duration: '2h27m', pages: 10, note: '可转债条款结构与定价，10 分 P 系统讲解' }
        ],
        '第5章': [
          { bv: 'BV1Ru4m1u7Mo', title: '企业债券定价的基本原理｜货币金融学第20课第5讲', up: '货币法则研习社', duration: '3m43s', pages: 1, note: '企业债券定价的基本原理' },
          { bv: 'BV13K4y1Z7ko', title: 'Financial Markets (FM) 金融市场公开课 第3.3讲 债券的信用评级和违约', up: '小马哥0701', duration: '13m', pages: 1, note: '债券信用评级方法与违约处置' }
        ],
        '第6章': [
          { bv: 'BV1YE411s7BE', title: 'ABS业务解析', up: 'DonSongg', duration: '4h43m', pages: 13, note: 'ABS 交易结构、信用增级与分层，13 分 P' },
          { bv: 'BV1fg411J7UT', title: '投行面试|什么是资产证券化？ABS的接地气讲解，看清资本套路', up: '小崔巨靠谱', duration: '6m28s', pages: 1, note: '资产证券化的接地气讲解（面试视角）' }
        ],
        '第7章': [
          { bv: 'BV16Q4y1B7pR', title: '巨树｜上市公司并购重组商业逻辑解读之典型案例剖析', up: '巨树课堂', duration: '21m57s', pages: 1, note: '上市公司并购重组的商业逻辑与典型案例' },
          { bv: 'BV19g4y1t795', title: '【硬核干货】经典案例详解并购重组之第一期', up: '小会计很自律', duration: '11m', pages: 1, note: '经典并购重组案例实操详解' },
          { bv: 'BV1GF43zTEGn', title: '【估值进阶】【中英】华尔街估值之王 Aswath Damodaran - Valuation', up: 'Gelai_AI（搬运：Damodaran 估值课）', duration: '1小时17分', pages: 1, note: '估值方法：并购定价与相对/绝对估值' },
          { bv: 'BV1WEyoBkE8J', title: '【伊利诺伊大学】投资银行业务：并购和首次公开募股 Investment Banking: Mergers, Acquisitions, IPOs', up: 'Mindofuture（搬运：伊利诺伊大学公开课）', duration: '1小时52分', pages: 38, note: '英文并购实操课，38 分 P 讲并购与 IPO 业务全流程' }
        ]
      };
      const VIDEO_VERIFIED_ON = '2026-10-07';      const DETAIL = {
      "第0章": {
            "framework": [
                  {
                        "t": "投行做什么",
                        "d": "承销保荐、并购顾问、销售交易、研究、资管、风控合规六条业务线"
                  },
                  {
                        "t": "需要什么人",
                        "d": "财务与法律底子 + 估值建模 + 沟通协作 + 抗压 + 职业操守"
                  },
                  {
                        "t": "职业红线",
                        "d": "内幕交易、利益输送、利益冲突、勤勉尽责"
                  },
                  {
                        "t": "怎么规划",
                        "d": "承做 / 承揽 / 研究 / 风控的路径选择与证书实习积累"
                  }
            ],
            "review": "导论从「投行到底在做什么」入手：介绍投资银行的职业种类（承销保荐、并购重组顾问、销售与交易、研究与机构销售、资产管理、风控与合规等）与从业者的必备素质，并引导同学思考投行工作的道德标准与职业定位。",
            "keydata": [
                  {
                        "k": "2024 年 A 股 IPO 数量",
                        "v": "100 家，较上年减少 213 家",
                        "s": "Wind，经 21 世纪经济报道 2025-01 引述 [S5]"
                  },
                  {
                        "k": "2024 年 A 股 IPO 募资总额",
                        "v": "673.53 亿元，同比下降 81.11%",
                        "s": "Wind，同上 [S5]"
                  },
                  {
                        "k": "2024 年 IPO 承销保荐费均值（最高板块）",
                        "v": "科创板 6,493.34 万元",
                        "s": "Wind，同上 [S5]"
                  },
                  {
                        "k": "2024 年并购重组交易（证监会口径）",
                        "v": "沪深两市上市公司共披露 3,623 单、交易金额 13,682.11 亿元",
                        "s": "中国证监会 2024 年年报 [S4]"
                  }
            ],
            "concepts": [
                  {
                        "t": "投行职业种类",
                        "d": "承销保荐、并购重组顾问、销售与交易、研究与机构销售、资产管理、风控与合规等主要岗位序列。"
                  },
                  {
                        "t": "投行必备素质",
                        "d": "扎实的财务与法律基础、估值建模与文案能力、沟通与项目协作、抗压与时间管理，以及职业操守。"
                  },
                  {
                        "t": "职业定位与规划",
                        "d": "结合自身兴趣与能力，在承做 / 承揽 / 研究 / 风控等路径中做出选择，并规划证书、实习与技能积累。"
                  },
                  {
                        "t": "职业道德与合规底线",
                        "d": "内幕交易、利益输送、利益冲突与勤勉尽责等红线，是投行职业生涯的立身之本。"
                  }
            ],
            "reading": [
                  {
                        "t": "中国证券业协会 · 证券行业执业规范",
                        "u": "https://www.sac.net.cn/"
                  },
                  {
                        "t": "证监会 · 证券期货市场失信行为记录制度",
                        "u": "https://www.csrc.gov.cn/"
                  }
            ]
      },
      "第1章": {
            "framework": [
                  {
                        "t": "是什么",
                        "d": "资本市场金融中介，做直接融资的居间与承销"
                  },
                  {
                        "t": "和银行差在哪",
                        "d": "表外为主 / 收服务费 / 风险偏好高 vs 表内 / 利差 / 审慎监管"
                  },
                  {
                        "t": "赚什么钱",
                        "d": "承销费、顾问费、交易与资管收入"
                  },
                  {
                        "t": "经济学解释",
                        "d": "降低信息不对称、提供流动性、分散与管理风险、降低交易成本"
                  }
            ],
            "review": "本章从投资银行的界定出发，梳理其作为资本市场「信息中介」与「定价中枢」的核心职能：证券承销保荐、并购重组顾问、经纪与交易、资产管理等；并对比间接融资下商业银行的存贷汇模式，理解混业趋势下二者边界的模糊。重点把握直接融资与间接融资的区分、投行的金融功能观（降低信息不对称、提供流动性、分散与管理风险）。",
            "keydata": [
                  {
                        "k": "2024 年债券市场各类债券发行量",
                        "v": "合计 79.62 万亿元，同比增长 12.4%",
                        "s": "交易商协会《中国债券市场发展报告(2024)》[S2]"
                  },
                  {
                        "k": "2024 年末债券市场存量",
                        "v": "177.0 万亿元，同比增长 12.1%",
                        "s": "中国人民银行 2024 年金融市场运行情况 [S1]"
                  },
                  {
                        "k": "2024 年 A 股股票融资总额",
                        "v": "2,880.72 亿元，较上年下降逾七成",
                        "s": "Wind，经搜狐财经 2025-01 引述 [S5]"
                  },
                  {
                        "k": "2024 年境外机构持债规模",
                        "v": "托管余额 4.20 万亿元，占中国债券市场 2.4%",
                        "s": "中国人民银行，同上 [S1]"
                  }
            ],
            "concepts": [
                  {
                        "t": "投资银行",
                        "d": "资本市场上的金融中介，主要功能是在直接融资中连接资金供需双方，提供证券承销、并购顾问、经纪与交易、资产管理等服务。"
                  },
                  {
                        "t": "直接融资 vs 间接融资",
                        "d": "直接融资由融资方发行证券向投资者筹资、投行居间；间接融资通过银行存贷款、商业银行居间。投行是直接融资体系的核心中介。"
                  },
                  {
                        "t": "与商业银行的区别",
                        "d": "商业银行经营存贷汇、受存款准备金与审慎监管约束、表内风险为主；投行以服务费收入为主、表外业务居多、风险偏好更高。混业趋势下边界趋于模糊。"
                  },
                  {
                        "t": "主要业务板块",
                        "d": "证券承销（underwriting）、并购重组顾问、证券经纪与交易、自营投资、资产管理与财富管理、研究。"
                  },
                  {
                        "t": "金融功能观",
                        "d": "从 Merton & Bodie 的金融功能视角看，投行通过专业分工降低信息不对称、提供流动性、分散与管理风险、降低交易成本。"
                  }
            ],
            "reading": [
                  {
                        "t": "Merton & Bodie《金融学》教科书体系（功能观与中介理论）",
                        "u": "https://www.mheducation.com/highered/product/finance-merton-bodie.html"
                  },
                  {
                        "t": "中国人民银行 · 金融市场运行情况（月度统计）",
                        "u": "http://www.pbc.gov.cn/"
                  }
            ]
      },
      "第2章": {
            "framework": [
                  {
                        "t": "第一步：算缺多少",
                        "d": "销售百分比法 / 回归分析法 → 外部融资需求 EFN"
                  },
                  {
                        "t": "第二步：股权还是债权",
                        "d": "控制权稀释 vs 税盾与财务风险"
                  },
                  {
                        "t": "第三步：算成本",
                        "d": "WACC = 税后债权成本 × D/(D+E) + 股权成本 × E/(D+E)"
                  },
                  {
                        "t": "第四步：定方案",
                        "d": "优序融资理论 + 行业与阶段特征 → 工具组合"
                  }
            ],
            "review": "本章围绕企业「融什么、融多少、怎么融」展开：先用销售百分比法 / 回归分析法预测外部融资需求（EFN），再在股权融资与债权融资之间权衡——前者无到期日但稀释控制权，后者有税盾却放大财务风险；结合优序融资理论与 WACC，给出融资方案取舍的分析框架。",
            "keydata": [
                  {
                        "k": "2024 年社会融资规模增量",
                        "v": "32.26 万亿元，比上年少 3.32 万亿元",
                        "s": "中国人民银行 2025-01-14 发布 [S11]"
                  },
                  {
                        "k": "2024 年企业债券净融资",
                        "v": "1.91 万亿元，同比多增 2,839 亿元",
                        "s": "中国人民银行，同上 [S11]"
                  },
                  {
                        "k": "2024 年非金融企业境内股票融资",
                        "v": "2,900 亿元，同比少增 5,031 亿元",
                        "s": "中国人民银行，同上 [S11]"
                  },
                  {
                        "k": "2024 年对实体经济人民币贷款增加",
                        "v": "17.05 万亿元，同比少增 5.17 万亿元",
                        "s": "中国人民银行，同上 [S11]"
                  },
                  {
                        "k": "2024 年末社融存量结构",
                        "v": "存量 408.34 万亿元；人民币贷款占 61.8%、政府债券 19.9%、企业债券 7.9%、境内股票 2.9%",
                        "s": "中国人民银行，同上 [S11]"
                  },
                  {
                        "k": "2024 年 A 股股权融资（交易所口径）",
                        "v": "IPO 673.53 亿元 + 定增 1,706.52 亿元，定增占股票融资超七成",
                        "s": "Wind，经 21 世纪经济报道 2025-01 引述 [S5]"
                  }
            ],
            "concepts": [
                  {
                        "t": "融资需求预测",
                        "d": "销售百分比法（假设资产负债项目随销售额同比例变动，推算外部融资需求 EFN）、回归分析法（以历史销售与资金占用拟合）。"
                  },
                  {
                        "t": "股权融资 vs 债权融资",
                        "d": "股权无到期日、不付固定息，但稀释控制权；债权有税盾（利息税前扣除）、放大 ROE，但增加财务风险与破产成本。"
                  },
                  {
                        "t": "优序融资理论",
                        "d": "Pecking Order：企业融资偏好依次为内部留存 → 债权 → 股权，因信息不对称使外部股权融资成本最高。"
                  },
                  {
                        "t": "资本成本 WACC",
                        "d": "债权成本（税后）与股权成本（如 CAPM）加权求得，是融资方案取舍的基准折现率。"
                  },
                  {
                        "t": "融资方式选择",
                        "d": "需在控制权、财务弹性、税盾与财务风险之间权衡，并结合行业特征与发展阶段。"
                  }
            ],
            "reading": [
                  {
                        "t": "Damodaran《投资估值》——融资与资本结构章节",
                        "u": "https://pages.stern.nyu.edu/~adamodar/"
                  },
                  {
                        "t": "国家企业信用信息公示系统（查询融资主体公开信息）",
                        "u": "https://www.gsxt.gov.cn/"
                  }
            ]
      },
      "第3章": {
            "framework": [
                  {
                        "t": "主体：股份公司",
                        "d": "有限公司 → 股份公司的设立条件与股东责任"
                  },
                  {
                        "t": "公开发行",
                        "d": "IPO 条件、审核流程、招股与承销安排"
                  },
                  {
                        "t": "定价",
                        "d": "市盈率法 / DCF / 询价（网下+网上）"
                  },
                  {
                        "t": "承销方式",
                        "d": "包销 vs 代销，绿鞋与超额配售选择权"
                  },
                  {
                        "t": "特殊路径",
                        "d": "借壳上市与注册制下的快速通道"
                  }
            ],
            "review": "本章围绕「企业如何从有限公司走到公众公司」展开：先说明股份有限公司的设立要件与有限责任的边界，再按时间轴拆解 IPO 全流程——从改制设立、辅导备案、受理审核、注册生效到发行上市；重点解释发行定价的主流方法（市盈率法、现金流折现、询价发行）与承销机制（余额包销、超额配售选择权即绿鞋），并对比不同板块的发行条件差异；最后说明借壳上市在注册制背景下的适用边界与监管态度。",
            "concepts": [
                  {
                        "t": "股份有限公司设立",
                        "d": "注册资本由全体股东认缴、以元为单位；股东以其认缴的股份为限对公司承担责任；实行章程约束、股东会/董事会/监事会或审计委员会的公司治理结构。IPO 前须完成股份制改造，并具备清晰无重大瑕疵的股权历史。"
                  },
                  {
                        "t": "IPO 审核流程",
                        "d": "改制设立 → 券商辅导并备案 → 交易所受理 → 上市委/审核中心审核问询 → 证监会注册 → 发行上市。注册制下审核重点是「信息披露充分性与投资者决策依赖性」，注册环节已由实质审核转为形式审核。"
                  },
                  {
                        "t": "市盈率法（PE 法）",
                        "d": "发行价 = 每股净利润 × 发行市盈率。PE 法的关键是同业可比公司的选择：A股实践中常取「中证指数发布的同行业最近一个月静态平均市盈率」作为定价参照，据此计算出的 PE 常显著低于二级市场同行业水平，这正是近年新股定价收敛的机制之一。"
                  },
                  {
                        "t": "现金流折现法（DCF）",
                        "d": "通过预测企业未来自由现金流、设定折现率（WACC）得到企业价值，再扣除净债务得到股权价值、折算到每股。理论上更严谨，但对增长率、永续增长率与折现率假设高度敏感，实务中常作为定价参考而非唯一依据。"
                  },
                  {
                        "t": "询价发行",
                        "d": "网下询价（向符合资格的机构投资者报价，按「价格优先、时间优先」确定发行价与配售对象）与网上定价相结合。2024 年 3 月证监会发布《关于严把发行上市准入关从源头上提高上市公司质量的意见（试行）》，提出从严监管高定价超募。"
                  },
                  {
                        "t": "包销与代销",
                        "d": "包销商按约定价格买入再转售，承担价格下行风险（余额包销），是承销的核心风险来源；代销仅按发行价代为销售、赚取手续费，不承担库存风险。承销协议常附「超额配售选择权」（绿鞋），允许承销商在一定期限内按约定价格增发以稳定股价。"
                  },
                  {
                        "t": "借壳上市",
                        "d": "通过收购已上市壳公司控股权并注入资产实现间接上市。构成「重大资产重组」并触及借壳标准的交易，审核标准等同 IPO。2024 年 A 股仅有 2 家首次披露借壳交易，且均属同一国资体系内整合，第三方市场化借壳连续两年无一落地，壳价值已被持续压缩。"
                  }
            ],
            "keydata": [
                  {
                        "k": "2024 年 A 股 IPO 数量与募资",
                        "v": "100 家 / 673.53 亿元，同比分别下降约 76% 与 81%",
                        "s": "Wind，经 21 世纪经济报道 2025-01 引述 [S5]"
                  },
                  {
                        "k": "2024 年 IPO 平均发行市盈率",
                        "v": "21.90 倍（2023 年为 41.16 倍，同比降 46.79%）",
                        "s": "Wind，同上 [S5]"
                  },
                  {
                        "k": "2024 年 IPO 平均发行总费用（分板块）",
                        "v": "科创板 9,012.37 万元、沪深主板 8,221.55 万元、创业板 7,468.77 万元、北交所 2,510.86 万元",
                        "s": "Wind，经汉鼎咨询整理 [S5]"
                  },
                  {
                        "k": "2024 年 IPO 平均发行费率",
                        "v": "创业板 12.57%、北交所 12.33% 偏高，沪深主板 7.92% 最低（费率与募资规模负相关）",
                        "s": "Wind，同上 [S5]"
                  },
                  {
                        "k": "2024 年承销保荐费均值（最高板块）",
                        "v": "科创板 6,493.34 万元，费率 6.43%",
                        "s": "Wind，同上 [S5]"
                  },
                  {
                        "k": "2024 年新股定价纪律变化",
                        "v": "仅 14 只新股实现超募；75 只新股实际募资额低于原计划",
                        "s": "腾讯证券网 2024-12-31 引 Wind [S5]"
                  }
            ],
            "reading": [
                  {
                        "t": "中国证监会 · 首次公开发行股票并上市管理办法",
                        "u": "https://www.csrc.gov.cn/"
                  },
                  {
                        "t": "上海证券交易所 / 深圳证券交易所 · 上市规则与审核业务指引",
                        "u": "https://www.sse.com.cn/ ; https://www.szse.cn/"
                  },
                  {
                        "t": "巨潮资讯网（IPO 招股意向书与上市公告书原文）",
                        "u": "http://www.cninfo.com.cn/"
                  }
            ]
      },
      "第4章": {
            "framework": [
                  {
                        "t": "股权类",
                        "d": "增发（公开/非公开）、配股、优先股"
                  },
                  {
                        "t": "半股权类",
                        "d": "可转债、转股/定向可转债"
                  },
                  {
                        "t": "外源型",
                        "d": "可交换债（EB）"
                  },
                  {
                        "t": "定价核心",
                        "d": "纯债价值 + 转股期权价值 + 下修/回售条款"
                  },
                  {
                        "t": "承销风险",
                        "d": "包销余额、发行失败与条款博弈"
                  }
            ],
            "review": "本章聚焦已上市公司如何\"再融资\"。按工具属性可分三层：一是增发、配股等纯股权工具，稀释但不付息；二是优先股与可转换公司债券，兼具固定收益与股权选择权；三是可交换公司债券（EB），由股东以其持有的股票作为标的发行。分析主线是每种工具的融资成本、稀释程度、期限与回售/赎回条款的博弈，并讨论承销商的包销余额风险与发行失败处置。",
            "concepts": [
                  {
                        "t": "增发（公开/非公开）",
                        "d": "向不特定对象（公开增发）或特定对象（非公开 / 定向增发）发行新股。定增是 A 股股权融资的主力，2024 年定增融资 1,706.52 亿元，占 A 股股票融资总额超七成，融资前三名为中国核电 140 亿元、中国石化 120 亿元、昊华科技 72.44 亿元。"
                  },
                  {
                        "t": "配股",
                        "d": "向原股东按其持股比例配售新股，优点是发行阻力小、可增厚每股净资产，缺点是原股东若不参与其持股比例被稀释。实务中常与大股东承诺认购、战略投资者引入捆绑使用。"
                  },
                  {
                        "t": "优先股",
                        "d": "在利润分配和清算顺序上优先于普通股，但不参与经营决策。A 股优先股多用于上市公司纾困、并购支付工具与非公开发行中的特别条款设计，发行规模相对较小。"
                  },
                  {
                        "t": "可转换公司债券",
                        "d": "持有人可在约定期限内按约定价格将债券转为公司股票。定价本质是「纯债价值 + 转股期权」。下有债底保护、上有股性弹性，故称「进可攻退可守」。业绩承诺、下修条款、赎回与回售条款共同决定了博弈格局。"
                  },
                  {
                        "t": "可交换公司债券（EB）",
                        "d": "由上市公司股东以其持有的股票为标的发行债券，募集资金归股东所有，债券持有人可在换股期将债券换为该股东所持股票。与可转债的关键差异是**换股标的不是新发股票而是存量股**，因而不增加公司股本、不摊薄原股东权益。"
                  },
                  {
                        "t": "可转债的股性指标：转股溢价率",
                        "d": "转股溢价率 =（可转债价格 − 转股价值）÷ 转股价值；转股价值 = 正股价格 ÷ 转价格 × 100。该指标越低则股性越强。经验区间：−5%~10% 联动性强，10%~30% 需关注基本面，>30% 溢价偏高风险较大。"
                  },
                  {
                        "t": "下修条款与信用风险",
                        "d": "当正股在约定期限内持续低于转股价一定比例时，发行人须下调转股价以提升转股可能性，是保护转债持有人的核心条款。与此同时，评级下调与正股退市会使债底失效——2023 年 5 月搜特转债发生实质性违约，打破「下有保底」预期。"
                  }
            ],
            "keydata": [
                  {
                        "k": "2024 年 A 股股票融资总额",
                        "v": "2,880.72 亿元，较上年下降逾七成",
                        "s": "Wind，经搜狐财经 2025-01 引述 [S5]"
                  },
                  {
                        "k": "2024 年定向增发规模",
                        "v": "143 家 / 1,706.52 亿元，同比下降 56.80% / 70.52%，占股票融资超七成",
                        "s": "Wind，同上 [S5]"
                  },
                  {
                        "k": "2024 年可转债发行规模",
                        "v": "约 383.74 亿元，较 2023 年明显缩量",
                        "s": "华西证券转债周报，2024-12-27 [S8]"
                  },
                  {
                        "k": "可转债市场存量与破面值数（2024-08-02）",
                        "v": "余额 7,891 亿元（占债券市场不足 0.5%）；112 只跌破面值、占比 20.93%，创历史新高",
                        "s": "证券时报·数据宝 2024-08-07 [S8]"
                  },
                  {
                        "k": "可转债转股溢价率（2024-08-02）",
                        "v": "均值 69.91%，创近 16 年新高；101 只溢价率逾 100%",
                        "s": "证券时报·数据宝，同上 [S8]"
                  },
                  {
                        "k": "2024 年可转债下修与评级下调",
                        "v": "年内发布向下修正转股价公告 151 次，创历史新高；评级下调公告 54 次，亦创历史新高",
                        "s": "证券时报·数据宝，同上 [S8]"
                  },
                  {
                        "k": "2023 年信用事件",
                        "v": "2023-05 搜特转债因流动性不足无法兑付回售本息，发生首只实质性违约可转债",
                        "s": "证券时报·数据宝，同上 [S8]"
                  }
            ],
            "reading": [
                  {
                        "t": "中国证监会 · 上市公司证券发行注册管理办法",
                        "u": "https://www.csrc.gov.cn/"
                  },
                  {
                        "t": "上海证券交易所 · 可转换公司债券业务实施细则",
                        "u": "https://www.sse.com.cn/"
                  },
                  {
                        "t": "中国债券信息网（可转债发行与条款披露）",
                        "u": "https://www.chinabond.com.cn/"
                  }
            ]
      },
      "第5章": {
            "framework": [
                  {
                        "t": "债券是什么",
                        "d": "面值、票面利率、期限、还本付息方式、税收处理"
                  },
                  {
                        "t": "发行利率怎么定",
                        "d": "基准利率 + 信用利差 + 期限溢价 + 供求调整"
                  },
                  {
                        "t": "品种分轨",
                        "d": "利率债（国债/政金债）vs 信用债（金融债/企业债/公司债）"
                  },
                  {
                        "t": "承销机制",
                        "d": "簿记建档（荷兰式/美式/混合式招标）、承销团、包销"
                  },
                  {
                        "t": "风险识别",
                        "d": "信用评级、违约案例（超日、永煤）"
                  }
            ],
            "review": "本章从债券的基本要素出发，依次梳理利率债（国债、地方政府债、政策性金融债）与信用类债券（金融债、企业债、公司信用类债券、非金融企业债务融资工具）的发行机制差异；重点解释票面利率的确定逻辑——在无风险利率基础上叠加信用利差与期限溢价，并受发行方式、供求与政策利率影响；介绍信用评级的符号体系（AAA/AA+/AA 及以上、AA−、A 及以下）与投资者适当性管理；最后结合超日债、永煤事件说明信用风险与评级虚高的教训。",
            "concepts": [
                  {
                        "t": "债券的基本要素",
                        "d": "面值（平价/溢价/折价发行）、票面利率、付息频率（一年期为主）、期限、含权条款（回售、赎回、调整票面利率）、信用评级。价格与利率反向变动，这是债券定价的基本机制。"
                  },
                  {
                        "t": "债券发行方式",
                        "d": "招标方式分荷兰式（uniform price，全场统一中标价）、美国式（single price，按各自报价配售）与混合式；簿记建档为我国信用债主流方式，由承销商收集需求形成边际认购利率曲线确定票面利率。"
                  },
                  {
                        "t": "票面利率的确定",
                        "d": "市场公认做法是「无风险利率 + 信用利差 + 期限溢价 + 供求调整」。无风险利率通常锚定同期限国债到期收益率；信用利差反映违约风险与流动性，评级越低、流动性越差，利差越大。2024 年受无风险利率下行与\"资产荒\"影响，信用债收益率整体下行 81–117BP。"
                  },
                  {
                        "t": "信用评级",
                        "d": "由评级机构对债务人偿债能力与违约可能性作出的独立判断，分主体评级与债项评级。我国符号体系为 AAA、AA+、AA、AA−、A+、A、A− 及以下等，不同市场对评级的使用限制不同（如交易所市场对债项评级有最低要求）。评级是利差定价的重要输入，但不是违约的绝对防线——超日与永煤均发生在债项评级为 AA+ 的主体上。"
                  },
                  {
                        "t": "超日债事件（2013）",
                        "d": "科林转债因无法兑付利息成为中国首例公司债违约，打破刚性兑付预期；后续裁判与监管安排推动了债券违约处置市场化（后续受托管理、担保代偿与破产重整等机制）。"
                  },
                  {
                        "t": "永煤事件（2020）",
                        "d": "永煤控股 10 亿元超短融违约，主体评级由 AAA 迅速下调，评级虚高与评级调整滞后问题集中暴露，债券市场信用分层显著加剧，并推动评级行业监管与信息披露制度改革。"
                  },
                  {
                        "t": "承销团与承销费",
                        "d": "大型债券发行通常由主承销商牵头组成承销团分担认购与销售责任，承销费按发行规模的一定比例（通常为千分之几量级）支付。承销商承担包销风险，需评估发行人偿债能力与市场承接能力。"
                  }
            ],
            "keydata": [
                  {
                        "k": "2024 年债券市场各类债券发行量",
                        "v": "合计 79.62 万亿元，同比增长 12.4%（交易商协会口径）",
                        "s": "交易商协会《中国债券市场发展报告(2024)》[S2]"
                  },
                  {
                        "k": "2024 年主要券种发行量",
                        "v": "政府债券 22.25 万亿元、金融债券 42.42 万亿元、公司信用类债券 14.77 万亿元",
                        "s": "交易商协会，同上 [S2]"
                  },
                  {
                        "k": "2024 年国债发行量（央行口径）",
                        "v": "国债 12.4 万亿元、地方政府债 9.8 万亿元、同业存单 31.5 万亿元",
                        "s": "中国人民银行 2024 年金融市场运行情况 [S1]"
                  },
                  {
                        "k": "2024 年末债券市场存量",
                        "v": "177.0 万亿元，同比增长 12.1%",
                        "s": "中国人民银行，同上 [S1]"
                  },
                  {
                        "k": "2024 年末国债收益率曲线",
                        "v": "1 年 1.08%、3 年 1.19%、5 年 1.42%、7 年 1.59%、10 年 1.68%",
                        "s": "中国人民银行，同上 [S1]"
                  },
                  {
                        "k": "2024 年信用债收益率变化",
                        "v": "1 年期 AAA 中票 1.68%、AA 中票 1.87%；5 年期 AAA 1.87%、AA 2.29%；全年收益率整体下行 81–117BP",
                        "s": "交易商协会报告 + 华创固收 [S2]"
                  },
                  {
                        "k": "2024 年境外机构持债规模",
                        "v": "托管余额 4.20 万亿元，占全市场 2.4%",
                        "s": "中国人民银行，同上 [S1]"
                  }
            ],
            "reading": [
                  {
                        "t": "中国人民银行 · 金融市场运行情况（月度）",
                        "u": "http://www.pbc.gov.cn/"
                  },
                  {
                        "t": "中国债券信息网（中国债券市场年度报告全文）",
                        "u": "https://www.chinabond.com.cn/"
                  },
                  {
                        "t": "中国证券业协会 · 证券承销业务执业规范",
                        "u": "https://www.sac.net.cn/"
                  }
            ]
      },
      "第6章": {
            "framework": [
                  {
                        "t": "本质",
                        "d": "把缺乏流动性的资产变成可交易的证券，实现风险转移"
                  },
                  {
                        "t": "三方结构",
                        "d": "原始权益人 / 发起人（出售资产） / 受托机构（SPV） / 投资者"
                  },
                  {
                        "t": "信用增级",
                        "d": "优先/次级分层、差额支付、超额抵押、担保、流动性支持"
                  },
                  {
                        "t": "核心风险",
                        "d": "基础资产池质量、现金流归集、SPV 破产隔离、早期清偿"
                  },
                  {
                        "t": "中国实践",
                        "d": "信贷 ABS、企业 ABS、ABN、类 REITs、公募 REITs 分轨"
                  }
            ],
            "review": "本章讲解资产证券化的基本逻辑：融资方将缺乏流动性但能产生稳定现金流的资产（信贷、应收账款、租赁债权等）打包转让给特殊目的载体（SPV），SPV 以该资产池为信用基础向投资者发行证券，融资方由此获得表内资金流出。本章重点是证券化的三大风险缓释机制——信用增级与分层结构、SPV 的破产隔离、法律上的\"真实销售\"；并结合中国 2024 年市场数据说明发行利率分层（优先档显著低于次级档）的定价含义。",
            "concepts": [
                  {
                        "t": "资产证券化的基本结构",
                        "d": "原始权益人将资产转让给 SPV（特殊目的载体）→ SPV 以资产池为信用基础发行证券 → 投资者认购 → 现金流通过服务归集账户转付。核心是\"信用重构\"：用市场对高等级证券的接受度，把原本非标的资产转换为可交易、可融资的证券。"
                  },
                  {
                        "t": "SPV 与破产隔离（真实销售）",
                        "d": "SPV 在法律上须与发起人实现破产隔离，资产转让须构成\"真实销售\"而非担保安排，否则无法切断追索。破产隔离的实现程度直接决定投资者是否真正承担资产风险而非主体风险。"
                  },
                  {
                        "t": "信用增级",
                        "d": "内含增级：优先/次级分层（次级先吸收损失）、超额抵押、现金储备、差额支付、账户划转；外部增级：第三方担保、差额补足、流动性支持、保险。分层是最常用且最有效的手段，本质是用\"结构化定价\"替代\"主体评级\"。"
                  },
                  {
                        "t": "ABS 的证券分层与定价",
                        "d": "优先 A 档信用风险最低、利率最低，优先 B 档风险与利率居中，次级档吸收大部分损失、利率最高。2024 年信贷 ABS 优先 A 档平均发行利率 2.24%、优先 B 档 2.48%；企业 ABS 优先 A 档 2.60%、优先 B 档 3.21%（B 档利率区间上至 12.00%，显示个别品种风险极高）。这种\"同池不同价\"正是证券化的定价核心。"
                  },
                  {
                        "t": "中国 ABS 的市场分层",
                        "d": "按发行主体与交易市场分为信贷 ABS（银行发起，银行间/交易所）、企业 ABS（非金融企业，交易所为主）、非金融企业资产支持票据 ABN（银行间，由交易商协会自律管理）、类 REITs（以租金收入为基础的权益型）与公募 REITs（基础设施领域权益型、标准化程度最高）。"
                  },
                  {
                        "t": "REITs 与类 REITs",
                        "d": "公募 REITs 于 2021 年首批发行，采用\"权益+公募基金+ABS\"结构，以基础设施项目租金现金流分派给投资者，2024 年 7 月国家发改委发文推动常态化发行。类 REITs 则为债权型ABS 中的权益化品种，非公募基金产品但同样以租金收益为主要来源。"
                  },
                  {
                        "t": "主要风险点",
                        "d": "基础资产池的集中度与真实质量、现金流归集与\"混同\"风险（资金被挪用）、SPV 治理与中介机构职责、提前清偿风险（借款人提前还贷导致现金流中断）、二级市场流动性显著弱于债券（2024 年信贷 ABS 现券换手率仅 14.50%）。"
                  }
            ],
            "keydata": [
                  {
                        "k": "2024 年 ABS 发行与存量",
                        "v": "发行 19,768.32 亿元（同比 +6.97%），年末存量 38,198.4 亿元（同比 −12.22%）",
                        "s": "中债研发中心《2024年资产证券化发展报告》[S3]"
                  },
                  {
                        "k": "2024 年 ABS 分类型发行",
                        "v": "信贷 ABS 2,703.79 亿元（−22.42%）、企业 ABS 11,824.56 亿元（+0.34%）、ABN 5,239.97 亿元（+63.13%）",
                        "s": "中债研发中心，同上 [S3]"
                  },
                  {
                        "k": "2024 年信贷 ABS 主力品种",
                        "v": "个人汽车抵押贷款 ABS 1,296.68 亿元，占信贷 ABS 的 47.96%，连续三年为最大品种",
                        "s": "中债研发中心，同上 [S3]"
                  },
                  {
                        "k": "2024 年企业 ABS 主力品种",
                        "v": "融资租赁债权 ABS 2,486.85 亿元、应收账款 ABS 2,178.52 亿元、一般小额贷款债权 ABS 1,781.93 亿元",
                        "s": "中债研发中心，同上 [S3]"
                  },
                  {
                        "k": "2024 年优先档平均发行利率",
                        "v": "信贷 ABS 优先 A 档 2.24%、优先 B 档 2.48%；企业 ABS 优先 A 档 2.60%、优先 B 档 3.21%",
                        "s": "中债研发中心，同上 [S3]"
                  },
                  {
                        "k": "2024 年 ABS 指数回报",
                        "v": "中债-资产支持证券指数全年回报约 3.67%；RMBS 指数回报 2.89%",
                        "s": "中债研发中心，同上 [S3]"
                  },
                  {
                        "k": "2024 年 ABS 流动性",
                        "v": "信贷 ABS 现券结算量 1,640 亿元（−176.28%），换手率 14.50%（−76.76%）",
                        "s": "中债研发中心，同上 [S3]"
                  },
                  {
                        "k": "2024 年不良 ABS",
                        "v": "发行 508.67 亿元（+9.15%），占信贷 ABS 的 18.81%",
                        "s": "中债研发中心，同上 [S3]"
                  }
            ],
            "reading": [
                  {
                        "t": "中债研发中心 · 资产证券化发展报告（年度全文）",
                        "u": "https://www.chinabond.com.cn/"
                  },
                  {
                        "t": "中国证券投资基金业协会 · 资产证券化业务基础资产负面清单指引",
                        "u": "https://www.amac.org.cn/"
                  },
                  {
                        "t": "国家发展改革委 · 基础设施 REITs 常态化发行通知（2024-07）",
                        "u": "https://www.ndrc.gov.cn/"
                  }
            ]
      },
      "第7章": {
            "framework": [
                  {
                        "t": "为什么并购",
                        "d": "产业协同 / 规模经济 / 财务动因（估值套利）/ 转型 / 消灭竞争"
                  },
                  {
                        "t": "怎么做",
                        "d": "尽职调查 → 估值 → 方案设计 → 谈判签约 → 审批交割 → 整合"
                  },
                  {
                        "t": "付什么",
                        "d": "现金、股份、资产置换、混合支付、可转债"
                  },
                  {
                        "t": "怎么防",
                        "d": "毒丸、白衣骑士、金降落伞、焦土、回购、要约收购防线"
                  },
                  {
                        "t": "怎么掏钱",
                        "d": "LBO：自有资金 + 债务融资 + 股权 + 退出"
                  }
            ],
            "review": "本章是全书综合度最高的一章。从并购动因（产业协同、规模经济、财务动因、战略转型）出发，梳理并购的一般操作程序：尽职调查、估值（相对估值与 DCF）、交易方案设计、谈判与签约、监管审批、交割与整合；按支付方式区分现金支付、股份支付、资产置换与可转债支付；比较协议收购与要约收购两条路径的适用情形与法定要求；重点讲解杠杆收购（LBO）的资本结构与现金流分配逻辑，以及反收购策略（毒丸计划、白衣骑士、金降落伞、焦土战术）的法律边界与监管态度。",
            "concepts": [
                  {
                        "t": "并购的类型",
                        "d": "按方向分横向（同行业扩大规模）、纵向（上下游一体化）、混合（跨行业多元化）；按形式分兼并（目标解散）、合并（新设主体）、收购（取得控股权）；按是否友好分善意并购与敌意并购；按是否跨越 IPO 审核门槛分产业并购与借壳上市。"
                  },
                  {
                        "t": "并购动因",
                        "d": "①产业协同（成本节约、交叉销售、范围经济）；②规模经济（摊薄固定成本、议价能力）；③财务动因（利用被并购方低估的资产与估值倍数套利，常表现为\"赚取 EPS 增厚\"）；④战略转型（进入新赛道）；⑤消灭竞争、减少信息不对称。财务动因驱动的并购在实践中失败率最高，因其不产生真实的经营协同。"
                  },
                  {
                        "t": "一般操作程序",
                        "d": "①尽职调查（DD：法律、财务、税务、业务、合规）；②估值与定价（相对估值 PE/PB/EV-EBITDA、可比交易、DCF）；③交易方案设计（支付方式、业绩承诺与对赌、锁定期、董事会安排）；④谈判与签署协议（含分手费、重大不利变化条款 MAC）；⑤监管审批（经营者集中申报、外资安全审查、交易所与证监会审核）；⑥交割与整合（100 天整合计划是关键）。"
                  },
                  {
                        "t": "支付方式",
                        "d": "现金支付（价税清晰、摊薄小但消耗现金与杠杆）；股份支付（不消耗现金、摊薄 EPS、反映股价并可规避现金不足）；资产置换（产业协同性强）；可转债/定向可转债（降低即时摊薄、引入转股不确定性）。支付方式的选择本质是\"现金流约束 vs 控制权稀释\"的权衡。"
                  },
                  {
                        "t": "协议收购 vs 要约收购",
                        "d": "协议收购是收购人与特定股东就转让价格与数量直接谈判，程序简单但只能取得部分股权；达到法定持股比例后继续增持、或谋求控制权而未依法披露要约的，可能触发全面要约义务或构成违规。要约收购是向全体股东发出的收购要约，需遵循《证券法》与《收购管理办法》的条件、期限与豁免规则。"
                  },
                  {
                        "t": "杠杆收购 LBO",
                        "d": "收购方以少量自有资金（Equity）作为杠杆支点，注入高比例债务（Debt）完成收购，依赖目标公司或交易载体的现金流付息并偿还债务、积累权益后退出（IPO、再出售或分红退出）。核心风险是现金流覆盖：利率上行或盈利下滑会迅速侵蚀偿债能力（LBO 现金流对利率高度敏感）。"
                  },
                  {
                        "t": "反收购策略",
                        "d": "事前防御：毒丸计划（股权分派计划，反稀释）、白衣骑士（引入友好第三方竞价）、金降落伞（对高管变更的补偿安排）、焦土战术（出售优质资产降低吸引力）、帕克曼战略（回购并注销自身股票减少流通股）、虚胖战术（增发稀释）。这些手段均受证券法与公司章程约束，必须在保护股东与维护市场秩序之间划界。\"毒丸\"应结合我国《证券法》与交易所规则理解，不可简单照搬美国实践。"
                  },
                  {
                        "t": "\"并购六条\"与监管导向",
                        "d": "2024 年 9 月证监会发布《关于深化上市公司并购重组市场改革的意见》，鼓励上市公司聚焦主业、加大产业整合支持力度、适度开展跨界并购以服务新质生产力，同时提高审核包容度与支付灵活性、强化主业相关性与资产质量把关。同期\"国九条\"明确削减壳资源价值、严把注入资产质量关。政策导向使 A 股并购从\"审慎从严\"转向\"适度活跃但强监管\"。"
                  }
            ],
            "keydata": [
                  {
                        "k": "2024 年 A 股并购交易总量",
                        "v": "5,774 起（同比 −8.71%），披露交易金额 2.35 万亿元，与 2023 年基本持平",
                        "s": "联储证券《A股年度并购报告》2025-03 [S6]"
                  },
                  {
                        "k": "2024 年重大资产收购",
                        "v": "95 起，其中披露金额 32 起、合计 2,617.06 亿元，同比增长约 135%",
                        "s": "联储证券，同上 [S6]"
                  },
                  {
                        "k": "2024 年并购重组委审核量",
                        "v": "仅 15 起，同比下滑 42.31%，为近 10 年最低；通过率 93.33%",
                        "s": "联储证券，同上 [S6]"
                  },
                  {
                        "k": "2024 年并购政策后活跃度变化",
                        "v": "2024-09-25 至年末并购交易 2,044 起（占全年 35.4%）；披露重组预案 60 起，占全年同口径 121 起的近一半",
                        "s": "联储证券，同上 [S6]"
                  },
                  {
                        "k": "2024 年产业并购占比",
                        "v": "政策后披露预案的 60 起中 44 起为产业并购，占 73.33%",
                        "s": "联储证券，同上 [S6]"
                  },
                  {
                        "k": "2024 年借壳上市",
                        "v": "仅 2 家首次披露，均属同一国资体系内整合；2022–2023 年 6 起市场化借壳仅 1 起落地",
                        "s": "联储证券，同上 [S6]"
                  },
                  {
                        "k": "2024 年\"A 吃 A\"与最大交易",
                        "v": "\"A 吃 A\"披露 8 起（2023 年 2 起）；中国船舶吸收合并中国重工 1,151.5 亿元为最大交易",
                        "s": "联储证券，同上 [S6]"
                  },
                  {
                        "k": "2024 年披露预案/草案口径（另一口径）",
                        "v": "135 单、交易金额约 4,693.10 亿元（2023 年为 134 单、约 2,180 亿元）",
                        "s": "同花顺，经鄞州区金融发展服务中心答复引述 [S7]"
                  },
                  {
                        "k": "2024 年监管口径（证监会）",
                        "v": "沪深两市上市公司共披露并购重组交易 3,623 单、交易金额 13,682.11 亿元",
                        "s": "中国证监会 2024 年年报 [S4]"
                  }
            ],
            "reading": [
                  {
                        "t": "中国证监会《关于深化上市公司并购重组市场改革的意见》（并购六条）",
                        "u": "https://www.csrc.gov.cn/"
                  },
                  {
                        "t": "国务院《关于加强监管防范风险推动资本市场高质量发展的若干意见》（国九条）",
                        "u": "https://www.gov.cn/"
                  },
                  {
                        "t": "上海证券交易所 · 上市公司重大资产重组审核规则",
                        "u": "https://www.sse.com.cn/"
                  },
                  {
                        "t": "国家企业信用信息公示系统（并购主体尽调与工商核验）",
                        "u": "https://www.gsxt.gov.cn/"
                  }
            ]
      }
};
      const BOOK = { name: '投资银行学：理论与案例（第 4 版）', author: '马晓军', isbn: '978-7-111-76189-1', pub: '机械工业出版社', year: '2024' };
      // ===== v55 版权整改 =====
      // 原 v54 把 398 页教材扫描全文提交进公开 GitHub 仓库并经 GitHub Pages 对外提供，
      // 任何人可匿名下载，属于著作权侵权（教学用途不构成豁免）。现已整改：
      //   ① 全部 PDF 一律不随公开站点分发，.gitignore 排除 assets/；
      //   ② 页面只展示书目信息与正版获取渠道，不再提供原书全文链接；
      //   ③ 仅当站点在教师本机/校内服务器打开、且 assets/ 实际存在时，才显示可点击的本地文件入口；
      //   ④ 在线访问时显示"版权受限，仅限校内分发"的明确状态与替代获取途径。
      const ASSETS = 'assets/';
      // isLocal：本地打开（file://）或校内服务器（内网 IP）才允许读本地文件
      var IS_LOCAL_HOST = (function () {
        // v55：可用 ?dist=local / ?dist=online 显式指定分发模式（课堂演示公开态时用）
        var forced = /[?&]dist=(local|online)/.exec(location.search || '');
        if (forced) return forced[1] === 'local';
        var h = location.hostname;
        return location.protocol === 'file:' || h === '' || h === 'localhost' || h === '127.0.0.1'
          || /^192\.168\./.test(h) || /^10\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
      })();
      const PDFS = [
        { file: '投资银行学_理论与案例_第3版.pdf', size: '71 MB', kind: '教材（第 3 版）',
          name: '投资银行学：理论与案例（第 3 版）', by: '马晓军 · 机械工业出版社', pages: 398,
          note: '本课程教材原版，398 页全彩扫描；受著作权保护，不随站点公开分发' },
        { file: '投资银行学重点笔记_1.pdf', size: '3.9 MB', kind: '重点笔记',
          name: '投资银行学重点笔记（1）', by: '', note: '章节要点整理' },
        { file: '投资银行学重点笔记_2.pdf', size: '2.6 MB', kind: '重点笔记',
          name: '投资银行学重点笔记（2）', by: '', note: '章节要点整理' },
        { file: '投资银行学重点笔记_3.pdf', size: '1.8 MB', kind: '重点笔记',
          name: '投资银行学重点笔记（3）', by: '', note: '章节要点整理' },
        { file: '投资银行学知识点.pdf', size: '2.8 MB', kind: '知识点汇总',
          name: '投资银行学知识点', by: '', note: '复习要点速查' },
        { file: '投资银行学名词解释.pdf', size: '3.5 MB', kind: '名词解释',
          name: '投资银行学名词解释（167 条）', by: '', note: '术语速查，已同步至智能答疑知识库' },
        { file: '投资银行学试题及答案.pdf', size: '2.7 MB', kind: '习题',
          name: '投资银行学试题及答案', by: '', note: '配套习题自测' }
      ];
      // 正版 / 合法获取渠道
      function buyChannelsHtml() {
        return '<div class="buy-box"><div class="bb-title">📚 正版与合法获取渠道</div>'
          + '<ol class="buy-list">'
          + '<li><b>课程主教材</b>（' + esc(BOOK.author) + '《' + esc(BOOK.name) + '》，ISBN ' + esc(BOOK.isbn) + '，' + esc(BOOK.pub) + '）：'
          + '出版社官方渠道 / 京东、当当等正规图书电商按 ISBN 检索 / 学校图书馆超星·读秀馆藏检索。</li>'
          + '<li><b>配套资料</b>（重点笔记、知识点、名词解释、习题答案）：由任课教师整理并随课堂发放，'
          + '或存放于校内教学资料目录；本站不提供下载。</li>'
          + '<li><b>需要在线预览教材</b>时：使用出版社电子书平台、学校图书馆电子资源或国家高等教育智慧教育平台检索本书。</li>'
          + '</ol></div>';
      }
      function copyrightNoteHtml() {
        return '<div class="cr-box">⚠ <b>版权与使用声明</b>：本站为课程教学演示站点，所有教材及配套资料均为'
          + '<b>受著作权保护的第三方作品</b>，本站<b>不提供原文下载、不随站点公开分发</b>。'
          + '在线版仅展示书目信息与获取渠道；教师可将已获授权的 PDF 置于站点同目录 <code>assets/</code>，'
          + '此时下条目会变为可点击（仅限本机或校内网络）。案例数据均引自公开监管文书、交易所公告与权威统计口径，'
          + '已在各案例底部标注来源与时点，<b>仅用于教学分析，不构成对任何主体的评价或投资建议</b>。'
          + '<b>本课程主教材为第 4 版（' + esc(BOOK.isbn) + '），'
          + '站内留存的历史扫描件为第 3 版，仅供教师教学参考。</b></div>';
      }
      function pdfListHtml() {
        return '<div class="pdf-list">' + PDFS.map(function (p) {
          var head = '<span class="pi-ico" aria-hidden="true">📕</span>'
            + '<span class="pi-main"><b class="pi-name">' + esc(p.name) + '</b>'
            + '<span class="pi-meta">' + esc(p.kind) + (p.by ? ' · ' + esc(p.by) : '') + (p.pages ? ' · ' + p.pages + ' 页' : '') + ' · ' + esc(p.size) + '</span>'
            + (p.note ? '<span class="pi-note">' + esc(p.note) + '</span>' : '') + '</span>';
          if (IS_LOCAL_HOST) {
            return '<a class="pdf-item" href="' + ASSETS + encodeURIComponent(p.file) + '" target="_blank" rel="noopener noreferrer" data-pdf="' + esc(p.file) + '">'
              + head + '<span class="pi-go" aria-hidden="true">↗</span></a>';
          }
          return '<div class="pdf-item locked" aria-disabled="true">'
            + head + '<span class="pi-lock" title="版权受限，仅限校内或本机分发">🔒 校内</span></div>';
        }).join('') + '</div>'
        + (IS_LOCAL_HOST
          ? '<div class="pdf-tip">当前在<b>本地/校内网络</b>打开，条目指向同目录 <code>assets/</code> 下的授权文件；'
            + '网址结尾加 <code>#页码</code> 可直接分享到指定页（如 <code>…第3版.pdf#101</code>）。'
            + '若链接打不开，请确认 <code>assets</code> 文件夹已随站点一起复制。</div>'
          : '<div class="pdf-tip">当前为<b>在线公开访问</b>，出于著作权保护，教材与配套资料<b>不提供在线全文</b>。'
            + '任课教师可将已获授权的文件放入站点同目录 <code>assets/</code>，本机打开时即可直接阅读。</div>')
        + buyChannelsHtml()
        + copyrightNoteHtml();
      }
      const navEl = document.getElementById('chapter-list');
      const mainEl = document.getElementById('chapter-main');
      const countEl = document.getElementById('cn-count');
      const barEl = document.getElementById('cn-bar-fill');
      const DONE_KEY = 'ibank_chapter_done';
      // ===== 首页四项统计：运行时从真实数据源回填，不硬编码 =====
      // 起因：原「章节知识体系」硬编码 09，而 CHAPTERS 实为 8 章（第0章—第7章），
      // 与用户「其他相关的可能也要改」的要求同源——数字与数据脱节就会失真。
      // 这里三项分别取自 CHAPTERS / .home-card / .case-item，均为页面真实渲染结果，
      // 以后增删章节、模块、案例时首页自动跟随，不会再出现「宣称 N 实际 M」。
      function syncHeroStats() {
        var box = document.querySelector('#p-home .hero2-stats');
        if (!box) return;
        var vals = [String(CHAPTERS.length).padStart(2, '0'),
          String(document.querySelectorAll('#p-home .home-card').length).padStart(2, '0'),
          String(document.querySelectorAll('#p-case .case-item').length || 20),
          '∞'];
        var strongs = box.querySelectorAll('strong');
        for (var i = 0; i < strongs.length && i < vals.length; i++) {
          if (strongs[i].textContent.trim() !== vals[i]) strongs[i].textContent = vals[i];
        }
      }
      function loadDone() { try { return JSON.parse(localStorage.getItem(DONE_KEY) || '{}'); } catch (e) { return {}; } }
      function saveDone(o) { try { localStorage.setItem(DONE_KEY, JSON.stringify(o)); } catch (e) {} }
      let done = loadDone();
      let current = '第0章';
      let curTimer = null;

      function renderNav() {
        let n = 0;
        navEl.innerHTML = CHAPTERS.map(function (c) {
          const isDone = !!done[c.no]; if (isDone) n++;
          return '<button class="chapter-link' + (c.no === current ? ' active' : '') + '" data-no="' + c.no + '">'
            + '<span class="cn-no">' + c.no + '</span>'
            + '<span class="cn-name">' + c.title + '</span>'
            + (isDone ? '<span class="cn-check">✓</span>' : '')
            + '</button>';
        }).join('');
        countEl.textContent = n;
        syncHeroStats();
        barEl.style.width = (n / CHAPTERS.length * 100) + '%';
      }
      function esc(x) { return String(x).replace(/[&<>]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]; }); }
      function casesOfChapter(no) {
        const els = document.querySelectorAll('#p-case .case-item'); const out = [];
        for (let i = 0; i < els.length; i++) {
          const el = els[i];
          if (el.getAttribute('data-chapter') === no) {
            const title = el.querySelector('.case-title'), tag = el.querySelector('.case-tag');
            out.push({ id: el.id, title: title ? title.textContent : '', tag: tag ? tag.textContent : '' });
          }
        }
        return out;
      }

      function renderChapter(no) {
        const c = CHAPTERS.filter(function (x) { return x.no === no; })[0];
        const d = DETAIL[no] || {};
        const isDone = !!done[no];
        const reviewHtml = d.review
          ? '<p class="b-text">' + esc(d.review) + '</p>'
          : '<div class="todo-note">本章「课题知识回顾」尚未整理。可先阅读「本章框架」与「重点 / 难点」，或前往案例库与习题库。</div>';
        const conceptsHtml = (d.concepts && d.concepts.length)
          ? '<ul class="concept-list">' + d.concepts.map(function (x) { return '<li><b>' + esc(x.t) + '</b>' + esc(x.d) + '</li>'; }).join('') + '</ul>'
          : '<div class="todo-note">本章核心概念尚未整理。可先阅读「本章框架」与「重点 / 难点」，或前往案例库与习题库。</div>';
        const fw = d.framework || [];
        const fwHtml = fw.length
          ? '<div class="fw-list">' + fw.map(function (x) {
              return '<div class="fw-item"><b>' + esc(x.t) + '</b><span>' + esc(x.d) + '</span></div>';
            }).join('') + '</div>'
          : '';
        const kd = d.keydata || [];
        const kdHtml = kd.length
          ? '<div class="kd-list">' + kd.map(function (x) {
              return '<div class="kd-row"><span class="kdk">' + esc(x.k) + '</span>'
                + '<span class="kdv">' + esc(x.v) + '</span>'
                + '<span class="kds">来源：' + esc(x.s) + '</span></div>';
            }).join('') + '</div>'
          : '';
        const rd = d.reading || [];
        const rdHtml = rd.length
          ? '<div class="rd-list">' + rd.map(function (x) {
              return '<a href="' + esc(x.u) + '" target="_blank" rel="noopener noreferrer">'
                + '<span>' + esc(x.t) + '</span><span class="ext">↗</span></a>';
            }).join('') + '</div><div class="rd-note">以上为公开权威渠道，本页不照搬教材原文；数据均标注统计时点，请以最新发布为准。</div>'
          : '';
        const cases = casesOfChapter(no);
        const casesHtml = cases.length
          ? cases.map(function (x) { return '<a class="case-link" data-goto="p-case" data-case="' + x.id + '">' + esc(x.title) + '<span class="case-tag-mini">' + esc(x.tag) + '</span><span class="ext">↗</span></a>'; }).join('')
          : '<div class="todo-note">本章暂无已归类的真实案例。可前往「案例库」页按章节筛选或检索关键词查看全部案例。</div>';
        const vlist = (VIDEOS[no] || []).filter(function (x) { return x && x.bv; });
        let videoHtml;
        if (vlist.length) {
          videoHtml = '<div class="vc-list">' + vlist.map(function (v) {
            return '<a class="video-card" href="https://www.bilibili.com/video/' + esc(v.bv) + '/" target="_blank" rel="noopener noreferrer">' +
              '<span class="vc-play" aria-hidden="true">▶</span><span class="vc-info">' +
              '<b class="vc-title">' + esc(v.title) + '</b>' +
              '<span class="vc-meta">' + esc(v.up) + (v.duration ? ' · ' + esc(v.duration) : '') +
              (v.pages > 1 ? ' · ' + v.pages + ' 分P' : '') + ' · B 站外链 ↗</span>' +
              (v.note ? '<span class="vc-note">' + esc(v.note) + '</span>' : '') +
              '</span></a>';
          }).join('') +
          '<div class="vc-foot">以上 ' + vlist.length + ' 条链接已于 ' + esc(VIDEO_VERIFIED_ON) +
          ' 逐条通过 B 站 view 接口核验（标题 / UP / 时长均取自接口返回）。UP 名以视频实际搬运号为准；如原视频下架，请在代码 <code>VIDEOS</code> 中替换。</div></div>';
        } else {
          videoHtml = '<div class="video-empty"><span class="ext">↗</span> 本章配套视频待补充。可前往 B 站搜索「' + esc(c.title) + '」相关课程；拿到链接后，先用核验脚本确认可用，再在代码 <code>VIDEOS</code> 配置中替换即可一键上线。</div>';
        }
        mainEl.innerHTML =
          '<div class="ch-head"><div><div class="ch-no">' + c.no + '</div><h2 class="ch-name">' + c.title + '</h2></div>'
          + '<span id="ch-timer"></span>'
          + '<button class="ch-done-btn' + (isDone ? ' done' : '') + '" data-no="' + c.no + '">' + (isDone ? '✓ 已完成' : '标记已完成') + '</button></div>'
          + '<div class="ch-meta">教材对应：' + BOOK.author + '《' + BOOK.name + '》' + c.no + ' · ISBN ' + BOOK.isbn + '</div>'
          + '<div class="ch-blocks">'
          + (fwHtml ? '<div class="block"><div class="b-title"><span class="bar"></span>本章框架</div>' + fwHtml + '</div>' : '')
          + '<div class="block"><div class="b-title"><span class="bar"></span>课题知识回顾</div>' + reviewHtml + '</div>'
          + '<div class="block"><div class="b-title"><span class="bar"></span>配套资料（PDF）</div>' + pdfListHtml() + '</div>'
          + '<div class="block"><div class="b-title"><span class="bar"></span>配套视频</div>' + videoHtml + '</div>'
          + '<div class="block"><div class="b-title"><span class="bar"></span>案例拓展</div>' + casesHtml + '<div class="res-row"><button class="res-btn" data-goto="p-case">查看案例库 →</button></div></div>'
          + '<div class="block"><div class="b-title"><span class="bar"></span>本章重点</div><p class="b-text">' + esc(c.zhong) + '</p></div>'
          + '<div class="block"><div class="b-title"><span class="bar"></span>本章难点</div><p class="b-text">' + esc(c.nan) + '</p></div>'
          + '<div class="block"><div class="b-title"><span class="bar"></span>核心概念</div>' + conceptsHtml + '</div>'
          + (kdHtml ? '<div class="block"><div class="b-title"><span class="bar"></span>关键数据与事实</div>' + kdHtml + '</div>' : '')
          + (rdHtml ? '<div class="block"><div class="b-title"><span class="bar"></span>延伸阅读</div>' + rdHtml + '</div>' : '')
          + '<div class="block"><div class="b-title"><span class="bar"></span>本章练习</div><p class="b-text">做几道配套习题检验本章掌握情况；错题自动归集到「错题定位」。</p><div class="res-row"><button class="res-btn" data-res="exercise">📝 本章习题</button></div></div>'
          + '</div>';
        if (curTimer) curTimer.stop();
        curTimer = ibankMakeTimer(document.getElementById('ch-timer'), 'ibank_time_' + no, 'ibank_auto_' + no, function () {
          done[no] = true; saveDone(done); renderNav();
          const btn = mainEl.querySelector('.ch-done-btn'); if (btn) { btn.classList.add('done'); btn.textContent = '✓ 已完成'; }
          if (window.__ibankTrack) { var dur = 0; try { dur = parseInt(localStorage.getItem('ibank_time_' + no) || '0', 10) || 0; } catch (e) {} window.__ibankTrack('study', { chapter: no, duration: dur }); }
          ibankToast('本章已学满 1 小时，自动标记为完成 ✓');
        });
      }

      navEl.addEventListener('click', function (e) {
        const link = e.target.closest('.chapter-link'); if (!link) return;
        current = link.getAttribute('data-no'); renderNav(); renderChapter(current);
      });
      mainEl.addEventListener('click', function (e) {
        const go = e.target.closest('[data-goto]');
        if (go) {
          const t = go.getAttribute('data-goto');
          if (t === 'p-case' && go.getAttribute('data-case')) {
            const cid = go.getAttribute('data-case');
            const b = document.querySelector('.tab-btn[data-page="p-case"]'); if (b) b.click();
            setTimeout(function () {
              if (window.__ibankCaseShow) { window.__ibankCaseShow(cid); return; }
              const el = document.getElementById(cid); if (el) { el.classList.add('open'); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
            }, 80);
            return;
          }
          const b2 = document.querySelector('.tab-btn[data-page="' + t + '"]'); if (b2) b2.click(); return;
        }
        const rb = e.target.closest('.res-btn[data-res]');
        if (rb) {
          const res = rb.getAttribute('data-res');
          if (res === 'exercise') { try { sessionStorage.setItem('ibank_exercise_filter', current); } catch (e) {} const ex = document.querySelector('.tab-btn[data-page="p-exercise"]'); if (ex) ex.click(); return; }
        }
        const db = e.target.closest('.ch-done-btn');
        if (db) { const no2 = db.getAttribute('data-no'); done[no2] = !done[no2]; saveDone(done); renderNav(); db.classList.toggle('done', done[no2]); db.textContent = done[no2] ? '✓ 已完成' : '标记已完成'; if (done[no2] && window.__ibankTrack) { var dur = 0; try { dur = parseInt(localStorage.getItem('ibank_time_' + no2) || '0', 10) || 0; } catch (e) {} window.__ibankTrack('study', { chapter: no2, duration: dur }); } }
      });

      window.__ibankChapterGo = function (no) {
        var nav = document.getElementById('chapter-list');
        if (!nav) return false;
        var hits = nav.querySelectorAll('[data-no]');
        for (var i = 0; i < hits.length; i++) {
          if (hits[i].getAttribute('data-no') === no && hits[i].click) { hits[i].click(); return true; }
        }
        return false;
      };

      renderNav(); renderChapter(current);
    })();
  
/* ===================================================================
   投行卧底（教师控场版）
   —— 一台设备投屏，学生看纸质号卡，教师录票，大屏出结果。
   —— 玩法：n 组各拿一个词，其中 3 组拿到的是「卧底词」；
      每轮存活组轮着用一句话描述，全场投票淘汰一组，翻牌看抓没抓到；
      累计抓出 2 组卧底即平民胜，三轮投完只抓到 1 组（或 0 组）则卧底胜。
   —— 词对全部锚定比亚迪这条线（2011 IPO / 2016 定增 / 2021 配售 / 2026 科创债），
      翻牌即给出「这组词的区别」+「在本课里对应哪一段」，就是本环节的概念讲解。
   —— 全部文案走本文件内置双语表，跟随 <html lang> 切换，
      不进 i18n-dict.js（动态渲染的中文进字典反而更难维护）。
   =================================================================== */
(function () {
  'use strict';

  var root = document.getElementById('uc-root');
  if (!root) return;

  function L() { return document.documentElement.lang === 'en' ? 'en' : 'zh'; }

  var VR_MAX = 3;        // 最多投几轮票
  var WIN_HIT = 2;       // 抓出几组卧底算平民胜

  var T = {
    /* ---- 通用 ---- */
    back:      { zh: '返回游戏首页', en: 'Back to games' },
    sec_s:     { zh: '秒', en: 's' },
    group:     { zh: '组', en: 'Group' },

    /* ---- 开局 ---- */
    s_h:       { zh: '开一局', en: 'Set up a round' },
    s_groups:  { zh: '场上分几组', en: 'Groups on stage' },
    s_sec:     { zh: '每组描述限时', en: 'Seconds per pitch' },
    s_words:   { zh: '词包', en: 'Word pack' },
    s_pack:    { zh: '比亚迪四讲 · 对立词对 12 组', en: 'BYD four deals · 12 word pairs' },
    s_go:      { zh: '生成号卡，开局', en: 'Generate cards and start' },
    s_rule_h:  { zh: '一局怎么玩', en: 'How a round works' },
    s_r1:      { zh: '每组领一张号卡，只自己看，别让邻组瞄到。{1} 组里有 3 组拿到的是卧底词。', en: 'Each group gets one card, read privately. Three of the {1} groups hold the mole word.' },
    s_r2:      { zh: '按屏幕给的顺序，轮着用一句话描述自己的词，不许说破。', en: 'In the order shown, pitch your word in one sentence without giving it away.' },
    s_r3:      { zh: '描述完全场投票，教师点组号记票；票最高的一组被淘汰，翻牌看是平民还是卧底。', en: 'When pitching ends, the class votes. The teacher taps group numbers; the top-voted group is out and its card is flipped.' },
    s_r4:      { zh: '累计抓出 2 组卧底即平民胜；三轮投完只抓到 1 组或一组没抓到，卧底胜。', en: 'Catch two moles and the civilians win. If three votes catch one or none, the moles win.' },
    s_note:    { zh: '一局 5—8 分钟。想再来一局就换一套词，累计比分不清零。', en: 'A round runs five to eight minutes. Start another to switch word sets; the score carries over.' },
    s_mode:    { zh: '发词方式', en: 'How words are dealt' },
    s_m_paper: { zh: '纸质号卡', en: 'Paper cards' },
    s_m_phone: { zh: '手机领词', en: 'Phones' },
    s_mode_tip:{ zh: '手机领词：卡片上只印领词码、不印词，学生扫码输码看自己的词。需要教师账号已登录。', en: 'Phones: the card carries only an access code, not the word. Students scan, type the code, and read their own word. Requires a signed-in teacher account.' },

    /* ---- 号卡 ---- */
    c_h:       { zh: '号卡已生成', en: 'Cards are ready' },
    c_desc:    { zh: '{1} 张卡，其中 3 张印的是卧底词。打印后沿虚线裁开、对折，发下去让学生自己拆开看。', en: '{1} cards, three of them carry the mole word. Print, cut along the dashed lines, fold, and hand them out.' },
    c_print:   { zh: '打印号卡', en: 'Print cards' },
    c_go:      { zh: '号卡发完，开始描述', en: 'Cards dealt, start pitching' },
    c_tip:     { zh: '屏幕上从头到尾不会出现任何词，学生只能看自己手里那张。', en: 'No word ever appears on screen. Students only see their own card.' },

    /* ---- 手机领词 ---- */
    c_ph_desc: { zh: '打印后裁开发给各组。卡片上只有领词码，没有词 —— 学生扫屏幕上的二维码打开领词页，输入自己卡片上的 6 位码。', en: 'Print and cut, then hand one to each group. Cards carry an access code only. Students scan the QR on screen and type their six-character code.' },
    c_qr_h:    { zh: '学生扫码入口', en: 'Student entry' },
    c_qr_tip:  { zh: '二维码只指向领词页，不带任何码。学生仍需输入自己卡片上的 6 位码。', en: 'The QR only opens the page — no codes inside. Students still type their own six characters.' },
    c_push:    { zh: '正在把号卡写入云端…', en: 'Publishing cards…' },
    c_pushed:  { zh: '号卡已写入云端', en: 'Cards published' },
    c_nocloud: { zh: '没连上云服务，已退回纸质模式。先确认教师账号已登录，再点「重新生成」。', en: 'No cloud connection — fell back to paper. Make sure you are signed in, then regenerate.' },
    c_nologin: { zh: '写入被拒绝：当前不是已登录的教师账号。请先登录再开这一局。', en: 'Write denied: not a signed-in teacher account. Sign in first.' },
    c_regen:   { zh: '重新生成', en: 'Regenerate' },
    c_room:    { zh: '房间码', en: 'Room' },
    c_cnt:     { zh: '{1} 张已就绪', en: '{1} codes ready' },
    p_tok_tag: { zh: '领词码', en: 'access code' },
    p_tok_tip: { zh: '扫老师屏幕上的二维码，输入此码', en: 'Scan the teacher’s QR, then type this code' },

    /* ---- 描述 ---- */
    d_now:     { zh: '现在轮到', en: 'Now pitching' },
    d_order:   { zh: '描述顺序', en: 'Pitching order' },
    d_next:    { zh: '下一位', en: 'Next group' },
    d_pause:   { zh: '暂停', en: 'Pause' },
    d_resume:  { zh: '继续', en: 'Resume' },
    d_vote:    { zh: '描述结束，进入投票', en: 'Done pitching, go to vote' },
    d_last:    { zh: '已经是最后一组了', en: 'That was the last group' },
    d_supp:    { zh: '这一轮只补一句：说说和上一轮不一样的地方', en: 'This round: one sentence only — what changed since your last pitch' },

    /* ---- 投票 ---- */
    v_h:       { zh: '谁最像卧底？点组号记票', en: 'Who looks like the mole? Tap to count' },
    v_hint:    { zh: '点一下加一票，点格子右上角的 − 减一票。学生报「我投 5 组」，你就点 5。', en: 'Tap to add a vote, tap the minus sign to take one back.' },
    v_total:   { zh: '已记票数', en: 'Votes recorded' },
    v_settle:  { zh: '结算本轮', en: 'Settle this round' },
    v_tie:     { zh: '平票了，点其中一组决出被淘汰的组。', en: 'Tie. Tap one of the tied groups to decide.' },
    v_need:    { zh: '先记至少一票', en: 'Record at least one vote' },
    v_back:    { zh: '返回描述', en: 'Back to pitching' },

    /* ---- 揭晓 ---- */
    r_out:     { zh: '淘汰', en: 'Eliminated' },
    r_votes:   { zh: '{1} 票', en: '{1} votes' },
    r_was_c:   { zh: '它是平民', en: 'a civilian' },
    r_was_u:   { zh: '它是卧底', en: 'a mole' },
    r_true:    { zh: '平民词', en: 'Civilian word' },
    r_odd:     { zh: '卧底词', en: "Mole's word" },
    r_hit:     { zh: '已抓出 {1} / {2} 组卧底', en: 'Moles caught: {1} of {2}' },
    r_round:   { zh: '第 {1} / {2} 轮投票', en: 'Vote {1} of {2}' },
    r_next:    { zh: '下一轮：存活组补一句，再投一票', en: 'Next round: survivors add a line, then vote again' },
    r_over_c:  { zh: '平民胜', en: 'Civilians win' },
    r_over_u:  { zh: '卧底胜', en: 'Moles win' },
    r_over_cs: { zh: '三轮之内抓出两组卧底，词读对了。', en: 'Two moles caught inside three votes — the words were read correctly.' },
    r_over_us0:{ zh: '三轮投完一组都没抓中，三组卧底全须全尾混到了最后。', en: 'Three votes, no mole caught — all three survived.' },
    r_over_us1:{ zh: '三轮只抓到一组，另外两组卧底混到了最后。', en: 'Three votes caught one mole; the other two survived.' },
    r_moles:   { zh: '三组卧底是', en: 'The moled groups were' },
    r_concept: { zh: '这组词的区别', en: 'How the two words differ' },
    r_byd:     { zh: '在比亚迪这一课里', en: 'In the BYD case' },
    r_score:   { zh: '累计比分', en: 'Score' },
    r_next_g:  { zh: '下一局（换一套词）', en: 'Next round (new words)' },
    r_sheet:   { zh: '再打一份号卡', en: 'Print another sheet' },
    r_reset:   { zh: '重置比分', en: 'Reset score' },

    /* ---- 打印纸 ---- */
    p_title:   { zh: '投行卧底 · 号卡', en: 'Investment Banking Mole · Cards' },
    p_meta:    { zh: '第 {1} 局 · {2} 组 · 沿虚线裁开，对折后发放', en: 'Round {1} · {2} groups · Cut along dashed lines and fold' },
    p_meta2:   { zh: '第 {1} 局 · {2} 组', en: 'Round {1} · {2} groups' },
    c_h_fail:  { zh: '没能生成领词卡', en: 'Could not create the cards' },
    p_fold:    { zh: '— 沿此线对折 —', en: '— fold here —' },
    p_tag:     { zh: '只自己看', en: 'private' }
  };

  function t(k, a, b) {
    var o = T[k];
    var s = o ? (o[L()] || o.zh) : k;
    if (a != null) s = s.split('{1}').join(a);
    if (b != null) s = s.split('{2}').join(b);
    return s;
  }

  /* ---------------- 词包：12 组比亚迪语境的对立词对 ----------------
     两条硬要求：
       ① 两支词要「像到描述会撞车」，否则卧底藏不住、也没得讲；
       ② byd 一栏只讲本课已经出现过的情境，不写时点三连与簿记仿真的答案数字
          （18.00 / 21.08–30.81 / 8–19.88 / 14.22 / 57.40 / 144.73 / 7.8% / 6.9% /
            1.72% / 82.26% / 109.2 / 56.9 一个都不能出现，否则环节二、三就没得猜了）。 */
  var PAIRS = [
    { a: { zh: '询价', en: 'Book building' }, b: { zh: '定价', en: 'Pricing' },
      tip: { zh: '询价是向买方收集报价、探出需求区间；定价是发行人和承销商最终拍板那个数。', en: 'Book building collects bids to map demand; pricing is the final number the issuer and underwriter settle on.' },
      byd: { zh: '2011 年回 A 股，主承销商带机构询价、给出区间；最后成交价却比区间下沿还低——定价不等于询价。', en: 'In the 2011 A-share IPO the lead underwriter built a book and set a range; the final price still came in below its floor.' } },
    { a: { zh: '代销', en: 'Best efforts' }, b: { zh: '包销', en: 'Firm commitment' },
      tip: { zh: '代销卖不掉就退回发行人；包销卖不掉券商自己吃下。', en: 'Best efforts returns unsold bonds to the issuer; firm commitment leaves them with the underwriter.' },
      byd: { zh: '课堂那 50 亿元要是没排满，余额就得承销商拿自有资金买下——占资本金、占额度，所以定价不是越低越好。', en: 'In the simulation, anything unsold on the CNY 5bn deal lands on the underwriter’s own book — which is why pricing is not "the lower the better".' } },
    { a: { zh: '锁价发行', en: 'Fixed-price placement' }, b: { zh: '折价配售', en: 'Discounted placing' },
      tip: { zh: '锁价是预案阶段就把价格定死，等审核、等缴款；折价配售是按市价打个折，当晚定价、次日出货。', en: 'A fixed price is locked at the proposal stage and then waits for approval; a discounted placing prices off the market overnight.' },
      byd: { zh: '2016 年那次定增把价格锁死、等了一年多才到账；2021 年那次配售按市价打折，几天就办完。', en: 'The 2016 placement locked its price and took over a year to settle; the 2021 placing discounted to market and closed in days.' } },
    { a: { zh: 'A 股定增', en: 'A-share placement' }, b: { zh: 'H 股配售', en: 'H-share placing' },
      tip: { zh: '定增发给境内不超过 35 名特定投资者、要过股东大会和证监会；配售凭一般性授权，董事会就能定。', en: 'An A-share placement goes to up to 35 domestic institutions and needs shareholder and CSRC approval; a placing runs on a general mandate.' },
      byd: { zh: '同样缺钱：一次走境内定增、要排队等批文；一次走港股配售、当晚就能定价。', en: 'Same cash need, two routes: one queues for domestic approval, the other prices overnight in Hong Kong.' } },
    { a: { zh: '折让率', en: 'Discount rate' }, b: { zh: '稀释比例', en: 'Dilution' },
      tip: { zh: '折让率说的是价格让了多少；稀释比例说的是新股占了发行后总股本多少。', en: 'The discount is how much price was given up; dilution is how much of the enlarged share count the new stock takes.' },
      byd: { zh: '同一个配售动作，一个口径算价、一个口径算股——老股东亏在折价上，也亏在被摊薄上。', en: 'One placing, two yardsticks: existing holders lose on the discount and again on dilution.' } },
    { a: { zh: '边际利率', en: 'Marginal rate' }, b: { zh: '票面利率', en: 'Coupon' },
      tip: { zh: '边际利率是「刚好卖完」的那一档；票面利率是全场统一计息的那个数。簿记建档里两者是同一个值。', en: 'The marginal rate is the band where the book just fills; the coupon is what everyone is paid. Under book building they are the same number.' },
      byd: { zh: '2026 年那笔 3 年期科创债，把申购按利率从低到高垒到 50 亿元，撞线的那一档就是全场票面。', en: 'On the 2026 three-year tech bond, bids stack from the lowest rate until they reach CNY 5bn — that band becomes the coupon for all.' } },
    { a: { zh: '合规申购', en: 'Compliant bids' }, b: { zh: '有效申购', en: 'Eligible demand' },
      tip: { zh: '合规申购是报了价、材料齐全的都算；有效申购是报价达标、真能拿到券的那些。', en: 'Compliant bids are everyone who bid properly; eligible demand is only those whose rate qualifies.' },
      byd: { zh: '18 家都报了价，报价达标、真能拿到券的只有 11 家——「来了多少人看」和「多少人真掏钱」是两件事。', en: 'Eighteen bid; only eleven qualified. How many showed up and how many actually pay are different numbers.' } },
    { a: { zh: '簿记建档', en: 'Book building' }, b: { zh: '招标发行', en: 'Auction' },
      tip: { zh: '簿记建档是承销商登记订单、按利率从低到高排；招标发行是发行人直接按标位招。', en: 'Book building has the underwriter register orders and stack them; an auction has the issuer take bids directly.' },
      byd: { zh: '比亚迪这笔科创债走簿记建档，承销商只登记、不撮合、也不自己定价。', en: 'BYD’s tech bond used book building: the underwriter registers orders, does not match them, does not set the price.' } },
    { a: { zh: '市盈率', en: 'P/E ratio' }, b: { zh: '市净率', en: 'P/B ratio' },
      tip: { zh: '市盈率拿股价比每股收益；市净率拿股价比每股净资产。', en: 'P/E compares price to earnings per share; P/B compares price to book value per share.' },
      byd: { zh: '2011 年发行时利润正在下滑，用哪一年的每股收益做分母，算出来的倍数差很远。', en: 'Earnings were falling in 2011, so the EPS figure you divide by changes the multiple a lot.' } },
    { a: { zh: '破发', en: 'Below issue price' }, b: { zh: '破净', en: 'Below book value' },
      tip: { zh: '破发是股价跌破发行价；破净是股价跌破每股净资产。', en: 'Breaking issue means below the offer price; breaking book means below net asset value per share.' },
      byd: { zh: '破发是打新的人亏了，破净是公司市值低于账面净资产——两件事经常被混着说。', en: 'Breaking issue hurts the subscriber; breaking book says the company is worth less than its accounts.' } },
    { a: { zh: '全额获配', en: 'Full allocation' }, b: { zh: '比例配售', en: 'Pro-rata allocation' },
      tip: { zh: '报得比边际低，全额拿到；正好报在边际那一档，只能按比例分剩下的量。', en: 'Bid below the marginal rate and you get everything; bid at it and you share the remainder pro rata.' },
      byd: { zh: '边际那一档往往不止一家，同价、一起分剩下的量——所以「报对了」和「拿满了」不是一回事。', en: 'Several institutions often sit on the marginal band, splitting the remainder — bidding right is not the same as getting filled.' } },
    { a: { zh: '资金成本', en: 'Funding cost' }, b: { zh: '票面利率', en: 'Coupon' },
      tip: { zh: '资金成本是机构自己借钱的代价；票面利率是这只债付给持有人的利息。', en: 'Funding cost is what the institution pays to borrow; the coupon is what the bond pays its holder.' },
      byd: { zh: '成本高于票面的机构，抢到量也是亏——这就是同一档利率有人抢、有人不动的原因。', en: 'If your funding cost sits above the coupon, winning size is losing money — which is why some bid and some sit out.' } }
  ];

  /* ---------------- 状态 ---------------- */
  var S = {
    n: 11,            // 组数（默认 11：本课四个角色共 11 组；12 组在设置页一键可切）
    sec: 20,          // 每组描述秒数
    mode: 'paper',    // paper 纸质号卡 | phone 手机领词
    phase: 'setup',   // setup | pushing | cards | describe | vote | reveal
    round: 0,
    pair: null,
    pairIdx: -1,
    moles: [],        // 卧底组（座位号数组，3 个）
    alive: [],        // 存活组
    out: [],          // 已淘汰组
    hit: 0,           // 已抓出的卧底数
    vr: 1,            // 第几轮投票（1..VR_MAX）
    result: '',       // '' 未结束 | 'c' 平民胜 | 'u' 卧底胜
    room: '',         // 云端房间码（phone 模式）
    tokens: [],       // 各组领词码（1..n）
    net: '',          // '' | ok | nocloud | nologin
    order: [],        // 本轮描述顺序（只含存活组）
    cur: 0,
    end: 0,           // 本组倒计时截止时间戳
    paused: false,
    tickId: 0,
    votes: {},
    total: 0,
    picked: 0,
    tie: null,
    score: { c: 0, u: 0 }
  };

  /* ---------------- 小工具 ---------------- */
  function rnd(k) { return Math.floor(Math.random() * k); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1); var x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function gl(n) { return L() === 'en' ? t('group') + ' ' + n : n + ' ' + t('group'); }
  function isMole(seat) { return S.moles.indexOf(seat) >= 0; }

  /* ---------------- 倒计时 ---------------- */
  function startClock() {
    stopClock();
    S.end = Date.now() + S.sec * 1000;
    S.paused = false;
    S.tickId = setInterval(tick, 200);
    tick();
  }
  function stopClock() { if (S.tickId) { clearInterval(S.tickId); S.tickId = 0; } }
  function tick() {
    if (S.phase !== 'describe' || S.paused) return;
    var ms = S.end - Date.now();
    if (ms < 0) ms = 0;
    var secEl = document.getElementById('uc-sec');
    var bar = document.getElementById('uc-bar');
    var clk = document.getElementById('uc-clock');
    var left = Math.ceil(ms / 1000);
    if (secEl) secEl.textContent = left;
    if (clk) clk.classList.toggle('warn', left <= 5);
    if (bar) bar.style.width = (ms / (S.sec * 1000) * 100) + '%';
    if (ms <= 0 && S.tickId) { stopClock(); }
  }
  function togglePause() {
    if (S.phase !== 'describe') return;
    if (S.paused) {
      startClock();
    } else {
      S.paused = true;
      stopClock();
    }
    render();
  }

  /* ---------------- 一局的生命周期 ---------------- */
  function newRound() {
    S.round++;
    S.pairIdx = rnd(PAIRS.length);
    S.pair = PAIRS[S.pairIdx];
    /* 3 组卧底：n=11 → 3:8，n=12 → 3:9。从座位上随机抽 3 个不重复的号。 */
    var seats = [], i;
    for (i = 1; i <= S.n; i++) seats.push(i);
    S.moles = shuffle(seats).slice(0, 3).sort(function (x, y) { return x - y; });
    S.alive = []; for (i = 1; i <= S.n; i++) S.alive.push(i);
    S.out = []; S.hit = 0; S.vr = 1; S.result = '';
    S.order = shuffle(S.alive.slice());
    S.cur = 0;
    S.votes = {}; S.total = 0; S.picked = 0; S.tie = null;
    S.room = ''; S.tokens = []; S.net = '';
    stopClock();
    if (S.mode === 'phone') {
      S.phase = 'pushing'; render(); pushRoom();
    } else {
      S.phase = 'cards'; render();
    }
  }

  /* ---------------- 手机领词：把这一局的号卡写进云端 ---------------- */
  /* 6 位码去掉了 0/1/i/l/o，避免学生把 0 看成 o */
  var CODE_AB = '23456789abcdefghjkmnpqrstuvwxyz';
  function genCode(k) {
    var s = '', buf, i;
    if (window.crypto && window.crypto.getRandomValues) {
      buf = new Uint8Array(k);
      window.crypto.getRandomValues(buf);
      for (i = 0; i < k; i++) s += CODE_AB[buf[i] % CODE_AB.length];
    } else {
      for (i = 0; i < k; i++) s += CODE_AB[rnd(CODE_AB.length)];
    }
    return s;
  }

  function cloudDb() {
    var c = window.__ibankCloud;
    if (!c || c.offline) return null;
    return c.db || null;
  }

  function failNet(why) {
    S.net = why;
    S.phase = 'cards';
    render();
  }

  function pushRoom() {
    var db = cloudDb();
    if (!db) { failNet('nocloud'); return; }
    var code = genCode(4);
    var tokens = [], rows = [], i, w, tk;
    for (i = 1; i <= S.n; i++) {
      w = isMole(i) ? S.pair.b : S.pair.a;
      tk = genCode(6);
      tokens.push(tk);
      rows.push({
        room_code: code, seat: i, token: tk,
        word_zh: w.zh, word_en: w.en, is_mole: isMole(i)
      });
    }
    Promise.resolve()
      .then(function () {
        /* uc_rooms.mole_seat 是早期单卧底留下的 int 列，这里只写第一组卧底留档；
           真正判定「谁拿卧底词」只用 uc_seats.is_mole（逐行布尔），不受这个列限制。 */
        return db.from('uc_rooms').insert({
          code: code, round_no: S.round, n_seats: S.n,
          pair_idx: S.pairIdx, mole_seat: S.moles[0], order_json: S.order
        });
      })
      .then(function (r1) {
        if (r1 && r1.error) throw new Error(r1.error.message || 'room insert failed');
        return db.from('uc_seats').insert(rows);
      })
      .then(function (r2) {
        if (r2 && r2.error) throw new Error(r2.error.message || 'seats insert failed');
        S.room = code; S.tokens = tokens; S.net = 'ok';
        S.phase = 'cards'; render();
      })
      .catch(function (e) {
        var m = (e && e.message) || '';
        failNet(/permission|denied|policy|rls|\b40[13]\b|jwt/i.test(m) ? 'nologin' : 'nocloud');
      });
  }

  function ucUrl() {
    var p = location.pathname.replace(/[^/]*$/, '');
    return location.origin + p + 'uc.html';
  }

  function startDescribe() {
    S.phase = 'describe';
    S.cur = 0;
    render();
    startClock();
  }

  function nextGroup() {
    if (S.cur < S.order.length - 1) { S.cur++; render(); startClock(); }
  }

  function goVote() {
    S.phase = 'vote'; stopClock();
    S.votes = {}; S.total = 0; S.picked = 0; S.tie = null;
    render();
  }

  function vote(id) {
    if (S.phase !== 'vote') return;
    if (S.tie) { pick(id); return; }
    S.votes[id] = (S.votes[id] || 0) + 1;
    S.total++;
    render();
  }
  function unvote(id) {
    if (S.phase !== 'vote' || S.tie) return false;
    if (S.votes[id]) { S.votes[id]--; S.total--; render(); }
    return false;
  }

  function settle() {
    if (S.phase !== 'vote' || !S.total) return;
    var best = 0, ids = [];
    for (var k in S.votes) {
      if (!S.votes.hasOwnProperty(k)) continue;
      var v = S.votes[k];
      if (v > best) { best = v; ids = [+k]; }
      else if (v === best && best > 0) ids.push(+k);
    }
    if (ids.length > 1) { S.tie = ids; render(); return; }
    S.tie = null;
    finish(ids[0]);
  }

  function pick(id) {
    if (!S.tie) return;
    if (S.tie.indexOf(id) < 0) return;
    finish(id);
  }

  function finish(id) {
    S.picked = id;
    S.tie = null;
    if (isMole(id)) S.hit++;
    if (S.out.indexOf(id) < 0) S.out.push(id);
    var k = S.alive.indexOf(id);
    if (k >= 0) S.alive.splice(k, 1);
    /* 胜负判定：抓够 2 组 → 平民胜；票投完了还不够 → 卧底胜；否则继续下一轮 */
    if (S.hit >= WIN_HIT) S.result = 'c';
    else if (S.vr >= VR_MAX) S.result = 'u';
    else S.result = '';
    if (S.result) { if (S.result === 'c') S.score.c++; else S.score.u++; }
    S.phase = 'reveal';
    render();
  }

  /* 进入下一轮投票：只剩存活组重新描述，顺序重排 */
  function nextVoteRound() {
    S.vr++;
    S.order = shuffle(S.alive.slice());
    S.cur = 0;
    S.votes = {}; S.total = 0; S.picked = 0; S.tie = null;
    S.phase = 'describe';
    render();
    startClock();
  }

  function resetAll() {
    stopClock();
    S.phase = 'setup'; S.round = 0; S.pair = null; S.moles = []; S.alive = []; S.out = [];
    S.hit = 0; S.vr = 1; S.result = '';
    S.room = ''; S.tokens = []; S.net = '';
    S.votes = {}; S.total = 0; S.picked = 0; S.tie = null;
    S.score = { c: 0, u: 0 };
    render();
  }

  /* ---------------- 打印号卡 ---------------- */
  function printSheet() {
    if (!S.pair) return;
    var old = document.getElementById('uc-print');
    if (old) old.parentNode.removeChild(old);

    var box = document.createElement('div');
    box.id = 'uc-print';
    var cells = '';
    var phone = (S.mode === 'phone' && S.tokens.length === S.n);
    for (var i = 1; i <= S.n; i++) {
      if (phone) {
        /* 手机模式：纸上只有领词码，没有任何词 —— 纸被传阅也泄不了题 */
        cells += '<div class="uc-card">'
          + '<div class="top"><span class="gno">' + gl(i) + '</span>'
          + '<span class="gtag">' + esc(t('p_tok_tag')) + '</span>'
          + '<span class="fold">' + esc(t('p_fold')) + '</span></div>'
          + '<div class="bot"><div class="ctok">' + esc(S.tokens[i - 1]) + '</div>'
          + '<div class="ce">' + esc(t('p_tok_tip')) + '</div>'
          + '</div></div>';
        continue;
      }
      var w = isMole(i) ? S.pair.b : S.pair.a;
      /* 卡面主词跟随当前语言；中文课顺手带上英文术语，英文课只印英文 */
      var main = (L() === 'en') ? w.en : w.zh;
      var sub2 = (L() === 'en') ? '' : w.en;
      cells += '<div class="uc-card">'
        + '<div class="top"><span class="gno">' + gl(i) + '</span>'
        + '<span class="gtag">' + esc(t('p_tag')) + '</span>'
        + '<span class="fold">' + esc(t('p_fold')) + '</span></div>'
        + '<div class="bot"><div class="cw">' + esc(main) + '</div>'
        + (sub2 ? '<div class="ce">' + esc(sub2) + '</div>' : '')
        + '</div></div>';
    }
    box.innerHTML = '<div class="uc-sheet">'
      + '<div class="sh-head"><h1>' + esc(t('p_title')) + '</h1>'
      + '<p>' + esc(t('p_meta', S.round, S.n)) + '</p></div>'
      + '<div class="sh-grid">' + cells + '</div>'
      + '<div class="sh-foot"><span>' + esc(t('p_title')) + '</span><span>' + esc(t('p_tag')) + '</span></div>'
      + '</div>';
    document.body.appendChild(box);
    document.body.classList.add('uc-printing');

    var done = false;
    function cleanup() {
      if (done) return; done = true;
      document.body.classList.remove('uc-printing');
      var n = document.getElementById('uc-print');
      if (n && n.parentNode) n.parentNode.removeChild(n);
    }
    window.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(cleanup, 1500);
    try { window.print(); } catch (e) { cleanup(); }
  }

  /* ---------------- 渲染 ---------------- */
  function head(title, right) {
    return '<div class="uc-h"><span class="bar"></span><h3>' + esc(title) + '</h3>'
      + (right ? '<span class="r">' + esc(right) + '</span>' : '') + '</div>';
  }

  /* 本环节的概念讲解：两句，一句讲词的区别，一句讲在本课里落在哪一段。
     三个环节都要有，所以做成公共块，卧底的翻牌页直接用。 */
  function conceptBlock(pair) {
    if (!pair) return '';
    return '<div class="uc-cpt">'
      + '<div class="uc-cpt-h">' + esc(t('r_concept')) + '</div>'
      + '<div class="uc-tip">' + esc(pair.tip[L()] || pair.tip.zh) + '</div>'
      + '<div class="uc-cpt-h">' + esc(t('r_byd')) + '</div>'
      + '<div class="uc-byd">' + esc(pair.byd[L()] || pair.byd.zh) + '</div>'
      + '</div>';
  }

  function rSetup() {
    var g = [11, 12], gs = '';
    for (var i = 0; i < g.length; i++) {
      gs += '<button class="uc-chip' + (S.n === g[i] ? ' on' : '') + '" onclick="UC.setN(' + g[i] + ')">' + g[i] + '</button>';
    }
    var ss = [15, 20, 30], s2 = '';
    for (var j = 0; j < ss.length; j++) {
      s2 += '<button class="uc-chip' + (S.sec === ss[j] ? ' on' : '') + '" onclick="UC.setSec(' + ss[j] + ')">' + ss[j] + ' ' + t('sec_s') + '</button>';
    }
    return '<div class="uc-h" style="margin-top:2px"><span class="bar"></span><h3>' + esc(t('s_h')) + '</h3>'
      + '<span class="r">' + (S.score.c || S.score.u ? esc(t('r_score')) + ' ' + S.score.c + ' : ' + S.score.u : '') + '</span></div>'
      + head(t('s_groups'))
      + '<div class="uc-opts">' + gs + '</div>'
      + head(t('s_sec'))
      + '<div class="uc-opts">' + s2 + '</div>'
      + head(t('s_words'))
      + '<div class="uc-opts"><button class="uc-chip on" style="cursor:default">' + esc(t('s_pack')) + '</button></div>'
      + head(t('s_mode'))
      + '<div class="uc-opts">'
      + '<button class="uc-chip' + (S.mode === 'paper' ? ' on' : '') + '" onclick="UC.setMode(\'paper\')">' + esc(t('s_m_paper')) + '</button>'
      + '<button class="uc-chip' + (S.mode === 'phone' ? ' on' : '') + '" onclick="UC.setMode(\'phone\')">' + esc(t('s_m_phone')) + '</button>'
      + '</div>'
      + (S.mode === 'phone' ? '<div class="uc-note" style="display:block">' + esc(t('s_mode_tip')) + '</div>' : '')
      + '<div style="height:20px"></div>'
      + '<button class="uc-btn" onclick="UC.newRound()">' + esc(t('s_go')) + '</button>'
      + '<div class="uc-h"><span class="bar"></span><h3>' + esc(t('s_rule_h')) + '</h3></div>'
      + '<div class="uc-note" style="display:block">'
      + '<div>1. ' + esc(t('s_r1', S.n)) + '</div>'
      + '<div>2. ' + esc(t('s_r2')) + '</div>'
      + '<div>3. ' + esc(t('s_r3')) + '</div>'
      + '<div>4. ' + esc(t('s_r4')) + '</div></div>'
      + '<div class="uc-note" style="display:block">' + esc(t('s_note')) + '</div>';
  }

  function rCards() {
    var h = '<div class="uc-h" style="margin-top:2px"><span class="bar"></span><h3>' + esc(t('c_h')) + '</h3>'
      + '<span class="r">' + esc(t('p_meta', S.round, S.n)) + '</span></div>';

    if (S.mode === 'phone') {
      if (S.net === 'nocloud' || S.net === 'nologin') {
        h = '<div class="uc-h" style="margin-top:2px"><span class="bar"></span><h3>' + esc(t('c_h_fail')) + '</h3>'
          + '<span class="r">' + esc(t('p_meta2', S.round, S.n)) + '</span></div>';
        return h
          + '<div class="uc-note" style="display:block;border-color:rgba(226,75,74,.5);color:#e24b4a">'
          + esc(S.net === 'nologin' ? t('c_nologin') : t('c_nocloud')) + '</div>'
          + '<button class="uc-btn" onclick="UC.regen()">' + esc(t('c_regen')) + '</button>'
          + '<button class="uc-btn ghost" onclick="UC.setMode(\'paper\')">' + esc(t('s_m_paper')) + '</button>';
      }
      return h
        + '<div class="uc-note" style="display:block">' + esc(t('c_ph_desc')) + '</div>'
        + '<div class="uc-qr" id="uc-qr"></div>'
        + '<div class="uc-qr-url" id="uc-qr-url">' + esc(ucUrl()) + '</div>'
        + '<div class="uc-note" style="display:block">' + esc(t('c_qr_tip')) + '</div>'
        + '<div class="uc-tally">' + esc(t('c_pushed')) + ' · <b>' + esc(t('c_cnt', S.tokens.length)) + '</b></div>'
        + '<button class="uc-btn" onclick="UC.print()">' + esc(t('c_print')) + '</button>'
        + '<button class="uc-btn ghost" onclick="UC.startDescribe()">' + esc(t('c_go')) + '</button>';
    }

    return h
      + '<div class="uc-note" style="display:block">' + esc(t('c_desc', S.n)) + '</div>'
      + '<button class="uc-btn" onclick="UC.print()">' + esc(t('c_print')) + '</button>'
      + '<button class="uc-btn ghost" onclick="UC.startDescribe()">' + esc(t('c_go')) + '</button>'
      + '<div class="uc-note" style="display:block">' + esc(t('c_tip')) + '</div>';
  }

  function rDescribe() {
    var now = S.order[S.cur] || 1;
    var left = Math.max(0, Math.ceil((S.end - Date.now()) / 1000));
    var pct = S.paused ? 0 : Math.max(0, Math.min(100, (S.end - Date.now()) / (S.sec * 1000) * 100));
    var chips = '';
    for (var i = 0; i < S.order.length; i++) {
      var c = i < S.cur ? 'done' : (i === S.cur ? 'now' : '');
      chips += '<span class="' + c + '">' + S.order[i] + '</span>';
    }
    var isLast = S.cur >= S.order.length - 1;
    return '<div class="uc-h" style="margin-top:2px"><span class="bar"></span><h3>'
      + esc(t('r_round', S.vr, VR_MAX)) + '</h3>'
      + '<span class="r">' + esc(t('r_hit', S.hit, 3)) + '</span></div>'
      + (S.vr > 1 ? '<div class="uc-note" style="display:block">' + esc(t('d_supp')) + '</div>' : '')
      + '<div class="uc-stage" style="margin-top:2px">'
      + '<div class="lab">' + esc(t('d_now')) + '</div>'
      + '<div class="uc-who">' + now + '<em>' + esc(t('group')) + '</em></div>'
      + '<div class="uc-clock' + (left <= 5 ? ' warn' : '') + '" id="uc-clock"><span id="uc-sec">' + left + '</span><small>' + esc(t('sec_s')) + '</small></div>'
      + '<div class="uc-timebar"><i id="uc-bar" style="width:' + pct + '%"></i></div>'
      + '<div class="uc-order">' + chips + '</div>'
      + '</div>'
      + '<div style="height:16px"></div>'
      + '<button class="uc-btn" onclick="UC.next()"' + (isLast ? ' disabled' : '') + '>' + esc(isLast ? t('d_last') : t('d_next')) + '</button>'
      + '<div class="uc-btn-row" style="margin-top:9px">'
      + '<button class="uc-btn ghost" onclick="UC.pause()">' + esc(S.paused ? t('d_resume') : t('d_pause')) + '</button>'
      + '<button class="uc-btn ghost" onclick="UC.goVote()">' + esc(t('d_vote')) + '</button>'
      + '</div>';
  }

  function rVote() {
    var cells = '';
    for (var i = 1; i <= S.n; i++) {
      /* 已淘汰的组不能再拿票 */
      if (S.out.indexOf(i) >= 0) {
        cells += '<div class="uc-g off"><div class="n">' + i + '</div>'
          + '<div class="u">' + esc(t('r_out')) + '</div><div class="v">—</div></div>';
        continue;
      }
      var v = S.votes[i] || 0;
      var cls = 'uc-g' + (v ? ' has' : '');
      if (S.tie && S.tie.indexOf(i) >= 0) cls += ' top';
      cells += '<div class="' + cls + '" onclick="UC.vote(' + i + ')" oncontextmenu="return UC.unvote(' + i + ')">'
        + '<button class="minus" onclick="event.stopPropagation();UC.unvote(' + i + ')">−</button>'
        + '<div class="n">' + i + '</div>'
        + '<div class="u">' + esc(t('group')) + '</div>'
        + '<div class="v">' + v + '</div>'
        + '</div>';
    }
    return '<div class="uc-h" style="margin-top:2px"><span class="bar"></span><h3>' + esc(t('v_h')) + '</h3>'
      + '<span class="r">' + esc(t('r_round', S.vr, VR_MAX)) + '</span></div>'
      + (S.tie
        ? '<div class="uc-note" style="display:block;border-color:rgba(226,75,74,.5);color:#e24b4a">' + esc(t('v_tie')) + '</div>'
        : '<div class="uc-note" style="display:block">' + esc(t('v_hint')) + '</div>')
      + '<div class="uc-grid">' + cells + '</div>'
      + '<div class="uc-tally">' + esc(t('v_total')) + ' <b>' + S.total + '</b></div>'
      + '<button class="uc-btn" onclick="UC.settle()"' + (S.total ? '' : ' disabled') + '>'
      + esc(S.total ? t('v_settle') : t('v_need')) + '</button>'
      + '<button class="uc-btn ghost" onclick="UC.backDescribe()">' + esc(t('v_back')) + '</button>';
  }

  function rReveal() {
    var wasMole = isMole(S.picked);
    var votes = S.votes[S.picked] || 0;
    var oddb = S.pair ? S.pair.b : { zh: '', en: '' };
    var trua = S.pair ? S.pair.a : { zh: '', en: '' };

    /* ---- 一局已结束 ---- */
    if (S.result) {
      var win = S.result === 'c';
      var mols = S.moles.map(function (x) { return gl(x); }).join('　');
      return '<div class="uc-h" style="margin-top:2px"><span class="bar"></span><h3>' + esc(win ? t('r_over_c') : t('r_over_u')) + '</h3>'
        + '<span class="r">' + esc(t('r_hit', S.hit, 3)) + '</span></div>'
        + '<div class="uc-res ' + (win ? 'win-c' : 'win-u') + '">'
        + '<div class="em">' + (win ? '🎯' : '🕵️') + '</div>'
        + '<h4>' + esc(gl(S.picked)) + ' · ' + esc(wasMole ? t('r_was_u') : t('r_was_c')) + '</h4>'
        + '<div class="sub">' + esc(win ? t('r_over_cs') : t(S.hit === 0 ? 'r_over_us0' : 'r_over_us1')) + '</div>'
        + '<div class="uc-vs">'
        + '<div><div class="k">' + esc(t('r_true')) + '</div><div class="w">' + esc(trua.zh) + '</div><div class="e">' + esc(trua.en) + '</div></div>'
        + '<div class="odd"><div class="k">' + esc(t('r_odd')) + '</div><div class="w">' + esc(oddb.zh) + '</div><div class="e">' + esc(oddb.en) + '</div></div>'
        + '</div>'
        + conceptBlock(S.pair)
        + '<div class="uc-score"><span>' + esc(t('r_moles')) + ' <b>' + esc(mols) + '</b></span></div>'
        + '<div class="uc-score"><span>' + esc(t('r_score')) + ' <b>' + S.score.c + ' : ' + S.score.u + '</b></span></div>'
        + '</div>'
        + '<div style="height:16px"></div>'
        + '<button class="uc-btn" onclick="UC.nextRound()">' + esc(t('r_next_g')) + '</button>'
        + '<div class="uc-btn-row" style="margin-top:9px">'
        + '<button class="uc-btn ghost" onclick="UC.print()">' + esc(t('r_sheet')) + '</button>'
        + '<button class="uc-btn ghost" onclick="UC.reset()">' + esc(t('r_reset')) + '</button>'
        + '</div>';
    }

    /* ---- 一局未完：翻牌 + 概念讲解 + 进入下一轮 ---- */
    return '<div class="uc-h" style="margin-top:2px"><span class="bar"></span><h3>' + esc(t('r_out')) + '</h3>'
      + '<span class="r">' + esc(L() === 'en' && votes === 1 ? '1 vote' : t('r_votes', votes)) + '</span></div>'
      + '<div class="uc-res ' + (wasMole ? 'win-c' : 'win-u') + '">'
      + '<div class="em">' + (wasMole ? '🎯' : '🙈') + '</div>'
      + '<h4>' + esc(gl(S.picked)) + ' · ' + esc(wasMole ? t('r_was_u') : t('r_was_c')) + '</h4>'
      + '<div class="sub">' + esc(t('r_hit', S.hit, 3)) + '</div>'
      + conceptBlock(S.pair)
      + '</div>'
      + '<div style="height:16px"></div>'
      + '<button class="uc-btn" onclick="UC.nextVote()">' + esc(t('r_next')) + '</button>';
  }

  var ENTRY = {
    sec: { zh: '课堂活动', en: 'Classroom activity' },
    tag: { zh: '教师控场', en: 'Teacher-led' },
    pill: { zh: '环节一', en: 'Step 1' },
    name: { zh: '投行卧底 · {1} 组对抗', en: 'Investment Banking Mole · {1} groups' },
    sub: { zh: '3 组卧底藏在平民里，抓出两组即平民胜', en: 'Three moles hide among the civilians — catch two to win' }
  };

  function setEntry() {
    var map = { 'uc-e-sec': 'sec', 'uc-e-tag': 'tag', 'uc-e-pill': 'pill', 'uc-e-name': 'name', 'uc-e-sub': 'sub' };
    for (var id in map) {
      if (!map.hasOwnProperty(id)) continue;
      var el = document.getElementById(id);
      if (el) el.textContent = ENTRY[map[id]][L()].split('{1}').join(S.n);
    }
  }

  function rPushing() {
    return '<div class="uc-h" style="margin-top:2px"><span class="bar"></span><h3>' + esc(t('c_h')) + '</h3></div>'
      + '<div class="uc-note" style="display:block">' + esc(t('c_push')) + '</div>';
  }

  /* 二维码不是必需路径：库没加载上就只留一行网址，学生手输也能进 */
  function afterRender() {
    if (S.phase !== 'cards' || S.mode !== 'phone' || S.net !== 'ok') return;
    var el = document.getElementById('uc-qr');
    if (!el) return;
    if (!window.QRCode) {
      if (el.parentNode) el.parentNode.removeChild(el);
      return;
    }
    try {
      el.innerHTML = '';
      new window.QRCode(el, {
        text: ucUrl(), width: 168, height: 168,
        colorDark: '#1a2233', colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.M
      });
      var u = document.getElementById('uc-qr-url');
      if (u) u.style.display = 'none';
    } catch (e) {
      if (el.parentNode) el.parentNode.removeChild(el);
    }
  }

  function render() {
    var body;
    if (S.phase === 'pushing') body = rPushing();
    else if (S.phase === 'cards') body = rCards();
    else if (S.phase === 'describe') body = rDescribe();
    else if (S.phase === 'vote') body = rVote();
    else if (S.phase === 'reveal') body = rReveal();
    else body = rSetup();

    root.innerHTML = '<div class="uc-root">' + body + '</div>';
    setEntry();
    afterRender();
  }

  /* 语言切换：i18n 层同步派发 ibk:lang，收到就地重渲染一遍。
     MutationObserver 只做兜底（别的路径改了 lang 属性时用）。 */
  var lastLang = L();
  window.addEventListener('ibk:lang', function () {
    lastLang = L();
    render();
  });
  new MutationObserver(function () {
    var now = L();
    if (now !== lastLang) { lastLang = now; render(); }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  /* ---------------- 对外接口 ---------------- */
  window.UC = {
    go: function () { render(); if (window.GM) window.GM.show('uc'); },
    setN: function (n) { S.n = n; render(); },
    setSec: function (s) { S.sec = s; render(); },
    setMode: function (m) {
      S.mode = (m === 'phone') ? 'phone' : 'paper';
      if (S.phase === 'cards' || S.phase === 'pushing') {
        S.room = ''; S.tokens = []; S.net = ''; S.phase = 'setup';
      }
      render();
    },
    regen: function () { S.phase = 'pushing'; S.net = ''; S.room = ''; S.tokens = []; render(); pushRoom(); },
    newRound: newRound,
    startDescribe: startDescribe,
    next: nextGroup,
    pause: togglePause,
    goVote: goVote,
    backDescribe: function () { S.phase = 'describe'; render(); },
    vote: vote,
    unvote: unvote,
    settle: settle,
    pick: pick,
    nextVote: nextVoteRound,
    print: printSheet,
    nextRound: function () { S.phase = 'setup'; render(); },
    reset: resetAll,
    back: function () { if (window.GM) window.GM.show('home'); },
    state: S
  };

  render();
})();

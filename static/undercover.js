/* ===================================================================
   投行卧底（教师控场版）
   —— 一台设备投屏，学生看纸质号卡，教师录票，大屏出结果。
   —— 玩法：12 组各拿一个词，其中 1 组拿到的是「卧底词」；
      轮着用一句话描述，全场投票，翻牌看抓没抓到。
   —— 全部文案走本文件内置双语表，跟随 <html lang> 切换，
      不进 i18n-dict.js（动态渲染的中文进字典反而更难维护）。
   =================================================================== */
(function () {
  'use strict';

  var root = document.getElementById('uc-root');
  if (!root) return;

  function L() { return document.documentElement.lang === 'en' ? 'en' : 'zh'; }

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
    s_pack:    { zh: '投行对立词对 · 12 对', en: '12 banking word pairs' },
    s_go:      { zh: '生成号卡，开局', en: 'Generate cards and start' },
    s_rule_h:  { zh: '一局怎么玩', en: 'How a round works' },
    s_r1:      { zh: '每组领一张号卡，只自己看，别让邻组瞄到。', en: 'Each group gets one card. Read it privately.' },
    s_r2:      { zh: '按屏幕给的顺序，轮着用一句话描述自己的词，不许说破。', en: 'In the order shown, pitch your word in one sentence without giving it away.' },
    s_r3:      { zh: '全场投票，教师点组号记票，翻牌看有没有抓到卧底。', en: 'Everyone votes. The teacher taps group numbers to count, then the card is flipped.' },
    s_note:    { zh: '一整局 5 分钟左右。想再来一局就换一套词，累计比分不清零。', en: 'A full round takes about 5 minutes. Start another to switch word sets; the score carries over.' },
    s_mode:    { zh: '发词方式', en: 'How words are dealt' },
    s_m_paper: { zh: '纸质号卡', en: 'Paper cards' },
    s_m_phone: { zh: '手机领词', en: 'Phones' },
    s_mode_tip:{ zh: '手机领词：卡片上只印领词码、不印词，学生扫码输码看自己的词。需要教师账号已登录。', en: 'Phones: the card carries only an access code, not the word. Students scan, type the code, and read their own word. Requires a signed-in teacher account.' },

    /* ---- 号卡 ---- */
    c_h:       { zh: '号卡已生成', en: 'Cards are ready' },
    c_desc:    { zh: '12 张卡，其中 1 张印的是卧底词。打印后沿虚线裁开、对折，发下去让学生自己拆开看。', en: '12 cards, exactly one carries the mole word. Print, cut along the dashed lines, fold, and hand them out.' },
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

    /* ---- 投票 ---- */
    v_h:       { zh: '谁最像卧底？点组号记票', en: 'Who looks like the mole? Tap to count' },
    v_hint:    { zh: '点一下加一票，点格子右上角的 − 减一票。学生报「我投 5 组」，你就点 5。', en: 'Tap to add a vote, tap the minus sign to take one back.' },
    v_total:   { zh: '已记票数', en: 'Votes recorded' },
    v_settle:  { zh: '结算本轮', en: 'Settle this round' },
    v_tie:     { zh: '平票了，点其中一组决出被淘汰的组。', en: 'Tie. Tap one of the tied groups to decide.' },
    v_need:    { zh: '先记至少一票', en: 'Record at least one vote' },
    v_back:    { zh: '返回描述', en: 'Back to pitching' },

    /* ---- 揭晓 ---- */
    r_out:     { zh: '得票最高被淘汰', en: 'Eliminated by most votes' },
    r_votes:   { zh: '{1} 票', en: '{1} votes' },
    r_was_c:   { zh: '它是平民', en: 'It was a civilian' },
    r_was_u:   { zh: '它是卧底', en: 'It was the mole' },
    r_true:    { zh: '真词', en: 'Real word' },
    r_odd:     { zh: '卧底词', en: "Mole's word" },
    r_caught:  { zh: '抓到了！平民守住', en: 'Caught. Civilians hold' },
    r_escape:  { zh: '混过去了，卧底得手', en: 'The mole got away' },
    r_caught_s:{ zh: '第 {1} 组被投出，翻开一看正是拿到卧底词的那组。', en: 'Group {1} was voted out, and it held the mole word.' },
    r_escape_s:{ zh: '第 {1} 组被投出，翻开是平民。真正的卧底组还在场上。', en: 'Group {1} was voted out but was a civilian. The real mole is still in play.' },
    r_score:   { zh: '累计比分', en: 'Score' },
    r_next:    { zh: '下一局（换一套词）', en: 'Next round (new words)' },
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

  /* ---------------- 词包：12 组投行对立词对 ----------------
     每组两支词要「像到描述会撞车」，玩完顺手把两者区别讲清楚。 */
  var PAIRS = [
    { a: { zh: '代销', en: 'Best efforts' }, b: { zh: '包销', en: 'Firm commitment' },
      tip: { zh: '代销卖不掉就退回发行人；包销卖不掉券商自己吃下。', en: 'Best efforts returns unsold shares to the issuer; firm commitment leaves them with the underwriter.' } },
    { a: { zh: '询价', en: 'Book building' }, b: { zh: '定价', en: 'Pricing' },
      tip: { zh: '询价是向投资者收集申报价位；定价是最终拍板那个发行价。', en: 'Book building collects bids; pricing is the final offer price.' } },
    { a: { zh: '注册制', en: 'Registration-based' }, b: { zh: '核准制', en: 'Approval-based' },
      tip: { zh: '注册制只看披露够不够；核准制还要监管替你做价值判断。', en: 'Registration checks disclosure only; approval adds a regulatory judgment on merit.' } },
    { a: { zh: '市盈率', en: 'P/E ratio' }, b: { zh: '市净率', en: 'P/B ratio' },
      tip: { zh: '市盈率拿股价比每股收益；市净率拿股价比每股净资产。', en: 'P/E compares price to earnings per share; P/B compares price to book value per share.' } },
    { a: { zh: '增发', en: 'Placement' }, b: { zh: '配股', en: 'Rights issue' },
      tip: { zh: '增发可以卖给新股东；配股必须先按持股比例给老股东。', en: 'A placement can bring in new holders; a rights issue must first go to existing holders pro rata.' } },
    { a: { zh: '一级市场', en: 'Primary market' }, b: { zh: '二级市场', en: 'Secondary market' },
      tip: { zh: '一级市场是发行人卖新券、钱进公司；二级市场是投资者之间互相倒手。', en: 'The primary market raises cash for the issuer; the secondary market is investor-to-investor.' } },
    { a: { zh: '保荐人', en: 'Sponsor' }, b: { zh: '主承销商', en: 'Lead underwriter' },
      tip: { zh: '保荐人负责保荐与持续督导；主承销商负责组织发行和承销。', en: 'The sponsor vouches and supervises; the lead underwriter organizes and sells the deal.' } },
    { a: { zh: '破发', en: 'Below issue price' }, b: { zh: '破净', en: 'Below book value' },
      tip: { zh: '破发是跌破发行价；破净是跌破每股净资产。', en: 'Breaking issue means below the offer price; breaking book means below net asset value per share.' } },
    { a: { zh: '可转债', en: 'Convertible bond' }, b: { zh: '可交换债', en: 'Exchangeable bond' },
      tip: { zh: '转债换成发行人新发的股；交换债换的是老股东手里的存量股。', en: 'A convertible swaps into new shares; an exchangeable swaps into existing shares held by a shareholder.' } },
    { a: { zh: '战略配售', en: 'Strategic placement' }, b: { zh: '网上申购', en: 'Public subscription' },
      tip: { zh: '战略配售给特定机构还带锁定期；网上申购给所有人、靠摇号。', en: 'Strategic placement goes to named institutions with a lock-up; public subscription is a lottery open to all.' } },
    { a: { zh: '承销费', en: 'Underwriting fee' }, b: { zh: '佣金', en: 'Brokerage commission' },
      tip: { zh: '承销费由发行人付给券商；佣金由投资者付给券商。', en: 'The issuer pays the underwriting fee; the investor pays the commission.' } },
    { a: { zh: '主板', en: 'Main board' }, b: { zh: '创业板', en: 'ChiNext' },
      tip: { zh: '主板偏成熟大盘蓝筹；创业板偏成长型创新企业。', en: 'The main board hosts mature large caps; ChiNext hosts growth and innovation names.' } }
  ];

  /* ---------------- 状态 ---------------- */
  var S = {
    n: 12,            // 组数
    sec: 20,          // 每组描述秒数
    mode: 'paper',    // paper 纸质号卡 | phone 手机领词
    phase: 'setup',   // setup | pushing | cards | describe | vote | reveal
    round: 0,
    pair: null,
    pairIdx: -1,
    odd: -1,          // 卧底组（1..n）
    room: '',         // 云端房间码（phone 模式）
    tokens: [],       // 各组领词码（1..n）
    net: '',          // '' | ok | nocloud | nologin
    order: [],        // 描述顺序
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
  function glShort(n) { return L() === 'en' ? String(n) : String(n); }
  function wordOf(which) {
    var p = S.pair; if (!p) return '';
    var w = which === 'odd' ? p.b : p.a;
    return w[L()] || w.zh;
  }

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
    var pool = PAIRS.slice(0, PAIRS.length);
    S.pairIdx = rnd(pool.length);
    S.pair = pool[S.pairIdx];
    S.odd = rnd(S.n) + 1;
    var ord = []; for (var i = 1; i <= S.n; i++) ord.push(i);
    S.order = shuffle(ord);
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
      w = (i === S.odd) ? S.pair.b : S.pair.a;
      tk = genCode(6);
      tokens.push(tk);
      rows.push({
        room_code: code, seat: i, token: tk,
        word_zh: w.zh, word_en: w.en, is_mole: (i === S.odd)
      });
    }
    Promise.resolve()
      .then(function () {
        return db.from('uc_rooms').insert({
          code: code, round_no: S.round, n_seats: S.n,
          pair_idx: S.pairIdx, mole_seat: S.odd, order_json: S.order
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
    S.phase = 'reveal';
    S.tie = null;
    if (id === S.odd) S.score.c++; else S.score.u++;
    render();
  }

  function resetAll() {
    stopClock();
    S.phase = 'setup'; S.round = 0; S.pair = null; S.odd = -1;
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
      var isOdd = (i === S.odd);
      var w = isOdd ? S.pair.b : S.pair.a;
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
      + '<div>1. ' + esc(t('s_r1')) + '</div>'
      + '<div>2. ' + esc(t('s_r2')) + '</div>'
      + '<div>3. ' + esc(t('s_r3')) + '</div></div>'
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
      + '<div class="uc-note" style="display:block">' + esc(t('c_desc')) + '</div>'
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
    return '<div class="uc-stage" style="margin-top:2px">'
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
    return '<div class="uc-h" style="margin-top:2px"><span class="bar"></span><h3>' + esc(t('v_h')) + '</h3></div>'
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
    var win = S.picked === S.odd;
    var votes = S.votes[S.picked] || 0;
    var oddb = S.pair ? S.pair.b : { zh: '', en: '' };
    var trua = S.pair ? S.pair.a : { zh: '', en: '' };
    return '<div class="uc-h" style="margin-top:2px"><span class="bar"></span><h3>' + esc(t('r_out')) + '</h3>'
      + '<span class="r">' + esc(t('r_votes', votes)) + '</span></div>'
      + '<div class="uc-res ' + (win ? 'win-c' : 'win-u') + '">'
      + '<div class="em">' + (win ? '🎯' : '🕵️') + '</div>'
      + '<h4>' + esc(gl(S.picked)) + ' · ' + esc(win ? t('r_was_u') : t('r_was_c')) + '</h4>'
      + '<div class="sub">' + esc(win ? t('r_caught') : t('r_escape')) + '</div>'
      + '<div class="uc-vs">'
      + '<div><div class="k">' + esc(t('r_true')) + '</div><div class="w">' + esc(trua.zh) + '</div><div class="e">' + esc(trua.en) + '</div></div>'
      + '<div class="odd"><div class="k">' + esc(t('r_odd')) + '</div><div class="w">' + esc(oddb.zh) + '</div><div class="e">' + esc(oddb.en) + '</div></div>'
      + '</div>'
      + '<div class="uc-tip">' + esc(S.pair ? (S.pair.tip[L()] || S.pair.tip.zh) : '') + '</div>'
      + '<div class="uc-score"><span>' + esc(t('r_score')) + ' <b>' + S.score.c + ' : ' + S.score.u + '</b></span>'
      + '<span>' + esc(L() === 'en' ? 'Mole was' : '卧底是') + ' <b>' + esc(gl(S.odd)) + '</b></span></div>'
      + '</div>'
      + '<div style="height:16px"></div>'
      + '<button class="uc-btn" onclick="UC.nextRound()">' + esc(t('r_next')) + '</button>'
      + '<div class="uc-btn-row" style="margin-top:9px">'
      + '<button class="uc-btn ghost" onclick="UC.print()">' + esc(t('r_sheet')) + '</button>'
      + '<button class="uc-btn ghost" onclick="UC.reset()">' + esc(t('r_reset')) + '</button>'
      + '</div>';
  }

  var ENTRY = {
    sec: { zh: '课堂活动', en: 'Classroom activity' },
    tag: { zh: '教师控场', en: 'Teacher-led' },
    pill: { zh: '开场', en: 'Open' },
    name: { zh: '投行卧底 · 12 组对抗', en: 'Investment Banking Mole · 12 groups' },
    sub: { zh: '发词卡、轮着描述、投票翻牌，一局 5 分钟', en: 'Deal cards, pitch in turn, vote and flip — five minutes a round' }
  };

  function setEntry() {
    var map = { 'uc-e-sec': 'sec', 'uc-e-tag': 'tag', 'uc-e-pill': 'pill', 'uc-e-name': 'name', 'uc-e-sub': 'sub' };
    for (var id in map) {
      if (!map.hasOwnProperty(id)) continue;
      var el = document.getElementById(id);
      if (el) el.textContent = ENTRY[map[id]][L()];
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
    print: printSheet,
    nextRound: function () { S.phase = 'setup'; render(); },
    reset: resetAll,
    back: function () { if (window.GM) window.GM.show('home'); },
    state: S
  };

  render();
})();

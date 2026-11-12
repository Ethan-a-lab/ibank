/* ===================================================================
   时点三连（教师控场 · 拍档猜价）
   —— 一台设备投屏，11 组各拍一档，每轮多给一条信息、可改可不改，
      三轮后翻出真值靶心，看全班判断怎么被信息推动。
   —— 零算术：题面不给可计算的材料，学生只口播一个数，教师点对应档。
   —— 全部数据取自 static/app-core.js 的 caseBg.eras（已核验底稿），
      不新增事实；英文文案为同一事实的简写，不进 i18n-dict.js。
   —— 状态存本机 localStorage，不碰云、不碰数据库。
   =================================================================== */
(function () {
  'use strict';

  var root = document.getElementById('tl-root');
  if (!root) return;

  var NG = 11;                 // 组数：本课四角色共 11 组
  var NB = 7;                  // 每题 7 档
  var STORE = 'ibank_tl_state_v1';

  function L() { return document.documentElement.lang === 'en' ? 'en' : 'zh'; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function tx(o) { return (o && (o[L()] || o.zh)) || ''; }
  function t(k, a, b) {
    var o = T[k]; var s = o ? (o[L()] || o.zh) : k;
    if (a != null) s = s.split('{1}').join(a);
    if (b != null) s = s.split('{2}').join(b);
    return s;
  }

  var T = {
    back:      { zh: '返回游戏首页', en: 'Back to games' },
    sec:       { zh: '课堂活动', en: 'Class activity' },
    tag:       { zh: '教师控场', en: 'Teacher-led' },
    pill:      { zh: '开场', en: 'Open' },
    ename:     { zh: '时点三连 · 拍档猜价', en: 'Three Eras · Call the Price' },
    esub:      { zh: '同一家公司三次要钱，每轮多给一条信息，改一次价', en: 'One company, three fundraisings; one new clue each round' },

    rules_h:   { zh: '开组前 · 30 秒说清规则', en: 'Before you start · 30-second rules' },
    rules_1:   { zh: '大屏给一道题和 7 个档位，各组口播一个数，教师点一下对应档位即可。不用算，也不用写。', en: 'The screen shows one question and seven bands. Each group calls out a number; the teacher taps its band. No maths, no writing.' },
    rules_2:   { zh: '每轮 60 秒，会多亮一条信息。可以改价，也可以不改。', en: 'Each round reveals one more clue. You may change your call or keep it.' },
    rules_3:   { zh: '三轮后翻出真值靶心：离靶心档隔几档，就记几分，三题累计越低越好。', en: 'After three rounds the true band flips. Your score is how many bands away you are; lowest total across three questions wins.' },
    rules_4:   { zh: '每次出价都会自动留在本机，作为「先承诺后教学」的增值基线，不用另填问卷。', en: 'Every call is saved locally as the pre-teaching baseline. No extra form to fill in.' },
    start:     { zh: '开始正赛', en: 'Start the round' },
    rounds:    { zh: '本组轮数', en: 'Rounds' },
    group:     { zh: '第 {1} 组题', en: 'Set {1}' },
    qof:       { zh: '第 {1} / 3 题', en: 'Question {1} of 3' },
    rof:       { zh: '第 {1} 轮 / 共 {2} 轮', en: 'Round {1} of {2}' },
    what:      { zh: '你猜多少？', en: 'Your call' },
    unit:      { zh: '单位', en: 'Unit' },
    brush:     { zh: '先点档位，再点组号（可连续点多个组）', en: 'Pick a band, then tap group numbers (you can tap several in a row)' },
    seats:     { zh: '11 组本轮的档位', en: 'Bands for the 11 groups' },
    unset:     { zh: '未拍', en: 'Not set' },
    clue:      { zh: '本轮新信息', en: 'New clue this round' },
    clue0:     { zh: '起始情境', en: 'Starting context' },
    lock:      { zh: '锁定本轮 · 看轨迹', en: 'Lock this round' },
    lock2:     { zh: '锁定本轮 · 下一轮', en: 'Lock this round' },
    need:      { zh: '还有 {1} 组没拍档', en: '{1} groups have not called yet' },
    inherit:   { zh: '本轮默认继承上轮，只点要改的组即可', en: 'Carries over from last round; tap only the groups that change' },

    reveal_h:  { zh: '揭晓 · 真值靶心', en: 'Reveal · the true band' },
    truth:     { zh: '真值', en: 'Actual' },
    talk_h:    { zh: '讲评一句话', en: 'Debrief in one line' },
    evi_h:     { zh: '证据卡（底稿原始数据）', en: 'Evidence card (source figures)' },
    trail_h:   { zh: '全班判断怎么走', en: 'How the class moved' },
    median:    { zh: '全班中位数', en: 'Class median' },
    bestmove:  { zh: '最会改', en: 'Best correction' },
    target:    { zh: '靶心档', en: 'Target band' },
    score_h:   { zh: '本题记分（格数越小越好）', en: 'Score this question (fewer bands is better)' },
    total:     { zh: '累计', en: 'Total' },
    mostmove:  { zh: '最会改：{1}', en: 'Best correction: {1}' },
    stubborn:  { zh: '一动不动：{1}', en: 'Never moved: {1}' },
    none:      { zh: '无', en: 'None' },
    nextq:     { zh: '下一题', en: 'Next question' },
    summary:   { zh: '本组收官 · 三时点对照', en: 'Set complete · three eras compared' },

    cmp_h:     { zh: '同一家公司，三次要钱', en: 'One company, three asks' },
    c1:        { zh: '年份', en: 'Year' },
    c2:        { zh: '方式', en: 'Instrument' },
    c3:        { zh: '对面是谁（谁出钱）', en: 'Who pays' },
    c4:        { zh: '谁审、审多久', en: 'Who approves, how long' },
    c5:        { zh: '定价权在谁？', en: 'Who holds pricing power?' },
    blank:     { zh: '（留给学生自己填）', en: '(fill in on your sheet)' },
    champ:     { zh: '本组冠军', en: 'Set winner' },
    leader:    { zh: '当前领先', en: 'Currently leading' },
    again:     { zh: '再来一组', en: 'Another set' },
    again2:    { zh: '两组都打完了 · 回到首页', en: 'Both sets done · back home' },
    reset:     { zh: '清空本机记录', en: 'Clear local record' },
    reset2:    { zh: '确认清空？再点一次', en: 'Confirm clear? Tap again' },
    g2:        { zh: '第 2 组 · 换个量纲再看一次', en: 'Set 2 · the same eras, different measures' },
    g1:        { zh: '第 1 组 · 三条股权融资路', en: 'Set 1 · three equity routes' },
    keep:      { zh: '上一组比分保留，累计计分', en: 'Previous scores kept; totals accumulate' },
    done:      { zh: '已打完的题', en: 'Questions played' },
    gname:     { zh: '第 {1} 组', en: 'Group {1}' },
    bandshort: { zh: '第 {1} 档', en: 'Band {1}' },
    pts:       { zh: '{1} 格', en: '{1} bands' },
    allset:    { zh: '全部 11 组已拍档', en: 'All 11 groups have called' },
    r1:        { zh: '轮 1', en: 'R1' },
    r2:        { zh: '轮 2', en: 'R2' },
    r3:        { zh: '轮 3', en: 'R3' }
  };

  /* ---------------- 题库 ----------------
     每个数都能在 static/app-core.js 的 caseBg.eras / 题库答案册里对上。
     五条口径坑：不提首日 22 元 vs 18 元的混淆、不显示 2026 申购区间、
     不引用 2011 上证点位、不出现 20.47 倍市盈率、不进四档资金成本。
     ★target 是 1-based 档号（1..7），不是 bands 的 0-based 下标。
       渲染用 q.bands[target-1]，计分用 Math.abs(档位 - target)，两者都按 1-based。
       六题真值都落在第 3 档，写成 2 会把靶心标到隔壁档（v106 首轮实测踩过）。 */
  var QS = [
    [
      {
        id: '2011', year: '2011',
        way: { zh: 'A 股 IPO · 询价制', en: 'A-share IPO · book building' },
        who: { zh: '境内询价机构', en: 'Domestic institutional bidders' },
        audit: { zh: '证监会发审委 · 数月', en: 'CSRC review · months' },
        q: { zh: '2011 年比亚迪回 A 股，你觉得发行价定在多少元？', en: 'BYD returns to the A-share market in 2011. What was the offer price?' },
        unit: { zh: '元 / 股', en: 'CNY / share' },
        bands: ['≤15', '15–18', '18–21', '21–24', '24–27', '27–30', '≥30'],
        target: 3,
        truth: { zh: '18.00 元 / 股', en: '18.00 CNY / share' },
        info: [
          { zh: '2011 年，比亚迪回 A 股，深交所中小板、询价制；招股书拟募 21.92 亿元，计划发行 7,900 万股（占发行后总股本 3.36%）。',
            en: '2011: BYD lists on the Shenzhen SME board via book building. The prospectus plans to raise CNY 2.192bn by issuing 79m shares (3.36% of enlarged capital).' },
          { zh: '主承销商带机构询价后，给出的询价区间是 21.08—30.81 元。',
            en: 'The lead underwriter runs institutional book building and sets an indicative range of CNY 21.08–30.81.' },
          { zh: '2011 年 A 股估值整体下行；网下 89 家配售对象报价从 8.00 元到 19.88 元（长江证券、国泰君安报 8 元，泰康资管报 19.88 元），最高最低差 1.48 倍。',
            en: 'A-share valuations fall through 2011. Offline bids from 89 placees range from CNY 8.00 to 19.88 — a 1.48x spread.' }
        ],
        reveal: { zh: '18.00 元/股，实募 14.22 亿元（净额 13.54 亿元）——比询价区间下沿还低约 15%，比计划少募 7.7 亿元、缺口 35%；最终 11 家获配、认购倍数 4.9 倍。',
          en: 'CNY 18.00 per share; gross proceeds CNY 1.422bn (net 1.354bn) — about 15% below the bottom of the indicative range, 35% short of plan. 11 placees allocated, 4.9x covered.' },
        talk: { zh: '区间是承销商报的，价是买方给的。第 2 轮一亮区间，多数人往高处挪，真值却比下沿还低 15%。同一天 89 家专业机构从 8 元报到 19.88 元，他们自己也没算齐——定价权在出钱的人手里，议价能力取决于谁更等得起。',
          en: 'The underwriter proposes the range; buyers set the price. Once the range appears, most guesses drift upward — yet the truth sits 15% below its floor. 89 professional investors bid from 8.00 to 19.88 the same day. Pricing power sits with the buyer; bargaining power depends on who can wait.' },
        evidence: [
          { zh: '18.00 元 / 股', en: 'CNY 18.00 / share' },
          { zh: '21.92 亿 → 14.22 亿', en: '2.192bn → 1.422bn' },
          { zh: '21.08—30.81 元', en: 'CNY 21.08–30.81' },
          { zh: '8.00—19.88 元', en: 'CNY 8.00–19.88' },
          { zh: '11 家获配 · 4.9 倍', en: '11 placees · 4.9x' }
        ]
      },
      {
        id: '2016', year: '2016',
        way: { zh: 'A 股定向增发 · 锁价', en: 'A-share private placement · fixed price' },
        who: { zh: '35 名以内特定投资者', en: 'Up to 35 selected investors' },
        audit: { zh: '证监会发审委 · 以年计', en: 'CSRC review · over a year' },
        q: { zh: '2015 年 6 月定增预案，价格在预案时就按锁价方式定死。你猜锁价定在多少元？', en: 'The June 2015 placement fixes its price at the proposal stage. What was that price?' },
        unit: { zh: '元 / 股', en: 'CNY / share' },
        bands: ['≤40', '40–50', '50–60', '60–70', '70–80', '80–90', '≥90'],
        target: 3,
        truth: { zh: '57.40 元 / 股', en: '57.40 CNY / share' },
        info: [
          { zh: '2015 年 6 月 A 股牛市高位，比亚迪披露定增预案：拟发 2.61 亿股、募约 150 亿元，对象不超过 35 名，价格在预案时就按锁价方式定死。',
            en: 'June 2015, at a market high: BYD files a placement plan for 261m shares and about CNY 15bn, with no more than 35 investors and a price fixed at proposal stage.' },
          { zh: '锁价定死时股价在高位，但从预案披露到资金到账走了 13 个月，期间市场已从高位下行、落地时股价跌了约 18%。',
            en: 'The price was set at a high, but 13 months passed before the cash arrived; by then the market had fallen about 18%.' },
          { zh: '定价遵循「价格优先、认购金额优先、认购时间优先」；实际募资总额 144.73 亿元，连 150 亿元都没募满。',
            en: 'Allocation follows price, size, then time priority. Gross proceeds came to CNY 14.473bn — short of the 15bn plan.' }
        ],
        reveal: { zh: '57.40 元/股；实际发行 2.5214 亿股、募资总额 144.73 亿元（净额约 143.69 亿元），连 150 亿元都没募满。',
          en: 'CNY 57.40 per share; 252.14m shares issued for CNY 14.473bn gross (about 14.369bn net) — short of plan.' },
        talk: { zh: '价格锁住了，时间锁不住。锁价买的是确定性，代价是这 13 个月里市场怎么走都得自己扛。钱只来自 6 家大机构——定增定价本质是跟少数人谈出来的，不是市场集合竞价。',
          en: 'The price was locked; the clock was not. Fixing the price buys certainty at the cost of carrying 13 months of market risk. Only six institutions subscribed — a placement is negotiated with a few big funds, not an open auction.' },
        evidence: [
          { zh: '57.40 元 / 股', en: 'CNY 57.40 / share' },
          { zh: '2.61 亿股 → 2.5214 亿股', en: '261m → 252.14m shares' },
          { zh: '150 亿 → 144.73 亿', en: '15bn → 14.473bn' },
          { zh: '13 个月', en: '13 months' },
          { zh: '6 家机构认购', en: '6 subscribers' }
        ]
      },
      {
        id: '2021', year: '2021',
        way: { zh: 'H 股配售 · 按市价折让', en: 'H-share placement · discount to market' },
        who: { zh: '国际机构', en: 'International institutions' },
        audit: { zh: '港交所 · 几天', en: 'HKEX · a few days' },
        q: { zh: '2021 年比亚迪在港股连做两次配售，按市价折让给机构。你猜第一次折让了多少？', en: 'BYD did two H-share placements in 2021 at a discount to market. How large was the first discount?' },
        unit: { zh: '%（折让率）', en: '% discount' },
        bands: ['≤4', '4–6', '6–8', '8–10', '10–12', '12–14', '≥14'],
        target: 3,
        truth: { zh: '7.8%（第二次 6.9%）', en: '7.8% (6.9% for the second)' },
        info: [
          { zh: '2020—2021 年新能源车销量起量，扩产要钱而且要快。比亚迪在港股连做两次配售，按市价折让给机构。',
            en: 'EV sales take off in 2020–21 and capacity expansion needs cash fast. BYD does two H-share placements at a discount to market.' },
          { zh: '港股配售不走境内审核程序，从定价到资金到账只要几天；第一次 1.33 亿股，占发行后 4.65%。',
            en: 'An H-share placement skips domestic approval and settles in days. The first: 133m shares, 4.65% of enlarged capital.' },
          { zh: '同一年又做了第二次，5,000 万股、占 1.75%；两次合计净募约 435 亿港元（298.01 + 137.44）。',
            en: 'A second placement that year: 50m shares, 1.75%. Net proceeds together about HKD 43.5bn (29.801 + 13.744).' }
        ],
        reveal: { zh: '两次折让 7.8% 与 6.9%，合计净募约 435 亿港元。',
          en: 'Discounts of 7.8% and 6.9%; net proceeds about HKD 43.5bn in total.' },
        talk: { zh: '7.8% 不是给承销商的佣金，是给「时间」和「确定性」付的价。2016 年那次定增锁住了价格却等了 13 个月，这次宁愿付折让也不等——同样是不还本的股权融资，一个买确定性，一个买速度。',
          en: 'The 7.8% is not an underwriting fee; it is the price of time and certainty. In 2016 the price was locked but the cash took 13 months. Here BYD pays a discount rather than waits — one equity raise buys certainty, the other buys speed.' },
        evidence: [
          { zh: '折让 7.8% / 6.9%', en: '7.8% / 6.9% discount' },
          { zh: '1.33 亿股 · 4.65%', en: '133m shares · 4.65%' },
          { zh: '5,000 万股 · 1.75%', en: '50m shares · 1.75%' },
          { zh: '净募 298.01 + 137.44 亿港元', en: 'Net HKD 29.801 + 13.744bn' }
        ]
      }
    ],
    [
      {
        id: '2026', year: '2026',
        way: { zh: '银行间中期票据 · 簿记建档', en: 'Interbank MTN · book building' },
        who: { zh: '银行与资管', en: 'Banks and asset managers' },
        audit: { zh: '交易商协会 · 两周内', en: 'NAFMII · within two weeks' },
        q: { zh: '2026 年一笔 50 亿元、3 年期的中期票据，市场缺资产、利率在低位。你猜票面定在多少？', en: 'A CNY 5bn, 3-year MTN in 2026, with scarce assets and low rates. What coupon was set?' },
        unit: { zh: '%（票面利率）', en: '% coupon' },
        bands: ['≤1.60', '1.60–1.68', '1.68–1.76', '1.76–1.84', '1.84–1.92', '1.92–2.00', '≥2.00'],
        target: 3,
        truth: { zh: '1.72%', en: '1.72%' },
        info: [
          { zh: '2026 年，比亚迪要在银行间市场发一笔 50 亿元、3 年期的中期票据；当时市场缺资产、利率在低位。',
            en: 'In 2026 BYD issues a CNY 5bn, 3-year MTN in the interbank market, amid scarce assets and low rates.' },
          { zh: '走簿记建档，对面是银行与资管；承销商能看到订单簿的实时形状，知道压到哪个位置还有量。',
            en: 'Book building with banks and asset managers: the underwriter sees the order book and knows how far the price can be pushed.' },
          { zh: '合规申购 18 家共 109.2 亿元（约 2.18 倍），其中报价达标的只有 11 家、有效申购 56.9 亿元（1.14 倍）。',
            en: '18 compliant bids totalling CNY 10.92bn (about 2.18x), but only 11 qualified: eligible demand CNY 5.69bn (1.14x).' }
        ],
        reveal: { zh: '票面 1.72%；边际档按比例配售；承销商自营获配合计 60%。',
          en: 'A 1.72% coupon; the marginal band is allocated pro rata; underwriter proprietary accounts took 60% in total.' },
        talk: { zh: '2.18 倍是「来了多少人看」，1.14 倍是「多少人真掏钱」——做承销的人只认后一个。票面每压 1 个基点，三年省 150 万元，但一路压到底就没人下单、甚至发行失败，所以停在 1.72%。',
          en: 'The 2.18x is how many showed up; 1.14x is how many actually paid — underwriters only use the latter. Each basis point saves CNY 1.5m over three years, but pushing too far kills demand, so it stops at 1.72%.' },
        evidence: [
          { zh: '票面 1.72%', en: '1.72% coupon' },
          { zh: '合规 109.2 亿 · 2.18 倍', en: 'Compliant 10.92bn · 2.18x' },
          { zh: '有效 56.9 亿 · 1.14 倍', en: 'Eligible 5.69bn · 1.14x' },
          { zh: '自营获配 60%', en: '60% to proprietary desks' }
        ]
      },
      {
        id: '2011b', year: '2011',
        way: { zh: 'A 股 IPO · 换个量纲看实募', en: 'A-share IPO · proceeds instead of price' },
        who: { zh: '境内询价机构', en: 'Domestic institutional bidders' },
        audit: { zh: '证监会发审委 · 数月', en: 'CSRC review · months' },
        q: { zh: '同一年，招股书计划募 21.92 亿元；最终发行价 18.00 元，比询价区间下沿还低约 15%。你猜实际募到了多少亿？', en: 'The same IPO planned to raise CNY 2.192bn, but priced 15% below the range floor. How much was actually raised?' },
        unit: { zh: '亿元（募资总额）', en: 'CNY 100m (gross)' },
        bands: ['≤10', '10–13', '13–16', '16–19', '19–22', '22–25', '≥25'],
        target: 3,
        truth: { zh: '14.22 亿元', en: 'CNY 1.422bn' },
        info: [
          { zh: '2011 年比亚迪回 A 股，招股书计划募 21.92 亿元；最终发行价定在 18.00 元，比承销商询价区间下沿还低约 15%。',
            en: 'BYD planned to raise CNY 2.192bn in 2011, but priced at CNY 18.00 — about 15% below the bottom of the indicative range.' },
          { zh: '询价机构报价中枢下移、需求不足；最终只有 11 家获配，认购倍数 4.9 倍。',
            en: 'Institutional bids drifted down and demand was thin; only 11 placees were allocated, 4.9x covered.' },
          { zh: '同一天 89 家配售对象报价从 8.00 元到 19.88 元，专业买方自己也没算成同一个数；发行人有定价意愿，没有议价能力。',
            en: 'The same day, 89 placees bid from CNY 8.00 to 19.88 — professional buyers did not agree either. The issuer wanted a price but had no bargaining power.' }
        ],
        reveal: { zh: '实募 14.22 亿元（净额 13.54 亿元），比计划少募 7.7 亿元、缺口 35%。',
          en: 'Gross proceeds CNY 1.422bn (net 1.354bn), CNY 770m or 35% short of plan.' },
        talk: { zh: '21.92 亿元是计划，不是承诺。买方不肯出价，发行人只能少募——「募满」从来不是默认结果。',
          en: 'CNY 2.192bn was a plan, not a promise. If buyers will not pay, the issuer raises less — a fully covered deal is never the default.' },
        evidence: [
          { zh: '计划 21.92 亿', en: 'Planned 2.192bn' },
          { zh: '实募 14.22 亿', en: 'Raised 1.422bn' },
          { zh: '净额 13.54 亿', en: 'Net 1.354bn' },
          { zh: '缺口 35%', en: '35% short' },
          { zh: '11 家获配 · 4.9 倍', en: '11 placees · 4.9x' }
        ]
      },
      {
        id: '2016b', year: '2016',
        way: { zh: 'A 股定增 · 换个量纲看认购家数', en: 'A-share placement · number of subscribers' },
        who: { zh: '35 名以内特定投资者', en: 'Up to 35 selected investors' },
        audit: { zh: '证监会发审委 · 以年计', en: 'CSRC review · over a year' },
        q: { zh: '2016 年定增，规则允许向不超过 35 名特定投资者发行。你猜最后几家机构真掏了钱？', en: 'The 2016 placement allowed up to 35 investors. How many actually subscribed?' },
        unit: { zh: '家', en: 'institutions' },
        bands: ['≤2', '3–4', '5–6', '7–8', '9–10', '11–20', '≥21'],
        target: 3,
        truth: { zh: '6 家', en: '6 institutions' },
        info: [
          { zh: '2016 年比亚迪定增，规则允许向不超过 35 名特定投资者发行；预案拟发 2.61 亿股、募约 150 亿元。',
            en: 'The 2016 placement allowed up to 35 selected investors, with a plan for 261m shares and about CNY 15bn.' },
          { zh: '锁价 57.40 元/股在预案时就定死；从披露到资金到账走了 13 个月，期间市场已从高位下行。',
            en: 'The CNY 57.40 price was fixed at proposal stage; 13 months to settlement, over which the market fell from its high.' },
          { zh: '实际募资总额 144.73 亿元，连 150 亿元都没募满；定价遵循价格优先、认购金额优先、认购时间优先。',
            en: 'Gross proceeds CNY 14.473bn, short of the 15bn plan; allocation by price, size, then time priority.' }
        ],
        reveal: { zh: '只有 6 家机构认购：国投先进制造 15.00 亿、建信基金 43.05 亿、国寿安保 31.95 亿、三星半导体 30.00 亿、兴业全球 16.73 亿、安信基金 8.00 亿。',
          en: 'Only six subscribed: SDIC Advanced Manufacturing 1.500bn, CCB Principal 4.305bn, China Life AMP 3.195bn, Samsung Semiconductor 3.000bn, Aegon-Industrial 1.673bn, Essence Fund 0.800bn.' },
        talk: { zh: '「不超过 35 名」是上限，不是目标；钱来自极少数大资金——公募、保险、产业资本，而不是公众投资者。定增定价是与少数机构谈判的结果，不是市场集合竞价。',
          en: 'Up to 35 is a cap, not a target. The money came from a handful of large funds, insurers and industrial capital — not the public. Placement pricing is a negotiation with a few, not an open auction.' },
        evidence: [
          { zh: '上限 35 名', en: 'Cap of 35' },
          { zh: '实际 6 家', en: '6 actual' },
          { zh: '募资总额 144.73 亿', en: 'Gross 14.473bn' },
          { zh: '13 个月到账', en: '13 months to cash' }
        ]
      }
    ]
  ];

  /* ---------------- 状态 ---------------- */
  var S = {
    phase: 'rules',      // rules | play | reveal | summary
    gi: 0,               // 组号 0 / 1
    qi: 0,               // 组内题号 0..2
    round: 1,
    rounds: 3,
    brush: 0,            // 当前画笔档位 1..7，0 = 未选
    picks: {},           // picks[qid] = [[11 档], [11 档], [11 档]]
    scores: [],          // 11 组累计格数
    last: null,          // 本题结算结果，只在 lockRound 里算一次
    done: [],            // 已揭晓题 id
    resetArm: false
  };

  function blankRows() {
    var a = [], i;
    for (i = 0; i < NG; i++) a.push(0);
    return a;
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (!raw) return;
      var o = JSON.parse(raw);
      if (!o || typeof o !== 'object') return;
      ['phase', 'gi', 'qi', 'round', 'rounds', 'brush', 'picks', 'scores', 'last', 'done'].forEach(function (k) {
        if (o[k] !== undefined) S[k] = o[k];
      });
      if (!Array.isArray(S.scores) || S.scores.length !== NG) S.scores = blankRows();
      if (S.gi < 0 || S.gi > 1) S.gi = 0;
      if (S.qi < 0 || S.qi > 2) S.qi = 0;
      if (S.rounds !== 2 && S.rounds !== 3) S.rounds = 3;
      if (S.round < 1) S.round = 1;
      if (S.round > S.rounds) S.round = S.rounds;
      if (S.phase === 'play' && !S.picks[cur().id]) S.picks[cur().id] = emptyPicks();
    } catch (e) { /* 坏存档直接忽略，按新局走 */ }
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({
      phase: S.phase, gi: S.gi, qi: S.qi, round: S.round, rounds: S.rounds,
      brush: S.brush, picks: S.picks, scores: S.scores, last: S.last, done: S.done
    })); } catch (e) {}
  }
  function emptyPicks() {
    var a = [], i;
    for (i = 0; i < S.rounds; i++) a.push(blankRows());
    return a;
  }
  function cur() { return QS[S.gi][S.qi]; }
  function pk() { var q = cur(); if (!S.picks[q.id]) S.picks[q.id] = emptyPicks(); return S.picks[q.id]; }
  function gname(i) { return t('gname', i + 1); }

  /* ---------------- 入口卡双语 ---------------- */
  var ENTRY = {
    sec: { zh: '课堂活动', en: 'Class activity' },
    tag: { zh: '教师控场', en: 'Teacher-led' },
    pill: { zh: '开场', en: 'Open' },
    name: { zh: '时点三连 · 拍档猜价', en: 'Three Eras · Call the Price' },
    sub: { zh: '同一家公司三次要钱，每轮多给一条信息，改一次价', en: 'One company, three fundraisings; one new clue each round' }
  };
  function setEntry() {
    var map = { 'tl-e-sec': 'sec', 'tl-e-tag': 'tag', 'tl-e-pill': 'pill', 'tl-e-name': 'name', 'tl-e-sub': 'sub' };
    for (var id in map) {
      if (!map.hasOwnProperty(id)) continue;
      var el = document.getElementById(id);
      if (el) el.textContent = ENTRY[map[id]][L()];
    }
  }

  /* ---------------- 小组件 ---------------- */
  function head(title, right) {
    return '<div class="tl-h"><span class="bar"></span><h3>' + esc(title) + '</h3>'
      + (right ? '<span class="r">' + esc(right) + '</span>' : '') + '</div>';
  }
  function bandLabel(q, b) {
    if (!b) return t('unset');
    return q.bands[b - 1];
  }

  /* 三轮轨迹：全班中位数 + 最会改那一组 + 靶心档 */
  function trajectory(q, rows) {
    var W = 600, H = 190, padL = 44, padR = 20, padT = 18, padB = 34;
    var iw = W - padL - padR, ih = H - padT - padB;
    var n = S.rounds;
    var xs = [], i;
    for (i = 0; i < n; i++) xs.push(padL + (n === 1 ? iw / 2 : iw * i / (n - 1)));
    var yOf = function (b) { return padT + ih - ih * (b - 0.5) / NB; };
    var med = [], g;
    for (i = 0; i < n; i++) {
      var v = rows[i].slice(0).filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; });
      med.push(v.length ? v[Math.floor(v.length / 2)] : 0);
    }
    var bestG = -1, bestD = -1;
    for (g = 0; g < NG; g++) {
      var a = rows[0][g], b = rows[n - 1][g];
      if (!a || !b) continue;
      var d = Math.abs(a - q.target) - Math.abs(b - q.target);
      if (d > bestD) { bestD = d; bestG = g; }
    }
    var s = '<svg class="tl-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(t('trail_h')) + '">';
    for (i = 1; i <= NB; i++) {
      s += '<line x1="' + padL + '" y1="' + yOf(i) + '" x2="' + (W - padR) + '" y2="' + yOf(i) + '" stroke="var(--panel-border)" stroke-width="0.5" stroke-dasharray="2 3"/>';
      s += '<text class="tl-ax" x="' + (padL - 8) + '" y="' + yOf(i) + '" text-anchor="end" dominant-baseline="central">' + i + '</text>';
    }
    s += '<line x1="' + padL + '" y1="' + yOf(q.target) + '" x2="' + (W - padR) + '" y2="' + yOf(q.target) + '" stroke="#E24B4A" stroke-width="2" stroke-dasharray="6 3"/>';
    s += '<text class="tl-tg" x="' + (W - padR - 2) + '" y="' + (yOf(q.target) - 9) + '" text-anchor="end">' + esc(t('target')) + '</text>';
    if (bestG >= 0 && bestD > 0) {
      var pts2 = [];
      for (i = 0; i < n; i++) pts2.push(xs[i] + ',' + yOf(rows[i][bestG]));
      s += '<polyline points="' + pts2.join(' ') + '" fill="none" stroke="#378ADD" stroke-width="1.5" stroke-linejoin="round"/>';
    }
    var pts = [];
    for (i = 0; i < n; i++) if (med[i]) pts.push(xs[i] + ',' + yOf(med[i]));
    if (pts.length > 1) s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#0F6E56" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>';
    for (i = 0; i < n; i++) {
      if (med[i]) s += '<circle cx="' + xs[i] + '" cy="' + yOf(med[i]) + '" r="4.5" fill="var(--panel-solid)" stroke="#0F6E56" stroke-width="2"/>';
      s += '<text class="tl-ax" x="' + xs[i] + '" y="' + (H - 12) + '" text-anchor="middle">' + esc(t('r' + (i + 1))) + '</text>';
    }
    s += '</svg><div class="tl-legend"><span><i class="sw-a"></i>' + esc(t('median')) + '</span>'
      + (bestG >= 0 && bestD > 0 ? '<span><i class="sw-b"></i>' + esc(t('bestmove')) + ' · ' + esc(gname(bestG)) + '</span>' : '')
      + '<span><i class="sw-c"></i>' + esc(t('target')) + '</span></div>';
    return s;
  }

  /* ---------------- 各阶段渲染 ---------------- */
  function rRules() {
    var qset = QS[S.gi];
    var s = head(t('rules_h'), t('group', S.gi + 1));
    s += '<div class="tl-note">' + esc(S.gi === 0 ? t('g1') : t('g2')) + '</div>';
    s += '<div class="tl-rules"><ol>'
      + '<li>' + esc(t('rules_1')) + '</li><li>' + esc(t('rules_2')) + '</li>'
      + '<li>' + esc(t('rules_3')) + '</li><li>' + esc(t('rules_4')) + '</li></ol></div>';
    s += '<div class="tl-opts"><span class="tl-lb">' + esc(t('rounds')) + '</span>'
      + '<button class="tl-chip' + (S.rounds === 3 ? ' on' : '') + '" data-act="rounds" data-v="3">3</button>'
      + '<button class="tl-chip' + (S.rounds === 2 ? ' on' : '') + '" data-act="rounds" data-v="2">2</button></div>';
    s += '<div class="tl-qlist">';
    for (var i = 0; i < qset.length; i++) {
      s += '<div class="tl-qitem"><b>' + esc(qset[i].year) + '</b> ' + esc(tx(qset[i].way))
        + '<span>' + esc(tx(qset[i].q)) + '</span></div>';
    }
    s += '</div>';
    if (S.gi === 1) s += '<div class="tl-note">' + esc(t('keep')) + '</div>';
    s += '<button class="tl-btn" data-act="start">' + esc(t('start')) + '</button>';
    s += '<button class="tl-btn ghost" data-act="reset">' + esc(S.resetArm ? t('reset2') : t('reset')) + '</button>';
    s += '<button class="tl-btn ghost" data-act="back">' + esc(t('back')) + '</button>';
    return s;
  }

  function rPlay() {
    var q = cur(), rows = pk(), i;
    var s = head(tx(q.q), t('qof', S.qi + 1) + ' · ' + t('rof', S.round, S.rounds));
    s += '<div class="tl-meta"><span>' + esc(q.year) + ' · ' + esc(tx(q.way)) + '</span><span>' + esc(t('unit')) + '：' + esc(tx(q.unit)) + '</span></div>';
    s += '<div class="tl-clue"><b>' + esc(S.round === 1 ? t('clue0') : t('clue')) + '</b>'
      + esc(tx(q.info[Math.min(S.round - 1, q.info.length - 1)])) + '</div>';
    if (S.round > 1) s += '<div class="tl-note slim">' + esc(t('inherit')) + '</div>';
    s += head(t('brush'));
    s += '<div class="tl-bands">';
    for (i = 1; i <= NB; i++) {
      /* 绝不能在未揭晓时给靶心档加高亮：那就等于把答案印在按钮上 */
      s += '<button class="tl-band' + (S.brush === i ? ' on' : '') + '" data-act="brush" data-v="' + i + '">'
        + '<span class="tl-bn">' + i + '</span><span class="tl-bv">' + esc(q.bands[i - 1]) + '</span></button>';
    }
    s += '</div>';
    s += head(t('seats'));
    s += '<div class="tl-seats">';
    var left = 0;
    for (i = 0; i < NG; i++) {
      var b = rows[S.round - 1][i];
      if (!b) left++;
      s += '<button class="tl-seat' + (b ? ' set' : '') + '" data-act="pick" data-v="' + (i + 1) + '">'
        + '<span class="tl-sg">' + esc(gname(i)) + '</span>'
        + '<span class="tl-sb">' + esc(bandLabel(q, b)) + '</span></button>';
    }
    s += '</div>';
    s += '<div class="tl-foot"><span class="' + (left ? 'warn' : 'ok') + '">'
      + esc(left ? t('need', left) : t('allset')) + '</span></div>';
    s += '<button class="tl-btn" data-act="lock">' + esc(S.round < S.rounds ? t('lock2') : t('lock')) + '</button>';
    s += '<button class="tl-btn ghost" data-act="back">' + esc(t('back')) + '</button>';
    return s;
  }

  /* 结算只在 lockRound 进入 reveal 时做一次。
     ★不能写在 rReveal 里：语言切换、刷新、存档恢复都会触发重渲染，
       分数会被反复累加，一题能翻好几倍。 */
  function settle() {
    var q = cur(), rows = pk(), i, g;
    var last = rows[S.rounds - 1];
    var gains = [], stubborn = [], bestG = -1, bestD = -1;
    for (g = 0; g < NG; g++) {
      var d = last[g] ? Math.abs(last[g] - q.target) : NB;
      gains.push(d);
      S.scores[g] = (S.scores[g] || 0) + d;
      var same = last[g] > 0;
      for (i = 1; i < S.rounds; i++) if (rows[i][g] !== rows[0][g]) same = false;
      if (same) stubborn.push(gname(g));
      var mv = (rows[0][g] && last[g]) ? Math.abs(rows[0][g] - q.target) - Math.abs(last[g] - q.target) : 0;
      if (mv > bestD) { bestD = mv; bestG = g; }
    }
    S.last = { gains: gains, stubborn: stubborn, bestG: bestG, bestD: bestD };
  }

  function rReveal() {
    var q = cur(), rows = pk(), i, g;
    if (!S.last) settle();   // 只兜底：正常路径已在 lockRound 结算过
    var gains = S.last.gains, stubborn = S.last.stubborn;
    var bestG = S.last.bestG, bestD = S.last.bestD;
    var s = head(t('reveal_h'), t('qof', S.qi + 1));
    s += '<div class="tl-truth"><span class="tl-tl">' + esc(t('truth')) + '</span>'
      + '<span class="tl-tv">' + esc(tx(q.truth)) + '</span>'
      + '<span class="tl-tb">' + esc(t('bandshort', q.target)) + ' · ' + esc(q.bands[q.target - 1]) + ' ' + esc(tx(q.unit)) + '</span></div>';
    s += '<div class="tl-reveal"><p>' + esc(tx(q.reveal)) + '</p></div>';
    s += head(t('trail_h'));
    s += '<div class="tl-chart">' + trajectory(q, rows) + '</div>';
    s += head(t('talk_h'));
    s += '<div class="tl-talk">' + esc(tx(q.talk)) + '</div>';
    s += head(t('evi_h'));
    s += '<div class="tl-evi">';
    for (i = 0; i < q.evidence.length; i++) s += '<span class="tl-ec">' + esc(tx(q.evidence[i])) + '</span>';
    s += '</div>';
    s += head(t('score_h'));
    s += '<div class="tl-scores">';
    var min = Math.min.apply(null, S.scores);
    for (g = 0; g < NG; g++) {
      s += '<div class="tl-sc' + (S.scores[g] === min ? ' win' : '') + '"><b>' + esc(gname(g)) + '</b>'
        + '<span>' + esc(t('pts', gains[g])) + '</span><em>' + esc(t('total')) + ' ' + S.scores[g] + '</em></div>';
    }
    s += '</div>';
    s += '<div class="tl-note">' + esc(t('mostmove', bestG >= 0 && bestD > 0 ? gname(bestG) : t('none')))
      + '　·　' + esc(t('stubborn', stubborn.length ? stubborn.join('、') : t('none'))) + '</div>';
    s += '<button class="tl-btn" data-act="next">' + esc(S.qi < 2 ? t('nextq') : t('summary')) + '</button>';
    return s;
  }

  function rSummary() {
    var qset = QS[S.gi], i;
    var s = head(t('cmp_h'), t('group', S.gi + 1));
    s += '<div class="tl-cmp"><div class="tl-tr"><b>' + esc(t('c1')) + '</b><b>' + esc(t('c2')) + '</b><b>'
      + esc(t('c3')) + '</b><b>' + esc(t('c4')) + '</b><b>' + esc(t('c5')) + '</b></div>';
    for (i = 0; i < qset.length; i++) {
      var q = qset[i];
      s += '<div class="tl-tr"><span>' + esc(q.year) + '</span><span>' + esc(tx(q.way)) + '</span><span>'
        + esc(tx(q.who)) + '</span><span>' + esc(tx(q.audit)) + '</span><span class="tl-blank">' + esc(t('blank')) + '</span></div>';
    }
    s += '</div>';
    var min = Math.min.apply(null, S.scores), wins = [];
    for (i = 0; i < NG; i++) if (S.scores[i] === min) wins.push(gname(i));
    s += '<div class="tl-champ">' + esc(t('champ')) + '：<b>' + esc(wins.join('、')) + '</b>　' + esc(t('pts', min)) + '</div>';
    s += '<div class="tl-note">' + esc(t('done')) + '：' + S.done.length + ' / 6</div>';
    if (S.gi === 0) s += '<button class="tl-btn" data-act="again">' + esc(t('again')) + '</button>';
    else s += '<button class="tl-btn" data-act="back">' + esc(t('again2')) + '</button>';
    s += '<button class="tl-btn ghost" data-act="reset">' + esc(S.resetArm ? t('reset2') : t('reset')) + '</button>';
    return s;
  }

  function render() {
    var s = '';
    if (S.phase === 'rules') s = rRules();
    else if (S.phase === 'play') s = rPlay();
    else if (S.phase === 'reveal') s = rReveal();
    else s = rSummary();
    root.innerHTML = '<div class="tl-root">' + s + '</div>';
    setEntry();
    save();
  }

  /* ---------------- 动作 ---------------- */
  function start() {
    S.phase = 'play'; S.round = 1; S.brush = 0; S.last = null;
    S.picks[cur().id] = emptyPicks();
    render();
  }
  function lockRound() {
    var rows = pk(), i, left = 0;
    for (i = 0; i < NG; i++) if (!rows[S.round - 1][i]) left++;
    if (left) { flash(t('need', left)); return; }
    if (S.round < S.rounds) {
      /* 下一轮继承本轮档位，教师只点要改的组 */
      for (i = 0; i < NG; i++) rows[S.round][i] = rows[S.round - 1][i];
      S.round++; S.brush = 0; S.phase = 'play';
    } else {
      S.phase = 'reveal';
      settle();
      var id = cur().id;
      if (S.done.indexOf(id) < 0) S.done.push(id);
    }
    render();
  }
  function next() {
    if (S.qi < 2) { S.qi++; start(); }
    else { S.phase = 'summary'; render(); }
  }
  function again() {
    S.gi = 1; S.qi = 0; S.round = 1; S.brush = 0;
    S.phase = 'rules'; S.resetArm = false; S.last = null;
    render();
  }
  function resetAll() {
    try { localStorage.removeItem(STORE); } catch (e) {}
    S.phase = 'rules'; S.gi = 0; S.qi = 0; S.round = 1; S.rounds = 3;
    S.brush = 0; S.picks = {}; S.scores = blankRows();
    S.last = null; S.done = []; S.resetArm = false;
    render();
  }
  function flash(msg) {
    var el = root.querySelector('.tl-foot span');
    if (el) { el.textContent = msg; el.className = 'warn'; }
  }

  root.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el || !root.contains(el)) return;
    var act = el.getAttribute('data-act');
    var v = parseInt(el.getAttribute('data-v'), 10);
    if (act === 'back') { if (window.GM) window.GM.show('home'); return; }
    if (act === 'start') { start(); return; }
    if (act === 'rounds') { S.rounds = (v === 2 ? 2 : 3); if (S.round > S.rounds) S.round = S.rounds; render(); return; }
    if (act === 'brush') { S.brush = v; render(); return; }
    if (act === 'pick') {
      if (!S.brush) return;
      pk()[S.round - 1][v - 1] = S.brush;
      render(); return;
    }
    if (act === 'lock') { lockRound(); return; }
    if (act === 'next') { next(); return; }
    if (act === 'again') { again(); return; }
    if (act === 'reset') {
      if (!S.resetArm) { S.resetArm = true; render(); return; }
      resetAll(); return;
    }
  });

  /* 语言切换：i18n 层同步派发 ibk:lang，另加 MutationObserver 兜底 */
  var lastLang = L();
  window.addEventListener('ibk:lang', function () { lastLang = L(); render(); });
  new MutationObserver(function () {
    var now = L();
    if (now !== lastLang) { lastLang = now; render(); }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  /* ---------------- 对外接口（验收脚本用） ---------------- */
  window.TL = {
    go: function () { render(); if (window.GM) window.GM.show('tl'); },
    state: S,
    questions: QS,
    start: start,
    setRounds: function (n) { S.rounds = (n === 2 ? 2 : 3); render(); },
    setBrush: function (b) { S.brush = b; render(); },
    pick: function (g, b) {
      if (b != null) S.brush = b;
      pk()[S.round - 1][g - 1] = S.brush;
      render();
    },
    fill: function (b) {
      var rows = pk(), i;
      for (i = 0; i < NG; i++) rows[S.round - 1][i] = b;
      S.brush = b; render();
    },
    lock: lockRound,
    next: next,
    again: again,
    reset: resetAll,
    qid: function () { return cur().id; },
    phase: function () { return S.phase; }
  };

  load();
  render();
})();

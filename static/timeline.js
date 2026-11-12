/* ===================================================================
   时点三连（教师控场 · 三轮报价）
   —— 一台设备投屏，11 组各报一档，每轮多给一条信息、可改可不改，
      三轮后翻出真实结果，看全班报价怎么被信息推动。
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
    ename:     { zh: '时点三连 · 三轮报价', en: 'Three Eras · Three Rounds of Bidding' },
    esub:      { zh: '同一家公司四次融资，每轮多给一条信息，可以改一次价', en: 'One company, four fundraisings; one new clue each round, one re-quote' },

    rules_h:   { zh: '开组前 · 30 秒说清规则', en: 'Before you start · 30-second rules' },
    rules_1:   { zh: '大屏给一道题和一个参考数。各组报一个具体数字，再说一句为什么报这个数。教师按组号记下，系统自动归到第几档。', en: 'The screen shows one question and one reference number. Each group calls a number and says why. The teacher records it by group; the band is worked out automatically.' },
    rules_2:   { zh: '每轮 60 秒，会多亮一条信息。可以改价，也可以不改。', en: 'Each round reveals one more clue. You may change your call or keep it.' },
    rules_3:   { zh: '三轮后翻出真实结果：报价离它隔几档，就记几分，三题累计越低越好。', en: 'After three rounds the actual result flips. Your score is how many bands away you are; lowest total across three questions wins.' },
    rules_4:   { zh: '每次报的数都自动存在这台电脑里，讲完可以回头比第一次报了多少，不用另填问卷。', en: 'Every number is saved on this computer, so you can compare it with your first call later. No extra form to fill in.' },
    start:     { zh: '开始答题', en: 'Start' },
    rounds:    { zh: '本组轮数', en: 'Rounds' },
    group:     { zh: '第 {1} 组题', en: 'Set {1}' },
    qof:       { zh: '第 {1} / 3 题', en: 'Question {1} of 3' },
    rof:       { zh: '第 {1} 轮 / 共 {2} 轮', en: 'Round {1} of {2}' },
    what:      { zh: '本轮报价', en: 'Your quote' },
    base_h:    { zh: '参考数', en: 'Reference number' },
    quote_h:   { zh: '各组报价 · 填数字，回车跳下一组', en: 'Quote per group · type a number, Enter jumps to the next' },
    in_ph:     { zh: '填数', en: 'quote' },
    dev_hi:    { zh: '比参考数高', en: 'above the reference' },
    dev_lo:    { zh: '比参考数低', en: 'below the reference' },
    dev_eq:    { zh: '正好等于参考数', en: 'on the reference' },
    gap_h:     { zh: '全班中位数 → 真实结果', en: 'Class median → actual result' },
    gap_same:  { zh: '全班中位数正好等于真实结果', en: 'The median equals the actual result' },
    unit:      { zh: '单位', en: 'Unit' },
    brush:     { zh: '先选一档，再点组号（可连点）', en: 'Pick a band, then tap group numbers (you can tap several in a row)' },
    seats:     { zh: '11 组本轮的档位', en: 'Bands for the 11 groups' },
    unset:     { zh: '未报', en: 'No bid' },
    clue:      { zh: '本轮新信息', en: 'New clue this round' },
    clue0:     { zh: '题目背景', en: 'Background' },
    lock:      { zh: '锁定本轮 · 看报价怎么变', en: 'Lock this round' },
    lock2:     { zh: '锁定本轮 · 下一轮', en: 'Lock this round' },
    need:      { zh: '还有 {1} 组没报价', en: '{1} groups have not quoted yet' },
    inherit:   { zh: '上一轮的数自动带过来，只改要改的组就行', en: 'Last round carries over; change only the groups that need it' },

    reveal_h:  { zh: '揭晓 · 真实结果', en: 'Reveal · the actual result' },
    truth:     { zh: '真实结果', en: 'Actual result' },
    talk_h:    { zh: '讲评一句话', en: 'Debrief in one line' },
    evi_h:     { zh: '证据卡（公告里的原始数字）', en: 'Evidence card (published figures)' },
    trail_h:   { zh: '全班报价怎么变', en: 'How the class moved' },
    median:    { zh: '全班中位数（排在正中间那个）', en: 'Class median (the middle number)' },
    bestmove:  { zh: '最会改', en: 'Best correction' },
    target:    { zh: '答案在第几档', en: 'Answer band' },
    score_h:   { zh: '本题记分（格数越小越好）', en: 'Score this question (fewer bands is better)' },
    total:     { zh: '累计', en: 'Total' },
    mostmove:  { zh: '最会改：{1}', en: 'Best correction: {1}' },
    stubborn:  { zh: '一动不动：{1}', en: 'Never moved: {1}' },
    none:      { zh: '无', en: 'None' },
    nextq:     { zh: '下一题', en: 'Next question' },
    summary:   { zh: '本组小结 · 三次融资对照', en: 'Set summary · three fundraisings compared' },

    cmp_h:     { zh: '同一家公司，不同的定价权', en: 'One company, different pricing power' },
    kp_h:      { zh: '本组要点 · 三个算法', en: 'Key takeaways · three calculations' },
    kp_c1:     { zh: '算什么', en: 'What it works out' },
    kp_c2:     { zh: '怎么算', en: 'Formula' },
    kp_c3:     { zh: '把本题的数放进去', en: 'With this set of numbers' },
    kp_note:   { zh: '这三个数都来自刚才做过的题，换个问法一算就出来。', en: 'All three come from the questions you just answered.' },
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
    g2:        { zh: '第 2 组 · 同样的年份，改问另一个数', en: 'Set 2 · the same years, a different number' },
    g1:        { zh: '第 1 组 · 三次卖股票找钱', en: 'Set 1 · three ways of selling shares' },
    keep:      { zh: '上一组比分保留，累计计分', en: 'Previous scores kept; totals accumulate' },
    done:      { zh: '已打完的题', en: 'Questions played' },
    gname:     { zh: '第 {1} 组', en: 'Group {1}' },
    bandshort: { zh: '第 {1} 档', en: 'Band {1}' },
    pts:       { zh: '{1} 格', en: '{1} bands' },
    allset:    { zh: '全部 11 组已报价', en: 'All 11 groups have quoted' },
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
        way: { zh: '国内上市 · 先问机构肯出多少', en: 'A-share IPO · book building' },
        who: { zh: '国内的大机构（基金、券商）', en: 'Domestic institutional bidders' },
        audit: { zh: '监管部门审批 · 几个月', en: 'CSRC review · months' },
        q: { zh: '2011 年比亚迪回 国内上市，要先问一圈机构愿意出多少钱。你这一栏填多少元？', en: 'BYD returns to the A-share market in 2011. Institutions are first asked what they would pay. What number do you write?' },
        unit: { zh: '元 / 股', en: 'CNY / share' },
        bands: ['≤15', '15–18', '18–21', '21–24', '24–27', '27–30', '≥30'],
        target: 3,
        base: { v: 27.75, note: { zh: '要想募够 21.92 亿，每股得卖 21.92 亿 ÷ 7,900 万股 = 27.75 元。这只是按计划算出来的数，不是真成交价。同一天买方报价从 8 元到 22 元、多数在 20 元以下——你要报的是买方肯掏的数，别贴着计划价往上写。', en: 'Full-cover price: CNY 2.192bn ÷ 79m shares = 27.75 — a teaching reference for a fully raised plan, not a traded price. Buyers bid from 8.00 to 22.00 that day, mostly below 20. Quote what buyers will pay, not the plan price.' } },
        tv: 18.00,
        dec: 2,
        truth: { zh: '18.00 元 / 股', en: '18.00 CNY / share' },
        info: [
          { zh: '2011 年，比亚迪回 国内上市；上市材料里写计划募 21.92 亿元，计划发行 7,900 万股。',
            en: '2011: BYD lists on the Shenzhen SME board via book building. The prospectus plans to raise CNY 2.192bn by issuing 79m shares (3.36% of enlarged capital).' },
          { zh: '帮它卖股票的那家券商写了份估值报告，觉得每股值 21.08—30.81 元，向机构介绍完后建议卖 22 元；这只是券商估的范围，不是让大家照着报的价。那阵子新股一上市就比发行价低，很常见，比亚迪的港股已从 88 港元跌到 22.95 港元。',
            en: 'The valuation report of the lead underwriter gives a fair-value range of CNY 21.08–30.81 and recommends 22 after the roadshow — a valuation range, not a bidding range. New issues were breaking price at the time and BYD H-shares had fallen from HKD 88 to 22.95.' },
          { zh: '2011 年国内股市整体变便宜；来报价的 89 家机构，报价从 8.00 元到 22.00 元（国泰君安、长江证券报 8 元，兴业基金报 22 元），最高比最低高 1.75 倍。公司表态「要让价，而且不是让 1 元、2 元」，宁愿少收钱也要把价降到买方肯出的一侧。',
            en: 'A-share valuations fall through 2011. Bids from 89 offline placees range from CNY 8.00 to 22.00 — the top is 1.75x the bottom. The issuer says it must give on price, and not by one or two yuan, accepting a smaller raise to meet buyers.' }
        ],
        reveal: { zh: '最后卖 18.00 元/股，一共收到 14.22 亿元（扣掉费用到手 13.54 亿元）——比券商估的最低价还低约 15%，比计划少收 7.70 亿元、少了 35%；出价不低于 18 元的申报有 7,700 万股，是给机构那部分 1,500 万股的 5.13 倍。',
          en: 'CNY 18.00 per share; gross proceeds CNY 1.422bn (net 1.354bn) — about 15% below the bottom of the valuation range, 35% short of plan. Eligible bids of 77m shares were 5.13x the 15m offered offline.' },
        talk: { zh: '估值范围是券商报的，最后卖多少钱是买方说了算，真实结果比券商估的最低价还低约 15%。同一天 89 家机构从 8 元报到 22 元，连他们自己都没算到一块去——定价权在出钱的人手里，谁更等得起谁说了算。',
          en: 'The underwriter proposes the range; buyers set the price — the truth sits about 15% below the floor of that range. 89 offline placees bid from 8.00 to 22.00 the same day. Pricing power sits with the buyer; bargaining power depends on who can wait.' },
        evidence: [
          { zh: '18.00 元 / 股', en: 'CNY 18.00 / share' },
          { zh: '21.92 亿 → 14.22 亿', en: '2.192bn → 1.422bn' },
          { zh: '21.08—30.81 元', en: 'CNY 21.08–30.81' },
          { zh: '8.00—22.00 元', en: 'CNY 8.00–22.00' },
          { zh: '出价够 18 元的 7,700 万股 · 5.13 倍', en: '77m eligible shares · 5.13x' }
        ]
      },
      {
        id: '2016', year: '2016',
        way: { zh: '国内增发 · 只卖给几家、价格写死', en: 'A-share private placement · fixed price' },
        who: { zh: '不超过 10 家机构', en: 'Up to 10 selected investors' },
        audit: { zh: '监管部门审批 · 一年多', en: 'CSRC review · over a year' },
        q: { zh: '2015 年 6 月，公司定了个方案：只卖给几家机构，价格当场写死，签完再等批准。这个价你定多少？', en: 'In June 2015 BYD agrees to sell shares to a few institutions at a price fixed on the spot, then waits for approval. What price do you fix?' },
        unit: { zh: '元 / 股', en: 'CNY / share' },
        bands: ['≤40', '40–50', '50–60', '60–70', '70–80', '80–90', '≥90'],
        target: 3,
        base: { v: 57.47, note: { zh: '要想收够 150 亿，2.61 亿股每股得卖 150 亿 ÷ 2.61 亿股 ≈ 57.47 元（按方案里的数倒推的课堂参照，不是公告里的算法）。写死的价只能贴着它定：定高了买的人不签，定低了钱收不够。', en: 'Full-cover price: CNY 15bn ÷ 261m shares ≈ 57.47 — a teaching back-calculation from the plan, not the official pricing formula. A fixed price has to sit on it: higher and nobody signs, lower and the deal falls short.' } },
        tv: 57.40,
        dec: 2,
        truth: { zh: '57.40 元 / 股', en: '57.40 CNY / share' },
        info: [
          { zh: '2015 年 6 月股价正高，比亚迪公布方案：准备发 2.61 亿股、收约 150 亿元，最多卖给 10 家，价格在方案里就写死。',
            en: 'June 2015, at a market high: BYD files a placement plan for 261m shares and about CNY 15bn, with no more than 10 investors and a price fixed at proposal stage.' },
          { zh: '写死价格时股价在高位，但从公布方案到钱到账走了 13 个月；到时候市价约 47 元，比 57.40 元写死的价低约 18%——这是跟写死的价差，不是大盘跌了多少。',
            en: 'The price was set at a high, but 13 months passed before the cash arrived. By then the market price was about CNY 47, roughly 18% below the CNY 57.40 lock — a gap to the lock price, not a fall in the index.' },
          { zh: '分给谁按「谁出价高、谁买得多、谁先报名」排；最后一共收到 144.73 亿元，连 150 亿元都没收够。',
            en: 'Allocation follows price, size, then time priority. Gross proceeds came to CNY 14.473bn — short of the 15bn plan.' }
        ],
        reveal: { zh: '写死 57.40 元/股；实际发了 2.5214 亿股、一共收到 144.73 亿元（扣掉费用约 143.69 亿元），连 150 亿元都没收够。',
          en: 'CNY 57.40 per share; 252.14m shares issued for CNY 14.473bn gross (about 14.369bn net) — short of plan.' },
        talk: { zh: '价格写死了，时间锁不住。好处是价格不再变，代价是这 13 个月里股价涨还是跌都得买的人自己扛。最后只有 6 家大机构掏钱——这个价是跟少数几家谈出来的，不是大家公开竞价。',
          en: 'The price was locked; the clock was not. Fixing the price buys certainty at the cost of carrying 13 months of market risk. Only six institutions subscribed — a placement is negotiated with a few big funds, not an open auction.' },
        evidence: [
          { zh: '57.40 元 / 股', en: 'CNY 57.40 / share' },
          { zh: '2.61 亿股 → 2.5214 亿股', en: '261m → 252.14m shares' },
          { zh: '150 亿 → 144.73 亿', en: '15bn → 14.473bn' },
          { zh: '13 个月', en: '13 months' },
          { zh: '6 家机构买了', en: '6 subscribers' }
        ]
      },
      {
        id: '2021', year: '2021',
        way: { zh: '港股增发 · 比市价便宜卖', en: 'H-share placement · discount to market' },
        who: { zh: '境外的大机构', en: 'International institutions' },
        audit: { zh: '港交所 · 几天', en: 'HKEX · a few days' },
        q: { zh: '2021 年比亚迪在港股连着两次增发新股，都比当时的市价便宜一点、当晚就定价。你要求便宜百分之几？', en: 'BYD runs two H-share placements in 2021, priced at a discount overnight. How many points of discount do you demand?' },
        unit: { zh: '%（比市价便宜多少）', en: '% discount' },
        bands: ['≤4', '4–6', '6–8', '8–10', '10–12', '12–14', '≥14'],
        target: 3,
        base: { v: 0, note: { zh: '参考数 = 一点不便宜，就按当天市价 244 港元卖——这只是「最低能低到哪」，不是答案。当天想买的人特别多（200 多家大基金抢，要买的量远超要卖的量），所以这是近几年同类大单里让价最少的一次：便宜的幅度是个位数，而且偏小。便宜得越少，老股东越不吃亏；但一点不便宜，当晚没人肯接。', en: 'Anchor = zero discount: taking the stock at the HKD 244 market price — that is the floor, not the landing point. Over 200 long-only and sovereign funds joined and the deal was heavily oversubscribed, making it the smallest discount among comparable HK placements in years: a single-digit figure, on the low side. A smaller discount dilutes existing holders less; too small and nobody signs.' } },
        tv: 7.8,
        dec: 1,
        truth: { zh: '7.8%（第二次 6.9%）', en: '7.8% (6.9% for the second)' },
        info: [
          { zh: '2021 年 1 月，比亚迪港股市价 244 港元，是当时最高的时候。它要一次卖 1.33 亿股新股、总共能收约 299 亿港元，不用等国内审批，几天钱就到账。',
            en: 'January 2021: BYD H-shares trade at HKD 244, a historic high. It sells 133m new shares at once — about HKD 29.9bn gross — with no domestic review and cash arriving in days.' },
          { zh: '买的人第二天就能卖，但得一口气拿出约 299 亿港元：把股价买跌的风险、钱压在那里的成本，都得自己扛，所以不给「批发折扣」当晚没人肯接。但这次想买的人特别多——200 多家大基金抢，要买的量远超要卖的量，便宜的幅度被压成近几年同类大单里最小。对照 2016 年那次：从定方案到钱到账约 13 个月，拿到股票后还有 12 个月不能卖，压这么久，要的好处远不止这几个点。',
            en: 'Buyers can sell the next day, yet must swallow about HKD 29.9bn at once — price impact and funding sit with them, and without a wholesale discount nobody signs that night. But demand was exceptional: over 200 long-only and sovereign funds, multiple times covered, so the discount was compressed to the smallest among comparable deals in years. Compare 2016: about 13 months from plan to cash plus a 12-month lock-up — a hold that long costs far more than a few points.' },
          { zh: '每多便宜 1 个点，公司就少收约 3.2 亿港元（1.33 亿股 × 244 港元 × 1%，课堂估算）——扩建工厂正等这笔钱。而且年内还想再卖一次，这次让太多，下次就没人按好价钱接了。这里的百分比是拿「前一天收盘价」比的，先认清是跟谁比。',
            en: 'Each extra point of discount costs the company about HKD 320m (133m shares × 244 × 1%, a teaching estimate) — cash it needs for capacity, and the year is not over: give away too much now and nobody will trust the next price. The discount is measured against the previous trading day close; fix that convention before you answer.' }
        ],
        reveal: { zh: '第一次：按当天市价值约 324.5 亿港元，实际只收 299.25 亿——少收的约 25 亿港元，换的是「几天就拿到钱」。第二次便宜 6.9%；两次扣掉费用共到手约 435 亿港元。',
          en: 'At the market price the first tranche was worth about HKD 32.45bn; it raised 29.925bn — about HKD 2.5bn paid for settling in days. The second took a 6.9% discount; net proceeds of the two together about HKD 43.5bn.' },
        talk: { zh: '7.8% 不是手续费，是买的人替公司承担风险和压着钱要的补偿；因为想买的人太多，被压到个位数，成了近几年同类大单里最小的一次。对公司来说，这点让价换来几天到账、不用等批准——同一笔钱，买方叫它便宜，公司叫它买速度的价。2016 年那次从定方案到钱到账约 13 个月、再 12 个月不能卖，来的是有长期打算的钱；这次几天到账，来的是只想做财务投资的机构。',
          en: 'The 7.8% is not a commission; it is the risk-and-funding compensation buyers charge. Demand was so strong that it was compressed into single digits, the smallest discount among comparable deals in years. For the issuer, that concession buys settlement in days with no approval wait — the same money is a discount to one side and the price of speed to the other. The 2016 placement took about 13 months from plan to cash plus 12 more locked up, and strategic capital signed; here it settles in days, and the money comes from pure financial investors.' },
        evidence: [
          { zh: '便宜 7.8% / 6.9%', en: '7.8% / 6.9% discount' },
          { zh: '1.33 亿股 · 占 4.65%', en: '133m shares · 4.65%' },
          { zh: '5,000 万股 · 占 1.75%', en: '50m shares · 1.75%' },
          { zh: '到手 298.01 + 137.44 亿港元', en: 'Net HKD 29.801 + 13.744bn' }
        ]
      }
    ],
    [
      {
        id: '2026', year: '2026',
        way: { zh: '发 3 年期债券 · 收集报价定价', en: 'Interbank MTN · book building' },
        who: { zh: '银行、理财和基金', en: 'Banks and asset managers' },
        audit: { zh: '银行间市场备案 · 两周内', en: 'NAFMII · within two weeks' },
        q: { zh: '2026 年比亚迪要借 50 亿元、借 3 年。做法是让各家机构报一个自己能接受的利息，最后定一个统一的利息。你猜最后会定在多少？', en: 'In 2026 BYD borrows CNY 5bn for three years. Investors each name an interest rate they accept, and one rate is set for everyone. What do you think the final rate will be?' },
        unit: { zh: '%（每年利息）', en: '% coupon' },
        bands: ['≤1.60', '1.60–1.68', '1.68–1.76', '1.76–1.84', '1.84–1.92', '1.92–2.00', '≥2.00'],
        target: 3,
        base: { v: 1.74, note: { zh: '同一天，别家差不多条件、信用最好的 3 年期债券，利息大约 1.74%。报得比它低，等于帮公司省钱、也更可能分到；报得比它高，是想多拿点利息，但一旦超过最后定的那个数，就一分都拿不到。', en: 'The 3-year AAA MTN curve sits at 1.74% that day. Bidding below it squeezes the issuer and makes an allocation more likely; bidding above it asks for more yield, but once it exceeds the final coupon you are out.' } },
        tv: 1.72,
        dec: 2,
        money: { zh: '按 50 亿元、借 3 年算：利息每差 0.01 个百分点，三年就差约 150 万元。', en: 'On CNY 5bn over three years, 1bp ≈ CNY 1.5m.' },
        truth: { zh: '1.72%', en: '1.72%' },
        info: [
          { zh: '2026 年，比亚迪要向机构借 50 亿元、借 3 年；那阵子好资产少、利息普遍很低。',
            en: 'In 2026 BYD issues a CNY 5bn, 3-year MTN in the interbank market, amid scarce assets and low rates.' },
          { zh: '最后只定一个统一的利息：谁报得比它高，一分都买不到；报得不高的人，都按这个统一利息拿。这种发行两周就能办完，公司等不起还能换个时间再发——所以利息报太高，空手的是你。',
            en: 'Book building sets a single coupon: bids above the final coupon get nothing, while bids at or below it are filled at that same coupon. This deal prices within about two weeks, so the issuer can always come back later — bid too high and you are the one left empty-handed.' },
          { zh: '一共 18 家来报、报了 109.2 亿元（约是发行量的 2.18 倍），但其中只有 11 家报的利息没超线，这 11 家一共要 56.9 亿元（1.14 倍）。',
            en: '18 compliant bids totalling CNY 10.92bn (about 2.18x), but only 11 qualified: eligible demand CNY 5.69bn (1.14x).' }
        ],
        reveal: { zh: '最后定的利息是 1.72%；刚好报在这个数上的，大家按申报金额比例分；帮它卖债券的券商自己拿走了 60%。',
          en: 'A 1.72% coupon; the marginal band is allocated pro rata; underwriter proprietary accounts took 60% in total.' },
        talk: { zh: '2.18 倍只是「来了多少人」，1.14 倍才是「真肯按这个利息掏钱的人」，做承销只看后一个。利息每压低 0.01 个百分点，三年就省 150 万元；但压太狠就没人买了，甚至发不出去，所以停在 1.72%。',
          en: 'The 2.18x is how many showed up; 1.14x is how many actually paid — underwriters only use the latter. Each basis point saves CNY 1.5m over three years, but pushing too far kills demand, so it stops at 1.72%.' },
        evidence: [
          { zh: '统一利息 1.72%', en: '1.72% coupon' },
          { zh: '来报的 109.2 亿 · 2.18 倍', en: 'Compliant 10.92bn · 2.18x' },
          { zh: '真肯买的 56.9 亿 · 1.14 倍', en: 'Eligible 5.69bn · 1.14x' },
          { zh: '券商自己拿走 60%', en: '60% to proprietary desks' }
        ]
      },
      {
        id: '2011b', year: '2011',
        way: { zh: '国内上市 · 改问「一共收到多少钱」', en: 'A-share IPO · proceeds instead of price' },
        who: { zh: '国内的大机构（基金、券商）', en: 'Domestic institutional bidders' },
        audit: { zh: '监管部门审批 · 几个月', en: 'CSRC review · months' },
        q: { zh: '同一年，上市材料里写计划募 21.92 亿元；最后每股只卖 18.00 元，比券商估的最低价还低约 15%。按这个价，公司一共收到多少亿？', en: 'The same listing planned to raise CNY 2.192bn, but sold at CNY 18.00 per share, about 15% below the lowest price the underwriter estimated. How much did the company actually receive?' },
        unit: { zh: '亿元（一共收到的钱）', en: 'CNY 100m (gross)' },
        bands: ['≤10', '10–13', '13–16', '16–19', '19–22', '22–25', '≥25'],
        target: 3,
        base: { v: 21.92, note: { zh: '参考数 = 计划募 21.92 亿元。股数 7,900 万股没变，每股从 27.75 元（21.92 ÷ 0.79）降到 18.00 元，收到的钱就按同样比例缩水。', en: 'Anchor = the planned CNY 2.192bn. With 79m shares fixed, the price drops from CNY 27.75 (2.192bn ÷ 79m) to 18.00 — proceeds shrink in the same proportion.' } },
        tv: 14.22,
        dec: 2,
        truth: { zh: '14.22 亿元', en: 'CNY 1.422bn' },
        info: [
          { zh: '2011 年比亚迪回 国内上市，上市材料里写计划募 21.92 亿元、发行 7,900 万股；最后每股定在 18.00 元，比券商估的最低价还低约 15%。',
            en: 'BYD returns to the A-share market in 2011: the prospectus plans to raise CNY 2.192bn on 79m shares, but the deal prices at CNY 18.00 — about 15% below the bottom of the valuation range.' },
          { zh: '来报价的机构越报越低、一起压价；出价不低于 18 元的申报累计 7,700 万股，是给机构那部分 1,500 万股的 5.13 倍——少收钱是因为价钱低，不是没人要。',
            en: 'Bids drifted down as institutions pushed the price lower: eligible bids at CNY 18 or above came to 77m shares, 5.13x the 15m offered offline. The shortfall came from price, not from a lack of demand.' },
          { zh: '同一天来报价的 89 家机构，从 8.00 元报到 22.00 元，连专业买家自己都没算成同一个数；公司想卖个好价，但说了不算。',
            en: 'The same day, 89 placees bid from CNY 8.00 to 22.00 — professional buyers did not agree either. The issuer wanted a price but had no bargaining power.' }
        ],
        reveal: { zh: '一共收到 14.22 亿元（扣掉费用到手 13.54 亿元），比计划少收 7.7 亿元、少了 35%。',
          en: 'Gross proceeds CNY 1.422bn (net 1.354bn), CNY 770m or 35% short of plan.' },
        talk: { zh: '21.92 亿元是计划，不是保证。7,900 万股一股没少发，7.70 亿的差额全来自价钱——公司让掉的是价钱，不是股数。',
          en: 'CNY 2.192bn was a plan, not a promise. All 79m shares were issued; the CNY 770m gap came entirely from price — the issuer gave up price, not size.' },
        evidence: [
          { zh: '计划 21.92 亿', en: 'Planned 2.192bn' },
          { zh: '实际收到 14.22 亿', en: 'Raised 1.422bn' },
          { zh: '扣费用后 13.54 亿', en: 'Net 1.354bn' },
          { zh: '比计划少 35%', en: '35% short' },
          { zh: '出价够 18 元的 7,700 万股 · 5.13 倍', en: '77m eligible shares · 5.13x' }
        ]
      },
      {
        id: '2016b', year: '2016',
        way: { zh: '国内增发 · 站在买的人这边：这笔账不划算', en: 'A-share placement · the buyer\'s side' },
        who: { zh: '保险公司、银行系基金、做实业的钱', en: 'Insurers, bank-backed funds, strategic capital' },
        audit: { zh: '监管部门审批 · 一年多', en: 'CSRC review · over a year' },
        q: { zh: '价格提前写死 57.40 元，买到后 12 个月不能卖。你的钱一年要赚 8% 才划算，那你最多肯出多少钱一股？', en: 'The price is fixed at CNY 57.40 and the shares cannot be sold for 12 months. If your money needs to earn 8% a year, what is the most you would pay per share?' },
        unit: { zh: '元 / 股', en: 'CNY / share' },
        bands: ['≤38', '38–41', '41–44', '44–47', '47–52', '52–57', '≥57'],
        target: 3,
        base: { v: 57.40, note: { zh: '最多肯出的钱 = 将来能卖掉的价 ÷ 1.08。公司想卖 57.40——先拿它算个上限；「将来能卖掉的价」第 2 轮才告诉你。先给个方向：到时候市价会明显低于写死的价（大约低两成），别直接把 57.40 当答案。', en: 'Your ceiling = the price you can exit at ÷ (1 + 8%). The issuer wants 57.40 — start from that and compute a ceiling. What you can actually exit at arrives in round 2. One hint for now: by closing, the market price sits clearly below the lock (roughly 20% lower), so do not just write 57.40 as your ceiling.' } },
        tv: 43.5,
        dec: 1,
        truth: { zh: '43.5 元 / 股（47 ÷ 1.08）', en: 'CNY 43.5 (47 ÷ 1.08)' },
        info: [
          { zh: '2015 年 6 月的方案：按写死的 57.40 元/股发 2.61 亿股、收约 150 亿元，最多卖给 10 家。价格在方案里就写死，签完字只能等批准——这 13 个月里股价涨还是跌，都是买的人自己扛。',
            en: 'The June 2015 proposal: 261m shares at a locked CNY 57.40, about CNY 15bn, to no more than ten subscribers. The price is fixed in the proposal; after signing you can only wait for approval — and the market is your problem for thirteen months.' },
          { zh: '2015 年 6 月正赶上股价最高的时候。等到 2016 年 7 月钱到账，市价只剩约 47 元——写死的 57.40 已经比市价高 22%，一签字账面上就亏了。',
            en: 'June 2015 was the top of that bull run. By the time the deal closed in July 2016 the market price was about CNY 47 — the subscription price of 57.40 sat 22% above it, underwater from day one.' },
          { zh: '新股还要再放 12 个月才能卖，这期间不能退、也不能另买保险。最后只有 6 家掏钱：保险公司、银行系基金、做实业的钱，没有一家是只想靠这笔赚差价的基金。',
            en: 'The shares are then locked for another twelve months — no exit, no hedge. Only six subscribers signed: insurers, bank-backed funds and strategic capital. Not one pure financial investor.' }
        ],
        reveal: { zh: '47 ÷ 1.08 ≈ 43.5 元（这是拿后来的市价回头算的课堂上限，不是历史上的成交价）。写死的价 57.40 比它高 32%。就算钱的成本更低也救不回来：5% 对应 44.8、12% 对应 42.0，全都比 57.40 低——问题不在钱的成本，在价钱本身比市价高。',
          en: '47 ÷ 1.08 ≈ 43.5 — a teaching ceiling reconstructed after the fact from the closing market price, not a historical trade. The actual lock price of 57.40 sits 32% above that ceiling. Cheaper money does not rescue it: 5% gives 44.8 and 12% gives 42.0 — all below 57.40. The gap is not the cost of funds, it is the price.' },
        talk: { zh: '价格提前写死，等批准的 13 个月和不能卖的 12 个月，涨跌都得买的人自己扛。2015 年 6 月正赶上股价最高，等到 2016 年 7 月钱到账，市价已经比买价低 22%——凡是算回报的钱都走了，最后来的 6 家都不是靠这笔赚差价：建信 43.05 亿、国寿安保 31.95 亿（保险）、三星半导体 30.00 亿（做实业）、兴业全球 16.73、国投先进制造 15.00、安信 8.00。6 家一共 144.73 亿，平均每家 24.1 亿——只有管着几百亿的大机构才拿得出这个数。',
          en: 'A fixed price pushes thirteen months of approval risk and twelve months of price risk onto the buyer. Locked in June 2015 at the top of the cycle, the price was already 22% above the market when the deal closed — anyone pricing for a return walks away, and what is left is money that is not trying to earn on this trade: CCB Principal 4.305bn, China Life AMP 3.195bn (insurance), Samsung Semiconductor 3.000bn (strategic), Aegon-Industrial 1.673bn, SDIC Advanced Manufacturing 1.500bn, Essence Fund 0.800bn. Six subscribers, CNY 14.473bn, CNY 2.41bn each — only institutions managing tens of billions can write that cheque.' },
        evidence: [
          { zh: '写死的价 57.40 元', en: 'Locked 57.40' },
          { zh: '当时市价约 47 元', en: 'Market ≈ 47' },
          { zh: '比市价高 22%', en: '22% above market' },
          { zh: '你最多肯出 43.5 元', en: 'Your ceiling 43.5' },
          { zh: '相差 32%', en: '32% gap' }
        ]
      }
    ]
  ];

  /* ---------------- 本组要点：每题一个公式 ----------------
     只用在「本组收官」页，讲的是刚才那道题本身怎么算，
     不改题面、不进题面，所以不会提前泄答案。 */
  var KP = {
    '2011':  { n: '比计划少收了多少', f: '1 − 实际收到的 ÷ 计划要收的', v: '1 − 14.22 ÷ 21.92 = 35%' },
    '2016':  { n: '写死的价比市价高多少', f: '(写死的价 − 当时市价) ÷ 当时市价', v: '写死 57.40 元，当时市价低约 18%' },
    '2021':  { n: '新股占多大比例', f: '新发的股数 ÷ 发完后的总股数', v: '1.33 ÷ 28.6 ≈ 4.65%' },
    '2026':  { n: '真肯买的是要发的几倍', f: '真肯买的钱 ÷ 要发的量', v: '56.9 ÷ 50 = 1.14 倍（按来报的人数算是 2.18 倍）' },
    '2011b': { n: '按计划倒算的每股价钱', f: '计划要收的钱 ÷ 要发的股数', v: '21.92 ÷ 0.79 = 27.75 元（实际只卖 18.00）' },
    '2016b': { n: '买方最多肯出多少钱', f: '将来能卖的价 ÷（1 + 要求的回报）', v: '47 ÷ 1.08 ≈ 43.5 元；写死的 57.40 比它高 32%' }
  };

  /* ---------------- 状态 ---------------- */
  var S = {
    phase: 'rules',      // rules | play | reveal | summary
    gi: 0,               // 组号 0 / 1
    qi: 0,               // 组内题号 0..2
    round: 1,
    rounds: 3,
    brush: 0,            // 当前画笔档位 1..7，0 = 未选
    picks: {},           // picks[qid] = [[11 档], ...]  由 vals 反推，只用于计分与轨迹
    vals: {},            // vals[qid]  = [[11 个具体数值], ...]  学生真正报的那个数
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
      ['phase', 'gi', 'qi', 'round', 'rounds', 'brush', 'picks', 'vals', 'scores', 'last', 'done'].forEach(function (k) {
        if (o[k] !== undefined) S[k] = o[k];
      });
      if (!Array.isArray(S.scores) || S.scores.length !== NG) S.scores = blankRows();
      if (S.gi < 0 || S.gi > 1) S.gi = 0;
      if (S.qi < 0 || S.qi > 2) S.qi = 0;
      if (S.rounds !== 2 && S.rounds !== 3) S.rounds = 3;
      if (S.round < 1) S.round = 1;
      if (S.round > S.rounds) S.round = S.rounds;
      if (S.phase === 'play' && !S.picks[cur().id]) S.picks[cur().id] = emptyPicks();
      if (!S.vals || typeof S.vals !== 'object') S.vals = {};
    } catch (e) { /* 坏存档直接忽略，按新局走 */ }
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({
      phase: S.phase, gi: S.gi, qi: S.qi, round: S.round, rounds: S.rounds,
      brush: S.brush, picks: S.picks, vals: S.vals, scores: S.scores, last: S.last, done: S.done
    })); } catch (e) {}
  }
  function emptyPicks() {
    var a = [], i;
    for (i = 0; i < S.rounds; i++) a.push(blankRows());
    return a;
  }
  function cur() { return QS[S.gi][S.qi]; }
  function pk() { var q = cur(); if (!S.picks[q.id]) S.picks[q.id] = emptyPicks(); return S.picks[q.id]; }
  function vv() {
    var q = cur();
    if (!S.vals[q.id]) {
      S.vals[q.id] = emptyPicks();
      /* 老存档只有档位、没有具体数值（v112 之前的局）：按档位中点补一个，
         否则续玩时输入框全是 0、偏离也全是 0。 */
      var rows = pk(), r, g;
      for (r = 0; r < rows.length; r++) {
        for (g = 0; g < NG; g++) if (rows[r][g]) S.vals[q.id][r][g] = midOf(q, rows[r][g]);
      }
    }
    return S.vals[q.id];
  }
  /* 写一个组的报价：数值进 vals，档位由数值反推进 picks —— 两个结构永远同步 */
  function setVal(g, raw) {
    var q = cur(), rows = pk(), vs = vv(), r = S.round - 1;
    var txt = String(raw == null ? '' : raw).replace(/[^0-9.\-]/g, '');
    var v = txt === '' ? NaN : parseFloat(txt);
    if (!isFinite(v)) { vs[r][g] = 0; rows[r][g] = 0; return null; }
    vs[r][g] = v; rows[r][g] = bandOf(q, v);
    return v;
  }
  function gname(i) { return t('gname', i + 1); }

  /* ---------------- 入口卡双语 ---------------- */
  var ENTRY = {
    sec: { zh: '课堂活动', en: 'Class activity' },
    tag: { zh: '教师控场', en: 'Teacher-led' },
    pill: { zh: '环节二', en: 'Step 2' },
    name: { zh: '时点三连 · 三轮报价', en: 'Three Eras · Three Rounds of Bidding' },
    sub: { zh: '同一家公司四次融资，每轮多给一条信息，可以改一次价', en: 'One company, four fundraisings; one new clue each round' }
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

  /* ---------------- 数值 ↔ 档位 ----------------
     学生报的是一个具体数字（1.72 / 57.40 / 7.8），档位只是计分粒度，由这个数反推。
     bands 是 '≤1.60' / '1.60–1.68' / '≥2.00' 这种字符串，解析成上下界后逐档比。
     判档用严格小于：v 正好压在边界上就归下一档，不做特殊处理。 */
  var BND = {};
  function bounds(q) {
    if (BND[q.id]) return BND[q.id];
    var out = [], i, s, arr;
    for (i = 0; i < q.bands.length; i++) {
      s = q.bands[i];
      if (s.indexOf('≤') === 0) out.push([-Infinity, parseFloat(s.slice(1))]);
      else if (s.indexOf('≥') === 0) out.push([parseFloat(s.slice(1)), Infinity]);
      else { arr = s.split('–'); out.push([parseFloat(arr[0]), parseFloat(arr[1])]); }
    }
    BND[q.id] = out;
    return out;
  }
  function bandOf(q, v) {
    var b = bounds(q), i;
    for (i = 0; i < b.length; i++) if (v < b[i][1]) return i + 1;
    return b.length;
  }
  /* 档位 → 一个代表性数值，只给验收脚本和老接口（TL.pick / TL.fill）用 */
  function midOf(q, b) {
    var r = bounds(q)[b - 1], lo = r[0], hi = r[1], eps;
    if (!isFinite(lo)) { eps = Math.abs(hi) > 100 ? 1 : 0.01; return +(hi - eps).toFixed(2); }
    if (!isFinite(hi)) { eps = Math.abs(lo) > 100 ? 1 : 0.01; return +(lo + eps).toFixed(2); }
    return +((lo + hi) / 2).toFixed(2);
  }
  /* 数字与单位的统一写法：元/股 保留两位、% 不留空格、家数取整。
     这些东西分散写会各自走样，所以只留一个出口。 */
  function unitOf(q) { return tx(q.unit).split(/[（(]/)[0].trim().replace(/\s*\/\s*/g, '/'); }
  function numTxt(q, v) {
    var d = q.dec == null ? 2 : q.dec, u = unitOf(q);
    var s = (+v).toFixed(d);
    /* 英文 unit 是 '% coupon' 这种写法，首个字符是 % 就只拼百分号，单位名交给小标题 */
    return u.charAt(0) === '%' ? s + '%' : s + ' ' + u;
  }
  /* 报价与基准的偏离怎么说：利率类按 bp，其余按原单位差 */
  function devText(q, v) {
    var b = q.base;
    if (!b || !isFinite(v)) return '';
    var d = v - b.v;
    if (!d) return t('dev_eq');
    var a = Math.abs(d), txt;
    if (q.id === '2026') txt = a.toFixed(2) + (L() === 'zh' ? ' 个百分点' : ' percentage points');
    else txt = numTxt(q, a);
    return (d > 0 ? t('dev_hi') : t('dev_lo')) + ' ' + txt;
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
    /* 定价基准：先给一个参照系，再让学生报数。没有基准的"填个数"就是猜。 */
    if (q.base) {
      s += '<div class="tl-anchor"><span class="tl-an-h">' + esc(t('base_h')) + '</span>'
        + '<p>' + esc(tx(q.base.note)) + '</p></div>';
    }
    s += head(t('quote_h'), tx(q.unit));
    s += '<div class="tl-quote">';
    var vs = vv();
    var left = 0;
    for (i = 0; i < NG; i++) {
      var b = rows[S.round - 1][i], num = vs[S.round - 1][i];
      if (!b) left++;
      s += '<div class="tl-q' + (b ? ' set' : '') + '" data-g="' + (i + 1) + '">'
        + '<span class="tl-qg">' + esc(gname(i)) + '</span>'
        + '<input class="tl-in" type="number" step="any" inputmode="decimal" data-act="val" data-v="' + (i + 1) + '"'
        + ' value="' + (b ? esc(num) : '') + '" placeholder="' + esc(t('in_ph')) + '"'
        + ' aria-label="' + esc(gname(i)) + '">'
        + '<span class="tl-qd">' + esc(b ? t('bandshort', b) + ' · ' + q.bands[b - 1] : t('unset')) + '</span>'
        + (b ? '<em class="tl-dev">' + esc(devText(q, num)) + '</em>' : '')
        + '</div>';
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
    /* 全班中位数 vs 真值：把"差多少"落到具体数上，利率题再折成钱。
       这是这一步唯一的"算"，也是学生最该带走的那个数。 */
    var vs2 = vv(), nums = [], k;
    for (k = 0; k < NG; k++) { var nv = vs2[S.rounds - 1][k]; if (nv) nums.push(nv); }
    nums.sort(function (a, b) { return a - b; });
    var medv = nums.length ? nums[Math.floor((nums.length - 1) / 2)] : 0;
    if (q.tv != null && medv) {
      var dd = medv - q.tv, ds;
      if (!dd) ds = t('gap_same');
      else if (q.id === '2026') ds = (dd > 0 ? '+' : '−') + Math.abs(dd).toFixed(2) + (L() === 'zh' ? ' 个百分点' : ' percentage points');
      else ds = (dd > 0 ? '+' : '−') + numTxt(q, Math.abs(dd));
      s += '<div class="tl-gap"><span class="tl-gap-h">' + esc(t('gap_h')) + '</span>'
        + '<div class="tl-gap-r"><b>' + esc(numTxt(q, medv)) + '</b><i>→</i><b>' + esc(numTxt(q, q.tv)) + '</b>'
        + '<em>' + esc(ds) + '</em></div>'
        + (q.money ? '<p>' + esc(tx(q.money)) + '</p>' : '')
        + '</div>';
    }
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
    s += head(t('kp_h'), t('group', S.gi + 1));
    s += '<div class="tl-kp"><div class="tl-kp-r tl-kp-hd"><b>' + esc(t('kp_c1')) + '</b><span>'
      + esc(t('kp_c2')) + '</span><em>' + esc(t('kp_c3')) + '</em></div>';
    for (i = 0; i < qset.length; i++) {
      var kk = KP[qset[i].id];
      if (!kk) continue;
      s += '<div class="tl-kp-r"><b>' + esc(kk.n) + '</b><span>' + esc(kk.f) + '</span><em>' + esc(kk.v) + '</em></div>';
    }
    s += '</div>';
    s += '<div class="tl-note">' + esc(t('kp_note')) + '</div>';
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
    S.vals[cur().id] = emptyPicks();
    render();
  }
  function lockRound() {
    var rows = pk(), i, left = 0;
    for (i = 0; i < NG; i++) if (!rows[S.round - 1][i]) left++;
    if (left) { flash(t('need', left)); return; }
    if (S.round < S.rounds) {
      /* 下一轮继承本轮档位，教师只点要改的组 */
      for (i = 0; i < NG; i++) {
        rows[S.round][i] = rows[S.round - 1][i];
        vv()[S.round][i] = vv()[S.round - 1][i];
      }
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
    S.gi = 1; S.qi = 0; S.round = 1; S.brush = 0; S.vals = {};
    S.phase = 'rules'; S.resetArm = false; S.last = null;
    render();
  }
  function resetAll() {
    try { localStorage.removeItem(STORE); } catch (e) {}
    S.phase = 'rules'; S.gi = 0; S.qi = 0; S.round = 1; S.rounds = 3;
    S.brush = 0; S.picks = {}; S.vals = {}; S.scores = blankRows();
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

  /* 报价输入：只就地改这一格，绝不调 render()——render 会重建 DOM，正在打字的光标会丢。
     这是本环节唯一的高频交互，教师会在 11 个格子里连打，不能有一下卡顿。 */
  function syncCell(el) {
    var q = cur();
    var g = parseInt(el.getAttribute('data-v'), 10) - 1;
    var v = setVal(g, el.value);
    var cell = el.closest ? el.closest('.tl-q') : null;
    if (cell) {
      cell.classList.toggle('set', v !== null);
      var d = cell.querySelector('.tl-qd');
      var rows = pk();
      if (d) d.textContent = v !== null
        ? t('bandshort', rows[S.round - 1][g]) + ' · ' + q.bands[rows[S.round - 1][g] - 1]
        : t('unset');
      var em = cell.querySelector('.tl-dev');
      if (v !== null) {
        if (!em) { em = document.createElement('em'); em.className = 'tl-dev'; cell.appendChild(em); }
        em.textContent = devText(q, v);
      } else if (em && em.parentNode) {
        em.parentNode.removeChild(em);
      }
    }
    var left = 0, i;
    for (i = 0; i < NG; i++) if (!rows[S.round - 1][i]) left++;
    var foot = root.querySelector('.tl-foot span');
    if (foot) {
      foot.textContent = left ? t('need', left) : t('allset');
      foot.className = left ? 'warn' : 'ok';
    }
    save();
  }

  root.addEventListener('input', function (e) {
    var el = e.target;
    if (!el || !el.classList || !el.classList.contains('tl-in')) return;
    syncCell(el);
  });

  /* 回车跳到下一组：教师顺序报完 11 组不用碰鼠标 */
  root.addEventListener('keydown', function (e) {
    var el = e.target;
    if (!el || !el.classList || !el.classList.contains('tl-in')) return;
    if (e.key !== 'Enter') return;
    e.preventDefault();
    var g = parseInt(el.getAttribute('data-v'), 10);
    var nx = root.querySelector('.tl-in[data-v="' + (g >= NG ? 1 : g + 1) + '"]');
    if (nx) { nx.focus(); nx.select(); }
  });

  /* 失焦时按本题精度补齐小数位：输 1.7 显示 1.70，十一格才对得齐。
     放在 blur 而不是 input 里，是因为边打字边改格式会把光标顶到后面去。 */
  root.addEventListener('blur', function (e) {
    var el = e.target;
    if (!el || !el.classList || !el.classList.contains('tl-in')) return;
    var q = cur(), d = q.dec == null ? 2 : q.dec;
    var v = parseFloat(el.value);
    if (!isFinite(v)) { el.value = ''; return; }
    el.value = v.toFixed(d);
    save();
  }, true);

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
    /* 老接口保留：验收脚本还按档位调用，这里把档位换算成一个能反推回该档的数值 */
    pick: function (g, b) {
      var q = cur();
      if (b != null) S.brush = b;
      setVal(g - 1, midOf(q, S.brush));
      render();
    },
    fill: function (b) {
      var q = cur(), i;
      for (i = 0; i < NG; i++) setVal(i, midOf(q, b));
      S.brush = b; render();
    },
    setVal: function (g, v) { setVal(g - 1, v); render(); },
    vals: function () { return vv(); },
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

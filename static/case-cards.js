/* ==================================================================
 * iBank · 案例库通用「决策记录卡」（v161 两段式 → v162 三段式）
 * ------------------------------------------------------------------
 * 背景：五维评估 E 维（价值认同与职业伦理）的 e.case 观测点，数据源
 * 标注是「投行教学案例库」，但 v62 起全站只有 case-11（东财转3）的
 * 4.3 实验记录卡埋了 cb_decision 事件——其余 19 个案例是纯阅读内容，
 * 学生在案例库里根本找不到采分入口。
 *
 * v161 参照东财转3 记录卡的结构，为其余 19 个案例各做一张轻量卡；
 * v162 把这 19 张卡升级为与东财转3 同款的三段式：
 *   ① 关键数速填 —— 从案例上方内容里找 2~3 个关键数，即时判对错；
 *   ② 一步测算 / 规则判读 —— 只用段①里的数推一步（比例 / 倍数 /
 *      差额），偏定性的案例改为规则判读小题；即时判对错，只自查、
 *      不上报、不参与评分（与东财转3 卡第②段「两次测算」同口径）；
 *   ③ 情境决策 —— 站到案例当事人的位置二/三选一 + 书面理由
 *      （≥10 字才能提交），提交即上报 type = case_decision 埋点，
 *      由 eval-core 按「理由 ≥20 字=100 / 1~19 字=80 / 无理由=60，
 *      多次提交取最高」的同一口径计入 E 维 e.case。
 *
 * 设计约束（与东财转3 卡一致的口径）：
 *   - 答案常量只写在本文件 CONFIG 里，不写进 DOM、不写进 data 属性；
 *   - 数据按案例 id 分桶存 localStorage（ibank_case_cards_v1），互不覆盖；
 *   - 教师身份在 __ibankTrack 内部就被拦掉，老师演示不会污染统计；
 *   - 事件类型用独立的 case_decision（不是 cb_decision），教师端
 *     「4.3 三环节」面板只认 cb_* 且限第 4 章，新卡不会混进那张表。
 *
 * 每张卡的情境题、选项、测算题都按案例所处章节与特点单独设计：
 *   第0章 中介责任（守住看门人底线）      第1章 业务版图 / 风险失控
 *   第2章 融资方案设计与资本结构          第3章 IPO 定价与发行合规
 *   第4章 再融资工具选择                  第5章 债券承销与信用定价
 *   第6章 ABS 结构设计                    第7章 并购估值 / 控制权 / 融资
 * ================================================================== */
(function () {
  'use strict';

  var KEY = 'ibank_case_cards_v1';
  var REASON_MIN = 10;     // 与东财转3 卡一致：≥10 字才能提交
  var CAP_SEC = 900;       // 耗时封顶，防挂机拉坏班级均值
  var MODULE = '投行教学案例库';

  /* ---------------- 每案例配置（速填 + 测算 + 情境 + 选项 + 答案） ---------------- */
  var CONFIG = [
    {
      id: 'case-01', ch: '第0章', title: '五洋建设 · 看门人的底线',
      facts: [
        { label: '涉案债券发行总额（亿元）', ans: 13.6 },
        { label: '投资者获判偿债务本息（亿元）', ans: 7.4 },
        { label: '德邦证券实际赔付（亿元）', ans: 5.76 }
      ],
      mid: { type: 'calc', q: '投资者获判偿本息占发行总额的比例约（%）', ans: 54.4, tol: 1, hint: '7.4 ÷ 13.6 × 100' },
      situTitle: '内核决策 · 风控负责人视角',
      situLead: '回到 2015 年承销立项会：13.6 亿元的盘子、千万元级承销费，但发行人财务已有造假信号，审计报告质量存疑。你是主承销商的内核风控负责人，',
      situTail: '项目团队催着按时出具核查意见，你怎么定？',
      choices: [
        { k: 'pass', t: '放行：维持原核查意见' },
        { k: 'back', t: '退回：追加尽调、暂缓申报' },
        { k: 'report', t: '上报：内核异议留痕并报监管' }
      ]
    },
    {
      id: 'case-02', ch: '第0章', title: '欣泰电气 · 保荐核查的取舍',
      facts: [
        { label: '先行赔付专项基金（亿元）', ans: 5.5 },
        { label: '投资者实际赔付（亿元）', ans: 2.42 },
        { label: '和解达成比例（%）', ans: 95.16 }
      ],
      mid: { type: 'calc', q: '投资者实际赔付占专项基金的比例约（%）', ans: 44, tol: 1, hint: '2.42 ÷ 5.5 × 100' },
      situTitle: '现场核查 · 保荐代表人视角',
      situLead: '2016 年你是保荐现场负责人：核查中已发现发行人申请文件财务数据存在虚假记载的疑点，发行人坚持按期申报，',
      situTail: '签字还是拦下，你选哪一步？',
      choices: [
        { k: 'sign', t: '按发行人口径签字申报' },
        { k: 'hold', t: '暂缓申报、补充核查' },
        { k: 'report', t: '向证监会报告并终止项目' }
      ]
    },
    {
      id: 'case-03', ch: '第1章', title: '高盛 · 收入结构怎么摆',
      facts: [
        { label: '2024 年净收入（亿美元）', ans: 535.1 },
        { label: '全球银行与市场收入（亿美元）', ans: 349.4 },
        { label: '资产与财富管理收入（亿美元）', ans: 161.4 }
      ],
      mid: { type: 'calc', q: '全球银行与市场收入占净收入的比例约（%）', ans: 65.3, tol: 1, hint: '349.4 ÷ 535.1 × 100' },
      situTitle: '战略取舍 · 战略助理视角',
      situLead: '你是高盛战略助理：私募信贷正在抢走传统融资业务，五年战略要求提高收入稳定性、降低对行情的敏感度，',
      situTail: '下一阶段资本和资源往哪边摆？',
      choices: [
        { k: 'heavy', t: '加码重资本：做市与融资扩表' },
        { k: 'light', t: '加码轻资本：顾问与资管收费' },
        { k: 'both', t: '双线并进，重资本设上限' }
      ]
    },
    {
      id: 'case-04', ch: '第1章', title: '雷曼兄弟 · 风控和 CEO 的冲突',
      facts: [
        { label: '破产时债务规模（亿美元）', ans: 6130 },
        { label: '危机前杠杆倍数约（倍）', ans: 30, tol: 0.5 },
        { label: '巴克莱收购北美业务出价（亿美元）', ans: 17.5 }
      ],
      mid: { type: 'calc', q: '破产债务规模约为巴克莱出价的多少倍（倍）', ans: 350, tol: 10, hint: '6130 ÷ 17.5' },
      situTitle: '限额之争 · 首席风险官视角',
      situLead: '2007 年你是雷曼首席风险官：压力情景已经显示流动性缺口，但自营盘仍在赚钱，CEO 要求继续冲规模，',
      situTail: '风险限额这道闸，你是守还是让？',
      choices: [
        { k: 'yield', t: '让步：放宽限额继续做' },
        { k: 'hold', t: '坚守：强制降杠杆减仓' },
        { k: 'mid', t: '折中：先砍流动性最差的仓位' }
      ]
    },
    {
      id: 'case-05', ch: '第2章', title: '蔚来 · 组合融资怎么搭',
      facts: [
        { label: '战略投资者现金出资（亿元）', ans: 70 },
        { label: '注入资产作价（亿元）', ans: 177.7 },
        { label: '六家银行综合授信（亿元）', ans: 104 }
      ],
      mid: { type: 'calc', q: '现金出资占「现金＋注入资产」的比例约（%）', ans: 28.3, tol: 1, hint: '70 ÷ 247.7 × 100' },
      situTitle: '方案设计 · 融资顾问视角',
      situLead: '2019 年底你是蔚来的融资顾问：现金流只够撑几个月，创始团队又不能丢控制权，',
      situTail: '三条路线，你把哪条拿去汇报？',
      choices: [
        { k: 'equity', t: '只做股权融资：快，但稀释' },
        { k: 'combo', t: '组合融资：股权＋资产＋授信' },
        { k: 'debt', t: '高息举债：不稀释，付息压顶' }
      ]
    },
    {
      id: 'case-06', ch: '第2章', title: '万科 vs 恒大 · 融资路线的代价',
      facts: [
        { label: '恒大融资成本约（%）', ans: 8.3 },
        { label: '万科融资成本约（%）', ans: 5.18 },
        { label: '恒大负债峰值（万亿元）', ans: 2 }
      ],
      mid: { type: 'calc', q: '恒大融资成本比万科高约几个百分点', ans: 3.12, tol: 0.3, hint: '8.3 − 5.18' },
      situTitle: '加杠杆的姿势 · CFO 顾问视角',
      situLead: '2016 年你是房企 CFO 顾问，董事会想冲规模：非标资金又快又多但成本 8% 以上；银行贷款便宜约 3 个点但限额严、要表内透明，',
      situTail: '给 CFO 的建议是什么？',
      choices: [
        { k: 'nonstd', t: '主用非标，先把规模做起来' },
        { k: 'bank', t: '主用银行贷款，接受限额' },
        { k: 'mix', t: '表内为主＋少量非标过渡' }
      ]
    },
    {
      id: 'case-07', ch: '第3章', title: '中芯国际 · 发行价怎么定',
      facts: [
        { label: '发行价（元/股）', ans: 27.46 },
        { label: '上市首日收盘价（元）', ans: 82.92 },
        { label: '绿鞋全额行使后募资（亿元）', ans: 532.3 }
      ],
      mid: { type: 'calc', q: '首日收盘价约为发行价的多少倍（倍）', ans: 3.02, tol: 0.1, hint: '82.92 ÷ 27.46' },
      situTitle: '定价之争 · 承销估值负责人视角',
      situLead: '你是承销团估值负责人：询价区间里多数机构报价比你 DCF 中枢低约 20%，发行人在意募资额，首日破发的舆论风险在你这边，',
      situTail: '最终定价建议报多少？',
      choices: [
        { k: 'low', t: '随行就市低价定，保发行' },
        { k: 'high', t: '顶在模型中枢，募资最大化' },
        { k: 'mid', t: '中枢略下方，配绿鞋护盘' }
      ]
    },
    {
      id: 'case-08', ch: '第3章', title: '阿里巴巴 · 上市路径的选择',
      facts: [
        { label: '港股发行价（港元/股）', ans: 176 },
        { label: '基础募资规模（亿港元）', ans: 880 },
        { label: '全球发售新股（亿股）', ans: 5 }
      ],
      mid: { type: 'calc', q: '基础募资规模 ÷ 全球发售新股股数 =（港元/股）', ans: 176, tol: 0.5, hint: '880 ÷ 5' },
      situTitle: '路径设计 · 融资顾问视角（回到 2013 年）',
      situLead: '2013 年你是阿里的融资顾问：港交所当时不接受同股不同权，管理层必须保控制权，',
      situTail: '上市路径怎么设计？',
      choices: [
        { k: 'ny', t: '改道纽约，暂别港股' },
        { k: 'wvr', t: '接受同股同权回港股' },
        { k: 'wait', t: '先赴纽约，等规则修改再回港' }
      ]
    },
    {
      id: 'case-09', ch: '第3章', title: '蚂蚁集团 · 上市前夜的报告义务',
      facts: [
        { label: 'A 股发行价（元/股）', ans: 68.8 },
        { label: 'H 股发行价（港元/股）', ans: 80 },
        { label: 'A 股有效申购户数（万户）', ans: 515.5 }
      ],
      mid: {
        type: 'pick',
        q: '按发行承销规则，实控人被监管约谈这类消息属于——',
        options: ['可自行判断影响的一般消息', '可能影响发行上市的重大事项，须立即报告', '只需口头知会交易所即可'],
        ansIdx: 1
      },
      situTitle: '重大事项 · 联席主承销商项目负责人视角',
      situLead: '2020 年 11 月 2 日晚：实控人被四部门监管约谈的消息你已获知，距离挂牌还有 3 天，承销费基本落袋，',
      situTail: '作为项目负责人你先做哪件事？',
      choices: [
        { k: 'wait', t: '沉默等待监管表态' },
        { k: 'report', t: '立即上报重大事项、建议暂缓' },
        { k: 'eval', t: '先内部评估一天再定' }
      ]
    },
    {
      id: 'case-10', ch: '第4章', title: '宁德时代 · 问询函怎么接',
      facts: [
        { label: '原预案募资上限（亿元）', ans: 582 },
        { label: '调整后募资上限（亿元）', ans: 450 },
        { label: '最终发行价（元/股）', ans: 410 }
      ],
      mid: { type: 'calc', q: '募资上限下调幅度约（%）', ans: 22.7, tol: 1, hint: '(582 − 450) ÷ 582 × 100' },
      situTitle: '过度融资 · 保荐机构项目负责人视角',
      situLead: '深交所问询「是否过度融资」，客户明确不想砍规模，账上 746 亿现金的事实摆在那里，',
      situTail: '你给客户的正式建议是哪条？',
      choices: [
        { k: 'hold', t: '硬顶：维持 582 亿回复问询' },
        { k: 'cut', t: '下调至 450 亿，删 93 亿补流' },
        { k: 'split', t: '拆成两次小额分批申报' }
      ]
    },
    {
      id: 'case-12', ch: '第4章', title: '中国银行 · 补资本选工具',
      facts: [
        { label: '首期发行规模（亿元）', ans: 320 },
        { label: '票面股息率（%）', ans: 6 },
        { label: '询价区间上沿（%）', ans: 6.3 }
      ],
      mid: { type: 'calc', q: '首期优先股每年需支付股息约（亿元）', ans: 19.2, tol: 0.3, hint: '320 × 6%' },
      situTitle: '工具选择 · 资本规划顾问视角',
      situLead: '2013 年你是中行资本规划顾问：资本缺口大、普通股股价低迷，定增会大幅摊薄每股收益，',
      situTail: '补充资本的工具选哪个？',
      choices: [
        { k: 'raise', t: '定增普通股' },
        { k: 'pref', t: '发行优先股补其他一级资本' },
        { k: 'cb', t: '发可转债，等转股稀释' }
      ]
    },
    {
      id: 'case-13', ch: '第5章', title: '特别国债 · 承销团的标书',
      facts: [
        { label: '发行总额（万亿元）', ans: 1 },
        { label: '发行期数（期）', ans: 16 },
        { label: '平均投标倍数（倍）', ans: 2.54 }
      ],
      mid: { type: 'calc', q: '平均每期发行规模约（亿元）', ans: 625, tol: 5, hint: '10000 ÷ 16' },
      situTitle: '投标策略 · 承销团交易主管视角',
      situLead: '你是承销团成员的国债交易主管：1 万亿供给落地前市场已抬升利率预期，明日 10 年期招标，承销义务与久期风险同时压过来，',
      situTail: '标书价格怎么报？',
      choices: [
        { k: 'aggr', t: '高价积极投标，保中标量' },
        { k: 'def', t: '压价防守，控久期风险' },
        { k: 'mid', t: '按二级收益率平价投' }
      ]
    },
    {
      id: 'case-14', ch: '第5章', title: '超日债 · 承不承这个项目',
      facts: [
        { label: '发行规模（亿元）', ans: 10 },
        { label: '票面利率（%）', ans: 8.98 },
        { label: '违约时实际付息比例（%）', ans: 4.5 }
      ],
      mid: { type: 'calc', q: '实际付息比例约为票面利率的（%）', ans: 50.1, tol: 1.5, hint: '4.5 ÷ 8.98 × 100' },
      situTitle: '承接决策 · 主承销项目经理视角',
      situLead: '2012 年你是主承销项目经理：发行人上一会计年度已经亏损，客户急着发债补流，费率优厚，',
      situTail: '这个项目你接不接、怎么接？',
      choices: [
        { k: 'go', t: '照发：投资者自己会看报表' },
        { k: 'disclose', t: '承接但如实披露亏损风险' },
        { k: 'quit', t: '拒绝承接该项目' }
      ]
    },
    {
      id: 'case-15', ch: '第5章', title: '永煤 · 国企信仰要不要买',
      facts: [
        { label: '违约本息（亿元）', ans: 10.32 },
        { label: '违约前三季末账面货币资金（亿元）', ans: 469.68 },
        { label: '存续债券规模（亿元）', ans: 234.1 }
      ],
      mid: { type: 'calc', q: '账面货币资金约为违约本息的多少倍（倍）', ans: 45.5, tol: 2, hint: '469.68 ÷ 10.32' },
      situTitle: '信用定价 · 投资经理视角',
      situLead: '2020 年 10 月你是信用债投资经理：AAA 省属国企新发超短融，票面比同级高 50bp，卖方都说「国企信仰」稳，但账面 469 亿现金与现金流结构对不上，',
      situTail: '这一单你怎么投？',
      choices: [
        { k: 'buy', t: '重仓买入，信仰加持' },
        { k: 'avoid', t: '不买：现金流说不通' },
        { k: 'small', t: '少量试水＋设置止损' }
      ]
    },
    {
      id: 'case-16', ch: '第6章', title: '花呗借呗 ABS · 资产池的门槛',
      facts: [
        { label: '国内首单小额信贷 ABS 发行年份（年）', ans: 2013, tol: 0 },
        { label: '优先/次级分层共（层）', ans: 2 },
        { label: '创下「首单」头衔数量（个）', ans: 2 }
      ],
      mid: {
        type: 'pick',
        q: '若劣化资产混入循环购买池，新增损失首先由哪一档吸收？',
        options: ['优先档', '次级档', '各档平均分摊'],
        ansIdx: 1
      },
      situTitle: '循环购买 · 计划管理人视角',
      situLead: '你是 ABS 计划管理人：发起人为维持发行节奏，想把一批已明显劣化的资产塞进资产池循环购买，管理费与合作关系都压在你身上，',
      situTail: '资产池的门槛守不守？',
      choices: [
        { k: 'take', t: '收下：保住管理费与合作' },
        { k: 'reject', t: '按合格标准拒收并出具意见' },
        { k: 'hold', t: '收下但自持次级兜底' }
      ]
    },
    {
      id: 'case-17', ch: '第6章', title: '开元建元 · 次级档怎么办',
      facts: [
        { label: '开元 2005-1 发行规模（亿元）', ans: 41.7727, tol: 0.05 },
        { label: '建元 2005-1 发行规模约（亿元）', ans: 30, tol: 0.05 },
        { label: '开元分档层数（层）', ans: 3 }
      ],
      mid: { type: 'calc', q: '开元 2005-1 规模约为建元 2005-1 的多少倍（倍）', ans: 1.39, tol: 0.06, hint: '41.77 ÷ 30' },
      situTitle: '结构设计 · RMBS 设计者视角',
      situLead: '2005 年你是建元 RMBS 结构设计者：次级档没有外部买家，发行规模又不能缩，',
      situTail: '次级档你打算怎么处理？',
      choices: [
        { k: 'self', t: '发起人（建行）自持次级' },
        { k: 'sell', t: '折价甩给外部投资者' },
        { k: 'flat', t: '取消分层，整体打包卖' }
      ]
    },
    {
      id: 'case-18', ch: '第7章', title: '美的库卡 · 天价要约发不发',
      facts: [
        { label: '要约收购价（欧元/股）', ans: 115 },
        { label: '交易总金额（亿欧元）', ans: 37.07 },
        { label: '对应市盈率约（倍）', ans: 48 }
      ],
      mid: { type: 'calc', q: '115 欧元要约价对应 48 倍市盈率，隐含每股盈利约（欧元/股）', ans: 2.4, tol: 0.1, hint: '115 ÷ 48' },
      situTitle: '要约决策 · 买方并购顾问视角',
      situLead: '2016 年你是美的的并购顾问：48 倍 PE 的要约价远超库卡十年估值带，德国政府与工会对外资高度敏感，',
      situTail: '你建议董事会怎么走？',
      choices: [
        { k: 'raise', t: '加价强攻，速战速决' },
        { k: 'offer', t: '现价要约＋围栏协议换信任' },
        { k: 'walk', t: '放弃交易，另寻标的' }
      ]
    },
    {
      id: 'case-19', ch: '第7章', title: '宝万之争 · 董事会的应对',
      facts: [
        { label: '宝能持股峰值（%）', ans: 25.4 },
        { label: '宝能借入/自有资金比约（倍）', ans: 4.2 },
        { label: '深铁终局持股（%）', ans: 29.38 }
      ],
      mid: { type: 'calc', q: '宝能购股资金中借入部分约占（%）', ans: 80.8, tol: 2, hint: '4.2 ÷ (1 + 4.2) × 100' },
      situTitle: '反收购 · 董事会顾问视角',
      situLead: '2015 年底你是万科董事会顾问：宝能已成第一大股东，股价剧烈波动，中小股东与监管都在看着，',
      situTail: '给董事会的应对建议是哪条？',
      choices: [
        { k: 'knight', t: '停牌重组，引入白衣骑士深铁' },
        { k: 'deal', t: '与宝能和解，让其进董事会' },
        { k: 'wait', t: '按兵不动，等监管表态' }
      ]
    },
    {
      id: 'case-20', ch: '第7章', title: '吉利沃尔沃 · 蛇吞象的融资',
      facts: [
        { label: '收购价款（亿美元）', ans: 18 },
        { label: '整体融资规模约（亿美元）', ans: 27 },
        { label: '福特 1999 年购入价（亿美元）', ans: 64.5 }
      ],
      mid: { type: 'calc', q: '整体融资规模约为收购价款的多少倍（倍）', ans: 1.5, tol: 0.05, hint: '27 ÷ 18' },
      situTitle: '融资拼盘 · 并购融资顾问视角',
      situLead: '2009 年你是吉利的并购融资顾问：买价 18 亿美元、交割后还要约 9 亿美元营运资金，公司年收入才约 20 亿美元，',
      situTail: '融资结构怎么搭？',
      choices: [
        { k: 'own', t: '全用自有资金＋国内银行贷款' },
        { k: 'mix', t: '三方拼盘：吉利＋中资＋国际市场' },
        { k: 'union', t: '拉财团联合收购，分摊风险' }
      ]
    }
  ];

  /* ---------------- 存档：按案例 id 分桶 ---------------- */
  function readStore() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      return (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
    } catch (e) { return {}; }
  }
  function bucketOf(all, id) {
    var b = all[id];
    if (!b || typeof b !== 'object') b = all[id] = {};
    if (!b.facts || typeof b.facts !== 'object') b.facts = {};
    if (!b.started || typeof b.started !== 'object') b.started = {};
    if (!b.mid || typeof b.mid !== 'object') b.mid = {};
    if (typeof b.reasonText !== 'string') b.reasonText = '';
    b.draftChoice = typeof b.draftChoice === 'string' ? b.draftChoice : '';
    return b;
  }
  function saveStore(all) {
    try { localStorage.setItem(KEY, JSON.stringify(all)); return true; } catch (e) { return false; }
  }

  /* 数字归一化：与东财转3 卡同款（全角/千分位/单位混排都容得住） */
  function num(v) {
    var s = String(v == null ? '' : v).trim();
    if (!s) return NaN;
    s = s.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[，,]/g, '')
      .replace(/[。．]/g, '.')
      .replace(/[^\d.\-]/g, '');
    var n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }

  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------------- 段②：一步测算 / 规则判读 ---------------- */
  function midOk(cfg, b) {
    var m = cfg.mid, v = b.mid;
    if (m.type === 'calc') return isFinite(num(v.v)) && Math.abs(num(v.v) - m.ans) <= (typeof m.tol === 'number' ? m.tol : 0.01);
    return v.pick === m.ansIdx;
  }
  function midHtml(cfg) {
    var m = cfg.mid;
    if (m.type === 'calc') {
      return '<div class="cbr-fields"><div class="cbr-f cbc-mid-f">' +
        '<label>' + esc(m.q) + '</label>' +
        '<span class="cbr-in"><input type="text" inputmode="decimal" autocomplete="off" placeholder="填数字" /><i class="cbr-m"></i></span>' +
        '</div></div>' +
        '<p class="cbr-sh-sub cbc-mid-hint">算法提示：' + esc(m.hint) + '</p>';
    }
    var btns = m.options.map(function (o, i) {
      return '<button type="button" data-mi="' + i + '" aria-pressed="false">' + esc(o) + '</button>';
    }).join('');
    return '<div class="cbr-choice cbc-midpick">' + btns + '</div>';
  }

  /* ---------------- 渲染一张卡 ---------------- */
  function render(cfg, all) {
    var article = document.getElementById(cfg.id);
    if (!article) return;
    var body = article.querySelector('.case-body');
    if (!body || body.querySelector('.cbr-gen')) return;   // 已渲染 / 防重复
    var anchor = body.querySelector('.cl-src');

    var b = bucketOf(all, cfg.id);

    var factsHtml = cfg.facts.map(function (f, i) {
      return '<div class="cbr-f" data-fi="' + i + '">' +
        '<label>' + esc(f.label) + '</label>' +
        '<span class="cbr-in"><input type="text" inputmode="decimal" autocomplete="off" placeholder="填数字" />' +
        '<i class="cbr-m"></i></span></div>';
    }).join('');

    var choiceHtml = cfg.choices.map(function (c) {
      return '<button type="button" data-choice="' + c.k + '" aria-pressed="false">' + esc(c.t) + '</button>';
    }).join('');

    var card = document.createElement('div');
    card.className = 'cbr cbr-gen';
    card.setAttribute('data-case', cfg.id);
    card.innerHTML =
      '<div class="cbr-head">' +
        '<div class="cbr-h-l">' +
          '<h5>决策记录卡 · ' + esc(cfg.title) + '</h5>' +
          '<p>三段都完成即是一份完整的学习证据（与东财转3 实验记录卡同构）。内容自动存在本机；<b>提交的决策与理由计入五维评估「价值认同与职业伦理」维度</b>（理由写满 20 字可得满档，改后重新提交即覆盖）。</p>' +
        '</div>' +
        '<span class="cbr-save cbc-save">本机自动保存</span>' +
      '</div>' +
      '<section class="cbr-sec">' +
        '<div class="cbr-sh"><span class="cbr-n">1</span><b>关键数速填</b><em class="cbc-fact-ct">0 / ' + cfg.facts.length + '</em></div>' +
        '<p class="cbr-sh-sub">从本案例上方内容里找，填对右边会亮 ✓。只做自查，不计入评分。</p>' +
        '<div class="cbr-fields">' + factsHtml + '</div>' +
      '</section>' +
      '<section class="cbr-sec">' +
        '<div class="cbr-sh"><span class="cbr-n">2</span><b>' + (cfg.mid.type === 'calc' ? '一步测算' : '规则判读') + '</b><em class="cbc-mid-ct">未完成</em></div>' +
        '<p class="cbr-sh-sub">' + (cfg.mid.type === 'calc' ? '只用段①里的数推一步，算对右边会亮 ✓。' : '判一判规则口径，选对会亮 ✓。') + '只做自查，不计入评分。</p>' +
        midHtml(cfg) +
      '</section>' +
      '<section class="cbr-sec">' +
        '<div class="cbr-sh"><span class="cbr-n">3</span><b>' + esc(cfg.situTitle) + '</b><em class="cbc-dec-ct">未提交</em></div>' +
        '<p class="cbr-sh-sub"><span>' + esc(cfg.situLead) + '</span><span>' + esc(cfg.situTail) + '</span></p>' +
        '<div class="cbr-choice cbc-choice">' + choiceHtml + '</div>' +
        '<textarea class="cbc-reason" rows="2" maxlength="200" placeholder="理由（不少于 ' + REASON_MIN + ' 个字，写满 20 个字可得满档）：说清你考虑了哪些约束、放弃另一边付出了什么代价。"></textarea>' +
        '<div class="cbr-act">' +
          '<button type="button" class="cbr-btn primary cbc-submit">提交决策</button>' +
          '<span class="cbr-msg cbc-msg"></span>' +
        '</div>' +
      '</section>' +
      '<div class="cbr-foot">' +
        '<button type="button" class="cbr-btn ghost cbc-reset">清空重填</button>' +
        '<span class="cbr-state cbc-state"></span>' +
      '</div>';

    if (anchor && anchor.parentNode === body) body.insertBefore(card, anchor);
    else body.appendChild(card);

    wire(card, cfg, b, all);
    paint(card, cfg, b);
  }

  /* ---------------- 接线：填数 / 测算 / 选边 / 提交 ---------------- */
  function wire(card, cfg, b, all) {
    var $ = function (sel) { return card.querySelector(sel); };
    var $$ = function (sel) { return Array.prototype.slice.call(card.querySelectorAll(sel)); };
    var factRows = $$('.cbr-f:not(.cbc-mid-f)');
    var inputs = factRows.map(function (row) { return row.querySelector('input'); });
    var midRow = $('.cbc-mid-f');
    var midInput = midRow ? midRow.querySelector('input') : null;

    function save(touch, $saveEl) {
      saveStore(all);
      if (touch !== false && $saveEl) {
        var d = new Date(), p2 = function (n) { return (n < 10 ? '0' : '') + n; };
        $saveEl.textContent = '已保存 ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ' · 本机';
      }
    }
    function mark() {
      if (!b.started.at) { b.started.at = Date.now(); saveStore(all); }
    }
    function elapsed() {
      var t = Number(b.started.at) || 0;
      if (!t) return 1;
      return Math.max(1, Math.min(CAP_SEC, Math.round((Date.now() - t) / 1000)));
    }

    /* ① 关键数：即时判对错 */
    inputs.forEach(function (input, i) {
      input.addEventListener('input', function () {
        mark();
        var f = cfg.facts[i];
        var tol = typeof f.tol === 'number' ? f.tol : 0.01;
        var n = num(input.value);
        var ok = isFinite(n) && Math.abs(n - f.ans) <= tol;
        b.facts[i] = input.value;
        var row = factRows[i];
        row.classList.toggle('ok', ok);
        row.classList.toggle('bad', !ok && input.value !== '');
        row.querySelector('.cbr-m').textContent = ok ? '✓' : (input.value ? '✗' : '');
        save(false);
        paint();
      });
    });

    /* ② 测算 / 判读：即时判对错（自查，不上报） */
    if (midInput && cfg.mid.type === 'calc') {
      midInput.addEventListener('input', function () {
        mark();
        b.mid.v = midInput.value;
        save(false);
        paint();
      });
    }
    $$('.cbc-midpick button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        mark();
        b.mid.pick = Number(btn.getAttribute('data-mi'));
        save(false);
        paint();
      });
    });

    /* ③ 决策：选边 + 理由 + 提交 */
    $$('.cbc-choice button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        mark();
        b.draftChoice = btn.getAttribute('data-choice');
        save(false);
        paint();
      });
    });

    var $reason = $('.cbc-reason');
    $reason.addEventListener('input', function () {
      mark();
      b.reasonText = $reason.value;
      save(false);
    });

    $('.cbc-submit').addEventListener('click', function () {
      mark();
      if (!b.draftChoice) { msg('先在选项里选一边，再提交。', 'bad'); return; }
      var reason = String($reason.value || '').trim();
      var n = reason.length;
      if (n < REASON_MIN) {
        msg('再补几个字（现在 ' + n + ' 个字，至少 ' + REASON_MIN + ' 个字）。', 'bad');
        $reason.focus();
        return;
      }
      b.dec = { choice: b.draftChoice, reason: reason, ts: Date.now() };
      save(false);
      paint();
      msg('已提交，会计入五维评估。理由随时可改，改完再点一次提交即覆盖。', 'ok');
      if (typeof window.__ibankTrack === 'function') {
        try {
          window.__ibankTrack('case_decision', {
            chapter: cfg.ch, module: MODULE, correct: null, duration: elapsed(),
            detail: JSON.stringify({ case: cfg.id, choice: b.dec.choice, reason: reason })
          });
        } catch (e) { /* 上报失败不影响本机留档 */ }
      }
    });

    $('.cbc-reset').addEventListener('click', function () {
      b.facts = {};
      b.mid = {};
      b.reasonText = '';
      b.draftChoice = '';
      b.dec = null;
      b.started = {};
      saveStore(all);
      inputs.forEach(function (input, i) {
        input.value = '';
        factRows[i].classList.remove('ok', 'bad');
        factRows[i].querySelector('.cbr-m').textContent = '';
      });
      if (midInput) {
        midInput.value = '';
        midRow.classList.remove('ok', 'bad');
        midRow.querySelector('.cbr-m').textContent = '';
      }
      paint();
      msg('已清空。', '');
    });

    function msg(t, cls) {
      var m = $('.cbc-msg');
      m.textContent = t;
      m.className = 'cbr-msg cbc-msg ' + (cls || '');
    }

    /* 画当前状态（首次渲染 + 每次交互后） */
    function paint() {
      inputs.forEach(function (input, i) {
        if (document.activeElement !== input && input.value === '' && b.facts[i]) {
          input.value = b.facts[i];
        }
        var f = cfg.facts[i];
        var tol = typeof f.tol === 'number' ? f.tol : 0.01;
        var n = num(input.value);
        var ok = isFinite(n) && Math.abs(n - f.ans) <= tol;
        var row = factRows[i];
        row.classList.toggle('ok', ok);
        row.classList.toggle('bad', !ok && input.value !== '');
        row.querySelector('.cbr-m').textContent = ok ? '✓' : (input.value ? '✗' : '');
      });
      var nOk = inputs.filter(function (input, i) {
        var f = cfg.facts[i];
        var tol = typeof f.tol === 'number' ? f.tol : 0.01;
        var n = num(input.value);
        return isFinite(n) && Math.abs(n - f.ans) <= tol;
      }).length;
      var ct = $('.cbc-fact-ct');
      ct.textContent = nOk + ' / ' + cfg.facts.length;
      ct.className = 'cbc-fact-ct' + (nOk === cfg.facts.length ? ' done' : '');

      /* 段②状态 */
      var mct = $('.cbc-mid-ct');
      if (cfg.mid.type === 'calc') {
        if (document.activeElement !== midInput && midInput.value === '' && b.mid.v) midInput.value = b.mid.v;
        var mNum = num(midInput.value);
        var mOk = isFinite(mNum) && Math.abs(mNum - cfg.mid.ans) <= (typeof cfg.mid.tol === 'number' ? cfg.mid.tol : 0.01);
        midRow.classList.toggle('ok', mOk);
        midRow.classList.toggle('bad', !mOk && midInput.value !== '');
        midRow.querySelector('.cbr-m').textContent = mOk ? '✓' : (midInput.value ? '✗' : '');
        mct.textContent = mOk ? '✓ 算对了' : (midInput.value ? '再算算' : '未完成');
        mct.className = 'cbc-mid-ct' + (mOk ? ' done' : '');
      } else {
        $$('.cbc-midpick button').forEach(function (btn) {
          var on = Number(btn.getAttribute('data-mi')) === b.mid.pick;
          btn.classList.toggle('on', on);
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        var pOk = midOk(cfg, b);
        mct.textContent = pOk ? '✓ 判对了' : (typeof b.mid.pick === 'number' ? '再想想' : '未完成');
        mct.className = 'cbc-mid-ct' + (pOk ? ' done' : '');
      }

      $$('.cbc-choice button').forEach(function (btn) {
        var on = btn.getAttribute('data-choice') === b.draftChoice;
        btn.classList.toggle('on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      /* 回填优先级：草稿 > 上次提交的理由（防止只提交过、没触发 input 就关页面的情况） */
      if (document.activeElement !== $reason && $reason.value === '') {
        $reason.value = b.reasonText || (b.dec && b.dec.reason) || '';
      }

      var decEl = $('.cbc-dec-ct');
      if (b.dec) {
        var pick = '';
        cfg.choices.forEach(function (c) { if (c.k === b.dec.choice) pick = c.t; });
        decEl.textContent = '已提交 · ' + pick;
        decEl.className = 'cbc-dec-ct done';
      } else {
        decEl.textContent = '未提交';
        decEl.className = 'cbc-dec-ct';
      }

      var st = $('.cbc-state');
      if (b.dec) {
        var d = new Date(b.dec.ts), p2 = function (x) { return (x < 10 ? '0' : '') + x; };
        st.innerHTML = '决策 <b>已提交</b> ' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
      } else {
        st.textContent = '速填 ' + nOk + '/' + cfg.facts.length + ' · 段②未完成 · 决策未提交';
      }
    }
    card.__cbcPaint = paint;
  }

  function paint(card, cfg, b) { if (card.__cbcPaint) card.__cbcPaint(); }

  /* ---------------- 入口 ---------------- */
  function init() {
    var all = readStore();
    CONFIG.forEach(function (cfg) { render(cfg, all); });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

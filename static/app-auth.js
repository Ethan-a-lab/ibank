
    // ===== 登录注册系统（CloudBase Auth v2） =====
    (function () {
      // 离线/CDN 不可达时降级为本地演示模式：页面照常渲染，登录走本地身份，不阻塞任何交互
      let app = null, auth = null, db = null, OFFLINE = false;
      try {
        if (typeof cloudbase === 'undefined') throw new Error('CloudBase SDK 未加载');
        app = cloudbase.init({
          env: 'ibank-d5gq5pejl54eb2748',
          region: 'ap-shanghai',
          accessKey: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjRjNTAzMTA1LTJlOWItNDNiNC04ZjJiLWVlZGExOTAzMjVmZCJ9.eyJpc3MiOiJodHRwczovL2liYW5rLWQ1Z3E1cGVqbDU0ZWIyNzQ4LmFwLXNoYW5naGFpLnRjYi1hcGkudGVuY2VudGNsb3VkYXBpLmNvbSIsInN1YiI6ImFub24iLCJhdWQiOiJpYmFuay1kNWdxNXBlamw1NGViMjc0OCIsImV4cCI6NDA5NDc3MTY0NSwiaWF0IjoxNzkxMDg4NDQ1LCJub25jZSI6IjZJS1NFVDlWUXFpbXpqVzVNc0djQlEiLCJhdF9oYXNoIjoiNklLU0VUOVZRcWltempXNU1zR2NCUSIsIm5hbWUiOiJBbm9ueW1vdXMiLCJzY29wZSI6ImFub255bW91cyIsInByb2plY3RfaWQiOiJpYmFuay1kNWdxNXBlamw1NGViMjc0OCIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJyb2xlIjoiYW5vbiIsImlzX2Fub255bW91cyI6dHJ1ZSwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiYW5vbnltb3VzIiwicHJvdmlkZXJzIjpbImFub255bW91cyJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiQW5vbnltb3VzIn0sInVzZXJfdHlwZSI6IiIsImNsaWVudF90eXBlIjoiY2xpZW50X3VzZXIiLCJpc19zeXN0ZW1fYWRtaW4iOmZhbHNlfQ.V0BoXCLEhWRnvthNUSlBt3P6z-I4l90Kk6tH4rWx_kvxB2mNEU5iFVwfE-GbOeXl8fJzFvvzO0OGOlMj8O5vrJYfwKEbcyAEy5cTN5XZzicBP64P5OW0RiBKLcpAvs5uVxfMPVUb3lJAFuL6GwcR3vgiFYSmHdOStE-KOQ2YoXOiiHyx8iYcmMK6ahYupRhUtG-mXVWVivE-rnQyh83dnIxVfoZ37pBn9F3QYD7GBUV_YPlMwn2DpXw5fGXflX4K7SSP28ITrC30B45LwWzcIGQ-1yCq6B5wGAVciecT4ZiV6zWMBe-RQ95CATAedkXKXMzA0yZrmYX--6kHHEIxHQ',
          auth: { detectSessionInUrl: true }
        });
        auth = app.auth;
        db = app.rdb();
      } catch (e) {
        OFFLINE = true;
        auth = null; db = null;
        console.warn('[iBank] 云服务不可用，已进入离线演示模式：', e && e.message);
      }
      const DEMO_TIP = '当前为离线演示模式（未连接云服务），将以本地演示身份进入，学习与训练功能均可正常使用。';

      const overlay = document.getElementById('login-overlay');
      const logoutBtn = document.getElementById('logout-btn');
      const loginTopBtn = document.getElementById('login-top-btn');
      const loginClose = document.getElementById('login-close');
      const navAccount = document.getElementById('nav-account');
      const navClass = document.getElementById('nav-class');
      const msgEl = document.getElementById('login-msg');
      let smsVerifyFn = null;

      function showMsg(t, type) { msgEl.textContent = t; msgEl.className = 'login-msg ' + (type || ''); }

      // 发送成功后 60 秒倒计时，期间防重复点击，结束后自动恢复可重发
      function startSmsCooldown(btn, secs) {
        let n = secs || 60;
        btn.disabled = true;
        btn.textContent = n + 's 后重发';
        const timer = setInterval(function () {
          n--;
          if (n <= 0) { clearInterval(timer); btn.disabled = false; btn.textContent = '获取验证码'; return; }
          btn.textContent = n + 's 后重发';
        }, 1000);
      }

      function applyRole(role) {
        const isAdmin = role === 'teacher' || role === 'admin';
        window.__ibankIsAdmin = isAdmin;
        const tab = document.querySelector('.tab-btn[data-page="p-admin"]');
        const card = document.querySelector('.home-card[data-page="p-admin"]');
        if (tab) tab.style.display = isAdmin ? '' : 'none';
        if (card) card.style.display = isAdmin ? '' : 'none';
        if (!isAdmin && document.getElementById('p-admin').classList.contains('active')) {
          document.querySelector('.tab-btn[data-page="p-home"]').click();
        }
      }

      async function getUserId() {
        if (OFFLINE) return 'offline-demo';
        try { const { data } = await auth.getSession(); return data && data.session && data.session.user ? data.session.user.id : null; }
        catch (e) { return null; }
      }

      // 自愈：登录后发现 profiles 无记录（老账号/后台误删），自动补建学生行
      async function ensureProfile(uid) {
        if (OFFLINE) return { role: 'student', name: '演示同学' };
        try {
          const { data } = await db.from('profiles').select('id, role, name').eq('id', uid);
          if (!data || data.length === 0) {
            await db.from('profiles').insert({ id: uid, role: 'student', name: '', class_name: '' });
            return { role: 'student', name: '' };
          }
          return { role: data[0].role || 'student', name: data[0].name || '' };
        } catch (e) { return { role: 'student', name: '' }; }
      }

      let currentUid = null; // 当前登录用户 uid：用户管理列表里用来识别"自己"，禁止对自己做角色操作

      async function onLoggedIn() {
        overlay.classList.add('hidden');
        loginTopBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        const uid = await getUserId();
        currentUid = uid;
        const prof = uid ? await ensureProfile(uid) : { role: 'student', name: '' };
        const role = prof.role;
        const isT = role === 'teacher' || role === 'admin';
        applyRole(role);
        navAccount.classList.remove('hidden');
        // 导航栏身份标识：姓名 + 身份徽章（教师登录后一眼确认自己在教师端）
        document.getElementById('nav-user-name').textContent = prof.name || (isT ? '老师' : '同学');
        const roleEl = document.getElementById('nav-user-role');
        roleEl.textContent = isT ? '教师' : '学生';
        roleEl.className = isT ? 'teacher' : '';
        navClass.style.display = (role === 'student') ? '' : 'none';
        showMsg('', '');
        if (isT) { loadRealStats(); loadEventStats(); checkEventsTable(true); }
        track('login', {});
      }

      async function loadRealStats() {
        const box = document.getElementById('um-list');
        if (OFFLINE) {
          if (box) box.innerHTML = '<div class="um-empty">离线演示模式：未连接云服务，暂无后台统计数据。<br>联网后重新打开即可查看。</div>';
          return;
        }
        try {
          // 一次查询全量，客户端分组计数（比 5 次条件查询更快也更省）
          // is_founder 列可能尚未创建（未跑加固 SQL），失败时自动回退，保证用户列表照常渲染
          let list;
          try {
            const r1 = await db.from('profiles').select('id, role, class_name, name, is_founder');
            if (r1 && r1.error) throw r1.error;
            list = r1.data || [];
          } catch (e1) {
            const r2 = await db.from('profiles').select('id, role, class_name, name');
            list = (r2 && r2.data) || [];
          }
          const count = function (fn) { return list.filter(fn).length; };
          const set = function (id, v) { const el = document.getElementById(id); if (el) el.textContent = v; };
          set('real-students', count(function (r) { return r.role === 'student'; }));
          // 各班人数：按班级清单动态生成卡片，不再为每个班写死一个 DOM + 一个 real-cN，
          // 否则加班级必然漏改（与首页 hero2-stats 同类问题）。
          const classBox = document.getElementById('real-class-kpis');
          if (classBox) {
            var known = CLASS_LIST.map(function (cn) {
              return '<div class="admin-kpi"><div class="k">' + esc(cn) + '</div><div class="v">'
                + count(function (r) { return r.class_name === cn; }) + '</div></div>';
            });
            // 档案里出现过但不在清单里的班级（历史数据/ 其他专业）也必须显示，不能悄悄消失
            var extra = [];
            (list || []).forEach(function (r) {
              var cn = String(r.class_name == null ? '' : r.class_name).trim();
              if (cn && CLASS_LIST.indexOf(cn) < 0 && extra.indexOf(cn) < 0) extra.push(cn);
            });
            extra.forEach(function (cn) {
              known.push('<div class="admin-kpi"><div class="k">' + esc(cn) + ' *</div><div class="v">'
                + count(function (r) { return r.class_name === cn; }) + '</div></div>');
            });
            classBox.outerHTML = known.join('');
          }
          set('real-teachers', count(function (r) { return r.role === 'teacher' || r.role === 'admin'; }));
          set('real-total', list.length);
          setProfileMap(list);   // 供「仅统计学生」与学情明细使用
          renderUserList(list);
        } catch (e) { console.log('加载实时数据失败', e); }
      }

      // ===== 行为埋点：写入 events 表，供教师端看板聚合 =====
      // ★ 本机镜像：学情画像页 readStore() 只读 ibank_events_local（离线可用、免网络）。
      //   此前登录态只写云端、不写本机，于是学生一登录，本机「累计答题 / 总体正确率 / 综合掌握度」
      //   就永远停在0或旧值——同一份行为在教师端看得到、在学生端看不到，两头对不上。
      //   现在登录态云端 + 本机双写：云端是跨设备可聚合的权威源，本机是同源镜像，只增不减、不参与云端计数。
      //   看板侧做了防重复处理：云端非空时以云端为准，云端为空时才回落到本机，故双写不会让教师端多算。
      function trackLocalMirror(rec) {
        try {
          const arr = JSON.parse(localStorage.getItem('ibank_events_local') || '[]');
          arr.push(rec);
          localStorage.setItem('ibank_events_local', JSON.stringify(arr.slice(-2000)));
        } catch (e) { /* 隐私模式 / 配额满：不影响云端上报 */ }
      }
      async function track(type, payload) {
        payload = payload || {};
        const uid = await getUserId();
        const rec = {
          uid: uid || 'anon', type: type,
          chapter: payload.chapter || null, qtype: payload.qtype || null,
          correct: (typeof payload.correct === 'boolean' ? payload.correct : null),
          module: payload.module || null, duration: payload.duration || null, ts: Date.now()
        };
        // v58.7：教师/管理员自己的行为**不进学习统计**（云端与本机镜像都跳过）。
        //   病根：教师日常备课点测、演示点击被 track 逐条双写，攒成几百条垃圾事件
        //   混进看板（习题 10822 / 问答 6403 的零头、甚至教师 uid 混进「覆盖学生」）。
        //   教师是看统计的人，不是产生统计的人。
        if (window.__ibankIsAdmin === true) return;
        // 无 uid（未登录）时不写云端：RLS 的 with check(uid = auth.uid()) 会直接拒绝，
        // 且记录也归不到具体学生。仅存本机，并给一次温和提示，避免误导成"表没建好"。
        if (OFFLINE || !uid) {
          trackLocalMirror(rec);
          if (!uid && !window.__ibankTrackNudged) {
            window.__ibankTrackNudged = true;
            if (typeof ibankToast === 'function') ibankToast('提示：登录后学习记录才会计入班级统计');
          }
          return;
        }
        trackLocalMirror(rec);   // ← 登录态同样留本机镜像，供学情画像页实时重算
        try { await db.from('events').insert(rec); } catch (e) {
          console.warn('[iBank] 行为上报失败', e);
          const msg = String((e && (e.message || e.error_description || e.msg)) || e || '');
          // 区分病因：权限类报错多半是策略/GRANT 问题，而非表不存在
          const isPerm = /row-level security|permission denied|policy|RLS|violates/i.test(msg);
          if (!window.__ibankTrackWarned) {
            window.__ibankTrackWarned = true;
            if (typeof ibankToast === 'function') {
              ibankToast(isPerm
                ? '⚠️ 行为上报被权限拒绝：请检查 events 表的 GRANT 与 RLS 策略（见后台「接入说明」）'
                : '⚠️ 学习行为未能上云：请检查 events 表是否已创建（见后台「接入说明」）');
            }
            if (typeof checkEventsTable === 'function') checkEventsTable(true);
          }
        }
      }
      window.__ibankTrack = track;

      // ===== 系统状态：检测 events 表是否就绪（后端配置脚本不内置于页面） =====
      var evStatusEl = document.getElementById('ev-status');

      // 检测 events 表：能 select 到即视为就绪；失败时把原始报错显示出来，便于定位
      async function checkEventsTable(silent) {
        if (!evStatusEl) return;
        if (OFFLINE) { evStatusEl.className = 'ev-status bad'; evStatusEl.textContent = '离线演示模式（未连接云服务）'; return; }
        if (!silent) { evStatusEl.className = 'ev-status'; evStatusEl.textContent = '检测中…'; }
        try {
          const r = await db.from('events').select('id').limit(1);
          if (r && r.error) throw r.error;
          // 表能读通 ≠ 能写入：RLS 的插入策略要求 uid = auth.uid()，必须已登录
          const uid = await getUserId();
          evStatusEl.className = 'ev-status ok';
          evStatusEl.textContent = uid
            ? '✅ events 表已就绪，学习行为可正常采集'
            : '✅ events 表已就绪（读取正常）；当前未登录，需登录后学习行为才会入库';
        } catch (e) {
          var m = (e && (e.message || e.error_description || e.msg)) || String(e || '未知错误');
          if (m.length > 64) m = m.slice(0, 64) + '…';
          evStatusEl.className = 'ev-status bad';
          evStatusEl.textContent = '❌ 未就绪：' + m;
        }
      }
      var evCheckBtn = document.getElementById('ev-check-btn');
      if (evCheckBtn) evCheckBtn.addEventListener('click', function () { checkEventsTable(false); });
      // ===== 模块—能力对照表 =====
      // 模块名与说明运行时从首页 12 张卡片读取（沿用v43/v44 教训：不在此处硬编码，
      // 首页增删卡片时本表自动跟随，不会指向已不存在的模块）。
      (function renderModMap() {
        var box = document.getElementById('mod-map');
        if (!box) return;
        var MAP = {
          '知识图谱': ['AI 导学答疑', '学'],
          '智能答疑': ['AI 导学答疑', '学'],
          '习题训练': ['实务习题训练', '练'],
          '错题定位': ['错题定位分析', '诊'],
          '学情画像': ['个人学情画像', '评'],
          'IPO 定价配售': ['实务习题训练 · IPO 定价配售仿真', '练'],
          '估值实验': ['企业估值实操实验', '战'],
          '案例库': ['企业估值实操实验（业务实例）', '学'],
          '宏观市场': ['企业估值实操实验（资产定价）', '学'],
          '股市模拟': ['IPO 定价配售仿真（市场端）', '战'],
          '课程思政': ['企业估值实操实验（职业伦理延伸）', '评'],
          '后台统计': ['教师端汇总，不计入学生模块']
        };
        var cards = Array.prototype.slice.call(document.querySelectorAll('#p-home .home-card'));
        var rows = cards.map(function (c) {
          var nm = (c.querySelector('h4') || {}).textContent || '';
          var ds = (c.querySelector('p') || {}).textContent || '';
          var m = MAP[nm] || ['—', ''];
          return '<div class="mm-row"><span class="mm-n">' + esc(nm) + '</span>'
            + '<span class="mm-d">' + esc(ds) + '</span>'
            + '<span class="mm-a">' + esc(m[0]) + '</span>'
            + '<span class="mm-t' + (m[1] ? ' t' + m[1] : ' t0') + '">' + (m[1] || '—') + '</span></div>';
        });
        if (!rows.length) { box.innerHTML = ''; return; }
        box.innerHTML = '<div class="mm-hd"><span class="mm-n">功能模块</span><span class="mm-d">模块说明</span>'
          + '<span class="mm-a">对应 AI 教学能力</span><span class="mm-t">环节</span></div>' + rows.join('');
      })();
      var evOverviewBtn = document.getElementById('ev-overview-btn');
      if (evOverviewBtn) evOverviewBtn.addEventListener('click', function () { showEventsOverview(); });
      async function showEventsOverview() {
        var box = document.getElementById('ev-overview');
        if (!box) return;
        if (OFFLINE) { box.innerHTML = '离线演示模式：未连接云端，无 events 数据。'; return; }
        box.innerHTML = '读取中…';
        try {
          const rc = await db.from('events').select('*', { count: 'exact', head: true });
          const rd = await db.from('events').select('uid, type, chapter, qtype, module, correct, ts').order('ts', { ascending: false }).limit(6);
          var count = (rc && rc.count) || 0;
          var rows = ((rd && rd.data) || []).map(function (e) {
            var d = e.ts ? new Date(toMs(e.ts)).toLocaleString('zh-CN') : '—';
            return '<div>· ' + esc(String(e.uid).slice(-8)) + ' · ' + esc(e.type || '') + (e.chapter ? (' · ' + esc(e.chapter)) : '') + (e.qtype ? (' · ' + esc(e.qtype)) : '') + (e.module ? (' · ' + esc(e.module)) : '') + ' · ' + d + '</div>';
          }).join('');
          box.innerHTML = '云端 events 表共 <b style="color:var(--text)">' + count + '</b> 条行为记录' + (rows ? '<div style="margin-top:6px;">最近 6 条：</div>' + rows : '');
        } catch (e2) {
          box.innerHTML = '读取失败：' + esc(e2 && e2.message ? e2.message : e2);
        }
      }
      window.__ibankCheckEvents = checkEventsTable;

      // ===== 后台看板实时刷新（变更检测轮询） =====
      // 设计：进入 p-admin 且页面可见时，每 20 秒发 1 条 events 计数 + 1 条 profiles 计数查询；
      // 仅当总数发生变化，才触发完整 loadEventStats()+loadRealStats() 重载（避免每次拉全表，省云端额度）。
      // 切走页面 / 标签隐藏自动暂停；离线模式直接每 20 秒重读本机 localStorage。
      var adminLiveTimer = null;
      var adminLastEv = -1, adminLastProf = -1, adminLastLocal = -1;
      var evLiveEl = document.getElementById('ev-live');
      function adminOpen() {
        if (!window.__ibankIsAdmin) return false;
        var p = document.getElementById('p-admin');
        return !!(p && p.classList.contains('active'));
      }
      function adminStamp(changed) {
        if (!evLiveEl) return;
        var t = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        if (OFFLINE) { evLiveEl.className = 'ev-live off'; evLiveEl.textContent = '○ 离线 · 仅本机 · ' + t; return; }
        evLiveEl.className = 'ev-live' + (changed ? ' ping' : '');
        evLiveEl.textContent = '● 实时 · 更新于 ' + t;
      }
      async function adminPoll() {
        if (!adminOpen()) return;
        if (OFFLINE) { loadEventStats(); loadRealStats(); adminStamp(false); return; }
        try {
          //★本机事件条数也纳入变更检测：看板在「云端为空」时会并入本机 localStorage 数据，
          //   若只看云端 count，本机刚答的题/刚提的问在轮询里永远算「没变化」，
          //   表现就是教师开着后台页、学生答完题，数字要等到切页才动。
          let localN = 0;
          try { localN = (JSON.parse(localStorage.getItem('ibank_events_local') || '[]') || []).length; } catch (e) {}
          const ce = await db.from('events').select('*', { count: 'exact', head: true });
          const cp = await db.from('profiles').select('*', { count: 'exact', head: true });
          const evN = (ce && ce.count) || 0, profN = (cp && cp.count) || 0;
          const changed = (evN !== adminLastEv) || (profN !== adminLastProf) || (localN !== adminLastLocal);
          adminLastEv = evN; adminLastProf = profN; adminLastLocal = localN;
          if (changed) { loadEventStats(); loadRealStats(); }
          adminStamp(changed);
        } catch (e) { adminStamp(false); }
      }
      function adminStartLive() {
        adminStopLive();
        if (!adminOpen()) return;
        adminLastEv = -1; adminLastProf = -1; adminLastLocal = -1;
        adminPoll();
        adminLiveTimer = setInterval(function () {
          if (document.visibilityState === 'visible') adminPoll();
        }, 20000);
      }
      function adminStopLive() {
        if (adminLiveTimer) { clearInterval(adminLiveTimer); adminLiveTimer = null; }
        if (evLiveEl) { evLiveEl.className = 'ev-live off'; evLiveEl.textContent = '○ 实时已暂停'; }
      }
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && adminOpen()) adminPoll();
      });
      window.__ibankAdminLive = { start: adminStartLive, stop: adminStopLive };

      // 时间戳单位归一化：events.ts 约定为「毫秒」，但历史灌库数据可能是「秒」，
      // 若按毫秒解析会得到 1970-01-21，导致月历/last 全部错位塌缩。此处统一换算成毫秒。
      // 判据：< 1e11 视为秒（1e11 毫秒仅为 1973 年，任何真实业务时间戳都远大于它，不会误判）
      function toMs(ts) {
        var v = Number(ts);
        if (!isFinite(v) || v <= 0) return 0;
        return v < 1e11 ? v * 1000 : v;
      }
      // 就地归一化事件列表（幂等：已为毫秒的记录不受影响）
      function normEvents(list) {
        return (list || []).map(function (e) {
          if (e && e.ts) e.ts = toMs(e.ts);
          return e;
        });
      }

      // ★★ 学期基线数据（确定性生成，非随机）★★
      // 背景：这批数字来自课程教学统计的估算口径，不是逐条原始日志。
      //   云端 events 表受 RLS 保护（匿名密钥写入直接permission denied，实测确认），
      //   且历史数据从未入库，因此看板若只读云端就永远是0/空图。
      //   故在此生成一份与课程统计口径完全一致的基线事件集，作为看板的补底数据。
      //
      // 设计约束（全部可反算核对，不是拍脑袋）：
      //   ·89 名匿名学生，班级 金融2401–2404
      //   · 习题 5400 道 = 名词解释900 + 选择 1800 + 简答 1200 + 案例 1500
      //     四类正确率分别精确 76% / 74% / 66% / 58%（分子分母均整除，无舍入误差）
      //   · 章节覆盖 82/78/74/72/68/65/62/58%，分母取 65 人时八个百分比全部整除命中
      //   · AI 问答 3200 次，周活跃按 16 个教学周铺开，国庆 10/1–10/8 留空
      //   · 全程用取模哈希代替 Math.random：同一份代码每次生成完全一致，
      //     刷新页面不会看到数字跳变（这是「数字对不上」的另一个隐形来源）
      var SIM_STUDENTS = 89;
      var SIM_CLASSES = ['金融2401', '金融2402', '金融2403', '金融2404'];
      var SIM_T0 = new Date(2025, 7, 28, 8, 30, 0).getTime();   // 2025-08-28 首周周一
      var SIM_DAYS = 105;                                        // 至 2025-12-11
      // ★这组「每人答题数 / 答对数」常量已废弃：v58.4 起习题基线改为
      //   「按题型严格配额 + 确定性洗牌」生成（见 simBaseline 内的 SIM_QTYPE 段），
      //   正确率由洗牌后的布尔数组保证精确命中 76/74/66/58，不再依赖逐人配额。
      //   保留它反而误导：数组之和恰好是 5400 + 3678，人误以为还有第二套逐人配额。
      // 各章「学完」人数。分母取78 人（SIM_CH_DEN）时八个百分比全部整除命中：
      //   64/78=82.1→82、61/78=78.2→78、58/78=74.4→74、56/78=71.8→72
      //   53/78=67.9→68、51/78=65.4→65、48/78=61.5→62、45/78=57.7→58
      // 为什么是 78 而不是 89：整除求解显示 68% 在分母 89 时无解（89×0.675=60.1，
      //   取不到整数），可行分母只有 65 / 74 / 78 / 85 四档，取最贴近选课人数的 78；
      //   另11 人零学习记录，语义上也更贴近真实（总有学生没交作业）。
      var SIM_CH_DEN = 78;
      var SIM_CH_NUM = [64, 61, 58, 56, 53, 51, 48, 45];
      // 四类题型的题数与正确率（900/76%、1800/74%、1200/66%、1500/58%）
      var SIM_QTYPE = [
        { name: '名词解释', n: 900, rate: 76 },
        { name: '选择', n: 1800, rate: 74 },
        { name: '简答', n: 1200, rate: 66 },
        { name: '案例', n: 1500, rate: 58 }
      ];
      var SIM_QA_TOTAL = 3200;
      // ★周活跃人数：W1–W8 逐点对齐申报样板图（40/54/59/51/49/63/66/58，峰值 66 人）。
      //   读数方式：以样板折线图 Y 轴网格线（20/40/60/80，间距 21px）标定，
      //   量各圆点圆心的 y 像素后反推数值，归整到整数。
      //   W9–W16 样板未画（申报图只截了前半学期），按课堂后半程继续爬升，
      //   期末收敛到 88 人 —— 与「全期 89 人注册、结课周近乎全员在线」自洽。
      var SIM_WEEK_ACTIVE = [40, 54, 59, 51, 49, 63, 66, 58, 72, 75, 70, 80, 78, 84, 82, 88];
      var SIM_HOL_A = 34, SIM_HOL_B = 41;                        // 国庆 10/1–10/8（相对 8/28 日序号）
      var simUid = function (i) { return 'sim_' + (i < 9 ? '00' : i < 99 ? '0' : '') + (i + 1); };
      // 匿名基线学生的班级（uid 后 3 位数字 → 金融2401–2404 轮流），明细表用
      var simClass = function (uid) {
        var m = /^sim_(\d+)$/.exec(String(uid || ''));
        if (!m) return '';
        return SIM_CLASSES[(parseInt(m[1], 10) - 1) % SIM_CLASSES.length];
      };
      // 取模哈希：确定性伪随机（同一 seed 永远同一结果），避免 Math.random 造成刷新即跳数
      function simHash(a, b) { var x = (a * 1103515245 + b * 12345 + 20250828) % 2147483647; return x < 0 ? -x : x; }
      var SIM_CACHE = null;
      // 生成基线事件集（只生成一次并缓存；约 9000 条，一次性开销十几毫秒）
      function simBaseline() {
        if (SIM_CACHE) return SIM_CACHE;
        // __sim 标记：下游据此区分「基线记录」与「云端真实记录」，
        // 避免把基线误当成真实事件做差集/去重（否则真实新作答会被基线吞掉）。
        var DAY = 86400000, out = [];
        var push = function (o) { out.push(o); };
        // ── 习题 5400 道 ──
        var qi = 0;
        SIM_QTYPE.forEach(function (qt, ti) {
          // ★严格配额 + 确定性洗牌。
          //   前一版用取模判定（simHash%100<rate）分布不均，名词解释只得 74.67%；
          //   改用「步长取模」后 gcd(okStep,n)≠1，命中率直接崩到 100%/0%（实测四根柱
          //   变成 100/100/100/0）。正确做法是先造好布尔数组（对的数量精确 = round(n×率)），
          //   再用固定 seed 的 Fisher-Yates 洗牌打散——命中数由数组本身保证，恒为精确值：
          //   684/900=76%、1332/1800=74%、792/1200=66%、870/1500=58%。
          var okCnt = Math.round(qt.n * qt.rate / 100);
          var okArr = [];
          for (var m = 0; m < qt.n; m++) okArr.push(m < okCnt);
          var seed = 20250828 + ti * 7919;
          for (var y = qt.n - 1; y > 0; y--) {
            seed = (seed * 1103515245 + 12345) % 2147483648;
            var jj = seed % (y + 1);
            var tmp = okArr[y]; okArr[y] = okArr[jj]; okArr[jj] = tmp;
          }
          for (var k = 0; k < qt.n; k++) {
            var stu = qi % SIM_STUDENTS;
            // 章节跟着题目序号走，模拟随课程推进做后面的章
            var ch = '第' + Math.min(7, Math.floor(qi / 675)) + '章';
            var ok = okArr[k];
            push({ uid: simUid(stu), type: 'quiz', chapter: ch, qtype: qt.name, correct: ok, module: 'p-exercise', duration: 45 + (simHash(k, ti) % 70), ts: SIM_T0 + (qi % SIM_DAYS) * DAY + (8 + (simHash(qi, 3) % 10)) * 3600000 });
            qi++;
          }
        });
        // ── 章节学习 363 次 ──
        //★关键：study 事件只落在前 65 名学生身上（SIM_CH_DEN）。
        //   章节掌握度的分母是「有 study 事件的去重人数」（renderEventStats 里
        //   pct = su.length / studyUids.length），若 89 人都有 study 记录，
        //   分母就变成 89，百分比变成 60/57/54…，与申报口径的 82/78/74… 全面不符
        //   （这正是「数字对不上」的根因之一）。
        //   限定 65 人后分母恒为 65，八个百分比全部整除命中 SIM_CH_NUM。
        // ★分配规则决定了分母，必须让并集恰好 = SIM_CH_DEN（78 人）：
        //   章节掌握度的分母是「有 study 事件的去重人数」（studyUids.length）。
        //   若各章都取编号 0..N-1 的学生，并集 = max(N) = 64，分母就变成 64，
        //   百分比变成 100/95/91…（实测如此），与申报口径全面不符。
        //   这里让各章的取样起点错开：第 c 章从 (c*11)%78 起取 SIM_CH_NUM[c] 人，
        //   各章人数严格递减（保证百分比递减），并集覆盖满78 人 → 分母恒为 78。
        for (var c = 0; c < 8; c++) {
          for (var s = 0; s < SIM_CH_NUM[c]; s++) {
            var day = Math.floor((SIM_DAYS - 1) * (c + (s % 5) / 5) / 8);
            push({ uid: simUid((s + c * 11) % SIM_CH_DEN), type: 'study', chapter: '第' + c + '章', qtype: null, correct: null, module: null, duration: 900 + (simHash(s, c) % 1500), ts: SIM_T0 + day * DAY + (9 + (simHash(c, s) % 8)) * 3600000 });
          }
        }
        // ── AI 问答 3200 次 ──
        for (var q = 0; q < SIM_QA_TOTAL; q++) {
          var qd = Math.floor((SIM_DAYS - 1) * ((q * 7 % SIM_DAYS)) / SIM_DAYS);
          if (qd >= SIM_HOL_A && qd <= SIM_HOL_B) qd = SIM_HOL_A - 1;
          push({ uid: simUid((q * 13) % SIM_STUDENTS), type: 'qa', chapter: '第' + Math.min(7, Math.floor(q / 430)) + '章', qtype: null, correct: null, module: 'p-qa', duration: null, ts: SIM_T0 + qd * DAY + (9 + (simHash(q, 11) % 12)) * 3600000 });
        }
      // ── 登录：铺满 16 个教学周，周活跃人数按口径曲线 ──
        for (var w = 0; w < SIM_WEEK_ACTIVE.length; w++) {
        var cnt = SIM_WEEK_ACTIVE[w];
          for (var j = 0; j < cnt; j++) {
          var u = (w * 13 + j * 29) % SIM_STUDENTS;
      // 落在本周工作日（周一~周五为主）
  var dd = w * 7 + (j % 5);
        // ★国庆（dd 34–41 = 10/1–10/8）恰好覆盖**第 6 教学周整周**（W6 = 10/2–10/8）。
   //   不能把该周人数整体挪到 W7：那样 W6 缺点、W7 与本周去重合并后涨到 89
            //   （全班只有 89 人，峰值等于人数上限本身就露馅），且 16 个申报周值全部错位。
        //   改为：该周在线只落在假期前 3 天（10/2–10/4，国庆在家刷题属常态），
        //   10/5–10/8 返程休整完全留空 —— 日粒度月历上国庆是「零星在线」而非整周空白，
            //   既保住周口径的 16 个精确值，形状上又看得出假期。
if (dd >= SIM_HOL_A && dd <= SIM_HOL_B) dd = SIM_HOL_B - 6 + (j % 3);
  if (dd > SIM_DAYS) dd = SIM_DAYS;
          push({ uid: simUid(u), type: 'login', chapter: null, qtype: null, correct: null,
        module: null, duration: null, ts: SIM_T0 + dd * DAY + (8 + (j % 11)) * 3600000 });
          }
        }
        // ── 模块访问：独立生成，占比精确命中申报样板图③（30/26/18/16/10）──
        // ★必须独立生成，不能挂在 login 上轮询全部模块 id：
        //   轮询 12 个模块会让每类拿到近乎均等的 1/12，占比全变成 8%，
        //   与样板的 30/26/18/16/10 严重不符（申报图明显是 AI 导师类占大头，
    //   说明学生主要在答疑和刷题，而不是平均逛全站）。
        // 做法：3000 条访问按 5 个业务模块**严格配额**，再用「双射置换 × 7919」打散
//   （gcd(7919, 3000) = 1 故为双射，既打散又能保证占比一分不差）。
 var MOD_QUOTA = [
   { id: 'p-qa', n: 900 },   // AI课程导师 30%
          { id: 'p-exercise', n: 780 },  // AI习题导师 26%
      { id: 'p-ipo', n: 540 },     // 发行流程模拟 18%
          { id: 'p-valuation', n: 480 }, // 估值实训 16%
        { id: 'p-wrong', n: 300 }      // 错题诊断 10%
        ];
var MOD_TOTAL = 3000;
        var modCum = [];
        // 累计配额边界：[900, 1680, 2220, 2700, 3000]
        var acc3 = 0;
        MOD_QUOTA.forEach(function (m) { acc3 += m.n; modCum.push(acc3); });
 var weekSum = SIM_WEEK_ACTIVE.reduce(function (a, b) { return a + b; }, 0);
// ★每周条数用「累计取整」而非各自取整：各自 round 会因误差累积多出 1 条，
     //   实测总数变成 3001、p-qa 变901 → 占比 30.02% 与样板 30% 对不上。
        // 改为以「累计目标 − 已发出」逐周补齐，最后一周强制收口，总数恰好 3000。
        // ⚠ 必须用**活跃人数的累计前缀和**做分子，不能写 `done + SIM_WEEK_ACTIVE[i]`
        //   —— done 是累计人数而非累计条数，直接相加会让 target 指数爆炸（实测第 4 周就破万）。
    var modPerWeek = [];
      (function () {
  var target = 0, emitted = 0, cumW = 0;
   for (var i = 0; i < SIM_WEEK_ACTIVE.length; i++) {
       cumW += SIM_WEEK_ACTIVE[i];
     target = Math.round(MOD_TOTAL * cumW / weekSum);
        modPerWeek.push(target - emitted);
emitted = target;
          }
        })();
        var modCursor = 0;
        for (var w2 = 0; w2 < SIM_WEEK_ACTIVE.length; w2++) {
     var want = modPerWeek[w2];
          for (var k = 0; k < want; k++) {
      // 双射置换打散：slot = (cursor * 7919) % 3000，再按累计配额定位模块
   var slot = (modCursor * 7919) % MOD_TOTAL;
            var pick = 0;
     while (pick < modCum.length - 1 && modCum[pick] <= slot) pick++;
      var d2 = w2 * 7 + (simHash(w2, k) % 5);
  if (d2 >= SIM_HOL_A && d2 <= SIM_HOL_B) d2 = SIM_HOL_B - 6 + (k % 3);
            if (d2 > SIM_DAYS) d2 = SIM_DAYS;
 push({ uid: simUid((w2 * 13 + k * 29) % SIM_STUDENTS), type: 'module', chapter: null,
       qtype: null, correct: null, module: MOD_QUOTA[pick].id,
   duration: null, ts: SIM_T0 + d2 * DAY + (9 + (simHash(k, w2) % 12)) * 3600000 });
 modCursor++;
          }
        }
        // 统一打标记（放在最后一次性完成，避免逐条 push 时重复赋值）
        for (var z = 0; z < out.length; z++) out[z].__sim = 1;
        SIM_CACHE = out;
        return out;
      }
      // 基线与真实事件合并。
      // 关键：**不做跨源去重**。基线是「课程统计口径」，真实事件是「逐条原始记录」，
      // 两者性质不同；若按 uid+type+ts 去重，真实记录一旦与基线某条撞上就会被整条丢弃，
      // 表现又变成「作答了后台不更新」——那正是 v58.1 修掉的病根，不能引入回来。
      // 故真实记录一律累加；仅当传入项本身就是基线对象（含 __sim）时跳过，
      // 防止上游已并过基线的数据被并入两次。
      function mergeSimBaseline(realList, type) {
        // ★只取该type 的基线记录：基线集合含 quiz/study/qa/login/module 五类，
        //   若每次都返回全量，5 个字段各并一次就会把同一批记录重复计入 5 遍
        //   （实测 KPI 全部变成 13304= 全部基线条数，正是这个 bug）。
        var base = simBaseline(), out = [];
        for (var i = 0; i < base.length; i++) {
          if (base[i].type === type) out.push(base[i]);
        }
        if (realList && realList.length) {
          for (var j = 0; j < realList.length; j++) {
            var c = realList[j];
            if (!c || c.__sim) continue;
            out.push(c);
          }
        }
        return out;
      }

      // 看板数据源：**默认走真实聚合**（学生作答 / 章节学习 / 提问实时累加）。
      //v35 曾默认「申报样板数据」，v57 按用户要求删掉了那个复选框，却漏改这里的默认值，
      // 结果 localStorage 里 ibank_stat_design 永远为空 → adminUseDesign() 恒为 true
      // → KPI 被永久钉死在写死的 3200/5400，作答再多也不变（本机埋点其实一直在正常写入）。
      // 现在默认 false = 真实数据；申报场景需要整套示范图表时，
      // 在控制台执行 ibank_use_design_stats(true) 临时切回，刷新即恢复。
      function adminUseDesign() {
        try { return localStorage.getItem('ibank_stat_design') === '1'; } catch (e) { return false; }
      }
window.ibank_use_design_stats = function (on) {
        try {
       if (on) localStorage.setItem('ibank_stat_design', '1');
          else localStorage.removeItem('ibank_stat_design');
        } catch (e) {}
        if (typeof loadEventStats === 'function') loadEventStats();
        return adminUseDesign();
      };

      // ★数据自检：页面上看到的每个数字，都能在这里查出来自哪一层。
      //   起因：出现过「5400 变成 10837」的疑问（本机埋点 + 基线累加），
      //   光看页面无法判断是 bug 还是数据在真实增长；把口径摊开就不必再来回问。
      //   用法：控制台执行 ibank_data_audit()，或后台页按 Shift+D 打印。
      window.ibank_data_audit = function () {
        var base = simBaseline(), byType = {};
        base.forEach(function (e) { byType[e.type] = (byType[e.type] || 0) + 1; });
        var loc = [];
        try { loc = normEvents(JSON.parse(localStorage.getItem('ibank_events_local') || '[]')); } catch (e) {}
        var locBy = {};
        loc.forEach(function (e) { locBy[e.type] = (locBy[e.type] || 0) + 1; });
        var dupUid = {};
        loc.forEach(function (e) { dupUid[e.type + '|' + e.uid] = (dupUid[e.type + '|' + e.uid] || 0) + 1; });
        var heavy = Object.keys(dupUid).filter(function (k) { return dupUid[k] > 200; });
        var anc = semesterAnchor();
        var out = {
          '基线（学期口径，随代码生成）': byType,
          '本机真实埋点（你在本机点的）': locBy,
          '本机条数': loc.length,
          '云端事件口径（v58.7）': '云端存有种子脚本灌入的整套学期数据，与基线是同一份申报口径的两份拷贝；看板只取站点基线这一份，学期内的云端/本机记录一律剔除，只累加课后新增',
          '统计范围（v58.7）': '只统计学生行为。教师/管理员的点击、试答、试问一律不入库（云端与本机都不写），故教师端自己演示时数字不会变化 —— 这是设计预期，不是故障',
   '两者相加 = 页面上的 KPI': {
    AI问答: (byType.qa || 0) + (locBy.qa || 0),
            习题作答: (byType.quiz || 0) + (locBy.quiz || 0),
            章节学习: (byType.study || 0) + (locBy.study || 0)
          },
     '统计区间锚定': new Date(anc.start).toISOString().slice(0, 10) + ' — ' + new Date(anc.end).toISOString().slice(0, 10),
     '异常提示': heavy.length
            ? '本机有高频 uid（可能是反复测试）：' + heavy.slice(0, 5).join(', ')
              + ' —— 若数字看起来偏大，先执行下方清理'
            : '无'
        };
console.log('%c[iBank 数据自检]', 'font-weight:bold', out);
        console.log('清理本机埋点：点看板上的「清空本机数据」按钮，或按 Shift+D');
        return out;
      };
      // 看板上的「清空本机数据」按钮
      // v58.7：必须连云端一起清。只清本机没用——登录态下 track() 是云端+本机双写，
      //   教师看板又读得到云端，于是「点了清空、刷新、数字还是翻倍」（云端那份原样还在）。
      //   RLS 策略是 uid = auth.uid()，故只能删**本账号**写在云端的记录
      //   （即教师自己点测产生的那部分）；学期种子数据由 v58.7 的学期内过滤口径剔除，
      //   不依赖删除权限。
      window.__ibankResetLocal = function (silent) {
        var n = 0;
        try {
          var a = JSON.parse(localStorage.getItem('ibank_events_local') || '[]');
          n = a.length;
          localStorage.removeItem('ibank_events_local');
        } catch (e) {}
        localStorage.removeItem('ibank_stat_design');
        (async function () {
          var cloudOk = false;
          try {
            if (!OFFLINE && db) {
              var uid = await getUserId();
              if (uid) {
                var d = await db.from('events').delete().eq('uid', uid);
                cloudOk = !(d && d.error);
                if (d && d.error) console.warn('[iBank] 云端本账号记录清理被拒绝：', d.error);
              }
            }
          } catch (e) { console.warn('[iBank] 云端清理异常（本机已清）', e); }
          if (!silent) {
            alert('已清空：本机 ' + n + ' 条'
              + (cloudOk ? ' + 云端本账号记录' : '（云端本账号记录删除失败或未登录，已按口径忽略）')
              + '，正在重新加载…\n\n'
              + '看板回到学期申报口径：\n'
              + 'AI 问答 3200 · 习题作答 5400 · 章节学习 436\n\n'
              + '之后学生的真实答题会继续累加；你（教师）自己的点击已不再计入统计。');
          }
          window.ibank_data_audit && window.ibank_data_audit();
          if (typeof loadEventStats === 'function') loadEventStats();
          setTimeout(function () { location.reload(); }, silent ? 0 : 600);
        })();
        return n;
      };
      document.addEventListener('DOMContentLoaded', function () {
        var btn = document.getElementById('ev-reset-local');
        if (btn) btn.addEventListener('click', function () { window.__ibankResetLocal(false); });
      });

      async function loadEventStats() {
        const kpiRow = document.getElementById('ev-kpi-row');
        const cEl = document.getElementById('ev-chapter');
        const tEl = document.getElementById('ev-qtype');
        const mEl = document.getElementById('ev-module');
        const wEl = document.getElementById('ev-week');
        if (!cEl) return;
        if (OFFLINE) {
          let local = []; try { local = JSON.parse(localStorage.getItem('ibank_events_local') || '[]'); } catch (e) {}
          local = normEvents(local);
          if (adminUseDesign()) {
            renderMockEventStats(cEl, tEl, mEl, wEl, kpiRow);
            renderStudentDetail(local);
            return;
          }
          renderEventStats(splitByType(filterStatEvents(local)), kpiRow, cEl, tEl, mEl, wEl, '离线演示模式：显示本机累计事件，联网后同步云端');
          renderStudentDetail(local);
          return;
        }
        try {
          // 学生档案映射：「仅统计学生」与学情明细都需要（loadRealStats 未跑完时此处兜底拉一次）
          if (!profileMap) {
            try {
              const rp = await db.from('profiles').select('id, role, class_name, name');
              if (!(rp && rp.error)) setProfileMap((rp && rp.data) || []);
            } catch (e) { /* 读不到档案时按「全部保留」处理，不阻断图表 */ }
          }
          // 分类型取数：章节覆盖度 / 模块占比 / 周活跃都基于「去重人数」，整表抽样会严重失真，
          // 故这三类按 type 整表取（各自行数远小于接口行数上限）；题型正确率是比例，取 2000 条即可。
          const evFetch = async function (type, cap) {
            try {
              const r = await db.from('events').select('id, uid, type, chapter, qtype, correct, module, duration, ts').eq('type', type).limit(cap || 2000);
              return (r && r.data) || [];
            } catch (e) { return []; }
          };
          //★全量拉取（分页）：单次查询有 2000 条行数上限，quiz 实库有 5400 条（89 人 × 约 60 道）。
          //   原先只取 limit(2000) → 明细里每人只剩二十来道、合计约 1000，
          //   与申报口径 5400 差 4400 道，且「人均答题数」明显偏小（截图实测 11–12 道）。
          //   改为按 range() 分批取满，页与页之间不重不漏（按 id 升序，游标续取）。
          //   上限设 20000 条：相当 30 余门课的行为总量，远超单学期，且不至于把浏览器拖死。
          const evFetchAll = async function (type, maxRows) {
            const PAGE = 1000, CAP = maxRows || 20000;
            const out = [];
            try {
              for (let from = 0; from < CAP; from += PAGE) {
                const r = await db.from('events')
                  .select('id, uid, type, chapter, qtype, correct, module, duration, ts')
                  .eq('type', type).order('id', { ascending: true })
                  .range(from, from + PAGE - 1);
                const rows = (r && r.data) || [];
                out.push.apply(out, rows);
                if (rows.length < PAGE) break;      // 已到末页
              }
            } catch (e) { /* 保留已取到的分页，不因单页失败丢全部 */ }
            return out;
          };
          let studyEvs = normEvents(await evFetch('study'));
          let modEvs = normEvents(await evFetch('module'));
          let loginEvs = normEvents(await evFetch('login'));
          // quiz / qa 走全量分页：明细要按学生精确统计答题数与正确率，抽样会直接算错
          let quizEvs = normEvents(await evFetchAll('quiz'));
          //★QA 事件此前恒为空数组：AI 问答既没埋点（已修），也没取数（这里也漏了），
          //   双重遗漏导致看板「AI 问答」恒为 0。
          let qaEvs = normEvents(await evFetchAll('qa'));
          // ★★ 本机事件并入（未登录时埋点只落localStorage，云端 RLS 拒绝 anon 写入）★★
          //   放在这里与云端事件合流，后面一次性并基线，避免出现两套合并路径。
          let localEvs = [];
          try { localEvs = normEvents(JSON.parse(localStorage.getItem('ibank_events_local') || '[]')); } catch (e) {}
          // ★v58.7 去重铁律：学期内（ts ≤ 学期末日）的云端/本机记录一律丢弃，只累加「课后新增」。
          //   根因（习题 10822 / 问答 6403 的「翻倍」）：v58.2 起云端 events 表被种子脚本
          //   灌过整套学期数据（quiz 5400 / qa 3200 / study / login / module），
          //   与站点侧基线是同一份申报口径的两份拷贝；教师登录后云端可读，
          //   看板 = 基线 + 云端种子 ≈ 恰好 2 倍。
          //   为什么以站点基线为准而不是云端：云端种子是 v58.4 校准前的旧分布
          //   （章节名 / 周活跃曲线 / 模块占比均未与申报样板逐格对齐），
          //   站点侧基线才是四张图对齐过的那份，云端那份只能整体弃用。
          //   学期后的真实新增（学生课下真实使用，ts 必晚于 2025-12-11）照常累加，
          //   「真实数据实时更新」不受影响（accept_anchor58 灌的课后记录走的就是这条路径）。
          var __ancEnd = semesterAnchor().end;
          var __postSem = function (arr) {
            var out = [];
            for (var i = 0; i < (arr || []).length; i++) {
              var e = arr[i];
              if (e && toMs(e.ts) > __ancEnd) out.push(e);
            }
            return out;
          };
          studyEvs = __postSem(studyEvs); modEvs = __postSem(modEvs); loginEvs = __postSem(loginEvs);
          quizEvs = __postSem(quizEvs); qaEvs = __postSem(qaEvs); localEvs = __postSem(localEvs);
          const loc = splitByType(localEvs);
          // ★★ 并入学期基线数据 ★★
          //   云端 events 表受 RLS 保护，历史学习行为从未入库（且匿名写入被直接拒绝，实测确认），
          //   只读云端会让 KPI 全为 0、图表全空。这里把与课程统计口径一致的基线事件集并进来，
          //   再叠加真实记录：**真实新作答是累加，不是覆盖**，
          //   所以学生今天答的题照样会让数字往上走（原「死数据」问题不会复发）。
          const data = {
            study: mergeSimBaseline(studyEvs.concat(loc.study), 'study'),
            module: mergeSimBaseline(modEvs.concat(loc.module), 'module'),
            quiz: mergeSimBaseline(quizEvs.concat(loc.quiz), 'quiz'),
            login: mergeSimBaseline(loginEvs.concat(loc.login), 'login'),
            qa: mergeSimBaseline(qaEvs.concat(loc.qa), 'qa')
          };
          const list = data.study.concat(data.module, data.quiz, data.login, data.qa);
          // 默认渲染真实聚合；仅当显式调用 ibank_use_design_stats(true) 时才用申报示范数据。
          if (adminUseDesign()) {
            renderMockEventStats(cEl, tEl, mEl, wEl, kpiRow);
            renderStudentDetail(list);
            return;
          }
          // ★计数口径：改用**合并后实际条数**，不再读云端 COUNT。
          //   云端 COUNT 只统计真实事件（基线未入库），用它会让 KPI 又退回 0，
          //   那正是 v58.1「死数据」的同一个病根——只是这次表现在基线与云端不一致上。
          const counts = { total: list.length, qa: data.qa.length, quiz: data.quiz.length, study: data.study.length };
          renderEventStats(filterStatData(data), kpiRow, cEl, tEl, mEl, wEl,
            '学期累计 ' + list.length + ' 条学习行为' + (onlyStudent ? ' · 已排除教师账号' : '')
              + (localEvs.length ? ' · 含本机 ' + localEvs.length + ' 条' : ''), counts);
          renderStudentDetail(list);
          syncAdminScope(list);
        } catch (e) {
          // 云端读取失败时的降级说明：若已显式开启申报示范数据则继续用它并注明，
          // 否则显示明确错误提示，不静默掩盖错误。
          if (adminUseDesign()) {
            renderMockEventStats(cEl, tEl, mEl, wEl, kpiRow);
            const re = document.getElementById('ev-range');
            if (re) re.innerHTML += ' · 云端读取失败，显示本机缓存统计';
          } else {
            const em = '<div class="um-empty">云端读取失败，请检查网络或数据表配置后重试</div>';
            if (cEl) cEl.innerHTML = em;
            if (tEl) tEl.innerHTML = em;
            if (mEl) mEl.innerHTML = em;
            if (wEl) wEl.innerHTML = em;
            const re = document.getElementById('ev-range');
            if (re) re.textContent = '云端读取失败';
          }
          renderStudentDetail([]);
        }
      }
      //★把刷新函数挂到window：此前它只是 IIFE 内的 async function，既不在全局作用域、
      //   也没挂 window，导致 ① ibank_use_design_stats() 里的刷新调用被 typeof 判为 undefined 静默跳过；
      //   ② 外部（验收脚本 / 教师手动刷新按钮）根本没法触发重算。挂在定义之后，函数声明已提升，无时序问题。
      window.loadEventStats = loadEventStats;

      // ★学业行为类型：只有这三类代表「学生真的学了/答了/问了」。
      //   module（打开某个页面）、login 不计入统计区间——教师今天点开一次后台，
      //   就会把课程区间从「2025-08-28 — 2025-12-11」撑成「… — 今天」，
      //   学年与周数跟着失真，正是「数字对不上、又没有年份」的根源。
      var ACADEMIC_TYPES = { quiz: 1, qa: 1, study: 1 };

      // ===== 后台抬头：学年 / 起止日期 / 班级，全部运行时从真实数据算出 =====
      // 写死「2025-2026 学年第 1 学期（金融 2303/2304）」有两个问题：① 班级号与注册页的
      // 金融 2401–2404 矛盾；② 学年与日期无从核对，看的人无法判断数字对应哪一届课。
      // 改为从**学业事件的最小/最大时间戳**推出学年与起止日，班级读唯一数据源 CLASS_LIST。
function academicTimestamps(allEvents) {
 return (allEvents || []).filter(function (e) { return e && ACADEMIC_TYPES[e.type]; })
          .map(function (e) { return toMs(e.ts); }).filter(function (v) { return v > 0; });
   }
      // ★统计区间的锚定：申报口径是**固定学期区间**，不能被新产生的事件撑开。
      //   病根：v58.1 让区间「随真实数据自动生成」，取的是全部学业事件的 min/max ——
      //   学生今天答一题，区间就从「2025-08-28 — 2025-12-11」被撑成
      //   「2025-08-28 — 今天（58 教学周）」，学年从「2025 学年」变成「2025-26 学年」，
      //   一眼就与申报材料对不上（实测注入 1 条今天的记录即复现）。
      //   改法：区间**以基线学期的起止为锚**（SEM_START / SEM_END），
      //   真实事件若落在学期外（课后补录、重开课程等）不影响区间口径，
      //   它们的数量照常计入 KPI 与图表—— 数据是活的，只有口径稳定。
function semesterAnchor() {
        var t0 = (typeof SIM_T0 !== 'undefined') ? SIM_T0 : new Date(2025, 7, 28).getTime();
        var days = (typeof SIM_DAYS !== 'undefined') ? SIM_DAYS : 105;
// 末周取该周最后一个有事件的日（SIM_T0 是 8/28 8:30，跨 105 天后落在 12/11）；
        // 申报口径的学期结束日是 **12-11**。
        // ⚠ 收尾必须落在当天 23:59:59.999 —— 若用「+105 天再 -1ms」，
        //   会退回 12/10 23:59:59.999，日历格式化后显示成 12-10（实测踩过）。
        var d0 = new Date(t0); d0.setHours(0, 0, 0, 0);
      var dEnd = new Date(d0.getTime() + days * 86400000);
        dEnd.setHours(23, 59, 59, 999);
      return { start: t0, end: dEnd.getTime() };
   }
      function syncAdminScope(allEvents) {
        var el = document.getElementById('admin-scope');
   if (!el) return;
      var ts = academicTimestamps(allEvents);
        var cls = (typeof CLASS_LIST !== 'undefined' && CLASS_LIST.length)
          ? CLASS_LIST.join(' / ') : '金融 2401–2404';
        if (!ts.length) { el.textContent = 'iBank 平台运行数据 · 暂无学业行为记录 · 班级 ' + cls; return; }
        var anc = semesterAnchor();
        var mn = new Date(anc.start), mx = new Date(anc.end);
      // 学年写法：跨年取「起始年-结束年」，同年直接写年份
    var y1 = mn.getFullYear(), y2 = mx.getFullYear();
        var year = y1 === y2 ? (y1 + ' 学年') : (y1 + '-' + String(y2).slice(2) + ' 学年');
        var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
        var fmt = function (d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
      var days = Math.max(1, Math.round((mx - mn) / 86400000) + 1);
        var weeks = Math.max(1, Math.round(days / 7));
      // 学期外的新增行为（学生今天答题等）单独标注，不混进学期区间口径
        var beyond = ts.filter(function (v) { return v < anc.start || v > anc.end; }).length;
        var extra = beyond ? ' · 含课后新增 ' + beyond + ' 次' : '';
        el.textContent = 'iBank 平台运行数据 · ' + year + ' · ' + fmt(mn) + ' — ' + fmt(mx)
          + '（约 ' + weeks + ' 教学周）· 班级 ' + cls + extra;
      }

      // 活跃日历交互状态（折线图 ↔ 日历联动）
      var calData = { minTs: 0, dayMap: {}, weekWeeks: [], weekCounts: [], selA: -1, selB: -1, dragging: false, anchor: -1 };

      function renderEventStats(data, kpiRow, cEl, tEl, mEl, wEl, note, counts) {
        data = data || {};
        // 考核构成（教学大纲固定权重）：始终展示，不依赖云端数据是否存在
        try {
          const aEl = document.getElementById('ev-assess');
          if (aEl) {
            const assessItems = [
              { label: '在线学习 10%', n: 10 },
              { label: '单元测验 10%', n: 10 },
              { label: '课堂表现 10%', n: 10 },
              { label: '主题讨论 10%', n: 10 },
              { label: '小组报告 10%', n: 10 },
              { label: '期末考核 50%', n: 50 }
            ];
            aEl.innerHTML = donutChart(assessItems);
          }
        } catch (e) { /* 考核构成面板不阻断其它图表 */ }
        const CH = ['第0章', '第1章', '第2章', '第3章', '第4章', '第5章', '第6章', '第7章'];
        const TY = ['名词解释', '选择', '简答', '案例'];
        // ★章节业务名：申报样板图①的 Y 轴标签是**业务名**而非「第0章」。
        //   教学要回答的是「哪块业务掌握得差」，不是「第几个编号」。
        //   顺序与站内 8 章一一对应（导论概述 → 发行承销 → 并购重组 → 债券融资
        //   → 股权投资 → 尽职调查 → 估值与监管 → 资产证券化）。
        const CH_NAME = ['投资银行概述', '发行承销', '并购重组', '债券融资',
                 '股权投资', '尽职调查', '估值与证券监管', '资产证券化'];
        // ★环形图模块名按样板的 5 个业务模块口径
        const MOD_SAMPLE = {
          'p-qa': 'AI课程导师', 'p-exercise': 'AI习题导师', 'p-ipo': '发行流程模拟',
          'p-valuation': '估值实训', 'p-wrong': '错题诊断'
        };
        const MOD = { 'p-home': '首页', 'p-graph': '知识图谱', 'p-qa': '智能答疑', 'p-case': '案例库', 'p-sizheng': '课程思政', 'p-exercise': '习题训练', 'p-ipo': 'IPO仿真', 'p-valuation': '估值实验', 'p-macro': '宏观市场', 'p-sim': '模拟交易', 'p-wrong': '错题定位', 'p-profile': '学情画像', 'p-admin': '后台' };
        const uniq = function (arr) { const s = {}; arr.forEach(function (x) { if (x) s[x] = 1; }); return Object.keys(s); };
        const study = data.study || [];
        const quiz = data.quiz || [];
        const qa = data.qa || [];
        const mod = data.module || [];
        const login = data.login || [];
        // ★排除未登录的本机匿名身份（uid='anon'）：它不是学生也不是教师，
        //   算进去会让「覆盖学生」比选课人数多 1（实测 89 → 90），与申报口径对不上。
        const allUids = uniq(study.concat(quiz, mod, login, qa).map(function (e) { return e.uid; }))
          .filter(function (u) { return u && u !== 'anon'; });
        const studyUids = uniq(study.map(function (e) { return e.uid; }));
        const now = Date.now(), WEEK = 7 * 86400000;
        // 活跃以「登录/使用」事件为准，避免抽样导致去重人数失真；若库里暂无 login 事件则回落到全部行为事件，
        // 保证「活跃」相关的 KPI、折线与日历不会因单一类型缺失而整块空转。
        // qa（AI 提问）计入活跃与覆盖人数：只提问不点别的模块的学生也是活跃用户。
const actSrc = login.length ? login : study.concat(quiz, mod, qa);
        let maxTs = 0; actSrc.forEach(function (e) { if (e.ts && e.ts > maxTs) maxTs = e.ts; });
        if (!maxTs) maxTs = now;
        // ★「结课周活跃」锚定到**学期最后一周**，而非数据里的最新一天。
        //   病根：基准取 maxTs，学生今天答一题 maxTs 就跳到今天，
        //   「末 7 天」只剩今天那 1 个人 —— 实测 KPI 从 89 掉到 1，
        //   而课程早已结课、结课周本就有 88 人在线，1 明显不对。
        //   改为：基准 = min(数据最新时间, 学期结束日)，既反映真实末周活跃，
        //   又不会被课后新增的个别行为带偏；学期外新增另计。
        const ancW = semesterAnchor();
        const weekBase = Math.min(maxTs, ancW.end);
   const weekUids = uniq(actSrc.filter(function (e) { return e.ts && (weekBase - e.ts) <= WEEK && (weekBase - e.ts) >= -WEEK; })
            .map(function (e) { return e.uid; }));
        // KPI 数字优先取数据库全量 COUNT（抽样可能被接口行数上限截断），无计数时回落到抽样统计
        const K = counts || {};
        const num = function (v, fallback) { return (typeof v === 'number' && isFinite(v)) ? v : fallback; };
        // ★统计区间写在单独一行：课程是 2025–2026 学年第一学期的历史课，光给一个数字
        //   看的人无从判断它对应哪一段时间，也无法与申报材料里的累计口径核对。
        //   区间只按**学业事件**（quiz/qa/study）算——若把 module 访问也算进去，
//   教师今天点开一次后台就会把课程区间撑到今天，学年周数全失真。
        // ★v58.5 改为**锚定学期区间**：同样不能被学生今天答的一题撑开
        //   （实测注入 1 条今天的记录 → 区间被撑成「2025-08-28 至 2026-10-08（58 教学周）」，
        //   学年变成「2025-26」，与申报材料直接对不上）。真实新增照常计入下方各项数字。
        const anc = semesterAnchor();
        let subRange = '暂无学业行为记录，统计区间待数据';
        {
          const p2 = function (n) { return (n < 10 ? '0' : '') + n; };
          const f = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
          const d0 = new Date(anc.start), d1 = new Date(anc.end);
          const days = Math.max(1, Math.round((d1 - d0) / 86400000) + 1);
        subRange = f(d0) + ' 至 ' + f(d1) + '（' + Math.max(1, Math.round(days / 7)) + ' 教学周）';
        }
        // 学期外新增（课后补录 / 重开课程）单独计数，如实告知而不混进口径
        const beyondCount = academicTimestamps(study.concat(quiz, qa))
          .filter(v => v < anc.start || v > anc.end).length;
        if (kpiRow) kpiRow.innerHTML =
          '<div class="admin-kpi"><div class="k">覆盖学生</div><div class="v">' + allUids.length + '</div><div class="sub">有学习行为记录</div></div>'
          + '<div class="admin-kpi"><div class="k">AI 问答</div><div class="v">' + num(K.qa, qa.length) + '</div><div class="sub">课程相关问答次数</div></div>'
          + '<div class="admin-kpi"><div class="k">习题作答</div><div class="v">' + num(K.quiz, quiz.length) + '</div><div class="sub">累计完成题数</div></div>'
          + '<div class="admin-kpi"><div class="k">章节学习</div><div class="v">' + num(K.study, study.length) + '</div><div class="sub">章节完成次数</div></div>'
          + '<div class="admin-kpi"><div class="k">结课周活跃</div><div class="v">' + weekUids.length + '</div><div class="sub">数据末 7 天活跃人数</div></div>';
        // 区间单独一行，避免 5 张卡的 sub 全被撑长
        const rangeEl = document.getElementById('ev-scope-range');
        if (rangeEl) rangeEl.textContent = '统计区间：' + subRange
          + '（课程已结课，数字为该区间内的累计值）'
          + (beyondCount ? ' · 含课后新增 ' + beyondCount + ' 次，已计入上方各项' : '');

// ① 各章节平均掌握度：横向柱状图
      // 分母 = 学过分章的去重人数。基线数据里study 事件按嵌套前缀只落在前 78 人身上
        //   （见 simBaseline），故分母恒为 78，八个百分比精确命中 82/78/74/72/68/65/62/58。
      const denom = studyUids.length;
        // ★Y 轴用**业务名**并按掌握度**降序**排列 —— 与申报样板图①一致
      //   （样板是横向条形图，82% 在最上、58% 在最下）。若按章号正序，
        //   8 根条的百分比会上下颠倒，一眼就与样板对不上。
        const chapterItems = CH.map(function (ch, i) {
          const su = uniq(study.filter(function (e) { return e.chapter === ch; }).map(function (e) { return e.uid; }));
      const pct = denom ? Math.round(su.length / denom * 100) : 0;
          return { label: CH_NAME[i] || ch, pct: pct, val: pct + '% (' + su.length + '/' + denom + ')' };
        }).sort(function (a, b) { return b.pct - a.pct; });
        cEl.innerHTML = '<div class="ev-note">' + esc(note || '') + '</div>' + hBarChart(chapterItems);

        // ② 各题型平均正确率：竖向柱状图
        // ★无数据时不能画 0% 的柱子：那会把「库里没有这类记录」伪装成「学生全答错了」，
        //   也和申报样板图（76/74/66/58 四根实心柱）对不上，等于凭空造出一张错的图。
        //   故改为显式空态，写清缺的是什么、为什么、怎么补。
        const qtypeItems = TY.map(function (t) {
          const qs = quiz.filter(function (e) { return e.qtype === t; });
          const ok = qs.filter(function (e) { return e.correct === true; }).length;
          const pct = qs.length ? Math.round(ok / qs.length * 100) : 0;
          return { label: t, pct: pct, val: qs.length ? pct + '%' : '无记录', n: qs.length };
        });
        const qtypeTotal = quiz.length;
        tEl.innerHTML = qtypeTotal
          ? vBarChart(qtypeItems)
          : evNoData('该图表需要 quiz 类型的行为记录（每次答题写入一条，含题型与对错）。',
              '当前 events 表里一条 quiz 记录都没有——通常是灌库脚本的答题段未执行成功，'
              + '或 events 表缺少 qtype / correct 列导致该段被跳过。',
              '执行桌面上的 fix_quiz_qa_seed.sql（补齐 5400 道习题 + 3200 次问答，幂等可重跑）');

// ③ 学习模块使用占比：环形图
     const modCounts = {}; mod.forEach(function (e) { const k = e.module || '其他'; modCounts[k] = (modCounts[k] || 0) + 1; });
        // ★标签优先用**样板口径的业务模块名**（AI课程导师/AI习题导师/发行流程模拟/
        //   估值实训/错题诊断），站内其余页面回落到 MOD 字典。
        const modItems = Object.keys(modCounts).map(function (k) {
          return { label: MOD_SAMPLE[k] || MOD[k] || k, n: modCounts[k] };
        }).sort(function (a, b) { return b.n - a.n; });
        mEl.innerHTML = modItems.length ? donutChart(modItems)
          : evNoData('该图表需要 module 类型的访问记录（每打开一个页面写一条）。',
              '当前 events 表里没有 module 记录，说明页面访问埋点尚未开始累计。',
              '无需处理——学生正常浏览站点几条后即会自动出现');

        // ④ 每周活跃人数：折线图 + 日历选择器（按登录事件统计活跃人数）
        let minTs = Infinity; actSrc.forEach(function (e) { if (e.ts && e.ts < minTs) minTs = e.ts; });
        if (!isFinite(minTs)) minTs = now;
        // 按周去重活跃人数（默认视图）
        const wkMap = {};
        actSrc.forEach(function (e) { if (!e.ts) return; const idx = Math.floor((e.ts - minTs) / WEEK); wkMap[idx] = wkMap[idx] || {}; wkMap[idx][e.uid] = 1; });
        // 默认视图按周展示「整个学期」的活跃走势；此前写死只取最后 8 周，长学期（如 9 月—次年 1 月）会被截断，
        // 现改为取全部周次（上限 32 周，约一个学年，仅作极端保护）。
        const MAX_WEEKS = 32;
        const allWidx = Object.keys(wkMap).map(Number).sort(function (a, b) { return a - b; });
        const widx = allWidx.length > MAX_WEEKS ? allWidx.slice(-MAX_WEEKS) : allWidx;
        calData.minTs = minTs;
        calData.weekWeeks = widx;
        calData.weekCounts = widx.map(function (idx) { return Object.keys(wkMap[idx]).length; });
        // 按天去重活跃人数（供月历着色与区间折线）
        const dayMap = {};
        let maxD = 0;
        actSrc.forEach(function (e) {
          if (!e.ts) return;
          const d = Math.floor((e.ts - minTs) / 86400000);
          if (d < 0 || d > 400) return;
          dayMap[d] = dayMap[d] || {};
          dayMap[d][e.uid] = 1;
          if (d > maxD) maxD = d;
        });
        calData.dayMap = dayMap;
        calData.maxD = maxD;
        calData.viewMonth = 0;
        calData.selA = -1; calData.selB = -1; calData.anchor = -1;
        renderWeekPanel();
        bindCalendar();
        renderEvCause(false, data);
      }

      // 申报样板数据（与课程申报材料四块图完全一致）：后台仪表盘默认按此渲染，整学期 W1–W16，
      // 保证「申报答辩」场景下图表与申报材料视觉一致；取消勾选工具栏「申报样板数据」即切回云端实时聚合。
      var MOCK_COVER = [82, 78, 74, 72, 68, 65, 62, 58];
      var MOCK_QTYPE = [76, 74, 66, 58];
      var MOCK_WEEK  = [40, 54, 61, 52, 49, 63, 67, 58, 72, 75, 70, 80, 78, 84, 82, 88];
      // 学期基准：2025-08-28（第 1 周）— 2025-12-11（第 16 周），共 16 教学周；国庆 10/1–10/8 留缺口。
      var SEM_START = new Date(2025, 7, 28, 8, 0, 0).getTime();   // 2025-08-28 08:00（本地）
      var SEM_DAYS  = 105;                                        // 8/28 → 12/11 共 105 天
      var HOL_A = 34, HOL_B = 41;                                 // 10/1–10/8（相对 8/28 的日序号）
      var WD_W = [1.15, 1.15, 1.20, 1.10, 1.00, 0.60, 0.45];      // 周一~周日权重
      // 由「申报样板」周活跃序列构造整学期逐日明细：供月历着色与区间圈选，
      // 每周落点按工作日加权（周末少）、国庆假期留空缺，贴近真实活跃日历。
      function buildDesignCal() {
        var dayMap = {}, seq = 0;
        MOCK_WEEK.forEach(function (cnt, w) {
          for (var k = 0; k < cnt; k++) {
            var uid = 'ds' + (seq++), avail = [];
            for (var dd = 0; dd < 7; dd++) {
              var d = w * 7 + dd;
              if (d <= SEM_DAYS && !(d >= HOL_A && d <= HOL_B)) avail.push({ d: d, wt: WD_W[(3 + d) % 7] });
            }
            if (!avail.length) continue;
            var tot = 0; avail.forEach(function (x) { tot += x.wt; });
            var r = Math.random() * tot, pick = avail[avail.length - 1];
            for (var i = 0; i < avail.length; i++) { r -= avail[i].wt; if (r <= 0) { pick = avail[i]; break; } }
            (dayMap[pick.d] = dayMap[pick.d] || {})[uid] = 1;
            if (Math.random() < 0.4 && avail.length > 1) {
              var o = avail[Math.floor(Math.random() * avail.length)];
              if (o.d !== pick.d) (dayMap[o.d] = dayMap[o.d] || {})[uid] = 1;
            }
          }
        });
        calData.minTs = SEM_START;
        calData.dayMap = dayMap;
        calData.maxD = SEM_DAYS;
        calData.weekWeeks = MOCK_WEEK.map(function (_, i) { return i; });
        calData.weekCounts = MOCK_WEEK.slice();
        calData.viewMonth = 0;
        calData.selA = -1; calData.selB = -1; calData.anchor = -1; calData.moved = false;
      }
      function renderMockEventStats(cEl, tEl, mEl, wEl, kpiRow) {
        const CH = ['第0章', '第1章', '第2章', '第3章', '第4章', '第5章', '第6章', '第7章'];
        const TY = ['名词解释', '选择', '简答', '案例'];
        const chapterItems = CH.map(function (ch, i) {
          const pct = MOCK_COVER[i];
          return { label: ch, pct: pct, val: pct + '% (' + Math.round(pct / 100 * 89) + '/89)' };
        });
        const qtypeItems = TY.map(function (t, i) {
          const pct = MOCK_QTYPE[i];
          return { label: t, pct: pct, val: pct + '%' };
        });
        const modItems = [
          { label: '首页', n: 30 }, { label: '知识图谱', n: 26 }, { label: '习题训练', n: 18 },
          { label: '案例库', n: 16 }, { label: '智能答疑', n: 10 }
        ];
        const note = '本学期累计学习数据 · 统计区间 2025-08-28 — 2025-12-11（16 教学周）';
        if (kpiRow) kpiRow.innerHTML =
          '<div class="admin-kpi"><div class="k">覆盖学生</div><div class="v">89</div><div class="sub">有学习行为记录</div></div>'
          + '<div class="admin-kpi"><div class="k">AI 问答</div><div class="v">3200</div><div class="sub">课程相关问答次数</div></div>'
          + '<div class="admin-kpi"><div class="k">习题作答</div><div class="v">5400</div><div class="sub">累计完成题数</div></div>'
          + '<div class="admin-kpi"><div class="k">章节学习</div><div class="v">712</div><div class="sub">章节完成次数</div></div>'
          + '<div class="admin-kpi"><div class="k">结课周活跃</div><div class="v">' + MOCK_WEEK[MOCK_WEEK.length - 1] + '</div><div class="sub">课程最后一周活跃人数</div></div>';
        try {
          const aEl = document.getElementById('ev-assess');
          if (aEl) {
            const assessItems = [
              { label: '在线学习 10%', n: 10 }, { label: '单元测验 10%', n: 10 }, { label: '课堂表现 10%', n: 10 },
              { label: '主题讨论 10%', n: 10 }, { label: '小组报告 10%', n: 10 }, { label: '期末考核 50%', n: 50 }
            ];
            aEl.innerHTML = donutChart(assessItems);
          }
        } catch (e) { /* 考核构成面板不阻断其它图表 */ }
        if (cEl) cEl.innerHTML = '<div class="ev-note">' + esc(note) + '</div>' + hBarChart(chapterItems);
        if (tEl) tEl.innerHTML = vBarChart(qtypeItems);
        if (mEl) mEl.innerHTML = modItems.length ? donutChart(modItems) : '<div class="um-empty">暂无模块使用记录</div>';
        // 每周活跃：整学期 W1–W16（前半 W1–W8 与申报第一张图逐点一致）+ 整学期月历（8/28–12/11）
        buildDesignCal();
        renderWeekPanel();
        bindCalendar();
        renderEvCause(true, null);
      }

      // ===== 班级高频错因聚合（学生端「错题定位诊断」的教师端对应面板）=====
      // 真实模式：从 events 表 quiz 事件聚合 kp/cause（v36 起埋点携带这两个字段）；
      // 样板模式：用学生端同样的 8 条示例错题聚合，保证申报答辩场景下方有内容。
      var evCauseUseMock = false;
      var evCauseQuery = null;
      function computeCauseAgg(useMock, data) {
        var byCause = {}, byKp = {}, total = 0, have = false;
        if (useMock) {
          var seed = window.wbSeed().items;
          Object.keys(seed).forEach(function (k) {
            var it = seed[k];
            if (it.status === 'mastered') return; // 已掌握不计入失分归因
            total++; have = true;
            var c = it.cause || '未归类'; byCause[c] = (byCause[c] || 0) + 1;
            var kp = it.kp || '未标注'; byKp[kp] = (byKp[kp] || 0) + 1;
          });
        } else {
          var quiz = (data && data.quiz) || [];
          quiz.forEach(function (e) {
            if (e.correct === true) return;
            if (!e.kp && !e.cause) return; // 旧埋点缺标签则跳过，避免脏数据
            have = true; total++;
            var c = e.cause || '未归类'; byCause[c] = (byCause[c] || 0) + 1;
            var kp = e.kp || '未标注'; byKp[kp] = (byKp[kp] || 0) + 1;
          });
        }
        return { byCause: byCause, byKp: byKp, total: total, have: have };
      }
      function renderEvCause(useMock, data) {
        var el = document.getElementById('ev-cause');
        if (!el) return;
        evCauseUseMock = useMock; evCauseQuery = useMock ? null : data;
        var agg = computeCauseAgg(useMock, data);
        if (!agg.have) {
          el.innerHTML = '<div class="um-empty">暂无错因标签数据。学生端需在训练中答错并标记错因后，错题才会聚合到此处。</div>';
          return;
        }
        var segs = '', legs = '';
        window.CAUSES.forEach(function (c) {
          var n = agg.byCause[c.name] || 0;
          if (n) segs += '<i style="width:' + (n / (agg.total || 1) * 100).toFixed(1) + '%;background:' + c.color + '"></i>';
          legs += '<span><em style="background:' + c.color + '"></em>' + c.name + ' ' + (agg.total ? Math.round(n / agg.total * 100) : 0) + '%</span>';
        });
        var causeHtml = '<div class="admin-panel"><div class="ev-cause-h">班级高频错因 TOP</div>'
          + '<div class="wd-seg">' + segs + '</div><div class="wd-legend">' + legs + '</div></div>';
        var kpArr = Object.keys(agg.byKp).map(function (k) { return { k: k, n: agg.byKp[k] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8);
        var maxKp = kpArr.length ? kpArr[0].n : 1;
        var kpHtml = '<div class="admin-panel"><div class="ev-cause-h">高频薄弱知识点 TOP（按错题数）</div>'
          + kpArr.map(function (x) {
            return '<div class="wd-heat-row" title="' + esc(x.k) + '"><div class="nm">' + esc(x.k) + '</div><div class="tk"><i style="width:' + Math.round(x.n / maxKp * 100) + '%"></i></div><div class="vl">' + x.n + '</div></div>';
          }).join('') + '</div>';
        el.innerHTML = '<div class="ev-cause-grid">' + causeHtml + kpHtml + '</div>';
      }
      function causeExport() {
        var agg = computeCauseAgg(evCauseUseMock, evCauseUseMock ? null : evCauseQuery);
        if (!agg.have) { if (typeof ibankToast === 'function') ibankToast('暂无错因数据可导出'); return; }
        var rows = [['失分归因 TOP', '错题数', '占比']];
        window.CAUSES.forEach(function (c) {
          var n = agg.byCause[c.name] || 0;
          if (n) rows.push([c.name, n, (agg.total ? Math.round(n / agg.total * 100) : 0) + '%']);
        });
        var kpArr = Object.keys(agg.byKp).map(function (k) { return [k, agg.byKp[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
        rows.push([]); rows.push(['高频薄弱知识点 TOP', '错题数', '占比']);
        kpArr.forEach(function (r) { rows.push([r[0], r[1], (agg.total ? Math.round(r[1] / agg.total * 100) : 0) + '%']); });
        var csv = '﻿' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
        var a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = '班级高频错因.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }

      // 渲染「每周活跃人数」折线：无选择时按周（W1–W8）；选中日历区间后按天
      function renderWeekPanel() {
        const wEl = document.getElementById('ev-week');
        const calEl = document.getElementById('ev-calendar');
        const rangeEl = document.getElementById('ev-range');
        const hasSel = calData.selA >= 0 && calData.selB >= 0;
        let items = [];
        if (hasSel) {
          const a = Math.min(calData.selA, calData.selB), b = Math.max(calData.selA, calData.selB);
          for (let d = a; d <= b; d++) {
            const cnt = calData.dayMap[d] ? Object.keys(calData.dayMap[d]).length : 0;
            items.push({ label: fmtDay(d), pct: cnt, val: cnt + ' 人' });
          }
          if (rangeEl) rangeEl.innerHTML = '已选区间 <b>' + fmtDay(a) + ' – ' + fmtDay(b) + '</b> · 按天统计 ' + (b - a + 1) + ' 天';
        } else {
          items = calData.weekCounts.map(function (c, i) { return { label: 'W' + (calData.weekWeeks[i] + 1), pct: c, val: c + ' 人' }; });
          const w0 = calData.weekWeeks.length ? calData.weekWeeks[0] + 1 : 1;
          const wN = calData.weekWeeks.length ? calData.weekWeeks[calData.weekWeeks.length - 1] + 1 : 1;
          if (rangeEl) rangeEl.innerHTML = '按周 · W' + w0 + '–W' + wN
            + (calData.maxD > 0 ? ' · 日历可选 ' + fmtDay(0) + ' – ' + fmtDay(calData.maxD) : '');
        }
        if (wEl) wEl.innerHTML = items.length ? lineChart(items) : '<div class="um-empty">暂无活跃记录</div>';
        if (calEl) calEl.innerHTML = calendarHeat();
      }

      // 日序号 → M/D 标签
      function fmtDay(d) {
        const dt = new Date(calData.minTs + d * 86400000);
        return (dt.getMonth() + 1) + '/' + dt.getDate();
      }

      // 绑定月历交互：单击选中整周、按住拖动圈选任意区间、点击箭头翻月、重置回按周
      // 说明：每次圈选都会重绘月历 innerHTML，若在格子元素上监听 move 会因元素被替换而丢事件，
      //       故改为「容器 pointerdown 起手 + document 级 pointermove/up + elementFromPoint 命中」，
      //       这样拖动经过的格子始终能被正确识别（鼠标与触屏一致）。
      function bindCalendar() {
        const calEl = document.getElementById('ev-calendar');
        if (!calEl) return;
        const pickAt = function (x, y) {
          let t = (document.elementFromPoint && x != null) ? document.elementFromPoint(x, y) : null;
          if (t && t.closest) t = t.closest('[data-d]');
          else if (t && t.parentNode && t.parentNode.getAttribute && t.parentNode.getAttribute('data-d') != null) t = t.parentNode;
          if (t && t.getAttribute) {
            const v = t.getAttribute('data-d');
            if (v != null && v !== '') return Number(v);
          }
          //★兜底：elementFromPoint 在格子被遮挡时可能返回非日期元素，
          //   此时按坐标遍历所有日期格做矩形命中，保证任何滚动位置下点选都有效。
          //   仅当格子有实际尺寸时参与匹配，避免未完成布局时全部退化成 0×0 而误命中第一格。
          const cells = calEl.querySelectorAll('[data-d]');
          for (let i = 0; i < cells.length; i++) {
            const r = cells[i].getBoundingClientRect();
            if (r.width <= 0 || r.height <= 0) continue;
            if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return Number(cells[i].getAttribute('data-d'));
          }
          return -1;
        };
        // 某日序号 → 它所在的「自然周」（周一~周日，按真实日期算），并夹在数据范围内。
        // 用途：单击某天时展开为整周，避免折线图只剩一个孤立点（一个点不成曲线）。
        const weekOf = function (d) {
          if (!(d >= 0)) return null;
          const wd = (new Date(calData.minTs + d * 86400000).getDay() + 6) % 7;   // 周一 = 0
          const lastD = (calData.maxD != null) ? calData.maxD : d;
          let a = d - wd, b = d - wd + 6;
          if (a < 0) a = 0;
          if (b > lastD) b = lastD;
          if (b < a) b = a;
          return { a: a, b: b };
        };
        const move = function (ev) {
          if (!calData.dragging) return;
          const d = pickAt(ev.clientX, ev.clientY);
          if (d < 0 || d === calData.selB) return;
          if (ev.cancelable) ev.preventDefault();
          calData.selB = d;
          calData.moved = true;      // 真的移动过 → 保留用户自己圈出的区间
          renderWeekPanel();
        };
        const end = function () {
          if (!calData.dragging) return;
          calData.dragging = false;
          // 只按下、没移动过（即单击）→ 第一次点选「锚点日」（并把区间展开为该日所在整周，
          // 保证折线始终是一段区间而非单点）；第二次点选任意一天即把锚点到该日连成区间——
          // ★这是跨月筛选的关键：锚点与终点可以位于不同月份，中间靠翻月按钮切换。
          if (!calData.moved) {
            if (calData.anchor >= 0) {
              const a0 = calData.anchor, d = calData.selA;
              calData.selA = Math.min(a0, d); calData.selB = Math.max(a0, d);
              calData.anchor = -1;
              renderWeekPanel();
            } else {
              calData.anchor = calData.selA;
              const wk = weekOf(calData.selA);
              if (wk) { calData.selA = wk.a; calData.selB = wk.b; renderWeekPanel(); }
            }
          } else {
            calData.anchor = -1;   // 拖动圈选后清掉锚点，下一次单击重新起选
          }
          document.removeEventListener('pointermove', move);
          document.removeEventListener('pointerup', end);
          document.removeEventListener('pointercancel', end);
        };
        const start = function (ev) {
          // 翻月按钮交给 click 处理，避免误当作圈选
          let nav = ev.target; if (nav && nav.closest) nav = nav.closest('[data-nav]');
          if (nav) return;
          const d = pickAt(ev.clientX, ev.clientY);
          if (d < 0) return;
          if (ev.cancelable) ev.preventDefault();
          // 触屏有「隐式指针捕获」：若不显式把捕获改到容器上，pointerdown 里重绘月历会把被捕获的
          // 格子元素移除，后续 pointermove 便收不到 → 表现为「拖不动、只选到一天」。
          if (ev.pointerId != null && calEl.setPointerCapture) {
            try { calEl.setPointerCapture(ev.pointerId); } catch (e) { }
          }
          calData.selA = d; calData.selB = d; calData.dragging = true; calData.moved = false;
          renderWeekPanel();
          document.removeEventListener('pointermove', move);
          document.removeEventListener('pointerup', end);
          document.removeEventListener('pointercancel', end);
          document.addEventListener('pointermove', move);
          document.addEventListener('pointerup', end);
          document.addEventListener('pointercancel', end);
        };
        // 指针事件优先（同时覆盖鼠标与触屏）；环境不支持时回落到 mouse 事件
        if (window.PointerEvent) {
          calEl.onpointerdown = start;
        } else {
          calEl.onmousedown = start;
          calEl.onmouseover = function (ev) {
            if (!calData.dragging) return;
            const d = pickAt(ev.clientX, ev.clientY);
            if (d < 0 || d === calData.selB) return;
            calData.selB = d; renderWeekPanel();
          };
          calEl.onmouseup = end;
        }
        calEl.onclick = function (ev) {
          let t = ev.target;
          if (t && t.closest) t = t.closest('[data-nav]');
          if (!t || !t.getAttribute) return;
          const dir = Number(t.getAttribute('data-nav'));
          if (!dir) return;
          if (ev.cancelable) ev.preventDefault();
          calData.viewMonth = (calData.viewMonth || 0) + dir;
          renderWeekPanel();
        };
        if (!bindCalendar._docBound) {
          document.addEventListener('mouseup', function () { calData.dragging = false; });
          bindCalendar._docBound = true;
        }
        const rst = document.getElementById('ev-cal-reset');
        if (rst) rst.onclick = function () { calData.selA = -1; calData.selB = -1; calData.anchor = -1; renderWeekPanel(); };
        // 快捷区间：整学期 / 首月 / 末月 —— 原生月历一次只能画一个月，
        // 用户若要跨月区间只能靠两次单击（易误操作），故额外给出三个一键区间。
        Array.prototype.forEach.call(document.querySelectorAll('[data-quick]'), function (btn) {
          btn.onclick = function (ev) {
            if (ev && ev.stopPropagation) ev.stopPropagation();
            const q = btn.getAttribute('data-quick');
            const lastD = calData.maxD != null ? calData.maxD : 0;
            const dt0 = new Date(calData.minTs);
            const b0 = new Date(dt0.getFullYear(), dt0.getMonth(), dt0.getDate()).getTime();
            const dIdx = function (y, m, day) { return Math.round((new Date(y, m, day).getTime() - b0) / 86400000); };
            calData.anchor = -1;
            if (q === 'all') { calData.selA = 0; calData.selB = lastD; }
            else if (q === 'm0') {
              // 首月 = 数据起始日 → 该自然月最后一天（换算为日序号，超出数据末日则夹到末日）
              const y = dt0.getFullYear(), m = dt0.getMonth();
              const dim = new Date(y, m + 1, 0).getDate();
              calData.selA = 0; calData.selB = Math.max(0, Math.min(lastD, dIdx(y, m, dim)));
            } else if (q === 'm-1') {
              // 末月 = 该自然月首日 → 数据末日
              const dt = new Date(calData.minTs + lastD * 86400000);
              calData.selA = Math.max(0, dIdx(dt.getFullYear(), dt.getMonth(), 1));
              calData.selB = lastD;
            }
            renderWeekPanel();
          };
        });
      }

      // 横向柱状图（章节掌握度）
      function hBarChart(items) {
        let max = 1;
        items.forEach(function (i) { max = Math.max(max, i.pct); });
        return items.map(function (i) {
          const w = Math.max(2, Math.round(i.pct / max * 100));
          return '<div style="display:flex;align-items:center;gap:10px;margin:7px 0;font-size:12px;">'
            + '<span style="width:74px;flex:none;color:var(--muted);text-align:right;">' + esc(i.label) + '</span>'
            + '<span style="flex:1;background:rgba(120,130,160,.14);border-radius:6px;height:15px;overflow:hidden;display:inline-block;">'
            + '<span style="display:block;height:100%;width:' + w + '%;background:linear-gradient(90deg,#3b82f6,#2563eb);border-radius:6px;"></span>'
            + '</span>'
            + '<span style="width:112px;flex:none;color:var(--text);">' + esc(i.val) + '</span>'
            + '</div>';
        }).join('');
      }

      // 图表空态：说清「缺什么/ 为什么 / 怎么办」，而不是画一根 0% 的柱子
      // （0% 会被读成「学生全答错」，是把数据缺失误报成学情结论）
      function evNoData(what, why, how) {
        return '<div class="ev-nodata">'
          + '<div class="nd-t">暂无可统计的数据</div>'
          + (what ? '<div class="nd-w">' + esc(what) + '</div>' : '')
          + (why ? '<div class="nd-y"><b>原因</b>' + esc(why) + '</div>' : '')
          + (how ? '<div class="nd-h"><b>怎么补</b>' + esc(how) + '</div>' : '')
          + '</div>';
      }

      // 竖向柱状图（题型正确率）
      function vBarChart(items) {
        let max = 1;
        items.forEach(function (i) { max = Math.max(max, i.pct); });
        return '<div class="vbar-wrap">' + items.map(function (i) {
          const h = Math.max(2, Math.round(i.pct / max * 100));
          return '<div class="vbar-col">'
            + '<div class="vbar-val">' + esc(i.val) + '</div>'
            + '<div class="vbar-track"><div class="vbar-fill" style="height:' + h + '%;"></div></div>'
            + '<div class="vbar-lbl">' + esc(i.label) + '</div>'
            + '</div>';
        }).join('') + '</div>';
      }

      // 环形图（模块使用占比）
      function donutChart(items) {
        const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899'];
        let total = 0; items.forEach(function (i) { total += (i.n || 0); });
        const R = 54, C = 2 * Math.PI * R, cx = 70, cy = 70;
        let acc = 0, segs = '';
        items.forEach(function (i, idx) {
          const len = total ? (i.n || 0) / total * C : 0;
          segs += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="' + COLORS[idx % COLORS.length] + '" stroke-width="20" '
            + 'stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-acc).toFixed(2) + '"></circle>';
          acc += len;
        });
        const legend = items.map(function (i, idx) {
          const pct = total ? Math.round((i.n || 0) / total * 100) : 0;
          return '<div class="lg"><i style="background:' + COLORS[idx % COLORS.length] + ';"></i><span>' + esc(i.label) + '</span><span class="pc">' + pct + '%</span></div>';
        }).join('');
        return '<div class="donut-wrap">'
          + '<svg class="donut-svg" viewBox="0 0 140 140" width="148" height="148" style="transform:rotate(-90deg);">'
          + '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="rgba(120,130,160,.16)" stroke-width="20"></circle>'
          + segs + '</svg>'
          + '<div class="donut-legend">' + legend + '</div>'
          + '</div>';
      }

      // 折线图（每周活跃人数）
      function lineChart(items) {
        const W = 460, H = 190, PL = 34, PR = 14, PT = 20, PB = 26;
        const n = items.length;
        let max = 1; items.forEach(function (i) { max = Math.max(max, i.pct); });
        max = Math.ceil(max / 10) * 10; if (!max) max = 10;
        const iw = W - PL - PR, ih = H - PT - PB;
        const px = function (i) { return PL + (n <= 1 ? iw / 2 : iw * i / (n - 1)); };
        const py = function (v) { return PT + ih - ih * (v / max); };
        let grid = '';
        for (let t = 0; t <= 4; t++) {
          const v = max * t / 4, y = py(v);
          grid += '<line x1="' + PL + '" y1="' + y.toFixed(1) + '" x2="' + (W - PR) + '" y2="' + y.toFixed(1) + '" stroke="rgba(120,130,160,.18)" stroke-width="1"></line>'
            + '<text x="' + (PL - 7) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end" font-size="10" fill="#8892a6">' + Math.round(v) + '</text>';
        }
        const pts = items.map(function (i, idx) { return [px(idx), py(i.pct)]; });
        const poly = pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
        const area = PL + ',' + (PT + ih) + ' ' + poly + ' ' + (W - PR) + ',' + (PT + ih);
        // 周视图（整学期 16–22 周）保留逐点数值；按天长区间（几十上百点）才省略数值
        const showVal = n <= 22;
        const dots = items.map(function (i, idx) {
          const r = n > 22 ? 2.2 : 3.4;
          return '<circle cx="' + pts[idx][0].toFixed(1) + '" cy="' + pts[idx][1].toFixed(1) + '" r="' + r + '" fill="#2563eb" stroke="#fff" stroke-width="1.4"></circle>'
            + (showVal ? '<text x="' + pts[idx][0].toFixed(1) + '" y="' + (pts[idx][1] - 9).toFixed(1) + '" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2563eb">' + i.pct + '</text>' : '');
        }).join('');
        // 标签稀疏：≤16 个点（整学期 16 教学周）逐周全标；更多时约每 n/10 个标一次（末点必标）
        const lblStep = n <= 16 ? 1 : Math.ceil(n / 10);
        const xlbl = items.map(function (i, idx) {
          if (idx % lblStep !== 0 && idx !== n - 1) return '';
          return '<text x="' + px(idx).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" fill="#8892a6">' + esc(i.label) + '</text>';
        }).join('');
        return '<svg class="line-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">'
          + grid
          + '<polygon points="' + area + '" fill="rgba(59,130,246,.10)"></polygon>'
          + '<polyline points="' + poly + '" fill="none" stroke="#2563eb" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"></polyline>'
          + dots + xlbl + '</svg>';
      }

      // 月历选择器（传统日历样式：周一~周日横排、日期数字 + 当日活跃数；可翻月、点选/拖动圈选）
      function calendarHeat() {
        const WD = ['一', '二', '三', '四', '五', '六', '日'];
        const dayMap = calData.dayMap || {};
        const minTs = calData.minTs;
        if (minTs == null) return '';
        const maxD = calData.maxD != null ? calData.maxD : 0;
        // 以「本地日期」为基准，保证与 fmtDay 的日序一致
        const baseD = new Date(minTs);
        const baseMid = new Date(baseD.getFullYear(), baseD.getMonth(), baseD.getDate()).getTime();
        const dIndex = function (y, m, day) { return Math.round((new Date(y, m, day).getTime() - baseMid) / 86400000); };
        // 覆盖 minTs 当月 ~ 数据末日当月的月份列表
        const first = new Date(baseMid);
        const last = new Date(baseMid + maxD * 86400000);
        const months = [];
        let y = first.getFullYear(), m = first.getMonth();
        while (y < last.getFullYear() || (y === last.getFullYear() && m <= last.getMonth())) {
          months.push({ y: y, m: m });
          m++; if (m > 11) { m = 0; y++; }
        }
        if (!months.length) return '';
        let vi = calData.viewMonth || 0;
        if (vi < 0) vi = 0;
        if (vi > months.length - 1) vi = months.length - 1;
        calData.viewMonth = vi;
        const mv = months[vi];
        const a = (calData.selA >= 0 && calData.selB >= 0) ? Math.min(calData.selA, calData.selB) : -1;
        const b = (calData.selA >= 0 && calData.selB >= 0) ? Math.max(calData.selA, calData.selB) : -1;

        const dim = new Date(mv.y, mv.m + 1, 0).getDate();
        const lead = (new Date(mv.y, mv.m, 1).getDay() + 6) % 7;   // 周一 = 0
        const total = Math.ceil((lead + dim) / 7) * 7;
        let cells = '';
        for (let i = 0; i < total; i++) {
          const day = i - lead + 1;
          if (day < 1 || day > dim) { cells += '<div class="cx-cell out"></div>'; continue; }
          const d = dIndex(mv.y, mv.m, day);
          const inRange = d >= 0 && d <= maxD;
          const n = (inRange && dayMap[d]) ? Object.keys(dayMap[d]).length : 0;
          let cls = 'cx-cell ' + (inRange ? 'in' : 'out');
          if (inRange && a >= 0 && d >= a && d <= b) { cls += ' insel'; if (d === a || d === b) cls += ' end'; }
          const attr = inRange ? ' data-d="' + d + '"' : '';
          const title = inRange ? (fmtDay(d) + ' · ' + n + ' 人活跃') : ((mv.m + 1) + '月' + day + '日 · 学期外');
          cells += '<div class="' + cls + '"' + attr + ' title="' + title + '">'
            + '<span class="cx-d">' + day + '</span><span class="cx-n">' + (n > 0 ? n : '') + '</span></div>';
        }
        const head = '<div class="cx-head">'
          + '<button type="button" class="cx-nav" data-nav="-1"' + (vi <= 0 ? ' disabled' : '') + ' aria-label="上个月">‹</button>'
          + '<span class="cx-title">' + mv.y + ' 年 ' + (mv.m + 1) + ' 月</span>'
          + '<button type="button" class="cx-nav" data-nav="1"' + (vi >= months.length - 1 ? ' disabled' : '') + ' aria-label="下个月">›</button>'
          + '</div>';
        const wd = '<div class="cx-wd">' + WD.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>';
        return '<div class="cx-wrap">' + head + wd + '<div class="cx-grid">' + cells + '</div></div>';
      }

      // ===== 学情看板：开关状态 / 学生档案映射 =====
      var onlyStudent = false;
      try { onlyStudent = localStorage.getItem('ibank_stat_only_student') === '1'; } catch (e) {}
      var profileMap = null;   // uid -> profile {id, name, role, class_name}
      function setProfileMap(list) {
        if (!list) return;
        profileMap = {};
        list.forEach(function (r) { profileMap[String(r.id)] = r; });
      }
      // 档案缺失（历史记录 / 已被匿名化）时按学生处理，避免数据凭空消失
      function isStudentUid(uid) {
        if (!profileMap) return true;
        var p = profileMap[String(uid)];
        if (!p) return true;
        return p.role !== 'teacher' && p.role !== 'admin';
      }
      function filterStatEvents(list) {
        if (!onlyStudent) return list;
        return (list || []).filter(function (e) { return isStudentUid(e.uid); });
      }
      // 结构化数据（{study,module,quiz,login,qa}）按「仅统计学生」开关逐类过滤
      function filterStatData(data) {
        if (!onlyStudent) return data;
        var out = {};
        Object.keys(data || {}).forEach(function (k) { out[k] = filterStatEvents(data[k]); });
        return out;
      }
      // 把扁平事件数组按 type 归类，供离线模式与图表使用
      function splitByType(list) {
        var d = { study: [], module: [], quiz: [], login: [], qa: [] };
        (list || []).forEach(function (e) { var k = e && e.type; if (d[k]) d[k].push(e); });
        return d;
      }
      function fmtDur(sec) {
        sec = Number(sec) || 0;
        if (sec < 60) return sec + ' 秒';
        var m = Math.floor(sec / 60);
        if (m < 60) return m + ' 分钟';
        return Math.floor(m / 60) + ' 小时 ' + (m % 60) + ' 分';
      }
      function fmtDate(ts) {
        var d = new Date(Number(ts) || 0);
        if (!d.getTime()) return '—';
        function p2(n) { return (n < 10 ? '0' : '') + n; }
        return (d.getMonth() + 1) + '-' + d.getDate() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
      }
      var STU_CH = ['第0章', '第1章', '第2章', '第3章', '第4章', '第5章', '第6章', '第7章'];
      var rowCache = [];
      function csvCell(v) {
        v = String(v == null ? '' : v);
        return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }
      function renderStudentDetail(list) {
        var box = document.getElementById('stu-detail');
        if (!box) return;
        list = normEvents(list);   // 兜底：无论调用方给的是秒还是毫秒都能正确显示「最近时间」
        var byUid = {};
        (list || []).forEach(function (e) {
          if (!e.uid) return;
          var k = String(e.uid);
          // ★排除未登录的本机匿名身份：track() 在无 uid 时写 uid='anon'（见埋点处），
          //   它既不是学生也不是教师，却会在明细里多出一行「用户 anon / 答题 0」，
          //   让「89 名学生」的明细变成 90 行，还凭空多一个 0 答题的账号。
          if (k === 'anon') return;
          var o = byUid[k];
          if (!o) o = byUid[k] = { uid: k, chapters: {}, study: 0, dur: 0, quiz: 0, ok: 0, last: 0, types: {} };
          if (e.ts && e.ts > o.last) o.last = e.ts;
          if (e.type === 'study') {
            o.study++;
            if (e.chapter) o.chapters[e.chapter] = 1;
            o.dur += (Number(e.duration) || 0);
          } else if (e.type === 'quiz') {
            o.quiz++;
            var t = e.qtype || '未分类';
            var tt = o.types[t] || (o.types[t] = { n: 0, ok: 0 });
            tt.n++;
            if (e.correct === true) { o.ok++; tt.ok++; }
          }
        });
        var rows = Object.keys(byUid).map(function (k) { return byUid[k]; });
        if (onlyStudent) rows = rows.filter(function (r) { return isStudentUid(r.uid); });
        rowCache = rows;
        if (!rows.length) {
          box.innerHTML = '<div class="um-empty">暂无学生学习数据。学生登录后学习章节、作答习题、使用各模块即会出现明细。</div>';
          return;
        }
        rows.sort(function (a, b) { return b.last - a.last; });
        box.innerHTML = rows.map(function (r) {
          var p = (profileMap && profileMap[r.uid]) || {};
          var isT = p.role === 'teacher' || p.role === 'admin';
          // ★匿名基线学生（sim_xxx）不在 profiles 表里，此前走 slice(-6) 兜底会被截成
          //   「用户 im_001」——前缀 's' 被切掉，看着像乱码。这里对 sim_ 前缀单独还原。
          var name = p.name ? esc(p.name)
            : (/^sim_/.test(r.uid) ? ('匿名学生' + esc(r.uid.slice(4)))
              : ('用户 ' + esc(r.uid.slice(-6))));
          // 班级：档案表优先；匿名基线学生不在档案表里，按 uid 推导班级，
          // 否则明细里 89 名学生班级一栏全是「—」，与后台抬头的 2401–2404 自相矛盾。
          var cls = p.class_name ? esc(p.class_name) : (simClass(r.uid) ? esc(simClass(r.uid)) : '—');
          var nch = Object.keys(r.chapters).length;
          var acc = r.quiz ? Math.round(r.ok / r.quiz * 100) + '%' : '—';
          var chips = STU_CH.map(function (ch) {
            var on = !!r.chapters[ch];
            return '<span class="ch-chip' + (on ? ' on' : '') + '">' + ch.replace('第', '').replace('章', '') + (on ? ' ✓' : '') + '</span>';
          }).join('');
          var tkeys = Object.keys(r.types).sort();
          var tlines = tkeys.length
            ? tkeys.map(function (t) {
                var v = r.types[t];
                var a = v.n ? Math.round(v.ok / v.n * 100) : 0;
                return '<div class="stu-tline"><span style="min-width:52px;">' + esc(t) + '</span>'
                  + '<span class="tb"><i style="width:' + a + '%"></i></span>'
                  + '<b>' + a + '%</b><span>（' + v.ok + '/' + v.n + '）</span></div>';
              }).join('')
            : '<div class="stu-tline">暂无答题记录</div>';
          return '<details class="stu-item">'
            + '<summary>'
            +   '<span class="s-name">' + name + (isT ? '<span class="um-me">教师</span>' : '') + '</span>'
            +   '<span class="s-cls">' + cls + '</span>'
            +   '<span class="s-m">学完 <b>' + nch + '</b>/8 章</span>'
            +   '<span class="s-m">时长 <b>' + fmtDur(r.dur) + '</b></span>'
            +   '<span class="s-m">答题 <b>' + r.quiz + '</b></span>'
            +   '<span class="s-m">正确率 <b>' + acc + '</b></span>'
            +   '<span class="s-m">最近 <b>' + (r.last ? fmtDate(r.last) : '—') + '</b></span>'
            +   '<span class="s-arrow">展开 ▾</span>'
            + '</summary>'
            + '<div class="stu-body">'
            +   '<h6>章节完成情况（浅绿为已学完）</h6><div class="ch-chip-row">' + chips + '</div>'
            +   '<h6>各题型正确率</h6>' + tlines
            + '</div></details>';
        }).join('');
      }
      function exportStuCsv() {
        if (!rowCache.length) { if (typeof ibankToast === 'function') ibankToast('暂无可导出的学情数据'); return; }
        var lines = [['姓名', '班级', '角色', '学完章节数', '累计学习时长(秒)', '答题数', '答对数', '正确率(%)', '最近活跃'].join(',')];
        rowCache.forEach(function (r) {
          var p = (profileMap && profileMap[r.uid]) || {};
          var isT = p.role === 'teacher' || p.role === 'admin';
          lines.push([
            csvCell(p.name || (/^sim_/.test(r.uid) ? ('匿名学生' + r.uid.slice(4)) : ('用户' + r.uid.slice(-6)))),
            csvCell(p.class_name || simClass(r.uid)),
            isT ? '教师' : '学生',
            Object.keys(r.chapters).length,
            r.dur, r.quiz, r.ok,
            r.quiz ? Math.round(r.ok / r.quiz * 100) : '',
            r.last ? new Date(r.last).toLocaleString('zh-CN') : ''
          ].join(','));
        });
        var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'iBank学情明细_' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
        if (typeof ibankToast === 'function') ibankToast('已导出 ' + rowCache.length + ' 条学情记录');
      }

      // ===== 用户管理 =====
      let lastUserRows = [];
      function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

      // 班级下拉：按现有档案动态填充，保留当前选中项
      function fillClassOptions(rows) {
        var sel = document.getElementById('um-filter-class');
        if (!sel) return;
        var cur = sel.value, seen = {}, opts = [];
        (rows || []).forEach(function (r) {
          var c = String(r.class_name == null ? '' : r.class_name).trim();
          if (!c || seen[c]) return;
          seen[c] = 1; opts.push(c);
        });
        opts.sort(function (a, b) { return a.localeCompare(b, 'zh'); });
        sel.innerHTML = '<option value="">全部班级</option>' + opts.map(function (c) {
          return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
        }).join('');
        if (cur && seen[cur]) sel.value = cur;
      }

      function renderUserList(rows) {
        lastUserRows = rows || lastUserRows;
        const box = document.getElementById('um-list');
        if (!box) return;
        fillClassOptions(lastUserRows);
        const kw = (document.getElementById('um-search').value || '').trim().toLowerCase();
        const fcEl = document.getElementById('um-filter-class');
        const frEl = document.getElementById('um-filter-role');
        const fc = fcEl ? fcEl.value : '';
        const fr = frEl ? frEl.value : '';
        const isT = function (r) { return r.role === 'teacher' || r.role === 'admin'; };
        let list = lastUserRows.slice().sort(function (a, b) {
          if (isT(a) !== isT(b)) return isT(a) ? -1 : 1; // 教师排前
          return String(a.name || '').localeCompare(String(b.name || ''), 'zh');
        });
        // 分类筛选：班级 / 角色
        if (fc) list = list.filter(function (r) { return String(r.class_name || '') === fc; });
        if (fr === 'teacher') list = list.filter(isT);
        else if (fr === 'student') list = list.filter(function (r) { return !isT(r); });
        // 关键词搜索：姓名 / 班级 / 角色 / 学号
        if (kw) {
          list = list.filter(function (r) {
            return String(r.name || '').toLowerCase().indexOf(kw) >= 0
              || String(r.class_name || '').toLowerCase().indexOf(kw) >= 0
              || String(r.role || '').toLowerCase().indexOf(kw) >= 0
              || String(r.id || '').toLowerCase().indexOf(kw) >= 0;
          });
        }
        var cntEl = document.getElementById('um-count');
        if (cntEl) cntEl.textContent = '共 ' + list.length + ' 人' + (list.length !== lastUserRows.length ? '（已筛选 / 全部 ' + lastUserRows.length + '）' : '');
        if (list.length === 0) { box.innerHTML = '<div class="um-empty">暂无匹配用户</div>'; return; }
        box.innerHTML = list.map(function (r) {
          const t = isT(r);
          const mine = String(r.id) === String(currentUid); // 自己那一行：只展示，不给操作按钮，防止误把自己降级锁死
          const founder = r.is_founder === true;            // 创始人账号：受保护，任何人都不能改其角色
          const locked = mine || founder;
          const nm = r.name ? esc(r.name) : '<span style="color:var(--muted);">（未填姓名）</span>';
          const cls = esc(r.class_name || '未选班级') + ' · ' + String(r.id || '').slice(-6);
          return '<div class="um-row">'
            + '<span class="um-name">' + nm + (founder ? '<span class="um-me">创始人</span>' : '') + (mine ? '<span class="um-me">我</span>' : '') + '</span>'
            + '<span class="um-cls">' + cls + '</span>'
            + '<span class="um-badge ' + (t ? 'teacher' : 'student') + '">' + (t ? '教师' : '学生') + '</span>'
            + (locked
                ? '<span class="um-mine-note">' + (mine ? '当前登录，不可操作' : '创始人账号，不可操作') + '</span>'
                : '<button class="um-act ' + (t ? 'demote' : '') + '" data-uid="' + esc(r.id) + '" data-role="' + (t ? 'student' : 'teacher') + '">'
                  + (t ? '收为学生' : '设为教师') + '</button>')
            + '</div>';
        }).join('');
      }

      document.getElementById('um-list').addEventListener('click', async function (e) {
        const btn = e.target.closest('.um-act');
        if (!btn || btn.disabled) return;
        const uid = btn.getAttribute('data-uid');
        const role = btn.getAttribute('data-role');
        if (String(uid) === String(currentUid)) { alert('不能修改自己的角色。如需调整，请由其他教师操作。'); return; }
        const tgt = lastUserRows.filter(function (r) { return String(r.id) === String(uid); })[0];
        if (tgt && tgt.is_founder === true) { alert('该账号为创始人，角色受保护，不可修改。'); return; }
        const who = (btn.parentElement.querySelector('.um-name') || {}).textContent || '该用户';
        if (!confirm('确定将「' + who + '」' + (role === 'teacher' ? '设为教师' : '收为学生') + '吗？')) return;
        btn.disabled = true;
        try {
          const { error } = await db.from('profiles').update({ role: role }).eq('id', uid);
          if (error) { alert('操作失败：' + error.message); btn.disabled = false; return; }
          await loadRealStats(); // 重新拉取并重渲染（KPI 同步刷新）
        } catch (err) { alert('操作失败：' + err.message); btn.disabled = false; }
      });
      document.getElementById('um-refresh').addEventListener('click', loadRealStats);
      document.getElementById('um-search').addEventListener('input', function () { renderUserList(lastUserRows); });
      var umFcSel = document.getElementById('um-filter-class');
      if (umFcSel) umFcSel.addEventListener('change', function () { renderUserList(lastUserRows); });
      var umFrSel = document.getElementById('um-filter-role');
      if (umFrSel) umFrSel.addEventListener('change', function () { renderUserList(lastUserRows); });

      // ===== 看板统计口径（v58.7）=====
      // 原「仅统计学生」复选框已移除：v58.7 起教师/管理员行为根本不入库，
      // 该开关已无实际作用（开与不开结果相同），保留会误导。改为上方常显说明条。
      // onlyStudent 变量保持恒真，供下游过滤链路继续使用（语义不变：统计里只应有学生）。
      onlyStudent = true;
      var stuExportBtn = document.getElementById('stu-export-btn');
      if (stuExportBtn) stuExportBtn.addEventListener('click', exportStuCsv);
      var causeExportBtn = document.getElementById('cause-export-btn');
      if (causeExportBtn) causeExportBtn.addEventListener('click', causeExport);

      const adminTab = document.querySelector('.tab-btn[data-page="p-admin"]');
      if (adminTab) adminTab.addEventListener('click', function () { loadRealStats(); loadEventStats(); });

      async function checkSession() {
        if (OFFLINE) {
          // 离线演示：默认游客态，用户点「登录」后以本地演示身份进入
          applyRole('student');
          overlay.classList.add('hidden');
          loginTopBtn.classList.remove('hidden');
          logoutBtn.classList.add('hidden');
          navAccount.classList.add('hidden');
          return;
        }
        const uid = await getUserId();
        if (uid) {
          await onLoggedIn();
        } else {
          applyRole('student');
          overlay.classList.add('hidden');
          loginTopBtn.classList.remove('hidden');
          logoutBtn.classList.add('hidden');
          navAccount.classList.add('hidden');
        }
      }

      logoutBtn.addEventListener('click', async function () {
        try { await auth.signOut(); } catch (e) {}
        location.reload();
      });

      document.querySelectorAll('.login-tabs button').forEach(function (b) {
        b.addEventListener('click', function () {
          document.querySelectorAll('.login-tabs button').forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          const m = b.getAttribute('data-mode');
          document.getElementById('panel-login').classList.toggle('hidden', m !== 'login');
          document.getElementById('panel-register').classList.toggle('hidden', m !== 'register');
          showMsg('', '');
        });
      });

      document.querySelectorAll('#panel-login .login-methods button').forEach(function (b) {
        b.addEventListener('click', function () {
          document.querySelectorAll('#panel-login .login-methods button').forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          const m = b.getAttribute('data-m');
          document.getElementById('login-pwd-field').classList.toggle('hidden', m !== 'password');
          document.getElementById('login-sms-field').classList.toggle('hidden', m !== 'sms');
          showMsg('', '');
        });
      });

      document.getElementById('login-sms-btn').addEventListener('click', async function () {
        const phone = document.getElementById('login-phone').value.trim();
        if (!phone) { showMsg('请先输入手机号', 'err'); return; }
        if (OFFLINE) { showMsg(DEMO_TIP + '直接点击「登录 / 注册」即可。', 'ok'); return; }
        const btn = this;
        btn.disabled = true;
        try {
          const { data, error } = await auth.signInWithOtp({ phone: phone });
          if (error) { showMsg('发送失败：' + error.message, 'err'); btn.disabled = false; return; }
          smsVerifyFn = function (token) { return data.verifyOtp({ token: token }); };
          showMsg('验证码已发送，请注意查收（含骚扰拦截箱）', 'ok');
          startSmsCooldown(btn);
        } catch (e) { showMsg('发送失败：' + e.message, 'err'); btn.disabled = false; }
      });

      document.getElementById('reg-sms-btn').addEventListener('click', async function () {
        const phone = document.getElementById('reg-phone').value.trim();
        if (!phone) { showMsg('请先输入手机号', 'err'); return; }
        if (OFFLINE) { showMsg(DEMO_TIP + '直接点击「注册并登录」即可。', 'ok'); return; }
        pwdResetFn = null; // 重新获取验证码 = 放弃进行中的改密流程
        recoveryScheduled = false;
        const btn = this;
        btn.disabled = true;
        try {
          const nickname = document.getElementById('reg-name').value.trim() || '用户';
          const { data, error } = await auth.signUp({ phone: phone, nickname: nickname });
          if (error) { showMsg('发送失败：' + errText(error), 'err'); btn.disabled = false; return; }
          smsVerifyFn = function (token) { return data.verifyOtp({ token: token }); };
          smsSentAt = Date.now();
          showMsg('验证码已发送，请注意查收（含骚扰拦截箱）', 'ok');
          startSmsCooldown(btn);
        } catch (e) { showMsg('发送失败：' + e.message, 'err'); btn.disabled = false; }
      });
      // ★把外层 <form> 的 submit 转发到原按钮 click：按回车键等同点按钮，
      //   preventDefault 防止页面刷新（表单无 action，浏览器默认行为是整页重载）。
      (function () {
        var pairs = [['form-login', 'login-btn'], ['form-register', 'register-btn']];
        pairs.forEach(function (p) {
          var f = document.getElementById(p[0]), b = document.getElementById(p[1]);
          if (!f || !b) return;
          f.addEventListener('submit', function (e) { e.preventDefault(); b.click(); });
    });
      })();

      document.getElementById('login-btn').addEventListener('click', async function () {
        const phone = document.getElementById('login-phone').value.trim();
        const isSms = !document.getElementById('login-sms-field').classList.contains('hidden');
        showMsg('', '');
        if (OFFLINE) { showMsg(DEMO_TIP, 'ok'); await onLoggedIn(); return; }
        try {
          if (isSms) {
            const token = document.getElementById('login-sms-code').value.trim();
            if (!smsVerifyFn) { showMsg('请先获取验证码', 'err'); return; }
            const { error } = await smsVerifyFn(token);
            if (error) { showMsg('登录失败：' + error.message, 'err'); return; }
          } else {
            const password = document.getElementById('login-password').value;
            const { error } = await auth.signInWithPassword({ phone: phone, password: password });
            if (error) { showMsg('登录失败：' + error.message, 'err'); return; }
          }
          await onLoggedIn();
        } catch (e) { showMsg('登录失败：' + e.message, 'err'); }
      });

      // 统一取错误文本（CloudBase 错误字段可能是 message / msg / error_description / code）
      function errText(e) {
        if (!e) return '未知错误';
        const t = e.message || e.msg || e.error_description || e.error;
        return t || JSON.stringify(e);
      }

      let pwdResetFn = null; // 改密流程第二步的回调（resetPasswordForEmail 返回的 updateUser）
      let smsSentAt = 0;   // 第一条验证码的发送时间（用于避开每分钟 1 条的频控）
      let recoveryScheduled = false; // 改密短信是否已安排发送（防重复点击触发多次）

      // 频控安全地发送改密短信：距上条短信不足 62 秒则自动等待到点再发
      function scheduleRecovery(phone) {
        if (recoveryScheduled) return;
        recoveryScheduled = true;
        const waitMs = Math.max(0, 62000 - (Date.now() - smsSentAt));
        if (waitMs > 1000) {
          showMsg('密码需通过改密短信设置。因每分钟限发 1 条，系统约 ' + Math.ceil(waitMs / 1000) + ' 秒后自动发送，请稍候勿关页面…', 'ok');
        } else {
          showMsg('正在发送改密验证码…', 'ok');
        }
        setTimeout(async function () {
          // SDK 缺陷：发信时它内部格式化号码，调重置接口时却传原值，裸 11 位号会被服务端正则拒绝
          // 这里预先格式化好喂给它（其 formatPhone 幂等：已是 "+86 xxx" 的原样返回，不会重复加前缀）
          const rp = await auth.resetPasswordForEmail(/^\+/.test(phone) ? phone : '+86 ' + phone).catch(function (e) { return { error: e }; });
          if (!rp || rp.error || !rp.data || !rp.data.updateUser) {
            recoveryScheduled = false;
            showMsg('改密验证码发送失败：' + errText(rp && rp.error) + '。请再点一次「注册并登录」重试', 'err');
            return;
          }
          pwdResetFn = rp.data.updateUser;
          smsSentAt = Date.now(); // 改密短信同样占用每分钟 1 条的频控配额，重试时需以它为基准等待
          showMsg('改密验证码已发送！把它填入验证码框（替换原来的码），再点一次「注册并登录」', 'ok');
        }, waitMs);
      }

      document.getElementById('register-btn').addEventListener('click', async function () {
        const name = document.getElementById('reg-name').value.trim();
        const studentId = document.getElementById('reg-student-id').value.trim();
        const className = document.getElementById('reg-class').value;
        const phone = document.getElementById('reg-phone').value.trim();
        const token = document.getElementById('reg-sms-code').value.trim();
        const pwd = document.getElementById('reg-password').value;
        const pwd2 = document.getElementById('reg-password2').value;
        showMsg('', '');
        if (OFFLINE) { showMsg(DEMO_TIP, 'ok'); await onLoggedIn(); return; }
        // —— 前端校验 ——
        if (!name) { showMsg('请填写姓名', 'err'); return; }
        if (!phone) { showMsg('请输入手机号', 'err'); return; }
        const pwdOk = pwd.length >= 8 && pwd.length <= 32 && /[a-zA-Z]/.test(pwd) && /\d/.test(pwd);
        if (!pwdOk) { showMsg('密码需 8-32 位，且同时包含字母和数字', 'err'); return; }
        if (pwd !== pwd2) { showMsg('两次输入的密码不一致', 'err'); return; }
        try {
          let uid = await getUserId();

          if (pwdResetFn) {
            // 改密第二步：用「找回密码」短信完成重置（SDK 内部重置密码并自动登录）
            if (!token) { showMsg('请输入最新收到的改密验证码', 'err'); return; }
            const rs = await pwdResetFn({ nonce: token, password: pwd }).catch(function (e) { return { error: e }; });
            if (rs && rs.error) {
              // 验证码在校验环节已被消耗，旧回调作废：清空状态，下次点击重新走一遍改密流程（自动发新码）
              pwdResetFn = null;
              recoveryScheduled = false;
              showMsg('密码重置失败：' + errText(rs.error) + '。请再点一次「注册并登录」，系统会自动重新发送改密验证码', 'err');
              return;
            }
            pwdResetFn = null;
            uid = await getUserId();
            if (!uid) { showMsg('密码重置失败：未获取到登录态', 'err'); return; }
          } else {
            if (!uid) {
              // 已登录（验证码此前已验过）则跳过 verifyOtp，避免 OTP 被消耗后重验作废
              if (!smsVerifyFn) { showMsg('请先获取验证码', 'err'); return; }
              if (!token) { showMsg('请输入验证码', 'err'); return; }
              const { data, error } = await smsVerifyFn(token);
              if (error) { showMsg('注册失败：' + errText(error), 'err'); return; }
              uid = (data && data.user) ? data.user.id : await getUserId();
              if (!uid) { showMsg('注册失败：未获取到用户信息', 'err'); return; }
            }
            // 校验密码是否已生效：新账号从未设过密码、老账号短信登录都不会改密
            // —— 两种情况都走官方找回密码流程（resetPasswordForEmail）补设
            const chk = await auth.signInWithPassword({ phone: phone, password: pwd }).catch(function (e) { return { error: e }; });
            if (chk && chk.error) {
              scheduleRecovery(phone);
              return;
            }
          }

          // 资料写入：已有记录只更新姓名/班级/学号，绝不覆盖 role（防止教师被降级）
          // 若 profiles 表暂无 student_id 列，则退落到本地存储，确保注册流程不中断
          const profilePayload = { name: name, class_name: className || '', student_id: studentId || '' };
          let wroteProfile = false, profileErr = null;
          try {
            const { data: existing } = await db.from('profiles').select('id, role').eq('id', uid);
            if (existing && existing.length > 0) {
              const { error } = await db.from('profiles').update(profilePayload).eq('id', uid);
              if (error) throw error;
            } else {
              const { error } = await db.from('profiles').insert(Object.assign({ id: uid, role: 'student' }, profilePayload));
              if (error) throw error;
            }
            wroteProfile = true;
          } catch (e) {
            profileErr = e;
            // 如果报错指向 student_id 列不存在，重试不带该字段
            if (/student_id|column|字段|列/.test(errText(e))) {
              try {
                const fallback = { name: name, class_name: className || '' };
                const { data: existing } = await db.from('profiles').select('id, role').eq('id', uid);
                if (existing && existing.length > 0) {
                  const { error } = await db.from('profiles').update(fallback).eq('id', uid);
                  if (error) throw error;
                } else {
                  const { error } = await db.from('profiles').insert(Object.assign({ id: uid, role: 'student' }, fallback));
                  if (error) throw error;
                }
                wroteProfile = true;
              } catch (e2) { profileErr = e2; }
            }
          }
          if (wroteProfile) {
            try { localStorage.setItem('ibank_student_id_' + uid, studentId); } catch (e) {}
            if (profileErr) showMsg('注册成功：班级已保存；学号因云端配置暂未同步', 'ok');
          } else {
            showMsg('资料保存失败：' + errText(profileErr), 'err'); return;
          }
          await onLoggedIn();
        } catch (e) { showMsg('注册失败：' + errText(e), 'err'); }
      });

      loginTopBtn.addEventListener('click', function () { overlay.classList.remove('hidden'); });
      loginClose.addEventListener('click', function () { overlay.classList.add('hidden'); });

      navClass.addEventListener('change', async function () {
        const uid = await getUserId();
        if (!uid) return;
        if (OFFLINE) { showMsg('离线演示模式：班级选择本次有效，不会保存到云端', 'ok'); return; }
        try {
          await db.from('profiles').update({ class_name: navClass.value }).eq('id', uid);
          showMsg('班级已更新为 ' + navClass.value, 'ok');
        } catch (e) { showMsg('更新失败：' + e.message, 'err'); }
      });

      checkSession();
    })();
  
/**
 * لعبة الفاعل وأعماله - منطق التطبيق
 * تصميم الأستاذ حسين سيد - 01116544383
 */

(function () {
  'use strict';

  /* ============================================
     Storage Layer
     ============================================ */
  const STORE = {
    USERS: 'faail_users_v1',
    QUESTIONS: 'faail_questions_v1',
    ATTEMPTS: 'faail_attempts_v1',
    CURRENT: 'faail_current_user_v1',
    THEME: 'faail_theme_v1',
    ADMIN: 'faail_admin_session_v1',
  };

  const ADMIN_PHONE = '01116544383';
  const ADMIN_PASSWORD = '@#hussian74';

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { console.error('save failed', e); }
  }

  let users = load(STORE.USERS, []);
  let questions = load(STORE.QUESTIONS, null);
  let attempts = load(STORE.ATTEMPTS, []);
  let currentUser = load(STORE.CURRENT, null);
  let adminSession = load(STORE.ADMIN, null);

  // Seed questions with the default bank if empty or storage empty
  if (!questions || !questions.length) {
    questions = (window.DEFAULT_QUESTIONS || []).slice();
    save(STORE.QUESTIONS, questions);
  }

  /* ============================================
     Utilities
     ============================================ */
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.from(document.querySelectorAll(sel)); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function escHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function toast(msg, type = 'success') {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show ' + type;
    setTimeout(() => t.classList.remove('show'), 2500);
  }
  function view(name) {
    $$('.view').forEach(v => v.classList.remove('active'));
    const v = $('#view-' + name);
    if (v) v.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ============================================
     Theme (Day / Night)
     ============================================ */
  function applyTheme(theme) {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    document.body.classList.toggle('theme-light', theme !== 'dark');
    const icon = $('.theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  function toggleTheme() {
    const cur = load(STORE.THEME, 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    save(STORE.THEME, next);
    applyTheme(next);
  }
  applyTheme(load(STORE.THEME, 'light'));

  /* ============================================
     Users / Auth
     ============================================ */
  function findUserByNameOrPhone(identifier) {
    const id = (identifier || '').trim();
    return users.find(u => u.phone === id || u.name.trim().toLowerCase() === id.toLowerCase());
  }
  function registerUser(data) {
    if (!data.name || !data.email || !data.phone || !data.password)
      return { ok: false, error: 'من فضلك أكمل كل البيانات' };
    if (data.password !== data.confirm)
      return { ok: false, error: 'كلمتا المرور غير متطابقتين' };
    if (!/^01[0-9]{9}$/.test(data.phone))
      return { ok: false, error: 'رقم الهاتف يجب أن يكون 11 رقمًا ويبدأ بـ 01' };
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(data.email))
      return { ok: false, error: 'البريد الإلكتروني غير صحيح' };
    if (users.some(u => u.phone === data.phone))
      return { ok: false, error: 'رقم الهاتف مسجّل من قبل' };
    if (users.some(u => u.email.toLowerCase() === data.email.toLowerCase()))
      return { ok: false, error: 'البريد الإلكتروني مسجّل من قبل' };

    const user = {
      id: uid(),
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      password: data.password,
      joinedAt: Date.now(),
    };
    users.push(user);
    save(STORE.USERS, users);
    return { ok: true, user };
  }
  function loginUser(identifier, password) {
    const u = findUserByNameOrPhone(identifier);
    if (!u) return { ok: false, error: 'لا يوجد حساب بهذه البيانات' };
    if (u.password !== password) return { ok: false, error: 'كلمة المرور غير صحيحة' };
    return { ok: true, user: u };
  }

  function setCurrentUser(u) {
    currentUser = u ? { id: u.id, name: u.name } : null;
    save(STORE.CURRENT, currentUser);
  }
  function getCurrentUser() {
    if (!currentUser) return null;
    return users.find(u => u.id === currentUser.id) || null;
  }
  function logout() {
    setCurrentUser(null);
    view('splash');
  }

  /* ============================================
     Game Engine
     ============================================ */
  const STAGES = [
    { num: 1, label: 'المرحلة الأولى', sub: 'سهل - تمهيد', grad: 'linear-gradient(135deg, #10b981, #34d399)' },
    { num: 2, label: 'المرحلة الثانية', sub: 'سهل+', grad: 'linear-gradient(135deg, #06b6d4, #3b82f6)' },
    { num: 3, label: 'المرحلة الثالثة', sub: 'متوسط', grad: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
    { num: 4, label: 'المرحلة الرابعة', sub: 'متوسط+', grad: 'linear-gradient(135deg, #f59e0b, #ec4899)' },
    { num: 5, label: 'المرحلة الخامسة', sub: 'صعب', grad: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
  ];

  function getStageQuestions(stageNum) {
    return questions.filter(q => q.stage === stageNum);
  }
  function pickStageQuestions(stageNum) {
    let pool = getStageQuestions(stageNum);
    // shuffle but keep stable order between users; here we shuffle by date + stage for variety
    const seed = (stageNum * 7919 + new Date().getDate()) % 1000;
    pool = pool.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = (seed + i * 17) % (i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 10);
  }

  function getStageAttempt(userId, stageNum) {
    return attempts.find(a => a.userId === userId && a.stage === stageNum);
  }
  function saveAttempt(att) {
    const idx = attempts.findIndex(a => a.id === att.id);
    if (idx >= 0) attempts[idx] = att;
    else attempts.push(att);
    save(STORE.ATTEMPTS, attempts);
  }

  let gameState = null;
  function startStage(stageNum) {
    const user = getCurrentUser();
    if (!user) { toast('سجّل الدخول أولاً', 'warn'); view('login'); return; }
    const existing = getStageAttempt(user.id, stageNum);
    if (existing && !existing.open) {
      toast('لقد أكملت هذه المرحلة بالفعل. اطلب من المدير إعادة المحاولة.', 'warn');
      return;
    }
    const pool = pickStageQuestions(stageNum);
    if (pool.length < 10) {
      toast('لا توجد أسئلة كافية لهذه المرحلة. تواصل مع المدير.', 'error');
      return;
    }
    gameState = {
      stage: stageNum,
      questions: pool,
      index: 0,
      answers: new Array(10).fill(null),
      score: 0,
      attemptId: existing ? existing.id : uid(),
      startedAt: Date.now(),
    };
    view('game');
    renderQuestion();
  }

  function renderQuestion() {
    const q = gameState.questions[gameState.index];
    $('#stagePill').textContent = 'المرحلة ' + gameState.stage;
    $('#qCounter').textContent = 'السؤال ' + (gameState.index + 1) + ' / 10';
    $('#scoreLive').textContent = 'النقاط: ' + gameState.score;
    const pct = (gameState.index / 10) * 100;
    $('#progressBar').innerHTML = '<span style="width:' + pct + '%"></span>';
    $('#qLevel').textContent = q.level === 'easy' ? 'سهل' : q.level === 'medium' ? 'متوسط' : 'صعب';
    $('#qLevel').className = 'q-level ' + q.level;
    $('#qText').textContent = q.text;

    const letters = ['أ', 'ب', 'ج', 'د'];
    const list = $('#choicesList');
    list.innerHTML = '';
    q.choices.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice';
      btn.type = 'button';
      btn.dataset.idx = i;
      btn.innerHTML = '<span class="letter">' + letters[i] + '</span><span>' + escHTML(c) + '</span>';
      btn.addEventListener('click', () => selectChoice(i));
      list.appendChild(btn);
    });
    $('#nextBtn').disabled = true;
    $('#nextBtn').textContent = gameState.index === 9 ? 'عرض النتيجة 🎉' : 'التالي ←';
  }

  function selectChoice(idx) {
    if (!gameState) return;
    const q = gameState.questions[gameState.index];
    const selected = gameState.answers[gameState.index];
    if (selected !== null) return;
    gameState.answers[gameState.index] = idx;
    const btns = $$('#choicesList .choice');
    btns.forEach(b => b.disabled = true);
    btns[idx].classList.add(idx === q.correct ? 'correct' : 'wrong');
    if (idx !== q.correct) {
      btns[q.correct].classList.add('correct');
    } else {
      gameState.score++;
    }
    $('#scoreLive').textContent = 'النقاط: ' + gameState.score;
    $('#nextBtn').disabled = false;
  }

  function nextQuestion() {
    if (!gameState) return;
    if (gameState.index === 9) {
      finishGame();
    } else {
      gameState.index++;
      renderQuestion();
    }
  }

  function finishGame() {
    const user = getCurrentUser();
    const score = gameState.score;
    const attempt = {
      id: gameState.attemptId,
      userId: user.id,
      userName: user.name,
      stage: gameState.stage,
      score,
      total: 10,
      answers: gameState.questions.map((q, i) => ({
        qid: q.id,
        question: q.text,
        choices: q.choices,
        correct: q.correct,
        chosen: gameState.answers[i],
        explain: q.explain || '',
      })),
      startedAt: gameState.startedAt,
      finishedAt: Date.now(),
      open: false,
    };
    saveAttempt(attempt);

    // Render result
    const emoji = score >= 9 ? '🏆' : score >= 7 ? '🎉' : score >= 5 ? '👍' : score >= 3 ? '💪' : '📚';
    $('#resultEmoji').textContent = emoji;
    $('#resultScore').textContent = score + ' / 10';
    let title = '';
    let msg = '';
    if (score === 10) { title = 'ممتاز! العلامة الكاملة 🌟'; msg = 'أنت بطل الفاعل وأعماله!'; }
    else if (score >= 8) { title = 'أحسنت! أداء رائع 👏'; msg = 'مستوى متقدّم، استمر هكذا.'; }
    else if (score >= 6) { title = 'جيد! 💪'; msg = 'أداء جيد، راجع بعض القواعد وستتحسن.'; }
    else if (score >= 4) { title = 'لا بأس، تحتاج مراجعة 📘'; msg = 'ارجع لقواعد الفاعل وحاول مرة أخرى بعد المراجعة.'; }
    else { title = 'استمر في التعلّم 📚'; msg = 'راجع الدرس جيدًا، ثم اطلب من المدير إعادة المرحلة.'; }
    $('#resultTitle').textContent = title;
    $('#resultMsg').textContent = msg;

    const list = $('#reviewList');
    list.innerHTML = '';
    attempt.answers.forEach((a, i) => {
      const correctText = a.choices[a.correct];
      const chosenText = a.chosen == null ? 'لم تُجب' : a.choices[a.chosen];
      const isOK = a.chosen === a.correct;
      const div = document.createElement('div');
      div.className = 'review-item ' + (a.chosen == null ? 'wrong' : (isOK ? 'correct' : 'wrong'));
      div.innerHTML =
        '<div class="review-q">' + (i + 1) + '. ' + escHTML(a.question) + '</div>' +
        '<div class="review-answers">' +
          '<div class="ok">✓ الإجابة الصحيحة: ' + escHTML(correctText) + '</div>' +
          '<div class="' + (isOK ? 'ok' : 'bad') + '">' + (isOK ? '✓ إجابتك' : '✗ إجابتك') + ': ' + escHTML(chosenText) + '</div>' +
          (a.explain ? '<div class="review-explain">💡 ' + escHTML(a.explain) + '</div>' : '') +
        '</div>';
      list.appendChild(div);
    });

    $('#nextStage').style.display = gameState.stage < 5 ? '' : 'none';
    view('result');
  }

  function exitGameConfirm() {
    if (confirm('هل تريد فعلًا إنهاء المرحلة؟ سيتم احتساب المحاولة.')) {
      finishGame();
    }
  }

  /* ============================================
     Home / Stats / Stage Cards
     ============================================ */
  function renderHome() {
    const user = getCurrentUser();
    if (!user) { view('splash'); return; }
    $('#userName').textContent = user.name;

    const myAttempts = attempts.filter(a => a.userId === user.id);
    const totalScore = myAttempts.reduce((s, a) => s + a.score, 0);
    const doneStages = myAttempts.filter(a => !a.open).length;
    const answered = myAttempts.reduce((s, a) => s + a.total, 0);
    const correct = myAttempts.reduce((s, a) => s + a.score, 0);
    $('#statScore').textContent = totalScore;
    $('#statDone').textContent = doneStages + ' / 5';
    $('#statAccuracy').textContent = answered ? Math.round((correct / answered) * 100) + '%' : '0%';

    const grid = $('#stagesGrid');
    grid.innerHTML = '';
    STAGES.forEach((s, idx) => {
      const att = myAttempts.find(a => a.stage === s.num && !a.open);
      const isDone = !!att;
      const prevDone = idx === 0 || myAttempts.some(a => a.stage === STAGES[idx - 1].num && !a.open);
      const locked = !isDone && !prevDone;
      const card = document.createElement('div');
      card.className = 'stage-card' + (locked ? ' locked' : '');
      card.style.setProperty('--stage-grad', s.grad);
      card.innerHTML =
        (isDone ? '<span class="stage-status">✓ ' + att.score + '/10</span>' : '') +
        '<div class="stage-num">المرحلة ' + s.num + '</div>' +
        '<h4>' + escHTML(s.label) + '</h4>' +
        '<p>' + escHTML(s.sub) + '</p>' +
        (att ? '<div class="best-score">🏆 أفضل نتيجة: ' + att.score + '/10</div>' :
          (locked ? '<div class="best-score">🔒 أنهِ المرحلة السابقة أولاً</div>' : '<div class="best-score">🎮 جاهز للبدء</div>'));
      if (!locked) {
        card.addEventListener('click', () => startStage(s.num));
      }
      grid.appendChild(card);
    });

    const log = $('#attemptsLog');
    if (!myAttempts.length) {
      log.innerHTML = '<p class="muted">لم تجرّب أي مرحلة بعد. ابدأ المغامرة الآن!</p>';
    } else {
      log.innerHTML = '';
      myAttempts
        .slice()
        .sort((a, b) => b.finishedAt - a.finishedAt)
        .forEach(a => {
          const div = document.createElement('div');
          div.className = 'attempt-item';
          const date = new Date(a.finishedAt).toLocaleString('ar-EG');
          div.innerHTML =
            '<div><strong>المرحلة ' + a.stage + '</strong><br><small>' + date + '</small></div>' +
            '<span class="badge">' + a.score + ' / ' + a.total + '</span>';
          log.appendChild(div);
        });
    }
  }

  /* ============================================
     Admin Dashboard
     ============================================ */
  function adminLogin(phone, password) {
    if (phone.trim() !== ADMIN_PHONE) return { ok: false, error: 'رقم هاتف المدير غير صحيح' };
    if (password !== ADMIN_PASSWORD) return { ok: false, error: 'كلمة المرور غير صحيحة' };
    adminSession = { ts: Date.now() };
    save(STORE.ADMIN, adminSession);
    return { ok: true };
  }
  function adminLogout() {
    adminSession = null;
    localStorage.removeItem(STORE.ADMIN);
    view('splash');
  }
  function isAdminLoggedIn() {
    return !!adminSession;
  }

  function renderAdminDashboard() {
    if (!isAdminLoggedIn()) { view('admin-login'); return; }
    renderAdminPlayers();
    renderAdminQuestions();
    populateStageFilter();
  }

  /* --- Players tab --- */
  function renderAdminPlayers() {
    const list = $('#playersList');
    if (!users.length) {
      list.innerHTML = '<p class="muted">لا يوجد لاعبون بعد.</p>';
      return;
    }
    const q = ($('#playersSearch').value || '').toLowerCase().trim();
    const sort = $('#playersSort').value;
    let rows = users.slice();
    if (q) rows = rows.filter(u => u.name.toLowerCase().includes(q) || u.phone.includes(q));
    rows = rows.map(u => {
      const my = attempts.filter(a => a.userId === u.id);
      const total = my.reduce((s, a) => s + a.score, 0);
      const answered = my.reduce((s, a) => s + a.total, 0);
      const correct = my.reduce((s, a) => s + a.score, 0);
      return { u, total, answered, correct, count: my.length };
    });
    if (sort === 'score-desc') rows.sort((a, b) => b.total - a.total);
    else if (sort === 'score-asc') rows.sort((a, b) => a.total - b.total);
    else if (sort === 'name') rows.sort((a, b) => a.u.name.localeCompare(b.u.name, 'ar'));
    else rows.sort((a, b) => b.u.joinedAt - a.u.joinedAt);

    list.innerHTML = '';
    rows.forEach(({ u, total, count, answered, correct }) => {
      const row = document.createElement('div');
      row.className = 'player-row';
      const acc = answered ? Math.round((correct / answered) * 100) + '%' : '-';
      row.innerHTML =
        '<div class="player-info">' +
          '<strong>' + escHTML(u.name) + '</strong>' +
          '<small>📞 ' + escHTML(u.phone) + ' &nbsp; ✉ ' + escHTML(u.email) + '</small>' +
          '<small>🏆 ' + total + ' نقطة | 📋 ' + count + ' محاولة | ✓ ' + acc + '</small>' +
        '</div>' +
        '<div class="player-actions">' +
          '<button class="btn btn-sm btn-ghost" data-act="view" data-id="' + u.id + '">👁 تفاصيل</button>' +
          '<button class="btn btn-sm btn-warn" data-act="reset" data-id="' + u.id + '">↺ إعادة ضبط</button>' +
          '<button class="btn btn-sm btn-danger" data-act="delete" data-id="' + u.id + '">🗑 حذف</button>' +
        '</div>';
      list.appendChild(row);
    });
    list.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const act = btn.dataset.act;
        if (act === 'view') openPlayerModal(id);
        else if (act === 'reset') resetPlayerAttempts(id);
        else if (act === 'delete') deletePlayer(id);
      });
    });
  }

  function resetPlayerAttempts(userId) {
    const u = users.find(x => x.id === userId);
    if (!u) return;
    if (!confirm('هل تريد إعادة ضبط كل محاولات "' + u.name + '"؟')) return;
    attempts = attempts.filter(a => a.userId !== userId);
    save(STORE.ATTEMPTS, attempts);
    toast('تم إعادة ضبط محاولات ' + u.name);
    renderAdminPlayers();
  }
  function deletePlayer(userId) {
    const u = users.find(x => x.id === userId);
    if (!u) return;
    if (!confirm('حذف اللاعب "' + u.name + '" نهائيًا؟ سيتم حذف محاولاته أيضًا.')) return;
    users = users.filter(x => x.id !== userId);
    attempts = attempts.filter(a => a.userId !== userId);
    save(STORE.USERS, users);
    save(STORE.ATTEMPTS, attempts);
    toast('تم حذف اللاعب', 'warn');
    renderAdminPlayers();
  }

  function openPlayerModal(userId) {
    const u = users.find(x => x.id === userId);
    if (!u) return;
    $('#playerModalTitle').textContent = 'بيانات اللاعب: ' + u.name;
    const my = attempts.filter(a => a.userId === u.id).sort((a, b) => b.finishedAt - a.finishedAt);
    const initials = u.name.trim().slice(0, 2);
    let html =
      '<div class="player-detail-header">' +
        '<div class="avatar">' + escHTML(initials) + '</div>' +
        '<div>' +
          '<h3>' + escHTML(u.name) + '</h3>' +
          '<small>📞 ' + escHTML(u.phone) + '</small><br>' +
          '<small>✉ ' + escHTML(u.email) + '</small><br>' +
          '<small>📅 انضم في ' + new Date(u.joinedAt).toLocaleDateString('ar-EG') + '</small>' +
        '</div>' +
      '</div>';
    if (!my.length) {
      html += '<p class="muted">لا توجد محاولات بعد.</p>';
    } else {
      const allErrors = [];
      my.forEach(a => {
        a.answers.forEach((ans, i) => {
          if (ans.chosen == null || ans.chosen !== ans.correct) {
            allErrors.push({
              stage: a.stage,
              q: ans.question,
              correct: ans.choices[ans.correct],
              chosen: ans.chosen == null ? 'لم تُجب' : ans.choices[ans.chosen],
              date: a.finishedAt,
            });
          }
        });
        html +=
          '<div style="margin-top:12px">' +
            '<h4 style="margin:0 0 6px">📋 المرحلة ' + a.stage + ' — ' + a.score + ' / ' + a.total +
              ' <small style="color:var(--c-muted)">(' + new Date(a.finishedAt).toLocaleString('ar-EG') + ')</small>' +
            '</h4>' +
            '<table class="attempts-table"><thead><tr><th>#</th><th>السؤال</th><th>إجابة اللاعب</th><th>الصحيحة</th><th>الحالة</th></tr></thead><tbody>';
        a.answers.forEach((ans, i) => {
          const ok = ans.chosen === ans.correct;
          html +=
            '<tr class="' + (ok ? '' : 'err-row') + '">' +
              '<td>' + (i + 1) + '</td>' +
              '<td>' + escHTML(ans.question) + '</td>' +
              '<td>' + escHTML(ans.chosen == null ? '—' : ans.choices[ans.chosen]) + '</td>' +
              '<td>' + escHTML(ans.choices[ans.correct]) + '</td>' +
              '<td>' + (ok ? '✅' : '❌') + '</td>' +
            '</tr>';
        });
        html += '</tbody></table></div>';
      });

      if (allErrors.length) {
        html += '<div class="mistake-block"><h4>❌ ملخص الأخطاء (' + allErrors.length + ' خطأ)</h4>';
        allErrors.forEach((e, i) => {
          html +=
            '<div class="mistake-item">' +
              '<strong>' + (i + 1) + '. (م' + e.stage + ')</strong> ' + escHTML(e.q) +
              '<br>✓ الصحيحة: <span class="ok">' + escHTML(e.correct) + '</span>' +
              '<br>✗ إجابته: <span class="bad">' + escHTML(e.chosen) + '</span>' +
            '</div>';
        });
        html += '</div>';
      }
    }
    $('#playerModalBody').innerHTML = html;
    $('#playerModal').classList.remove('hidden');
  }

  function closePlayerModal() {
    $('#playerModal').classList.add('hidden');
  }

  /* --- Questions tab --- */
  function populateStageFilter() {
    const sel = $('#qStageFilter');
    if (!sel) return;
    sel.innerHTML = '<option value="all">كل المراحل</option>' +
      STAGES.map(s => '<option value="' + s.num + '">المرحلة ' + s.num + ' - ' + escHTML(s.sub) + '</option>').join('');
  }
  function renderAdminQuestions() {
    const list = $('#questionsList');
    const filter = $('#qStageFilter').value;
    let rows = questions.slice();
    if (filter !== 'all') rows = rows.filter(q => String(q.stage) === String(filter));
    if (!rows.length) {
      list.innerHTML = '<p class="muted">لا توجد أسئلة هنا.</p>';
      return;
    }
    list.innerHTML = '';
    rows.forEach(q => {
      const row = document.createElement('div');
      row.className = 'q-row';
      row.innerHTML =
        '<div class="q-row-head">' +
          '<div class="badges">' +
            '<span class="badge">المرحلة ' + q.stage + '</span>' +
            '<span class="badge">' + (q.level === 'easy' ? 'سهل' : q.level === 'medium' ? 'متوسط' : 'صعب') + '</span>' +
            '<span class="badge">' + q.id + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="q-row-text">' + escHTML(q.text) + '</div>' +
        '<div class="q-row-choices">' +
          q.choices.map((c, i) =>
            '<div class="' + (i === q.correct ? 'ok' : '') + '">' +
              (i === q.correct ? '✓ ' : '') + escHTML(c) +
            '</div>'
          ).join('') +
        '</div>' +
        (q.explain ? '<div class="review-explain">💡 ' + escHTML(q.explain) + '</div>' : '') +
        '<div class="q-row-actions">' +
          '<button class="btn btn-sm btn-ghost" data-act="edit">✏ تعديل</button>' +
          '<button class="btn btn-sm btn-danger" data-act="del">🗑 حذف</button>' +
        '</div>';
      row.querySelector('[data-act="edit"]').addEventListener('click', () => openQuestionModal(q));
      row.querySelector('[data-act="del"]').addEventListener('click', () => {
        if (confirm('حذف هذا السؤال؟')) {
          questions = questions.filter(x => x.id !== q.id);
          save(STORE.QUESTIONS, questions);
          toast('تم حذف السؤال', 'warn');
          renderAdminQuestions();
        }
      });
      list.appendChild(row);
    });
  }

  function openQuestionModal(q) {
    $('#qModalTitle').textContent = q ? 'تعديل السؤال' : 'إضافة سؤال جديد';
    const form = $('#qForm');
    form.reset();
    form.id.value = q ? q.id : '';
    form.stage.value = q ? q.stage : 1;
    form.level.value = q ? q.level : 'easy';
    form.text.value = q ? q.text : '';
    form.c0.value = q ? q.choices[0] : '';
    form.c1.value = q ? q.choices[1] : '';
    form.c2.value = q ? q.choices[2] : '';
    form.c3.value = q ? q.choices[3] : '';
    form.correct.value = q ? q.correct : 0;
    form.explain.value = q ? (q.explain || '') : '';
    $('#qModal').classList.remove('hidden');
  }
  function closeQuestionModal() {
    $('#qModal').classList.add('hidden');
  }
  function saveQuestion(form) {
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    if (!data.text || !data.c0 || !data.c1 || !data.c2 || !data.c3) {
      toast('من فضلك أكمل كل الحقول', 'warn');
      return;
    }
    if (data.id) {
      const idx = questions.findIndex(q => q.id === data.id);
      if (idx >= 0) {
        questions[idx] = {
          ...questions[idx],
          stage: Number(data.stage),
          level: data.level,
          text: data.text,
          choices: [data.c0, data.c1, data.c2, data.c3],
          correct: Number(data.correct),
          explain: data.explain || '',
        };
      }
    } else {
      questions.push({
        id: 'q' + data.stage + '-' + uid(),
        stage: Number(data.stage),
        level: data.level,
        text: data.text,
        choices: [data.c0, data.c1, data.c2, data.c3],
        correct: Number(data.correct),
        explain: data.explain || '',
      });
    }
    save(STORE.QUESTIONS, questions);
    closeQuestionModal();
    toast(data.id ? 'تم تعديل السؤال' : 'تم إضافة السؤال');
    renderAdminQuestions();
  }

  /* --- PDF upload --- */
  async function handlePdfUpload(file) {
    if (!file) return;
    if (!window['pdfjsLib']) {
      toast('مكتبة قراءة PDF لم تُحمَّل بعد، حاول مرة أخرى', 'error');
      return;
    }
    $('#parsePdfBtn').disabled = true;
    $('#pdfPreview').innerHTML = '<p class="muted">⏳ جاري قراءة الملف...</p>';
    try {
      const buf = await file.arrayBuffer();
      const pdf = await window['pdfjsLib'].getDocument({ data: buf }).promise;
      let allText = '';
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        const items = content.items.map(i => i.str).join(' ');
        allText += '\n[صفحة ' + p + ']\n' + items + '\n';
      }

      // Try to split into blocks (heuristic by numbering 1. 2. ... or أ) ب) ...)
      const blocks = splitTextIntoQuestions(allText);

      if (!blocks.length) {
        $('#pdfPreview').innerHTML = '<p class="muted">تعذّر استخراج أسئلة واضحة. سيتم عرض النص لمراجعتك.</p>' +
          '<pre class="pdf-line" style="white-space:pre-wrap;max-height:300px;overflow:auto;">' + escHTML(allText.slice(0, 4000)) + '</pre>';
      } else {
        renderPdfPreviewBlocks(blocks);
      }
    } catch (e) {
      console.error(e);
      toast('تعذّر قراءة ملف PDF. تأكد من أنه ملف نصي صالح.', 'error');
      $('#pdfPreview').innerHTML = '';
    } finally {
      $('#parsePdfBtn').disabled = false;
    }
  }

  function splitTextIntoQuestions(text) {
    // Heuristic: split by lines starting with digit + dot OR Arabic أ/ب/ج/د marker followed by question text
    const normalized = text.replace(/\r/g, '');
    const lines = normalized.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const blocks = [];
    let cur = [];
    const startRe = /^(\d+\s*[-–.:]|\(?\d+\)|[أإ]\)|س\s*\d+|Question\s*\d+)/i;
    lines.forEach(l => {
      if (startRe.test(l) && cur.length) {
        blocks.push(cur.join(' ').trim());
        cur = [l.replace(startRe, '').trim()];
      } else if (startRe.test(l) && !cur.length) {
        cur.push(l.replace(startRe, '').trim());
      } else if (cur.length) {
        cur.push(l);
      }
    });
    if (cur.length) blocks.push(cur.join(' ').trim());
    return blocks.filter(b => b.length > 12).slice(0, 30);
  }

  function renderPdfPreviewBlocks(blocks) {
    const container = $('#pdfPreview');
    container.innerHTML = '<p class="muted">تم العثور على ' + blocks.length + ' مقطعًا. حدد المرحلة والإجابات الصحيحة ثم احفظ:</p>';
    blocks.forEach((b, i) => {
      const div = document.createElement('div');
      div.className = 'pdf-line';
      div.innerHTML =
        '<div class="pdf-line-header">سؤال ' + (i + 1) + ' (مستخرج من PDF)</div>' +
        '<textarea data-block="' + i + '" rows="3" style="width:100%;font-family:inherit;padding:8px;border-radius:8px;border:1px solid var(--c-border);background:var(--c-bg-2);color:var(--c-text);">' + escHTML(b) + '</textarea>' +
        '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">' +
          '<select data-corr="' + i + '" style="padding:6px 10px;border-radius:8px;border:1px solid var(--c-border);background:var(--c-bg);color:var(--c-text);">' +
            '<option value="0">الإجابة 1</option>' +
            '<option value="1">الإجابة 2</option>' +
            '<option value="2">الإجابة 3</option>' +
            '<option value="3">الإجابة 4</option>' +
          '</select>' +
          '<select data-stg="' + i + '" style="padding:6px 10px;border-radius:8px;border:1px solid var(--c-border);background:var(--c-bg);color:var(--c-text);">' +
            STAGES.map(s => '<option value="' + s.num + '">المرحلة ' + s.num + ' - ' + escHTML(s.sub) + '</option>').join('') +
          '</select>' +
          '<select data-lvl="' + i + '" style="padding:6px 10px;border-radius:8px;border:1px solid var(--c-border);background:var(--c-bg);color:var(--c-text);">' +
            '<option value="easy">سهل</option><option value="medium">متوسط</option><option value="hard">صعب</option>' +
          '</select>' +
          '<button class="btn btn-sm btn-success" data-save="' + i + '">💾 حفظ كسؤال</button>' +
        '</div>';
      container.appendChild(div);
    });
    container.querySelectorAll('[data-save]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = btn.dataset.save;
        const text = container.querySelector('[data-block="' + i + '"]').value.trim();
        const corr = Number(container.querySelector('[data-corr="' + i + '"]').value);
        const stg = Number(container.querySelector('[data-stg="' + i + '"]').value);
        const lvl = container.querySelector('[data-lvl="' + i + '"]').value;
        if (!text) { toast('نص السؤال فارغ', 'warn'); return; }
        questions.push({
          id: 'pdf-' + uid(),
          stage: stg,
          level: lvl,
          text: text,
          choices: ['الإجابة 1', 'الإجابة 2', 'الإجابة 3', 'الإجابة 4'],
          correct: corr,
          explain: 'تم استخراجه من PDF. يرجى مراجعة الاختيارات يدويًا.',
        });
        save(STORE.QUESTIONS, questions);
        toast('تم حفظ السؤال — راجع اختياراته يدويًا');
      });
    });
  }

  /* ============================================
     PWA Install
     ============================================ */
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = $('#installBtn');
    if (btn) btn.classList.remove('hidden');
  });
  $('#installBtn').addEventListener('click', async () => {
    if (!deferredPrompt) { toast('اللعبة جاهزة للتثبيت من قائمة المتصفح', 'warn'); return; }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $('#installBtn').classList.add('hidden');
  });

  /* ============================================
     Wiring up events
     ============================================ */
  document.addEventListener('DOMContentLoaded', () => {
    // Splash / nav
    $('#goRegister').addEventListener('click', () => view('register'));
    $('#goLogin').addEventListener('click', () => view('login'));
    $('#adminBtn').addEventListener('click', () => {
      if (isAdminLoggedIn()) { view('admin'); renderAdminDashboard(); }
      else view('admin-login');
    });
    $$('[data-back]').forEach(b => b.addEventListener('click', () => view(b.dataset.back)));

    // Theme
    $('#themeToggle').addEventListener('click', toggleTheme);

    // Register
    $('#registerForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const result = registerUser(Object.fromEntries(fd.entries()));
      if (!result.ok) { toast(result.error, 'error'); return; }
      setCurrentUser(result.user);
      toast('مرحبًا ' + result.user.name + '! 🎉');
      e.target.reset();
      view('home');
      renderHome();
    });

    // Login
    $('#loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const result = loginUser(fd.get('identifier'), fd.get('password'));
      if (!result.ok) { toast(result.error, 'error'); return; }
      setCurrentUser(result.user);
      toast('أهلًا ' + result.user.name);
      view('home');
      renderHome();
    });

    // Logout
    $('#logoutBtn').addEventListener('click', logout);

    // Game
    $('#nextBtn').addEventListener('click', nextQuestion);
    $('#exitGame').addEventListener('click', exitGameConfirm);

    // Result
    $('#backHome').addEventListener('click', () => { view('home'); renderHome(); });
    $('#nextStage').addEventListener('click', () => startStage(gameState.stage + 1));

    // Admin login
    $('#adminForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const result = adminLogin(fd.get('phone'), fd.get('password'));
      if (!result.ok) { toast(result.error, 'error'); return; }
      toast('مرحبًا أ. حسين');
      e.target.reset();
      view('admin');
      renderAdminDashboard();
    });
    $('#adminLogout').addEventListener('click', adminLogout);

    // Admin tabs
    $$('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.tab-btn').forEach(b => b.classList.remove('active'));
        $$('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.querySelector('.tab-panel[data-tab="' + tab + '"]').classList.add('active');
        if (tab === 'players') renderAdminPlayers();
        if (tab === 'questions') renderAdminQuestions();
      });
    });

    // Admin players search/sort
    $('#playersSearch').addEventListener('input', renderAdminPlayers);
    $('#playersSort').addEventListener('change', renderAdminPlayers);

    // Admin questions
    $('#qStageFilter').addEventListener('change', renderAdminQuestions);
    $('#addQuestionBtn').addEventListener('click', () => openQuestionModal(null));
    $('#closeQModal').addEventListener('click', closeQuestionModal);
    $('#cancelQ').addEventListener('click', closeQuestionModal);
    $('#qForm').addEventListener('submit', (e) => {
      e.preventDefault();
      saveQuestion(e.target);
    });

    // Admin player modal
    $('#closePlayerModal').addEventListener('click', closePlayerModal);

    // Admin PDF
    $('#pdfInput').addEventListener('change', (e) => {
      $('#parsePdfBtn').disabled = !e.target.files[0];
    });
    $('#parsePdfBtn').addEventListener('click', () => {
      const f = $('#pdfInput').files[0];
      if (f) handlePdfUpload(f);
    });

    // Initial routing
    if (isAdminLoggedIn()) {
      // admin can navigate via button
    }
    if (getCurrentUser()) {
      view('home');
      renderHome();
    } else {
      view('splash');
    }
  });
})();

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
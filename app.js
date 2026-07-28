// Навигатор питания — компактная версия под sidebar-дизайн
(() => {
  'use strict';

  const STORE_KEY = 'np.v1';
  const Store = {
    load() { try { const r = localStorage.getItem(STORE_KEY); return r ? JSON.parse(r) : defaultState(); } catch { return defaultState(); } },
    save(s) { localStorage.setItem(STORE_KEY, JSON.stringify(s)); }
  };

  function defaultState() {
    return {
      profile: null, health: null, phase: 'remission',
      foods: [], forbidden: [], tolerances: {},
      targetToday: null, plan: null, meals: [], symptoms: [],
      settings: { mealsPerDay: 4, shares: { breakfast: 27, lunch: 33, snack: 12, dinner: 28 } },
      ribbonHidden: false, onboardingDone: false
    };
  }

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const ACTIVITY = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725, vhigh: 1.9 };
  const GOAL_K = { maintain: 0, lose: -0.1, gain: 0.1 };

  function calcBMR(p) {
    if (p.measuredBmrKcal) return { bmr: p.measuredBmrKcal, method: 'измеренный' };
    if (p.bodyFatPct) { const lbm = p.weightKg * (1 - p.bodyFatPct / 100); return { bmr: 370 + 21.6 * lbm, method: 'Katch-McArdle' }; }
    const s = p.sex === 'm' ? 5 : -161;
    return { bmr: 10 * p.weightKg + 6.25 * p.heightCm + s - 5 * p.age, method: 'Mifflin-St Jeor' };
  }

  function calcTargets(p, phase) {
    if (!p) return null;
    const ph = phase || 'remission';
    const { bmr, method } = calcBMR(p);
    const tdee = bmr * ACTIVITY[p.activityLevel] * (1 + (GOAL_K[p.goal] || 0));
    const proteinPerKg = ph === 'flare' ? 1.3 : 1.0;
    const protein_g_target = Math.min(p.weightKg * proteinPerKg, tdee * 0.35 / 4);
    const fatPct = ph === 'flare' ? 0.25 : 0.30;
    const fat_g_target = (tdee * fatPct) / 9;
    const carb_g_target = Math.max(tdee - protein_g_target * 4 - fat_g_target * 9, 0) / 4;
    const fiber_g_target = ph === 'flare' ? Math.min((tdee / 1000) * 8, 14) : (tdee / 1000) * 14;
    return {
      kcal_target: Math.round(tdee), protein_g_target: Math.round(protein_g_target),
      fat_g_target: Math.round(fat_g_target), carb_g_target: Math.round(carb_g_target),
      fiber_g_target: Math.round(fiber_g_target),
      water_ml_target: ph === 'flare' ? 2500 : 2000,
      sodium_mg_limit: 2300, sugar_g_limit: Math.round((tdee * 0.10) / 4),
      calc_method: method
    };
  }

  function allFoods() { return window.SEED_FOODS || []; }
  function findFood(n) { return allFoods().find(f => f.name === n); }

  function recommendDay(state, targets) {
    if (!targets) return { error: 'Сначала заполните анкету.' };
    if (!state.foods || state.foods.length < 3) return { error: 'Добавьте хотя бы 3 разрешённых продукта.' };
    const tol = state.tolerances || {};
    const forb = new Set(state.forbidden || []);
    const cand = state.foods.map(findFood).filter(Boolean)
      .filter(f => !forb.has(f.name))
      .filter(f => tol[f.name] !== 'not_suits' && tol[f.name] !== 'causes_symptoms')
      .filter(f => {
        if (state.phase !== 'flare') return true;
        const ir = f.irritants || [];
        if (ir.includes('insoluble_fiber')) return false;
        if (ir.includes('fat') && f.fat_g >= 15) return false;
        if (ir.includes('caffeine')) return false;
        return true;
      });
    if (cand.length < 3) return { error: 'Подходящих продуктов мало. Расширьте список разрешённых.' };
    cand.sort((a, b) => b.protein_g - a.protein_g);
    const picks = new Map();
    let p = 0, fat = 0, c = 0, fi = 0, k = 0;
    function add(f, g) {
      const cur = picks.get(f.name) || 0;
      picks.set(f.name, cur + g);
      p += f.protein_g * g / 100; fat += f.fat_g * g / 100; c += f.carb_g * g / 100;
      fi += f.fiber_g * g / 100; k += f.kcal * g / 100;
    }
    for (const food of cand) {
      if (p >= targets.protein_g_target * 0.9) break;
      if (picks.has(food.name)) continue;
      const need = (targets.protein_g_target - p) * 100 / Math.max(food.protein_g, 1);
      const g = Math.max(20, Math.min(200, Math.round(need / 5) * 5));
      add(food, g);
    }
    for (const food of cand) {
      if (fat >= targets.fat_g_target * 0.9 && c >= targets.carb_g_target * 0.9) break;
      if (picks.has(food.name)) continue;
      add(food, 80);
    }
    if (fi < targets.fiber_g_target * 0.8) {
      const sol = cand.find(x => x.fiber_type === 'soluble' && !picks.has(x.name));
      if (sol) add(sol, 100);
    }
    const shares = state.settings.shares || { breakfast: 27, lunch: 33, snack: 12, dinner: 28 };
    const sumS = Object.values(shares).reduce((a, b) => a + b, 0) || 100;
    const slots = ['breakfast', 'lunch', 'snack', 'dinner'].map((name, i) => ({
      slot_index: i + 1, slot_name: name,
      target_kcal_share: shares[name] / sumS * 100,
      recommendations: [], warnings: []
    }));
    const totalKcal = k || 1;
    picks.forEach((g, name) => {
      const f = findFood(name); if (!f) return;
      const kcal = f.kcal * g / 100; const weight = kcal / totalKcal;
      let acc = 0;
      for (const s of slots) {
        acc += s.target_kcal_share / 100;
        if (weight <= acc || s === slots[slots.length - 1]) {
          slots[slots.indexOf(s)].recommendations.push({
            foodItemId: f.name, grams_raw: g, kcal: Math.round(kcal),
            protein_g: +(f.protein_g * g / 100).toFixed(1),
            fat_g: +(f.fat_g * g / 100).toFixed(1),
            carb_g: +(f.carb_g * g / 100).toFixed(1),
            fiber_g: +(f.fiber_g * g / 100).toFixed(1), warnings: []
          });
          break;
        }
      }
    });
    slots.forEach((s, i) => {
      s.recommendations.forEach(r => {
        const f = findFood(r.foodItemId); if (!f) return;
        const ir = f.irritants || [];
        if (state.phase === 'flare') {
          if (ir.includes('fat')) r.warnings.push({ severity: 'warning', message: 'Жирное в обострении — наблюдайте.' });
          if (ir.includes('insoluble_fiber')) r.warnings.push({ severity: 'warning', message: 'Грубая клетчатка — осторожно.' });
          if (ir.includes('caffeine')) r.warnings.push({ severity: 'warning', message: 'Кофеин может раздражать ЖКТ.' });
        }
        if (i === 3 && ir.includes('fat')) r.warnings.push({ severity: 'info', message: 'Жирное на ночь — нежелательно.' });
      });
    });
    const errors = [];
    if (k < targets.kcal_target * 0.7) errors.push('Калорий мало. Расширьте список продуктов.');
    if (p < targets.protein_g_target * 0.7) errors.push('Белка мало. Добавьте белковых продуктов.');
    return {
      slots, totals: { kcal: Math.round(k), protein_g: Math.round(p), fat_g: Math.round(fat), carb_g: Math.round(c), fiber_g: Math.round(fi) },
      errors, calc_method: targets.calc_method
    };
  }

  const S = {
    state: Store.load(), current: 'today',
    init() {
      this.state.targetToday = calcTargets(this.state.profile, this.state.phase);
      updateSidenav();
      paintRibbon();
      bindEvents();
      this.current = this.state.profile ? 'today' : 'profile';
      updateSidenavActive(this.current);
      refreshScreen(this.current);
    },
    go(name) {
      this.current = name;
      updateSidenavActive(name);
      closeSidenav();
      refreshScreen(name);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  function updateSidenav() {
    const name = S.state.profile ? (S.state.profile.name || (S.state.profile.sex === 'm' ? 'Вы' : 'Вы')) : 'Гость';
    const phaseLabel = S.state.profile ? (S.state.phase === 'flare' ? 'обострение' : 'ремиссия') : 'анкета не заполнена';
    const age = S.state.profile ? `${S.state.profile.age} лет` : '—';
    const nameEl = $('#sidenav-name'); if (nameEl) nameEl.textContent = S.state.profile ? 'Вы' : 'Гость';
    const metaEl = $('#sidenav-meta'); if (metaEl) metaEl.textContent = S.state.profile ? `${age} · ${phaseLabel}` : phaseLabel;
    const p = S.state.profile ? (S.state.health ? 2 : 1) : 0;
    document.documentElement.style.setProperty('--p', `${(p / 3) * 100}%`);
  }

  function updateSidenavActive(name) {
    $$('.sidenav__item').forEach(b => {
      const screen = b.dataset.screenToggle;
      const isActive = screen === name || (screen === 'more' && name === 'settings');
      b.classList.toggle('is-active', isActive);
    });
  }

  function closeSidenav() {
    const nav = $('#sidenav'); if (nav) nav.classList.remove('is-open');
  }
  function toggleSidenav() {
    const nav = $('#sidenav'); if (nav) nav.classList.toggle('is-open');
  }

  function bindEvents() {
    document.body.addEventListener('click', onClick);
    document.body.addEventListener('submit', onSubmit);
    document.body.addEventListener('input', onInput);
    document.body.addEventListener('change', onChange);
  }

  function onClick(e) {
    const t = e.target.closest('[data-action], [data-screen-toggle], [data-phase], [data-tab], [data-allow], [data-forbid], [data-rm], [data-tol], [data-replace], [data-log]');
    if (!t) return;
    const a = t.dataset.action;
    if (a === 'start' || a === 'nav-toggle') { toggleSidenav(); return; }
    if (a === 'hide-ribbon') { S.state.ribbonHidden = true; Store.save(S.state); const r = $('#ribbon'); if (r) r.hidden = true; return; }
    if (a === 'regen-plan') { S.state.plan = recommendDay(S.state, S.state.targetToday); Store.save(S.state); renderPlan(); return; }
    if (a === 'export') {
      const out = { meta: { app: 'Навигатор питания', exported_at: new Date().toISOString() }, data: S.state };
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'navpit-' + new Date().toISOString().slice(0, 10) + '.json';
      link.click(); URL.revokeObjectURL(url); toast('Файл сохранён'); return;
    }
    if (a === 'reset') { if (confirm('Стереть все локальные данные?')) { localStorage.removeItem(STORE_KEY); location.reload(); } return; }
    const screen = t.dataset.screenToggle;
    if (screen) {
      const map = { today: 'today', plan: 'plan', foods: 'foods', diary: 'diary', more: 'settings', symptoms: 'symptoms' };
      S.go(map[screen] || screen);
      return;
    }
    const phase = t.dataset.phase;
    if (phase) {
      S.state.phase = phase; S.state.targetToday = calcTargets(S.state.profile, phase); Store.save(S.state);
      $$('[data-phase]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.phase === phase)));
      updateSidenav(); refreshToday(); return;
    }
    const tab = t.dataset.tab;
    if (tab) { $$('[data-tab]').forEach(x => x.classList.toggle('is-active', x === t)); renderAnalytics(tab); return; }
    if (t.dataset.allow) addAllowed(t.dataset.allow);
    else if (t.dataset.forbid) addForbidden(t.dataset.forbid);
    else if (t.dataset.rm) removeAllowed(t.dataset.rm);
    else if (t.dataset.tol) cycleTolerance(t.dataset.tol);
    else if (t.dataset.replace) doReplace(+t.dataset.slot, t.dataset.replace);
    else if (t.dataset.log) logMeal(+t.dataset.slot, t.dataset.log, +t.dataset.grams);
  }

  function onInput(e) {
    const t = e.target;
    if (t.id === 'food-search') {
      const q = t.value.toLowerCase().trim();
      const box = $('#food-search-results');
      if (!q) { if (box) box.hidden = true; return; }
      const res = allFoods().filter(f => f.name.toLowerCase().includes(q)).slice(0, 8);
      if (!box) return;
      box.hidden = false;
      box.innerHTML = res.map(f =>
        '<div class="search-results__item">' +
        '<div><strong>' + esc(f.name) + '</strong>' +
        '<small>' + f.kcal + ' ккал · Б' + f.protein_g + ' Ж' + f.fat_g + ' У' + f.carb_g + ' · кл. ' + f.fiber_g + ' г</small></div>' +
        '<div style="display:flex;gap:6px">' +
        '<button class="btn btn--small" data-allow="' + esc(f.name) + '">разрешить</button>' +
        '<button class="btn btn--small" data-forbid="' + esc(f.name) + '" style="color:#C25B3A">исключить</button>' +
        '</div></div>'
      ).join('');
    }
    if (t.name === 'severity') { const o = $('#sev-out'); if (o) o.textContent = t.value; }
  }

  function onChange(e) {
    if (e.target.id === 'import-input') {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = ev => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (!parsed.data) throw new Error('Не похоже на бэкап');
          S.state = Object.assign(defaultState(), parsed.data);
          Store.save(S.state); toast('Импортировано'); refreshAll();
          S.go(S.state.profile ? 'today' : 'profile');
        } catch (err) { toast('Ошибка: ' + err.message); }
      };
      r.readAsText(f);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    const f = e.target;
    if (f.id === 'form-profile') return saveProfile(f);
    if (f.id === 'form-health') return saveHealth(f);
    if (f.id === 'form-symptom') return saveSymptom(f);
    if (f.id === 'form-settings') return saveSettings(f);
  }

  function saveProfile(form) {
    const fd = new FormData(form);
    const p = {
      sex: fd.get('sex'), age: +fd.get('age'), heightCm: +fd.get('heightCm'), weightKg: +fd.get('weightKg'),
      bodyFatPct: fd.get('bodyFatPct') ? +fd.get('bodyFatPct') : null,
      measuredBmrKcal: fd.get('measuredBmrKcal') ? +fd.get('measuredBmrKcal') : null,
      activityLevel: fd.get('activityLevel'), goal: fd.get('goal'),
      mealsPerDay: +fd.get('mealsPerDay') || 4
    };
    if (p.age < 1 || p.age > 120) return toast('Возраст: 1–120');
    if (p.heightCm < 50 || p.heightCm > 250) return toast('Рост: 50–250 см');
    if (p.weightKg < 20 || p.weightKg > 400) return toast('Вес: 20–400 кг');
    S.state.profile = p; S.state.targetToday = calcTargets(p, S.state.phase); Store.save(S.state);
    toast('Анкета сохранена');
    updateSidenav();
    S.go('health');
  }

  function saveHealth(form) {
    const fd = new FormData(form);
    S.state.health = {
      phase: fd.get('phase'),
      diagnoses: (fd.get('diagnoses') || '').toString().split(',').map(s => s.trim()).filter(Boolean),
      allergies: (fd.get('allergies') || '').toString().split(',').map(s => s.trim()).filter(Boolean),
      intolerances: (fd.get('intolerances') || '').toString().split(',').map(s => s.trim()).filter(Boolean),
      free: fd.get('free') || ''
    };
    S.state.phase = S.state.health.phase;
    S.state.targetToday = calcTargets(S.state.profile, S.state.phase);
    Store.save(S.state); toast('Здоровье сохранено');
    refreshToday(); updateSidenav();
    S.go('foods');
  }

  function saveSymptom(form) {
    const fd = new FormData(form);
    const types = $$('[name=symptomType]:checked', form).map(i => i.value);
    if (types.length === 0) return toast('Выберите симптом');
    const severity = +fd.get('severity');
    const isRed = types.includes('blood') || types.includes('fever') || severity >= 8 || (types.includes('pain') && severity >= 6);
    const e = {
      id: 'sym-' + Date.now(), datetime: fd.get('datetime') || new Date().toISOString().slice(0, 16),
      all_types: types, severity, phase: S.state.phase,
      related_foods: fd.get('relatedFood') || '', note: fd.get('note') || '', red_flag: isRed
    };
    S.state.symptoms.unshift(e); Store.save(S.state);
    toast(isRed ? '🚨 Записано. Похоже на red-flag — обратитесь к врачу.' : 'Записано');
    renderSymptoms(); form.reset();
    const sev = form.querySelector('[name=severity]'); if (sev) sev.value = 3;
    const so = $('#sev-out'); if (so) so.textContent = '3';
  }

  function saveSettings(form) {
    const fd = new FormData(form);
    const shares = {
      breakfast: +fd.get('shareBreakfast'), lunch: +fd.get('shareLunch'),
      snack: +fd.get('shareSnack'), dinner: +fd.get('shareDinner')
    };
    const sum = shares.breakfast + shares.lunch + shares.snack + shares.dinner;
    if (Math.abs(sum - 100) > 4) return toast('Σ ' + sum + '% (должно быть 100±2)');
    S.state.settings.mealsPerDay = +fd.get('mealsPerDay') || 4;
    S.state.settings.shares = shares; Store.save(S.state);
    toast('Сохранено');
  }

  function addAllowed(name) { S.state.forbidden = (S.state.forbidden || []).filter(n => n !== name); if (!S.state.foods.includes(name)) S.state.foods.push(name); Store.save(S.state); renderFoods(); refreshToday(); toast('«' + name + '» в разрешённых'); }
  function addForbidden(name) { S.state.foods = (S.state.foods || []).filter(n => n !== name); S.state.forbidden = S.state.forbidden || []; if (!S.state.forbidden.includes(name)) S.state.forbidden.push(name); Store.save(S.state); renderFoods(); refreshToday(); toast('«' + name + '» исключён'); }
  function removeAllowed(name) { S.state.foods = S.state.foods.filter(n => n !== name); Store.save(S.state); renderFoods(); }
  function cycleTolerance(name) { const cycle = ['unknown', 'suits', 'not_suits', 'causes_symptoms']; const cur = S.state.tolerances[name] || 'unknown'; const next = cycle[(cycle.indexOf(cur) + 1) % cycle.length]; S.state.tolerances[name] = next; Store.save(S.state); renderFoods(); toast('«' + name + '»: ' + { suits: '👍', not_suits: '👎', causes_symptoms: '⚠️', unknown: '?' }[next]); }

  function logMeal(slotIndex, foodName, grams) {
    const e = { id: 'me-' + Date.now(), date: new Date().toISOString().slice(0, 10), slot_index: slotIndex, food_item: foodName, grams_raw: grams, deviation: 'as_planned' };
    S.state.meals.push(e); Store.save(S.state); refreshToday(); toast('Записано: ' + foodName + ' ' + grams + ' г');
  }

  function doReplace(slotIndex, oldName) {
    const state = S.state;
    const cand = state.foods.map(findFood).filter(f => f && f.name !== oldName)
      .filter(f => state.tolerances[f.name] !== 'not_suits' && state.tolerances[f.name] !== 'causes_symptoms');
    if (!cand.length) return toast('Нет замен.');
    const next = cand[Math.floor(Math.random() * cand.length)];
    const plan = state.plan; if (!plan) return;
    const slot = plan.slots.find(s => s.slot_index === slotIndex); if (!slot) return;
    const item = slot.recommendations.find(r => r.foodItemId === oldName); if (!item) return;
    const g = item.grams_raw;
    item.foodItemId = next.name;
    item.kcal = Math.round(next.kcal * g / 100);
    item.protein_g = +(next.protein_g * g / 100).toFixed(1);
    item.fat_g = +(next.fat_g * g / 100).toFixed(1);
    item.carb_g = +(next.carb_g * g / 100).toFixed(1);
    item.fiber_g = +(next.fiber_g * g / 100).toFixed(1);
    item.warnings = [];
    Store.save(state); renderPlan(); toast('Заменено: ' + next.name);
  }

  function ringHTML(label, target, current, unit) {
    const pct = Math.min(current / target * 100, 100);
    const r = 36, c = 2 * Math.PI * r, dash = c * pct / 100;
    const color = pct > 110 ? '#C25B3A' : pct > 85 ? '#3F5E48' : '#6F8E78';
    return '<div class="ring"><svg viewBox="0 0 88 88"><circle cx="44" cy="44" r="' + r + '" fill="none" stroke="#E8E2D5" stroke-width="6"/><circle cx="44" cy="44" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + dash + ' ' + c + '" transform="rotate(-90 44 44)"/><text x="44" y="48" text-anchor="middle" font-family="Fraunces,serif" font-size="13" fill="#1F2421">' + Math.round(pct) + '%</text></svg><div class="ring__num">' + Math.round(current) + '<small>/ ' + Math.round(target) + ' ' + (unit || '') + '</small></div><div class="ring__label">' + esc(label) + '</div></div>';
  }

  function dayTotals() {
    const today = new Date().toISOString().slice(0, 10);
    const entries = S.state.meals.filter(m => m.date === today);
    const t = { kcal: 0, protein_g: 0, fat_g: 0, carb_g: 0, fiber_g: 0, water: 0 };
    entries.forEach(e => {
      const f = findFood(e.food_item); if (!f) return;
      t.kcal += f.kcal * e.grams_raw / 100;
      t.protein_g += f.protein_g * e.grams_raw / 100;
      t.fat_g += f.fat_g * e.grams_raw / 100;
      t.carb_g += f.carb_g * e.grams_raw / 100;
      t.fiber_g += f.fiber_g * e.grams_raw / 100;
      if (f.name === 'Вода') t.water += e.grams_raw;
    });
    return t;
  }
  function slotName(n) { return { breakfast: 'Завтрак', lunch: 'Обед', snack: 'Полдник', dinner: 'Ужин' }[n] || n; }

  function renderWelcome() {
    const stage = $('#stage'); if (!stage) return;
    stage.innerHTML = '<div class="welcome">' +
      '<div class="welcome__eyebrow"><span></span> личный навигатор питания</div>' +
      '<h1 class="welcome__title">Перестаньте ломать голову <em>что приготовить</em></h1>' +
      '<p class="welcome__sub">Граммы, 4 приёма пищи и список покупок — за <em>30 секунд</em>. Без подписки. Без рекламы. С заботой о кишечнике.</p>' +
      '<div class="welcome__cta"><button class="btn btn--primary" data-screen-toggle="profile">Заполнить анкету →</button><button class="btn btn--ghost" data-screen-toggle="disclaimer">Прочитать дисклеймер</button></div>' +
      '<div class="welcome__steps">' +
      '<div class="welcome__step"><span class="welcome__step-num">1</span><strong>Анкета</strong>1 минута — возраст, вес, активность.</div>' +
      '<div class="welcome__step"><span class="welcome__step-num">2</span><strong>Продукты</strong>Что едите, что исключаете.</div>' +
      '<div class="welcome__step"><span class="welcome__step-num">3</span><strong>План</strong>Граммы на 4 приёма — по вашей фазе.</div>' +
      '</div></div>';
  }

  function renderToday() {
    const stage = $('#stage'); if (!stage) return;
    if (!S.state.profile) { renderWelcome(); return; }
    const t = S.state.targetToday;
    if (!t) { renderWelcome(); return; }
    const tt = dayTotals();
    const plan = S.state.plan || recommendDay(S.state, t);
    S.state.plan = plan; Store.save(S.state);
    const phaseSwitch = '<div style="display:flex;justify-content:flex-end;margin-bottom:14px"><div class="tabs" style="max-width:none"><button class="tab ' + (S.state.phase === 'remission' ? 'is-active' : '') + '" data-phase="remission">ремиссия</button><button class="tab ' + (S.state.phase === 'flare' ? 'is-active' : '') + '" data-phase="flare">обострение</button></div></div>';
    let mealBlock;
    if (plan.error) {
      mealBlock = '<div class="alert">' + esc(plan.error) + '<br><small>→ Откройте «Продукты» в меню слева.</small></div>' +
        '<div style="text-align:center;margin-top:14px"><button class="btn btn--primary" data-screen-toggle="foods">Добавить продукты →</button></div>';
    } else {
      const h = new Date().getHours();
      const next = h < 10 ? plan.slots[0] : h < 14 ? plan.slots[1] : h < 18 ? plan.slots[2] : plan.slots[3];
      mealBlock = '<div class="next-meal"><h3>Ближайший приём</h3>' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;margin:6px 0 12px"><span class="num" style="font-size:18px">' + slotName(next.slot_name) + '</span><small>≈ ' + Math.round(t.kcal_target * next.target_kcal_share / 100) + ' ккал</small></div>' +
        '<ul>' + next.recommendations.map(r => '<li><span class="serif">' + esc(r.foodItemId) + '</span><small class="mono">' + r.grams_raw + ' г сыр.</small></li>').join('') + '</ul></div>';
    }
    stage.innerHTML = phaseSwitch + '<div class="counters">' +
      ringHTML('ккал', t.kcal_target, tt.kcal, 'ккал') +
      ringHTML('белок', t.protein_g_target, tt.protein_g, 'г') +
      ringHTML('жиры', t.fat_g_target, tt.fat_g, 'г') +
      ringHTML('углеводы', t.carb_g_target, tt.carb_g, 'г') +
      ringHTML('клетчатка', t.fiber_g_target, tt.fiber_g, 'г') +
      ringHTML('вода', t.water_ml_target, tt.water, 'мл') + '</div>' + mealBlock +
      '<div class="cta-row">' +
      '<button class="btn btn--primary" data-screen-toggle="plan">Весь план →</button>' +
      '<button class="btn btn--ghost" data-screen-toggle="diary">Записать приём</button>' +
      '<button class="btn btn--ghost" data-screen-toggle="symptoms">Самочувствие</button></div>' +
      '<details class="why"><summary>Почему так</summary><p>BMR по Mifflin → Katch-McArdle → измеренному. Граммовки подбираются жадно по белку. Если цели недостижимы — мы скажем.</p></details>';
  }

  function renderPlan() {
    const stage = $('#stage'); if (!stage) return;
    const t = S.state.targetToday; const plan = S.state.plan;
    if (!t || !plan) return;
    if (plan.error) {
      stage.innerHTML = '<div class="card"><h2>План на день</h2><div class="alert">' + esc(plan.error) + '</div><button class="btn btn--primary" data-screen-toggle="foods">Добавить продукты →</button></div>';
      return;
    }
    stage.innerHTML = '<div class="card"><h2>План на день</h2>' +
      '<p class="muted">Граммы — сырой вес. Метод BMR: <strong>' + esc(plan.calc_method) + '</strong></p>' +
      '<div class="counters">' + ringHTML('ккал', t.kcal_target, plan.totals.kcal, 'ккал') +
      ringHTML('белок', t.protein_g_target, plan.totals.protein_g, 'г') +
      ringHTML('жиры', t.fat_g_target, plan.totals.fat_g, 'г') +
      ringHTML('углеводы', t.carb_g_target, plan.totals.carb_g, 'г') +
      ringHTML('клетчатка', t.fiber_g_target, plan.totals.fiber_g, 'г') + '</div></div>' +
      plan.slots.map(s => '<article class="meal"><div class="meal__head"><h3>' + slotName(s.slot_name) + '</h3><small>≈ ' + Math.round(t.kcal_target * s.target_kcal_share / 100) + ' ккал</small></div>' +
        '<div>' + s.recommendations.map(r => '<div class="meal__item">' +
          '<div><div class="meal__item-name serif">' + esc(r.foodItemId) + '</div>' +
          '<div class="meal__item-meta mono">' + r.grams_raw + ' г сыр. · ' + r.kcal + ' ккал · Б' + r.protein_g + ' Ж' + r.fat_g + ' У' + r.carb_g + ' · кл. ' + r.fiber_g + '</div>' +
          (r.warnings.length ? '<div class="warn">⚠ ' + r.warnings.map(w => esc(w.message)).join(' · ') + '</div>' : '') +
          '</div><div class="meal__item-actions">' +
          '<button data-replace="' + esc(r.foodItemId) + '" data-slot="' + s.slot_index + '">заменить</button>' +
          '<button data-log="' + esc(r.foodItemId) + '" data-grams="' + r.grams_raw + '" data-slot="' + s.slot_index + '">съела ✓</button>' +
          '</div></div>').join('') + '</div></article>').join('') +
      (plan.errors.length ? '<div class="alert">' + plan.errors.map(esc).join('<br>') + '</div>' : '') +
      '<div style="text-align:center;margin-top:20px"><button class="btn btn--ghost" data-action="regen-plan">Сформировать заново</button></div>';
  }

  function renderFoods() {
    const stage = $('#stage'); if (!stage) return;
    const allowed = S.state.foods || []; const forb = S.state.forbidden || [];
    stage.innerHTML = '<div class="card"><h2>Свои продукты</h2><p class="muted">Все данные на 100 г сырого веса. Найдите продукты в поиске.</p>' +
      '<input id="food-search" type="search" placeholder="Найти в справочнике…" style="width:100%;padding:12px 14px;border-radius:10px;border:1.5px solid var(--fog);background:var(--cream);font-size:15px">' +
      '<div id="food-search-results" class="search-results" hidden></div></div>' +
      '<div class="card"><h3>Разрешённые <span class="tiny" style="font-weight:normal">' + allowed.length + '</span></h3>' +
      (allowed.length ? '<ul class="chip-list">' + allowed.map(n => '<li>' + esc(n) + '<button data-tol="' + esc(n) + '">⚖</button><button data-rm="' + esc(n) + '">×</button></li>').join('') + '</ul>' : '<p class="muted">Пока пусто. Найдите продукт и нажмите «разрешить».</p>') + '</div>' +
      '<div class="card"><h3>Исключённые <span class="tiny" style="font-weight:normal">' + forb.length + '</span></h3>' +
      (forb.length ? '<ul class="chip-list">' + forb.map(n => '<li>' + esc(n) + '<button data-allow="' + esc(n) + '">↩</button></li>').join('') + '</ul>' : '<p class="muted">Список пуст.</p>') + '</div>';
  }

  function renderDiary() {
    const stage = $('#stage'); if (!stage) return;
    const today = new Date().toISOString().slice(0, 10);
    const entries = S.state.meals.filter(m => m.date === today); const tt = dayTotals();
    stage.innerHTML = '<div class="card"><h2>Дневник питания</h2>' +
      (entries.length ? '<ul class="log">' + entries.map(e => '<li><span class="serif">' + esc(e.food_item) + '</span> · ' + e.grams_raw + ' г <small>' + slotName(['breakfast', 'lunch', 'snack', 'dinner'][e.slot_index - 1]) + '</small></li>').join('') + '</ul>' +
        '<p class="muted small" style="margin-top:10px">Итого: ' + Math.round(tt.kcal) + ' ккал · Б' + Math.round(tt.protein_g) + ' Ж' + Math.round(tt.fat_g) + ' У' + Math.round(tt.carb_g) + ' · кл. ' + Math.round(tt.fiber_g) + '</p>' : '<p class="muted">Записей нет. Нажмите «съела ✓» в плане.</p>') + '</div>' +
      '<div class="card"><h3>Голосовое сообщение</h3><p class="muted small">Нажмите и говорите. Отпустите — сохранится.</p>' +
      '<button class="btn btn--primary" id="rec-btn">🎙 Записать</button><div id="rec-status" class="muted small" style="margin-top:10px"></div></div>' +
      '<div class="card"><h3>Загрузить файл</h3><p class="muted small">Фото, аудио, документы — до 10 МБ.</p>' +
      '<input id="upload-input" type="file" accept="image/*,audio/*,.pdf,.txt" style="display:block;margin-top:8px"><ul id="upload-list" class="log" style="margin-top:14px"></ul></div>';
    bindRecorder(); bindUpload();
  }

  function renderSymptoms() {
    const stage = $('#stage'); if (!stage) return;
    const last = S.state.symptoms.find(s => s.red_flag);
    stage.innerHTML = '<div class="card">' +
      (last ? '<div class="alert" style="background:rgba(194,91,58,.16);border-color:rgba(194,91,58,.4);border-left:4px solid #C25B3A;margin-bottom:14px"><strong>🚨 Запись, похожая на red-flag</strong><br>' + esc(last.note || last.all_types.join(', ')) + '<br><small class="muted">При крови, температуре, сильной боли — обратитесь к врачу.</small></div>' : '') +
      '<h2>Самочувствие</h2>' +
      '<form id="form-symptom" class="form"><fieldset><legend>Что беспокоит</legend><div class="chips">' +
      ['боль', 'вздутие', 'стул изменён', 'тошнота', 'кровь', 'температура', 'общая слабость', 'другое'].map(s =>
        '<label class="chip"><input type="checkbox" name="symptomType" value="' + s + '"><span>' + s + '</span></label>').join('') +
      '</div></fieldset><label>Тяжесть: <output id="sev-out">3</output> / 10<input type="range" name="severity" min="0" max="10" value="3" style="width:100%"></label>' +
      '<label>Когда появилось<input type="datetime-local" name="datetime"></label>' +
      '<label>Связь с едой<input type="text" name="relatedFood" placeholder="напр.: после гречки вечером"></label>' +
      '<label>Что-то ещё важное<textarea name="note" placeholder="о чём не спросили"></textarea></label>' +
      '<button class="btn btn--primary" type="submit">Записать</button></form>' +
      (S.state.symptoms.length ? '<h3>История</h3><ul class="log">' + S.state.symptoms.slice(0, 30).map(s => '<li class="' + (s.red_flag ? 'flag' : '') + '"><strong class="serif">' + s.all_types.map(esc).join(', ') + '</strong> · ' + s.severity + '/10<small>' + new Date(s.datetime).toLocaleString('ru-RU') + ' · фаза «' + s.phase + '»</small>' + (s.note ? '<small>' + esc(s.note) + '</small>' : '') + (s.related_foods ? '<small>🍽 ' + esc(s.related_foods) + '</small>' : '') + '</li>').join('') + '</ul>' : '') + '</div>';
  }

  function renderAnalytics(period) {
    const stage = $('#stage'); if (!stage) return;
    if (!S.state.meals.length) { stage.innerHTML = '<div class="card"><h2>Аналитика</h2><p class="muted">Недостаточно данных. Заполняйте дневники.</p></div>'; return; }
    const t = S.state.targetToday; const tt = dayTotals();
    const bars = [['ккал', t.kcal_target, tt.kcal], ['белок', t.protein_g_target, tt.protein_g], ['жиры', t.fat_g_target, tt.fat_g], ['углеводы', t.carb_g_target, tt.carb_g], ['клетч.', t.fiber_g_target, tt.fiber_g]];
    let barsHTML = '<div class="bars">' + bars.map(b => '<div class="bar" style="height:' + Math.min(b[2] / b[1] * 100, 110) + '%" data-label="' + b[0] + '"></div>').join('') + '</div>';
    if (period === 'week') {
      const days = []; const d = new Date();
      for (let i = 6; i >= 0; i--) { const x = new Date(d); x.setDate(x.getDate() - i); days.push({ date: x.toISOString().slice(0, 10), label: x.toLocaleDateString('ru-RU', { weekday: 'short' }), kcal: 0 }); }
      days.forEach(day => { S.state.meals.filter(m => m.date === day.date).forEach(e => { const f = findFood(e.food_item); if (f) day.kcal += f.kcal * e.grams_raw / 100; }); });
      barsHTML = '<div class="bars">' + days.map(d => '<div class="bar" style="height:' + Math.min(d.kcal / t.kcal_target * 100, 110) + '%" data-label="' + esc(d.label) + '"></div>').join('') + '</div>';
    }
    stage.innerHTML = '<div class="card"><h2>Аналитика</h2>' +
      '<div class="tabs"><button class="tab ' + (period === 'day' ? 'is-active' : '') + '" data-tab="day">День</button><button class="tab ' + (period === 'week' ? 'is-active' : '') + '" data-tab="week">Неделя</button></div>' +
      barsHTML + '<p class="muted small" style="margin-top:20px">Гипотезы — не доказано.</p></div>';
  }

  function renderSettings() {
    const stage = $('#stage'); if (!stage) return;
    const s = S.state.settings;
    stage.innerHTML = '<div class="card"><h2>Настройки</h2>' +
      '<form id="form-settings" class="form"><label>Приёмов пищи в день<input type="number" name="mealsPerDay" min="2" max="6" value="' + s.mealsPerDay + '"></label>' +
      '<fieldset><legend>Доли калорий по приёмам (Σ = 100)</legend><div class="row">' +
      '<input type="number" name="shareBreakfast" min="10" max="60" value="' + s.shares.breakfast + '" placeholder="Завтрак %">' +
      '<input type="number" name="shareLunch" min="10" max="60" value="' + s.shares.lunch + '" placeholder="Обед %">' +
      '<input type="number" name="shareSnack" min="5" max="40" value="' + s.shares.snack + '" placeholder="Полдник %">' +
      '<input type="number" name="shareDinner" min="10" max="60" value="' + s.shares.dinner + '" placeholder="Ужин %">' +
      '</div></fieldset><button class="btn btn--primary" type="submit">Сохранить</button></form></div>' +
      '<div class="card"><h3>Данные</h3><div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn--ghost" data-action="export">⬇ Экспорт</button>' +
      '<label class="btn btn--ghost" for="import-input" style="cursor:pointer">⬆ Импорт</label>' +
      '<input id="import-input" type="file" accept="application/json" style="display:none">' +
      '<button class="btn btn--small" data-action="reset" style="margin-left:auto;color:#C25B3A;border-color:rgba(194,91,58,.3)">Стереть всё</button></div></div>' +
      '<div class="card"><h3>Дисклеймер</h3><p class="muted">Информационный помощник. Не заменяет врача. Рекомендации — справочно. При крови, температуре, сильной боли — обратитесь к врачу.</p></div>';
  }

  function renderProfile() {
    const stage = $('#stage'); if (!stage) return;
    stage.innerHTML = '<div class="card"><h2><em>1.</em> Анкета</h2><p class="muted">Соберём базу — потом менять можно в любой момент.</p>' +
      '<form id="form-profile" class="form"><div class="row"><label>Пол<select name="sex"><option value="f">женский</option><option value="m">мужской</option></select></label><label>Возраст, лет<input type="number" name="age" min="1" max="120" required></label><label>Рост, см<input type="number" name="heightCm" min="50" max="250" required></label><label>Вес, кг<input type="number" name="weightKg" min="20" max="400" step="0.1" required></label></div><div class="row"><label>% жира (опц.)<input type="number" name="bodyFatPct" min="3" max="60" step="0.1"></label><label>Измеренный BMR (опц.)<input type="number" name="measuredBmrKcal" min="800" max="4000"></label></div>' +
      '<fieldset><legend>Активность</legend><div class="chips"><label class="chip"><input type="radio" name="activityLevel" value="sedentary" required><span>сидячая</span></label><label class="chip"><input type="radio" name="activityLevel" value="light"><span>лёгкая</span></label><label class="chip"><input type="radio" name="activityLevel" value="moderate" checked><span>умеренная</span></label><label class="chip"><input type="radio" name="activityLevel" value="high"><span>высокая</span></label><label class="chip"><input type="radio" name="activityLevel" value="vhigh"><span>очень высокая</span></label></div></fieldset>' +
      '<fieldset><legend>Цель</legend><div class="chips"><label class="chip"><input type="radio" name="goal" value="maintain" checked><span>поддержание</span></label><label class="chip"><input type="radio" name="goal" value="lose"><span>мягкое снижение</span></label><label class="chip"><input type="radio" name="goal" value="gain"><span>набор массы</span></label></div></fieldset>' +
      '<label>Приёмов пищи в день<input type="number" name="mealsPerDay" min="2" max="6" value="4"></label>' +
      '<button class="btn btn--primary" type="submit">Дальше → здоровье</button></form></div>';
  }

  function renderHealth() {
    const stage = $('#stage'); if (!stage) return;
    stage.innerHTML = '<div class="card"><h2><em>2.</em> Здоровье</h2><p class="muted">Эта фаза меняет рекомендации: что щадить, а что исключить.</p>' +
      '<form id="form-health" class="form"><fieldset><legend>Текущая фаза</legend><div class="phase-toggle"><label class="phase"><input type="radio" name="phase" value="remission" checked><span>Ремиссия</span></label><label class="phase phase--warn"><input type="radio" name="phase" value="flare"><span>Обострение</span></label></div></fieldset>' +
      '<label>Диагнозы (через запятую)<input type="text" name="diagnoses" placeholder="напр.: бактериальный колит"></label>' +
      '<label>Аллергии<input type="text" name="allergies" placeholder="напр.: орехи, мёд"></label>' +
      '<label>Непереносимости<input type="text" name="intolerances" placeholder="напр.: лактоза, глютен"></label>' +
      '<label>Что-то важное, о чём не спросили<textarea name="free" rows="2" placeholder="напр.: непереносимость бобовых"></textarea></label>' +
      '<button class="btn btn--primary" type="submit">Дальше → продукты</button></form></div>';
  }

  function renderDisclaimer() {
    const stage = $('#stage'); if (!stage) return;
    stage.innerHTML = '<div class="card"><h2>Важно</h2><p><strong>Навигатор питания</strong> — информационный помощник. Не ставит диагнозы, не назначает лечение, не заменяет врача. Рекомендации — справочно. При крови, температуре, сильной боли — обратитесь к врачу.</p></div>';
  }

  function refreshScreen(name) {
    const stage = $('#stage'); if (!stage) return;
    if (name === 'today') renderToday();
    else if (name === 'plan') renderPlan();
    else if (name === 'foods') renderFoods();
    else if (name === 'diary') renderDiary();
    else if (name === 'symptoms') renderSymptoms();
    else if (name === 'analytics') renderAnalytics('day');
    else if (name === 'settings') renderSettings();
    else if (name === 'profile') renderProfile();
    else if (name === 'health') renderHealth();
    else if (name === 'disclaimer') renderDisclaimer();
  }

  function bindRecorder() {
    const btn = $('#rec-btn'); const status = $('#rec-status'); if (!btn) return;
    let rec = null, chunks = [];
    btn.addEventListener('click', async () => {
      if (rec) { rec.stop(); return; }
      if (!navigator.mediaDevices || !window.MediaRecorder) { status.textContent = 'Не поддерживается.'; return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        rec = new MediaRecorder(stream); chunks = [];
        rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
        rec.onstop = () => {
          const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
          const url = URL.createObjectURL(blob);
          status.innerHTML = '<audio controls src="' + url + '" style="width:100%;margin-top:8px"></audio><br><small>Готово.</small>';
          stream.getTracks().forEach(t => t.stop()); rec = null;
        };
        rec.start(); status.textContent = 'Идёт запись… нажмите, чтобы остановить'; btn.textContent = '⏹ Стоп';
      } catch (e) { status.textContent = 'Нет доступа к микрофону.'; }
    });
  }

  function bindUpload() {
    const input = $('#upload-input'); if (!input) return;
    input.addEventListener('change', e => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      if (f.size > 10 * 1024 * 1024) return toast('Файл больше 10 МБ');
      const blobUrl = URL.createObjectURL(f);
      const list = $('#upload-list');
      const li = document.createElement('li'); li.className = 'upload-list__item';
      if (f.type.startsWith('image/')) li.innerHTML = '<img src="' + blobUrl + '" alt="">' + esc(f.name);
      else if (f.type.startsWith('audio/')) li.innerHTML = '<audio controls src="' + blobUrl + '"></audio>' + esc(f.name);
      else li.innerHTML = '<a href="' + blobUrl + '" target="_blank" rel="noopener">' + esc(f.name) + '</a>';
      list.appendChild(li); toast('«' + f.name + '» загружен');
    });
  }

  function paintRibbon() { const r = $('#ribbon'); if (r) r.hidden = !!S.state.ribbonHidden; }
  let toastTimer;
  function toast(msg) { const el = $('#toast'); if (!el) return; el.textContent = msg; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2500); }
  function refreshToday() { if (S.current === 'today') renderToday(); }
  function refreshAll() { refreshScreen(S.current); }

  document.addEventListener('DOMContentLoaded', () => S.init());
})();

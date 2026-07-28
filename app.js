// Навигатор питания — основной модуль
(() => {
  'use strict';

  // ========== Хранилище ==========
  const STORE_KEY = 'np.v1';
  const Store = {
    load() {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        return raw ? JSON.parse(raw) : defaultState();
      } catch (e) {
        return defaultState();
      }
    },
    save(s) {
      localStorage.setItem(STORE_KEY, JSON.stringify(s));
    }
  };

  function defaultState() {
    return {
      profile: null,
      health: null,
      phase: 'remission',
      foods: [],
      forbidden: [],
      tolerances: {},
      targetToday: null,
      plan: null,
      meals: [],
      symptoms: [],
      settings: {
        mealsPerDay: 4,
        shares: { breakfast: 27, lunch: 33, snack: 12, dinner: 28 },
        notif: { meals: true, symptoms: true, diary: true }
      },
      ribbonHidden: false,
      onboardingDone: false
    };
  }

  // ========== Утилиты ==========
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  // ========== Калькулятор целей ==========
  const ACTIVITY_FACTOR = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725, vhigh: 1.9
  };
  const GOAL_DELTA = { maintain: 0, lose: -0.1, gain: 0.1 };

  function calcBMR(p) {
    if (p.measuredBmrKcal) return { bmr: p.measuredBmrKcal, method: 'измеренный' };
    if (p.bodyFatPct) {
      const lbm = p.weightKg * (1 - p.bodyFatPct / 100);
      return { bmr: 370 + 21.6 * lbm, method: 'Katch-McArdle' };
    }
    const s = p.sex === 'm' ? 5 : -161;
    return {
      bmr: 10 * p.weightKg + 6.25 * p.heightCm + s - 5 * p.age,
      method: 'Mifflin-St Jeor'
    };
  }

  function calcTargets(profile, phase) {
    if (!profile) return null;
    const phaseNorm = phase || 'remission';
    const { bmr, method } = calcBMR(profile);
    const tdee = bmr * ACTIVITY_FACTOR[profile.activityLevel] * (1 + (GOAL_DELTA[profile.goal] || 0));
    const proteinPerKg = phaseNorm === 'flare' ? 1.3 : 1.0;
    const protein_g_target = Math.min(profile.weightKg * proteinPerKg, tdee * 0.35 / 4);
    const fatPct = phaseNorm === 'flare' ? 0.25 : 0.30;
    const fat_g_target = (tdee * fatPct) / 9;
    const carbKcal = Math.max(tdee - protein_g_target * 4 - fat_g_target * 9, 0);
    const carb_g_target = carbKcal / 4;
    const fiber_g_target = phaseNorm === 'flare'
      ? Math.min((tdee / 1000) * 8, 14)
      : (tdee / 1000) * 14;
    return {
      kcal_target: Math.round(tdee),
      protein_g_target: Math.round(protein_g_target),
      fat_g_target: Math.round(fat_g_target),
      carb_g_target: Math.round(carb_g_target),
      fiber_g_target: Math.round(fiber_g_target),
      water_ml_target: phaseNorm === 'flare' ? 2500 : 2000,
      sodium_mg_limit: 2300,
      sugar_g_limit: Math.round((tdee * 0.10) / 4),
      calc_method: method
    };
  }

  function allFoods() {
    return window.SEED_FOODS || [];
  }

  function findFood(name) {
    return allFoods().find((f) => f.name === name);
  }

  // ========== Планировщик дня ==========
  function recommendDay(state, targets) {
    if (!targets) return { error: 'Сначала заполните анкету.' };
    if (!state.foods || state.foods.length < 3) return { error: 'Добавьте хотя бы 3 разрешённых продукта.' };
    const tol = state.tolerances || {};
    const forbidden = new Set(state.forbidden || []);
    const candidates = state.foods
      .map(findFood)
      .filter(Boolean)
      .filter((f) => !forbidden.has(f.name))
      .filter((f) => tol[f.name] !== 'not_suits' && tol[f.name] !== 'causes_symptoms')
      .filter((f) => {
        if (state.phase !== 'flare') return true;
        const ir = f.irritants || [];
        if (ir.includes('insoluble_fiber')) return false;
        if (ir.includes('fat') && f.fat_g >= 15) return false;
        if (ir.includes('caffeine')) return false;
        if (ir.includes('spicy')) return false;
        return true;
      });

    if (candidates.length < 3) return { error: 'Подходящих продуктов мало. Расширьте список разрешённых.' };

    const sorted = [...candidates].sort((a, b) => (b.protein_g * 4 - (b.irritants || []).includes('fat') * 2) - (a.protein_g * 4 - (a.irritants || []).includes('fat') * 2));

    const picks = new Map();
    let p = 0, f = 0, c = 0, fi = 0, k = 0;

    function add(food, g) {
      const cur = picks.get(food.name) || 0;
      picks.set(food.name, cur + g);
      p += food.protein_g * g / 100;
      f += food.fat_g * g / 100;
      c += food.carb_g * g / 100;
      fi += food.fiber_g * g / 100;
      k += food.kcal * g / 100;
    }

    for (const food of sorted) {
      if (p >= targets.protein_g_target * 0.9) break;
      if (picks.has(food.name)) continue;
      const need = (targets.protein_g_target - p) * 100 / Math.max(food.protein_g, 1);
      const g = Math.max(20, Math.min(200, Math.round(need / 5) * 5));
      add(food, g);
    }
    const filler = [...candidates].sort((a, b) => (b.fat_g + b.carb_g) - (a.fat_g + a.carb_g));
    for (const food of filler) {
      if (f >= targets.fat_g_target * 0.9 && c >= targets.carb_g_target * 0.9) break;
      if (picks.has(food.name)) continue;
      add(food, 80);
    }
    if (fi < targets.fiber_g_target * 0.8) {
      const sol = candidates.find((x) => x.fiber_type === 'soluble' && !picks.has(x.name));
      if (sol) add(sol, 100);
    }

    const shares = state.settings.shares || { breakfast: 27, lunch: 33, snack: 12, dinner: 28 };
    const sumShare = Object.values(shares).reduce((a, b) => a + b, 0) || 100;
    const slots = ['breakfast', 'lunch', 'snack', 'dinner'].map((name, i) => ({
      slot_index: i + 1, slot_name: name,
      target_kcal_share: shares[name] / sumShare * 100,
      recommendations: [], warnings: []
    }));

    const totalKcal = k || 1;
    const items = [];
    picks.forEach((grams, name) => {
      const food = findFood(name);
      if (food) items.push({ food, grams });
    });
    items.forEach((it) => {
      const food = it.food;
      const kcal = food.kcal * it.grams / 100;
      const weight = kcal / totalKcal;
      let acc = 0;
      for (const s of slots) {
        acc += s.target_kcal_share / 100;
        if (weight <= acc || s === slots[slots.length - 1]) {
          s.recommendations.push({
            foodItemId: food.name, grams_raw: it.grams,
            kcal: Math.round(kcal),
            protein_g: +(food.protein_g * it.grams / 100).toFixed(1),
            fat_g: +(food.fat_g * it.grams / 100).toFixed(1),
            carb_g: +(food.carb_g * it.grams / 100).toFixed(1),
            fiber_g: +(food.fiber_g * it.grams / 100).toFixed(1),
            warnings: []
          });
          break;
        }
      }
    });

    slots.forEach((s, i) => {
      s.recommendations.forEach((r) => {
        const food = findFood(r.foodItemId);
        if (!food) return;
        const ir = food.irritants || [];
        if (state.phase === 'flare') {
          if (ir.includes('fat')) r.warnings.push({ severity: 'warning', message: 'Жирное в обострении — наблюдайте за реакцией.' });
          if (ir.includes('insoluble_fiber')) r.warnings.push({ severity: 'warning', message: 'Грубая клетчатка — в обострении осторожно.' });
          if (ir.includes('caffeine')) r.warnings.push({ severity: 'warning', message: 'Кофеин может раздражать ЖКТ.' });
        }
        if (i === 3 && ir.includes('fat')) r.warnings.push({ severity: 'info', message: 'Жирное на ночь — нежелательно.' });
      });
    });

    const totals = {
      kcal: Math.round(k), protein_g: Math.round(p),
      fat_g: Math.round(f), carb_g: Math.round(c), fiber_g: Math.round(fi)
    };
    const errors = [];
    if (k < targets.kcal_target * 0.7) errors.push('Калорий мало. Расширьте список продуктов.');
    if (p < targets.protein_g_target * 0.7) errors.push('Белка мало. Добавьте белковых продуктов.');

    return { slots, totals, errors, calc_method: targets.calc_method };
  }

  // ========== Состояние ==========
  const S = {
    state: Store.load(),
    current: 'today',
    init() {
      this.state.targetToday = calcTargets(this.state.profile, this.state.phase);
      if (!this.state.onboardingDone) {
        showHero();
      } else {
        hideHero();
        showApp();
      }
      paintRibbon();
      bindEvents();
      refreshAll();
    },
    go(name) {
      this.current = name;
      $$('.screen').forEach((el) => {
        el.hidden = el.dataset.screen !== name;
      });
      $$('.dock__btn').forEach((b) => {
        b.classList.toggle('is-active', b.dataset.screenToggle === name);
      });
      $$('[data-screen]').forEach((el) => {
        const match = el.dataset.screen === name;
        if (el.tagName === 'SECTION') el.hidden = !match;
      });
      refreshScreen(name);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ========== UI ==========
  function showHero() {
    $('.hero').hidden = false;
    $('.shell').hidden = true;
    $('.stage').hidden = true;
    $('.dock').hidden = true;
  }
  function hideHero() {
    $('.hero').hidden = true;
    $('.shell').hidden = false;
    $('.stage').hidden = false;
    $('.dock').hidden = false;
  }
  function showApp() { hideHero(); }

  // ========== Обработчики ==========
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

    if (a === 'start') {
      S.state.onboardingDone = true;
      Store.save(S.state);
      hideHero();
      showApp();
      if (!S.state.profile) S.go('profile');
      else if (!S.state.health) S.go('health');
      else if ((S.state.foods || []).length < 3) S.go('foods');
      else S.go('today');
      return;
    }
    if (a === 'open-disclaimer') { S.go('disclaimer'); return; }
    if (a === 'hide-ribbon') {
      S.state.ribbonHidden = true;
      Store.save(S.state);
      $('#ribbon').hidden = true;
      return;
    }
    if (a === 'open-day-plan') { S.go('plan'); return; }
    if (a === 'open-diary') { S.go('diary'); return; }
    if (a === 'open-symptoms') { S.go('symptoms'); return; }
    if (a === 'regen-plan') { S.state.plan = recommendDay(S.state, S.state.targetToday); Store.save(S.state); renderPlan(); return; }
    if (a === 'phase') {
      const phase = t.dataset.phase;
      S.state.phase = phase;
      S.state.targetToday = calcTargets(S.state.profile, phase);
      Store.save(S.state);
      $$('[data-phase]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.phase === phase)));
      refreshToday();
      return;
    }
    if (a === 'speech') {
      e.preventDefault();
      const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Rec) { toast('Голосовой ввод не поддерживается. Пишите текстом.'); return; }
      const t2 = t.closest('label');
      const ta = (t2 && t2.querySelector('textarea')) || document.querySelector('textarea:focus') || document.querySelector('textarea');
      if (!ta) return;
      const r = new Rec();
      r.lang = 'ru-RU'; r.interimResults = true;
      r.onresult = (ev) => {
        let txt = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) txt += ev.results[i][0].transcript;
        ta.value = (ta.value ? ta.value + ' ' : '') + txt;
      };
      r.onerror = (ev) => toast('Не удалось распознать: ' + ev.error);
      r.start();
      toast('Слушаю… говорите');
      return;
    }
    if (a === 'export') {
      const out = { meta: { app: 'Навигатор питания', exported_at: new Date().toISOString() }, data: S.state };
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'navigator-pitaniya-' + new Date().toISOString().slice(0, 10) + '.json';
      link.click();
      URL.revokeObjectURL(url);
      toast('Файл сохранён');
      return;
    }
    if (a === 'reset') {
      if (confirm('Стереть все локальные данные?')) { localStorage.removeItem(STORE_KEY); location.reload(); }
      return;
    }

    const screen = t.dataset.screenToggle;
    if (screen) {
      const map = { today: 'today', plan: 'plan', foods: 'foods', diary: 'diary', more: 'settings', symptoms: 'symptoms', settings: 'settings' };
      S.go(map[screen] || screen);
      return;
    }

    const phase = t.dataset.phase;
    if (phase) {
      S.state.phase = phase;
      S.state.targetToday = calcTargets(S.state.profile, phase);
      Store.save(S.state);
      $$('[data-phase]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.phase === phase)));
      refreshToday();
      return;
    }

    const tab = t.dataset.tab;
    if (tab) {
      $$('[data-tab]').forEach((x) => x.classList.toggle('is-active', x === t));
      refreshAnalytics(tab);
      return;
    }

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
      if (!q) { box.hidden = true; return; }
      const res = allFoods().filter((f) => f.name.toLowerCase().includes(q)).slice(0, 8);
      box.hidden = false;
      box.innerHTML = res.map((f) => (
        '<div class="search-results__item">' +
          '<div><strong>' + esc(f.name) + '</strong>' +
            '<small>' + f.kcal + ' ккал · Б' + f.protein_g + ' Ж' + f.fat_g + ' У' + f.carb_g + ' · клетч. ' + f.fiber_g + ' г</small></div>' +
          '<div style="display:flex;gap:6px">' +
            '<button class="btn btn--ghost btn--small" data-allow="' + esc(f.name) + '">разрешить</button>' +
            '<button class="btn btn--small" data-forbid="' + esc(f.name) + '" style="border-color:rgba(194,91,58,.3);color:#C25B3A">исключить</button>' +
          '</div>' +
        '</div>'
      )).join('');
    }
  }

  function onChange(e) {
    if (e.target.id === 'import-input') {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (!parsed.data) throw new Error('Не похоже на бэкап');
          S.state = Object.assign(defaultState(), parsed.data);
          Store.save(S.state);
          toast('Импортировано');
          refreshAll();
          S.go('today');
        } catch (err) { toast('Ошибка: ' + err.message); }
      };
      reader.readAsText(f);
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

  // ========== Сохранение форм ==========
  function saveProfile(form) {
    const fd = new FormData(form);
    const p = {
      sex: fd.get('sex'),
      age: +fd.get('age'),
      heightCm: +fd.get('heightCm'),
      weightKg: +fd.get('weightKg'),
      bodyFatPct: fd.get('bodyFatPct') ? +fd.get('bodyFatPct') : null,
      measuredBmrKcal: fd.get('measuredBmrKcal') ? +fd.get('measuredBmrKcal') : null,
      activityLevel: fd.get('activityLevel'),
      goal: fd.get('goal'),
      mealsPerDay: +fd.get('mealsPerDay') || 4
    };
    if (p.age < 1 || p.age > 120) return toast('Возраст: 1–120');
    if (p.heightCm < 50 || p.heightCm > 250) return toast('Рост: 50–250 см');
    if (p.weightKg < 20 || p.weightKg > 400) return toast('Вес: 20–400 кг');
    S.state.profile = p;
    S.state.targetToday = calcTargets(p, S.state.phase);
    Store.save(S.state);
    toast('Анкета сохранена');
    S.go('health');
  }

  function saveHealth(form) {
    const fd = new FormData(form);
    S.state.health = {
      phase: fd.get('phase'),
      diagnoses: (fd.get('diagnoses') || '').toString().split(',').map((s) => s.trim()).filter(Boolean),
      allergies: (fd.get('allergies') || '').toString().split(',').map((s) => s.trim()).filter(Boolean),
      intolerances: (fd.get('intolerances') || '').toString().split(',').map((s) => s.trim()).filter(Boolean),
      free: fd.get('free') || ''
    };
    S.state.phase = S.state.health.phase;
    S.state.targetToday = calcTargets(S.state.profile, S.state.phase);
    Store.save(S.state);
    toast('Здоровье сохранено');
    refreshToday();
    S.go('foods');
  }

  function saveSymptom(form) {
    const fd = new FormData(form);
    const types = $$('[name=symptomType]:checked', form).map((i) => i.value);
    if (types.length === 0) return toast('Выберите симптом');
    const severity = +fd.get('severity');
    const isRed = types.includes('blood') || types.includes('fever') || severity >= 8 || (types.includes('pain') && severity >= 6);
    const entry = {
      id: 'sym-' + Date.now(),
      datetime: fd.get('datetime') || new Date().toISOString().slice(0, 16),
      all_types: types,
      severity: severity,
      phase: S.state.phase,
      related_foods: fd.get('relatedFood') || '',
      note: fd.get('note') || '',
      red_flag: isRed
    };
    S.state.symptoms.unshift(entry);
    Store.save(S.state);
    toast(isRed ? '🚨 Записано. Похоже на red-flag — обратитесь к врачу.' : 'Записано');
    renderSymptoms();
    form.reset();
  }

  function saveSettings(form) {
    const fd = new FormData(form);
    const shares = {
      breakfast: +fd.get('shareBreakfast'),
      lunch: +fd.get('shareLunch'),
      snack: +fd.get('shareSnack'),
      dinner: +fd.get('shareDinner')
    };
    const sum = shares.breakfast + shares.lunch + shares.snack + shares.dinner;
    if (Math.abs(sum - 100) > 4) return toast('Σ ' + sum + '% (должно быть 100±2)');
    S.state.settings.mealsPerDay = +fd.get('mealsPerDay') || 4;
    S.state.settings.shares = shares;
    Store.save(S.state);
    toast('Сохранено');
  }

  // ========== Продукты ==========
  function addAllowed(name) {
    S.state.forbidden = (S.state.forbidden || []).filter((n) => n !== name);
    if (!S.state.foods.includes(name)) S.state.foods.push(name);
    Store.save(S.state);
    renderFoods();
    refreshToday();
    toast('«' + name + '» в разрешённых');
  }
  function addForbidden(name) {
    S.state.foods = (S.state.foods || []).filter((n) => n !== name);
    S.state.forbidden = S.state.forbidden || [];
    if (!S.state.forbidden.includes(name)) S.state.forbidden.push(name);
    Store.save(S.state);
    renderFoods();
    refreshToday();
    toast('«' + name + '» исключён');
  }
  function removeAllowed(name) {
    S.state.foods = S.state.foods.filter((n) => n !== name);
    Store.save(S.state);
    renderFoods();
  }
  function cycleTolerance(name) {
    const cycle = ['unknown', 'suits', 'not_suits', 'causes_symptoms'];
    const cur = S.state.tolerances[name] || 'unknown';
    const next = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
    S.state.tolerances[name] = next;
    Store.save(S.state);
    renderFoods();
    toast('«' + name + '»: ' + { suits: '👍', not_suits: '👎', causes_symptoms: '⚠️', unknown: '?' }[next]);
  }

  // ========== План ==========
  function logMeal(slotIndex, foodName, grams) {
    const entry = {
      id: 'me-' + Date.now(),
      date: new Date().toISOString().slice(0, 10),
      slot_index: slotIndex,
      food_item: foodName,
      grams_raw: grams,
      deviation: 'as_planned'
    };
    S.state.meals.push(entry);
    Store.save(S.state);
    refreshToday();
    toast('Записано: ' + foodName + ' ' + grams + ' г');
  }

  function doReplace(slotIndex, oldName) {
    const state = S.state;
    const candidates = state.foods
      .map(findFood)
      .filter((f) => f && f.name !== oldName)
      .filter((f) => state.tolerances[f.name] !== 'not_suits' && state.tolerances[f.name] !== 'causes_symptoms');
    if (!candidates.length) return toast('Нет замен.');
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    const plan = state.plan;
    if (!plan) return;
    const slot = plan.slots.find((s) => s.slot_index === slotIndex);
    if (!slot) return;
    const item = slot.recommendations.find((r) => r.foodItemId === oldName);
    if (!item) return;
    const g = item.grams_raw;
    item.foodItemId = next.name;
    item.kcal = Math.round(next.kcal * g / 100);
    item.protein_g = +(next.protein_g * g / 100).toFixed(1);
    item.fat_g = +(next.fat_g * g / 100).toFixed(1);
    item.carb_g = +(next.carb_g * g / 100).toFixed(1);
    item.fiber_g = +(next.fiber_g * g / 100).toFixed(1);
    item.warnings = [];
    Store.save(state);
    renderPlan();
    toast('Заменено: ' + next.name);
  }

  // ========== Рендер экранов ==========
  function ringHTML(label, target, current, unit) {
    const pct = Math.min(current / target * 100, 100);
    const r = 36, c = 2 * Math.PI * r, dash = c * pct / 100;
    const color = pct > 110 ? '#C25B3A' : pct > 85 ? '#3F5E48' : '#6F8E78';
    return (
      '<div class="ring">' +
        '<svg viewBox="0 0 88 88"><circle cx="44" cy="44" r="' + r + '" fill="none" stroke="#E8E2D5" stroke-width="6"/>' +
        '<circle cx="44" cy="44" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="6" stroke-linecap="round" ' +
        'stroke-dasharray="' + dash + ' ' + c + '" transform="rotate(-90 44 44)"/>' +
        '<text x="44" y="48" text-anchor="middle" font-family="Fraunces,serif" font-size="13" fill="#1F2421">' + Math.round(pct) + '%</text></svg>' +
        '<div class="ring__num">' + Math.round(current) + '<small>/ ' + Math.round(target) + ' ' + (unit || '') + '</small></div>' +
        '<div class="ring__label">' + esc(label) + '</div>' +
      '</div>'
    );
  }

  function dayTotals() {
    const today = new Date().toISOString().slice(0, 10);
    const entries = S.state.meals.filter((m) => m.date === today);
    const t = { kcal: 0, protein_g: 0, fat_g: 0, carb_g: 0, fiber_g: 0, water: 0 };
    entries.forEach((e) => {
      const f = findFood(e.food_item);
      if (!f) return;
      t.kcal += f.kcal * e.grams_raw / 100;
      t.protein_g += f.protein_g * e.grams_raw / 100;
      t.fat_g += f.fat_g * e.grams_raw / 100;
      t.carb_g += f.carb_g * e.grams_raw / 100;
      t.fiber_g += f.fiber_g * e.grams_raw / 100;
      if (f.name === 'Вода') t.water += e.grams_raw;
    });
    return t;
  }

  function slotName(name) {
    return { breakfast: 'Завтрак', lunch: 'Обед', snack: 'Полдник', dinner: 'Ужин' }[name] || name;
  }

  function renderToday() {
    const stage = $('#stage');
    if (!stage) return;
    const t = S.state.targetToday;
    if (!t) {
      stage.innerHTML = '<div class="section"><div class="card"><h2><em>1.</em> Начнём с анкеты</h2><p class="muted">Это займёт меньше минуты. Без регистрации и серверов.</p><button class="btn btn--primary" data-screen-toggle="profile">Заполнить анкету →</button></div></div>';
      return;
    }
    const tt = dayTotals();
    const plan = S.state.plan || recommendDay(S.state, t);
    S.state.plan = plan;
    Store.save(S.state);

    const phaseSwitch = '<div style="display:flex;justify-content:center;margin-bottom:24px"><div class="tabs">' +
      '<button class="tab ' + (S.state.phase === 'remission' ? 'is-active' : '') + '" data-phase="remission">ремиссия</button>' +
      '<button class="tab ' + (S.state.phase === 'flare' ? 'is-active' : '') + '" data-phase="flare">обострение</button>' +
      '</div></div>';

    let mealBlock = '';
    if (plan.error) {
      mealBlock = '<div class="alert">' + esc(plan.error) + '<br><small>→ Откройте раздел «Продукты» и добавьте ещё.</small></div>' +
        '<div style="text-align:center;margin-top:16px"><button class="btn btn--primary" data-screen-toggle="foods">Добавить продукты →</button></div>';
    } else {
      const h = new Date().getHours();
      const next = h < 10 ? plan.slots[0] : h < 14 ? plan.slots[1] : h < 18 ? plan.slots[2] : plan.slots[3];
      mealBlock = '<div class="next-meal">' +
        '<h3 class="serif">Ближайший приём</h3>' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;margin:8px 0 16px"><span class="num" style="font-size:24px">' + slotName(next.slot_name) + '</span><small>≈ ' + Math.round(t.kcal_target * next.target_kcal_share / 100) + ' ккал</small></div>' +
        '<ul>' + next.recommendations.map((r) =>
          '<li><span class="serif">' + esc(r.foodItemId) + '</span><small class="mono">' + r.grams_raw + ' г сыр.</small></li>'
        ).join('') + '</ul></div>';
    }

    stage.innerHTML =
      phaseSwitch +
      '<div class="counters">' +
        ringHTML('ккал', t.kcal_target, tt.kcal, 'ккал') +
        ringHTML('белок', t.protein_g_target, tt.protein_g, 'г') +
        ringHTML('жиры', t.fat_g_target, tt.fat_g, 'г') +
        ringHTML('углеводы', t.carb_g_target, tt.carb_g, 'г') +
        ringHTML('клетчатка', t.fiber_g_target, tt.fiber_g, 'г') +
        ringHTML('вода', t.water_ml_target, tt.water, 'мл') +
      '</div>' +
      mealBlock +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:32px">' +
        '<button class="btn btn--primary" data-screen-toggle="plan">Весь план на день →</button>' +
        '<button class="btn btn--ghost" data-screen-toggle="diary">Записать приём</button>' +
        '<button class="btn btn--ghost" data-screen-toggle="symptoms">Самочувствие</button>' +
      '</div>' +
      '<details class="why"><summary>Почему так</summary>' +
        '<p>BMR по Mifflin-St Jeor → Katch-McArdle → измеренному. Граммовки подбираются жадно по белку с приоритетом щадящих продуктов и вашей переносимости. Клетчатка, соль, сахар ограничиваются по фазе. Если цели недостижимы — мы честно скажем.</p>' +
      '</details>';
  }

  function renderPlan() {
    const stage = $('#stage');
    const t = S.state.targetToday;
    const plan = S.state.plan;
    if (!stage || !t || !plan) return;
    if (plan.error) {
      stage.innerHTML = '<div class="section"><div class="card"><h2>План на день</h2><div class="alert">' + esc(plan.error) + '</div><button class="btn btn--primary" data-screen-toggle="foods">Добавить продукты →</button></div></div>';
      return;
    }
    stage.innerHTML = '<div class="section">' +
      '<div class="card"><h2>План на день</h2>' +
      '<p class="muted">Граммы — сырой вес. Метод BMR: <strong>' + esc(plan.calc_method) + '</strong></p>' +
      '<div class="counters">' +
        ringHTML('ккал', t.kcal_target, plan.totals.kcal, 'ккал') +
        ringHTML('белок', t.protein_g_target, plan.totals.protein_g, 'г') +
        ringHTML('жиры', t.fat_g_target, plan.totals.fat_g, 'г') +
        ringHTML('углеводы', t.carb_g_target, plan.totals.carb_g, 'г') +
        ringHTML('клетчатка', t.fiber_g_target, plan.totals.fiber_g, 'г') +
      '</div></div>' +
      plan.slots.map((s) => (
        '<article class="meal">' +
          '<div class="meal__head"><h3>' + slotName(s.slot_name) + '</h3><small>≈ ' + Math.round(t.kcal_target * s.target_kcal_share / 100) + ' ккал</small></div>' +
          '<div>' +
            s.recommendations.map((r) => (
              '<div class="meal__item">' +
                '<div><div class="meal__item-name serif">' + esc(r.foodItemId) + '</div>' +
                '<div class="meal__item-meta mono">' + r.grams_raw + ' г сыр. · ' + r.kcal + ' ккал · Б' + r.protein_g + ' Ж' + r.fat_g + ' У' + r.carb_g + ' · кл. ' + r.fiber_g + '</div>' +
                (r.warnings.length ? '<div class="warn">⚠ ' + r.warnings.map((w) => esc(w.message)).join(' · ') + '</div>' : '') +
                '</div>' +
                '<div class="meal__item-actions">' +
                  '<button data-replace="' + esc(r.foodItemId) + '" data-slot="' + s.slot_index + '">заменить</button>' +
                  '<button data-log="' + esc(r.foodItemId) + '" data-grams="' + r.grams_raw + '" data-slot="' + s.slot_index + '">съела ✓</button>' +
                '</div>' +
              '</div>'
            )).join('') +
          '</div></article>'
      )).join('') +
      (plan.errors.length ? '<div class="alert">' + plan.errors.map(esc).join('<br>') + '</div>' : '') +
      '<div style="text-align:center;margin-top:24px"><button class="btn btn--ghost" data-action="regen-plan">Сформировать заново</button></div>' +
      '</div>';
  }

  function renderFoods() {
    const stage = $('#stage');
    if (!stage) return;
    const allowed = S.state.foods || [];
    const forb = S.state.forbidden || [];
    stage.innerHTML = '<div class="section">' +
      '<div class="card">' +
        '<h2>Свои продукты</h2>' +
        '<p class="muted">Добавьте, что реально едите. Все данные на 100 г сырого веса.</p>' +
        '<input id="food-search" type="search" placeholder="Найти в справочнике…" style="width:100%;padding:16px 18px;border-radius:12px;border:1.5px solid var(--line);background:var(--cream);font-size:16px;margin-bottom:8px">' +
        '<div id="food-search-results" class="search-results" hidden></div>' +
      '</div>' +
      '<div class="card"><h3>Разрешённые <span class="tiny" style="font-weight:normal">' + allowed.length + '</span></h3>' +
        (allowed.length
          ? '<ul class="chip-list">' + allowed.map((n) => '<li>' + esc(n) + '<button data-tol="' + esc(n) + '" title="Переносимость">⚖</button><button data-rm="' + esc(n) + '" title="Удалить">×</button></li>').join('') + '</ul>'
          : '<p class="muted">Пока пусто. Найдите продукт в поиске выше и нажмите «разрешить».</p>') +
      '</div>' +
      '<div class="card"><h3>Исключённые <span class="tiny" style="font-weight:normal">' + forb.length + '</span></h3>' +
        (forb.length
          ? '<ul class="chip-list">' + forb.map((n) => '<li>' + esc(n) + '<button data-allow="' + esc(n) + '" title="Вернуть в разрешённые">↩</button></li>').join('') + '</ul>'
          : '<p class="muted">Список пуст.</p>') +
      '</div></div>';
  }

  function renderDiary() {
    const stage = $('#stage');
    if (!stage) return;
    const today = new Date().toISOString().slice(0, 10);
    const entries = S.state.meals.filter((m) => m.date === today);
    const tt = dayTotals();
    const t = S.state.targetToday;
    stage.innerHTML = '<div class="section">' +
      '<div class="card"><h2>Дневник питания</h2>' +
      (entries.length
        ? '<ul class="log">' + entries.map((e) => '<li><span class="serif">' + esc(e.food_item) + '</span> · ' + e.grams_raw + ' г <small>' + slotName(['breakfast','lunch','snack','dinner'][e.slot_index - 1]) + '</small></li>').join('') + '</ul>' +
          '<p class="muted small" style="margin-top:12px">Итого: ' + Math.round(tt.kcal) + ' ккал · Б' + Math.round(tt.protein_g) + ' Ж' + Math.round(tt.fat_g) + ' У' + Math.round(tt.carb_g) + ' · кл. ' + Math.round(tt.fiber_g) + '</p>'
        : '<p class="muted">Записей нет. Съешьте что-нибудь из плана и нажмите «съела ✓» прямо там.</p>') +
      '</div>' +
      '<div class="card"><h3>Голосовое сообщение</h3>' +
        '<p class="muted small">Зажмите кнопку — говорите. Отпустите — сохранится.</p>' +
        '<button class="btn btn--primary" id="rec-btn">🎙 Записать</button>' +
        '<div id="rec-status" class="muted small" style="margin-top:10px"></div>' +
      '</div>' +
      '<div class="card"><h3>Загрузить файл</h3>' +
        '<p class="muted small">Фото рецепта, анализы, документы — до 10 МБ.</p>' +
        '<input id="upload-input" type="file" accept="image/*,audio/*,.pdf,.txt" style="display:block">' +
        '<ul id="upload-list" class="log" style="margin-top:16px"></ul>' +
      '</div></div>';
    bindRecorder();
    bindUpload();
  }

  function renderSymptoms() {
    const stage = $('#stage');
    if (!stage) return;
    const last = S.state.symptoms.find((s) => s.red_flag);
    stage.innerHTML = '<div class="section">' +
      (last ? '<div class="alert" style="background:rgba(194,91,58,.16);border-color:rgba(194,91,58,.4);border-left:4px solid #C25B3A"><strong>🚨 Запись, похожая на red-flag</strong><br>' + esc(last.note || last.all_types.join(', ')) + '<br><small class="muted">При крови, высокой температуре, сильной боли или признаках обезвоживания — обратитесь к врачу.</small></div>' : '') +
      '<div class="card">' +
        '<h2>Самочувствие</h2>' +
        '<form id="form-symptom" class="form">' +
          '<div class="field"><label>Что беспокоит</label><div class="chips">' +
            ['боль', 'вздутие', 'стул изменён', 'тошнота', 'кровь', 'температура', 'общая слабость', 'другое'].map((s) =>
              '<label class="chip"><input type="checkbox" name="symptomType" value="' + s + '"><span>' + s + '</span></label>'
            ).join('') +
          '</div></div>' +
          '<div class="field"><label>Тяжесть: <output id="sev-out">3</output> / 10</label><input type="range" name="severity" min="0" max="10" value="3" style="width:100%"></div>' +
          '<div class="field"><label>Когда появилось</label><input type="datetime-local" name="datetime"></div>' +
          '<div class="field"><label>Связь с едой</label><input type="text" name="relatedFood" placeholder="напр.: после гречки вечером"></div>' +
          '<div class="field"><label>Что-то ещё важное</label><textarea name="note" placeholder="о чём не спросили"></textarea></div>' +
          '<button class="btn btn--primary" type="submit">Записать</button>' +
        '</form>' +
      '</div>' +
      (S.state.symptoms.length
        ? '<div class="card"><h3>История</h3><ul class="log">' + S.state.symptoms.slice(0, 30).map((s) => (
            '<li class="' + (s.red_flag ? 'flag' : '') + '"><strong class="serif">' + s.all_types.map(esc).join(', ') + '</strong> · ' + s.severity + '/10<small>' + new Date(s.datetime).toLocaleString('ru-RU') + ' · фаза «' + s.phase + '»</small>' +
            (s.note ? '<small>' + esc(s.note) + '</small>' : '') +
            (s.related_foods ? '<small>🍽 ' + esc(s.related_foods) + '</small>' : '') +
            '</li>'
          )).join('') + '</ul></div>'
        : '') +
      '</div>';
    const range = $('[name=severity]', form);
    if (range) range.addEventListener('input', () => { $('#sev-out').textContent = range.value; });
  }

  function renderAnalytics(period) {
    const stage = $('#stage');
    if (!stage) return;
    if (!S.state.meals.length) {
      stage.innerHTML = '<div class="section"><div class="card"><h2>Аналитика</h2><p class="muted">Недостаточно данных. Заполняйте дневники.</p></div></div>';
      return;
    }
    const t = S.state.targetToday;
    const tt = dayTotals();
    const bars = [
      ['ккал', t.kcal_target, tt.kcal],
      ['белок', t.protein_g_target, tt.protein_g],
      ['жиры', t.fat_g_target, tt.fat_g],
      ['углеводы', t.carb_g_target, tt.carb_g],
      ['клетч.', t.fiber_g_target, tt.fiber_g]
    ];
    let periodHTML = '<div class="bars">' + bars.map((b) =>
      '<div class="bar" style="height:' + Math.min(b[2] / b[1] * 100, 110) + '%" data-label="' + b[0] + '"></div>'
    ).join('') + '</div>';

    if (period === 'week') {
      const days = [];
      const d = new Date();
      for (let i = 6; i >= 0; i--) {
        const x = new Date(d); x.setDate(x.getDate() - i);
        days.push({ date: x.toISOString().slice(0, 10), label: x.toLocaleDateString('ru-RU', { weekday: 'short' }), kcal: 0 });
      }
      days.forEach((day) => {
        S.state.meals.filter((m) => m.date === day.date).forEach((e) => {
          const f = findFood(e.food_item);
          if (f) day.kcal += f.kcal * e.grams_raw / 100;
        });
      });
      periodHTML = '<div class="bars">' + days.map((d) =>
        '<div class="bar" style="height:' + Math.min(d.kcal / t.kcal_target * 100, 110) + '%" data-label="' + esc(d.label) + '"></div>'
      ).join('') + '</div>';
    }

    stage.innerHTML = '<div class="section">' +
      '<div class="card"><h2>Аналитика</h2>' +
      '<div class="tabs">' +
        '<button class="tab ' + (period === 'day' ? 'is-active' : '') + '" data-tab="day">День</button>' +
        '<button class="tab ' + (period === 'week' ? 'is-active' : '') + '" data-tab="week">Неделя</button>' +
      '</div>' +
      periodHTML +
      '<p class="muted small" style="margin-top:24px">Любые корреляции — гипотезы, не доказано. Решения принимайте с врачом.</p>' +
      '</div></div>';
  }

  function renderSettings() {
    const stage = $('#stage');
    if (!stage) return;
    const s = S.state.settings;
    stage.innerHTML = '<div class="section">' +
      '<div class="card"><h2>Настройки</h2>' +
        '<form id="form-settings" class="form">' +
          '<div class="field"><label>Приёмов пищи в день</label><input type="number" name="mealsPerDay" min="2" max="6" value="' + s.mealsPerDay + '"></div>' +
          '<div class="field"><label>Доли калорий по приёмам (Σ = 100)</label>' +
            '<div class="row">' +
              '<input type="number" name="shareBreakfast" min="10" max="60" value="' + s.shares.breakfast + '" placeholder="Завтрак %">' +
              '<input type="number" name="shareLunch" min="10" max="60" value="' + s.shares.lunch + '" placeholder="Обед %">' +
              '<input type="number" name="shareSnack" min="5" max="40" value="' + s.shares.snack + '" placeholder="Полдник %">' +
              '<input type="number" name="shareDinner" min="10" max="60" value="' + s.shares.dinner + '" placeholder="Ужин %">' +
            '</div></div>' +
          '<button class="btn btn--primary" type="submit">Сохранить</button>' +
        '</form>' +
      '</div>' +
      '<div class="card"><h3>Данные</h3>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
          '<button class="btn btn--ghost" data-action="export">⬇ Экспорт</button>' +
          '<label class="btn btn--ghost" for="import-input" style="cursor:pointer">⬆ Импорт</label>' +
          '<input id="import-input" type="file" accept="application/json" style="display:none">' +
          '<button class="btn btn--small" data-action="reset" style="margin-left:auto;color:#C25B3A;border-color:rgba(194,91,58,.3)">Стереть всё</button>' +
        '</div>' +
      '</div>' +
      '<div class="card"><h3>Дисклеймер</h3>' +
        '<p class="muted"><strong>Навигатор питания</strong> — информационный помощник. Не ставит диагнозы, не назначает лечение, не заменяет врача. Рекомендации носят справочный характер и требуют согласования с лечащим врачом. При крови, высокой температуре, сильной боли или признаках обезвоживания — обратитесь к врачу.</p>' +
      '</div></div>';
  }

  function renderDisclaimer() {
    const stage = $('#stage');
    if (!stage) return;
    stage.innerHTML = '<div class="section"><div class="card"><h2>Важно</h2>' +
      '<p><strong>Навигатор питания</strong> — информационно-вспомогательный инструмент. Он <strong>не ставит диагнозы</strong>, <strong>не назначает лечение</strong> и <strong>не заменяет консультацию врача</strong>.</p>' +
      '<ul style="margin:16px 0;padding-left:24px;color:var(--ink-soft)">' +
        '<li style="margin:8px 0">Рекомендации носят <strong>справочный</strong> характер и требуют согласования с лечащим врачом.</li>' +
        '<li style="margin:8px 0">При <strong>крови, высокой температуре, сильной боли, признаках обезвоживания</strong> — обратитесь к врачу.</li>' +
        '<li style="margin:8px 0">При хронических заболеваниях рацион согласуется со специалистом.</li>' +
        '<li style="margin:8px 0">«Гипотезы переносимости» не являются доказанными.</li>' +
      '</ul></div></div>';
  }

  // ========== Recorder & upload ==========
  function bindRecorder() {
    const btn = $('#rec-btn');
    const status = $('#rec-status');
    if (!btn) return;
    let rec = null, chunks = [];
    btn.addEventListener('click', async () => {
      if (rec) {
        rec.stop(); return;
      }
      if (!navigator.mediaDevices || !window.MediaRecorder) {
        status.textContent = 'Запись не поддерживается этим браузером.';
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        rec = new MediaRecorder(stream);
        chunks = [];
        rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
        rec.onstop = () => {
          const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
          const url = URL.createObjectURL(blob);
          status.innerHTML = '<audio controls src="' + url + '" style="width:100%;margin-top:8px"></audio><br><small>Готово. Сохранено локально в этом браузере.</small>';
          stream.getTracks().forEach((t) => t.stop());
          rec = null;
        };
        rec.start();
        status.textContent = 'Идёт запись… нажмите, чтобы остановить';
        btn.textContent = '⏹ Остановить';
      } catch (e) {
        status.textContent = 'Нет доступа к микрофону. Разрешите в настройках браузера.';
      }
    });
  }

  function bindUpload() {
    const input = $('#upload-input');
    if (!input) return;
    input.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (f.size > 10 * 1024 * 1024) { toast('Файл больше 10 МБ'); return; }
      const blobUrl = URL.createObjectURL(f);
      const list = $('#upload-list');
      const li = document.createElement('li');
      if (f.type.startsWith('image/')) {
        li.innerHTML = '<img src="' + blobUrl + '" style="max-width:120px;max-height:80px;border-radius:8px;margin-right:10px"><span>' + esc(f.name) + '</span>';
      } else if (f.type.startsWith('audio/')) {
        li.innerHTML = '<audio controls src="' + blobUrl + '" style="margin-right:10px"></audio><span>' + esc(f.name) + '</span>';
      } else {
        li.innerHTML = '<a href="' + blobUrl + '" target="_blank" rel="noopener">' + esc(f.name) + '</a>';
      }
      list.appendChild(li);
      toast('«' + f.name + '» загружен');
    });
  }

  function paintRibbon() {
    $('#ribbon').hidden = !!S.state.ribbonHidden;
  }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3000);
  }

  function refreshScreen(name) {
    if (name === 'today') renderToday();
    else if (name === 'plan') renderPlan();
    else if (name === 'foods') renderFoods();
    else if (name === 'diary') renderDiary();
    else if (name === 'symptoms') renderSymptoms();
    else if (name === 'analytics') renderAnalytics('day');
    else if (name === 'settings') renderSettings();
    else if (name === 'disclaimer') renderDisclaimer();
  }

  function refreshToday() { if (S.current === 'today') renderToday(); }
  function refreshAll() { renderToday(); }

  // ========== BOOT ==========
  document.addEventListener('DOMContentLoaded', () => S.init());
})();

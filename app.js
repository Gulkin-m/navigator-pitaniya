/* Навигатор питания — приложение */
(function(){
'use strict';

const STORAGE_KEY = 'navigator_data_v3';
const SPLASH_KEY = 'navigator_splash_seen';
const STATE = { current: 'splash', appScreen: 'home' };

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  if(window.SEED_DATA){ return JSON.parse(JSON.stringify(window.SEED_DATA)); }
  return {
    profile:{ name:'Айгуль', age:34, sex:'ж', height:165, weight:64, goal:'Поддержание', region:'Центральная Азия',
      diagnosis:'Колит', stage:'ремиссия', allergies:'Нет', intolerance:'', forbidden:'', doctorRecs:'ограничить грубую клетчатку, жирное и острое',
      bones:'норма', vitamins:'', micro:'', macro:'', family:[
        {name:'Супруг',age:36,note:'без ограничений'},
        {name:'Дочь',age:9,note:'аллергия на орехи'}
      ]
    },
    products:[], plan:[], shopping:[], progress:{weights:[{d:'2026-06-01',w:65},{d:'2026-06-15',w:64},{d:'2026-07-01',w:63.5},{d:'2026-07-15',w:63}]}, settings:{reminders:true,voice:true}
  };
}
function save(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE.data)); }catch(e){} }
STATE.data = load();

function go(name){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const t = document.getElementById('screen-'+name);
  if(t) t.classList.add('active');
  STATE.current = name;
  window.scrollTo(0,0);
  if(name==='app') renderAppScreen();
}

document.getElementById('splash-go').addEventListener('click',()=>go('intro'));
document.getElementById('screen-splash').addEventListener('click',e=>{
  if(e.target.closest('.btn-splash')) return;
  go('intro');
});
document.getElementById('intro-start').addEventListener('click',()=>go('landing'));

document.querySelectorAll('[data-go-app]').forEach(b=>b.addEventListener('click',()=>go('app')));

document.querySelectorAll('.ld-nav a').forEach(a=>{
  a.addEventListener('click',e=>{
    const href = a.getAttribute('href');
    if(href && href.startsWith('#')){
      e.preventDefault();
      const t = document.querySelector(href);
      if(t) t.scrollIntoView({behavior:'smooth',block:'start'});
      document.querySelectorAll('.ld-nav a').forEach(x=>x.classList.remove('active'));
      a.classList.add('active');
      document.querySelector('.ld-nav').classList.remove('open');
    }
  });
});

const burger = document.getElementById('ld-burger');
if(burger) burger.addEventListener('click',()=>{
  document.querySelector('.ld-nav').classList.toggle('open');
});

function renderAppScreen(){
  renderApp(STATE.appScreen);
}

function renderApp(name){
  STATE.appScreen = name;
  document.querySelectorAll('.app-nav-item').forEach(a=>{
    a.classList.toggle('active', a.dataset.screen===name);
  });
  document.querySelectorAll('.app-bottom-nav a').forEach(a=>{
    a.classList.toggle('active', a.dataset.screen===name);
  });
  const main = document.getElementById('app-main');
  const aside = document.getElementById('app-aside');
  let html='', asideHtml='';
  switch(name){
    case 'home': [html,asideHtml] = viewHome(); break;
    case 'profile': [html,asideHtml] = viewProfile(); break;
    case 'products': [html,asideHtml] = viewProducts(); break;
    case 'plan': [html,asideHtml] = viewPlan(); break;
    case 'outside': [html,asideHtml] = viewOutside(); break;
    case 'shopping': [html,asideHtml] = viewShopping(); break;
    case 'progress': [html,asideHtml] = viewProgress(); break;
    case 'settings': [html,asideHtml] = viewSettings(); break;
    default: html = '<div class="section-card">Раздел в разработке</div>';
  }
  main.innerHTML = html;
  if(window.innerWidth>1024) aside.innerHTML = asideHtml;
  else aside.innerHTML = '';
  bindAppEvents(name);
}

function greet(){
  const h = new Date().getHours();
  if(h<6) return 'Доброй ночи';
  if(h<11) return 'Доброе утро';
  if(h<17) return 'Добрый день';
  return 'Добрый вечер';
}
function userName(){
  const n = STATE.data.profile && STATE.data.profile.name;
  return n ? n : 'друг';
}

function viewHome(){
  const seedDishes = window.SEED_DATA && window.SEED_DATA.dishes || defaultDishes();
  const seedHave = window.SEED_DATA && window.SEED_DATA.products || defaultHave();
  const seedMiss = window.SEED_DATA && window.SEED_DATA.missing || defaultMiss();
  const goal = 1600;
  const tot = (window.SEED_DATA && window.SEED_DATA.today) || {kcal:1200, p:72, f:45, c:140};

  let html = `
    <div class="app-page-head">
      <div class="home-greet">${greet()}, <b>${escapeHtml(userName())}</b>! <span class="star">⭐</span></div>
      <div class="home-q">Что приготовить прямо сейчас?</div>
    </div>
    <div class="section-card">
      <h3>Рецепты для вас</h3>
      <div class="recipe-row" id="recipe-row">
        ${seedDishes.map((d,i)=>recipeCard(d,i===0)).join('')}
      </div>
      <button class="btn-more" id="more-recipes">Показать ещё варианты ▾</button>
    </div>
    <div class="section-card">
      <h3>У вас есть</h3>
      <div class="ing-list">
        ${seedHave.map(h=>`<span class="ing-chip"><span class="ic">${h.emoji||'🥗'}</span>${escapeHtml(h.name)} ${h.qty}</span>`).join('')}
        <button class="ing-chip" style="background:#fff;border:1.5px dashed var(--l2);color:var(--t2)">+ Показать все</button>
      </div>
    </div>
    <div class="section-card">
      <h3>Не хватает</h3>
      <div class="ing-list">
        ${seedMiss.map(h=>`<span class="ing-chip miss"><span class="ic">${h.emoji||'🛒'}</span>${escapeHtml(h.name)} ${h.qty}</span>`).join('')}
      </div>
      <button class="btn btn-primary home-actions" style="margin-top:12px" id="add-miss">🛒 Добавить всё в список покупок</button>
    </div>
    <div class="home-actions">
      <button class="btn btn-primary" id="cook-this">👩‍🍳 Приготовить это блюдо</button>
      <button class="btn btn-light" id="voice-btn">🎤 Голосовой ввод</button>
      <button class="btn btn-light" id="photo-btn">📷 Фото продуктов</button>
    </div>
  `;

  const circ = 2*Math.PI*54;
  const off = circ*(1-Math.min(1,tot.kcal/goal));
  const asideHtml = `
    <div class="aside-card">
      <h4>Ваш план на сегодня</h4>
      <ul class="meal-list">
        <li><span class="meal-check done"></span>Завтрак: Овсянка с ягодами</li>
        <li><span class="meal-check done"></span>Обед: Куриный суп с овощами</li>
        <li><span class="meal-check"></span>Ужин: Лосось с брокколи и киноа</li>
        <li><span class="meal-check"></span>Перекус: Йогурт с орехами</li>
      </ul>
      <button class="btn btn-primary btn-block" data-go-plan>Открыть план</button>
    </div>
    <div class="aside-card">
      <h4>Дневная сводка</h4>
      <div class="summary-goal">Цель: ${goal} ккал</div>
      <div class="summary-ring">
        <svg width="130" height="130">
          <circle class="summary-ring-bg" cx="65" cy="65" r="54"></circle>
          <circle class="summary-ring-fg" cx="65" cy="65" r="54"
            stroke-dasharray="${circ}" stroke-dashoffset="${off}"></circle>
        </svg>
        <div class="summary-ring-text"><b>${tot.kcal}</b><span>из ${goal} ккал</span></div>
      </div>
      ${macroBar('Белки',tot.p,100)}
      ${macroBar('Жиры',tot.f,60)}
      ${macroBar('Углеводы',tot.c,200)}
      <button class="btn btn-primary btn-block" style="margin-top:12px">Подробнее</button>
    </div>
  `;
  return [html, asideHtml];
}

function macroBar(label,cur,max){
  const pct = Math.min(100, Math.round(cur/max*100));
  return `<div class="macro-row">
    <div class="macro-label"><span>${label}</span><span>${cur} / ${max} г</span></div>
    <div class="macro-bar"><div class="macro-bar-fill" style="width:${pct}%"></div></div>
  </div>`;
}

function recipeCard(d,best){
  const tagMap = {
    ready:['tag-ready','✅ Можно приготовить'],
    healthy:['tag-healthy','⭐ Самый полезный'],
    fast:['tag-fast','⚡ Самый быстрый'],
    cheap:['tag-cheap','💰 Самый экономичный'],
    favorite:['tag-fav','❤️ Любимый']
  };
  const t = tagMap[d.tag] || ['tag-ready',''];
  return `<div class="recipe-card ${best?'best':''}">
    ${t[1]?`<div class="recipe-tag ${t[0]}">${t[1]}</div>`:''}
    <div class="recipe-emoji">${d.emoji||'🍽️'}</div>
    <div class="recipe-name">${escapeHtml(d.name)}</div>
    <div class="recipe-meta">${d.time} мин • ${d.kcal} ккал</div>
    <div class="recipe-macros"><b>Б:</b> ${d.p} г <b>Ж:</b> ${d.f} г <b>У:</b> ${d.c} г</div>
    ${d.note?`<div class="recipe-note">${escapeHtml(d.note)}</div>`:''}
  </div>`;
}

function defaultDishes(){
  return [
    {name:'Курица с брокколи и сыром',emoji:'🍗',time:25,kcal:520,p:34,f:18,c:45,tag:'ready',note:'Только из того, что есть дома'},
    {name:'Овсянка с ягодами',emoji:'🥣',time:10,kcal:290,p:9,f:7,c:48,tag:'healthy'},
    {name:'Омлет с овощами',emoji:'🍳',time:12,kcal:340,p:22,f:24,c:6,tag:'fast'},
    {name:'Творог с йогуртом',emoji:'🥛',time:5,kcal:210,p:28,f:8,c:9,tag:'cheap'},
    {name:'Куриный суп с овощами',emoji:'🥣',time:35,kcal:180,p:16,f:5,c:14,tag:'favorite'},
    {name:'Лосось с киноа',emoji:'🐟',time:30,kcal:480,p:34,f:22,c:32,tag:'healthy'}
  ];
}
function defaultHave(){
  return [
    {name:'Яйца',qty:'12 шт.',emoji:'🥚'},
    {name:'Брокколи',qty:'500 г',emoji:'🥦'},
    {name:'Курица',qty:'400 г',emoji:'🍗'},
    {name:'Сыр',qty:'200 г',emoji:'🧀'},
    {name:'Молоко',qty:'1 л',emoji:'🥛'},
    {name:'Морковь',qty:'2 шт.',emoji:'🥕'}
  ];
}
function defaultMiss(){
  return [
    {name:'Киноа',qty:'100 г',emoji:'🌾'},
    {name:'Лимон',qty:'1 шт.',emoji:'🍋'},
    {name:'Сливки',qty:'100 мл',emoji:'🥛'}
  ];
}

function viewProfile(){
  const p = STATE.data.profile || {};
  const pct = computeProfilePct(p);
  let html = `
    <div class="app-page-head"><h1>Профиль</h1><p>Расскажите о себе — мы подстроим рекомендации</p></div>
    <div class="profile-head">
      <div class="profile-avatar">${initials(p.name||userName())}</div>
      <div class="profile-info">
        <b>${escapeHtml(p.name||userName())}</b>
        <span>${p.age||34} ${p.sex==='ж'?'года, женский':(p.sex==='м'?'лет, мужской':'лет')}</span>
      </div>
      <button class="btn btn-primary" id="edit-profile" style="margin-left:auto">Редактировать</button>
    </div>
    <div class="section-card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <b>Профиль заполнен на ${pct}%</b>
        <span style="color:var(--t2);font-size:13px">Осталось немного 👀</span>
      </div>
      <div class="profile-progress-bar"><div class="profile-progress-fill" style="width:${pct}%"></div></div>
    </div>
    <details class="profile-section" open>
      <summary>Основные данные</summary>
      <div class="profile-section-body">
        <div class="field-row">
          <div class="field"><label>Имя</label><input id="pf-name" value="${escapeHtml(p.name||'')}"></div>
          <div class="field"><label>Возраст</label><input id="pf-age" type="number" value="${p.age||34}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Пол</label>
            <select id="pf-sex"><option value="ж" ${p.sex==='ж'?'selected':''}>Женский</option><option value="м" ${p.sex==='м'?'selected':''}>Мужской</option></select>
          </div>
          <div class="field"><label>Рост (см)</label><input id="pf-h" type="number" value="${p.height||165}"></div>
          <div class="field"><label>Вес (кг)</label><input id="pf-w" type="number" value="${p.weight||64}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Регион</label><input id="pf-region" value="${escapeHtml(p.region||'')}"></div>
          <div class="field"><label>Цель</label>
            <select id="pf-goal">
              <option ${p.goal==='Похудение'?'selected':''}>Похудение</option>
              <option ${p.goal==='Поддержание'?'selected':''}>Поддержание</option>
              <option ${p.goal==='Набор'?'selected':''}>Набор</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary" id="save-basic">Сохранить</button>
      </div>
    </details>
    <details class="profile-section">
      <summary>Здоровье ❤️</summary>
      <div class="profile-section-body">
        <div class="field"><label>Диагнозы</label><textarea id="pf-diag" rows="2">${escapeHtml(p.diagnosis||'')}</textarea></div>
        <div class="field"><label>Рекомендации врача</label><textarea id="pf-rec" rows="2">${escapeHtml(p.doctorRecs||'')}</textarea></div>
        <div class="field-row">
          <div class="field"><label>Аллергии</label><input id="pf-all" value="${escapeHtml(p.allergies||'')}"></div>
          <div class="field"><label>Непереносимость</label><input id="pf-int" value="${escapeHtml(p.intolerance||'')}"></div>
        </div>
        <div class="field"><label>Запрещённые продукты</label><input id="pf-forb" value="${escapeHtml(p.forbidden||'')}"></div>
        <button class="btn btn-primary" id="save-health">Сохранить</button>
      </div>
    </details>
    <details class="profile-section">
      <summary>Анализы и документы 📄</summary>
      <div class="profile-section-body">
        <div class="field"><label>Витамины</label><textarea id="pf-vit" rows="2" placeholder="например, D — 18 нг/мл (низкий)">${escapeHtml(p.vitamins||'')}</textarea></div>
        <div class="field"><label>Микроэлементы</label><textarea id="pf-mic" rows="2">${escapeHtml(p.micro||'')}</textarea></div>
        <div class="field"><label>Макроэлементы</label><textarea id="pf-mac" rows="2">${escapeHtml(p.macro||'')}</textarea></div>
        <button class="btn btn-ghost" id="upload-pdf">📄 Загрузить PDF анализов</button>
        <button class="btn btn-ghost" style="margin-left:6px" id="upload-photo">📷 Фото анализов</button>
      </div>
    </details>
    <details class="profile-section">
      <summary>Предпочтения</summary>
      <div class="profile-section-body">
        <div class="field"><label>Любимые продукты</label><input value="курица, рыба, каши"></div>
        <div class="field"><label>Нелюбимые</label><input value="грибы"></div>
        <div class="field"><label>Способы приготовления</label><input value="варка, тушение, запекание"></div>
        <div class="field"><label>Национальная кухня</label><input value="${escapeHtml(p.region||'')}"></div>
        <button class="btn btn-primary">Сохранить</button>
      </div>
    </details>
    <details class="profile-section">
      <summary>Семья 👨‍👩‍👧</summary>
      <div class="profile-section-body">
        ${(p.family||[]).map(f=>`<div style="background:var(--g-pale);padding:10px;border-radius:10px;margin-bottom:6px"><b>${escapeHtml(f.name)}</b>, ${f.age} лет — ${escapeHtml(f.note)}</div>`).join('')}
        <button class="btn btn-ghost">+ Добавить члена семьи</button>
      </div>
    </details>
  `;
  return [html,''];
}

function computeProfilePct(p){
  const fields = ['name','age','height','weight','region','goal','diagnosis','allergies','doctorRecs'];
  let filled = 0;
  fields.forEach(f=>{ if(p[f] && String(p[f]).trim()) filled++; });
  return Math.round(filled/fields.length*100);
}

function viewProducts(){
  const seedP = window.SEED_DATA && window.SEED_DATA.products || [];
  let html = `
    <div class="app-page-head"><h1>Продукты дома</h1><p>Скажите, сфотографируйте или добавьте вручную</p></div>
    <div class="products-tabs">
      <button class="input-chip" id="add-manual">⌨️ Вручную</button>
      <button class="input-chip voice" id="add-voice">🎤 Голосом</button>
      <button class="input-chip photo" id="add-photo">📷 Фото</button>
      <button class="input-chip scan" id="add-barcode">📊 Штрихкод</button>
      <button class="input-chip" style="background:var(--l1)" id="add-receipt">🧾 Чек</button>
      <button class="btn btn-primary" style="margin-left:auto" id="add-prod">+ Добавить</button>
    </div>
    <div class="products-list">
      ${seedP.map(p=>`
        <div class="product-card">
          <div class="product-emoji">${p.emoji||'🥗'}</div>
          <div style="flex:1">
            <div class="product-name">${escapeHtml(p.name)}</div>
            <div class="product-meta">${escapeHtml(p.qty)} • годен до ${p.exp} • <span class="${p.warn?'product-warn':''}">${p.days} ${p.days===1?'день':(p.days<5?'дня':'дней')}</span></div>
          </div>
          <button class="btn btn-ghost-sm">⋯</button>
        </div>`).join('')}
    </div>
    <button class="btn-more" id="more-prod">Показать все продукты (${seedP.length}) ▾</button>
  `;
  const asideHtml = `
    <div class="aside-card">
      <h4>Подсказки</h4>
      <div style="font-size:13px;color:var(--t2);line-height:1.5">
        <p style="margin-bottom:8px">🔴 Используйте первыми продукты с истекающим сроком</p>
        <p style="margin-bottom:8px">📅 Сервис напомнит, когда что-то заканчивается</p>
        <p>📷 Можно просто сфотографировать холодильник</p>
      </div>
    </div>
  `;
  return [html,asideHtml];
}

function viewPlan(){
  const meals = [
    {type:'Завтрак',name:'Овсянка с ягодами',kcal:290,p:9,f:7,c:48,time:10},
    {type:'Обед',name:'Куриный суп с овощами',kcal:180,p:16,f:5,c:14,time:35},
    {type:'Ужин',name:'Лосось с брокколи и киноа',kcal:480,p:34,f:22,c:32,time:30},
    {type:'Перекус',name:'Йогурт с орехами',kcal:170,p:10,f:6,c:18,time:3}
  ];
  let html = `
    <div class="app-page-head"><h1>План питания</h1><p>Подберите рацион на день, неделю или месяц</p></div>
    <div class="tabs" id="period-tabs">
      <div class="tab active">День</div><div class="tab">2 дня</div><div class="tab">3 дня</div><div class="tab">Неделя</div><div class="tab">Месяц</div>
    </div>
    <div class="tabs" id="meal-tabs">
      <div class="tab">Завтрак</div><div class="tab">Обед</div><div class="tab active">Ужин</div><div class="tab">Перекусы</div>
    </div>
    ${meals.map((m,i)=>`
      <div class="plan-meal-card" ${i===2?'':'style="display:none"'}>
        <h4>${m.type}: ${escapeHtml(m.name)}</h4>
        <div class="macros"><span>${m.time} мин</span><span>${m.kcal} ккал</span><span>Б:${m.p} Ж:${m.f} У:${m.c}</span></div>
        <div style="font-size:13.5px;color:var(--t2);margin-top:6px">
          Ингредиенты: лосось 150 г, брокколи 200 г, киноа 80 г, оливковое масло 1 ст.л., лимон.
        </div>
        <div class="actions">
          <button class="btn btn-ghost">🔄 Заменить блюдо</button>
          <button class="btn btn-light">🥕 Заменить ингредиенты</button>
        </div>
      </div>`).join('')}
    <div class="day-totals">
      <h4>Всего за день</h4>
      <div style="font-size:18px;font-weight:700;margin:6px 0">1120 / 1600 ккал</div>
      ${macroBar('Белки',69,100)}
      ${macroBar('Жиры',40,60)}
      ${macroBar('Углеводы',112,200)}
    </div>
  `;
  const asideHtml = `
    <div class="aside-card">
      <h4>Опции</h4>
      <button class="btn btn-ghost btn-block" style="margin-bottom:8px">🏠 Использовать продукты дома</button>
      <button class="btn btn-ghost btn-block" style="margin-bottom:8px">🛒 Сформировать список покупок</button>
      <button class="btn btn-ghost btn-block">📄 Экспорт в PDF</button>
    </div>
  `;
  return [html,asideHtml];
}

function viewOutside(){
  let html = `
    <div class="app-page-head"><h1>Вне дома</h1><p>Ресторан, гости, в дороге</p></div>
    <div class="tabs">
      <div class="tab active">🍴 Ресторан</div><div class="tab">🏠 В гостях</div>
    </div>
    <div class="out-card">
      <h3 style="margin-bottom:6px">Ресторан Green Garden</h3>
      <div style="color:var(--t2);font-size:13px;margin-bottom:12px">Можно выбрать ресторан или ввести свой</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
        <button class="btn btn-ghost-sm">📋 Меню</button>
        <button class="btn btn-ghost-sm">🔗 Ссылка</button>
        <button class="btn btn-ghost-sm">📷 Фото меню</button>
        <button class="btn btn-ghost-sm">✏️ Ввести название</button>
      </div>
      <div class="ai-section">
        <h5>Рекомендации AI</h5>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div>
            <div style="font-weight:700;color:var(--g);margin-bottom:4px">Рекомендуем ✅</div>
            <ul class="ai-list">
              <li>Лосось на гриле с овощами — 420 ккал</li>
              <li>Куриная грудка с киноа — 380 ккал</li>
              <li>Стейк из тунца — 350 ккал</li>
            </ul>
          </div>
          <div>
            <div style="font-weight:700;color:var(--r);margin-bottom:4px">Избегать ❌</div>
            <ul class="ai-list">
              <li class="bad">Острый том-ям — раздражает ЖКТ</li>
              <li class="bad">Жареная картошка — много жира</li>
              <li class="bad">Десерт с орехами — аллергия у дочери</li>
            </ul>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" style="margin-top:14px">💬 Задать вопрос AI</button>
    </div>
    <div class="out-card">
      <h3 style="margin-bottom:8px">🏠 В гостях</h3>
      <p style="color:var(--t2);font-size:13.5px;margin-bottom:10px">Опишите словами или голосом, что планируется на столе. AI подскажет, что выбрать.</p>
      <div class="field">
        <textarea rows="3" placeholder="Например: будут шашлык, салаты с майонезом, торт"></textarea>
      </div>
      <button class="btn btn-primary" style="margin-top:10px">🎤 Рассказать голосом</button>
    </div>
  `;
  const asideHtml = `
    <div class="aside-card">
      <h4>Важно</h4>
      <p style="font-size:13px;color:var(--t2);line-height:1.5">Учитываем ваш диагноз (колит), аллергии семьи и личные предпочтения</p>
    </div>
  `;
  return [html,asideHtml];
}

function viewShopping(){
  const seedS = window.SEED_DATA && window.SEED_DATA.shopping || [];
  const total = seedS.reduce((s,i)=>s+(i.done?0:i.price),0);
  let html = `
    <div class="app-page-head"><h1>Покупки</h1><p>Автоматически из плана + ваши добавки</p></div>
    <div class="products-tabs">
      <button class="input-chip">📋 Список</button>
      <button class="input-chip">🏬 По отделам</button>
      <button class="btn btn-primary" style="margin-left:auto" id="add-shop">+ Добавить</button>
    </div>
    <div>
      ${seedS.map(s=>`
        <div class="shop-item">
          <span class="shop-check ${s.done?'done':''}"></span>
          <div class="shop-info">
            <div class="shop-name">${escapeHtml(s.name)} <span style="color:var(--t2);font-weight:400;font-size:13px">${s.qty}</span></div>
            <div class="shop-meta">${s.dept} • ${s.price} ₽</div>
          </div>
          <button class="btn btn-ghost-sm">⋯</button>
        </div>`).join('')}
    </div>
    <div class="budget">
      <div><b>Бюджет:</b> 1500 ₽</div>
      <div><b>К оплате:</b> ${total} ₽</div>
    </div>
    <button class="btn btn-primary btn-block" style="margin-top:14px" id="mark-bought">✅ Отметить купленные</button>
  `;
  const asideHtml = `
    <div class="aside-card">
      <h4>Подсказки</h4>
      <p style="font-size:13px;color:var(--t2);line-height:1.5">Список автоматически обновляется при изменении плана питания</p>
    </div>
  `;
  return [html,asideHtml];
}

function viewProgress(){
  const weights = (STATE.data.progress && STATE.data.progress.weights) || [];
  const planHist = window.SEED_DATA && window.SEED_DATA.planHistory || [
    {period:'6 — 12 июля',pct:92},{period:'29 июня — 5 июля',pct:85},{period:'22 — 28 июня',pct:78}
  ];
  let chart = '';
  if(weights.length>1){
    const W=320,H=160,P=20;
    const min=Math.min(...weights.map(w=>w.w))-1, max=Math.max(...weights.map(w=>w.w))+1;
    const xs = i=>P + (W-2*P)*(i/(weights.length-1));
    const ys = w => H-P - (H-2*P)*((w-min)/(max-min));
    const pts = weights.map((w,i)=>`${xs(i)},${ys(w.w)}`).join(' ');
    chart = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}">
      <line x1="${P}" y1="${H-P}" x2="${W-P}" y2="${H-P}" stroke="#d8dedb"/>
      <line x1="${P}" y1="${P}" x2="${P}" y2="${H-P}" stroke="#d8dedb"/>
      <polyline fill="none" stroke="#2E7D5C" stroke-width="3" points="${pts}"/>
      ${weights.map((w,i)=>`<circle cx="${xs(i)}" cy="${ys(w.w)}" r="5" fill="#2E7D5C"/>
        <text x="${xs(i)}" y="${ys(w.w)-10}" font-size="11" fill="#5a6b67" text-anchor="middle">${w.w}</text>`).join('')}
    </svg>`;
  } else {
    chart = '<p style="color:var(--t2);font-size:13px;text-align:center;padding:30px">Добавьте первое взвешивание, чтобы увидеть динамику</p>';
  }
  let html = `
    <div class="app-page-head"><h1>Прогресс</h1><p>Ваша динамика и достижения</p></div>
    <div class="tabs">
      <div class="tab active">⚖️ Вес</div><div class="tab">📄 Анализы</div><div class="tab">💊 Дефициты</div>
    </div>
    <div class="chart-card">
      <h3 style="margin-bottom:10px">Динамика веса</h3>
      ${chart}
    </div>
    <div class="section-card">
      <h3>История планов</h3>
      <div class="plan-history">
        ${planHist.map(h=>`<div class="plan-history-item"><span>Неделя ${h.period}</span><span class="pct">Выполнено на ${h.pct}%</span></div>`).join('')}
      </div>
      <button class="btn-more">Посмотреть все ▾</button>
    </div>
    <div class="section-card">
      <h3>Напоминания</h3>
      <div style="font-size:14px;color:var(--t)">
        <div style="padding:8px 0;border-bottom:1px solid var(--l1)">🔔 Обновить анализы — через 30 дней</div>
        <div style="padding:8px 0;border-bottom:1px solid var(--l1)">💊 Купить витамин D</div>
        <div style="padding:8px 0">🥬 Пополнить продукты — Курица заканчивается</div>
      </div>
    </div>
  `;
  const asideHtml = weights.length ? `
    <div class="aside-card">
      <h4>Текущая цель</h4>
      <p style="font-size:13px;color:var(--t2);line-height:1.5">Поддержание веса ${weights[weights.length-1].w} кг</p>
      <p style="font-size:24px;font-weight:800;color:var(--g);margin-top:6px">${weights[weights.length-1].w} кг</p>
    </div>
  ` : '';
  return [html,asideHtml];
}

function viewSettings(){
  let html = `
    <div class="app-page-head"><h1>Настройки</h1><p>Подстройте приложение под себя</p></div>
    <div class="settings-card">
      <div class="settings-row"><span>Напоминания о приёмах пищи</span><span class="switch on" data-sw="reminders"></span></div>
      <div class="settings-row"><span>Голосовой ввод</span><span class="switch on" data-sw="voice"></span></div>
      <div class="settings-row"><span>Уведомления о сроке годности</span><span class="switch on" data-sw="expiry"></span></div>
      <div class="settings-row"><span>Крупный шрифт</span><span class="switch" data-sw="big"></span></div>
    </div>
    <div class="settings-card">
      <h3 style="margin-bottom:10px">Данные</h3>
      <button class="btn btn-light btn-block" style="margin-bottom:8px">📥 Экспортировать данные</button>
      <button class="btn btn-danger btn-block">🗑 Удалить профиль</button>
    </div>
    <div class="settings-card">
      <h3 style="margin-bottom:10px">О приложении</h3>
      <div style="color:var(--t2);font-size:13.5px;line-height:1.6">
        Навигатор питания v3.0<br>
        © 2026 Все права защищены
      </div>
    </div>
  `;
  const asideHtml = `
    <div class="aside-card">
      <h4>Поддержка</h4>
      <p style="font-size:13px;color:var(--t2);line-height:1.5">Если что-то не работает — напишите нам, мы поможем</p>
      <button class="btn btn-primary btn-block" style="margin-top:10px">💬 Связаться</button>
    </div>
  `;
  return [html,asideHtml];
}

function bindAppEvents(name){
  document.querySelectorAll('.app-nav-item,.app-bottom-nav a').forEach(a=>{
    a.addEventListener('click',e=>{
      e.preventDefault();
      const s = a.dataset.screen;
      if(s) renderApp(s);
    });
  });
  document.querySelectorAll('[data-go-plan]').forEach(b=>b.addEventListener('click',()=>renderApp('plan')));
  const sb = document.getElementById('save-basic');
  if(sb) sb.addEventListener('click',()=>{
    const p = STATE.data.profile || (STATE.data.profile={});
    p.name = val('pf-name'); p.age = +val('pf-age')||0; p.sex = val('pf-sex');
    p.height = +val('pf-h')||0; p.weight = +val('pf-w')||0;
    p.region = val('pf-region'); p.goal = val('pf-goal');
    save(); toast('Сохранено ✅'); renderApp('profile');
  });
  const sh = document.getElementById('save-health');
  if(sh) sh.addEventListener('click',()=>{
    const p = STATE.data.profile || (STATE.data.profile={});
    p.diagnosis = val('pf-diag'); p.doctorRecs = val('pf-rec');
    p.allergies = val('pf-all'); p.intolerance = val('pf-int'); p.forbidden = val('pf-forb');
    save(); toast('Сохранено ✅');
  });
  document.querySelectorAll('.tabs').forEach(tabs=>{
    tabs.querySelectorAll('.tab').forEach(t=>{
      t.addEventListener('click',()=>{
        tabs.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
        t.classList.add('active');
      });
    });
  });
  document.querySelectorAll('.shop-check').forEach(c=>{
    c.addEventListener('click',()=>c.classList.toggle('done'));
  });
  document.querySelectorAll('.meal-check').forEach(c=>{
    c.addEventListener('click',()=>c.classList.toggle('done'));
  });
  document.querySelectorAll('.switch').forEach(s=>{
    s.addEventListener('click',()=>{
      s.classList.toggle('on');
      const st = STATE.data.settings || (STATE.data.settings={});
      st[s.dataset.sw] = s.classList.contains('on');
      save();
    });
  });
  ['add-prod','add-manual','add-voice','add-photo','add-barcode','add-receipt',
   'add-shop','mark-bought','cook-this','voice-btn','photo-btn','add-miss','more-recipes','more-prod'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('click',()=>toast('В разработке — скоро будет готово ✨'));
  });
}

function val(id){ const e = document.getElementById(id); return e?e.value:''; }
function initials(n){ if(!n) return '?'; return n.trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase(); }
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toast(msg){
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style,{
    position:'fixed',bottom:'90px',left:'50%',transform:'translateX(-50%)',
    background:'#1f2a28',color:'#fff',padding:'10px 18px',borderRadius:'20px',
    fontSize:'14px',zIndex:'200',boxShadow:'0 4px 12px rgba(0,0,0,.2)'
  });
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),2500);
}

const mm = document.getElementById('app-mobile-menu');
if(mm){
  mm.addEventListener('click',()=>{
    document.querySelector('.app-sidebar').classList.toggle('mobile-open');
  });
}

go('splash');

})();
/* Навигатор питания — приложение (v12) */
(function(){
'use strict';

const STORAGE_KEY = 'navigator_data_v3';

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  if(window.SEED_DATA) return JSON.parse(JSON.stringify(window.SEED_DATA));
  return { profile:{name:'Гость',age:30,sex:'ж',height:165,weight:64,goal:'Поддержание',region:'Центральная Азия',diagnosis:'',allergies:'',doctorRecs:'',family:[]}, products:[], shopping:[], progress:{weights:[]}, settings:{} };
}
function save(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE.data)); }catch(e){} }
const STATE = { data: load(), appScreen: 'home' };

function go(name){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const t = document.getElementById('screen-'+name);
  if(t) t.classList.add('active');
  window.scrollTo(0,0);
  if(name==='app') renderApp();
}

document.getElementById('welcome-start').addEventListener('click',()=>go('landing'));

document.querySelectorAll('[data-go-app]').forEach(b=>b.addEventListener('click',()=>go('app')));

function renderApp(name){
  STATE.appScreen = name || STATE.appScreen;
  document.querySelectorAll('.app-nav-item').forEach(a=>{
    a.classList.toggle('active', a.dataset.screen===STATE.appScreen);
  });
  document.querySelectorAll('.app-bottom-nav a').forEach(a=>{
    a.classList.toggle('active', a.dataset.screen===STATE.appScreen);
  });
  const main = document.getElementById('app-main');
  const aside = document.getElementById('app-aside');
  let html='', asideHtml='';
  switch(STATE.appScreen){
    case 'home': [html,asideHtml] = viewHome(); break;
    case 'profile': [html,asideHtml] = viewProfile(); break;
    case 'products': [html,asideHtml] = viewProducts(); break;
    case 'plan': [html,asideHtml] = viewPlan(); break;
    case 'shopping': [html,asideHtml] = viewShopping(); break;
    case 'progress': [html,asideHtml] = viewProgress(); break;
    case 'settings': [html,asideHtml] = viewSettings(); break;
    default: html = '<div class="section-card">Раздел в разработке</div>';
  }
  main.innerHTML = html;
  if(window.innerWidth>1024) aside.innerHTML = asideHtml;
  else aside.innerHTML = '';
  bindEvents();
}

function greet(){const h=new Date().getHours();if(h<11)return 'Доброе утро';if(h<17)return 'Добрый день';return 'Добрый вечер';}
function userName(){return STATE.data.profile.name||'Гость';}

function viewHome(){
  const dishes = window.SEED_DATA && window.SEED_DATA.dishes || [];
  const have = window.SEED_DATA && window.SEED_DATA.products || [];
  const miss = window.SEED_DATA && window.SEED_DATA.missing || [];
  const today = window.SEED_DATA && window.SEED_DATA.today || {kcal:1200,p:72,f:45,c:140};
  const goal = 1600;

  let html = `
    <div class="app-page-head">
      <div class="home-greet">${greet()}, <b>${escapeHtml(userName())}</b>! <span class="star">⭐</span></div>
      <div class="home-q">Что приготовить прямо сейчас?</div>
    </div>
    <div class="section-card">
      <h3>Рецепты для вас</h3>
      <div class="recipe-row">
        ${dishes.map((d,i)=>recipeCard(d,i===0)).join('')}
      </div>
      <button class="btn-more" id="more-recipes">Показать ещё варианты ▾</button>
    </div>
    <div class="section-card">
      <h3>У вас есть</h3>
      <div class="ing-list">
        ${have.map(h=>`<span class="ing-chip"><span class="ic">${h.emoji||'🥗'}</span>${escapeHtml(h.name)} ${h.qty}</span>`).join('')}
      </div>
    </div>
    <div class="section-card">
      <h3>Не хватает</h3>
      <div class="ing-list">
        ${miss.map(h=>`<span class="ing-chip miss"><span class="ic">${h.emoji||'🛒'}</span>${escapeHtml(h.name)} ${h.qty}</span>`).join('')}
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
  const off = circ*(1-Math.min(1,today.kcal/goal));
  const asideHtml = `
    <div class="aside-card">
      <h4>Ваш план на сегодня</h4>
      <ul class="meal-list">
        <li><span class="meal-check done"></span>Завтрак: Овсянка с ягодами</li>
        <li><span class="meal-check done"></span>Обед: Куриный суп с овощами</li>
        <li><span class="meal-check"></span>Ужин: Лосось с брокколи и киноа</li>
        <li><span class="meal-check"></span>Перекус: Йогурт с орехами</li>
      </ul>
    </div>
    <div class="aside-card">
      <h4>Дневная сводка</h4>
      <div class="summary-goal">Цель: ${goal} ккал</div>
      <div class="summary-ring">
        <svg width="130" height="130">
          <circle class="summary-ring-bg" cx="65" cy="65" r="54"></circle>
          <circle class="summary-ring-fg" cx="65" cy="65" r="54" stroke-dasharray="${circ}" stroke-dashoffset="${off}"></circle>
        </svg>
        <div class="summary-ring-text"><b>${today.kcal}</b><span>из ${goal} ккал</span></div>
      </div>
      ${macroBar('Белки',today.p,100)}
      ${macroBar('Жиры',today.f,60)}
      ${macroBar('Углеводы',today.c,200)}
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

function viewProfile(){
  const p = STATE.data.profile || {};
  let html = `
    <div class="app-page-head"><h1>Профиль</h1><p>Заполните данные — мы подстроим рекомендации</p></div>
    <div class="profile-head">
      <div class="profile-avatar">${initials(p.name||userName())}</div>
      <div class="profile-info"><b>${escapeHtml(p.name||userName())}</b><span>${p.age||34} ${p.sex==='ж'?'года, женский':(p.sex==='м'?'лет, мужской':'лет')}</span></div>
    </div>
    <details class="profile-section" open>
      <summary>Основные данные</summary>
      <div class="profile-section-body">
        <div class="field-row">
          <div class="field"><label>Имя</label><input id="pf-name" value="${escapeHtml(p.name||'')}"></div>
          <div class="field"><label>Дата рождения</label><input type="date" id="pf-dob" value="${p.dob||''}"></div>
          <div class="field"><label>Пол</label><select id="pf-sex"><option value="ж" ${p.sex==='ж'?'selected':''}>Женский</option><option value="м" ${p.sex==='м'?'selected':''}>Мужской</option></select></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Рост (см)</label><input id="pf-h" type="number" value="${p.height||165}"></div>
          <div class="field"><label>Вес (кг)</label><input id="pf-w" type="number" value="${p.weight||64}"></div>
          <div class="field"><label>Мышцы (кг)</label><input id="pf-muscle" type="number" value="${p.muscle||''}"></div>
          <div class="field"><label>Жир (кг)</label><input id="pf-fat" type="number" value="${p.fat||''}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Висцеральный жир</label><input id="pf-visceral" type="number" value="${p.visceral||''}"></div>
          <div class="field"><label>Активность</label><select id="pf-activity"><option ${p.activity==='Минимальная'?'selected':''}>Минимальная</option><option ${p.activity==='Лёгкая'?'selected':''}>Лёгкая</option><option ${p.activity==='Средняя'?'selected':''}>Средняя</option><option ${p.activity==='Высокая'?'selected':''}>Высокая</option></select></div>
          <div class="field"><label>Цель</label><select id="pf-goal"><option ${p.goal==='Похудение'?'selected':''}>Похудение</option><option ${p.goal==='Поддержание'?'selected':''}>Поддержание</option><option ${p.goal==='Набор'?'selected':''}>Набор</option></select></div>
        </div>
        <div class="field"><label>Регион</label><input id="pf-region" value="${escapeHtml(p.region||'')}"></div>
        <button class="btn btn-primary" id="save-basic">Сохранить</button>
      </div>
    </details>
    <details class="profile-section">
      <summary>Здоровье ❤️</summary>
      <div class="profile-section-body">
        <div class="field"><label>Диагнозы</label><textarea id="pf-diag" rows="2">${escapeHtml(p.diagnosis||'')}</textarea></div>
        <div class="field"><label>Стадия заболевания</label><input id="pf-stage" value="${escapeHtml(p.stage||'')}"></div>
        <div class="field"><label>Рекомендации врача</label><textarea id="pf-rec" rows="2">${escapeHtml(p.doctorRecs||'')}</textarea></div>
        <div class="field-row">
          <div class="field"><label>Аллергии</label><input id="pf-allergies" value="${escapeHtml(p.allergies||'')}"></div>
          <div class="field"><label>Непереносимость</label><input id="pf-intolerance" value="${escapeHtml(p.intolerance||'')}"></div>
        </div>
        <div class="field"><label>Запрещённые продукты</label><input id="pf-forbidden" value="${escapeHtml(p.forbidden||'')}"></div>
        <div class="field"><label>Сопутствующие заболевания</label><input id="pf-related" value="${escapeHtml(p.related||'')}"></div>
        <div class="field"><label>Состояние костной ткани</label><input id="pf-bones" value="${escapeHtml(p.bones||'')}"></div>
        <button class="btn btn-primary" id="save-health">Сохранить</button>
      </div>
    </details>
    <details class="profile-section">
      <summary>Анализы и документы 📄</summary>
      <div class="profile-section-body">
        <div class="field"><label>Витамины</label><textarea id="pf-vit" rows="2" placeholder="например, D — 18 нг/мл (низкий)">${escapeHtml(p.vitamins||'')}</textarea></div>
        <div class="field"><label>Микроэлементы</label><textarea id="pf-micro" rows="2">${escapeHtml(p.micro||'')}</textarea></div>
        <div class="field"><label>Макроэлементы</label><textarea id="pf-macro" rows="2">${escapeHtml(p.macro||'')}</textarea></div>
        <button class="btn btn-ghost" id="upload-pdf">📄 Загрузить PDF анализов</button>
        <button class="btn btn-ghost" id="upload-photo">📷 Фото анализов</button>
      </div>
    </details>
    <details class="profile-section">
      <summary>Предпочтения</summary>
      <div class="profile-section-body">
        <div class="field"><label>Любимые продукты</label><input id="pf-likes" value="${escapeHtml(p.likes||'')}"></div>
        <div class="field"><label>Нелюбимые продукты</label><input id="pf-dislikes" value="${escapeHtml(p.dislikes||'')}"></div>
        <div class="field"><label>Рыба/мясо</label><input id="pf-protein" value="${escapeHtml(p.protein||'')}"></div>
        <div class="field"><label>Способы приготовления</label><input id="pf-cook" value="${escapeHtml(p.cook||'')}"></div>
        <div class="field"><label>Национальная кухня</label><input id="pf-cuisine" value="${escapeHtml(p.cuisine||'')}"></div>
        <div class="field"><label>Другие пожелания</label><textarea id="pf-other" rows="2">${escapeHtml(p.other||'')}</textarea></div>
        <button class="btn btn-primary" id="save-prefs">Сохранить</button>
      </div>
    </details>
    <details class="profile-section">
      <summary>Семья 👨‍👩‍👧</summary>
      <div class="profile-section-body">
        <div id="family-list">${(p.family||[]).map(f=>`<div class="product-card"><div class="product-emoji">👤</div><div style="flex:1"><div class="product-name">${escapeHtml(f.name)}</div><div class="product-meta">${f.age} лет — ${escapeHtml(f.note||'')}</div></div><button class="btn btn-ghost-sm" data-remove-family="${escapeHtml(f.name)}">×</button></div>`).join('')}</div>
        <div class="field-row">
          <div class="field"><label>Имя</label><input id="fm-name"></div>
          <div class="field"><label>Возраст</label><input id="fm-age" type="number"></div>
          <div class="field"><label>Особенности</label><input id="fm-note" placeholder="аллергии, ограничения"></div>
        </div>
        <button class="btn btn-ghost" id="add-family">+ Добавить члена семьи</button>
      </div>
    </details>
  `;
  return [html,''];
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
    <div class="products-list" id="products-list">
      ${seedP.map(p=>productCard(p)).join('')}
    </div>
    <div class="field-row" id="add-form" style="display:none;background:var(--g-pale);padding:16px;border-radius:var(--r-md);margin-bottom:14px">
      <div class="field"><label>Название</label><input id="np-name" placeholder="Например, Курица"></div>
      <div class="field"><label>Количество</label><input id="np-qty" placeholder="500 г"></div>
      <div class="field"><label>Дата покупки</label><input id="np-buy" type="date"></div>
      <div class="field"><label>Срок годности</label><input id="np-exp" type="date"></div>
    </div>
    <button class="btn btn-primary" id="save-prod" style="display:none">Сохранить продукт</button>
    <button class="btn-more" id="more-prod">Показать все продукты (${seedP.length}) ▾</button>
    <div class="section-card" style="margin-top:18px">
      <h3>🔔 Что использовать первым</h3>
      ${seedP.filter(p=>p.days<=3).map(p=>`<div class="product-meta" style="margin-top:6px">${p.emoji} <b>${p.name}</b> — осталось ${p.days} дн.</div>`).join('') || '<div class="product-meta">Всё в порядке!</div>'}
    </div>
  `;
  const asideHtml = `<div class="aside-card"><h4>Подсказки</h4><p style="font-size:13px;color:var(--t2);line-height:1.5">🔴 Используйте первыми продукты с истекающим сроком</p></div>`;
  return [html,asideHtml];
}

function productCard(p){
  return `<div class="product-card">
    <div class="product-emoji">${p.emoji||'🥗'}</div>
    <div style="flex:1">
      <div class="product-name">${escapeHtml(p.name)}</div>
      <div class="product-meta">${escapeHtml(p.qty)} • годен до ${p.exp} • <span class="${p.warn?'product-warn':''}">${p.days} ${p.days===1?'день':(p.days<5?'дня':'дней')}</span></div>
    </div>
  </div>`;
}

function viewPlan(){
  const meals = [
    {type:'Завтрак',name:'Овсянка с ягодами',kcal:290,p:9,f:7,c:48,time:10,ingredients:[{name:'Овсянка',g:60},{name:'Молоко',g:200},{name:'Ягоды',g:80},{name:'Мёд',g:10}]},
    {type:'Обед',name:'Куриный суп с овощами',kcal:180,p:16,f:5,c:14,time:35,ingredients:[{name:'Курица',g:150},{name:'Картофель',g:100},{name:'Морковь',g:50},{name:'Лук',g:30}]},
    {type:'Ужин',name:'Лосось с брокколи и киноа',kcal:480,p:34,f:22,c:32,time:30,ingredients:[{name:'Лосось',g:150},{name:'Брокколи',g:200},{name:'Киноа',g:80},{name:'Оливковое масло',g:10},{name:'Лимон',g:0.5}]},
    {type:'Перекус',name:'Йогурт с орехами',kcal:170,p:10,f:6,c:18,time:3,ingredients:[{name:'Йогурт натур.',g:200},{name:'Грецкие орехи',g:15}]}
  ];
  let html = `
    <div class="app-page-head"><h1>План питания</h1><p>Подберите рацион на день, неделю или месяц</p></div>
    <div class="tabs">
      <div class="tab active">День</div><div class="tab">2 дня</div><div class="tab">3 дня</div><div class="tab">Неделя</div><div class="tab">Месяц</div>
    </div>
    <div class="tabs" id="meal-tabs">
      <div class="tab" data-meal="0">Завтрак</div><div class="tab" data-meal="1">Обед</div><div class="tab active" data-meal="2">Ужин</div><div class="tab" data-meal="3">Перекус</div>
    </div>
    <div id="meals-list">${mealCard(meals[2],true)}</div>
    <div class="day-totals">
      <h4>Всего за день (вариант 1)</h4>
      <div style="font-size:18px;font-weight:700;margin:6px 0">1120 / 1600 ккал</div>
      ${macroBar('Белки',69,100)}
      ${macroBar('Жиры',40,60)}
      ${macroBar('Углеводы',112,200)}
    </div>
    <div class="home-actions" style="margin-top:18px">
      <button class="btn btn-primary" id="use-only-home">🏠 Только из продуктов дома</button>
      <button class="btn btn-light" id="gen-shopping">🛒 Сформировать покупки</button>
    </div>
  `;
  const asideHtml = `<div class="aside-card"><h4>Стоимость</h4><div style="font-size:24px;font-weight:800;color:var(--g)">~ 820 ₽</div><div style="font-size:13px;color:var(--t2)">средняя на день</div></div>`;
  return [html,asideHtml];
}

function mealCard(m,active){
  if(!active) return '';
  return `<div class="plan-meal-card">
    <h4>${m.type}: ${escapeHtml(m.name)}</h4>
    <div class="macros"><span>⏱ ${m.time} мин</span><span>🔥 ${m.kcal} ккал</span><span>Б:${m.p} Ж:${m.f} У:${m.c}</span></div>
    <details style="margin-top:8px"><summary style="cursor:pointer;font-weight:600;color:var(--g);font-size:14px">📋 Продукты в граммах (сырой вес)</summary>
      <table style="width:100%;margin-top:8px;font-size:14px">
        ${m.ingredients.map(i=>`<tr><td style="padding:4px 0">${escapeHtml(i.name)}</td><td style="text-align:right;font-weight:600">${i.g} г</td></tr>`).join('')}
      </table>
    </details>
    <details style="margin-top:4px"><summary style="cursor:pointer;font-weight:600;color:var(--g);font-size:14px">👩‍🍳 Рецепт приготовления</summary>
      <ol style="margin-top:8px;font-size:14px;padding-left:20px;line-height:1.5">
        <li>Подготовить ингредиенты</li>
        <li>Обработать согласно способу приготовления</li>
        <li>Готовить в течение ${m.time} минут</li>
        <li>Подавать к столу</li>
      </ol>
    </details>
    <div class="actions">
      <button class="btn btn-ghost">🔄 Заменить блюдо</button>
      <button class="btn btn-light">🥕 Заменить ингредиенты</button>
    </div>
  </div>`;
}

function viewShopping(){
  const seedS = window.SEED_DATA && window.SEED_DATA.shopping || [];
  const total = seedS.reduce((s,i)=>s+(i.done?0:i.price),0);
  let html = `
    <div class="app-page-head"><h1>Покупки</h1><p>Автоматически из плана + ваши добавки</p></div>
    <div class="home-actions">
      <button class="btn btn-primary" id="add-shop">+ Добавить</button>
      <button class="btn btn-light">📋 Список</button>
      <button class="btn btn-light">🏬 По отделам</button>
    </div>
    <div class="field-row" id="shop-form" style="display:none;background:var(--g-pale);padding:16px;border-radius:var(--r-md);margin-bottom:14px">
      <div class="field"><label>Название</label><input id="ns-name"></div>
      <div class="field"><label>Количество</label><input id="ns-qty"></div>
      <div class="field"><label>Отдел</label><input id="ns-dept" placeholder="Овощи, Молочное, Крупы..."></div>
      <div class="field"><label>Цена ₽</label><input id="ns-price" type="number"></div>
    </div>
    <button class="btn btn-primary" id="save-shop" style="display:none">Сохранить</button>
    <div id="shop-list" style="margin-top:14px">
      ${seedS.map(s=>shopItem(s)).join('')}
    </div>
    <div class="budget">
      <div><b>Бюджет:</b> 1500 ₽</div>
      <div><b>К оплате:</b> ${total} ₽</div>
    </div>
    <button class="btn btn-primary btn-block" style="margin-top:14px" id="mark-bought">✅ Отметить купленные</button>
  `;
  const asideHtml = `<div class="aside-card"><h4>Подсказки</h4><p style="font-size:13px;color:var(--t2);line-height:1.5">Список автоматически обновляется при изменении плана</p></div>`;
  return [html,asideHtml];
}

function shopItem(s){
  return `<div class="shop-item">
    <span class="shop-check ${s.done?'done':''}"></span>
    <div class="shop-info">
      <div class="shop-name">${escapeHtml(s.name)} <span style="color:var(--t2);font-weight:400;font-size:13px">${s.qty}</span></div>
      <div class="shop-meta">${escapeHtml(s.dept)} • ${s.price} ₽</div>
    </div>
  </div>`;
}

function viewProgress(){
  const weights = (STATE.data.progress && STATE.data.progress.weights) || [];
  let chart = '<p style="color:var(--t2);font-size:13px;text-align:center;padding:30px">Добавьте взвешивания, чтобы увидеть динамику</p>';
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
      ${weights.map((w,i)=>`<circle cx="${xs(i)}" cy="${ys(w.w)}" r="5" fill="#2E7D5C"/><text x="${xs(i)}" y="${ys(w.w)-10}" font-size="11" fill="#5a6b67" text-anchor="middle">${w.w}</text>`).join('')}
    </svg>`;
  }
  let html = `
    <div class="app-page-head"><h1>Прогресс</h1><p>Ваша динамика и достижения</p></div>
    <div class="tabs">
      <div class="tab active">⚖️ Вес</div><div class="tab">📄 Анализы</div><div class="tab">💊 Дефициты</div>
    </div>
    <div class="chart-card">
      <h3 style="margin-bottom:10px">Динамика веса</h3>
      ${chart}
      <div class="field-row" style="margin-top:14px">
        <div class="field"><label>Текущий вес (кг)</label><input id="w-current" type="number"></div>
        <div class="field"><label>Дата</label><input id="w-date" type="date"></div>
        <div class="field" style="justify-content:flex-end"><button class="btn btn-primary" id="add-weight">+ Добавить</button></div>
      </div>
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
  return [html, ''];
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
      <button class="btn btn-light btn-block" style="margin-bottom:8px" id="export-data">📥 Экспортировать данные</button>
      <button class="btn btn-danger btn-block" id="reset-data">🗑 Удалить все данные</button>
    </div>
  `;
  return [html, ''];
}

function bindEvents(){
  document.querySelectorAll('.app-nav-item,.app-bottom-nav a').forEach(a=>{
    a.addEventListener('click',e=>{
      e.preventDefault();
      const s = a.dataset.screen;
      if(s) renderApp(s);
    });
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

  const sb = document.getElementById('save-basic');
  if(sb) sb.addEventListener('click',()=>{
    const p = STATE.data.profile || (STATE.data.profile={});
    p.name = val('pf-name'); p.dob = val('pf-dob'); p.sex = val('pf-sex');
    p.height = +val('pf-h')||0; p.weight = +val('pf-w')||0;
    p.muscle = +val('pf-muscle')||0; p.fat = +val('pf-fat')||0;
    p.visceral = +val('pf-visceral')||0;
    p.activity = val('pf-activity'); p.goal = val('pf-goal'); p.region = val('pf-region');
    save(); toast('✅ Сохранено');
  });
  const sh = document.getElementById('save-health');
  if(sh) sh.addEventListener('click',()=>{
    const p = STATE.data.profile || (STATE.data.profile={});
    p.diagnosis = val('pf-diag'); p.stage = val('pf-stage');
    p.doctorRecs = val('pf-rec'); p.allergies = val('pf-allergies');
    p.intolerance = val('pf-intolerance'); p.forbidden = val('pf-forbidden');
    p.related = val('pf-related'); p.bones = val('pf-bones');
    save(); toast('✅ Сохранено');
  });
  const sp = document.getElementById('save-prefs');
  if(sp) sp.addEventListener('click',()=>{
    const p = STATE.data.profile || (STATE.data.profile={});
    p.likes = val('pf-likes'); p.dislikes = val('pf-dislikes');
    p.protein = val('pf-protein'); p.cook = val('pf-cook');
    p.cuisine = val('pf-cuisine'); p.other = val('pf-other');
    save(); toast('✅ Сохранено');
  });
  const af = document.getElementById('add-family');
  if(af) af.addEventListener('click',()=>{
    const p = STATE.data.profile || (STATE.data.profile={});
    const name = val('fm-name'), age = +val('fm-age'), note = val('fm-note');
    if(name){
      p.family = p.family || [];
      p.family.push({name, age, note});
      save();
      renderApp('profile');
      toast('✅ Добавлено');
    }
  });
  document.querySelectorAll('[data-remove-family]').forEach(b=>{
    b.addEventListener('click',()=>{
      const name = b.dataset.removeFamily;
      const p = STATE.data.profile;
      p.family = (p.family||[]).filter(f=>f.name!==name);
      save(); renderApp('profile');
    });
  });

  const ap = document.getElementById('add-prod');
  if(ap) ap.addEventListener('click',()=>{
    const f = document.getElementById('add-form');
    const s = document.getElementById('save-prod');
    if(f.style.display==='none'){f.style.display='flex';s.style.display='inline-flex';ap.textContent='× Отмена';}
    else{f.style.display='none';s.style.display='none';ap.textContent='+ Добавить';}
  });
  const sp2 = document.getElementById('save-prod');
  if(sp2) sp2.addEventListener('click',()=>{
    const name = val('np-name'), qty = val('np-qty'), buy = val('np-buy'), exp = val('np-exp');
    if(name){
      const days = exp ? Math.max(0, Math.round((new Date(exp)-new Date())/86400000)) : 7;
      window.SEED_DATA.products.push({id:'np'+Date.now(),name,qty,emoji:'🥗',days,exp:exp||'—',warn:days<=3});
      save(); renderApp('products'); toast('✅ Продукт добавлен');
    }
  });

  const as = document.getElementById('add-shop');
  if(as) as.addEventListener('click',()=>{
    const f = document.getElementById('shop-form');
    const s = document.getElementById('save-shop');
    if(f.style.display==='none'){f.style.display='flex';s.style.display='inline-flex';as.textContent='× Отмена';}
    else{f.style.display='none';s.style.display='none';as.textContent='+ Добавить';}
  });
  const ss = document.getElementById('save-shop');
  if(ss) ss.addEventListener('click',()=>{
    const name = val('ns-name'), qty = val('ns-qty'), dept = val('ns-dept'), price = +val('ns-price')||0;
    if(name){
      window.SEED_DATA.shopping.push({id:'ns'+Date.now(),name,qty,price,dept,done:false});
      save(); renderApp('shopping'); toast('✅ Добавлено в покупки');
    }
  });
  const mb = document.getElementById('mark-bought');
  if(mb) mb.addEventListener('click',()=>{
    document.querySelectorAll('.shop-check:not(.done)').forEach(c=>c.classList.add('done'));
    toast('✅ Отмечено');
  });

  const aw = document.getElementById('add-weight');
  if(aw) aw.addEventListener('click',()=>{
    const w = +val('w-current'), d = val('w-date') || new Date().toISOString().slice(0,10);
    if(w){
      const p = STATE.data.progress || (STATE.data.progress={});
      p.weights = p.weights || [];
      p.weights.push({d,w});
      save(); renderApp('progress'); toast('✅ Вес добавлен');
    }
  });

  const ed = document.getElementById('export-data');
  if(ed) ed.addEventListener('click',()=>{
    const blob = new Blob([JSON.stringify(STATE.data,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'navigator-data.json';
    a.click();
    toast('📥 Данные скачаны');
  });
  const rd = document.getElementById('reset-data');
  if(rd) rd.addEventListener('click',()=>{
    if(confirm('Удалить все данные?')){localStorage.removeItem(STORAGE_KEY);location.reload();}
  });

  ['add-voice','add-photo','add-barcode','add-receipt','upload-pdf','upload-photo',
   'cook-this','voice-btn','photo-btn','add-miss','more-recipes','more-prod','use-only-home','gen-shopping'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('click',()=>toast('В разработке — скоро будет ✨'));
  });
}

function val(id){ const e = document.getElementById(id); return e?e.value:''; }
function initials(n){ if(!n) return '?'; return n.trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase(); }
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toast(msg){
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style,{position:'fixed',bottom:'90px',left:'50%',transform:'translateX(-50%)',background:'#1f2a28',color:'#fff',padding:'10px 18px',borderRadius:'20px',fontSize:'14px',zIndex:'200',boxShadow:'0 4px 12px rgba(0,0,0,.2)'});
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),2500);
}

const mm = document.getElementById('app-mobile-menu');
if(mm) mm.addEventListener('click',()=>document.querySelector('.app-sidebar').classList.toggle('mobile-open'));

document.querySelectorAll('.ld-nav a').forEach(a=>{
  a.addEventListener('click',e=>{
    const href = a.getAttribute('href');
    if(href && href.startsWith('#')){
      e.preventDefault();
      const t = document.querySelector(href);
      if(t) t.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });
});

})();
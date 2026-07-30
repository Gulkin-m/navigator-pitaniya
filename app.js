/* ===== Навигатор питания — логика ===== */
(function(){
'use strict';

var KEY = 'navigator_data_v2';

/* ---------- Хранилище ---------- */
function load(){
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch(e){}
  var seed = (window.SEED_DATA ? JSON.parse(JSON.stringify(window.SEED_DATA)) : {});
  localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(DATA)); }catch(e){} }
var DATA = load();

/* ---------- Утилиты ---------- */
function el(sel){ return document.querySelector(sel); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function show(id){
  ['screen-splash','screen-intro','screen-landing','screen-app'].forEach(function(s){
    var n = document.getElementById(s); if(n) n.classList.remove('active');
  });
  var t = document.getElementById(id); if(t) t.classList.add('active');
  window.scrollTo(0,0);
}
function foodThumb(cat){
  var map={protein:'#F3D9C0',dairy:'#EAF2FF',carb:'#F6E7C8',veg:'#E3F3DD',fruit:'#F8E1EC',fat:'#FBEFCB',nuts:'#EFE3D6'};
  return map[cat]||'#E8F4EE';
}

/* SVG-иконка листа для логотипов */
var LEAF='<svg class="leaf" viewBox="0 0 24 24" fill="none"><path d="M4 20C4 12 10 5 20 4c0 10-7 16-16 16z" fill="#2E7D5C"/><path d="M12 12c2-3 5-5 8-6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>';
function icn(p){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>'; }
var ICONS={
  home:icn('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'),
  user:icn('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'),
  box:icn('<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/>'),
  plan:icn('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>'),
  out:icn('<path d="M4 21V10l8-6 8 6v11"/><path d="M9 21v-6h6v6"/>'),
  cart:icn('<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11l2-8H6"/>'),
  chart:icn('<path d="M4 20V4M4 20h16"/><path d="M8 16l3-4 3 2 4-6"/>'),
  gear:icn('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
  gift:icn('<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13M8 8a2 2 0 110-4c2 0 4 4 4 4M16 8a2 2 0 100-4c-2 0-4 4-4 4"/>'),
  help:icn('<path d="M4 14a8 8 0 1116 0"/><rect x="2" y="14" width="4" height="6" rx="1"/><rect x="18" y="14" width="4" height="6" rx="1"/>')
};
var NAV=[
  {id:'home',t:'Главная',i:'home'},{id:'profile',t:'Профиль',i:'user'},
  {id:'products',t:'Продукты дома',i:'box'},{id:'plan',t:'План питания',i:'plan'},
  {id:'out',t:'Вне дома',i:'out'},{id:'shopping',t:'Покупки',i:'cart'},
  {id:'progress',t:'Прогресс',i:'chart'},{id:'settings',t:'Настройки',i:'gear'}
];

/* ============================================================
   ЭКРАН 3: ЛЕНДИНГ
============================================================ */
function renderLanding(){
  var feats=[
    ['Учитываем здоровье и рекомендации врача','<path d="M12 21s-7-4.3-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.7-9 9-9 9z"/>'],
    ['Готовые блюда и рецепты','<path d="M4 7h16M6 7v13h12V7M9 3v4M15 3v4"/>'],
    ['Используем продукты, которые есть дома','<path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7"/>'],
    ['Планируйте на день, неделю или больше','<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/>'],
    ['Подсказываем, что купить в магазине','<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11l2-8H6"/>'],
    ['Безопасно и конфиденциально','<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>']
  ].map(function(f){return '<div class="feat"><span class="ic">'+icn(f[1])+'</span><span>'+f[0]+'</span></div>';}).join('');

  var steps=[
    ['Создайте профиль','Укажите данные о себе и вашей семье'],
    ['Расскажите о здоровье и предпочтениях','Укажите рекомендации врача, аллергии, цели и вкусы'],
    ['Добавьте продукты дома','Вручную, фото или скан чека — мы учтём, что у вас есть'],
    ['Получите персональный план','Блюда, рецепты и список покупок — всегда под рукой']
  ].map(function(s,i){return '<div class="step"><div class="num">'+(i+1)+'</div><h3>'+s[0]+'</h3><p>'+s[1]+'</p></div>';}).join('');

  var help=[
    ['Планирование питания','На день, неделю или месяц вперёд','<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/>'],
    ['Для всей семьи','Учитываем ограничения каждого','<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5M15 20c0-2 2-3 4-3s2 1 2 3"/>'],
    ['Учёт здоровья и рекомендаций','Диеты, аллергии, назначения врача','<path d="M12 21s-7-4.3-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.7-9 9-9 9z"/>'],
    ['Список покупок автоматически','Формируем из недостающих продуктов','<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11l2-8H6"/>'],
    ['Питание вне дома','Подскажем в ресторане и в гостях','<path d="M4 3v18M4 3c3 0 3 5 0 5M8 3v6a3 3 0 01-3 3M18 3v18M18 12c3 0 3-9 0-9"/>'],
    ['Голосовой ввод и фото продуктов','Добавляйте продукты быстро','<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0012 0M12 17v4"/>'],
    ['Загрузка анализов и документов','Учтём ваши показатели','<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v5h5M9 13h6M9 17h6"/>']
  ].map(function(h){return '<div class="help-card"><div class="ic">'+icn(h[2])+'</div><h3>'+h[0]+'</h3><p>'+h[1]+'</p></div>';}).join('');

  var who=[
    ['\u2764\uFE0F','Людям с хроническими заболеваниями'],
    ['\uD83D\uDC6A','Семьям'],
    ['\uD83C\uDFC3','Спортсменам и активным людям'],
    ['\uD83D\uDC75','Пожилым людям'],
    ['\uD83C\uDF4F','Всем, кто хочет питаться правильно и с пользой']
  ].map(function(w){return '<div class="who-card"><div class="em">'+w[0]+'</div><p>'+w[1]+'</p></div>';}).join('');

  var revs=[
    ['Анна','34','Наконец-то не нужно каждый день думать, что приготовить. План учитывает мой гастрит — стало намного легче.'],
    ['Мария','52','Готовлю на всю семью, у дочки аллергия на орехи. Приложение всё запомнило и подбирает безопасные блюда.'],
    ['Игорь','28','Считаю БЖУ для тренировок. Удобно, что калории и белки уже посчитаны, а список покупок собирается сам.']
  ].map(function(r){return '<div class="rev-card"><div class="rev-head"><div class="rev-avatar">'+r[0][0]+'</div><div><b>'+r[0]+'</b><small>'+r[1]+' года</small></div></div><div class="stars">\u2605\u2605\u2605\u2605\u2605</div><p>'+r[2]+'</p></div>';}).join('');

  var phone='<div class="phone"><div class="phone-screen">'+
    '<div class="phone-top"><small>Добрый вечер!</small><h4>Что приготовить сейчас?</h4></div>'+
    '<div class="phone-body">'+
      '<div class="mini-card"><div class="thumb" style="background:'+foodThumb('protein')+'"></div><b>Курица с брокколи</b>'+
        '<div class="mini-macros"><span>25 мин</span><span>520 ккал</span><span>Б42</span><span>Ж24</span><span>У18</span></div></div>'+
      '<div class="mini-card"><div class="thumb" style="background:'+foodThumb('carb')+'"></div><b>Овсянка с ягодами</b>'+
        '<div class="mini-macros"><span>10 мин</span><span>290 ккал</span></div></div>'+
    '</div></div></div>';

  el('#screen-landing').innerHTML =
  '<header class="lp-header">'+
    '<div class="lp-logo">'+LEAF+'<span>Ваш персональный помощник по питанию</span></div>'+
    '<nav class="lp-nav">'+
      '<a href="#how">Как это работает</a><a href="#help">Чем мы можем помочь</a>'+
      '<a href="#who">Кому подойдёт</a><a href="#rev">Отзывы</a><a href="#faq">Вопросы и ответы</a>'+
    '</nav>'+
    '<button class="btn btn-green btn-sm js-open-app">Начать бесплатно</button>'+
  '</header>'+

  '<div class="lp-hero">'+
    '<div>'+
      '<h1>Персональное питание, продуманное для вас</h1>'+
      '<p class="lead">Мы подбираем рацион с учётом вашего здоровья, продуктов дома и рекомендаций врача. Экономим ваше время и заботимся о всей семье.</p>'+
      '<div class="feat-grid">'+feats+'</div>'+
      '<button class="btn btn-green js-open-app">Начать бесплатно</button>'+
      '<div class="cta-sub">7 дней бесплатно • Без привязки карты</div>'+
      '<div class="cta-note"><span class="note-sticker">Ответьте на несколько вопросов — остальное мы сделаем за вас.</span></div>'+
    '</div>'+
    '<div>'+phone+'</div>'+
  '</div>'+

  '<section class="lp-section" id="how"><h2>Как это работает</h2><p class="sub">Всего четыре простых шага</p><div class="steps">'+steps+'</div></section>'+
  '<section class="lp-section" id="help" style="background:#fff"><h2>Чем мы можем помочь</h2><p class="sub">Всё для удобного и полезного питания</p><div class="help-grid">'+help+'</div></section>'+
  '<section class="lp-section" id="who"><h2>Кому подойдёт</h2><p class="sub">Мы помогаем разным людям</p><div class="who-grid">'+who+'</div></section>'+
  '<section class="lp-section" id="rev" style="background:#fff"><h2>Отзывы наших пользователей</h2><p class="sub">Нам доверяют</p><div class="rev-grid">'+revs+'</div></section>'+
  '<section class="lp-section" id="faq"><div class="faq-cta"><h2>Остались вопросы?</h2><p class="sub" style="margin:8px 0 20px">Мы собрали ответы на самые частые вопросы</p><button class="btn btn-green js-open-app">Перейти в вопросы и ответы</button></div></section>'+

  '<footer class="lp-footer">'+
    '<div class="footer-top">'+
      '<div><div class="lp-logo" style="color:#fff">'+LEAF+'<span>Помощник по питанию</span></div>'+
        '<div class="socials"><span>IG</span><span>VK</span><span>YT</span><span>TG</span></div></div>'+
      '<div><h4>О сервисе</h4><a href="#">О нас</a><a href="#">Команда</a><a href="#">Блог</a></div>'+
      '<div><h4>Помощь</h4><a href="#">Вопросы и ответы</a><a href="#">Поддержка</a><a href="#">Обратная связь</a></div>'+
      '<div><h4>Документы</h4><a href="#">Политика конфиденциальности</a><a href="#">Пользовательское соглашение</a></div>'+
      '<div><h4>Начните сейчас</h4><button class="btn btn-green btn-sm js-open-app">Начать бесплатно</button><div class="cta-sub" style="color:#9fb6ac">7 дней бесплатно • Без привязки карты</div></div>'+
    '</div>'+
    '<div class="footer-bottom">© 2024 Ваш персональный помощник по питанию. Все права защищены.</div>'+
  '</footer>';

  Array.prototype.forEach.call(document.querySelectorAll('.js-open-app'),function(b){
    b.addEventListener('click',function(){ openApp(); });
  });
}

/* ============================================================
   ЭКРАН 4: ЛИЧНЫЙ КАБИНЕТ
============================================================ */
var CUR='home';
function openApp(){ show('screen-app'); renderApp(); }

function renderApp(){
  var nav = NAV.map(function(n){
    return '<button class="nav-item'+(n.id===CUR?' active':'')+'" data-nav="'+n.id+'"><span class="ic">'+ICONS[n.i]+'</span>'+n.t+'</button>';
  }).join('');
  var mob = [['home','Главная','home'],['profile','Профиль','user'],['products','Продукты','box'],['plan','План','plan'],['shopping','Покупки','cart']]
    .map(function(m){return '<button class="mn-item'+(m[0]===CUR?' active':'')+'" data-nav="'+m[0]+'"><span class="ic">'+ICONS[m[2]]+'</span>'+m[1]+'</button>';}).join('');

  el('#screen-app').innerHTML =
  '<div class="app-shell">'+
    '<aside class="side">'+
      '<div class="side-title">'+LEAF+'Ваш помощник по питанию</div>'+
      nav+
      '<div class="side-promo"><b>'+ICONS.gift+' Премиум</b><p>Расширенные возможности и персональные рекомендации</p><button class="btn btn-sm" style="background:#fff;color:var(--green)">Перейти</button></div>'+
      '<div class="side-help"><b>'+ICONS.help+' Нужна помощь?</b>Напишите нам в поддержку</div>'+
    '</aside>'+
    '<main class="main" id="app-main"></main>'+
    '<aside class="aside" id="app-aside"></aside>'+
  '</div>'+
  '<nav class="mobile-nav">'+mob+'</nav>';

  Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'),function(b){
    b.addEventListener('click',function(){ CUR=b.getAttribute('data-nav'); renderApp(); });
  });
  renderMain();
}

function avatarLetter(){ return (DATA.profile.name||'?').trim().charAt(0).toUpperCase(); }
function topBar(){
  return '<div class="main-top"><div class="greet">Личный кабинет</div>'+
    '<div class="user-badge"><span>'+esc(DATA.profile.name)+'</span><div class="avatar">'+avatarLetter()+'</div></div></div>';
}

function renderMain(){
  var m = el('#app-main'), a = el('#app-aside');
  a.innerHTML=''; a.classList.remove('show');
  var fn = {home:paneHome,profile:paneProfile,products:paneProducts,plan:panePlan,out:paneOut,shopping:paneShopping,progress:paneProgress,settings:paneSettings}[CUR];
  m.innerHTML = topBar() + fn(a);
  bindPane();
}

/* ---- Главная ---- */
var TAGS={ready:['\u2705','Можно приготовить сейчас'],healthy:['\u2B50','Самый полезный'],fast:['\u26A1','Самый быстрый'],cheap:['\uD83D\uDCB0','Самый экономичный'],favorite:['\u2764\uFE0F','Любимый']};
function dishCard(d){
  var t=TAGS[d.tag]||['',''];
  return '<div class="dish-card"><div class="dish-thumb" style="background:'+foodThumb('protein')+'">'+
    '<span class="dish-tag">'+t[0]+' '+t[1]+'</span></div>'+
    '<div class="dish-body"><h4>'+esc(d.name)+'</h4>'+
    '<div class="dish-meta">'+d.time+' мин • '+d.kcal+' ккал</div>'+
    '<div class="macros"><span>Б: '+d.p+' г</span><span>Ж: '+d.f+' г</span><span>У: '+d.c+' г</span></div>'+
    (d.note?'<div class="dish-note">'+esc(d.note)+'</div>':'')+'</div></div>';
}
function paneHome(aside){
  var hour=new Date().getHours();
  var greet=hour<6?'Доброй ночи':hour<12?'Доброе утро':hour<18?'Добрый день':'Добрый вечер';
  var dishes=DATA.dishes.map(dishCard).join('');
  var stock=DATA.products.slice(0,6).map(function(p){
    return '<div class="stock-chip">'+esc(p.name)+' <span class="q">'+esc(p.qty)+'</span></div>';}).join('');
  var miss=DATA.missing.map(function(p){
    return '<div class="stock-chip miss">'+esc(p.name)+' <span class="q">'+esc(p.qty)+'</span></div>';}).join('');

  /* правый сайдбар */
  var meals=[['breakfast','Завтрак'],['lunch','Обед'],['dinner','Ужин'],['snack','Перекус']].map(function(mm){
    var p=DATA.plan[mm[0]];
    return '<div class="meal'+(p.done?' done':'')+'" data-meal="'+mm[0]+'"><span class="chk">'+(p.done?'\u2713':'')+'</span>'+
      '<div><b>'+mm[1]+'</b><small>'+esc(p.name)+'</small></div></div>';
  }).join('');
  var s=DATA.summary, g=DATA.profile;
  var pct=Math.min(100,Math.round(s.kcal/g.goalKcal*100));
  aside.classList.add('show');
  aside.innerHTML=
    '<div><h3>Ваш план на сегодня</h3>'+meals+
      '<button class="btn btn-ghost btn-block btn-sm" style="margin-top:12px" data-nav="plan">Открыть план</button></div>'+
    '<div style="margin-top:26px"><h3>Дневная сводка</h3>'+
      '<div class="greet" style="margin-bottom:8px">Цель: '+g.goalKcal+' ккал</div>'+
      '<div class="ring-wrap">'+ringSvg(pct)+'<div><b style="font-size:20px">'+s.kcal+' / '+g.goalKcal+'</b><div class="greet">ккал</div></div></div>'+
      '<div class="bars">'+
        bar('Белки',s.protein,g.goalProtein,'p')+bar('Жиры',s.fat,g.goalFat,'f')+bar('Углеводы',s.carb,g.goalCarb,'c')+
      '</div>'+
      '<button class="btn btn-gray btn-block btn-sm" style="margin-top:10px" data-nav="progress">Подробнее</button></div>';

  return '<h2 class="section-title">'+greet+', '+esc(g.name)+'! \u2B50</h2>'+
    '<h3 style="margin-bottom:12px">Что приготовить прямо сейчас?</h3>'+
    '<div class="h-scroll">'+dishes+'</div>'+
    '<button class="btn btn-gray btn-sm" style="margin-top:10px">Показать ещё варианты</button>'+
    '<div class="card"><h3>У вас есть</h3><div class="chips">'+stock+'</div>'+
      '<button class="btn btn-ghost btn-sm" style="margin-top:12px" data-nav="products">Показать все</button></div>'+
    '<div class="card"><h3>Не хватает</h3><div class="chips">'+miss+'</div>'+
      '<button class="btn btn-green btn-sm" style="margin-top:12px" id="add-all-shop">Добавить всё в список покупок</button></div>'+
    '<div class="actions-row">'+
      '<button class="btn btn-green">Приготовить это блюдо</button>'+
      '<button class="btn btn-gray">\uD83C\uDFA4 Голосовой ввод</button>'+
      '<button class="btn btn-gray">\uD83D\uDCF7 Фото продуктов</button>'+
    '</div>';
}
function ringSvg(pct){
  var r=26,c=2*Math.PI*r,off=c*(1-pct/100);
  return '<svg width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="'+r+'" fill="none" stroke="#E4EAE7" stroke-width="8"/>'+
    '<circle cx="36" cy="36" r="'+r+'" fill="none" stroke="#2E7D5C" stroke-width="8" stroke-linecap="round" stroke-dasharray="'+c+'" stroke-dashoffset="'+off+'" transform="rotate(-90 36 36)"/>'+
    '<text x="36" y="41" text-anchor="middle" font-size="15" font-weight="800" fill="#2E7D5C">'+pct+'%</text></svg>';
}
function bar(lbl,val,goal,cls){
  var pct=Math.min(100,Math.round(val/goal*100));
  return '<div class="bar-row"><div class="lbl"><span>'+lbl+'</span><span>'+val+' / '+goal+' г</span></div>'+
    '<div class="bar '+cls+'"><i style="width:'+pct+'%"></i></div></div>';
}

/* ---- Профиль ---- */
function acc(title,body,open){
  return '<div class="accordion'+(open?' open':'')+'"><button class="acc-head js-acc">'+title+'<span>+</span></button><div class="acc-body">'+body+'</div></div>';
}
function paneProfile(){
  var p=DATA.profile;
  return '<div class="card" style="margin-top:0"><div style="display:flex;gap:16px;align-items:center">'+
      '<div class="avatar" style="width:64px;height:64px;font-size:26px">'+avatarLetter()+'</div>'+
      '<div style="flex:1"><h2 style="font-size:22px">'+esc(p.name)+'</h2><div class="greet">'+p.age+' года, '+esc(p.sex)+'</div></div>'+
      '<button class="btn btn-ghost btn-sm" id="edit-profile">Редактировать</button></div>'+
      '<div style="margin-top:16px"><div class="greet">Профиль заполнен на '+p.completion+'%</div>'+
      '<div class="progress-bar"><i style="width:'+p.completion+'%"></i></div></div></div>'+
    '<div style="margin-top:14px">'+
      acc('Основные данные','Имя: '+esc(p.name)+'<br>Возраст: '+p.age+'<br>Пол: '+esc(p.sex)+'<br>Цель по калориям: '+p.goalKcal+' ккал',true)+
      acc('Здоровье',esc(p.health))+
      acc('Анализы','Загруженных документов пока нет. Здесь появятся ваши анализы и показатели.')+
      acc('Предпочтения',esc(p.prefs))+
      acc('Семья',esc(p.family))+
    '</div>';
}

/* ---- Продукты дома ---- */
function paneProducts(){
  var chips=['Вручную','Голосом','Фото','Штрихкод','Чек'].map(function(c){return '<span class="pill">'+c+'</span>';}).join('');
  var rows=DATA.products.map(function(p){
    var days=p.days<=1?'<span class="warn">'+p.days+' день</span>':p.days+' дн.';
    return '<div class="list-row"><div class="ava">'+esc(p.name.charAt(0))+'</div>'+
      '<div><b>'+esc(p.name)+'</b><small>'+esc(p.qty)+' • осталось '+days+'</small></div></div>';
  }).join('');
  return '<h2 class="section-title">Продукты дома</h2>'+
    '<button class="btn btn-green">+ Добавить</button>'+
    '<div class="chips" style="margin:14px 0">'+chips+'</div>'+
    rows+
    '<button class="btn btn-gray btn-sm" style="margin-top:8px">Показать все продукты ('+DATA.products.length+')</button>';
}

/* ---- План питания ---- */
function panePlan(){
  var per=['День','2 дня','3 дня','Неделя','Месяц'].map(function(t,i){return '<span class="tab'+(i===0?' active':'')+'">'+t+'</span>';}).join('');
  var meals=['Завтрак','Обед','Ужин','Перекусы'].map(function(t,i){return '<span class="tab'+(i===2?' active':'')+'">'+t+'</span>';}).join('');
  var d=DATA.dishes[5]||DATA.dishes[0];
  var s=DATA.summary,g=DATA.profile;
  return '<h2 class="section-title">План питания</h2>'+
    '<div class="tabs">'+per+'</div><div class="tabs">'+meals+'</div>'+
    dishCard(d)+
    '<div class="actions-row"><button class="btn btn-ghost">Заменить блюдо</button><button class="btn btn-gray">Заменить ингредиенты</button></div>'+
    '<div class="card"><h3>Дневная сводка</h3><div class="greet">'+s.kcal+' / '+g.goalKcal+' ккал</div>'+
      '<div class="bars" style="margin-top:10px">'+bar('Белки',s.protein,g.goalProtein,'p')+bar('Жиры',s.fat,g.goalFat,'f')+bar('Углеводы',s.carb,g.goalCarb,'c')+'</div></div>';
}

/* ---- Вне дома ---- */
function paneOut(){
  var good=['Куриная грудка на гриле','Овощи на пару','Рыба запечённая','Салат без острой заправки'].map(function(x){return '<li>'+x+'</li>';}).join('');
  var bad=['Жареное и жирное','Острые соусы','Свежая капуста и бобовые','Газированные напитки'].map(function(x){return '<li>'+x+'</li>';}).join('');
  return '<h2 class="section-title">Вне дома</h2>'+
    '<div class="tabs"><span class="tab active" data-out="rest">Ресторан</span><span class="tab" data-out="guest">В гостях</span></div>'+
    '<div id="out-rest">'+
      '<div class="card" style="margin-top:0"><h3>Ресторан Green Garden</h3>'+
        '<div class="actions-row"><button class="btn btn-gray btn-sm">Меню</button><button class="btn btn-gray btn-sm">Ссылка</button><button class="btn btn-gray btn-sm">Фото меню</button></div></div>'+
      '<div class="card"><h3>Рекомендации AI</h3><div class="two-col">'+
        '<div><b style="color:var(--green)">Рекомендуем</b><ul class="rec-list good">'+good+'</ul></div>'+
        '<div><b style="color:var(--red)">Избегать</b><ul class="rec-list bad">'+bad+'</ul></div></div>'+
        '<button class="btn btn-green btn-sm" style="margin-top:12px">Задать вопрос AI</button></div>'+
    '</div>'+
    '<div id="out-guest" style="display:none"><div class="card" style="margin-top:0"><h3>В гостях</h3>'+
      '<textarea rows="3" placeholder="Опишите меню словами или голосом..."></textarea>'+
      '<button class="btn btn-green btn-sm" style="margin-top:12px">Получить рекомендации</button></div></div>';
}

/* ---- Покупки ---- */
function paneShopping(){
  var spent=DATA.shopping.filter(function(x){return x.done;}).reduce(function(a,b){return a+b.price;},0);
  var left=DATA.budget-spent;
  var doneN=DATA.shopping.filter(function(x){return x.done;}).length;
  var rows=DATA.shopping.map(function(s){
    return '<div class="list-row"><div class="chk-box'+(s.done?' on':'')+'" data-shop="'+s.id+'">'+(s.done?'\u2713':'')+'</div>'+
      '<div><b>'+esc(s.name)+'</b><small>'+esc(s.qty)+' • '+esc(s.dept)+'</small></div>'+
      '<div class="right"><b>'+s.price+' \u20BD</b></div></div>';
  }).join('');
  return '<h2 class="section-title">Покупки</h2>'+
    '<button class="btn btn-green">+ Добавить</button>'+
    '<div class="tabs" style="margin-top:14px"><span class="tab active">Список</span><span class="tab">По отделам</span></div>'+
    rows+
    '<div class="card"><div style="display:flex;justify-content:space-between"><span>Бюджет</span><b>'+DATA.budget+' \u20BD</b></div>'+
      '<div style="display:flex;justify-content:space-between;margin-top:6px"><span>Остаток</span><b style="color:'+(left<0?'var(--red)':'var(--green)')+'">'+left+' \u20BD</b></div></div>'+
    '<button class="btn btn-green btn-block" style="margin-top:12px">Отметить купленные ('+doneN+')</button>';
}

/* ---- Прогресс ---- */
function paneProgress(){
  var w=DATA.progress.weight;
  var hist=DATA.progress.history.map(function(h){
    return '<div style="margin-bottom:10px"><div class="lbl" style="display:flex;justify-content:space-between;font-size:13px"><span>'+h.week+'</span><span>'+h.pct+'%</span></div>'+
      '<div class="progress-bar"><i style="width:'+h.pct+'%"></i></div></div>';
  }).join('');
  return '<h2 class="section-title">Прогресс</h2>'+
    '<div class="tabs"><span class="tab active">Вес</span><span class="tab">Анализы</span><span class="tab">Дефициты</span></div>'+
    '<div class="chart">'+weightChart(w)+'</div>'+
    '<div class="card"><h3>История планов</h3>'+hist+
      '<button class="btn btn-ghost btn-sm">Посмотреть все</button></div>';
}
function weightChart(w){
  var W=560,H=180,pad=30;
  var vals=w.map(function(p){return p.kg;});
  var min=Math.min.apply(null,vals)-0.5,max=Math.max.apply(null,vals)+0.5;
  var pts=w.map(function(p,i){
    var x=pad+(W-2*pad)*(i/(w.length-1));
    var y=pad+(H-2*pad)*(1-(p.kg-min)/(max-min));
    return [x,y];
  });
  var poly=pts.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ');
  var dots=pts.map(function(p,i){return '<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="4" fill="#2E7D5C"/>'+
    '<text x="'+p[0].toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="10" fill="#6B7A72">'+w[i].date+'</text>';}).join('');
  return '<svg viewBox="0 0 '+W+' '+H+'" width="100%"><polyline points="'+poly+'" fill="none" stroke="#2E7D5C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'+dots+'</svg>';
}

/* ---- Настройки ---- */
function paneSettings(){
  var s=DATA.settings;
  return '<h2 class="section-title">Настройки</h2>'+
    '<div class="card" style="margin-top:0"><div class="list-row" style="box-shadow:none;margin:0"><div><b>Напоминания о приёмах пищи</b><small>Мягкие подсказки в течение дня</small></div>'+
      '<div class="right"><button class="btn '+(s.reminders?'btn-green':'btn-gray')+' btn-sm" id="toggle-rem">'+(s.reminders?'Включены':'Выключены')+'</button></div></div></div>'+
    '<div class="card"><b>Данные приложения</b><p class="greet" style="margin:8px 0">Все ваши данные хранятся только на этом устройстве. Ничего не отправляется на сервер.</p>'+
      '<button class="btn btn-gray btn-sm" id="reset-data">Сбросить демо-данные</button></div>'+
    '<div class="card"><b>О приложении</b><p class="greet" style="margin-top:8px">Навигатор питания • версия 2.0<br>Работает офлайн как PWA.</p></div>';
}

/* ---------- Обработчики внутри разделов ---------- */
function bindPane(){
  Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'),function(b){
    if(b.__b) return; b.__b=1;
    b.addEventListener('click',function(){ CUR=b.getAttribute('data-nav'); renderApp(); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.js-acc'),function(b){
    b.addEventListener('click',function(){
      var box=b.parentElement; box.classList.toggle('open');
      b.querySelector('span').textContent=box.classList.contains('open')?'\u2212':'+';
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-meal]'),function(b){
    b.addEventListener('click',function(){
      var k=b.getAttribute('data-meal'); DATA.plan[k].done=!DATA.plan[k].done; save(); renderMain();
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-shop]'),function(b){
    b.addEventListener('click',function(){
      var id=b.getAttribute('data-shop');
      DATA.shopping.forEach(function(s){ if(s.id===id) s.done=!s.done; });
      save(); renderMain();
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-out]'),function(b){
    b.addEventListener('click',function(){
      var v=b.getAttribute('data-out');
      Array.prototype.forEach.call(document.querySelectorAll('[data-out]'),function(x){x.classList.remove('active');});
      b.classList.add('active');
      el('#out-rest').style.display=v==='rest'?'block':'none';
      el('#out-guest').style.display=v==='guest'?'block':'none';
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.tabs .tab:not([data-out])'),function(b){
    b.addEventListener('click',function(){
      var sib=b.parentElement.querySelectorAll('.tab');
      Array.prototype.forEach.call(sib,function(x){x.classList.remove('active');});
      b.classList.add('active');
    });
  });
  var addAll=el('#add-all-shop');
  if(addAll) addAll.addEventListener('click',function(){
    DATA.missing.forEach(function(m){
      if(!DATA.shopping.some(function(s){return s.name===m.name;}))
        DATA.shopping.push({id:'x'+Date.now()+Math.random().toString(36).slice(2,5),name:m.name,qty:m.qty,price:0,dept:'Прочее',done:false});
    });
    save(); addAll.textContent='Добавлено!'; addAll.disabled=true;
  });
  var edit=el('#edit-profile');
  if(edit) edit.addEventListener('click',function(){
    var name=prompt('Ваше имя:',DATA.profile.name);
    if(name){ DATA.profile.name=name.trim(); save(); renderMain(); }
  });
  var rem=el('#toggle-rem');
  if(rem) rem.addEventListener('click',function(){ DATA.settings.reminders=!DATA.settings.reminders; save(); renderMain(); });
  var reset=el('#reset-data');
  if(reset) reset.addEventListener('click',function(){
    if(confirm('Сбросить все данные и вернуть демо-версию?')){
      localStorage.removeItem(KEY); DATA=load(); CUR='home'; renderApp();
    }
  });
}

/* ============================================================
   РОУТЕР ЭКРАНОВ 1-2
============================================================ */
document.addEventListener('DOMContentLoaded',function(){
  renderLanding();

  var splash=el('#screen-splash');
  var goIntro=function(){ show('screen-intro'); };
  var timer=setTimeout(goIntro,5000);
  el('#splash-go').addEventListener('click',function(e){ e.stopPropagation(); clearTimeout(timer); goIntro(); });
  splash.addEventListener('click',function(){ clearTimeout(timer); goIntro(); });

  el('#intro-start').addEventListener('click',function(){ show('screen-landing'); });

  /* Быстрый вход: если пользователь уже знакомился — открывать ЛК по хэшу */
  if(location.hash==='#app'){ openApp(); }
});

})();

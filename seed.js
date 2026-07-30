window.SEED_FOODS = [
  {name:'Куриная грудка',category:'protein',kcal:165,protein_g:31,fat_g:3.6,carb_g:0},
  {name:'Индейка (грудка)',category:'protein',kcal:135,protein_g:30,fat_g:1,carb_g:0},
  {name:'Говядина (нежирная)',category:'protein',kcal:158,protein_g:26,fat_g:6,carb_g:0},
  {name:'Треска',category:'protein',kcal:82,protein_g:18,fat_g:0.7,carb_g:0},
  {name:'Лосось',category:'protein',kcal:208,protein_g:20,fat_g:13,carb_g:0},
  {name:'Яйцо куриное',category:'protein',kcal:143,protein_g:13,fat_g:10,carb_g:1},
  {name:'Творог 5%',category:'dairy',kcal:121,protein_g:17,fat_g:5,carb_g:3},
  {name:'Кефир 1%',category:'dairy',kcal:40,protein_g:3,fat_g:1,carb_g:4},
  {name:'Йогурт натуральный',category:'dairy',kcal:60,protein_g:5,fat_g:2,carb_g:7},
  {name:'Молоко 2.5%',category:'dairy',kcal:54,protein_g:3,fat_g:2.5,carb_g:4.7},
  {name:'Сыр',category:'dairy',kcal:340,protein_g:25,fat_g:25,carb_g:2},
  {name:'Сливки 10%',category:'dairy',kcal:118,protein_g:3,fat_g:10,carb_g:4},
  {name:'Рис белый',category:'carb',kcal:130,protein_g:2.7,fat_g:0.3,carb_g:28},
  {name:'Гречка',category:'carb',kcal:343,protein_g:13,fat_g:3.4,carb_g:68},
  {name:'Овсянка',category:'carb',kcal:366,protein_g:12,fat_g:7,carb_g:60},
  {name:'Киноа',category:'carb',kcal:368,protein_g:14,fat_g:6,carb_g:64},
  {name:'Хлеб пшеничный',category:'carb',kcal:265,protein_g:8,fat_g:2,carb_g:50},
  {name:'Картофель',category:'veg',kcal:77,protein_g:2,fat_g:0.1,carb_g:17},
  {name:'Морковь',category:'veg',kcal:41,protein_g:0.9,fat_g:0.2,carb_g:10},
  {name:'Брокколи',category:'veg',kcal:34,protein_g:2.8,fat_g:0.4,carb_g:7},
  {name:'Цветная капуста',category:'veg',kcal:25,protein_g:1.9,fat_g:0.3,carb_g:5},
  {name:'Тыква',category:'veg',kcal:26,protein_g:1,fat_g:0.1,carb_g:6.5},
  {name:'Огурец',category:'veg',kcal:15,protein_g:0.7,fat_g:0.1,carb_g:3.6},
  {name:'Помидор',category:'veg',kcal:18,protein_g:0.9,fat_g:0.2,carb_g:3.9},
  {name:'Шпинат',category:'veg',kcal:23,protein_g:2.9,fat_g:0.4,carb_g:3.6},
  {name:'Банан',category:'fruit',kcal:89,protein_g:1.1,fat_g:0.3,carb_g:23},
  {name:'Яблоко',category:'fruit',kcal:48,protein_g:0.4,fat_g:0.3,carb_g:11.4},
  {name:'Груша',category:'fruit',kcal:57,protein_g:0.4,fat_g:0.1,carb_g:15},
  {name:'Авокадо',category:'fruit',kcal:160,protein_g:2,fat_g:14.7,carb_g:8.5},
  {name:'Лимон',category:'fruit',kcal:29,protein_g:1.1,fat_g:0.3,carb_g:9},
  {name:'Ягоды',category:'fruit',kcal:44,protein_g:0.9,fat_g:0.5,carb_g:8},
  {name:'Масло оливковое',category:'fat',kcal:884,protein_g:0,fat_g:100,carb_g:0},
  {name:'Грецкий орех',category:'nuts',kcal:654,protein_g:15,fat_g:65,carb_g:14},
  {name:'Чечевица',category:'protein',kcal:320,protein_g:24,fat_g:1,carb_g:53},
  {name:'Нут',category:'protein',kcal:360,protein_g:20,fat_g:5,carb_g:60}
];

/* Демо-данные для личного кабинета */
window.SEED_DATA = {
  profile: {
    name: 'Гульжамаш',
    age: 34,
    sex: 'ж',
    height: 165,
    weight: 64,
    goal: 'Поддержание',
    region: 'Центральная Азия',
    diagnosis: 'Колит, ремиссия',
    stage: '',
    allergies: 'Нет',
    intolerance: '',
    forbidden: '',
    doctorRecs: 'Ограничить грубую клетчатку, жирное и острое. Дробное питание 5 раз в день.',
    bones: 'норма',
    vitamins: 'Витамин D — низкий',
    micro: '',
    macro: '',
    family: [
      {name:'Супруг',age:36,note:'без ограничений'},
      {name:'Дочь',age:9,note:'аллергия на орехи'}
    ]
  },
  products: [
    {id:'p1', name:'Яйца', qty:'12 шт.', emoji:'🥚', days:14, exp:'10.08.2026', warn:false},
    {id:'p2', name:'Брокколи', qty:'500 г', emoji:'🥦', days:3, exp:'30.07.2026', warn:false},
    {id:'p3', name:'Куриное филе', qty:'400 г', emoji:'🍗', days:1, exp:'28.07.2026', warn:true},
    {id:'p4', name:'Сыр', qty:'200 г', emoji:'🧀', days:10, exp:'06.08.2026', warn:false},
    {id:'p5', name:'Молоко', qty:'1 л', emoji:'🥛', days:5, exp:'01.08.2026', warn:false},
    {id:'p6', name:'Морковь', qty:'2 шт.', emoji:'🥕', days:20, exp:'16.08.2026', warn:false},
    {id:'p7', name:'Овсянка', qty:'800 г', emoji:'🌾', days:120, exp:'25.11.2026', warn:false},
    {id:'p8', name:'Йогурт натуральный', qty:'4 шт.', emoji:'🥛', days:6, exp:'02.08.2026', warn:false},
    {id:'p9', name:'Рис', qty:'900 г', emoji:'🍚', days:180, exp:'22.01.2027', warn:false},
    {id:'p10', name:'Творог', qty:'250 г', emoji:'🥛', days:4, exp:'31.07.2026', warn:false}
  ],
  missing: [
    {id:'m1', name:'Киноа', qty:'100 г', emoji:'🌾'},
    {id:'m2', name:'Лимон', qty:'1 шт.', emoji:'🍋'},
    {id:'m3', name:'Сливки', qty:'100 мл', emoji:'🥛'}
  ],
  dishes: [
    {id:'d1', name:'Курица с брокколи и сыром', emoji:'🍗', time:25, kcal:520, p:34, f:18, c:45, tag:'ready', note:'Только из того, что есть дома'},
    {id:'d2', name:'Овсянка с ягодами', emoji:'🥣', time:10, kcal:290, p:9, f:7, c:48, tag:'healthy'},
    {id:'d3', name:'Омлет с овощами', emoji:'🍳', time:12, kcal:340, p:22, f:24, c:6, tag:'fast'},
    {id:'d4', name:'Творог с йогуртом', emoji:'🥛', time:5, kcal:210, p:28, f:8, c:9, tag:'cheap'},
    {id:'d5', name:'Куриный суп с овощами', emoji:'🥣', time:35, kcal:180, p:16, f:5, c:14, tag:'favorite'},
    {id:'d6', name:'Лосось с киноа', emoji:'🐟', time:30, kcal:480, p:34, f:22, c:32, tag:'healthy'}
  ],
  today: { kcal:1200, p:72, f:45, c:140 },
  shopping: [
    {id:'s1', name:'Киноа', qty:'100 г', price:120, dept:'Крупы', done:false},
    {id:'s2', name:'Лимон', qty:'1 шт.', price:40, dept:'Овощи и фрукты', done:false},
    {id:'s3', name:'Сливки 10%', qty:'100 мл', price:80, dept:'Молочное', done:false},
    {id:'s4', name:'Лосось', qty:'300 г', price:480, dept:'Рыба', done:false},
    {id:'s5', name:'Авокадо', qty:'2 шт.', price:160, dept:'Овощи и фрукты', done:true},
    {id:'s6', name:'Огурцы', qty:'500 г', price:90, dept:'Овощи и фрукты', done:false}
  ],
  budget: 1500,
  planHistory: [
    {period:'6 — 12 июля',pct:92},
    {period:'29 июня — 5 июля',pct:85},
    {period:'22 — 28 июня',pct:78}
  ],
  progress: {
    weights: [
      {d:'2026-06-01', w:65},
      {d:'2026-06-15', w:64},
      {d:'2026-07-01', w:63.5},
      {d:'2026-07-15', w:63}
    ]
  }
};
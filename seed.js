/* Навигатор питания — демо-данные (seed) */

/* База продуктов (нутриенты на 100 г) */
window.SEED_FOODS = [
  {name:'Куриная грудка',category:'protein',kcal:165,protein_g:31,fat_g:3.6,carb_g:0},
  {name:'Индейка (грудка)',category:'protein',kcal:135,protein_g:30,fat_g:1,carb_g:0},
  {name:'Говядина (нежирная)',category:'protein',kcal:158,protein_g:26,fat_g:6,carb_g:0},
  {name:'Треска',category:'protein',kcal:82,protein_g:18,fat_g:0.7,carb_g:0},
  {name:'Лосось',category:'protein',kcal:208,protein_g:20,fat_g:13,carb_g:0},
  {name:'Яйцо куриное',category:'protein',kcal:143,protein_g:13,fat_g:10,carb_g:1.1},
  {name:'Творог 5%',category:'dairy',kcal:121,protein_g:17,fat_g:5,carb_g:1.8},
  {name:'Кефир 1%',category:'dairy',kcal:40,protein_g:3,fat_g:1,carb_g:4},
  {name:'Йогурт натуральный',category:'dairy',kcal:60,protein_g:3.5,fat_g:2,carb_g:6},
  {name:'Молоко 2.5%',category:'dairy',kcal:52,protein_g:2.8,fat_g:2.5,carb_g:4.7},
  {name:'Сыр',category:'dairy',kcal:340,protein_g:25,fat_g:26,carb_g:2},
  {name:'Сливки 10%',category:'dairy',kcal:118,protein_g:3,fat_g:10,carb_g:4},
  {name:'Рис белый',category:'carb',kcal:365,protein_g:7,fat_g:0.6,carb_g:79},
  {name:'Гречка',category:'carb',kcal:343,protein_g:13,fat_g:3.4,carb_g:71},
  {name:'Овсянка',category:'carb',kcal:366,protein_g:12,fat_g:6,carb_g:62},
  {name:'Киноа',category:'carb',kcal:368,protein_g:14,fat_g:6,carb_g:64},
  {name:'Хлеб пшеничный',category:'carb',kcal:265,protein_g:9,fat_g:3.2,carb_g:49},
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

/* Демо-данные для личного кабинета (первый запуск) */
window.SEED_DATA = {
  profile: {
    name: 'Гульжамаш',
    age: 34,
    sex: 'женский',
    avatar: '',
    completion: 85,
    goalKcal: 1600,
    goalProtein: 100,
    goalFat: 60,
    goalCarb: 200,
    health: 'Колит. Ограничение грубой клетчатки, жирного и острого. Дробное питание 5 раз в день.',
    prefs: 'Не люблю грибы. Люблю курицу, рыбу, кашу. Регион: Центральная Азия.',
    family: 'Муж (нет ограничений), дочь 9 лет (аллергия на орехи).'
  },
  products: [
    {id:'p1', name:'Яйца', qty:'12 шт.', days:14, cat:'protein'},
    {id:'p2', name:'Брокколи', qty:'500 г', days:3, cat:'veg'},
    {id:'p3', name:'Куриное филе', qty:'400 г', days:1, cat:'protein', warn:true},
    {id:'p4', name:'Сыр', qty:'200 г', days:10, cat:'dairy'},
    {id:'p5', name:'Молоко', qty:'1 л', days:5, cat:'dairy'},
    {id:'p6', name:'Морковь', qty:'2 шт.', days:20, cat:'veg'},
    {id:'p7', name:'Овсянка', qty:'800 г', days:120, cat:'carb'},
    {id:'p8', name:'Йогурт натуральный', qty:'4 шт.', days:6, cat:'dairy'},
    {id:'p9', name:'Рис', qty:'900 г', days:180, cat:'carb'},
    {id:'p10', name:'Творог', qty:'250 г', days:4, cat:'dairy'}
  ],
  missing: [
    {id:'m1', name:'Киноа', qty:'100 г'},
    {id:'m2', name:'Лимон', qty:'1 шт.'},
    {id:'m3', name:'Сливки', qty:'100 мл'}
  ],
  dishes: [
    {id:'d1', name:'Курица с брокколи и сыром', time:25, kcal:520, p:42, f:24, c:18, tag:'ready', note:'Только из того, что есть дома'},
    {id:'d2', name:'Овсянка с ягодами', time:10, kcal:290, p:9, f:7, c:48, tag:'healthy'},
    {id:'d3', name:'Омлет с овощами', time:12, kcal:340, p:22, f:24, c:6, tag:'fast'},
    {id:'d4', name:'Творог с йогуртом', time:5, kcal:210, p:28, f:8, c:9, tag:'cheap'},
    {id:'d5', name:'Куриный суп с овощами', time:35, kcal:180, p:16, f:5, c:14, tag:'favorite'},
    {id:'d6', name:'Лосось с киноа', time:30, kcal:480, p:34, f:22, c:32, tag:'healthy'}
  ],
  plan: {
    breakfast: {name:'Овсянка с ягодами', done:true},
    lunch: {name:'Куриный суп с овощами', done:true},
    dinner: {name:'Лосось с брокколи и киноа', done:false},
    snack: {name:'Йогурт с орехами', done:false}
  },
  summary: { kcal:1200, protein:72, fat:45, carb:140 },
  shopping: [
    {id:'s1', name:'Киноа', qty:'100 г', price:120, dept:'Крупы', done:false},
    {id:'s2', name:'Лимон', qty:'1 шт.', price:40, dept:'Овощи и фрукты', done:false},
    {id:'s3', name:'Сливки 10%', qty:'100 мл', price:60, dept:'Молочное', done:false},
    {id:'s4', name:'Лосось', qty:'300 г', price:450, dept:'Рыба', done:true},
    {id:'s5', name:'Йогурт', qty:'4 шт.', price:160, dept:'Молочное', done:true},
    {id:'s6', name:'Морковь', qty:'1 кг', price:50, dept:'Овощи и фрукты', done:true}
  ],
  budget: 1500,
  progress: {
    weight: [
      {date:'01.06', kg:72.0},
      {date:'08.06', kg:71.4},
      {date:'15.06', kg:70.8},
      {date:'22.06', kg:70.3},
      {date:'29.06', kg:69.7},
      {date:'06.07', kg:69.2}
    ],
    history: [
      {week:'Неделя 1', pct:100},
      {week:'Неделя 2', pct:86},
      {week:'Неделя 3', pct:92},
      {week:'Неделя 4', pct:78}
    ]
  },
  settings: { reminders:true, theme:'light' }
};

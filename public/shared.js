/* 平阳味道餐厅 · 共享模块：菜品数据 + 评分规则 + 机器人表情
   浏览器（学生端/大屏）和服务器都用这一份，保证评分结果一致。 */
(function(root){
const DISHES=[
 {
  "id": "dumplings",
  "short": "dumplings",
  "full": "Tengjiao Fried Dumplings",
  "zh": "腾蛟煎饺",
  "town": "腾蛟",
  "zone": "staple",
  "img": "img/dumplings.jpg"
 },
 {
  "id": "yellowrice",
  "short": "yellow rice cake",
  "full": "Shunxi Yellow Rice Cake",
  "zh": "顺溪黄年糕",
  "town": "顺溪",
  "zone": "staple",
  "img": "img/yellowrice.jpg"
 },
 {
  "id": "noodles",
  "short": "fried noodles",
  "full": "Wushizhang Fried Rice Noodles",
  "zh": "五十丈炒粉干",
  "town": "水头",
  "zone": "staple",
  "img": "img/noodles.jpg"
 },
 {
  "id": "rice",
  "short": "rice",
  "full": "Steamed Rice",
  "zh": "米饭",
  "town": "—",
  "zone": "staple",
  "img": "img/rice.jpg"
 },
 {
  "id": "hamburger",
  "short": "hamburger",
  "full": "Beef Hamburger",
  "zh": "汉堡",
  "town": "—",
  "zone": "staple",
  "img": "img/hamburger.jpg"
 },
 {
  "id": "beef",
  "short": "beef",
  "full": "Mabu Beef",
  "zh": "麻步黄牛肉",
  "town": "麻步",
  "zone": "meat",
  "img": "img/beef.jpg"
 },
 {
  "id": "duck",
  "short": "duck",
  "full": "Huaixi Duck",
  "zh": "怀溪番鸭",
  "town": "怀溪",
  "zone": "meat",
  "img": "img/duck.jpg"
 },
 {
  "id": "fish",
  "short": "fish",
  "full": "Nanji Yellow Croaker",
  "zh": "南麂大黄鱼",
  "town": "南麂",
  "zone": "meat",
  "img": "img/fish.jpg"
 },
 {
  "id": "chicken",
  "short": "chicken",
  "full": "Chicken",
  "zh": "鸡肉",
  "town": "—",
  "zone": "meat",
  "img": "img/chicken.jpg"
 },
 {
  "id": "veg",
  "short": "vegetables",
  "full": "Fresh Vegetables",
  "zh": "清炒时蔬",
  "town": "—",
  "zone": "veg",
  "img": "img/veg.jpg"
 },
 {
  "id": "tomegg",
  "short": "tomatoes and eggs",
  "full": "Tomatoes and Eggs",
  "zh": "番茄炒蛋",
  "town": "—",
  "zone": "veg",
  "img": "img/tomegg.jpg"
 },
 {
  "id": "salad",
  "short": "salad",
  "full": "Vegetable Salad",
  "zh": "沙拉",
  "town": "—",
  "zone": "veg",
  "img": "img/salad.jpg"
 },
 {
  "id": "fruit",
  "short": "fruit",
  "full": "Seasonal Fruit",
  "zh": "时令水果",
  "town": "—",
  "zone": "veg",
  "img": "img/fruit.jpg"
 },
 {
  "id": "tea",
  "short": "tea",
  "full": "Pingyang Huangtang (Yellow Tea)",
  "zh": "平阳黄汤",
  "town": "水头·朝阳山",
  "zone": "drink",
  "img": "img/tea.jpg"
 },
 {
  "id": "soup",
  "short": "soup",
  "full": "Beef Bone Soup",
  "zh": "黄牛骨汤",
  "town": "麻步",
  "zone": "drink",
  "img": "img/soup.jpg"
 },
 {
  "id": "water",
  "short": "water",
  "full": "Water",
  "zh": "水",
  "town": "—",
  "zone": "drink",
  "img": "img/water.jpg"
 },
 {
  "id": "juice",
  "short": "juice",
  "full": "Fruit Juice",
  "zh": "果汁",
  "town": "—",
  "zone": "drink",
  "img": "img/juice.jpg"
 },
 {
  "id": "icecream",
  "short": "ice cream",
  "full": "Yellow Tea Ice Cream",
  "zh": "黄汤茶冰淇淋",
  "town": "昆阳·老街",
  "zone": "dessert",
  "img": "img/icecream.jpg"
 }
];
const ZONES=[{key:'staple',label:'Staple 主食'},{key:'meat',label:'Meat 肉'},{key:'veg',label:'Vegetables & Fruit 蔬果'},{key:'drink',label:'Drinks 汤饮'},{key:'dessert',label:'Dessert 甜点'}];
const byId=id=>DISHES.find(d=>d.id===id);
const PLATE_NAMES=['1','2','3','4'];   // 每组 4 个餐盘
const plateNo=(g,i)=>(g-1)*PLATE_NAMES.length+i+1;   // 全班唯一编号：第1组=1~4，第2组=5~8 …
const MAX_ITEMS=6;                      // 每个餐盘最多 6 个

function buildFeedback(items){
  /* Healthy plate 评分（0~5星）
     规则（学生也能看懂）：
     ① 三大类要齐全：主食 Staple · 肉 Meat · 蔬果 Veg&Fruit —— 缺一类扣 2 星
     ② 每一类 1~2 份刚刚好 —— 某一类 ≥3 份算太多，每类扣 1 星
     ③ 饮料+甜点（Extras）合计不超过 2 份 —— 超过扣 1 星
     5星/4星：开心；3星/2星：表情平平；1星/0星：不开心 */
  if(items.length===0){ return {core:0,en:"Empty plate? Let's order some food!",zh:"餐盘是空的，点些菜吧！",ex:""}; }
  const zc={}; items.forEach(id=>{const z=byId(id).zone; zc[z]=(zc[z]||0)+1;});
  const cnt={staple:zc.staple||0, meat:zc.meat||0, veg:zc.veg||0};
  const extras=(zc.drink||0)+(zc.dessert||0);
  const G={ staple:{missEn:'rice or noodles',missZh:'主食（米饭/面条/饺子）',moreEn:'too much rice and noodles',moreZh:'主食太多'},
            meat:  {missEn:'some meat',missZh:'肉（牛肉/鱼/鸡肉）',moreEn:'too much meat',moreZh:'肉太多'},
            veg:   {missEn:'vegetables or fruit',missZh:'蔬菜或水果',moreEn:'too many vegetables and fruit',moreZh:'蔬果太多'} };
  let stars=5; const miss=[], over=[];
  Object.keys(G).forEach(k=>{
    if(cnt[k]===0){ stars-=2; miss.push(G[k]); }
    else if(cnt[k]>=3){ stars-=1; over.push([G[k].moreEn,G[k].moreZh]); }
  });
  if(extras>2){ stars-=1; over.push(['too many drinks and desserts','饮料和甜点太多']); }
  stars=Math.max(0,stars);
  const head={5:['Perfect!','太棒了！'],4:['Great!','很棒！'],3:['Good!','不错！'],2:['Almost there!','快接近啦！'],1:['Oh no!','哎呀！'],0:['Oh no!','哎呀！']}[stars];
  let en=head[0], zh=head[1];
  if(stars===5){
    en+=' A healthy plate: rice, meat and vegetables!';
    zh+=' 主食、肉、蔬菜都有，数量刚刚好，是健康餐盘！';
  } else {
    if(stars<=1 && miss.length>=2){ en+=" That's not a healthy plate."; zh+=' 这不是健康餐盘。'; }
    if(miss.length){
      const L=miss.map(m=>m.missEn); en+=' Add '+(L.length>1?L.slice(0,-1).join(', ')+' and '+L[L.length-1]:L[0])+'.';
      zh+=' 再加点'+miss.map(m=>m.missZh).join('、')+'。';
    }
    if(over.length){
      const o=over[0][0]; en+=' But '+o+'! One or two is enough.';
      zh+=' 但是'+over.map(o=>o[1]).join('、')+'了，每类 1~2 份就够啦。';
    }
  }
  let ex='';
  if(items.includes('tea')) ex="🍵 Pingyang yellow tea — 'liquid gold in a cup'!";
  else if(items.includes('dumplings')) ex="🥟 Tengjiao fried dumplings, crispy outside!";
  else if(items.includes('beef')) ex="🐂 Mabu beef makes you strong!";
  else if(items.includes('fish')) ex="🐟 Nanji yellow croaker from the sea!";
  return {en,zh,ex,core:stars};
}

function robotSvg(stars){
  /* 表情随评分变化：5星大笑 / 4星微笑 / 2-3星嘴巴平平 / 0-1星嘴巴向下 */
  const ink='#2b3a4a';
  let eyes,mouth,extra='',bulb='#ffcf4d';
  if(stars>=4){
    eyes=`<path d="M33 47 Q40 38 47 47" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>
          <path d="M53 47 Q60 38 67 47" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`;
    mouth= stars>=5
      ? `<path d="M37 55 Q50 74 63 55 Z" fill="${ink}" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/><path d="M42 62 Q50 69 58 62 Q50 66 42 62Z" fill="#ff8a80"/>`
      : `<path d="M38 57 Q50 70 62 57" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`;
    extra=`<circle cx="31" cy="56" r="4.5" fill="#ff9aa2" opacity=".7"/><circle cx="69" cy="56" r="4.5" fill="#ff9aa2" opacity=".7"/>`;
  } else if(stars>=2){
    eyes=`<circle cx="40" cy="45" r="5.5" fill="${ink}"/><circle cx="60" cy="45" r="5.5" fill="${ink}"/>`;
    mouth=`<path d="M41 61 L59 61" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`;
  } else {
    bulb='#b8c4cc';
    eyes=`<circle cx="40" cy="46" r="5.5" fill="${ink}"/><circle cx="60" cy="46" r="5.5" fill="${ink}"/>
          <path d="M33 40 L46 35" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M67 40 L54 35" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`;
    mouth=`<path d="M40 64 Q50 54 60 64" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`;
    extra=`<path d="M33 53 Q30 59 33 62 Q36 59 33 53Z" fill="#7cc4ec"/>`;
  }
  return `<svg viewBox="0 0 100 100">
  <rect x="22" y="20" width="56" height="48" rx="14" fill="#9ad0e8" stroke="#5aa6c4" stroke-width="3"/>
  ${eyes}${extra}${mouth}
  <rect x="44" y="68" width="12" height="16" rx="4" fill="#9ad0e8" stroke="#5aa6c4" stroke-width="3"/>
  <line x1="50" y1="8" x2="50" y2="20" stroke="#5aa6c4" stroke-width="3"/>
  <circle cx="50" cy="6" r="4" fill="${bulb}"/></svg>`;
}


const PY={DISHES,ZONES,byId,PLATE_NAMES,plateNo,MAX_ITEMS,buildFeedback,robotSvg};
if(typeof module!=='undefined'&&module.exports) module.exports=PY; else root.PY=PY;
})(typeof window!=='undefined'?window:globalThis);

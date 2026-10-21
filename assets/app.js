(()=>{
const {f,T,CUR,st}=window.WS;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const S={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const root=document.documentElement.dataset.root||'';
st.cur=S.get('cur','USD');
let toastEl;const toast=m=>{if(!toastEl){toastEl=document.createElement('div');toastEl.className='toast';toastEl.setAttribute('role','status');document.body.appendChild(toastEl)}toastEl.textContent=m;toastEl.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>toastEl.classList.remove('show'),1800)};
const copy=async(t,ok)=>{try{await navigator.clipboard.writeText(t);toast(ok)}catch(e){window.prompt('Copy this:',t)}};

const confetti=()=>{if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;const c=document.createElement('canvas');c.className='conf';c.width=innerWidth;c.height=innerHeight;document.body.appendChild(c);const x=c.getContext('2d'),P=Array.from({length:90},()=>({x:Math.random()*c.width,y:-20-Math.random()*c.height*.4,v:2+Math.random()*4,s:5+Math.random()*6,a:Math.random()*6,h:Math.random()<.5?150:42}));let n=0;(function t(){x.clearRect(0,0,c.width,c.height);P.forEach(p=>{p.y+=p.v;p.x+=Math.sin(p.a+=.05)*2;x.fillStyle=`hsl(${p.h+Math.random()*20},80%,55%)`;x.fillRect(p.x,p.y,p.s,p.s*.6)});if(++n<150)requestAnimationFrame(t);else c.remove()})()};
/* theme */
const setTheme=t=>{document.documentElement.dataset.theme=t;const m=$('meta[name=theme-color]');if(m)m.content=t==='dark'?'#0b1410':'#f4faf7'};
setTheme(S.get('theme',matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));

let rerender=()=>{};
document.addEventListener('DOMContentLoaded',()=>{
 const nav=$('.navlinks');
 if(nav){const w=document.createElement('div');w.className='navtools';
  const sel=document.createElement('select');sel.className='cursel';sel.setAttribute('aria-label','Currency symbol');
  Object.keys(CUR).forEach(k=>sel.add(new Option(k+' '+CUR[k],k)));sel.value=st.cur;sel.onchange=()=>{st.cur=sel.value;S.set('cur',st.cur);rerender()};
  const b=document.createElement('button');b.className='ico';b.type='button';b.setAttribute('aria-label','Toggle dark mode');
  const sync=()=>b.textContent=document.documentElement.dataset.theme==='dark'?'☀️':'🌙';sync();
  b.onclick=()=>{const n=document.documentElement.dataset.theme==='dark'?'light':'dark';setTheme(n);S.set('theme',n);sync()};
  w.append(sel,b);nav.appendChild(w)}
 const app=$('#app');if(app&&T[app.dataset.tool])calculator(app,app.dataset.tool);
 if($('#toolgrid'))home();
 if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register(root+'sw.js').catch(()=>{});
});

/* ---------- calculator page ---------- */
function calculator(app,id){
 const tool=T[id],key='in:'+id,defs={};tool.fields.forEach(x=>defs[x.id]=x.def);
 let saved=S.get(key,null);try{const q=new URLSearchParams(location.search).get('v');if(q)saved=JSON.parse(q)}catch(e){}
 const state={...defs,...(saved||{})};
 const form=document.createElement('form');form.className='fields';form.onsubmit=e=>e.preventDefault();
 const els={};
 tool.fields.forEach(x=>{
  const d=document.createElement('div');d.className='fld';const l=document.createElement('label');l.htmlFor='f_'+x.id;
  let el;
  if(x.type==='select'){el=document.createElement('select');x.opts.forEach(o=>el.add(new Option(o[1],o[0])))}
  else{el=document.createElement('input');if(x.type==='check'){el.type='checkbox';d.className='fld chk'}else if(x.type==='text'){el.type='text';el.maxLength=x.max||20}else{el.type='number';el.inputMode='decimal';el.step=x.step||1;if(x.min!=null)el.min=x.min;if(x.max!=null)el.max=x.max}}
  el.id='f_'+x.id;els[x.id]=el;
  if(x.type==='check')el.checked=!!state[x.id];else el.value=state[x.id];
  l.textContent=x.label+(x.unit?' ('+x.unit+')':'');
  const err=document.createElement('div');err.className='err';err.id='e_'+x.id;err.hidden=true;
  if(x.type==='check'){d.append(el,l)}else{d.append(l,el)}
  if(x.hint){const h=document.createElement('div');h.className='hint';h.textContent=x.hint;d.append(h)}
  d.append(err);form.appendChild(d);
  el.addEventListener('input',run);el.addEventListener('change',run);
  if(el.type==='number'){el.addEventListener('focus',()=>el.select());el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const i=tool.fields.findIndex(y=>y.id===x.id),n=tool.fields.slice(i+1).find(y=>y.type==='number');n?els[n.id].focus():el.blur()}})}
 });
 const res=document.createElement('div');res.className='result';res.setAttribute('aria-live','polite');
 res.innerHTML='<small id="rl"></small><div class="rnum" id="rm">0</div><div id="rw" class="warn" role="alert" hidden></div><ul id="rr"></ul><div id="rc"></div><p id="rn" class="note"></p>';
 const bar=document.createElement('div');bar.className='actions';
 const mk=(t,fn,c='btn secondary')=>{const b=document.createElement('button');b.type='button';b.className=c;b.textContent=t;b.onclick=fn;bar.appendChild(b)};
 let last=null,wasWin=false;
 const read=()=>{const o={};tool.fields.forEach(x=>o[x.id]=x.type==='check'?els[x.id].checked:els[x.id].value);return o};
 mk('🔗 Copy link with numbers',()=>copy(location.origin+location.pathname+'?v='+encodeURIComponent(JSON.stringify(read())),'Link copied'),'btn');
 mk('📋 Copy result',()=>{if(!last)return;copy(`${document.title}\n${last.label}: ${last.main}\n`+last.rows.map(r=>r.join(': ')).join('\n')+`\n${location.href.split('?')[0]}`,'Result copied')});
 mk('↺ Reset',()=>{tool.fields.forEach(x=>{if(x.type==='check')els[x.id].checked=!!x.def;else els[x.id].value=x.def});run();toast('Defaults restored')});
 mk('🖨 Print',()=>window.print());
 app.append(form,res,bar);
 function parse(){const v={};let bad=false;
  tool.fields.forEach(x=>{const el=els[x.id],e=$('#e_'+x.id);let msg='';
   if(x.type==='check')v[x.id]=el.checked;
   else if(x.type==='select'||x.type==='text')v[x.id]=el.value;
   else{let n=el.value.trim()===''?NaN:parseFloat(el.value);const lo=x.min!=null?x.min:-Infinity,hi=x.max!=null?x.max:Infinity;
    if(isNaN(n)){msg='Enter a number.';n=Math.max(lo,0)}else if(n<lo||n>hi){msg=`Enter a value between ${isFinite(lo)?lo:'−∞'} and ${isFinite(hi)?hi:'∞'}.`;n=Math.min(hi,Math.max(lo,n))}
    if(x.int)n=Math.floor(n);v[x.id]=n}
   e.hidden=!msg;e.textContent=msg;el.setAttribute('aria-invalid',msg?'true':'false');if(msg)bad=true});
  return v}
 function run(){const v=parse();S.set(key,read());last=null;let r;try{r=tool.calc(v)}catch(e){r={label:'Result',main:'—',rows:[],warn:'Could not calculate. Check your inputs.'}}
  last=r;if(r.win&&!wasWin)confetti();wasWin=!!r.win;$('#rl').textContent=r.label;$('#rm').textContent=r.main;const w=$('#rw');w.hidden=!r.warn;w.textContent=r.warn||'';
  const ul=$('#rr');ul.textContent='';r.rows.forEach(([a,b])=>{const li=document.createElement('li'),s=document.createElement('span'),g=document.createElement('strong');s.textContent=a;g.textContent=b;li.append(s,g);ul.append(li)});
  $('#rn').textContent=r.note||'';chart(r.chart,$('#rc'))}
 rerender=run;run();
 const used=new Set(S.get('used',[]));used.add(id);S.set('used',[...used]);const rec=S.get('recent',[]).filter(r=>r.u!==location.pathname);rec.unshift({u:location.pathname,t:($('h1')||{}).textContent||id});S.set('recent',rec.slice(0,5));
}
function chart(c,box){box.textContent='';if(!c||c.y.length<2)return;const W=600,H=170,p=8,y=c.y,mx=Math.max(...y),mn=Math.min(0,...y),X=i=>p+i*(W-2*p)/(y.length-1),Y=v=>H-18-(v-mn)/((mx-mn)||1)*(H-34);
 const pts=y.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' ');
 box.innerHTML=`<figure class="chart"><figcaption>${c.t}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${c.t}"><polygon points="${p},${Y(mn)} ${pts} ${W-p},${Y(mn)}" fill="var(--brand)" opacity=".16"/><polyline points="${pts}" fill="none" stroke="var(--brand)" stroke-width="2.5" stroke-linejoin="round"/><text x="${p}" y="${H-3}" font-size="11" fill="var(--muted)">${c.x[0]}</text><text x="${W-p}" y="${H-3}" font-size="11" text-anchor="end" fill="var(--muted)">${c.x[1]}</text><text x="${W-p}" y="12" font-size="11" text-anchor="end" fill="var(--muted)">Max ${f.m(mx)}</text></svg></figure>`}

/* ---------- home ---------- */
function home(){
 const grid=$('#toolgrid'),cards=$$('.toolcard',grid),q=$('#q'),chips=$('#chips');let cat='all';
 const labels={all:'All',fav:'⭐ Favorites',stocks:'Stocks',invest:'Invest & retire',save:'Save',debt:'Debt & loans',daily:'Everyday & income'};
 Object.keys(labels).forEach(k=>{const b=document.createElement('button');b.type='button';b.className='chip';b.dataset.k=k;b.textContent=labels[k];b.onclick=()=>{cat=k;paint()};chips.appendChild(b)});
 cards.forEach(c=>{c.dataset.id=c.dataset.slug;const b=document.createElement('button');b.type='button';b.className='fav';b.setAttribute('aria-label','Favorite');b.textContent='★';b.onclick=e=>{e.preventDefault();const s=new Set(S.get('favs',[]));s.has(c.dataset.id)?s.delete(c.dataset.id):s.add(c.dataset.id);S.set('favs',[...s]);paint()};c.appendChild(b)});
 q.addEventListener('input',paint);document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();q.focus()}});
 function paint(){const favs=S.get('favs',[]),t=q.value.trim().toLowerCase();let n=0;
  cards.forEach(c=>{const fav=favs.includes(c.dataset.id);$('.fav',c).classList.toggle('on',fav);const ok=(cat==='all'||(cat==='fav'?fav:c.dataset.cat===cat))&&(!t||c.textContent.toLowerCase().includes(t));c.classList.toggle('hidden',!ok);if(ok)n++});
  $$('.chip',chips).forEach(b=>b.classList.toggle('on',b.dataset.k===cat));$('#none').hidden=n>0;
  [...cards].sort((a,b)=>favs.includes(b.dataset.id)-favs.includes(a.dataset.id)).forEach(c=>grid.appendChild(c))}
 const rec=S.get('recent',[]);if(rec.length){const r=$('#recent');r.append('Recently used: ');rec.forEach(x=>{const a=document.createElement('a');a.className='pill';a.href=root+x.u.replace(/^.*\/tools\//,'tools/');a.textContent=x.t;r.append(a)})}
 const used=S.get('used',[]).length,tot=cards.length,ranks=[[0,'Newcomer'],[3,'Saver'],[8,'Stacker'],[15,'Wealth Builder'],[tot,'Money Master']],rk=[...ranks].reverse().find(r=>used>=r[0]);
 $('#rank').innerHTML=`<strong>Your stack: ${rk[1]}</strong> <span class="muted">· ${used}/${tot} calculators tried</span><div class="progress"><i style="width:${Math.min(100,used/tot*100)}%"></i></div>`;
 $('#surprise').onclick=()=>{const c=cards[Math.floor(Math.random()*cards.length)];location.href=c.querySelector('a').href};
 const tips=['Pay yourself first: automate savings on payday, before you can spend it.','Fees compound too. A 1% yearly fund fee can cost you a fifth of your final balance over 30 years.','Never invest money you will need within 3–5 years.','Size every trade by what you can lose, not by what you hope to win.','A stock that falls 50% must rise 100% to get back to even.','Diversification is the only free lunch in investing.','High-interest debt is a guaranteed, tax-free negative return. Clear it first.','Check your emergency fund before you buy your next stock.'];
 $('#tip').textContent=tips[Math.floor(Date.now()/864e5)%tips.length];paint()}
})();

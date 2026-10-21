(()=>{
const $=s=>document.querySelector(s);
const SRC=[['Markets','https://finance.yahoo.com/news/rssindex'],['Business','https://feeds.bbci.co.uk/news/business/rss.xml'],['Top stories','https://www.cnbc.com/id/100003114/device/rss/rss.html'],['Economy','https://www.cnbc.com/id/20910258/device/rss/rss.html']];
const STOP=new Set('with from that this have will what when your about after over into says said more than they their them were been also just amid could would year years week today stock stocks shares share market markets news first still back make makes between against while where which these those other some most only very much being here there inc corp'.split(' '));
let items=[],tag='';
const safe=u=>/^https?:\/\//i.test(u)?u:'#';
const CFG=window.WS_CONFIG||{};
/* 1) Preferred: your own proxy (one request, already merged, cleaned and cached). */
async function viaProxy(){
 if(!CFG.newsProxy)throw new Error('no proxy configured');
 const r=await fetch(CFG.newsProxy);if(!r.ok)throw new Error('proxy '+r.status);
 const j=await r.json();if(!Array.isArray(j.items))throw new Error('bad proxy data');return j.items}
/* 2) Fallback: public rss2json service (free, rate limited, third party). */
async function viaRss2json(){
 const res=await Promise.allSettled(SRC.map(async([n,u])=>{const r=await fetch('https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(u));if(!r.ok)throw 0;const j=await r.json();if(j.status!=='ok')throw 0;
  return j.items.slice(0,12).map(i=>({s:n,t:i.title,l:i.link,d:new Date(String(i.pubDate).replace(' ','T')+'Z').toISOString()}))}));
 return res.filter(r=>r.status==='fulfilled').flatMap(r=>r.value)}
async function load(){
 const st=$('#status');st.textContent='Loading headlines…';
 const c=(()=>{try{return JSON.parse(sessionStorage.getItem('news'))}catch(e){return null}})();
 if(c&&Date.now()-c.t<6e5){items=c.items;st.textContent='Updated '+new Date(c.t).toLocaleTimeString()+' (cached)';return paint()}
 let list=[];
 try{list=await viaProxy()}catch(e){try{list=await viaRss2json()}catch(e2){list=[]}}
 const seen=new Set();
 items=list.filter(i=>i&&i.t&&/^https?:\/\//i.test(i.l)).filter(i=>{const k=i.t.toLowerCase().slice(0,50);if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>(b.d||'').localeCompare(a.d||''));
 if(!items.length){st.textContent='Live headlines are unavailable right now. Use the source links below.';$('#fallback').hidden=false;return}
 try{sessionStorage.setItem('news',JSON.stringify({t:Date.now(),items}))}catch(e){}
 st.textContent='Updated '+new Date().toLocaleTimeString();paint()}
function trending(){const c={};items.forEach(i=>{const seen=new Set();(i.t.match(/\$?[A-Za-z][A-Za-z.&'-]{2,}/g)||[]).forEach(w=>{const k=w.replace(/^\$/,'').replace(/'s$/,'');const lk=k.toLowerCase();if(STOP.has(lk)||k.length<3||seen.has(lk))return;if(/^[a-z]/.test(k)&&k.length<5)return;seen.add(lk);c[lk]=c[lk]||{n:0,w:k};c[lk].n++})});
 return Object.values(c).filter(x=>x.n>1).sort((a,b)=>b.n-a.n).slice(0,14)}
function paint(){
 const tr=$('#trend');tr.textContent='';trending().forEach(x=>{const b=document.createElement('button');b.type='button';b.className='chip'+(tag===x.w.toLowerCase()?' on':'');b.textContent=x.w+' · '+x.n;b.onclick=()=>{tag=tag===x.w.toLowerCase()?'':x.w.toLowerCase();paint()};tr.appendChild(b)});
 const box=$('#news');box.textContent='';const q=$('#nq').value.toLowerCase();
 items.filter(i=>(!tag||i.t.toLowerCase().includes(tag))&&(!q||i.t.toLowerCase().includes(q))).forEach(i=>{const a=document.createElement('a');a.className='card newsitem';a.href=safe(i.l);a.target='_blank';a.rel='noopener noreferrer';
  const s=document.createElement('small');s.textContent=i.s+(i.d?' · '+new Date(i.d).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}):'');const h=document.createElement('strong');h.textContent=i.t;a.append(s,h);box.appendChild(a)});
 if(!box.children.length)box.textContent='No headlines match.'}
document.addEventListener('DOMContentLoaded',()=>{$('#nq').addEventListener('input',paint);$('#refresh').onclick=()=>{try{sessionStorage.removeItem('news')}catch(e){}load()};load()});
})();

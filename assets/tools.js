/* Wealth Stacked – calculator engine. Pure functions: input values -> result object. */
(()=>{
const CUR={USD:'$',EUR:'€',GBP:'£',THB:'฿',JPY:'¥',INR:'₹',AUD:'A$',CAD:'C$',SGD:'S$'};
const st={cur:'USD'};
const nf=d=>new Intl.NumberFormat('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const f={
 n:(x,d=0)=>isFinite(x)?nf(d).format(x):'—',
 m:(x,d)=>isFinite(x)?(x<0?'-':'')+CUR[st.cur]+nf(d!=null?d:(Math.abs(x)>=1000?0:2)).format(Math.abs(x)):'—',
 m2:x=>f.m(x,2),
 p:(x,d=1)=>isFinite(x)?nf(d).format(x)+'%':'—',
 mo:n=>{n=Math.ceil(n);const y=Math.floor(n/12),m=n%12;return (y?y+' yr ':'')+(m||!y?m+' mo':'')}
};
const N=(id,label,def,o={})=>({id,label,def,type:'number',min:0,...o});
const SEL=(id,label,def,opts,o={})=>({id,label,def,type:'select',opts,...o});
const pmt=(P,r,n)=>r?P*r/(1-Math.pow(1+r,-n)):P/n;
const downs=a=>{const o=[];for(let i=0;i<a.length;i+=Math.ceil(a.length/60))o.push(a[i]);if(o[o.length-1]!==a[a.length-1])o.push(a[a.length-1]);return o};

const T={};
T.takehome={fields:[N('gross','Gross monthly salary',5000,{unit:'/mo'}),N('bonus','Annual bonus',0,{unit:'/yr'}),
 N('tax','Effective income tax rate',18,{unit:'%',max:60,step:.1,hint:'Your average rate, not your top bracket.'}),
 N('payroll','Payroll / social security rate',7.65,{unit:'%',max:30,step:.01}),
 N('ret','Pre-tax retirement contribution',5,{unit:'% of gross',max:100,step:.1}),
 N('other','Other monthly deductions',0,{unit:'/mo',hint:'Health insurance, union dues, etc.'})],
 calc(v){const a=v.gross*12+v.bonus,rc=a*v.ret/100,tax=(a-rc)*v.tax/100,pr=a*v.payroll/100,net=a-rc-tax-pr-v.other*12;
 return{label:'Estimated monthly take-home',main:f.m(net/12),rows:[['Gross income / year',f.m(a)],['Income tax / year',f.m(tax)],['Payroll tax / year',f.m(pr)],['Retirement saved / year',f.m(rc)],['Take-home / year',f.m(net)],['Total deductions',f.p(a?(a-net)/a*100:0)]],
 note:'Retirement contributions reduce taxable income; payroll tax is applied to gross. Rates are your own estimates, so check your payslip.',warn:net<0?'Deductions exceed income. Check your rates.':''}}};

T['split-bill']={fields:[N('bill','Bill before tax and tip',120,{step:.01}),N('people','Number of people',4,{min:1,max:100,int:1}),
 N('tax','Sales tax / VAT',0,{unit:'%',max:50,step:.01}),N('tip','Tip / service charge',15,{unit:'%',max:100,step:.1}),
 {id:'round',label:'Round each share up to a whole unit',def:true,type:'check'}],
 calc(v){const tax=v.bill*v.tax/100,tip=v.bill*v.tip/100,tot=v.bill+tax+tip;let pp=tot/v.people;pp=v.round?Math.ceil(pp-1e-9):Math.ceil(pp*100-1e-9)/100;
 return{label:'Each person pays',main:f.m2(pp),rows:[['Tax',f.m2(tax)],['Tip',f.m2(tip)],['Bill total',f.m2(tot)],['Collected',f.m2(pp*v.people)],['Extra from rounding',f.m2(pp*v.people-tot)]],note:'Tip is calculated on the pre-tax amount, the common convention.'}}};

T.savings={fields:[N('goal','Savings goal',10000),N('cur','Already saved',1000),N('months','Months to reach goal',24,{min:1,max:600,int:1}),N('rate','Expected annual interest',4,{unit:'%',max:30,step:.01})],
 calc(v){const r=v.rate/1200,g=Math.pow(1+r,v.months),need=v.goal-v.cur*g,m=need<=0?0:r?need*r/(g-1):need/v.months;
 return{label:'Save each month',main:f.m(m),rows:[['Per week (approx.)',f.m(m*12/52)],['Total you contribute',f.m(m*v.months)],['Interest earned',f.m(v.goal-v.cur-m*v.months)],['Final balance',f.m(Math.max(v.goal,v.cur*g))]],
 note:'Deposits are assumed at the end of each month with monthly compounding. Interest rates vary.',warn:need<=0?'Your current savings already reach this goal.':'',win:need<=0}}};

T.budget={fields:[N('income','Monthly take-home income',4000),N('needs','Needs',50,{unit:'%',max:100}),N('wants','Wants',30,{unit:'%',max:100}),N('save','Savings & debt',20,{unit:'%',max:100})],
 calc(v){const s=v.needs+v.wants+v.save,i=v.income;
 return{label:'Goes to savings & debt',main:f.m(i*v.save/100),rows:[['Needs (rent, food, bills)',f.m(i*v.needs/100)],['Wants (fun, dining, shopping)',f.m(i*v.wants/100)],['Savings & debt',f.m(i*v.save/100)],['Percent allocated',f.p(s,0)]],
 note:'50/30/20 is a rule of thumb. Adjust it if your cost of living is high.',warn:Math.abs(s-100)>.01?`Your split adds up to ${f.n(s,1)}%, not 100%.`:''}}};

T.installment={fields:[N('price','Item price',1200),N('down','Down payment',200),N('rate','Flat interest rate per year',8,{unit:'%',max:60,step:.01}),N('months','Number of months',12,{min:1,max:360,int:1})],
 calc(v){const down=Math.min(v.down,v.price),loan=v.price-down,intr=loan*v.rate/100*v.months/12,pay=(loan+intr)/v.months;let eir=0;
 if(loan>0&&pay>0){let lo=0,hi=1;for(let k=0;k<80;k++){const mid=(lo+hi)/2;if(pmt(loan,mid,v.months)>pay)hi=mid;else lo=mid}eir=(lo+hi)/2*1200}
 return{label:'Monthly payment',main:f.m2(pay),rows:[['Amount financed',f.m(loan)],['Total flat interest',f.m(intr)],['Total you pay (with down payment)',f.m(down+loan+intr)],['True annual rate (APR-equivalent)',f.p(eir)]],
 note:'Flat rates charge interest on the original balance, so the true APR is much higher than the quoted rate. Fees and insurance are not included.',warn:v.down>v.price?'Down payment is higher than the price, so it was capped.':''}}};

T['daily-budget']={fields:[N('cash','Money available',600),N('fixed','Bills still to pay',250),N('days','Days left',14,{min:1,max:366,int:1}),N('buf','Safety buffer',10,{unit:'%',max:90})],
 calc(v){const left=v.cash-v.fixed,use=Math.max(0,left)*(1-v.buf/100),per=use/v.days;
 return{label:'You can spend per day',main:f.m2(per),rows:[['Left after bills',f.m(Math.max(0,left))],['Held back as buffer',f.m(Math.max(0,left)*v.buf/100)],['Per week',f.m2(per*7)],['Days covered',v.days+'']],note:'A rough guide. Add irregular costs to your bills first.',warn:left<0?'Your bills are higher than the money available.':''}}};

T.emergency={fields:[N('exp','Essential monthly expenses',2500),SEL('months','Months to cover','6',[['3','3 months'],['6','6 months'],['9','9 months'],['12','12 months']]),N('saved','Emergency fund saved',3000),N('add','You can save per month',300)],
 calc(v){const m=+v.months,t=v.exp*m,g=Math.max(0,t-v.saved);
 return{label:'Emergency fund target',main:f.m(t),rows:[['Still needed',f.m(g)],['Covered right now',f.n(v.exp?v.saved/v.exp:0,1)+' months'],['Time to finish',g<=0?'Done 🎉':v.add>0?f.mo(g/v.add):'Add a monthly amount']],note:'Common advice: 3 months if your income is stable, 6–12 if it is not. Keep it in an accessible savings account.'}}};

T['credit-card']={fields:[N('bal','Card balance',5000),N('apr','Interest rate (APR)',22,{unit:'%',max:100,step:.01}),N('pay','Monthly payment',250),N('extra','Extra monthly payment',0)],
 calc(v){const r=v.apr/1200,p=v.pay+v.extra;let b=v.bal,i=0,n=0,first=b*r;const ser=[b];
 if(b>0&&p<=first+.005)return{label:'Months to pay off',main:'Never',rows:[['First month interest',f.m2(first)],['Minimum to make progress',f.m2(first+1)]],warn:'Your payment does not cover the monthly interest, so the debt will not shrink.'};
 while(b>.005&&n<1200){const x=b*r;const pay=Math.min(p,b+x);b=b+x-pay;i+=x;n++;ser.push(b)}
 return{label:'Debt-free in',main:f.mo(n),rows:[['Total interest',f.m(i)],['Total paid',f.m(v.bal+i)],['First month interest',f.m2(first)]],chart:{t:'Balance over time',y:downs(ser),x:['Today','Debt-free'],fmt:'m'},note:'Assumes a fixed rate and no new purchases.'}}};

T.currency={fields:[{id:'from',label:'From (code)',def:'USD',type:'text',max:6},{id:'to',label:'To (code)',def:'EUR',type:'text',max:6},N('amt','Amount',1000,{step:.01}),N('rate','Exchange rate (1 from = ? to)',0.92,{step:.0001,hint:'Enter today’s rate from your bank or app.'}),N('fee','Fee / margin',1.5,{unit:'%',max:20,step:.01})],
 calc(v){const t=(v.to||'').toUpperCase(),fr=(v.from||'').toUpperCase(),base=v.amt*v.rate,fee=base*v.fee/100;
 return{label:`You receive (${t||'?'})`,main:f.n(base-fee,2),rows:[['Before fees',f.n(base,2)+' '+t],['Fee cost',f.n(fee,2)+' '+t],['Effective rate',f.n(v.rate*(1-v.fee/100),4)],['Reverse rate (1 '+t+')',v.rate?f.n(1/v.rate,4)+' '+fr:'—']],note:'Live rates are not fetched. Enter the rate you were quoted, and check card or transfer fees.'}}};

T.overtime={fields:[N('sal','Monthly base salary',3000),N('hrs','Paid hours per week',40,{min:1,max:100}),N('m1','Overtime multiplier',1.5,{step:.05,min:1}),N('h1','Overtime hours',10),N('m2','Holiday / weekend multiplier',2,{step:.05,min:1}),N('h2','Holiday hours',0)],
 calc(v){const h=v.sal*12/(52*v.hrs),a=h*v.m1*v.h1,b=h*v.m2*v.h2;
 return{label:'Extra pay this period',main:f.m2(a+b),rows:[['Regular hourly rate',f.m2(h)],['Overtime pay',f.m2(a)],['Holiday pay',f.m2(b)],['Total with base salary',f.m(v.sal+a+b)]],note:'Overtime rules differ by country and contract. Check your local law and employer policy.'}}};

T.compound={fields:[N('init','Starting amount',5000),N('monthly','Monthly contribution',300),N('rate','Expected annual return',7,{unit:'%',max:50,step:.01}),N('years','Years',20,{min:1,max:80}),N('infl','Inflation',2.5,{unit:'%',max:30,step:.1})],
 calc(v){const r=v.rate/1200,n=Math.round(v.years*12);let b=v.init;const s=[b];for(let k=1;k<=n;k++){b=b*(1+r)+v.monthly;if(k%12===0||k===n)s.push(b)}
 const put=v.init+v.monthly*n,real=b/Math.pow(1+v.infl/100,v.years);
 return{label:'Future value',main:f.m(b),rows:[['You contribute',f.m(put)],['Growth earned',f.m(b-put)],['Growth share',f.p(b?(b-put)/b*100:0,0)],['In today’s money (after inflation)',f.m(real)]],chart:{t:'Growth by year',y:s,x:['Year 0','Year '+v.years],fmt:'m'},note:'Assumes a constant return and end-of-month contributions. Real returns fluctuate and are never guaranteed.'}}};

T.mortgage={fields:[N('loan','Loan amount',250000),N('rate','Interest rate',6.5,{unit:'%',max:30,step:.01}),N('years','Term (years)',30,{min:1,max:50}),N('extra','Extra monthly principal',0)],
 calc(v){const r=v.rate/1200,n=Math.round(v.years*12),pay=pmt(v.loan,r,n),intr=pay*n-v.loan,q=pay+v.extra;let b=v.loan,k=0,ti=0;const s=[b];
 while(b>.5&&k<1200){const i=b*r;b=b+i-Math.min(q,b+i);ti+=i;k++;if(k%12===0)s.push(b)}s.push(0);
 const rows=[['Total interest (no extra)',f.m(intr)],['Total paid',f.m(pay*n)]];if(v.extra>0)rows.push(['Paid off in',f.mo(k)],['Interest saved',f.m(Math.max(0,intr-ti))]);
 return{label:'Monthly payment (principal + interest)',main:f.m2(pay),rows,chart:{t:'Remaining balance',y:s,x:['Start','Paid off'],fmt:'m'},note:'Fixed-rate loan. Taxes, insurance and variable-rate changes are not included.'}}};

T.retirement={fields:[N('age','Current age',30,{min:16,max:90,int:1}),N('ret','Retirement age',65,{min:17,max:100,int:1}),N('live','Plan to age',90,{min:18,max:120,int:1}),N('exp','Monthly spending in retirement (today’s money)',3000),N('pen','Pension / other income (today’s money)',800,{unit:'/mo'}),N('saved','Retirement savings today',20000),N('pre','Return before retirement',7,{unit:'%',max:30,step:.1}),N('post','Return after retirement',4,{unit:'%',max:30,step:.1}),N('infl','Inflation',2.5,{unit:'%',max:20,step:.1})],
 calc(v){const y=v.ret-v.age,k=v.live-v.ret;if(y<=0||k<=0)return{label:'Monthly saving needed',main:'—',rows:[],warn:'Retirement age must be above your age, and the plan age above retirement age.'};
 const f1=v.infl/100,fm=Math.max(0,v.exp-v.pen)*Math.pow(1+f1,y),rr=(1+v.post/100)/(1+f1)-1,fac=(rr?(1-Math.pow(1+rr,-k))/rr:k)*(1+rr),fund=fm*12*fac,N2=y*12,r=v.pre/1200,g=Math.pow(1+r,N2),need=Math.max(0,fund-v.saved*g),m=need<=0?0:r?need*r/(g-1):need/N2;
 return{label:'Save each month',main:f.m(m),rows:[['Nest egg needed at retirement',f.m(fund)],['…in today’s money',f.m(fund/Math.pow(1+f1,y))],['Monthly spending then (from savings)',f.m(fm)],['Years to save / years funded',y+' / '+k]],note:'Spending grows with inflation, savings earn your after-retirement return, and withdrawals start each year. This is a planning estimate only.',warn:need<=0?'Your current savings are on track without extra contributions.':'',win:need<=0}}};

T.inflation={fields:[N('amt','Amount of money',10000),N('infl','Average inflation',3,{unit:'%',max:50,step:.1}),N('sav','Interest earned on savings',1,{unit:'%',max:50,step:.1}),N('years','Years',10,{min:1,max:80})],
 calc(v){const pw=Math.pow(1+v.infl/100,v.years),nom=v.amt*Math.pow(1+v.sav/100,v.years),rr=(1+v.sav/100)/(1+v.infl/100)-1;
 return{label:'Real value of your savings (today’s money)',main:f.m(nom/pw),rows:[['Balance with interest',f.m(nom)],['Same basket costs',f.m(v.amt*pw)],['Purchasing power of cash',f.m(v.amt/pw)],['Real yearly return',f.p(rr*100,2)],['Prices double in',v.infl>0?f.n(Math.log(2)/Math.log(1+v.infl/100),1)+' years':'—']],note:'Inflation varies year to year. Real return = (1 + interest) ÷ (1 + inflation) − 1.'}}};

/* ---------- Stocks ---------- */
T['stock-profit']={fields:[N('sh','Shares',100,{step:'any'}),N('buy','Buy price per share',50,{step:.01}),N('sell','Sell price per share',65,{step:.01}),N('fl','Commission per trade (flat)',0,{step:.01}),N('pc','Fee per trade (%)',0,{unit:'%',max:10,step:.001}),N('tax','Tax on gains',15,{unit:'%',max:60,step:.1}),N('days','Days held',365,{int:1,max:36500})],
 calc(v){const c=v.sh*v.buy,pr=v.sh*v.sell,fees=2*v.fl+(c+pr)*v.pc/100,gross=pr-c,pre=gross-fees,tax=Math.max(0,pre)*v.tax/100,net=pre-tax,cost=c+v.fl+c*v.pc/100,roi=cost?net/cost*100:0;
 const be=v.sh?(c*(1+v.pc/100)+2*v.fl)/(v.sh*(1-v.pc/100)):0,ann=v.days>0&&cost&&net>-cost?(Math.pow(1+net/cost,365/v.days)-1)*100:NaN;
 return{label:'Net profit / loss after fees & tax',main:f.m2(net),rows:[['Gross gain / loss',f.m2(gross)],['Fees',f.m2(fees)],['Tax',f.m2(tax)],['Return on cost',f.p(roi,2)],['Annualized return',isNaN(ann)?'—':f.p(ann,1)],['Break-even sell price',f.m2(be)]],note:'Tax is applied only to positive gains and ignores loss offsets and local rules. This is an estimate, not tax advice.',warn:v.pc>=100?'Fee % is too high.':''}}};

T['stock-average']={fields:[N('s1','Lot 1 – shares',100,{step:'any'}),N('p1','Lot 1 – price',50,{step:.01}),N('s2','Lot 2 – shares',50,{step:'any'}),N('p2','Lot 2 – price',42,{step:.01}),N('s3','Lot 3 – shares',0,{step:'any'}),N('p3','Lot 3 – price',0,{step:.01}),N('np','Next buy price',38,{step:.01}),N('ns','Shares you plan to buy',50,{step:'any'}),N('tg','Target average price (optional)',0,{step:.01,hint:'See how many shares you would need to hit it.'})],
 calc(v){const s=v.s1+v.s2+v.s3,c=v.s1*v.p1+v.s2*v.p2+v.s3*v.p3;if(!s)return{label:'Average cost',main:'—',rows:[],warn:'Enter at least one lot with shares.'};const avg=c/s,a2=(c+v.ns*v.np)/(s+v.ns),rows=[['Shares owned now',f.n(s,2)],['Total invested',f.m2(c)],['Average cost now',f.m2(avg)],['Average after next buy',f.m2(a2)],['Total shares after',f.n(s+v.ns,2)]];let w='';
 if(v.tg>0){if(v.tg>=avg)w='Your average is already at or below that target.';else if(v.np>=v.tg)w='Your next buy price must be below the target average to reach it.';else{const n=Math.ceil(s*(avg-v.tg)/(v.tg-v.np));rows.push(['Shares to reach target',f.n(n)],['Cash needed',f.m2(n*v.np)])}}
 return{label:v.ns>0?'New average cost per share':'Average cost per share',main:f.m2(v.ns>0?a2:avg),rows,warn:w,note:'Averaging down lowers your cost basis but increases your exposure. It does not make a falling stock a better company.'}}};

T.dividend={fields:[N('px','Share price',60,{step:.01}),N('dps','Annual dividend per share',2.4,{step:.01}),N('sh','Shares owned',200,{step:'any'}),N('dg','Dividend growth per year',5,{unit:'%',max:50,step:.1}),N('pg','Price growth per year',4,{unit:'%',min:-50,max:50,step:.1}),N('years','Years',15,{min:1,max:60,int:1}),N('tax','Dividend tax',15,{unit:'%',max:60,step:.1}),{id:'drip',label:'Reinvest dividends (DRIP)',def:true,type:'check'}],
 calc(v){let s=v.sh;const ser=[s*v.px];let inc=0,tot=0;for(let t=1;t<=v.years;t++){inc=s*v.dps*Math.pow(1+v.dg/100,t-1)*(1-v.tax/100);tot+=inc;const p=v.px*Math.pow(1+v.pg/100,t);if(v.drip&&p>0)s+=inc/p;ser.push(s*p)}
 const dN=v.dps*Math.pow(1+v.dg/100,v.years-1),y0=v.px?v.dps/v.px*100:0;
 return{label:'Dividend income today (before tax)',main:f.m2(v.sh*v.dps),rows:[['Dividend yield',f.p(y0,2)],['Position value today',f.m(v.sh*v.px)],['Income in year '+v.years+' (after tax)',f.m(inc)],['Yield on your cost then',f.p(v.px?dN/v.px*100:0,1)],['Total dividends received',f.m(tot)],['Shares after '+v.years+' yrs',f.n(s,2)],['Position value then',f.m(ser[ser.length-1])]],chart:{t:'Position value by year',y:ser,x:['Today','Year '+v.years],fmt:'m'},note:'Dividends are not guaranteed and can be cut. Yearly steps and constant growth are simplifications.',warn:y0>12?'A yield this high can signal a risk of a dividend cut.':''}}};

T['position-size']={fields:[N('acct','Account size',25000),N('risk','Risk per trade',1,{unit:'%',max:100,step:.1}),N('entry','Entry price',50,{step:.01}),N('stop','Stop-loss price',47,{step:.01}),N('tgt','Target price (optional)',58,{step:.01}),N('fee','Commission per trade',0,{step:.01})],
 calc(v){const per=Math.abs(v.entry-v.stop),rd=v.acct*v.risk/100;if(!per||!v.entry)return{label:'Shares to buy',main:'—',rows:[],warn:'Entry and stop-loss must be different, positive prices.'};
 let sh=Math.floor(Math.max(0,rd-2*v.fee)/per),w='';const mx=Math.floor(v.acct/v.entry);if(sh>mx){sh=mx;w='Capped at what your account can buy (no leverage). Your real risk is smaller than planned.'}
 const long=v.entry>v.stop,risk=sh*per+2*v.fee,pos=sh*v.entry,rows=[['Direction',long?'Long':'Short'],['Position value',f.m(pos)],['Share of account',f.p(v.acct?pos/v.acct*100:0,1)],['Dollar risk',f.m2(risk)+' ('+f.p(v.acct?risk/v.acct*100:0,2)+')']];
 if(v.tgt>0){const ok=long?v.tgt>v.entry:v.tgt<v.entry;if(!ok)w=w||'Target should be on the profitable side of your entry.';else{const rw=Math.abs(v.tgt-v.entry)*sh-2*v.fee,rr=rw/risk;rows.push(['Potential reward',f.m2(rw)],['Reward : risk','1 : '+f.n(rr,2)],['Win rate needed to break even',f.p(100/(1+rr),0)])}}
 return{label:'Shares to buy',main:f.n(sh),rows,warn:w,note:'Shares = (account × risk %) ÷ distance to stop. Gaps and slippage can make real losses larger than planned.'}}};

T.valuation={fields:[N('px','Current share price',100,{step:.01}),N('eps','Earnings per share (last 12 months)',5,{step:.01}),N('g','Expected EPS growth per year',10,{unit:'%',min:-50,max:60,step:.1}),N('years','Years to project',5,{min:1,max:30,int:1}),N('pe','Future P/E you expect',18,{max:100,step:.1}),N('req','Your required return',10,{unit:'%',max:40,step:.1})],
 calc(v){if(v.eps<=0)return{label:'Estimated fair value',main:'—',rows:[],warn:'This method needs positive earnings. Try a revenue- or cash-flow-based approach for unprofitable companies.'};
 const fe=v.eps*Math.pow(1+v.g/100,v.years),fp=fe*v.pe,fv=fp/Math.pow(1+v.req/100,v.years),mos=fv?(fv-v.px)/fv*100:0,pe=v.px/v.eps;
 return{label:'Estimated fair value today',main:f.m2(fv),rows:[['Current P/E',f.n(pe,1)],['Earnings yield',f.p(100/pe,2)],['PEG ratio',v.g>0?f.n(pe/v.g,2):'—'],['EPS in '+v.years+' yrs',f.m2(fe)],['Price in '+v.years+' yrs',f.m2(fp)],['Margin of safety',f.p(mos,1)],['Verdict',mos>=25?'Looks undervalued':mos>=0?'Fairly priced':'Looks expensive']],note:'Fair value = future EPS × P/E, discounted at your required return. Results depend heavily on the growth and P/E you assume. Use it to compare scenarios, not to predict prices.',warn:v.g>40?'Growth above 40% a year for many years is rarely sustained.':'',win:mos>=25}}};

/* ---------- v5 additions ---------- */
T.fire={fields:[N('exp','Annual spending in retirement',40000),N('wr','Safe withdrawal rate',4,{unit:'%',min:1,max:10,step:.1}),N('saved','Invested today',50000),N('c','Monthly contribution',1500),N('ret','Expected real return (after inflation)',5,{unit:'%',min:-5,max:20,step:.1})],
 calc(v){const num=v.exp/(v.wr/100),r=Math.pow(1+v.ret/100,1/12)-1;let yrs;
 if(v.saved>=num)yrs=0;else if(r>0&&(v.c>0||v.saved>0))yrs=Math.log((num*r+v.c)/(v.saved*r+v.c))/Math.log(1+r)/12;else if(r<=0&&v.c>0)yrs=(num-v.saved)/v.c/12;else yrs=Infinity;
 return{label:'Your FIRE number',main:f.m(num),rows:[['Progress',f.p(num?v.saved/num*100:0,1)],['Years to financial independence',isFinite(yrs)?(yrs<=0?'You are there 🎉':f.n(yrs,1)+' years'):'Not reachable with these inputs'],['Lean FIRE (75% of spending)',f.m(num*.75)],['Fat FIRE (150% of spending)',f.m(num*1.5)]],win:v.saved>=num,
 note:'FIRE number = annual spending ÷ withdrawal rate. The 4% rule comes from historical US data and is not a guarantee; longer retirements may call for 3–3.5%. Returns here are real (after inflation).',warn:v.wr>5?'Withdrawal rates above 5% have a high risk of running out of money.':''}}};

T.networth={fields:[N('a1','Cash & savings',8000),N('a2','Investments & retirement accounts',35000),N('a3','Property value',0),N('a4','Other assets (car, valuables)',6000),N('l1','Mortgage balance',0),N('l2','Student / personal loans',4000),N('l3','Credit card debt',1500),N('l4','Other debts',0)],
 calc(v){const a=v.a1+v.a2+v.a3+v.a4,l=v.l1+v.l2+v.l3+v.l4,nw=a-l;
 return{label:'Your net worth',main:f.m(nw),rows:[['Total assets',f.m(a)],['Total liabilities',f.m(l)],['Debt-to-asset ratio',a?f.p(l/a*100,1):'—'],['Liquid share of assets',a?f.p(v.a1/a*100,1):'—']],win:nw>0&&l===0,note:'Net worth = assets − liabilities. Track it every few months. The trend matters more than the number.',warn:nw<0?'Negative net worth is common early in life. Focus on high-interest debt first.':''}}};

T.dti={fields:[N('inc','Gross monthly income',6000),N('h','Rent / mortgage payment',1600),N('car','Car payments',350),N('stu','Student loan payments',250),N('cc','Credit card minimums',100),N('oth','Other monthly debt payments',0)],
 calc(v){if(!v.inc)return{label:'Debt-to-income ratio',main:'—',rows:[],warn:'Enter your income.'};const d=v.h+v.car+v.stu+v.cc+v.oth,b=d/v.inc*100,fr=v.h/v.inc*100;
 return{label:'Back-end debt-to-income',main:f.p(b,1),rows:[['Housing ratio (front-end)',f.p(fr,1)],['Total monthly debt',f.m(d)],['Room left under 36%',f.m(Math.max(0,v.inc*.36-d))],['Assessment',b<=36?'Healthy':b<=43?'Borderline, near lender limits':'High, hard to qualify']],note:'Lenders often prefer a back-end ratio at or below 36% and rarely go above 43–50%. Rules vary by country and loan type.'}}};

T.cagr={fields:[N('s','Starting value',10000,{min:.01}),N('e','Ending value',25000),N('y','Years',8,{min:.1,max:100,step:.1}),N('r','Growth rate for doubling time',7,{unit:'%',min:.01,max:100,step:.1})],
 calc(v){const g=Math.pow(v.e/v.s,1/v.y)-1;
 return{label:'Compound annual growth rate (CAGR)',main:f.p(g*100,2),rows:[['Total return',f.p((v.e/v.s-1)*100,1)],['Gain / loss',f.m(v.e-v.s)],['Doubling time at '+f.p(v.r,1),f.n(Math.log(2)/Math.log(1+v.r/100),1)+' years'],['Rule of 72 estimate',f.n(72/v.r,1)+' years']],note:'CAGR smooths uneven returns into one steady yearly rate. It ignores the path taken and any deposits or withdrawals.'}}};

T.rebalance=(()=>{const A=[['Stocks',60,5000],['Bonds',30,3000],['Cash',10,1000],['Other',0,0]];return{fields:[...A.map((a,i)=>N('v'+i,a[0]+' – current value',a[2])),...A.map((a,i)=>N('t'+i,a[0]+' – target',a[1],{unit:'%',max:100,step:.1})),N('add','New money to invest',500)],
 calc(v){const cur=A.map((a,i)=>v['v'+i]),tot=cur.reduce((x,y)=>x+y,0)+v.add,ts=A.reduce((x,a,i)=>x+v['t'+i],0);let move=0;
 const rows=A.map((a,i)=>{const d=tot*v['t'+i]/100-cur[i];if(d>0)move+=d;return[a[0]+' → '+f.p(cur.reduce((x,y)=>x+y,0)?cur[i]/(tot-v.add||1)*100:0,0)+' now',(d>=0?'Buy ':'Sell ')+f.m(Math.abs(d))]});
 return{label:'Total to move into target mix',main:f.m(move),rows,note:'Direct new money to underweight assets first to avoid selling and triggering taxes. Check transaction costs before selling.',warn:Math.abs(ts-100)>.01?`Targets add up to ${f.n(ts,1)}%, not 100%.`:''}}}})();

T.freelance={fields:[N('inc','Target yearly take-home',60000),N('exp','Business expenses per year',6000),N('tax','Tax & reserves',25,{unit:'%',max:60,step:.1}),N('off','Weeks off (holidays, sick)',6,{max:51}),N('hrs','Billable hours per week',25,{min:1,max:80}),N('mar','Profit buffer',10,{unit:'%',max:100})],
 calc(v){const gross=(v.inc/(1-v.tax/100)+v.exp)*(1+v.mar/100),h=(52-v.off)*v.hrs,rate=gross/h;
 return{label:'Hourly rate you should charge',main:f.m2(rate),rows:[['Revenue needed per year',f.m(gross)],['Billable hours per year',f.n(h)],['Day rate (8 hrs)',f.m(rate*8)],['Revenue needed per month',f.m(gross/12)]],note:'Only about half your working time is typically billable, so enter billable hours, not total hours. Taxes vary widely, so confirm with an accountant.'}}};

const api={f,T,CUR,st};
if(typeof module!=='undefined')module.exports=api;else window.WS=api;
})();

/* Dashboard Financeiro Usinagem - modo apresentação */
const data = Array.isArray(window.FINANCE_DATA) ? window.FINANCE_DATA : [];
let baseRows = data.map(normalizeRow);
let rows = [...baseRows];
let charts = {};
const monthsOrder = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const fmtMoney = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const fmtNum = new Intl.NumberFormat('pt-BR');
const $ = id => document.getElementById(id);

const palette = ['#f6b44b','#4f7cff','#3be2a1','#ff5e78','#9b5cff','#20d5ff','#ff9f43','#7dd3fc'];

window.addEventListener('DOMContentLoaded',()=>{
  setupChartDefaults();
  populateFilters();
  bindEvents();
  applyFilters();
  toast('Dashboard carregado com dados do arquivo Financeiro Usinagem 2026. Gráficos em canvas com rótulos ativados.');
});

function normalizeRow(r){
  return {
    tipo: r.tipo || 'Receita', data: r.data || '', mes: r.mes || '', area: r.area || 'Não informado', forma: r.forma || 'Não informado',
    cliente: r.cliente || 'Não informado', descricao: r.descricao || 'Sem descrição', os: String(r.os || ''), receita:+r.receita||0,
    servicos:+r.servicos||0, produto:+r.produto||0, custo:+r.custo||0, fornecedor:r.fornecedor || '', pedido:r.pedido || '',
    categoria:r.categoria || r.area || 'Não informado', mecanico:r.mecanico || '', linha:r.linha || ''
  };
}
function bindEvents(){
  ['monthFilter','areaFilter','typeFilter','paymentFilter','searchInput'].forEach(id=>$(id).addEventListener('input',applyFilters));
  $('btnExport').addEventListener('click',exportCSV);
  $('btnPresentation').addEventListener('click',()=>{document.body.classList.toggle('presentation'); setTimeout(()=>Object.values(charts).forEach(c=>c.resize()),250);});
  $('fileInput').addEventListener('change',handleImport);
}
function populateFilters(){
  fillSelect('monthFilter',unique(baseRows.map(r=>r.mes)).sort((a,b)=>monthsOrder.indexOf(a)-monthsOrder.indexOf(b)));
  fillSelect('areaFilter',unique(baseRows.map(r=>r.area)).sort());
  fillSelect('paymentFilter',unique(baseRows.map(r=>r.forma)).sort());
  const months=unique(baseRows.map(r=>r.mes)).filter(Boolean);
  $('sidePeriod').textContent = `${months[0] || '-'} a ${months[months.length-1] || '-'} • ${baseRows.length} registros`;
}
function fillSelect(id,values){
  const sel=$(id); const first=sel.querySelector('option')?.outerHTML || '<option value="all">Todos</option>';
  sel.innerHTML = first + values.filter(Boolean).map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
}
function applyFilters(){
  const month=$('monthFilter').value, area=$('areaFilter').value, type=$('typeFilter').value, pay=$('paymentFilter').value, q=norm($('searchInput').value);
  rows=baseRows.filter(r=>{
    if(month!=='all'&&r.mes!==month) return false;
    if(area!=='all'&&r.area!==area) return false;
    if(type!=='all'&&r.tipo!==type) return false;
    if(pay!=='all'&&r.forma!==pay) return false;
    if(q){ const hay=norm([r.data,r.tipo,r.area,r.forma,r.cliente,r.descricao,r.os,r.fornecedor,r.mecanico,r.pedido].join(' ')); if(!hay.includes(q)) return false; }
    return true;
  });
  updateAll();
}
function updateAll(){
  const revenue=sum(rows,r=>r.receita); const cost=sum(rows,r=>r.tipo==='Gasto'?r.custo:0); const linkedCost=sum(rows,r=>r.tipo==='Receita'?r.custo:0);
  const totalCost=cost; const profit=revenue-totalCost; const margin=revenue?profit/revenue*100:0;
  const osUnique=unique(rows.filter(r=>r.receita>0&&r.os).map(r=>r.os)).length; const ticket=osUnique?revenue/osUnique:0;
  $('kpiRevenue').textContent=fmtMoney.format(revenue); $('kpiCost').textContent=fmtMoney.format(totalCost); $('kpiProfit').textContent=fmtMoney.format(profit); $('kpiMargin').textContent=`${margin.toFixed(1).replace('.',',')}%`; $('kpiOs').textContent=fmtNum.format(osUnique); $('kpiTicket').textContent=fmtMoney.format(ticket);
  $('kpiRevenueSub').textContent=`${fmtNum.format(rows.filter(r=>r.tipo==='Receita').length)} lançamentos de receita`; $('kpiCostSub').textContent=`${fmtNum.format(rows.filter(r=>r.tipo==='Gasto').length)} compras de insumos`;
  setKpiTitle('kpiRevenue', revenue); setKpiTitle('kpiCost', totalCost); setKpiTitle('kpiProfit', profit); setKpiTitle('kpiTicket', ticket);
  $('heroProfit').textContent=fmtMoney.format(profit); $('heroRevenue').textContent=fmtMoney.format(revenue); $('heroCost').textContent=fmtMoney.format(totalCost); $('heroMargin').textContent=`${margin.toFixed(1).replace('.',',')}%`; $('heroMargin').className=`pill ${margin>=0?'good':'bad'}`;
  $('sideStatus').textContent=`${fmtNum.format(rows.length)} registros filtrados`; $('rowCounter').textContent=`${fmtNum.format(rows.length)} linhas`;
  renderInsights(revenue,totalCost,profit,margin,linkedCost); renderCharts(); renderTables();
}
function renderInsights(revenue,cost,profit,margin,linkedCost){
  const byMonth=group(rows,'mes'), byClient=group(rows.filter(r=>r.tipo==='Receita'),'cliente'), bySupplier=group(rows.filter(r=>r.tipo==='Gasto'),'fornecedor'), byArea=group(rows,'area');
  const bestMonth=topEntry(byMonth, arr=>sum(arr,r=>r.receita)); const topClient=topEntry(byClient,arr=>sum(arr,r=>r.receita)); const topSupplier=topEntry(bySupplier,arr=>sum(arr,r=>r.custo)); const topArea=topEntry(byArea,arr=>sum(arr,r=>r.receita));
  const prazo=sum(rows.filter(r=>r.forma==='À Prazo'),r=>r.receita+r.custo); const vista=sum(rows.filter(r=>r.forma==='À Vista'),r=>r.receita+r.custo); const totalFlux=prazo+vista;
  const list=[
    {b:bestMonth.key||'-',s:`Melhor mês em faturamento: ${fmtMoney.format(bestMonth.value||0)}.`},
    {b:topClient.key||'-',s:`Cliente com maior receita: ${fmtMoney.format(topClient.value||0)}.`},
    {b:topSupplier.key||'-',s:`Fornecedor com maior compra de insumos: ${fmtMoney.format(topSupplier.value||0)}.`},
    {b:`${margin.toFixed(1).replace('.',',')}%`,s:`Margem estimada no recorte. Materiais vinculados nas OS: ${fmtMoney.format(linkedCost)}.`},
    {b:topArea.key||'-',s:`Área com maior receita no filtro: ${fmtMoney.format(topArea.value||0)}.`},
    {b:totalFlux?`${(prazo/totalFlux*100).toFixed(0)}%`: '0%',s:'Participação financeira dos lançamentos à prazo, considerando receitas e compras de insumos.'},
    {b:fmtMoney.format(profit),s: profit>=0?'Resultado positivo no recorte filtrado.':'Resultado negativo no recorte filtrado.'},
    {b:fmtNum.format(rows.length),s:'Registros considerados após os filtros aplicados.'}
  ];
  $('insightsGrid').innerHTML=list.map(i=>`<div class="insight"><b>${escapeHtml(i.b)}</b><small>${escapeHtml(i.s)}</small></div>`).join('');
}
function renderCharts(){
  if(!window.Chart){ console.warn('Chart.js não carregado. Conecte-se à internet ou hospede a biblioteca localmente.'); return; }
  const byMonth=group(rows,'mes'); const monthLabels=monthsOrder.filter(m=>byMonth[m]);
  const revenueByMonth=monthLabels.map(m=>sum(byMonth[m],r=>r.receita));
  const costByMonth=monthLabels.map(m=>sum(byMonth[m],r=>r.tipo==='Gasto'?r.custo:0));
  const profitByMonth=monthLabels.map((m,i)=>revenueByMonth[i]-costByMonth[i]);

  draw('chartHero','line',{labels:monthLabels,datasets:[
    {label:'Resultado',data:profitByMonth,borderColor:palette[2],backgroundColor:'rgba(59,226,161,.18)',tension:.38,fill:true,pointRadius:4},
    {label:'Faturamento',data:revenueByMonth,borderColor:palette[0],backgroundColor:'rgba(246,180,75,.12)',tension:.38,fill:true,pointRadius:3}
  ]},{plugins:{legend:{display:false},datalabels:{display:false}},scales:{x:{display:false},y:{display:false}}});

  draw('chartMonthly','bar',{labels:monthLabels,datasets:[
    {label:'Faturamento',data:revenueByMonth,backgroundColor:palette[0],borderRadius:10},
    {label:'Compras de insumos',data:costByMonth,backgroundColor:palette[3],borderRadius:10},
    {label:'Resultado',data:profitByMonth,type:'line',borderColor:palette[2],backgroundColor:'rgba(59,226,161,.16)',tension:.32,fill:false,pointRadius:4,datalabels:{align:'top',anchor:'end'}}
  ]},{plugins:{datalabels:{display:true,formatter:v=>moneyShort(v),font:{weight:'800',size:10}}}});

  const area=entriesBy(rows,'area',r=>r.receita+r.custo).slice(0,6);
  draw('chartArea','doughnut',{labels:area.map(x=>x.key),datasets:[{label:'Volume financeiro',data:area.map(x=>x.value),backgroundColor:palette,borderWidth:0}]},{
    cutout:'64%',
    plugins:{
      datalabels:{display:true,color:'#06101f',backgroundColor:'rgba(255,255,255,.86)',borderRadius:8,padding:5,font:{weight:'900',size:10},formatter:(v,ctx)=>{const total=ctx.chart.data.datasets[0].data.reduce((a,b)=>a+(+b||0),0);return total?`${(v/total*100).toFixed(0)}%`:'';}},
      tooltip:{callbacks:{label:c=>`${c.label}: ${fmtMoney.format(c.parsed)}`}}
    }
  });

  const pay=entriesBy(rows,'forma',r=>r.receita+r.custo);
  draw('chartPayment','bar',{labels:pay.map(x=>x.key),datasets:[{label:'Volume financeiro',data:pay.map(x=>x.value),backgroundColor:[palette[1],palette[0],palette[2]],borderRadius:12}]},{plugins:{legend:{display:false},datalabels:{display:true,formatter:v=>moneyShort(v)}}});

  const clients=entriesBy(rows.filter(r=>r.tipo==='Receita'),'cliente',r=>r.receita).slice(0,8);
  draw('chartClients','bar',{labels:clients.map(x=>short(x.key,28)),datasets:[{label:'Faturamento',data:clients.map(x=>x.value),backgroundColor:palette[1],borderRadius:10}]},{indexAxis:'y',plugins:{legend:{display:false},datalabels:{display:true,align:'right',anchor:'end',formatter:v=>moneyShort(v)}}});

  const supp=entriesBy(rows.filter(r=>r.tipo==='Gasto'),'fornecedor',r=>r.custo).filter(x=>x.key&&x.key!=='Não informado').slice(0,8);
  draw('chartSuppliers','bar',{labels:supp.map(x=>short(x.key,28)),datasets:[{label:'Compras de insumos',data:supp.map(x=>x.value),backgroundColor:palette[3],borderRadius:10}]},{indexAxis:'y',plugins:{legend:{display:false},datalabels:{display:true,align:'right',anchor:'end',formatter:v=>moneyShort(v)}}});

  const mec=entriesBy(rows.filter(r=>r.tipo==='Receita'),'mecanico',r=>r.receita).filter(x=>x.key&&x.key!=='Não informado').slice(0,8);
  draw('chartMechanics','bar',{labels:mec.map(x=>short(x.key,22)),datasets:[{label:'Faturamento',data:mec.map(x=>x.value),backgroundColor:palette[5],borderRadius:10}]},{plugins:{legend:{display:false},datalabels:{display:true,formatter:v=>moneyShort(v)}}});
}
function draw(id,type,data,extra={}){
  const ctx=$(id); if(!ctx) return; if(charts[id]) charts[id].destroy();
  const isHorizontal = extra.indexAxis === 'y';
  const hasCartesianScale = !['doughnut','pie','polarArea','radar'].includes(type);
  const baseOptions={
    responsive:true,
    maintainAspectRatio:false,
    animation:{duration:850,easing:'easeOutQuart'},
    layout:{padding:{top:22,right:isHorizontal?68:18,bottom:4,left:4}},
    plugins:{
      legend:{labels:{color:'#d7e1f3',boxWidth:10,usePointStyle:true,font:{weight:'700'}}},
      datalabels:{
        display:!!window.__HAS_DATALABELS,
        color:'#f8fbff',
        anchor:'end',
        align:isHorizontal?'right':'top',
        offset:4,
        clamp:true,
        clip:false,
        formatter:v=>typeof v==='number'?moneyShort(v):v,
        font:{weight:'900',size:10},
        textStrokeColor:'rgba(3,7,18,.68)',
        textStrokeWidth:2
      },
      tooltip:{callbacks:{label:c=>`${c.dataset.label||c.label}: ${fmtMoney.format(c.parsed.y ?? c.parsed.x ?? c.parsed)}`}}
    }
  };
  if(hasCartesianScale){
    baseOptions.scales = isHorizontal ? {
      x:{ticks:{color:'#93a4bd',callback:v=>moneyShort(v),font:{weight:'700'}},grid:{color:'rgba(255,255,255,.07)'}},
      y:{ticks:{color:'#93a4bd',font:{weight:'700'},autoSkip:false},grid:{color:'rgba(255,255,255,.07)'}}
    } : {
      x:{ticks:{color:'#93a4bd',font:{weight:'700'},maxRotation:0,autoSkip:false},grid:{color:'rgba(255,255,255,.07)'}},
      y:{ticks:{color:'#93a4bd',callback:v=>moneyShort(v),font:{weight:'700'}},grid:{color:'rgba(255,255,255,.07)'}}
    };
  }
  const options=merge(baseOptions,extra);
  charts[id]=new Chart(ctx,{type,data,options});
}
function renderTables(){
  const byDesc={}; rows.forEach(r=>{ const key=r.descricao || 'Sem descrição'; byDesc[key]=byDesc[key]||{desc:key,types:new Set(),revenue:0,cost:0,count:0}; byDesc[key].types.add(typeLabel(r.tipo)); byDesc[key].revenue+=r.receita; byDesc[key].cost+=r.tipo==='Gasto'?r.custo:0; byDesc[key].count++; });
  const ranked=Object.values(byDesc).sort((a,b)=>(b.revenue-b.cost)-(a.revenue-a.cost)).slice(0,16);
  $('rankingRows').innerHTML=ranked.map(x=>{const res=x.revenue-x.cost;return `<tr><td title="${escapeHtml(x.desc)}">${escapeHtml(short(x.desc,48))}</td><td>${[...x.types].map(t=>`<span class="type-badge ${typeClass(t)}">${t}</span>`).join(' ')}</td><td>${fmtMoney.format(x.revenue)}</td><td>${fmtMoney.format(x.cost)}</td><td class="${res>=0?'positive':'negative'}">${fmtMoney.format(res)}</td><td>${fmtNum.format(x.count)}</td></tr>`}).join('');
  const clients=entriesBy(rows.filter(r=>r.tipo==='Receita'),'cliente',r=>r.receita).slice(0,10);
  $('clientList').innerHTML=clients.map((x,i)=>`<div class="rank-item"><div class="rank-num">${i+1}</div><div><strong title="${escapeHtml(x.key)}">${escapeHtml(short(x.key,26))}</strong><small>${fmtNum.format(group(rows.filter(r=>r.cliente===x.key),'os')?unique(rows.filter(r=>r.cliente===x.key&&r.os).map(r=>r.os)).length:0)} OS</small></div><b>${fmtMoney.format(x.value)}</b></div>`).join('');
  $('detailRows').innerHTML=rows.slice(0,250).map(r=>`<tr><td>${escapeHtml(r.data)}</td><td><span class="type-badge ${typeClass(r.tipo)}">${typeLabel(r.tipo)}</span></td><td>${escapeHtml(r.area)}</td><td>${escapeHtml(r.forma)}</td><td title="${escapeHtml(r.cliente)}">${escapeHtml(short(r.cliente,26))}</td><td title="${escapeHtml(r.descricao)}">${escapeHtml(short(r.descricao,42))}</td><td>${escapeHtml(r.os)}</td><td>${fmtMoney.format(r.receita)}</td><td>${fmtMoney.format(r.tipo==='Gasto'?r.custo:0)}</td><td>${escapeHtml(short(r.fornecedor||r.mecanico||'-',30))}</td></tr>`).join('');
}
function exportCSV(){
  const header=['data','tipo','mes','area','forma','cliente','descricao','os','receita','insumos','fornecedor','mecanico','pedido'];
  const csv=[header.join(';')].concat(rows.map(r=>header.map(h=>`"${String(h==='insumos'?(r.tipo==='Gasto'?r.custo:0):(h==='tipo'?typeLabel(r.tipo):(r[h]??''))).replace(/"/g,'""')}"`).join(';'))).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='dashboard-usinagem-filtrado.csv'; a.click(); URL.revokeObjectURL(a.href); toast('Base filtrada exportada em CSV.');
}
function handleImport(e){
  const file=e.target.files?.[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{try{ let text=reader.result; if(file.name.toLowerCase().endsWith('.json')){baseRows=JSON.parse(text).map(normalizeRow);} else {baseRows=parseCSV(text).map(normalizeRow);} populateFilters(); applyFilters(); toast(`Arquivo importado: ${file.name}`);}catch(err){console.error(err); toast('Não foi possível importar. Use JSON no mesmo modelo ou CSV com cabeçalho.');}}; reader.readAsText(file,'utf-8');
}
function parseCSV(text){ const lines=text.split(/\r?\n/).filter(Boolean); if(!lines.length)return[]; const sep=lines[0].includes(';')?';':','; const header=lines[0].split(sep).map(h=>h.trim().replace(/^"|"$/g,'')); return lines.slice(1).map(line=>{const cells=line.split(sep).map(c=>c.trim().replace(/^"|"$/g,'')); const obj={}; header.forEach((h,i)=>obj[h]=cells[i]); return obj;}); }
function setupChartDefaults(){
  if(!window.Chart) return;
  if(window.ChartDataLabels){ Chart.register(window.ChartDataLabels); window.__HAS_DATALABELS=true; }
  else { Chart.register(buildInlineDataLabelsPlugin()); window.__HAS_DATALABELS=true; }
  Chart.defaults.color='#d7e1f3';
  Chart.defaults.font.family='Inter, sans-serif';
  Chart.defaults.plugins.tooltip.backgroundColor='rgba(5,9,21,.94)';
  Chart.defaults.plugins.tooltip.borderColor='rgba(255,255,255,.14)';
  Chart.defaults.plugins.tooltip.borderWidth=1;
}
function buildInlineDataLabelsPlugin(){
  return {
    id:'datalabels',
    afterDatasetsDraw(chart,args,pluginOptions){
      const globalOpts = pluginOptions || {};
      chart.data.datasets.forEach((dataset,datasetIndex)=>{
        const dsOpts = dataset.datalabels || {};
        const display = dsOpts.display ?? globalOpts.display;
        if(display === false) return;
        const meta = chart.getDatasetMeta(datasetIndex);
        if(!meta || meta.hidden) return;
        const chartType = dataset.type || chart.config.type;
        const isHorizontal = chart.options.indexAxis === 'y';
        const ctx = chart.ctx;
        meta.data.forEach((element,dataIndex)=>{
          if(!element) return;
          const rawValue = dataset.data[dataIndex];
          if(rawValue === null || rawValue === undefined || rawValue === '') return;
          const formatter = dsOpts.formatter || globalOpts.formatter || (v=>v);
          const value = formatter(rawValue,{chart,dataset,datasetIndex,dataIndex});
          if(value === null || value === undefined || value === '') return;
          const font = {...(globalOpts.font||{}),...(dsOpts.font||{})};
          const size = font.size || 10;
          const weight = font.weight || '900';
          const pos = element.tooltipPosition();
          let x = pos.x, y = pos.y, align = 'center', baseline = 'bottom';
          if(chartType === 'bar'){
            if(isHorizontal){ x = pos.x + 8; y = pos.y + 4; align='left'; baseline='middle'; }
            else { y = pos.y - 8; baseline='bottom'; }
          }else if(chartType === 'line'){
            y = pos.y - 10; baseline='bottom';
          }else if(chartType === 'doughnut' || chartType === 'pie'){
            baseline='middle';
          }
          ctx.save();
          ctx.font = `${weight} ${size}px Inter, system-ui, sans-serif`;
          ctx.textAlign = align;
          ctx.textBaseline = baseline;
          ctx.lineWidth = globalOpts.textStrokeWidth || 2;
          ctx.strokeStyle = globalOpts.textStrokeColor || 'rgba(3,7,18,.68)';
          ctx.fillStyle = dsOpts.color || globalOpts.color || '#f8fbff';
          ctx.strokeText(String(value),x,y);
          ctx.fillText(String(value),x,y);
          ctx.restore();
        });
      });
    }
  };
}
function setKpiTitle(id,value){ const el=$(id); if(el) el.title=fmtMoney.format(value||0); }
function typeLabel(t){ return t==='Gasto'?'Insumos':t; }
function typeClass(t){ return t==='Gasto'||t==='Insumos'?'gasto':'receita'; }
function group(arr,key){return arr.reduce((a,x)=>{const k=typeof key==='function'?key(x):x[key];(a[k||'Não informado'] ||= []).push(x);return a;},{})}
function entriesBy(arr,key,fn){const g=group(arr,key); return Object.entries(g).map(([key,v])=>({key,value:sum(v,fn)})).sort((a,b)=>b.value-a.value)}
function topEntry(g,fn){let best={key:'',value:0}; Object.entries(g).forEach(([k,v])=>{const val=fn(v); if(val>best.value) best={key:k,value:val};}); return best;}
function sum(arr,fn){return arr.reduce((t,x)=>t+(+fn(x)||0),0)}
function unique(arr){return [...new Set(arr.filter(v=>v!==undefined&&v!==null&&String(v).trim()!==''))]}
function norm(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim()}
function short(s,n=18){s=String(s||''); return s.length>n?s.slice(0,n-1)+'…':s}
function moneyShort(v){v=+v||0; if(Math.abs(v)>=1000000)return 'R$ '+(v/1000000).toFixed(1).replace('.',',')+' mi'; if(Math.abs(v)>=1000)return 'R$ '+(v/1000).toFixed(0)+' mil'; return 'R$ '+v.toFixed(0)}
function escapeHtml(s){return String(s??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}
function merge(a,b){for(const k in b){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])){a[k]=merge(a[k]||{},b[k])}else a[k]=b[k]}return a}
function toast(msg){const el=$('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove('show'),3600)}

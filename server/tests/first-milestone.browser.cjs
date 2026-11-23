(async()=>{

const base='http://127.0.0.1:9223';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function connect(tabId){
const tabs=await(await fetch(base+'/json/list')).json();
const tab=tabId?tabs.find(t=>t.id===tabId):tabs.find(t=>t.type==='page');
if(!tab)throw Error('No tab');
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
let n=0;const waits=new Map();const listeners=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=waits.get(m.id);if(p){waits.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}}else for(const h of listeners)h(m)};
const cmd=(method,params={})=>new Promise((resolve,reject)=>{const id=++n;waits.set(id,{resolve,reject});setTimeout(()=>{if(waits.has(id)){waits.delete(id);reject(Error('CDP timeout '+method))}},8000).unref();ws.send(JSON.stringify({id,method,params}))});
const evaluate=async expression=>{const r=await cmd('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
return {cmd,evaluate,listeners,ws,tab};
}
async function waitFor(evaluate,expression,ms=15000){const start=Date.now();while(Date.now()-start<ms){if(await evaluate('Boolean('+expression+')'))return;await sleep(100)}throw Error('Timed out: '+expression)}
const snapExpr=`JSON.stringify({path:location.pathname,heading:document.querySelector('h1')?.innerText,selects:[...document.querySelectorAll('select')].map(s=>({value:s.value,options:[...s.options].map(o=>({value:o.value,label:o.textContent.trim()}))})),buttons:[...document.querySelectorAll('button')].map(b=>({text:b.innerText,disabled:b.disabled})).filter(b=>/Template|Milestone|Publish|Preview|Retry/.test(b.text)),body:document.body.innerText.slice(-9000)})`;


const ui = process.env.MILESTONE_TEST_UI_URL;
if (!ui || !/^http:\/\/(127\.0\.0\.1|localhost):5174$/.test(ui)) throw Error('Use the isolated UI on port 5174');
const c=await connect();await c.cmd('Page.enable');await c.cmd('Network.enable');await c.cmd('Runtime.enable');
const passed=[], traffic=[], errors=[];let failSave=true, failSchedule=false;
const assert=async (expression,label)=>{if(!await c.evaluate(expression))throw Error('FAIL '+label);passed.push(label);console.log('PASS '+label)};
const fill=async (selector,value)=>{await c.evaluate(`(()=>{const i=document.querySelector(${JSON.stringify(selector)});if(!i)throw Error('Missing input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(value)});i.dispatchEvent(new Event('input',{bubbles:true}));})()`);await sleep(60)};
const choose=async id=>{await c.evaluate(`(()=>{const s=document.querySelector('#milestone-batch');s.value='${id}';s.dispatchEvent(new Event('change',{bubbles:true}))})()`);await sleep(100)};
const clickText=async text=>c.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw Error('Button unavailable: '+${JSON.stringify(text)});b.click()})()`);
const fulfill=async (p,data,status)=>c.cmd('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:status,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(data)).toString('base64')});
c.listeners.push(m=>{
if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);
if(m.method==='Network.responseReceived'&&m.params.response.url.includes('/api/'))traffic.push({url:m.params.response.url,status:m.params.response.status});
if(m.method==='Fetch.requestPaused'){
const p=m.params;const u=new URL(p.request.url);(async()=>{
if(u.protocol.startsWith('http')&&u.origin!==ui)return c.cmd('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'});
if(u.pathname==='/api/dashboard/stats'||u.pathname.startsWith('/api/notifications/'))return fulfill(p,{error:'Diagnostic ancillary failure'},503);
if(failSchedule&&p.request.method==='GET'&&u.pathname==='/api/milestones/batch/75'){failSchedule=false;return fulfill(p,{error:'Diagnostic temporary schedule failure'},503)}
if(failSave&&p.request.method==='POST'&&u.pathname==='/api/milestones'){failSave=false;return fulfill(p,{error:'Diagnostic temporary save failure'},503)}
if(p.request.method!=='GET'&&p.request.method!=='OPTIONS'&&!['/api/auth/login','/api/milestones'].includes(u.pathname))throw Error('Unexpected write '+p.request.url);
await c.cmd('Fetch.continueRequest',{requestId:p.requestId});
})().catch(e=>{errors.push(e.message);c.cmd('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'}).catch(()=>{})})}
});
await c.cmd('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
await c.cmd('Page.navigate',{url:ui+'/'});
await waitFor(c.evaluate,"document.querySelector('input[type=email]')");
await c.evaluate("localStorage.clear()");
await assert(`(async()=>{const r=await fetch('/api/batches');const d=await r.json();return r.status===200&&d.some(b=>b.id===9001&&b.batchCode==='API-TEST')})()`,'proxy targets synthetic test database before allowing writes');
for(const [role,id,deadline,utc]of [['pm',67,'2026-12-05T17:30','2026-12-05T12:00:00.000Z'],['admin',75,'2026-12-06T09:15','2026-12-06T03:45:00.000Z']]){
await fill('input[type=email]',role+'@milestone-test.invalid');
await fill('input[type=password]','Test-only-Password-123!');
await c.evaluate("document.querySelector('form').requestSubmit()");
await waitFor(c.evaluate,`location.pathname==='/${role}/dashboard'`);
await assert(`JSON.parse(localStorage.getItem('fyp_current_user')).role==='${role}'`,role+' authenticates through real email login');
await c.evaluate(`history.pushState({},'', '/${role}/milestones');dispatchEvent(new PopStateEvent('popstate'))`);
await waitFor(c.evaluate,"document.querySelector('#milestone-batch')?.options.length===6");
if(role==='admin')failSchedule=true;
await choose(id);
if(role==='admin'){
await waitFor(c.evaluate,"document.querySelector('[role=alert]')?.innerText.includes('load milestones')");
await assert("[...document.querySelectorAll('button')].find(b=>b.innerText.includes('Add Milestone')).disabled",'schedule failure protects writes');
await c.evaluate("document.querySelector('[role=alert] button').click()");
}
await waitFor(c.evaluate,`document.body.innerText.includes('No milestones yet for ${id===67?'AI2516':'SE24'}')`);
await assert("![...document.querySelectorAll('button')].find(b=>b.innerText.includes('Add Milestone')).disabled",role+' can add first milestone without template');
await clickText('Add Milestone');
await waitFor(c.evaluate,"document.querySelector('#milestone-name')");
await fill('#milestone-name',role.toUpperCase()+' first draft');
await fill('#milestone-opening','2026-12-01T09:00');
await fill('#milestone-deadline',deadline);
await clickText('Save Draft');
if(role==='pm'){
await waitFor(c.evaluate,"document.querySelector('form [role=alert]')");
await assert("document.querySelector('#milestone-name').value==='PM first draft'&&document.querySelector('#milestone-deadline').value==='2026-12-05T17:30'",'save failure preserves form details');
await clickText('Save Draft');
}
await waitFor(c.evaluate,`!document.querySelector('#milestone-name')&&document.body.innerText.includes('${role.toUpperCase()} first draft')`);
await assert(`(async()=>{const d=await(await fetch('/api/milestones/batch/${id}',{headers:{'x-user-role':'${role}'}})).json();return d.length===1&&d[0].batch_id===${id}&&d[0].status==='DRAFT'&&d[0].deadline==='${utc}'})()`,role+' first draft persisted with correct batch and Sri Lanka deadline');
await assert(`(async()=>{const d=await(await fetch('/api/milestones/batch/${role==='pm'?75:67}',{headers:{'x-user-role':'${role}'}})).json();return d.length===${role==='pm'?0:1}})()`,role+' save leaves second batch unchanged');
await c.cmd('Page.reload');
await waitFor(c.evaluate,"document.querySelector('#milestone-batch')?.options.length===6");
await choose(id);
await waitFor(c.evaluate,`document.body.innerText.includes('${role.toUpperCase()} first draft')`);
await assert("document.body.innerText.includes('Publish All Drafts (1)')",role+' draft survives reload and publishing remains separate');
await choose(69);await waitFor(c.evaluate,"document.body.innerText.includes('Legacy LR')");
await assert("document.body.innerText.includes('Published')",role+' legacy milestone remains visible');
if(role==='pm'){
await c.evaluate("document.querySelector('button[title=\"Sign Out\"]').click()");
await waitFor(c.evaluate,"document.querySelector('input[type=email]')");
}
}
await assert(`(async()=>{const {getProposalRequests}=await import('/src/services/api.js');try{await getProposalRequests(undefined);return false}catch{return true}})()`,'missing student ID rejected before making request');
if(traffic.some(t=>t.url.includes('/student/undefined')))throw Error('Undefined proposal request was sent');
if(errors.length)throw Error('Browser exceptions: '+JSON.stringify(errors));
if(!traffic.some(t=>t.url.endsWith('/api/dashboard/stats')&&t.status===503)||!traffic.some(t=>t.url.includes('/api/notifications/')&&t.status===503))throw Error('Ancillary failures were not exercised');
console.log('PASS dashboard-stat and notification failures do not block first drafts');
console.log(JSON.stringify({passed,apiRequests:traffic},null,2));
await c.cmd('Browser.close');c.ws.close();

})().catch(e=>{console.error(e);process.exit(1)});


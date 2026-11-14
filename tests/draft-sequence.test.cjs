const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

let source = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
const renderStart = source.indexOf('  function render() {');
const renderEnd = source.indexOf("  document.addEventListener('tm-draft-stats-response'", renderStart);
assert.ok(renderStart > 0 && renderEnd > renderStart);
source = source.slice(0, renderStart) + '  function render() {}\n' + source.slice(renderEnd);
source = source.replace('  window.setInterval(update,1000); update();', '  globalThis.testUpdate=update; globalThis.testLog=()=>log; globalThis.testNotify=consumeNotification;');
const handlers = {};
const requests = [];
const document = {
  addEventListener(type, fn) { handlers[type] = fn; },
  dispatchEvent(event) { if (event.type === 'tm-draft-stats-request') requests.push(event.detail); },
  querySelector(selector) { return selector.startsWith('#tracker_gen') ? {dataset:{state:'2'}} : null; },
  getElementById() { return null; },
};
const names = {'card_main_118':'Farming','card_main_138':'Strip Mine','card_main_18':'Methane From Titan','card_main_98':'Tropical Resort','card_main_113':'Solar Power','card_main_17':'Noctis City','card_main_84':'Trans-Neptune Probe'};
const game = {game_name:'terraformingmars', table_id:933827808, player_id:99301577, gamedatas:{players:{'99301577':{color:'008000'}}, token_types:Object.fromEntries(Object.entries(names).map(([id,name])=>[id,{name}])), table_options:{107:{value:2},104:{value:1}}, gamestate:{args:{operations:[{type:'draft',owner:'008000',args:{target:['card_main_118','card_main_138','card_main_18','card_main_98']}}]}}}};
const storage = new Map();
const context = {window:{gameui:game,top:{},setInterval(){}},document,location:{host:'boardgamearena.com',href:'https://boardgamearena.com/table?table=933827808'},URL,sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},Event:class {constructor(type){this.type=type;}},CustomEvent:class {constructor(type, options){this.type=type;this.detail=options.detail;}},console};
vm.createContext(context); vm.runInContext(source,context);
handlers['tm-draft-enabled']({detail:true});
context.testNotify('newPrivateState',{args:{args:{player_operations:{'99301577':game.gamedatas.gamestate.args}}}});
context.testNotify('tokenMoved',{log:'You draft ${token_name}',args:{player_id:99301577,token_id:'card_main_138',place_id:'draw_008000'}});
assert.equal(context.testLog().length,1);
context.testNotify('tokenMoved',{log:'',args:{player_id:99301577,token_id:'card_main_138',place_id:'draft_008000'}});
assert.equal(context.testLog().length,0, 'undo retracts passed-pack record');
context.testNotify('tokenMoved',{log:'You draft ${token_name}',args:{player_id:99301577,token_id:'card_main_138',place_id:'draw_008000'}});
game.gamedatas.gamestate.args.operations[0].args.target=['card_main_113','card_main_17','card_main_84'];
context.testNotify('newPrivateState',{args:{args:{player_operations:{'99301577':game.gamedatas.gamestate.args}}}});
context.testNotify('tokenMoved',{log:'You draft ${token_name}',args:{player_id:99301577,token_id:'card_main_84',place_id:'draw_008000'}});
game.gamedatas.gamestate.args.operations[0].args.target=['card_main_118','card_main_98'];
context.testNotify('newPrivateState',{args:{args:{player_operations:{'99301577':game.gamedatas.gamestate.args}}}});
const log = context.testLog();
assert.equal(log.length,2);
assert.deepEqual(Array.from(log[0].cards),['Farming','Methane From Titan','Tropical Resort']);
assert.equal(log[0].generation,2); assert.equal(log[0].map,'Hellas'); assert.equal(log[0].prelude,true);
assert.equal(requests[0].key,'2|Hellas|true');
assert.equal(log[0].opponentPick,'Methane From Titan', 'returned pack identifies opponent pick');
context.testNotify('tokenMoved',{log:'You draft ${token_name}',args:{player_id:99301577,token_id:'card_main_118',place_id:'draw_008000'}});
context.testNotify('tokenMoved',{log:'',args:{player_id:99301577,token_id:'card_main_113',place_id:'draft_008000'}});
assert.equal(log[1].opponentPick,'Noctis City', 'one-card return identifies the opponent pick');
assert.equal(log[2].opponentPick,'Tropical Resort', 'last passed card goes to opponent');
context.testNotify('message',{log:'${player_name} keeps ${count} card/s',args:{player_id:96674383,count:3}});
assert.equal(log[0].kept,3);
const snapshot=JSON.parse(fs.readFileSync(path.join(__dirname,'..','stats.json'),'utf8'));
assert.ok(snapshot.values[requests[0].key].some(([name,elo,n])=>name==='Farming' && elo!=null && n>=10));
console.log('Recorded game 933827808: notification sequence, passed packs, inferred picks, keep count, and bundled statistics passed.');

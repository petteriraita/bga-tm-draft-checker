(() => {
  'use strict';
  if (window.__tmDraftChecker) return;
  window.__tmDraftChecker = true;
  const cache = new Map();
  let current = null, clicked = null, log = [], lastTable = '';
  const key = () => `tm-draft-checker-${location.host}-${window.gameui?.table_id || new URL(location.href).searchParams.get('table') || 'unknown'}`;
  function findDraft(node, owner, seen = new Set()) {
    if (!node || typeof node !== 'object' || seen.has(node)) return null;
    seen.add(node);
    if ((node.type === 'draft' || node.typeexpr === 'draft') && Array.isArray(node.args?.target) && (!node.owner || node.owner === owner)) return node;
    for (const value of Object.values(node)) { const found = findDraft(value, owner, seen); if (found) return found; }
    return null;
  }
  function name(id, game) { return game.gamedatas?.token_types?.[id]?.name || document.getElementById(id)?.dataset.name || id; }
  function context(game) {
    const generationNode = document.querySelector('#tracker_gen, #tracker_generation');
    const generation = Number(generationNode?.dataset.state || generationNode?.textContent?.trim() || game.gamedatas?.tokens?.tracker_gen?.state || 0);
    const mapNames = {0:'Tharsis', 1:'Elysium', 2:'Hellas', 3:'Vastitas Borealis', 4:'Amazonis Planitia'};
    const mapValue = game.gamedatas?.table_options?.[107]?.value;
    const map = (mapValue == null ? '' : mapNames[Number(mapValue)]) || document.querySelector('#footer_option_value_107')?.textContent?.trim() || '';
    const preludeLabel = document.querySelector('#footer_option_value_104')?.textContent?.trim().toLowerCase();
    const preludeValue = game.gamedatas?.table_options?.[104]?.value;
    const prelude = preludeLabel === 'on' ? true : preludeLabel === 'off' ? false : String(preludeValue) === '1' ? true : String(preludeValue) === '0' ? false : null;
    return {generation, map, prelude};
  }
  function persist() { try { sessionStorage.setItem(key(), JSON.stringify(log)); } catch {} }
  function panel() {
    let p = document.getElementById('tm-draft-checker'); if (p) return p;
    p = document.createElement('section'); p.id = 'tm-draft-checker';
    p.innerHTML = '<header><b>Draft Checker</b><button type="button" title="Collapse">−</button></header><div class="body"></div>';
    document.body.appendChild(p);
    const header = p.querySelector('header'); let drag;
    header.onpointerdown = e => { if (e.target.closest('button')) return; const r=p.getBoundingClientRect(); drag={x:e.clientX-r.x,y:e.clientY-r.y}; header.setPointerCapture(e.pointerId); };
    header.onpointermove = e => { if (!drag) return; p.style.left = `${Math.max(0, e.clientX-drag.x)}px`; p.style.top = `${Math.max(0,e.clientY-drag.y)}px`; p.style.right='auto'; };
    header.onpointerup = () => { drag=null; };
    p.querySelector('button').onclick = () => { const b=p.querySelector('.body'); b.hidden=!b.hidden; };
    return p;
  }
  function render() {
    const body = panel().querySelector('.body'); body.replaceChildren();
    const note = document.createElement('p'); note.textContent='Passed cards are observed; bold cards are Elo-based guesses, not known picks.'; body.appendChild(note);
    if (!log.length) { const p=document.createElement('p'); p.textContent='Waiting for a research draft and your confirmed pick.'; body.appendChild(p); }
    for (const entry of log.slice().reverse()) {
      const section=document.createElement('section'), title=document.createElement('b'); title.textContent=`Generation ${entry.generation || '?'} · ${entry.map || 'map unknown'} · passed ${entry.cards.length}`; section.appendChild(title);
      const stats=cache.get(`${entry.generation}|${entry.map}|${entry.prelude}`); const ranked=entry.cards.map(card=>({card, data:stats?.data?.find(r=>r.cardName?.toLowerCase()===card.toLowerCase())}));
      const scored=ranked.filter(x=>x.data?.avgEloGainKept != null && Number(x.data.keptGames || 0)>=10).sort((a,b)=>b.data.avgEloGainKept-a.data.avgEloGainKept);
      for(const item of ranked){ const line=document.createElement('div'); if(scored[0]===item) line.className='guess'; line.textContent=`${item.card}${item.data?.avgEloGainKept != null ? ` (${Number(item.data.avgEloGainKept).toFixed(2)} Elo)` : ''}`; section.appendChild(line); }
      if (entry.kept) { const message=document.createElement('small'); message.textContent=`Opponent kept ${entry.kept} cards (BGA log).`; section.appendChild(message); }
      if (!stats?.data) { const message=document.createElement('small'); message.textContent=!entry.generation || !entry.map || entry.prelude === null ? 'Generation, map or Prelude setting unavailable; no prediction.' : stats?.error ? 'Statistics unavailable; start the local statistics server.' : 'Loading statistics…'; section.appendChild(message); }
      body.appendChild(section);
    }
  }
  document.addEventListener('tm-draft-stats-response', e=>{cache.set(e.detail.key,e.detail.result); render();});
  document.addEventListener('click', event=>{ const el=event.target.closest('[id^="card_main_"]'); if(current && el && current.ids.includes(el.id)) clicked=el.id; },true);
  function update() {
    const game=window.gameui; if(game?.game_name!=='terraformingmars' || !game.gamedatas?.players) return;
    if(key()!==lastTable){lastTable=key(); try {log=JSON.parse(sessionStorage.getItem(key())||'[]');} catch {log=[];} }
    const me=game.gamedatas.players[String(game.player_id)]; if(!me) return;
    const operation=findDraft(game.gamedatas.gamestate?.args, me.color);
    const ids=operation?.args?.target?.filter(id=>/^card_main_\d+$/.test(id)) || [];
    if(current && clicked && ids.length && ids.join('|')!==current.ids.join('|')) {
      const cards=current.ids.filter(id=>id!==clicked).map(id=>name(id,game));
      if(cards.length){const entry={...current.context,cards};log.push(entry);persist(); const k=`${entry.generation}|${entry.map}|${entry.prelude}`;if(entry.generation && entry.map && entry.prelude !== null && !cache.has(k)){cache.set(k,{});document.dispatchEvent(new CustomEvent('tm-draft-stats-request',{detail:{...entry,key:k}}));}}
      clicked=null;
    }
    if(ids.length && (!current || ids.join('|')!==current.ids.join('|'))) current={ids,context:context(game)};
    render();
  }
  window.setInterval(update,1000); update();
})();

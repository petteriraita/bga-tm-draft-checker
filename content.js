(() => {
  'use strict';
  if (window.__tmDraftChecker) return;
  window.__tmDraftChecker = true;
  const cache = new Map();
  let current = null, log = [], lastTable = '', enabled = false, hookedDojo = null;
  const seenNotifications = new Set();
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
  function syncTable() {
    if (key() === lastTable) return;
    lastTable = key(); current = null; seenNotifications.clear();
    try { log = JSON.parse(sessionStorage.getItem(key()) || '[]'); } catch { log = []; }
  }
  function rememberReturn(ids, generation) {
    for (const entry of log) {
      if (entry.generation !== generation || entry.opponentPick || !entry.cardIds || entry.cardIds.length !== ids.length + 1) continue;
      const missing = entry.cardIds.filter(id => !ids.includes(id));
      if (missing.length === 1 && ids.every(id => entry.cardIds.includes(id))) {
        entry.opponentPick = name(missing[0], window.gameui);
      }
    }
    persist();
  }
  function consumeNotification(type, message) {
    const game = window.gameui, args = message?.args || {};
    if (!enabled || game?.game_name !== 'terraformingmars' || !game.gamedatas?.players) return;
    syncTable();
    const me = game.gamedatas.players[String(game.player_id)];
    if (!me) return;
    const generation = context(game).generation;
    if (type === 'newPrivateState') {
      const own = args.args?.player_operations?.[String(game.player_id)];
      const op = findDraft(own, me.color);
      const ids = op?.args?.target?.filter(id => /^card_main_\d+$/.test(id)) || [];
      if (ids.length) {
        rememberReturn(ids, generation);
        if (!current || current.ids.join('|') !== ids.join('|')) current = {ids, context: context(game), picked: false};
      }
    }
    if (type === 'tokenMoved' && String(args.player_id) === String(game.player_id) && /^card_main_\d+$/.test(args.token_id || '')) {
      if (args.place_id === `draft_${me.color}` && current?.picked && args.token_id === current.pickId) {
        const latest = log[log.length - 1];
        if (latest?.pickedId === args.token_id) log.pop();
        current.picked = false; current.pickId = null; persist();
        return;
      }
      if (args.place_id === `draft_${me.color}` && current?.picked && current.ids.length === 2) rememberReturn([args.token_id], generation);
      if (args.place_id === `draw_${me.color}` && current && !current.picked && current.ids.includes(args.token_id) && String(message.log || '').includes('draft')) {
        current.picked = true;
        current.pickId = args.token_id;
        const cardIds = current.ids.filter(id => id !== args.token_id);
        if (cardIds.length) {
          const entry = {...current.context, pickedId: args.token_id, cardIds, cards: cardIds.map(id => name(id, game)), opponentPick: cardIds.length === 1 ? name(cardIds[0], game) : null};
          log.push(entry); persist(); ensureStats(entry);
        }
      }
    }
    if (type === 'message' && /keeps \$\{count\}/.test(String(message.log || '')) && String(args.player_id) !== String(game.player_id) && Number.isFinite(Number(args.count))) {
      for (const entry of log) if (entry.generation === generation) entry.kept = Number(args.count);
      persist();
    }
  }
  function installNotificationHook() {
    const dojo = window.dojo;
    if (!dojo || dojo === hookedDojo || typeof dojo.connect !== 'function' || typeof dojo.publish !== 'function') return;
    dojo.connect(dojo, 'publish', function (type, args) {
      const message = args?.[0];
      if (!message || typeof message !== 'object') return;
      const uid = message.uid;
      if (uid != null) {
        const id = `${type}:${uid}`;
        if (seenNotifications.has(id)) return;
        seenNotifications.add(id);
        if (seenNotifications.size > 3000) seenNotifications.clear();
      }
      try { consumeNotification(type, message); } catch (error) { console.warn('[Draft Checker] notification error', error); }
    });
    hookedDojo = dojo;
  }
  function ensureStats(entry) {
    const k = `${entry.generation}|${entry.map}|${entry.prelude}`;
    if (!entry.generation || !entry.map || entry.prelude === null || cache.has(k)) return;
    cache.set(k, {});
    document.dispatchEvent(new CustomEvent('tm-draft-stats-request', {detail: {...entry, key:k}}));
  }
  function panel() {
    let p = document.getElementById('tm-draft-checker'); if (p) return p;
    p = document.createElement('section'); p.id = 'tm-draft-checker';
    p.innerHTML = '<header><b>Draft Checker</b><div><button class="collapse" type="button" title="Collapse">−</button><button class="close" type="button" title="Turn off">×</button></div></header><div class="body"></div>';
    document.body.appendChild(p);
    const header = p.querySelector('header'); let drag;
    header.onpointerdown = e => { if (e.target.closest('button')) return; const r=p.getBoundingClientRect(); drag={x:e.clientX-r.x,y:e.clientY-r.y}; header.setPointerCapture(e.pointerId); };
    header.onpointermove = e => { if (!drag) return; p.style.left = `${Math.max(0, e.clientX-drag.x)}px`; p.style.top = `${Math.max(0,e.clientY-drag.y)}px`; p.style.right='auto'; };
    header.onpointerup = () => { drag=null; };
    p.querySelector('.collapse').onclick = () => { const b=p.querySelector('.body'); b.hidden=!b.hidden; };
    p.querySelector('.close').onclick = () => document.dispatchEvent(new CustomEvent('tm-draft-set-enabled', {detail:false}));
    return p;
  }
  function render() {
    const body = panel().querySelector('.body'); body.replaceChildren();
    const note = document.createElement('p'); note.textContent='Passed cards and returned-pack deductions are observed; bold estimates are not confirmed purchases.'; body.appendChild(note);
    if (!log.length) { const p=document.createElement('p'); p.textContent='Waiting for a research draft and your confirmed pick.'; body.appendChild(p); }
    for (const entry of log.slice().reverse()) {
      ensureStats(entry);
      const section=document.createElement('section'), title=document.createElement('b'); title.textContent=`Generation ${entry.generation || '?'} · ${entry.map || 'map unknown'} · passed ${entry.cards.length}`; section.appendChild(title);
      const stats=cache.get(`${entry.generation}|${entry.map}|${entry.prelude}`); const ranked=entry.cards.map(card=>({card, data:stats?.data?.find(r=>r.cardName?.toLowerCase()===card.toLowerCase())}));
      const scored=ranked.filter(x=>x.data?.avgEloGainKept != null && Number(x.data.keptGames || 0)>=10).sort((a,b)=>b.data.avgEloGainKept-a.data.avgEloGainKept);
      for(const item of ranked){ const line=document.createElement('div'); if(item.card===entry.opponentPick || (!entry.opponentPick && scored[0]===item)) line.className='guess'; line.textContent=`${item.card}${item.card===entry.opponentPick ? ' — opponent drafted (inferred)' : !entry.opponentPick && scored[0]===item ? ' — estimated pick' : ''}${item.data?.avgEloGainKept != null ? ` (${Number(item.data.avgEloGainKept).toFixed(2)} Elo)` : ''}`; section.appendChild(line); }
      if (entry.kept != null) { const message=document.createElement('small'); message.textContent=`Opponent bought ${entry.kept} cards in this generation (BGA log).`; section.appendChild(message); }
      if (!stats?.data) { const message=document.createElement('small'); message.textContent=!entry.generation || !entry.map || entry.prelude === null ? 'Generation, map or Prelude setting unavailable; no prediction.' : stats?.error ? stats.error : 'Loading statistics…'; section.appendChild(message); }
      body.appendChild(section);
    }
  }
  document.addEventListener('tm-draft-stats-response', e=>{cache.set(e.detail.key,e.detail.result); if(enabled) render();});
  document.addEventListener('tm-draft-enabled', event => { enabled = event.detail === true; const p=document.getElementById('tm-draft-checker'); if(p) p.hidden=!enabled; if(enabled) update(); });
  document.dispatchEvent(new Event('tm-draft-get-enabled'));
  function update() {
    installNotificationHook();
    const game=window.gameui; if(!enabled || game?.game_name!=='terraformingmars' || !game.gamedatas?.players) return;
    syncTable();
    const me=game.gamedatas.players[String(game.player_id)]; if(!me) return;
    const operation=findDraft(game.gamedatas.gamestate?.args, me.color);
    const ids=operation?.args?.target?.filter(id=>/^card_main_\d+$/.test(id)) || [];
    if(ids.length && !current) current={ids,context:context(game),picked:false};
    render();
  }
  window.setInterval(update,1000); update();
})();

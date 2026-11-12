let snapshot;
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg.type !== 'stats') return;
  (snapshot ||= fetch(chrome.runtime.getURL('stats.json')).then(r => { if (!r.ok) throw Error(`HTTP ${r.status}`); return r.json(); }))
    .then(data => {
      const rows = data.values[`${msg.generation}|${msg.map}|${msg.prelude}`];
      respond(rows ? {data: rows.map(([cardName, avgEloGainKept, keptGames]) => ({cardName, avgEloGainKept, keptGames}))} : {error: 'No statistics for this map or generation.'});
    })
    .catch(error => respond({error: String(error)}));
  return true;
});

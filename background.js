chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg.type !== 'stats') return;
  const q = new URLSearchParams({stage: 'draft', draft_number: String(msg.generation), maps: msg.map, prelude: msg.prelude ? 'on' : 'off', min_average_elo: '450', max_average_elo: '0'});
  fetch(`http://127.0.0.1:8080/api/starting-hands?${q}`)
    .then(r => { if (!r.ok) throw Error(`HTTP ${r.status}`); return r.json(); })
    .then(data => respond({data: data.data}))
    .catch(error => respond({error: String(error)}));
  return true;
});

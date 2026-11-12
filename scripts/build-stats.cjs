// Generate a portable, compact snapshot from the Mars Stats API.
// The API is needed only to refresh the snapshot, not to use the extension.
const fs = require('node:fs');
const path = require('node:path');
const maps = ['Tharsis', 'Hellas', 'Elysium', 'Vastitas Borealis'];
const jobs = [];
for (const map of maps) for (const prelude of [false, true]) for (let generation = 2; generation <= 14; generation++) jobs.push({map, prelude, generation});
const output = {generatedAt: new Date().toISOString(), cohort: '2 players, draft on, colonies off, average table Elo 450+', values: {}};
async function worker() {
  while (jobs.length) {
    const job = jobs.shift();
    const query = new URLSearchParams({stage:'draft', draft_number:String(job.generation), maps:job.map, prelude:job.prelude?'on':'off', min_average_elo:'450', max_average_elo:'0'});
    const response = await fetch(`http://127.0.0.1:8080/api/starting-hands?${query}`);
    if (!response.ok) throw Error(`${response.status} for ${query}`);
    const payload = await response.json();
    if (!Array.isArray(payload.data)) throw Error(`Missing data for ${query}`);
    output.values[`${job.generation}|${job.map}|${job.prelude}`] = payload.data.map(row => [row.cardName, row.avgEloGainKept, row.keptGames]);
  }
}
Promise.all([worker(), worker(), worker()]).then(() => {
  fs.writeFileSync(path.join(__dirname, '..', 'stats.json'), JSON.stringify(output));
  console.log(`Saved ${Object.keys(output.values).length} cohorts`);
}).catch(error => { console.error(error); process.exitCode = 1; });

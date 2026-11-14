# Terraforming Mars Draft Checker

Records your passed packs during BGA Terraforming Mars research drafts. When a pack comes back, the missing card identifies an opponent draft pick. The opponent's first pick remains hidden. Before a pick can be inferred, the highest average Elo gain is shown as an estimate, not a known pick or a probability. Opponent buy counts are recorded from BGA's game notifications; the count does not reveal which cards were bought.

The notification capture has been exercised in BGA's real replay for table 933827808, generation 2, as well as with a regression test. Live draft behavior can still vary with BGA updates, missed notifications, or joining a game after a draft has begun.

Load this folder as an unpacked extension in Brave. The statistics snapshot is included: no server or additional setup is needed. It covers generations 2–14, four maps, Prelude on/off and the 450+ cohort from https://github.com/petteriraita/mars-stats. Missing statistics or unsupported maps show no guess. Draft history is stored in the browser tab's session storage. To refresh the snapshot as a developer, run `node scripts/build-stats.cjs` while the Mars Stats server is running.

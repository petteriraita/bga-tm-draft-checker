# Terraforming Mars Draft Checker

Early prototype for BGA Terraforming Mars research drafts. Records the cards left in a pack after your confirmed choice and highlights the highest average Elo gain among them as a guess, not a known opponent pick. It does not predict how many cards the opponent buys. The automatic capture depends on BGA's live draft operation and has not yet been verified in a live game.

Load this folder as an unpacked extension in Brave. The statistics snapshot is included: no server or additional setup is needed. It covers generations 2–14, four maps, Prelude on/off and the 450+ cohort from https://github.com/petteriraita/mars-stats. Missing statistics or unsupported maps show no guess. Draft history is stored in the browser tab's session storage. To refresh the snapshot as a developer, run `node scripts/build-stats.cjs` while the Mars Stats server is running.

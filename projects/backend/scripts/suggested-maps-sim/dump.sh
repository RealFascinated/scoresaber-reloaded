#!/usr/bin/env bash
# Dumps the read-only dataset the simulator replays into a directory (default /tmp/ssr-ow).
#
#   DATABASE_URL=postgresql://... bash scripts/suggested-maps-sim/dump.sh [dir]
#   bun scripts/suggested-maps-sim/sim.ts --dir=<dir>            # holdout evaluation vs. baselines
#   bun scripts/suggested-maps-sim/sim.ts --sweep=mapPriorStrength=5,25,60
#   bun scripts/suggested-maps-sim/sim.ts --coldstart            # maps without any scores
#   bun scripts/suggested-maps-sim/sim.ts --report --refAcc=97.5 # most suggested maps
#   bun scripts/suggested-maps-sim/dry-run.ts <playerId>         # the production path, without writing
set -euo pipefail
dir="${1:-/tmp/ssr-ow}"
mkdir -p "$dir"
psql "$DATABASE_URL" -c "\copy (select sr.\"playerId\", sr.\"leaderboardId\", s.accuracy, sr.pp, s.timestamp from \"scoresaber-score-realms\" sr join \"scoresaber-scores\" s on s.\"scoreId\"=sr.\"scoreId\" where sr.\"realmId\"=1) to '$dir/scores.tsv'"
psql "$DATABASE_URL" -c "\copy (select distinct on (l.id) l.id, lr.stars, l.\"songName\", l.difficulty, l.\"maxScore\", extract(epoch from lr.\"rankedDate\"), d.nps, d.seconds, d.njs, d.notes, d.bombs, d.obstacles, bm.bpm from \"scoresaber-leaderboards\" l join \"scoresaber-leaderboard-realms\" lr on lr.\"leaderboardId\"=l.id and lr.\"realmId\"=1 and lr.ranked left join \"beatsaver-map-versions\" v on lower(v.hash)=lower(l.\"songHash\") left join \"beatsaver-maps\" bm on bm.id=v.\"mapId\" left join \"beatsaver-map-difficulties\" d on d.\"versionId\"=v.id and d.characteristic=l.characteristic and d.difficulty=l.difficulty order by l.id) to '$dir/maps.tsv'"
rm -f "$dir/dataset.bin" "$dir/dataset.json"

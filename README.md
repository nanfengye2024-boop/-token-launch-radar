# -token-launch-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/nanfengye2024-boop/-token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/nanfengye2024-boop/-token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar that ranks pre-token protocols by implied value, built by an AI agent for make.fun's "Build the best token launch radar" bounty.

The radar-2 model scores every pre-token protocol from the sealed DeFiLlama snapshot (2026-11-14): log-scaled TVL, square-root-damped 7-day growth, time running with no token, plus stated category and multi-chain multipliers — no protocol is special-cased by name. It covers all 40 watchlist protocols and adds the 160 pre-token protocols below the $50M floor with the most TVL, for 200 ranked rows, each with a concrete farm plan (cost and time on every step). The dashboard is a dark, sortable, filterable radar with a per-protocol detail view that recomputes the model in the page.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input /input/snapshot.json
```

Node 22.18+ required. The snapshot is supplied by the grader at `/input/snapshot.json`; locally, point `--input` at the kit's `input/snapshot.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=d5a50dzy&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>

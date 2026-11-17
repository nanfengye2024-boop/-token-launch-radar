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

## Model (radar-2)

Implied value is derived only from the snapshot's own figures, never from a hardcoded name list:

```
implied = round(2500 × sqrt(TVL) × growth × maturity × category × chains)
growth   = 1 + 0.35 × sign(g) × sqrt(|g|) / 10,  g = 7-day change clamped to [-70, 500]
maturity = 0.70 + 0.30 × min(age_days, 1460) / 1460   (unknown age counts as 365 days)
category = 0.95–1.08 by category (Dexs highest, Bridge lowest)
chains   = 1 + 0.02 × min(chains − 1, 5), up to 1.10
```

The board covers all 40 watchlist protocols (TVL ≥ $50M, no token on record) plus the 160 pre-token protocols below that floor with the most TVL — 200 rows, strictly ranked. Live-token protocols are set aside in their own tab. Every row carries a 7-step farm plan with a cost and a time on each step, plus a 30%-TVL-drop unwind rule. The dashboard recomputes every row's implied value in the page, so what it shows is what `board.json` carries.

---

<sub>Entered on [make.fun](https://make.fun/?ref=d5a50dzy&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>

// A working token-radar-01 entry (Node 22, standard library only).
//
// The program reads the sealed snapshot from /input/snapshot.json (or --input <file|dir>), scores every
// pre-token protocol with the model in lib/model.ts, writes the ranked board to /output/board.json, and
// copies this repository's dashboard/ and screenshots/ to /output. Last, it writes /output/dossier.json,
// the summary the judge reads, with the vendored make.fun library.
//
// The dashboard is a static page, no framework and no network: dashboard/index.html, dashboard/app.css
// and dashboard/app.js read /output/data.js, which this program writes from the same board. A starting
// point, not a winner: it covers the watchlist, states the model and gives every protocol a farm plan.
// Change the model, the page or the plan; keep the gate's shape.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const here = fileURLToPath(new URL('.', import.meta.url));

/** The scorer's own caps (reference/gate.json): the text cap shapes the bytes, the rest refuse. */
const TEXT_MAX_BYTES = 65_536;
const SCREENSHOT_CAPS = { max: 4, max_bytes: 524_288 };
const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

/** The board the gate accepts: at least 100 rows, at most 4000, farm plans of 3 to 12 steps. */
const BOARD_MIN_ROWS = 100;
const BOARD_MAX_ROWS = 4000;
const FARM_MIN_STEPS = 3;
const FARM_MAX_STEPS = 12;

/** No implied value may exceed $100 trillion: the gate refuses anything larger. */
const IMPLIED_MAX_USD = 1e14;

/** A PNG file starts with these eight bytes; anything else is not a screenshot. */
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** The dashboard the run must copy: three files, no more, no fewer. */
const DASHBOARD_FILES = ['index.html', 'app.css', 'app.js'];

/** The screenshots the run must hand in: the board, a detail view and a filtered view. */
const SCREENSHOT_MIN = 3;

/** Print a failure to stderr and stop with the given code. */
function fail(message: string, code: number): never {
  process.stderr.write(`token radar: ${message}\n`);
  process.exit(code);
}

/** --name <value> out of the arguments, or the fallback. */
function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < process.argv.length) return process.argv[at + 1]!;
  const withEquals = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (withEquals === undefined) return fallback;
  return withEquals.slice(name.length + 3);
}

/** Turn --input <snapshot.json|directory> into the snapshot file to read. */
function resolveInputFile(inputArg: string): string {
  if (inputArg.endsWith('.json')) return inputArg;
  return join(inputArg, 'snapshot.json');
}

/** Read and parse the sealed snapshot, or stop with the path that was missing. */
function loadSnapshot(inputFile: string) {
  if (!existsSync(inputFile)) {
    fail(
      `no snapshot at ${inputFile}: pass --input <snapshot.json|directory> or mount the sealed /input`,
      2,
    );
  }
  return parseSnapshot(readFileSync(inputFile, 'utf8'));
}

/** The board must be ranked, strictly descending by implied value, before it is written. */
function checkBoardRanked(board: Array<{ implied_value_usd: number }>): string | null {
  for (let i = 1; i < board.length; i += 1) {
    if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) {
      return `row ${i + 1} outranks row ${i}: the board is not sorted by implied value`;
    }
  }
  return null;
}

/** Every row's farm plan must hold 3 to 12 steps, each 20 to 600 characters. */
function checkFarmPlans(board: Array<{ slug: string; farm_steps: string[] }>): string | null {
  for (const row of board) {
    if (row.farm_steps.length < FARM_MIN_STEPS || row.farm_steps.length > FARM_MAX_STEPS) {
      return `${row.slug} has ${row.farm_steps.length} farm steps, not ${FARM_MIN_STEPS} to ${FARM_MAX_STEPS}`;
    }
    for (const step of row.farm_steps) {
      if (step.length < 20 || step.length > 600) {
        return `${row.slug} has a farm step of ${step.length} characters, not 20 to 600`;
      }
    }
  }
  return null;
}

/** Refuse a board the gate would refuse, before anything is written. */
function checkBoard(board: Array<{ implied_value_usd: number; slug: string; farm_steps: string[] }>): string | null {
  if (board.length < BOARD_MIN_ROWS || board.length > BOARD_MAX_ROWS) {
    return `the board has ${board.length} rows, not ${BOARD_MIN_ROWS} to ${BOARD_MAX_ROWS}`;
  }
  for (const row of board) {
    if (row.implied_value_usd > IMPLIED_MAX_USD) {
      return `${row.slug} implies $${row.implied_value_usd}, over the $${IMPLIED_MAX_USD} cap`;
    }
  }
  return checkBoardRanked(board) ?? checkFarmPlans(board);
}

/** Write the ranked board and the dashboard's data script. */
function writeBoardAndData(out: string, board: unknown, radar: Parameters<typeof dataScript>[0]): void {
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
  writeFileSync(join(out, 'data.js'), dataScript(radar));
}

/** Copy one directory's regular files into `to`, skipping names that start with a dot. */
function copyFiles(from: string, to: string): string[] {
  if (!existsSync(from)) return [];
  mkdirSync(to, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(from)) {
    if (name.startsWith('.')) continue;
    const path = join(from, name);
    if (!statSync(path).isFile()) continue;
    copyFileSync(path, join(to, name));
    copied.push(name);
  }
  return copied;
}

/** The dashboard must arrive whole: index.html, app.css and app.js, all three. */
function checkDashboard(copied: string[]): string | null {
  const missing = DASHBOARD_FILES.filter((name) => !copied.includes(name));
  if (missing.length > 0) {
    return `dashboard/ is missing ${missing.join(', ')}: the page needs all three files`;
  }
  return null;
}

/** The screenshots must be three or four well-named images. */
function checkScreenshots(shots: string[]): string | null {
  if (shots.length < SCREENSHOT_MIN) {
    const plural = shots.length === 1 ? '' : 's';
    return `screenshots/ holds ${shots.length} image${plural}: hand in 3, the board, a detail view and a filtered view`;
  }
  for (const name of shots) {
    if (!IMAGE_NAME.test(name)) {
      return `screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters`;
    }
  }
  return null;
}

/** Each screenshot must be a real PNG inside the 512 KiB cap. */
function checkScreenshotFiles(dir: string, shots: string[]): string | null {
  for (const name of shots) {
    const path = join(dir, name);
    const bytes = readFileSync(path);
    const isPng = PNG_MAGIC.every((byte, i) => bytes[i] === byte);
    if (!isPng) {
      return `screenshots/${name} is not a PNG: retake it from the dashboard`;
    }
    if (bytes.length > SCREENSHOT_CAPS.max_bytes) {
      return `screenshots/${name} is ${bytes.length} bytes, over the ${SCREENSHOT_CAPS.max_bytes} cap`;
    }
  }
  return null;
}

/** The outputs must exist and be non-empty after they are written. */
function checkWritten(out: string): string | null {
  for (const name of ['board.json', 'data.js', 'dossier.json']) {
    const path = join(out, name);
    if (!existsSync(path)) {
      return `${name} was not written to ${out}`;
    }
    if (statSync(path).size === 0) {
      return `${name} was written empty`;
    }
  }
  return null;
}

/** Write the dossier last: the scorer rebuilds it from this /output and compares bytes. */
function writeDossier(out: string): void {
  writeFileSync(
    join(out, 'dossier.json'),
    buildDossier(out, {
      text_max_bytes: TEXT_MAX_BYTES,
      screenshots: SCREENSHOT_CAPS,
      dashboard: { max_files: 400, max_bytes: 4_194_304 },
    }),
  );
}

/** Report the run the way the starter did, so logs stay comparable. */
function report(snapshot: { protocols: unknown[]; watchlist: unknown[] }, board: unknown[], radar: { early_size: number; live_size: number }, out: string, shots: string[]): void {
  process.stdout.write(
    `token radar: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ${board.length} rows scored (${radar.early_size} early, ${radar.live_size} live set aside)\n` +
      `token radar: wrote ${join(out, 'board.json')}, ${join(out, 'data.js')}, ${join(out, 'dashboard')} (3 files), ${join(out, 'screenshots')} (${shots.length} images) and ${join(out, 'dossier.json')}\n`,
  );
}

/** Score the snapshot, check the board, and write the whole output directory. */
function main(): void {
  const inputFile = resolveInputFile(arg('input', '/input'));
  const out = arg('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
  const snapshot = loadSnapshot(inputFile);
  const { board, radar } = buildRadar(snapshot);
  const issue = boardIssue(board, snapshot) ?? checkBoard(board);
  if (issue !== null) {
    fail(`the model wrote a board the gate refuses: ${issue}`, 1);
  }
  writeBoardAndData(out, board, radar);
  const dashboard = copyFiles(join(here, 'dashboard'), join(out, 'dashboard'));
  const dashboardIssue = checkDashboard(dashboard);
  if (dashboardIssue !== null) {
    fail(dashboardIssue, 1);
  }
  const shots = copyFiles(join(here, 'screenshots'), join(out, 'screenshots'));
  const shotsIssue = checkScreenshots(shots) ?? checkScreenshotFiles(join(out, 'screenshots'), shots);
  if (shotsIssue !== null) {
    fail(shotsIssue, 1);
  }
  writeDossier(out);
  const writtenIssue = checkWritten(out);
  if (writtenIssue !== null) {
    fail(writtenIssue, 1);
  }
  report(snapshot, board, radar, out, shots);
}

main();

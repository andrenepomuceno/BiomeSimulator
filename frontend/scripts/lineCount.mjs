import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOT = path.resolve(PROJECT_ROOT, 'src');
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx']);

function normalizePath(value) {
  return value.split(path.sep).join('/');
}

function parseArgs(argv) {
  const opts = {
    top: 0,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if ((arg === '--top' || arg === '-n') && argv[i + 1]) {
      opts.top = Math.max(0, Number(argv[++i]) || 0);
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    }
  }

  return opts;
}

function printHelp() {
  console.log('Usage: node scripts/lineCount.mjs [--top N]');
  console.log('Counts production source lines under src for .js/.jsx files, excluding __tests__.');
}

function countLines(text) {
  if (!text.length) return 0;
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const parts = normalized.split('\n');
  if (parts[parts.length - 1] === '') parts.pop();
  return parts.length || 1;
}

function collectSourceFiles(dirPath, files = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (entry.name === '__tests__') continue;

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      collectSourceFiles(fullPath, files);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;

    files.push(fullPath);
  }

  return files;
}

function buildReportRows() {
  const files = collectSourceFiles(SOURCE_ROOT);
  const rows = files.map((filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    return {
      path: normalizePath(path.relative(PROJECT_ROOT, filePath)),
      lines: countLines(content),
    };
  });

  rows.sort((a, b) => b.lines - a.lines || a.path.localeCompare(b.path));
  return rows;
}

function printReport(rows, opts) {
  const visibleRows = opts.top > 0 ? rows.slice(0, opts.top) : rows;
  const rankWidth = String(Math.max(visibleRows.length, 1)).length;
  const lineWidth = String(Math.max(...visibleRows.map((row) => row.lines), 0)).length;
  const totalLines = rows.reduce((sum, row) => sum + row.lines, 0);

  console.log('Production source line count report');
  console.log(`Root: ${normalizePath(path.relative(PROJECT_ROOT, SOURCE_ROOT))}`);
  console.log(`Scope: .js/.jsx files under src, excluding __tests__`);
  console.log(`Files: ${rows.length}${opts.top > 0 ? ` (showing top ${visibleRows.length})` : ''}`);
  console.log(`Total lines: ${totalLines}`);
  console.log('');

  if (!visibleRows.length) {
    console.log('No matching files found.');
    return;
  }

  for (const [index, row] of visibleRows.entries()) {
    const rank = String(index + 1).padStart(rankWidth);
    const lines = String(row.lines).padStart(lineWidth);
    console.log(`${rank}. ${lines}  ${row.path}`);
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    printHelp();
    return;
  }

  const rows = buildReportRows();
  printReport(rows, opts);
}

main();
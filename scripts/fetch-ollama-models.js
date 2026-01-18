#!/usr/bin/env node
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Try common Ollama CLI commands to list models. Adjust if your CLI differs.
const tryCommands = ['ollama list', 'ollama models', 'ollama ls'];

function runCommand(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { encoding: 'utf8' }, (err, stdout, stderr) => {
      if (err) return resolve({ ok: false, err, stdout, stderr });
      resolve({ ok: true, stdout });
    });
  });
}

(async () => {
  for (const cmd of tryCommands) {
    process.stdout.write(`Trying: ${cmd}... `);
    // eslint-disable-next-line no-await-in-loop
    const res = await runCommand(cmd);
    if (!res.ok) {
      console.log('failed');
      continue;
    }

    const out = res.stdout.trim();
    if (!out) {
      console.log('no output');
      continue;
    }

    // Parse lines for model names, skip header if present
    let lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines[0] && /^name[:\s]?$/i.test(lines[0])) lines = lines.slice(1);
    let models = lines.map((l) => {
      const parts = l.split(/\s+/);
      if (parts.length === 1) return parts[0];
      return parts[0];
    }).filter(Boolean);
    // Remove any lingering 'NAME' entries (case-insensitive)
    models = models.filter(m => m.toLowerCase() !== 'name');

    if (models.length === 0) {
      console.log('no models parsed');
      continue;
    }

    const outPath = path.join(__dirname, '..', 'public', 'models.json');
    fs.writeFileSync(outPath, JSON.stringify(models, null, 2), 'utf8');
    console.log(`wrote ${models.length} models to ${outPath}`);
    process.exit(0);
  }

  console.error('Failed to list models. Ensure `ollama` is installed and on PATH.');
  process.exit(2);
})();

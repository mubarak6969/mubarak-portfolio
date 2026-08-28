// Safely reads/writes key=value pairs in the local .env file, preserving
// every other line untouched. Used only by local setup scripts (never by
// the deployed app, which gets real env vars from Vercel).
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', '.env');

function readEnvLines() {
    if (!fs.existsSync(ENV_PATH)) return [];
    return fs.readFileSync(ENV_PATH, 'utf8').split('\n');
}

// Sets one or more keys, updating an existing `KEY=...` line in place if
// present, or appending a new line if not. Never touches unrelated lines.
function setEnvValues(updates) {
    const lines = readEnvLines();
    const remainingKeys = new Set(Object.keys(updates));

    const updatedLines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        const eq = trimmed.indexOf('=');
        if (eq === -1) return line;
        const key = trimmed.slice(0, eq).trim();
        if (updates[key] !== undefined) {
            remainingKeys.delete(key);
            return `${key}=${updates[key]}`;
        }
        return line;
    });

    // Drop a single trailing blank line so appends don't accumulate gaps.
    while (updatedLines.length && updatedLines[updatedLines.length - 1] === '') {
        updatedLines.pop();
    }

    for (const key of remainingKeys) {
        updatedLines.push(`${key}=${updates[key]}`);
    }

    fs.writeFileSync(ENV_PATH, updatedLines.join('\n') + '\n', { mode: 0o600 });
}

function hasEnvValue(key) {
    const lines = readEnvLines();
    return lines.some((line) => {
        const trimmed = line.trim();
        const eq = trimmed.indexOf('=');
        return eq !== -1 && trimmed.slice(0, eq).trim() === key && trimmed.slice(eq + 1).trim() !== '';
    });
}

module.exports = { setEnvValues, hasEnvValue, ENV_PATH };

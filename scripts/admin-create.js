// Creates/updates the single super-admin's credentials. Everything you type
// here stays on your own machine — the password is never printed back,
// never logged, and never sent anywhere. Only its hash is written to .env.
//
// Usage: npm run admin:create
require('../lib/load-env')();
const readline = require('readline');
const crypto = require('crypto');
const { hashPassword } = require('../lib/auth');
const { setEnvValues, hasEnvValue } = require('../lib/env-file');

function prompt(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
    });
}

// Masked input via raw-mode keystroke capture rather than hacking
// readline's internal _writeToOutput — that approach is fragile with
// backspace/editing on some terminals (notably Windows), and a corrupted
// capture would silently produce a password that doesn't match what the
// user thinks they typed. This handles Enter, Ctrl+C, and backspace
// explicitly via their escaped char codes, and echoes nothing back.
const BACKSPACE = String.fromCharCode(8);
const DELETE = String.fromCharCode(127);
const CTRL_C = String.fromCharCode(3);

function promptHidden(question) {
    return new Promise((resolve, reject) => {
        process.stdout.write(question);
        const stdin = process.stdin;

        if (!stdin.isTTY) {
            // Non-interactive stdin (e.g. piped input) — fall back to a
            // plain readline read since raw mode isn't available.
            const rl = readline.createInterface({ input: stdin, output: process.stdout });
            rl.question('', (answer) => { rl.close(); resolve(answer); });
            return;
        }

        stdin.resume();
        stdin.setEncoding('utf8');
        stdin.setRawMode(true);

        let input = '';
        const cleanup = () => {
            stdin.setRawMode(false);
            stdin.pause();
            stdin.removeListener('data', onData);
        };
        const onData = (chunk) => {
            const str = chunk.toString();
            for (const char of str) {
                if (char === '\n' || char === '\r') {
                    cleanup();
                    process.stdout.write('\n');
                    return resolve(input);
                }
                if (char === CTRL_C) {
                    cleanup();
                    process.stdout.write('\n');
                    return reject(new Error('Cancelled'));
                }
                if (char === BACKSPACE || char === DELETE) {
                    input = input.slice(0, -1);
                } else if (char >= ' ') { // printable characters only
                    input += char;
                }
            }
        };
        stdin.on('data', onData);
    });
}

async function main() {
    console.log('Super-admin setup — this updates .env locally and is never sent anywhere.\n');

    const username = await prompt('Admin username [mubarak]: ') || 'mubarak';
    const password = await promptHidden('Admin password (input hidden, min 8 chars): ');
    const confirm = await promptHidden('Confirm password: ');

    if (!password || password.length < 8) {
        console.error('\nPassword must be at least 8 characters. Nothing was saved.');
        process.exit(1);
    }
    if (password !== confirm) {
        console.error('\nPasswords did not match. Nothing was saved.');
        process.exit(1);
    }

    const updates = {
        ADMIN_USERNAME: username,
        ADMIN_PASSWORD_HASH: hashPassword(password)
    };

    if (!hasEnvValue('SESSION_SECRET')) {
        updates.SESSION_SECRET = crypto.randomBytes(48).toString('hex');
        console.log('Generated a new SESSION_SECRET (none was set yet).');
    } else {
        console.log('Existing SESSION_SECRET left untouched.');
    }

    setEnvValues(updates);

    console.log(`\nDone. Admin username set to "${username}"; password hash saved to .env.`);
    console.log('The plaintext password was not saved anywhere — store it yourself (e.g. a password manager).');
    console.log('For production, copy ADMIN_USERNAME, ADMIN_PASSWORD_HASH, and SESSION_SECRET into your Vercel project\'s Environment Variables — never commit .env itself.');
}

main().catch((err) => {
    console.error('\n' + err.message);
    process.exit(1);
});

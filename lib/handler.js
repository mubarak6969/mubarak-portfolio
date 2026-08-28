// Wraps an API route handler so any thrown error (DB connection failure,
// bad query, etc.) is logged server-side but never leaks internals — the
// client only ever sees a generic message, never a stack trace or DB error.
function withErrorHandling(fn) {
    return async function wrapped(req, res) {
        try {
            await fn(req, res);
        } catch (err) {
            console.error(`API error on ${req.method} ${req.url}:`, err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    };
}

module.exports = { withErrorHandling };

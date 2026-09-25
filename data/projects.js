// Local static project data — replaces the removed Supabase/API-backed
// project store. Every field below is sourced directly from the project's
// own case-study document (PDF/MD) supplied for that project; nothing here
// is invented. Where a document explicitly marks something unverified or
// not applicable, that is preserved rather than smoothed over.
//
// Consumed by: script.js (homepage project cards) and project.js
// (individual case-study pages, via project.html?slug=<slug>).
(function (global) {
    'use strict';

    var PROJECTS = [
        {
            slug: 'ecg-abnormality-detection',
            title: 'ECG Abnormality Detection using CNN-LSTM',
            tagline: 'An RCNN (1D CNN + LSTM) ECG classifier trained on PTB-XL, served through a FastAPI REST API with calibrated confidence and gradient-based explainability.',
            category: 'Applied Machine Learning / Full-Stack ML Engineering',
            role: 'Sole developer — data pipeline, model, backend, security, testing, deployment',
            year: '2025 – 2026',
            status: 'ML pipeline and API: verified and tested (67/67 tests passing). Frontend: deployed and live on Vercel. Backend: implemented, not verified live. Frontend–backend connection is not currently active.',
            icon: 'fa-heartbeat',
            overview: 'An end-to-end system that classifies an uploaded electrocardiogram as normal or abnormal using a 1D CNN + LSTM ("RCNN") model trained on the PTB-XL clinical ECG dataset, served through a FastAPI REST API and a static web frontend. Given an uploaded WFDB signal, the system loads and calibrates it, detects heartbeats, classifies each beat, aggregates beat probabilities into a calibrated record-level prediction, and returns the result with a confidence score, waveform, and a gradient-based explainability overlay.',
            problem: 'An ECG is one of the fastest, cheapest diagnostic tools in medicine, but interpreting one correctly requires trained expertise that isn’t always available on demand — in high-volume clinics, screening programs, or wearable-device triage. The concrete engineering problem: given a raw, variable-length, variable-sampling-rate 12-lead ECG signal, produce a single reliable binary label (normal/abnormal) with a trustworthy confidence value, evaluated honestly on patients the model has never seen, and served as a real, testable web API — not just a notebook experiment.',
            solution: 'Train a deep learning model that learns beat morphology and temporal structure directly from raw signal data — a 1D CNN to detect local waveform shapes combined with an LSTM to model how those shapes unfold across the beat window — rather than hand-engineering diagnostic rules. Wrap that model in a shared preprocessing pipeline used identically by training and live inference, aggregate per-beat predictions into a per-record answer, calibrate the resulting probability, and add gradient-based explainability so a prediction is not a black box. Serve all of this through a documented REST API with a simple upload UI.',
            techStack: {
                languages: ['Python 3.12'],
                frontend: ['HTML', 'CSS', 'JavaScript', 'Chart.js (CDN)'],
                backend: ['FastAPI', 'Pydantic', 'uvicorn (ASGI)'],
                database: ['None — no database is used; see Database section'],
                aiml: ['TensorFlow / Keras 2.16.1', 'NumPy', 'SciPy', 'scikit-learn', 'WFDB (signal I/O)'],
                tools: ['pytest', 'ruff', 'Docker', 'GitHub Actions (CI)', 'Git / GitHub'],
                deployment: ['Vercel (frontend — verified live)', 'Render (backend — not verified live)']
            },
            architecture: {
                stages: [
                    'USER (browser)',
                    'VERCEL FRONTEND — public/, api/config.js',
                    'FASTAPI — Render: uvicorn app.main:app',
                    'FILE VALIDATION — filename sanitization, extension check, size cap',
                    'ECG PREPROCESSING — load, resample, R-peak detect, window, normalize',
                    'CNN-LSTM MODEL — RCNN inference (TensorFlow/Keras)',
                    'BEAT PREDICTIONS — one probability per detected heartbeat',
                    'RECORD AGGREGATION — mean-pool beat probabilities',
                    'CALIBRATION — temperature scaling',
                    'EXPLAINABILITY — gradient saliency on the most-confident beat',
                    'JSON RESPONSE',
                    'FRONTEND — renders prediction, confidence, waveform, saliency overlay'
                ],
                note: 'Two separate deployables by necessity: TensorFlow’s installed footprint (~1.4GB) exceeds Vercel’s Python serverless function size limit (~250MB), measured directly after an earlier single-function deploy attempt never went live. Vercel serves only the static frontend plus one dependency-free Node function; the FastAPI/TensorFlow service is designed to run on Render.'
            },
            workflow: [
                { step: '01', text: 'User opens the frontend and drags in a WFDB .dat file (optionally with its .hea header).' },
                { step: '02', text: 'The frontend resolves the backend’s URL from /api/config, then POSTs the file(s) as multipart form data to the predict endpoint.' },
                { step: '03', text: 'FastAPI validates the upload (extension, size, filename safety) and writes it to a random per-request temp directory.' },
                { step: '04', text: 'The shared preprocessing pipeline loads the signal, resamples it to 100Hz, detects R-peaks, and extracts a 200-sample window per beat.' },
                { step: '05', text: 'The RCNN scores every beat window; beat probabilities are mean-pooled into one record-level probability, then temperature-scaled.' },
                { step: '06', text: 'Gradient saliency is computed for the single most-confident beat.' },
                { step: '07', text: 'The temp directory is deleted (always, even on error), and a JSON response is returned with prediction, confidence, beat count, waveform, and explainability data.' },
                { step: '08', text: 'The frontend renders a result badge, a confidence bar, the waveform (Chart.js), and a heatmap-style saliency overlay.' }
            ],
            implementation: [
                {
                    title: 'One shared preprocessing function',
                    detail: 'The entire signal-processing path lives in one function, called identically by the offline training script and the live API — training/serving skew is architecturally impossible, not just avoided by discipline.',
                    code: 'def prepare_segments_for_record(record_path, lead_index, window_size):\n    loaded = load_lead_signal(record_path, lead_index)      # WFDB, calibrated mV\n    signal, fs = resample_to_target_rate(loaded.signal, loaded.fs)  # 100Hz\n    peaks = detect_r_peaks(signal, fs)                      # amplitude + min-RR\n    segments = extract_windows(signal, peaks, window_size)  # 200-sample, z-score\n    return segments, signal[:min(1000, len(signal))]'
                },
                {
                    title: 'RCNN architecture',
                    detail: 'Three Conv1D blocks (64 → 128 → 256 filters) with MaxPooling and BatchNormalization, feeding two stacked LSTM layers (256 then 128 units) and a dense classification head.',
                    code: 'Conv1D(64, k=5) -> MaxPool -> BatchNorm\nConv1D(128, k=5) -> MaxPool -> BatchNorm\nConv1D(256, k=5) -> MaxPool\nLSTM(256, return_sequences=True)\nLSTM(128)\nDense(256, relu) -> Dropout(0.4)\nDense(1, sigmoid)'
                },
                {
                    title: 'Security-hardened upload path',
                    detail: 'Filename sanitization (own implementation, no framework dependency), a required .dat / optional .hea extension allowlist, dual-layer size caps (Content-Length pre-check + a size-capped streaming read), a fresh uuid4-named temp directory per request, and guaranteed cleanup in a finally block on every code path.'
                }
            ],
            mlPipeline: {
                stages: [
                    'INPUT — raw image/signal bytes (uploaded photo or WFDB record)',
                    'FACE/SIGNAL LOAD — WFDB load, physical units (calibrated mV)',
                    'RESAMPLE — fixed 100Hz so every window spans the same physical duration',
                    'R-PEAK DETECTION — amplitude threshold + physiologically-derived minimum RR interval',
                    'BEAT EXTRACTION — 200-sample window per beat, z-score normalized',
                    'RCNN INFERENCE — 3x Conv1D blocks + 2x stacked LSTM + dense head',
                    'RECORD AGGREGATION — mean-pooling across all beat probabilities',
                    'CALIBRATION — temperature scaling, T ≈ 1.1605, fit on the validation fold only',
                    'EXPLAINABILITY — vanilla gradient saliency on the most-confident beat'
                ],
                note: 'Dataset: PTB-XL v1.0.3 — 21,799 12-lead ECGs, 18,869 patients, patient-stratified split (folds 1–8 train / 9 val / 10 test), verified zero record or patient overlap across splits. A labeling bug was found and fixed: scp_codes values are likelihood percentages, not booleans — the original logic mislabeled 8,786 of 21,799 records (40%) as abnormal. Training: Adam (lr 1e-4), binary cross-entropy, class-balanced weighting, EarlyStopping + ReduceLROnPlateau, seed 42, capped at 4,000/17,418 training records for CPU tractability (validation/test never capped). At beat-level the RCNN wins clearly (79.4% vs 79.1% accuracy); at record-level — what the API actually returns — a CNN baseline nominally edges ahead (80.4% vs 80.1% accuracy), disclosed rather than hidden. RCNN is retained as the primary model per project scope.'
            },
            database: {
                type: 'None — not applicable to this project',
                note: 'There is no database. State is limited to the trained model file (gitignored, downloaded via a GitHub Release at startup), small JSON evaluation reports, and per-request temporary upload directories deleted immediately after each request.'
            },
            api: [
                { method: 'GET', path: '/', purpose: 'Courtesy root — {"name": "ECG Intelligence API", "docs": "/docs"}' },
                { method: 'GET', path: '/health', purpose: 'Liveness + model-loaded check' },
                { method: 'GET', path: '/model-info', purpose: 'Architecture and last-evaluated record-level test metrics' },
                { method: 'POST', path: '/predict', purpose: 'The inference endpoint — multipart upload, returns prediction, confidence, beats analyzed, explainability' },
                { method: 'GET', path: '/docs', purpose: 'Swagger UI (FastAPI auto-generated)' },
                { method: 'GET', path: '/redoc', purpose: 'ReDoc (FastAPI auto-generated)' },
                { method: 'GET', path: '/openapi.json', purpose: 'Raw OpenAPI schema' }
            ],
            decisions: [
                { decision: 'Mean-pooling for beat aggregation', why: 'Top-k-mean nominally scored best on validation, but beat mean-pooling by only 0.14pp F1 — below the project’s pre-registered 0.5pp "worth the extra complexity" threshold.' },
                { decision: 'RCNN kept as the primary model', why: 'A simpler CNN baseline nominally wins at record-level by 0.3pp accuracy — small enough that either is defensible, disclosed rather than hidden, and RCNN is retained per project scope.' },
                { decision: 'One shared preprocessing implementation', why: 'Makes train/serve skew architecturally impossible instead of merely avoided by convention.' },
                { decision: 'Split Vercel/Render deployment', why: 'TensorFlow (~1.4GB) exceeds Vercel’s ~250MB serverless function limit — measured directly, not assumed.' },
                { decision: 'Migrated Flask → FastAPI', why: 'Async support, automatic OpenAPI docs, typed Pydantic validation — migrated with byte-for-byte verified identical prediction output.' }
            ],
            challenges: [
                { problem: 'Incorrect PTB-XL label interpretation', cause: 'scp_codes likelihood values (0–100%) were treated as a presence flag rather than a percentage — a 0%-likelihood co-listed code (explicitly ruled out) was counted as present.', solution: 'Filter to likelihood > 0 before checking whether the remaining code set is exactly {"NORM"}. Fixed the mislabeling of 8,786/21,799 records.', lesson: 'Data correctness dominates architecture choice — a perfectly-trained model on corrupted labels is still a corrupted model.' },
                { problem: 'Beat-to-record aggregation bug', cause: 'The original confidence calculation was mean(prob > 0.5) — the fraction of beats individually voting abnormal — not the mean probability, which could report exactly 100% confidence on genuinely weak evidence.', solution: 'Switched to genuine mean-pooling of raw probabilities, locked in with a regression test asserting the result is never exactly 1.0.', lesson: 'Always verify a "confidence" number is actually the statistic it claims to be.' },
                { problem: 'Explainability verification with no ground truth', cause: 'The model is nonlinear and high-dimensional — there’s nothing to directly check a gradient-saliency implementation against.', solution: 'Constructed a synthetic single-dense-layer sigmoid(w·x) model whose gradient is provably known analytically; the implementation matches it to 1e-4 tolerance.', lesson: 'When you can’t verify a method against ground truth directly, build a synthetic case where the answer is provably known.' },
                { problem: 'Two production deployment blockers on Render', cause: 'Render defaulted new services to a Python version incompatible with TensorFlow, and a wfdb/pandas 3.x incompatibility crashed the FastAPI import.', solution: 'Pinned the Python runtime explicitly, upgraded wfdb, and pinned pandas/scipy to compatible versions — verified with a clean import and all 67 tests passing.', lesson: 'An unpinned language runtime or transitive dependency on a managed platform is itself a risk that can silently change under you.' }
            ],
            testing: {
                summary: '67/67 tests passing (pytest), ruff clean. Test suite covers config invariants, patient-leakage-free dataset splitting, the corrected label rule, preprocessing edge cases, aggregation/calibration correctness (including the confidence-bug regression test), explainability verified against a closed-form gradient, and the FastAPI backend (validation, CORS, cleanup, docs availability, end-to-end demo prediction). CI runs lint and the full suite on every push.'
            },
            results: [
                'Record-level (what /predict returns): 80.1% accuracy, 0.800 macro F1, 0.889 ROC-AUC, 0.886 specificity',
                'Beat-level: 79.4% accuracy, 0.790 macro F1, 0.883 ROC-AUC, 0.859 specificity',
                'A dataset labeling bug affecting 40% of records was found and fixed',
                'Flask → FastAPI migration completed with byte-for-byte verified identical prediction output',
                'Model artifact publicly hosted via a GitHub Release (11.6MB, reachable)',
                '67/67 automated tests passing'
            ],
            metrics: [
                { label: 'Record-Level Accuracy', value: 80.1, suffix: '%' },
                { label: 'ROC-AUC', value: 0.889, suffix: '', decimals: 3 },
                { label: 'Tests Passing', value: 67, suffix: '/67' },
                { label: 'PTB-XL Records', value: 21799, suffix: '' }
            ],
            security: [
                'Filename sanitization — own implementation, no framework dependency',
                'Extension allowlist (.dat required, .hea optional)',
                'Dual-layer file size caps (Content-Length pre-check + streaming read cap)',
                'Fresh, random per-request temp directory, guaranteed cleanup on every code path',
                'Exact-origin CORS allowlist — never a wildcard',
                'Generic error responses — real errors logged server-side only',
                'No secrets committed — all configuration is environment-variable based'
            ],
            media: {
                images: [
                    { src: 'images/projects/ecg-screenshot-result.png', alt: 'Real output from a live local run: uploading the bundled sample WFDB record through the ECG classifier UI, end to end.', caption: 'Verified real output — uploading a sample ECG record through the actual UI.' }
                ],
                videos: [],
                note: 'This is the only media asset that exists in the project repository; everything else in this case study is rendered from verified data, not illustrated with stock or generated imagery.'
            },
            github: 'https://github.com/mubarak6969/ECG_DETECTION',
            demo: 'https://ecg-detection-two.vercel.app',
            docs: null
        },

        {
            slug: 'advance-attendance-system',
            title: 'Advance Attendance System',
            tagline: 'A FastAPI-based face-recognition attendance platform with a RandomForest classifier and a dual SQLite/PostgreSQL storage design for free-tier hosting.',
            category: 'Full-Stack Web Application / Applied Computer Vision',
            role: 'Solo developer — backend, ML integration, Flask-to-FastAPI migration',
            year: 'Not specified in project materials',
            status: 'Code and ML pipeline: production-ready and tested (63/73 tests passing, 10 skipped). Not currently deployed live.',
            icon: 'fa-user-check',
            overview: 'A web application that marks student attendance via face recognition instead of manual roll-call. Staff register students and capture reference face photos through the browser; a background job trains a RandomForest classifier on MediaPipe-detected, OpenCV-preprocessed face images; a public kiosk page then recognizes a face live and marks attendance automatically, with same-day duplicate marking blocked at the database level.',
            problem: 'Manual, roll-call-style attendance tracking is slow, easy to falsify (marking a friend present), and produces no structured historical data for analytics. A small institution or classroom needs a system where presence is verified by something harder to fake than a signature or a shouted "present" — a photo of their own face — while remaining cheap enough to run without dedicated server infrastructure or a paid database.',
            solution: 'Staff register students and capture ~50 reference face photos per student through the browser. A background job trains a classifier on those photos. A public kiosk page then recognizes a face live and marks attendance automatically, with same-day duplicate marking blocked at the database level. The whole system runs on infrastructure with no persistent disk (Render’s free tier) by storing everything — including the trained model and face images — inside the database itself rather than on the filesystem.',
            techStack: {
                languages: ['Python 3'],
                frontend: ['Jinja2 server-rendered templates', 'Vanilla JavaScript', 'Chart.js (CDN)'],
                backend: ['FastAPI 0.115.6', 'Uvicorn (ASGI)', 'Gunicorn (production process manager)', 'Pydantic / pydantic-settings', 'Starlette SessionMiddleware'],
                database: ['SQLite (local/dev)', 'PostgreSQL via psycopg (production)'],
                aiml: ['MediaPipe (face detection)', 'OpenCV (preprocessing)', 'scikit-learn RandomForestClassifier', 'NumPy'],
                tools: ['pytest', 'httpx TestClient', 'Werkzeug (password hashing only, not the framework)']
            },
            architecture: {
                stages: [
                    'BROWSER',
                    'MIDDLEWARE STACK — SessionMiddleware → security_middleware (CSRF + current-user load) → MaxBodySizeMiddleware',
                    'ROUTERS — 7 domain routers: health, auth, students, attendance, analytics, training, admin (27 routes total)',
                    'DEPENDENCIES — require_login / require_super_admin / verify_csrf / get_db',
                    'SERVICES — business logic layer',
                    'MODELS (raw SQL) + ML (face detection, preprocessing, training, recognition)',
                    'SQLite (dev) or PostgreSQL (prod, via DATABASE_URL)',
                    'RESPONSE — Jinja2-rendered HTML or JSON'
                ],
                note: 'Deliberately kept at original pre-migration routes with no /api/ prefix, to avoid rewriting every existing fetch() call and template link for no functional gain.'
            },
            workflow: [
                { step: '01', text: 'A staff member logs in and registers a new student.' },
                { step: '02', text: 'They capture ~50 face photos per student through the browser camera, stored as local files or database blobs depending on environment.' },
                { step: '03', text: 'A super admin triggers training — runs as a background thread, not blocking the request; progress is polled.' },
                { step: '04', text: 'The trained model is persisted as a pickled blob, in a file or the database.' },
                { step: '05', text: 'Anyone can open the public kiosk page (no login required); the browser periodically posts a captured frame for recognition.' },
                { step: '06', text: 'The backend detects a face, extracts its feature vector, runs it through the trained classifier, and — if confidence clears the threshold and the student hasn’t already been marked today — inserts an attendance row.' },
                { step: '07', text: 'Logged-in staff can review attendance, export it as CSV, and view analytics.' }
            ],
            implementation: [
                {
                    title: 'Explicit connection passing, no ORM',
                    detail: 'Every model function takes an explicit conn argument rather than relying on framework-managed globals — a deliberate simplification made during the FastAPI migration that removed the need for Flask’s app_context() workarounds the background training thread and tests previously needed.',
                    code: 'def mark_attendance(conn, student_id, name):\n    # raw, parameterized SQL — no ORM, backend-agnostic via the Conn wrapper\n    ...'
                },
                {
                    title: 'One database abstraction, two backends',
                    detail: 'A single Conn class wraps either a sqlite3 or psycopg connection, translating ? placeholders to %s for Postgres and providing a date_expr() helper for the one recurring SQL dialect difference the queries need. Every query function above it is backend-agnostic.'
                },
                {
                    title: 'Background training with a process-local lock',
                    detail: 'Uses a module-level threading.Lock to guarantee only one training run happens at a time, and resets a stuck "running" status if the process restarts mid-training.'
                }
            ],
            mlPipeline: {
                stages: [
                    'INPUT — raw image bytes (uploaded photo or kiosk camera frame)',
                    'FACE DETECTION — MediaPipe FaceDetection, configurable confidence threshold',
                    'FACE CROP — bounding box from MediaPipe, cropped with OpenCV',
                    'PREPROCESSING — grayscale conversion → histogram equalization → resize to 32x32',
                    'FEATURE VECTOR — flattened to a 1024-value vector',
                    'RANDOM FOREST CLASSIFIER — scikit-learn, 150 trees, random_state=42',
                    'RECOGNITION — predict_proba → argmax → confidence; below threshold (default 0.5) → "unknown"',
                    'ATTENDANCE — inserted only if confidence clears threshold and the student hasn’t been marked today'
                ],
                note: 'Not deep learning and not a neural network — explicitly, by design. Training requires at least 5 usable images per student and 2 qualifying students; images that fail to decode or contain zero/multiple faces are skipped and counted, never silently dropped. Explicit "unknown" / "multiple_faces" / "no_face" statuses exist for both training and live recognition. No accuracy/precision/recall numbers exist anywhere in the codebase — none are claimed here.'
            },
            database: {
                type: 'Dual-backend: SQLite (local/dev) or PostgreSQL (production, via DATABASE_URL)',
                tables: [
                    { name: 'students', fields: 'id, name, roll, class, section, reg_no, created_at', purpose: 'Referenced by attendance and face_images' },
                    { name: 'attendance', fields: 'id, student_id, name, timestamp', purpose: 'FK → students.id (ON DELETE CASCADE); unique index on (student_id, date) blocks duplicate same-day marking at the database level' },
                    { name: 'face_images', fields: 'id, student_id, filename, data (BLOB/BYTEA), created_at', purpose: 'FK → students.id (ON DELETE CASCADE)' },
                    { name: 'model_artifacts', fields: 'key (PK), data (BLOB/BYTEA), meta_json, updated_at', purpose: 'Key-value store for the trained model blob' },
                    { name: 'users', fields: 'id, name, email, password_hash, role, is_active, is_approved, is_verified', purpose: 'Role-based auth (super_admin / user)' }
                ],
                note: 'No ORM — all queries are raw, parameterized SQL. When DATABASE_URL is set, face images and the trained model are stored as blobs inside PostgreSQL rather than the filesystem, since Render’s free tier has no persistent disk.'
            },
            api: [
                { method: 'GET', path: '/mark_attendance', purpose: 'Public kiosk page — no login required' },
                { method: 'POST', path: '/recognize_face', purpose: 'Recognize a face and mark attendance (CSRF-exempt, documented)' },
                { method: 'POST', path: '/train_model', purpose: 'Start background model training' },
                { method: 'GET', path: '/train_status', purpose: 'Poll training progress' },
                { method: 'POST', path: '/add_student', purpose: 'Create a student' },
                { method: 'POST', path: '/upload_face', purpose: 'Upload a captured face image' },
                { method: 'GET', path: '/attendance_record', purpose: 'Paginated, filterable attendance history' },
                { method: 'GET', path: '/download_csv', purpose: 'Export attendance as CSV' },
                { method: 'GET', path: '/analytics', purpose: 'Analytics dashboard' }
            ],
            decisions: [
                { decision: 'No /api/ URL prefix', why: 'Avoids rewriting every existing fetch() call, template link, and test URL for no functional gain.' },
                { decision: 'No ORM (raw SQL)', why: 'Keeps the query layer thin and identical in shape across SQLite/Postgres via the Conn abstraction.' },
                { decision: 'CSRF as a Depends(), not middleware', why: 'Middleware reading the request body conflicted with the route handler’s own body read.' },
                { decision: 'Single Gunicorn worker in production', why: 'The training lock and login-lockout state are in-process; more than one worker would silently break both.' },
                { decision: 'Database-blob storage for images/model in production', why: 'Render’s free tier has no persistent disk — the database is the only thing that survives a redeploy.' }
            ],
            challenges: [
                { problem: 'CSRF middleware silently broke login', cause: 'An early implementation checked CSRF inside BaseHTTPMiddleware, which read the request form there; the route handler’s own Form(...) parameters then read the body again and received empty strings.', solution: 'Converted CSRF verification into a Depends(verify_csrf) dependency, sharing the exact same Request instance as the route handler.', lesson: 'Middleware reading a request body can silently break a downstream handler reading it again.' },
                { problem: 'SQLite cross-thread connection errors', cause: 'FastAPI executes sync dependencies through a thread pool; a connection opened in one thread was then used in another, which SQLite rejects by default.', solution: 'check_same_thread=False, justified as safe because each connection is opened and closed within a single request, never shared across concurrent requests.', lesson: 'Framework execution models (thread pools) can violate assumptions an underlying library makes.' },
                { problem: 'Template-rendering parameter collision', cause: 'The render() helper originally took name as its template-name argument, colliding with pages that also pass a context variable literally called name.', solution: 'Renamed the parameter to template_name.', lesson: 'Generic parameter names in shared helpers can silently collide with legitimate data.' }
            ],
            testing: {
                summary: '63 passed, 0 failed, 10 skipped (pytest) — 73 tests collected total. Covers routing, page rendering, dashboard, students, attendance marking, analytics, training-status polling, admin user management, and full authentication/security (CSRF, login lockout, role-forgery rejection, last-super-admin protection). 10 PostgreSQL integration tests are implemented but skip-guarded on an unset TEST_DATABASE_URL — implemented but not exercised in this environment.'
            },
            results: [
                'A complete, working face-recognition attendance system with zero Flask code remaining after a full-application framework migration',
                'Entire pre-existing test suite (73 tests, 63 non-skipped) still passing after the migration',
                'Three genuine framework-specific bugs found and fixed during the migration',
                'A storage architecture that works within a real constraint (Render free tier’s lack of persistent disk)'
            ],
            metrics: [
                { label: 'Tests Passing', value: 63, suffix: '/73' },
                { label: 'API Routes', value: 27, suffix: '' },
                { label: 'RandomForest Trees', value: 150, suffix: '' },
                { label: 'Min Images/Student', value: 5, suffix: '' }
            ],
            security: [
                'Password hashing via PBKDF2/scrypt (werkzeug.security) — hashes only, never plaintext',
                'Session-cookie auth, itsdangerous-signed, Secure flag in production',
                'CSRF protection — per-session token, header-first with form fallback, constant-time comparison',
                'Server-side role checks only — never trusted from the request body',
                'Login lockout — 5 failed attempts locks an IP for 60 seconds',
                'SQL parameterization throughout — no string-interpolated SQL found anywhere',
                'Upload validation by actually attempting an OpenCV decode + MediaPipe detection, not trusting the file extension',
                'Last-super-admin protection — cannot deactivate/demote/delete the last active super admin'
            ],
            media: {
                images: [],
                videos: [],
                note: 'No feature screenshots or video currently exist for this project. The only image asset in the repository is a decorative auth-page background, not a demonstration of the working application — it is intentionally not used here rather than presented as a feature screenshot.'
            },
            github: 'https://github.com/mubarak6969/Adavance_Attendance_System',
            demo: null,
            docs: null
        },

        {
            slug: 'deep-dive-knowledge-assistant',
            title: 'Deep-Dive Knowledge Assistant',
            tagline: 'A grounded-answer API that turns videos, documents, and audio into a searchable, citable knowledge base.',
            category: 'Backend Engineering / Applied AI & Machine Learning / REST API Development',
            role: 'Solo developer — architecture, backend, ML pipeline, security, testing',
            year: '2026',
            status: 'Working locally, live-tested end to end (202/202 automated tests passing). The FastAPI rewrite is not yet committed to git and not yet deployed.',
            icon: 'fa-brain',
            overview: 'A FastAPI backend that ingests YouTube videos, PDFs, text files, and audio/video recordings, then answers natural-language questions about them using a hybrid retrieval-augmented generation (RAG) pipeline. Every answer is grounded in retrieved evidence and cited by source, timestamp, or page number — or the API explicitly says the evidence isn’t there, instead of guessing. It started as a Streamlit application and was rebuilt as a stateless, fully-tested REST API over the same ML core.',
            problem: 'Long-form content — a lecture video, a technical PDF, a meeting recording — is slow to review and hard to search. General-purpose chat assistants don’t solve this either: asked about a specific video or document, they either don’t have access to it at all, or can quietly answer from their own background knowledge instead of the material actually given, with no way to tell which is which.',
            solution: 'Ingest content into chunked, embedded, persistent vector storage. Retrieve relevant evidence with a hybrid vector + keyword search fused via Reciprocal Rank Fusion. Filter weak evidence with a dedicated relevance gate, distinct from the ranking score. Generate an LLM answer strictly grounded in — and citing — only the surviving evidence; if nothing survives the gate, the LLM is never called at all.',
            techStack: {
                languages: ['Python 3.11'],
                frontend: ['None — API-only by design, no bundled frontend'],
                backend: ['FastAPI 0.141.1', 'Uvicorn 0.53.0', 'Pydantic v2', 'python-multipart'],
                database: ['ChromaDB 1.5.9 (persistent vector store)', 'library.json (flat source index)'],
                aiml: ['OpenAI Whisper (speech-to-text)', 'sentence-transformers all-MiniLM-L6-v2 (embeddings)', 'rank-bm25 (keyword search)', 'Groq API (hosted LLM inference)'],
                tools: ['yt-dlp', 'ffmpeg / ffprobe', 'pypdf', 'pytest', 'httpx TestClient']
            },
            architecture: {
                stages: [
                    'CLIENT — curl / Swagger UI / any HTTP client, no bundled frontend',
                    'FASTAPI — CORS, exception handlers, password-gated /api/v1 router',
                    'API ROUTES — health, sources, ingestion, notes, chat (5 route modules, 12 endpoints)',
                    'SERVICE LAYER — thin async wrappers over the ML core',
                    'INGESTION / PROCESSING — youtube_source, pdf_source, text_source, audio_source → one shared IngestedSource shape',
                    'ML PIPELINE — chunker → embedder → vector_store; retrieval → reranker on query',
                    'STORAGE — ChromaDB persistent vector store + library.json + notes/transcripts on disk',
                    'RETRIEVAL — hybrid vector+BM25 search, RRF fusion, reranking, relevance gate',
                    'LLM — Groq, grounded answer generation, citation-labeled',
                    'RESPONSE — Pydantic-validated JSON: answer, has_evidence, cited sources'
                ],
                note: 'CPU-bound ML calls (Whisper, embedding, ChromaDB queries) are synchronous with no async API — routes run that work inside a thread pool so a long-running ingestion request doesn’t block the event loop from serving other concurrent requests.'
            },
            workflow: [
                { step: '01', text: 'User sends a YouTube URL or uploads a PDF/text/audio/video file.' },
                { step: '02', text: 'FastAPI validates the request shape, checks the rate limit and, if configured, the shared-password header.' },
                { step: '03', text: 'For a YouTube URL, the hostname is checked against an allowlist to block SSRF tricks before any download happens.' },
                { step: '04', text: 'The matching ingestion adapter runs: yt-dlp + Whisper for video/audio, pypdf for PDF, or a direct read for text.' },
                { step: '05', text: 'Content is split into overlapping chunks and embedded with a local sentence-transformer model.' },
                { step: '06', text: 'Chunks, embeddings, and metadata are saved to ChromaDB; structured notes are generated via Groq; a duplicate content hash skips reprocessing entirely.' },
                { step: '07', text: 'A question triggers hybrid retrieval — vector search and BM25 fused by Reciprocal Rank Fusion, then reranked and filtered by a relevance gate.' },
                { step: '08', text: 'If nothing survives the gate, the API returns "insufficient evidence" and the LLM is never called. Otherwise, Groq generates an answer grounded strictly in the surviving chunks, with citations mapped back to real source metadata.' }
            ],
            implementation: [
                {
                    title: 'Router-level password gate',
                    detail: 'The entire /api/v1 router is gated by a single dependency, applied once so it can’t be forgotten on an individual route.',
                    code: 'v1 = APIRouter(prefix=API_V1_PREFIX, dependencies=[Depends(require_app_password)])\nv1.include_router(sources.router)\nv1.include_router(ingestion.router)\nv1.include_router(notes.router)\nv1.include_router(chat.router)'
                },
                {
                    title: 'A relevance gate distinct from the ranking score',
                    detail: 'RRF-based rank scores reflect relative position among a single query’s own candidates, not absolute relevance. A second, independent relevance_score per candidate (max of raw cosine similarity and exact keyword overlap) is what the gate actually filters on.'
                },
                {
                    title: 'A one-line import-compatibility shim',
                    detail: 'Running "uvicorn src.main:app" imports src as a package first, which would break ~30 existing modules’ flat imports. A small src/__init__.py shim inserts the src directory onto sys.path the moment the package is imported, so every existing flat import keeps resolving unchanged — avoiding a much larger, riskier refactor.'
                }
            ],
            mlPipeline: {
                stages: [
                    'AUDIO / VIDEO — YouTube or uploaded file',
                    'WHISPER — local, cached model per size, produces timestamped transcript segments',
                    'CHUNKING — ~30s overlapping windows for timed content, ~1200-char windows for PDF/text',
                    'EMBEDDINGS — sentence-transformers all-MiniLM-L6-v2, local, no external API call',
                    'CHROMADB — persistent vector store: chunk text + embedding + metadata',
                    'VECTOR SEARCH + BM25 — run in parallel over the same candidate pool',
                    'RRF — Reciprocal Rank Fusion (k=60) merges the two ranked lists',
                    'RERANKING — heuristic default (vector similarity + BM25 + keyword overlap), optional cross-encoder',
                    'RELEVANCE FILTER — drop anything below the configured threshold (default 0.30); if nothing survives, the LLM is never called',
                    'GROQ LLM — answers strictly from retrieved chunks, cites by source label',
                    'ANSWER + REFERENCES — citations parsed back to real chunk metadata (title, timestamp/page, link)'
                ],
                note: 'The PDF/text path skips the Whisper/transcript stage entirely. No retrieval-accuracy, transcription-accuracy, or LLM-quality metrics are published — the one concrete, code-enforced quality gate is a 9-question evaluation suite asserting at least 90% retrieval hit-rate as a regression gate, reconfirmed passing in the full 202-test run.'
            },
            database: {
                type: 'ChromaDB (persistent vector store) + a flat library.json source index',
                tables: [
                    { name: 'transcript_chunks (ChromaDB collection)', fields: 'documents (raw text), embeddings (vector), metadatas (video_id, source_id, title, source_type, start/end or page)', purpose: 'One record per chunk, durable, queryable storage for both semantic and keyword search' }
                ],
                note: 'Flat, one-to-many: one source_id maps to many chunk records, one library.json entry, one optional notes file, one optional transcript file. No API keys, credentials, or secrets are stored in any file this application writes.'
            },
            api: [
                { method: 'GET', path: '/health', purpose: 'Liveness check, no auth' },
                { method: 'GET', path: '/api/v1/sources', purpose: 'List every processed source' },
                { method: 'POST', path: '/api/v1/sources/youtube', purpose: 'Ingest a YouTube video' },
                { method: 'POST', path: '/api/v1/sources/upload', purpose: 'Ingest an uploaded PDF/TXT/audio/video file' },
                { method: 'GET', path: '/api/v1/sources/{id}/notes', purpose: 'Read saved structured notes for a source' },
                { method: 'POST', path: '/api/v1/sources/{id}/notes/generate', purpose: 'Regenerate notes from saved chunks' },
                { method: 'POST', path: '/api/v1/chat', purpose: 'Ask a question, library-wide or scoped to one source' },
                { method: 'DELETE', path: '/api/v1/sources/{id}', purpose: 'Delete a source and all its data' }
            ],
            decisions: [
                { decision: 'FastAPI over the previous Streamlit UI', why: 'To make the app callable by any HTTP client, not just a server-rendered page, and to get auto-generated, testable API docs.' },
                { decision: 'Hybrid retrieval (vector + BM25 + RRF) instead of vector-only', why: 'Pure vector search can miss exact names/numbers/phrases that don’t embed distinctively; BM25 catches those.' },
                { decision: 'A separate relevance-score gate, distinct from the rerank score', why: 'Rank-based scores reflect position in a query’s own pool, not absolute relevance — a gate built on rank alone can’t distinguish "we found less than usual" from "what we found isn’t relevant."' },
                { decision: 'A thread pool, not a task queue, for CPU-bound ML work', why: 'Keeps the event loop free for other requests without the operational cost of a distributed task queue, which this app doesn’t need yet.' },
                { decision: 'Password header instead of a login form', why: 'A stateless API has no browser session; simple to implement and reason about, explicitly not multi-user authentication.' }
            ],
            challenges: [
                { problem: 'The originally configured Groq model stopped working', cause: 'Groq retired the model (llama-3.3-70b-versatile), which began returning 404 model_not_found.', solution: 'Switched the default model, with the reasoning documented directly in config, and left an env override in place for future retirements.', lesson: 'A hosted-LLM dependency needs to be overridable via configuration, because provider-side model lifecycles are out of the application’s control.' },
                { problem: 'A naive relevance gate couldn’t tell "weak pool" from "genuinely relevant evidence"', cause: 'RRF-based ranking scores reflect relative position among a query’s own candidates, not an absolute relevance signal.', solution: 'Introduced a second, independent relevance score per candidate, computed separately from the score used to order results, and gated on that instead.', lesson: '"The best answer we found" and "a good enough answer" are not the same question — conflating them would have undermined the system’s core "don’t guess" property.' },
                { problem: 'Making the mandated run command work without breaking ~30 modules’ imports', cause: 'Running "src.main:app" imports src as a package first, which would normally break flat imports inside it.', solution: 'A small sys.path shim in src/__init__.py, avoiding a much larger, riskier refactor across the whole codebase and test suite.', lesson: 'A one-line, well-documented compatibility shim can avoid a much larger, riskier refactor.' }
            ],
            testing: {
                summary: '202/202 tests passing, 0 failed, 0 skipped (pytest + FastAPI TestClient). Covers unit tests (chunking, embedding, ingestion, retrieval, reranking, rate limiting, URL validation), full API-level tests for every endpoint, a dedicated security test file (SSRF, path traversal, oversized upload, CORS, auth), and a 9-question RAG evaluation suite asserting ≥90% retrieval hit-rate. Live-verified in a real running instance: real ingestion, real grounded Q&A, and a correctly-rejected off-topic question.'
            },
            results: [
                '12/12 planned REST endpoints implemented and live-verified against a running instance',
                '202/202 automated tests passing',
                'End-to-end RAG flow (ingest → notes → grounded chat → correct insufficient-evidence handling) verified live with real data and a real LLM call',
                'Security controls (SSRF, path traversal, upload limits, rate limiting, safe error handling) implemented and verified',
                'Project completion assessed at 88% across 12 evidence-scored categories — primarily held back by an uncommitted migration and no live deployment yet'
            ],
            metrics: [
                { label: 'Tests Passing', value: 202, suffix: '/202' },
                { label: 'API Endpoints', value: 12, suffix: '' },
                { label: 'Retrieval Hit-Rate Gate', value: 90, suffix: '%+' },
                { label: 'RRF Fusion K', value: 60, suffix: '' }
            ],
            security: [
                'Shared-password gate via X-App-Password header, compared with a constant-time comparison',
                'API keys read from environment variables only — never logged, never returned in any response',
                'Automatic Pydantic input validation on every request body',
                'File validation — extension allowlist + bounded reads before full buffering',
                'SSRF protection — hostname allowlist parsed (not substring-matched) for YouTube URLs, verified against a spoofed URL',
                'Path-traversal protection — every source ID re-validated against a strict pattern before touching the filesystem',
                'Per-client rate limiting on ingestion and questions',
                'Prompt-injection defense — retrieved content is explicitly framed as untrusted reference material, never instructions',
                'Deny-by-default CORS — no browser origin allowed unless explicitly configured'
            ],
            media: {
                images: [],
                videos: [],
                note: 'No image, screenshot, video, or diagram files exist anywhere in this project’s repository — confirmed by a full search of the project tree. Nothing is illustrated here that isn’t backed by verified data.'
            },
            github: 'https://github.com/mubarak6969/video-note-taker',
            demo: null,
            docs: null
        }
    ];

    global.PORTFOLIO_PROJECTS = PROJECTS;
})(typeof window !== 'undefined' ? window : this);

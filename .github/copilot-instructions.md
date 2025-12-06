# Vaulteer (RedVault) - AI Agent Instructions

## Project Overview
Full-stack volunteer management system with HTS (HIV Testing Services) form processing via OCR. Built with Next.js 15 (frontend) and Node.js/Express (backend), MySQL database, Firebase Auth, AWS Textract for OCR.

## Critical Architecture Patterns

### HTS Form OCR Pipeline (Core Feature)
**OCR-First Workflow**: Images → Client Encryption → Backend Analysis → Database Storage
1. **Frontend** (`HTSFormManagement.js`): Captures form images, runs OCR via `/api/hts-forms/analyze-ocr`, encrypts data client-side with AES-256-GCM
2. **Backend** (`textractService.js`): AWS Textract FORMS+LAYOUT mode (default), maps 97 fields to DOH HTS Form 2021 template, tracks unmapped keys for ML improvement
3. **Encryption**: Images + extracted_data encrypted with same key, different IVs stored as: `front_image_encrypted`, `extracted_data_encrypted`, `extracted_data_iv`
4. **Edit Flow**: Users can map unmapped OCR keys to correct fields in `HTSFormEditModal` (10-section structure)

**Key Files**:
- `backend/services/textractService.js` - 3574 lines, `analyzeHTSFormWithForms()` is primary function
- `frontend/src/components/navigation/Form/HTSFormManagement.js` - Form capture & submission
- `frontend/src/utils/imageEncryption.js` - Client-side AES-256-GCM encryption

### API Structure
**Base URL**: `process.env.NEXT_PUBLIC_API_URL` → defaults to `https://vaulteer.kuzaken.tech/api` (prod) or `http://localhost:3001/api` (dev)
- Define once in `frontend/src/config/config.js` as `API_BASE`
- All API calls: `fetch(\`\${API_BASE}/endpoint\`, { headers: { Authorization: \`Bearer \${idToken}\` } })`
- Firebase ID token required for auth (via `getAuth().currentUser.getIdToken()`)

**Critical Routes**:
- `POST /hts-forms/analyze-ocr` - OCR analysis (before encryption)
- `POST /hts-forms/submit` - Submit encrypted form
- `GET /hts-forms/:id/image/front|back` - Fetch & decrypt images
- `POST /ocr-feedback/correction` - Track user field corrections for ML

### Monorepo Structure
```
├── backend/           # Express API (port 3001)
│   ├── services/      # textractService, imageProcessor, templateMatcher
│   ├── routes/        # Express routers
│   ├── repositories/  # Database access layer
│   └── assets/        # HTS-FORM cached data, form templates
├── frontend/          # Next.js 15 (port 3000)
│   └── src/
│       ├── components/navigation/Form/  # HTS form components
│       ├── utils/     # imageEncryption, imagePreprocessing
│       └── config/    # API_BASE, Firebase config
└── package.json       # Root workspace with concurrent dev scripts
```

**Dev Commands** (from root):
```bash
npm run dev              # Runs both backend + frontend concurrently
npm run backend:dev      # Backend only (nodemon)
npm run frontend:dev     # Frontend only (Next.js dev)
```

## Code Conventions

### Frontend (Next.js 15)
1. **ESLint Rule**: Escape quotes/apostrophes in JSX text: `don't` → `don&apos;t`, `"quote"` → `&quot;quote&quot;` (see `ESLINT_COMPLIANCE_GUIDE.md`)
2. **Dark Mode**: Use `dark:` prefix for all styles. Check `useTheme()` hook, applies class to `<html>`. Colors: `text-gray-900 dark:text-white`, `bg-white dark:bg-gray-800`
3. **Styling**: Tailwind CSS 4 with custom tokens in `styles/design-tokens.css`. Primary color: `--primary-red` (#d32f2f). Use `bg-primary-red` or `bg-[var(--primary-red)]`
4. **Components**: Use `IoIcon` from `react-icons/io5` for icons. Button component in `components/ui/Button.js`
5. **API Calls**: Always import `API_BASE` from `config/config.js`, never hardcode URLs

### Backend (Node.js/Express)
1. **OCR Modes**: Default is FORMS+LAYOUT. Set `OCR_USE_LEGACY_QUERIES=true` in `.env` to rollback to old QUERIES method
2. **Debugging**: `OCR_DEBUG=true` logs detailed extraction, `USE_CACHED_TEXTRACT=true` loads from `assets/HTS-FORM/` (no AWS calls)
3. **Database**: MySQL2 with connection pool via `db/pool.js`. Always use `asyncHandler()` wrapper for routes
4. **Encryption**: Backend decrypts with `imageDecryption.js`, uses `extractedDataEncrypted` + `extractedDataIV` columns
5. **Error Handling**: Use `errorHandler` middleware, return structured errors: `{ error: "message", details: {...} }`

### Database Schema
**Key Tables**:
- `hts_forms`: Stores encrypted images, OCR data (`extracted_data_encrypted`, `extracted_data_iv`, `encryption_key`)
- `users`: Firebase UID as primary key, roles: admin/staff/volunteer/applicant
- `ocr_field_corrections`: Tracks user corrections for ML training (originalValue, correctedValue, fieldName, confidence)
- `unmapped_keys_tracking`: Logs unmapped OCR keys with sessionId, originalKey, normalizedKey, value, confidence

**Migrations**: Run `npm run migrate` in `backend/` to apply SQL files from `migrations/`

## HTS Form Field Mapping
**10 Sections** (DOH HTS Form 2021):
- **Front (3)**: INFORMED CONSENT (2), DEMOGRAPHIC DATA (30), EDUCATION & OCCUPATION (8)
- **Back (7)**: HISTORY OF EXPOSURE (23), REASONS (2), PREVIOUS TEST (5), MEDICAL HISTORY (10), TESTING DETAILS (6), INVENTORY (3), PROVIDER DETAILS (15)

**Mapping Logic** (`textractService.js`):
1. Extract KV pairs from Textract → Normalize keys (lowercase, remove punctuation)
2. Fuzzy match against `QUERY_ALIAS_MAP` (104 fields with aliases)
3. Unmapped keys stored in `unmappedKeys` array with metadata
4. Frontend displays unmapped keys in `HTSFormEditModal` with dropdown to manually map to fields

## Testing & Debugging

### OCR Testing
```bash
# Backend cached test (no AWS)
cd backend && node test-cached-ocr.js

# Real AWS test (requires credentials)
node test-ocr-enhancements.js
```

### Frontend Testing
```bash
cd frontend && npm run lint    # ESLint check
npm run build                  # Production build
```

### Key Debugging Patterns
- **OCR Issues**: Check `backend/logs/ocr-*.json` for full extraction payloads
- **Encryption Errors**: Ensure frontend sends `frontImageIV`, `backImageIV`, `extractedDataIV` (all required)
- **Dark Mode**: Inspect `<html class="dark">` in browser, use Chrome DevTools to toggle dark class
- **API Errors**: Check Network tab for 401 (token expired), 400 (validation), 500 (server error)

## Common Pitfalls
1. **Forgetting to escape JSX text**: `"` and `'` must be `&quot;` and `&apos;` in text nodes (not attributes)
2. **Hardcoding API URLs**: Always use `API_BASE` from config
3. **Missing Firebase token**: All protected routes need `Authorization: Bearer ${idToken}` header
4. **OCR mode confusion**: FORMS+LAYOUT is default, check `.env` if extraction seems wrong
5. **Encryption flow**: OCR must happen BEFORE encryption, not after (frontend encrypts post-OCR)

## External Dependencies
- **AWS Textract**: Requires `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` in backend `.env`
- **Firebase**: Both frontend + backend need Firebase config (frontend: `NEXT_PUBLIC_FIREBASE_*`, backend: `FIREBASE_SERVICE_ACCOUNT_JSON`)
- **MySQL**: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` in backend `.env`

## Key Documentation Files
- `ENCRYPTION_IMPLEMENTATION.md` - Full encryption architecture
- `OCR_MIGRATION_QUICK_START.md` - OCR mode switching guide
- `ESLINT_COMPLIANCE_GUIDE.md` - ESLint rules for AI agents
- `frontend/BAGANI_LANDING_PAGE_README.md` - Landing page features
- `backend/docs/FORMS_LAYOUT_COMBINATION.md` - OCR technical details

---
**Last Updated**: December 6, 2025 | **Project**: Vaulteer (Bagani Community Development Center)

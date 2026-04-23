# End-to-End Test Steps (Manual)

This guide tests the full auth flow of the current provider implementation.

## 0) Prerequisites

1. Start Postgres:
   - `pnpm docker:up`
2. Run DB migrations:
   - `pnpm db:migrate`
3. Start API server:
   - `pnpm dev`
4. Start React landing app (separate terminal):
   - `cd apps/todo-client`
   - `pnpm dev`

Expected:
- API at `http://localhost:3000`
- Client app at `http://localhost:5173`

---

## 1) Smoke Test: Landing Page

1. Open `http://localhost:5173`.
2. Verify page loads with:
   - Title `Todo App`
   - Buttons `Get Started` and `Learn More`
   - "How it works" section

Expected: page renders without errors.

---

## 2) Create a Test User

Run:

```bash
curl -X POST "http://localhost:3000/o/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test.user@example.com",
    "password": "pass1234"
  }'
```

Expected:
- Success response with created user id.
- If rerun, you may get "Email already in use" (also valid).

---

## 3) Register OAuth Client

Run:

```bash
curl -X POST "http://localhost:3000/o/clients" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Todo Client",
    "url": "http://localhost:5173",
    "redirectUri": "http://localhost:5173/callback"
  }'
```

Save values from response:
- `CLIENT_ID`
- `CLIENT_SECRET`

Optional convenience for callback testing:
- On first callback visit, paste `CLIENT_SECRET` and click `Save client secret for next time`.
- The app stores it in browser localStorage and auto-fills on later runs.

---

## 4) Get Authorization Code (Browser)

Open this URL in browser (replace `CLIENT_ID`):

```text
http://localhost:3000/o/authenticate?client_id=CLIENT_ID&redirect_uri=http://localhost:5173/callback&state=abc123
```

1. Log in with the test user credentials.
2. After success, browser redirects to:
   - `http://localhost:5173/callback?code=...&state=abc123`

Copy the `code` query parameter as `AUTH_CODE`.

---

## 5) Exchange Code + Verify User (Callback UI)

After redirect to `http://localhost:5173/callback?...`:

1. If `Client Secret` is empty, paste `CLIENT_SECRET`.
2. Click `Save client secret for next time` (optional).
3. Click `Exchange code and verify user`.

Expected:
- `Access token received: ...`
- `Signed in as ...`

---

## 6) API Verification via curl (Optional but Recommended)

Run (replace placeholders):

```bash
curl -X POST "http://localhost:3000/o/tokeninfo" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "AUTH_CODE",
    "client_secret": "CLIENT_SECRET"
  }'
```

Save:
- `ACCESS_TOKEN`

Expected:
- Returns `access_token`, `token_type: "Bearer"`, and `expires_in`.

---

## 6) Call UserInfo with Access Token
## 7) Call UserInfo with Access Token

Run:

```bash
curl -X GET "http://localhost:3000/o/userinfo" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

Expected:
- Response includes:
  - `sub`
  - `email`
  - `email_verified`
  - `given_name`
  - `family_name`
  - `name`
  - `picture` (if available)

---

## 8) Negative Checks (Important)

1. Invalid token:
   - Call `/o/userinfo` with random token.
   - Expected: unauthorized.

2. Reuse same authorization code:
   - Call `/o/tokeninfo` again with the same `AUTH_CODE`.
   - Expected: unauthorized/invalid (code should be one-time use).

3. Wrong client secret:
   - Call `/o/tokeninfo` with valid code but wrong secret.
   - Expected: unauthorized.

---

## 9) Shutdown

- Stop client dev server
- Stop API server
- Stop Postgres:
  - `pnpm docker:down`


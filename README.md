# OIDC Auth Provider

A simple OpenID Connect (OIDC) authentication provider built with Node.js, Express, and PostgreSQL.

OIDC builds on OAuth 2.0, adding identity layer features like standardized user profile information and authentication flows.

## How The Flow Works (Current Implementation)

1. Register a client using `POST /o/clients` and save `client_id` and `client_secret`.
2. Open `GET /o/authenticate?client_id=...&redirect_uri=...&state=...`.
3. User signs in on the provider page; server validates credentials and creates a short-lived authorization code.
4. Provider redirects browser to `redirect_uri?code=...&state=...`.
5. Client exchanges code with `POST /o/tokeninfo` using `{ code, client_secret }`.
6. Provider returns JWT `access_token` (Bearer).
7. Client calls `GET /o/userinfo` with `Authorization: Bearer <access_token>` to fetch user profile claims.

Why 2 steps after sign-in:
- sign-in page only proves user identity and gives an authorization code.
- token exchange proves client identity and returns token for protected APIs.

## OIDC Flow

This provider implements a basic OIDC Authorization Code Flow with the following endpoints:

### 1. Discovery Endpoint

- **GET** `/.well-known/openid-configuration`
- Returns OIDC configuration including endpoints and supported features

### 2. Authorization Endpoint

- **GET** `/o/authorize`
- Serves the login/authentication page
- Users can sign in or navigate to sign up

### 3. User Registration

- **GET** `/o/signup` - Serves signup page
- **POST** `/o/signup` - Handles user registration
- Creates new user accounts with email/password

### 4. Authentication

- **POST** `/o/authorize` - Handles user login and authorization code generation
- Validates credentials and returns JWT access token

### 5. Token Endpoint

- **POST** `/o/token`
- Exchanges authorization code for access/refresh tokens
- Standard OAuth 2.0 token endpoint

### 6. UserInfo Endpoint

- **GET** `/o/userinfo`
- Requires Bearer token authentication
- Returns user profile information (sub, email, name, etc.)

### 7. JWKS Endpoint

- **GET** `/.well-known/jwks.json`
- Returns JSON Web Key Set for token verification

## OAuth 2.0 Authorization Code Flow

```
1. Client Registration
   POST /o/clients
   → Returns client_id and client_secret

2. Authorization Request
   GET /o/authorize?client_id=xxx&redirect_uri=yyy&response_type=code&scope=openid
   → User logs in
   → Server redirects to redirect_uri with authorization code

3. Token Exchange
   POST /o/token
   Body: {
     "grant_type": "authorization_code",
     "code": "auth_code_from_step_2",
     "client_secret": "client_secret",
     "redirect_uri": "redirect_uri"
   }
   → Returns access_token and refresh_token

4. Access Protected Resources
   GET /o/userinfo
   Headers: Authorization: Bearer <access_token>
   → Returns user profile data
```

## Current Implementation Status

✅ **Implemented:**

- User registration and login
- JWT token generation and validation
- UserInfo endpoint
- JWKS endpoint for public keys
- Client registration and management
- Basic HTML authentication pages
- **Token Endpoint** (`POST /o/token`) - OAuth 2.0 endpoint that exchanges authorization codes for access/refresh tokens
- Authorization Code Flow (code exchange)
- Refresh tokens

❌ **Not Yet Implemented:**

- Consent flow
- PKCE support

## Database Schema

Uses PostgreSQL with Drizzle ORM:

- **Users table**: Email, password (hashed with SHA-512 + salt), profile info
- **Clients table**: OAuth client applications with credentials and redirect URIs
- **Tokens table**: Refresh tokens with user/client associations

## Getting Started

1. Install dependencies: `pnpm install`
2. Set up database: `pnpm run db:migrate`
3. Start development server: `pnpm run dev`
4. Access at `http://localhost:3000`

## API Endpoints

### Authentication Pages

- `GET /o/authorize` - Login page
- `GET /o/signup` - Registration page

### OIDC Endpoints

- `GET /.well-known/openid-configuration` - Discovery
- `POST /o/authorize` - Authenticate user and generate authorization code
- `POST /o/signup` - Register user
- `POST /o/token` - Exchange authorization code for tokens
- `GET /o/userinfo` - Get user profile
- `GET /.well-known/jwks.json` - JWKS
- `POST /o/clients` - Register OAuth client
- `GET /o/client-info` - Get client information

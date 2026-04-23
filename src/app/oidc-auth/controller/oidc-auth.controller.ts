import path from "node:path";
import type { Request, Response } from "express";
import { db } from "../../../db/index.js";
import { usersTable, clientsTable, tokensTable } from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import ApiError from "../../../common/api-error.js";
import ApiResponse from "../../../common/api-response.js";
import { PUBLIC_KEY } from "../../../common/certs.js";
import {
  buildAccessTokenClaims,
  signAccessToken,
  verifyAccessToken,
  type JWTClaims,
} from "../../../common/jwt-utils.js";
import * as jose from "node-jose";

const PORT = process.env.PORT || 3000;
export class OidcAuthController {
  public async authorize(req: Request, res: Response) {
    return res.sendFile(path.resolve("public", "authenticate.html"));
  }

  public async handleAuthenticateRequest(req: Request, res: Response) {
    if (req.method === "GET") {
      // Serve the authentication page
      return res.sendFile(path.resolve("public", "authenticate.html"));
    }

    // Handle POST - user authentication
    const { client_id, redirect_uri, state } = req.query;
    const { email, password } = req.body;

    if (!client_id || typeof client_id !== "string") {
      throw ApiError.badRequest("Missing or invalid client_id");
    }

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.clientId, client_id))
      .limit(1);

    if (!client) {
      throw ApiError.badRequest("Invalid client_id");
    }

    const targetRedirectUri =
      typeof redirect_uri === "string" ? redirect_uri : client.redirectUri;

    if (!targetRedirectUri) {
      throw ApiError.badRequest("Missing redirect_uri");
    }

    if (targetRedirectUri !== client.redirectUri) {
      throw ApiError.badRequest(
        "redirect_uri does not match registered client",
      );
    }

    if (!email || !password) {
      throw ApiError.unauthorized("Email and Password are required");
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    const hashedPassword = crypto
      .createHash("sha512")
      .update(password + user.salt)
      .digest("hex");

    if (hashedPassword !== user.password) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    const shortCode = crypto.randomBytes(10).toString("hex");
    const shortCodeExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await db
      .update(clientsTable)
      .set({ shortCode, shortCodeExpiresAt, authorizedUserId: user.id })
      .where(eq(clientsTable.clientId, client_id));

    const redirectUrl = new URL(targetRedirectUri);
    redirectUrl.searchParams.set("code", shortCode);
    if (typeof state === "string") {
      redirectUrl.searchParams.set("state", state);
    }

    return res.redirect(redirectUrl.toString());
  }

  public async serveSignupPage(req: Request, res: Response) {
    return res.sendFile(path.resolve("public", "signup.html"));
  }

  public async getWellKnownConfig(req: Request, res: Response) {
    const issuer = `https://localhost:${PORT}`;
    const response = {
      issuer,
      authorization_endpoint: `${issuer}/o/authorize`,
      token_endpoint: `${issuer}/o/token`,
      userinfo_endpoint: `${issuer}/o/userinfo`,
      jwks_uri: `${issuer}/.well-known/jwks.json`,
    };
    return res.json(response);
  }

  public async handleSingup(req: Request, res: Response) {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "FirstName, LastName, Email and Password are required",
      });
    }

    const [existingUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existingUser) {
      return ApiError.conflict("Email already in use");
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hashedPassword = crypto
      .createHash("sha512")
      .update(password + salt)
      .digest("hex");

    const [newUser] = await db
      .insert(usersTable)
      .values({
        firstName,
        lastName,
        email,
        salt: salt,
        password: hashedPassword,
      })
      .returning({ id: usersTable.id });

    if (!newUser) {
      return ApiError.internalServerError("Failed to create user");
    }

    return ApiResponse.created(
      res,
      { userId: newUser.id },
      "User created successfully",
    );
  }

  public async serveClientRegistrationPage(req: Request, res: Response) {
    return res.sendFile(path.resolve("public", "register-client.html"));
  }

  public async getClientInfo(req: Request, res: Response) {
    const { client_id } = req.query;

    if (!client_id || typeof client_id !== "string") {
      return ApiError.badRequest("Missing or invalid client_id");
    }

    const [client] = await db
      .select({
        name: clientsTable.name,
        url: clientsTable.url,
      })
      .from(clientsTable)
      .where(eq(clientsTable.clientId, client_id))
      .limit(1);

    if (!client) {
      return ApiError.notFound("Client not found");
    }

    return ApiResponse.ok(res, client, "Client info retrieved successfully");
  }

  public async registerClient(req: Request, res: Response) {
    const { name, url, redirectUri } = req.body;

    if (!name || !url || !redirectUri) {
      return ApiError.badRequest("Name, URL and Redirect URI are required");
    }

    // Generate client credentials
    const clientId = crypto.randomBytes(16).toString("hex");
    const clientSecret = crypto.randomBytes(32).toString("hex");

    const [newClient] = await db
      .insert(clientsTable)
      .values({
        clientId,
        clientSecret,
        name,
        url,
        redirectUri,
      })
      .returning({
        id: clientsTable.id,
        clientId: clientsTable.clientId,
        clientSecret: clientsTable.clientSecret,
        name: clientsTable.name,
        url: clientsTable.url,
        redirectUri: clientsTable.redirectUri,
      });

    if (!newClient) {
      return res.status(500).json({
        success: false,
        message: "Failed to register client",
      });
    }

    return ApiResponse.created(
      res,
      newClient,
      "Client registered successfully",
    );
  }

  public async handleSignin(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return ApiError.unauthorized("Email and Password are required");
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user) {
      return ApiError.unauthorized("Invalid email or password");
    }

    const hashedPassword = crypto
      .createHash("sha512")
      .update(password + user.salt)
      .digest("hex");
    if (hashedPassword !== user.password) {
      return ApiError.unauthorized("Invalid email or password");
    }

    const claims = buildAccessTokenClaims(user);
    const token = signAccessToken(claims);

    return ApiResponse.ok(res, { token }, "Authentication successful");
  }

  public async getJwkInfo(req: Request, res: Response) {
    const key = await jose.JWK.asKey(PUBLIC_KEY, "pem");
    return res.json({ keys: [key.toJSON()] });
  }

  public async userInfo(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return ApiError.unauthorized("Missing or invalid Authorization header");
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    let claims: JWTClaims;
    try {
      claims = verifyAccessToken(token);
    } catch (err) {
      return ApiError.unauthorized("Invalid or expired token");
    }

    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, claims.sub))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user) {
      return ApiError.unauthorized("User not found");
    }

    const userInfo = {
      sub: claims.sub,
      email: claims.email,
      email_verified: claims.email_verified,
      given_name: claims.given_name,
      family_name: claims.family_name,
      name: claims.name,
      picture: claims.picture,
    };

    return ApiResponse.ok(res, userInfo, "User info retrieved successfully");
  }

  public async handleTokenInfoRequest(req: Request, res: Response) {
    const { code, client_secret } = req.body;

    if (!code || !client_secret) {
      return ApiError.badRequest(
        "Code, client_id and client_secret are required",
      );
    }

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.clientSecret, client_secret))
      .limit(1);

    if (!client || !client.authorizedUserId) {
      return ApiError.unauthorized(
        "Invalid client_secret or authorized user not found",
      );
    }

    if (client.shortCode !== code) {
      return ApiError.unauthorized("Invalid code");
    }

    if (client.shortCodeExpiresAt && client.shortCodeExpiresAt < new Date()) {
      return ApiError.unauthorized("Code expired");
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, client.authorizedUserId))
      .limit(1);

    if (!user) {
      return ApiError.unauthorized("Authorized user not found");
    }

    const refreshToken = crypto.randomBytes(32).toString("hex");
    const refreshTokenExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ); // 30 days

    const accessToken = signAccessToken(buildAccessTokenClaims(user));

    await db.insert(tokensTable).values({
      refreshToken,
      refreshTokenExpiresAt,
      clientId: client.id,
      userId: client.authorizedUserId,
    });

    await db
      .update(clientsTable)
      .set({
        shortCode: null,
        shortCodeExpiresAt: null,
        authorizedUserId: null,
      })
      .where(eq(clientsTable.id, client.id));

    return ApiResponse.ok(
      res,
      {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
      },
      "Token created successfully",
    );
  }
}

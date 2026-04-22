import path from "node:path";
import type { Request, Response } from "express";
import { db } from "../../../db/index.js";
import { usersTable } from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import ApiError from "../../../common/api-error.js";
import ApiResponse from "../../../common/api-response.js";
import jwt from "jsonwebtoken";
import { PRIVATE_KEY, PUBLIC_KEY } from "../../../common/certs.js";
import * as jose from "node-jose";

export interface JWTClaims {
  iss: string;
  sub: string;
  email: string;
  email_verified: boolean;
  exp: number;
  family_name?: string | undefined;
  given_name: string | undefined;
  name: string | undefined;
  picture?: string | undefined;
}

const PORT = process.env.PORT || 3000;
export class OidcAuthController {
  public async authorize(req: Request, res: Response) {
    return res.sendFile(path.resolve("public", "authenticate.html"));
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
      jwks_uri: `${issuer}/o/jwks`,
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

  public async handleSingin(req: Request, res: Response) {
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

    const ISSUER = `https://localhost:${PORT}`;

    const now = Math.floor(Date.now() / 1000);

    const claims: JWTClaims = {
      iss: ISSUER,
      sub: user.id,
      email: user.email,
      email_verified: user.emailVerified,
      exp: now + 3600, // 1 hour expiration
      given_name: user.firstName ?? undefined,
      family_name: user.lastName ?? undefined,
      name:
        [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
      picture: user.profileImageURL ?? undefined,
    };

    const token = jwt.sign(claims, PRIVATE_KEY, { algorithm: "HS256" });

    return ApiResponse.ok(res, { token }, "Authentication successful");
  }

  public async handleTokenRequest(req: Request, res: Response) {
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
      claims = jwt.verify(token, PUBLIC_KEY, {
        algorithms: ["HS256"],
      }) as JWTClaims;
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
}

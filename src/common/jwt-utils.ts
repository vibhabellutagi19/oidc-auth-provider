import jwt from "jsonwebtoken";
import { PRIVATE_KEY, PUBLIC_KEY } from "./certs.js";

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

interface UserLike {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  profileImageURL: string | null;
}

function getIssuer() {
  const port = process.env.PORT || process.env.WEB_PORT || 3000;
  return `https://localhost:${port}`;
}

export function buildAccessTokenClaims(user: UserLike): JWTClaims {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: getIssuer(),
    sub: user.id,
    email: user.email,
    email_verified: user.emailVerified,
    exp: now + 3600,
    given_name: user.firstName ?? undefined,
    family_name: user.lastName ?? undefined,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
    picture: user.profileImageURL ?? undefined,
  };
}

export function signAccessToken(claims: JWTClaims) {
  return jwt.sign(claims, PRIVATE_KEY, { algorithm: "RS256" });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, PUBLIC_KEY, { algorithms: ["RS256"] }) as JWTClaims;
}

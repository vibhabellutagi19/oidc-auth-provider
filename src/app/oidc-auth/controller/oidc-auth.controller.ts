import path from "node:path";

const PORT = process.env.PORT || 3000;
export class OidcAuthController {
  public async authorize(req: any, res: any) {
    return res.sendFile(path.resolve("public", "authenticate.html"));
  }

  public async wellKnown(req: any, res: any) {
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
}

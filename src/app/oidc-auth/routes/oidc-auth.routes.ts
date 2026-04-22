import { Router } from "express";
import path from "node:path";
import { OidcAuthController } from "../controller/oidc-auth.controller.js";
import ApiResponse from "../../../common/api-response.js";

export const oidcAuthRouter: Router = Router();
const authController = new OidcAuthController();

oidcAuthRouter.get(
  "/.well-known/openid-configuration",
  authController.getWellKnownConfig,
);

//1. Authorization Endpoint

oidcAuthRouter.get("/authorize", (req, res) => {
  return authController.authorize(req, res);
});

oidcAuthRouter.post("/authorize", authController.handleAuthorizationRequest);
//2. sign-in page
oidcAuthRouter.post("/signin", authController.handleSignin);

//3. sign-up page
oidcAuthRouter.get("/signup", authController.serveSignupPage);
oidcAuthRouter.post("/signup", authController.handleSingup);

//4. Client Registration
oidcAuthRouter.get(
  "/register-client",
  authController.serveClientRegistrationPage,
);
oidcAuthRouter.post("/clients", authController.registerClient);

//5. Client Info
oidcAuthRouter.get("/client-info", authController.getClientInfo);

//6. UserInfo Endpoint - requires authentication
oidcAuthRouter.get("/userinfo", authController.userInfo);

//6. JWKS Endpoint
oidcAuthRouter.get("/.well-known/jwks.json", authController.getJwkInfo);

// 7. Token Endpoint
oidcAuthRouter.post("/token", authController.handleTokenInfoRequest);

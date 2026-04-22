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

oidcAuthRouter.get("/authenticate", (req, res) => {
  return authController.authorize(req, res);
});
//2. sign-in page
oidcAuthRouter.post("/signin", authController.handleSingin);

//3. sign-up page
oidcAuthRouter.get("/signup", authController.serveSignupPage);
oidcAuthRouter.post("/signup", authController.handleSingup);

//4. Token Endpoint
oidcAuthRouter.post("/token", authController.handleTokenRequest);
//5. UserInfo Endpoint

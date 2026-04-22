import { Router } from "express";
import path from "node:path";

export const oidcAuthRouter: Router = Router();

//1. Authorization Endpoint

oidcAuthRouter.get("/o/authenticate", (req, res) => {
  return res.sendFile(path.resolve("public", "authenticate.html"));
});
//2. sign-in page

//3. sign-up page

//4. Token Endpoint

//5. UserInfo Endpoint

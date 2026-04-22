import express, { Express, Request, Response } from "express";
import ApiResponse from "../common/app-response";
import { oidcAuthRouter } from "./oidc-auth/routes/oidc-auth.routes";
import path from "node:path";

export function createExpressApplication(): Express {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", async (_req: Request, res: Response) => {
    ApiResponse.ok(res, null, "oidc-auth provider is up and healthy");
  });

  app.use("/o", oidcAuthRouter);
  app.use(express.static(path.resolve("public")));
  return app;
}

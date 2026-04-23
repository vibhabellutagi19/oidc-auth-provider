import express, { Express, Request, Response, NextFunction } from "express";
import ApiResponse from "../common/api-response.js";
import ApiError from "../common/api-error.js";
import { oidcAuthRouter } from "./oidc-auth/routes/oidc-auth.routes.js";
import path from "node:path";

export function createExpressApplication(): Express {
  const app = express();

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    return next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", async (_req: Request, res: Response) => {
    ApiResponse.ok(res, null, "oidc-auth provider is up and healthy");
  });

  app.use("/o", oidcAuthRouter);
  app.use(express.static(path.resolve("public")));

  // Error handling middleware
  app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: error.error,
      });
    }

    // Handle other errors
    console.error("Unhandled error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: "InternalServerError",
    });
  });

  return app;
}

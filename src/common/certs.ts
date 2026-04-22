import { readFileSync } from "fs";
import path from "node:path";

export const PRIVATE_KEY = readFileSync(path.resolve("cert/private-key.pem"));
export const PUBLIC_KEY = readFileSync(path.resolve("cert/public-key.pub"));

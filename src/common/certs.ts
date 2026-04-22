import { readFileSync } from "fs";
import path from "node:path";

export const PRIVATE_KEY = readFileSync(path.resolve("certs/private.key"));
export const PUBLIC_KEY = readFileSync(path.resolve("certs/public.key"));

import "dotenv/config";
import { createServer } from "node:http";
import { createExpressApplication } from "./app/index.js";

const app = createExpressApplication();
const server = createServer(app);

const port = Number(process.env.WEB_PORT ?? 3000);
server.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
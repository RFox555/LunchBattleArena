process.env.NODE_ENV = 'production';

import express from "express";
import path from 'path';
import { fileURLToPath } from 'url';
import { registerRoutes } from "./server/routes.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      console.log(`[express] ${logLine}`);
    }
  });

  next();
});

app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error(`[express] Error ${status}: ${message}`);
  res.status(status).json({ message });
});

const server = await registerRoutes(app);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/attached_assets', express.static(path.join(__dirname, 'attached_assets')));

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Transportation Tracking System running on port ${PORT}`);
});
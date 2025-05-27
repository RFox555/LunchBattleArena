// Simple production server that mirrors the development setup exactly
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerRoutes } from './routes.js';
import { storage } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware - exact same as development
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/attached_assets', express.static(path.join(__dirname, '..', 'attached_assets')));

// Initialize database
await storage.setupDatabase();

// Register all routes - exact same as development
const server = await registerRoutes(app);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Transportation Tracking System running on port ${PORT}`);
});
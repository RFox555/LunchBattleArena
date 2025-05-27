// Production server that exactly matches development setup
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerRoutes } from './server/routes.js';
import { storage } from './server/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Exact middleware setup as development
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files exactly like development
app.use(express.static(path.join(__dirname, 'public')));
app.use('/attached_assets', express.static(path.join(__dirname, 'attached_assets')));

// Initialize database
console.log('Setting up database...');
await storage.setupDatabase();
console.log('Database setup complete');

// Register all routes exactly like development
const server = await registerRoutes(app);

// Start server on the same port as development
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Transportation Tracking System running on port ${PORT}`);
});
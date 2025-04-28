import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure neon database to use websockets
neonConfig.webSocketConstructor = ws;

// Check database URL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Set up database connection pool
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Add connection retries
  max: 10, // maximum number of clients
  idleTimeoutMillis: 30000 // how long a client is allowed to remain idle before being closed
});

// Log test query for connection validation
pool.query('SELECT NOW()')
  .then(res => console.log('Database connected:', res.rows[0]))
  .catch(err => console.error('Database connection error:', err));

// Create drizzle ORM instance with our schema
export const db = drizzle({ client: pool, schema });

// Export a function to close the pool when shutting down
export function closePool() {
  return pool.end();
}
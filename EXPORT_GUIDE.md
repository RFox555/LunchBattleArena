# Export Guide for Transportation Tracking System

## Files to Export

### Core Server Files
- `server/routes.ts` - All API endpoints
- `server/index.ts` - Main server setup
- `server/db.ts` - Database connection
- `server/storage.ts` - Storage implementation
- `server/vite.ts` - Static file serving

### Shared Schema
- `shared/schema.ts` - Database schema and validation

### Public Files
- `public/*.html` - All HTML pages
- `public/js/*.js` - All JavaScript files
- `public/images/*` - All image assets

### Configuration Files
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite configuration
- `tailwind.config.ts` - Tailwind configuration
- `drizzle.config.ts` - Drizzle ORM configuration
- `postcss.config.js` - PostCSS configuration

## Database Setup
A PostgreSQL database is required. The connection string should be saved as `DATABASE_URL` environment variable. The current database is hosted on Neon with the following details:
- Host: ep-holy-tree-a6kvia0q.us-west-2.aws.neon.tech
- Port: 5432
- Database: neondb
- Username: neondb_owner

## Installing Dependencies
Run `npm install` to install all dependencies.

## Starting the Application
Run `npm run dev` to start the development server.

## Deployment
The application can be deployed using any Node.js hosting service. The main entry point is `server/index.ts`.

## QR Scanner Issue
The QR scanner issue is documented in `QR_SCANNER_ISSUE.md`. This should be addressed as a priority when continuing development.
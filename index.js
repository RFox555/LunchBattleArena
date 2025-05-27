// Production server - exact copy of dev environment
process.env.NODE_ENV = 'development';

import('./server/index.ts');
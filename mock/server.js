// Need to use dynamic import for json-server since it's a CommonJS module
// and we're in an ES module environment
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const jsonServer = require('json-server');

/**
 * MAIN CONFIGURATION
 * ================= 
 */

// Delay for all requests
const DELAY = 500;   // 0.5 second delay
const dataDir = 'data'

// Route paths
const routes = {
    login: '/nikola-auth/tokens/login',
    distributors: '/api-private/api/get-distributors-with-supplies-v2',
    supplies: '/api-private/api/get-supplies-v2',
    contract: '/api-private/api/get-contract-detail-v2',
    consumption: '/api-private/api/get-consumption-data-v2'
};

// Route status codes. Use status code: 200 (success), 401, 404, 429...
const routeConfig = {
  [routes.login]: 200,
  [routes.distributors]: 200,
  [routes.supplies]: 200,
  [routes.contract]: 200,
  [routes.consumption]: 429
};

// Error messages for each status code
const responseMessages = {
    200: { message: 'Success' },
    401: { error: 'Unauthorized', status: 401 },
    404: { error: 'Resource not found', status: 404 },
    429: { error: 'Too Many Requests', status: 429 }
};

/**
 * Server Configuration
 * ===================
 * 
 * Get file paths for ES modules
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create server
const server = jsonServer.create();
const middlewares = jsonServer.defaults();

// Add middlewares
server.use(middlewares);
server.use(jsonServer.bodyParser);

// Add delay to all requests
server.use((req, res, next) => {
  setTimeout(next, DELAY);
});

// Custom route handlers
Object.entries(routes).forEach(([routeName, route]) => {
  // Handle login with POST (more appropriate for authentication)
  if (route === routes.login) {
    server.post(route, handleLoginResponse);
  } else {
    // Handle all other routes with GET
    server.get(route, handleRouteResponse);
  }
  
  function handleLoginResponse(req, res) {
    // Check route configuration for status code
    const statusCode = routeConfig[route];
    
    // Handle specific error responses
    if (statusCode !== 200) {
      // Return configured error response for any non-200 status code
      return res.status(statusCode).json(responseMessages[statusCode]);
    }

    // For login, read the JSON file but return only the token as plain text
    const jsonFilePath = path.join(__dirname, dataDir, route + '.json');
    
    try {
      if (fs.existsSync(jsonFilePath)) {
        const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
        // Set content type to text/plain to match the real API
        res.setHeader('Content-Type', 'text/plain');
        // Return only the token value as plain text, not the whole JSON object
        return res.send(data.token);
      } else {
        console.error(`JSON file not found: ${jsonFilePath}`);
        return res.status(500).json({ error: 'Internal server error - JSON file not found' });
      }
    } catch (error) {
      console.error(`Error reading JSON file for route ${route}:`, error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  function handleRouteResponse(req, res) {
    // Check route configuration for status code
    const statusCode = routeConfig[route];
    
    // Handle specific error responses
    if (statusCode !== 200) {
      // Return configured error response for any non-200 status code
      return res.status(statusCode).json(responseMessages[statusCode]);
    }

    // Default case: Handle success response (status 200)
    // Try to read the corresponding JSON file
    const jsonFilePath = path.join(__dirname, dataDir, route + '.json');
    
    try {
      if (fs.existsSync(jsonFilePath)) {
        const data = fs.readFileSync(jsonFilePath, 'utf8');
        return res.json(JSON.parse(data));
      } else {
        console.error(`JSON file not found: ${jsonFilePath}`);
        return res.status(500).json({ error: 'Internal server error - JSON file not found' });
      }
    } catch (error) {
      console.error(`Error reading JSON file for route ${route}:`, error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * Helper Functions
 * ===============
 */

/**
 * Set response status for a specific route
 * @param {string} route - The route to configure
 * @param {number} statusCode - The HTTP status code (200, 404, or 429)
 */
function setRouteStatus(route, statusCode) {
  if (!Object.values(routes).includes(route)) {
    console.error(`Route ${route} not found in configured routes`);
    return;
  }
  
  if (![200, 404, 429].includes(statusCode)) {
    console.error(`Invalid status code: ${statusCode}. Must be 200, 404, or 429`);
    return;
  }
  
  routeConfig[route] = statusCode;
  console.log(`Set status ${statusCode} for route: ${route}`);
}

/**
 * Reset all routes to return normal responses (200)
 */
function resetAllRoutes() {
  Object.values(routes).forEach(route => {
    routeConfig[route] = 200;
  });
  console.log('Reset all routes to status 200');
}

// Start server
const PORT = process.env.PORT || 8088;
server.listen(PORT, () => {
  console.log(`JSON Server is running on port ${PORT}`);
  console.log(`Serving these routes:`);
  Object.entries(routes).forEach(([name, route]) => {
    console.log(`- ${name}: ${route} (${routeConfig[route]})`);
  });
  console.log('\nTo change status code for a route, use:');
  console.log('setRouteStatus(routes.ROUTE_NAME, statusCode)');
  console.log(`Example: setRouteStatus(routes.supplies, 429)`);
  console.log('\nTo reset all routes to status 200:');
  console.log('resetAllRoutes()');
});

// Export helper functions and routes for external use
export {
  setRouteStatus,
  resetAllRoutes,
  routes,
  server
};



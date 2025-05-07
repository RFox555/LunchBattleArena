/**
 * Ensures the current page URL includes the .html extension
 * This script should be included at the TOP of all HTML files before any other script
 */
(function() {
  // Skip if we're on an API endpoint or already have .html in the URL
  if (window.location.pathname.startsWith('/api') || 
      window.location.pathname.endsWith('.html') ||
      window.location.pathname === '/') {
    return;
  }
  
  // List of known HTML pages
  const htmlPages = [
    '/login',
    '/register',
    '/driver-checkin',
    '/employee-dashboard',
    '/driver-ratings',
    '/bus-tracking',
    '/rate-bus'
  ];
  
  // If we're on a known HTML page without the .html extension, add it
  if (htmlPages.includes(window.location.pathname)) {
    console.log('Redirecting to add .html extension to URL:', window.location.pathname);
    
    // The preferred method - completely replaces the history entry
    window.location.replace(window.location.pathname + '.html' + window.location.search);
  }
})();
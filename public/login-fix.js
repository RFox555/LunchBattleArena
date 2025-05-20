// Enhanced login handling for improved reliability
function fixLogin(username, password, userType) {
  // Clear any existing messages
  const errorMessage = document.getElementById('error-message');
  const successMessage = document.getElementById('success-message');
  
  if (errorMessage) errorMessage.style.display = 'none';
  if (successMessage) successMessage.style.display = 'none';
  
  // Show login is processing
  if (successMessage) {
    successMessage.textContent = 'Processing login...';
    successMessage.style.display = 'block';
  }
  
  fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: username,
      password: password,
      userType: userType
    }),
    credentials: 'include'
  })
  .then(response => {
    if (response.ok) {
      return response.json();
    } else {
      return response.json().then(errorData => {
        throw new Error(errorData.message || 'Invalid username or password');
      });
    }
  })
  .then(user => {
    console.log('Login successful:', user);
    
    // Store authentication state
    document.cookie = "authenticated=true; path=/";
    
    // Set proper authentication in session storage
    if (userType === 'driver') {
      // This helps prevent redirect loops with driver pages
      sessionStorage.setItem('driverAuthenticated', 'true');
      // Store driver ID for quick access
      if (user && user.id) {
        sessionStorage.setItem('driverId', user.id.toString());
      }
    }
    
    // Show success message
    if (successMessage) {
      successMessage.textContent = 'Login successful! Redirecting...';
      successMessage.style.display = 'block';
    }
    
    // Determine the appropriate redirect URL based on user type
    let targetUrl;
    if (userType === 'driver') {
      targetUrl = '/driver-checkin.html';
    } else if (userType === 'admin') {
      targetUrl = '/admin-dashboard.html';
    } else {
      targetUrl = '/employee-dashboard.html';
    }
    
    console.log('Redirecting to:', targetUrl);
    
    // Redirect with a small delay to allow the user to see the success message
    setTimeout(() => {
      window.location.replace(targetUrl + '?t=' + new Date().getTime());
    }, 800);
  })
  .catch(err => {
    console.error('Login error:', err);
    
    // Hide success message if visible
    if (successMessage) {
      successMessage.style.display = 'none';
    }
    
    // Show error message
    if (errorMessage) {
      errorMessage.textContent = err.message || 'Login failed. Please check your credentials.';
      errorMessage.style.display = 'block';
    } else {
      alert('Login failed: ' + (err.message || 'Please check your credentials.'));
    }
  });
}
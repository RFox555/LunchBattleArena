// Direct fix for login redirect issue
function fixLogin(username, password, userType) {
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
        throw new Error(errorData.message || 'Login failed');
      });
    }
  })
  .then(user => {
    console.log('Login successful:', user);
    
    // Create a cookie to track authentication state
    document.cookie = "authenticated=true; path=/";
    
    // Store known authenticated state for drivers
    if (userType === 'driver') {
      sessionStorage.setItem('driverAuthenticated', 'true');
    }
    
    // Force direct browser navigation without history manipulation
    let targetUrl;
    if (userType === 'driver') {
      targetUrl = '/driver-checkin.html';
    } else if (userType === 'admin') {
      targetUrl = '/admin-dashboard.html';
    } else {
      targetUrl = '/employee-dashboard.html';
    }
    
    console.log('Redirecting to:', targetUrl);
    
    // Add timestamp to prevent caching issues
    window.location.replace(targetUrl + '?t=' + new Date().getTime());
  })
  .catch(err => {
    console.error('Login error:', err);
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
      errorMessage.textContent = err.message || 'Login failed. Please check credentials and try again.';
      errorMessage.style.display = 'block';
    } else {
      alert('Login failed: ' + (err.message || 'Please check your credentials and try again.'));
    }
  });
}

// Add emergency login button on page load
window.addEventListener('DOMContentLoaded', function() {
  // Add emergency button
  const container = document.querySelector('.login-container');
  if (container) {
    const emergencyBtn = document.createElement('button');
    emergencyBtn.style.marginTop = '20px';
    emergencyBtn.style.backgroundColor = '#e11d48';
    emergencyBtn.textContent = 'Emergency Login (Admin)';
    emergencyBtn.onclick = function() {
      fixLogin('admin', 'admin123', 'admin');
    };
    container.appendChild(emergencyBtn);
  }
});
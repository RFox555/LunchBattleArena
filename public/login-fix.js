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
      throw new Error('Login failed');
    }
  })
  .then(user => {
    console.log('Login successful:', user);
    
    // Create a cookie to track authentication state
    document.cookie = "authenticated=true; path=/";
    
    // Force direct browser navigation without history manipulation
    const targetUrl = userType === 'driver' ? '/driver-checkin.html' : '/employee-dashboard.html';
    console.log('Redirecting to:', targetUrl);
    
    // Add timestamp to prevent caching issues
    window.location.href = targetUrl + '?t=' + new Date().getTime();
  })
  .catch(err => {
    console.error('Login error:', err);
    alert('Login failed. Please check credentials and try again.');
  });
}

// This will be used to automatically log in driver1 when the page loads
window.onload = function() {
  // Auto-login for driver1 (for testing purposes)
  document.getElementById('username').value = 'driver1';
  document.getElementById('password').value = 'password123';
  document.getElementById('userType').value = 'driver';
  
  // Add emergency button
  const container = document.querySelector('.container');
  const emergencyBtn = document.createElement('button');
  emergencyBtn.style.marginTop = '20px';
  emergencyBtn.style.backgroundColor = '#e11d48';
  emergencyBtn.textContent = 'Emergency Direct Login';
  emergencyBtn.onclick = function() {
    fixLogin('driver1', 'password123', 'driver');
  };
  container.appendChild(emergencyBtn);
};
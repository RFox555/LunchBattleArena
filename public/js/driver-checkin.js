/**
 * Driver Check-in/Check-out Functionality
 * Handles the driver status panel and related operations
 */

// Global variables - exposing to window for access from inline scripts
window.currentDriverId = null;
window.isCheckedIn = false;
window.lastCheckInTime = null;
window.lastCheckOutTime = null;

// Create a global driverStatus object that mirrors the variables for compatibility
window.driverStatus = {
  isCheckedIn: false,
  lastCheckInTime: null,
  lastCheckOutTime: null
};

// Initialize driver check-in functionality
function initDriverCheckin() {
  // Get the current user's information
  getCurrentUser()
    .then(user => {
      if (user && user.userType === 'driver') {
        currentDriverId = user.id;
        document.getElementById('driver-name').textContent = user.name;
        
        // Initialize the driver status
        checkDriverStatus(user.id);
        
        // Set up event listeners
        setupEventListeners();
      } else {
        showError('Error: Only drivers can access this page. Please log in as a driver.');
        // Redirect to login after 3 seconds
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 3000);
      }
    })
    .catch(error => {
      console.error('Error fetching current user:', error);
      showError('Error: Could not authenticate. Please log in again.');
      // Redirect to login after 3 seconds
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 3000);
    });
}

// Set up event listeners for the check-in/check-out buttons
function setupEventListeners() {
  // Check-in button
  document.getElementById('btn-check-in').addEventListener('click', () => {
    // Get the location from the input field
    const location = document.getElementById('check-in-location').value.trim();
    if (!location) {
      showMessage('Please enter your current location.', 'warning');
      return;
    }
    
    // Get the note (optional)
    const note = document.getElementById('check-in-note').value.trim();
    
    // Perform the check-in
    checkInDriver(currentDriverId, location, note);
  });
  
  // Check-out button
  document.getElementById('btn-check-out').addEventListener('click', () => {
    // Get the note (optional)
    const note = document.getElementById('check-out-note').value.trim();
    
    // Perform the check-out
    checkOutDriver(currentDriverId, note);
  });
  
  // Refresh status button
  document.getElementById('btn-refresh-status').addEventListener('click', () => {
    checkDriverStatus(currentDriverId);
  });
}

// Get the current authenticated user
async function getCurrentUser() {
  try {
    const response = await fetch('/api/auth/me');
    if (!response.ok) {
      throw new Error('Not authenticated');
    }
    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
}

// Check the driver's current status
async function checkDriverStatus(driverId) {
  // Make this function available to inline scripts
  window.checkDriverStatus = checkDriverStatus;
  try {
    // Show loading indicator
    document.getElementById('status-loading').style.display = 'block';
    document.getElementById('driver-status-panel').classList.add('loading');
    
    const response = await fetch(`/api/drivers/${driverId}/status`);
    if (!response.ok) {
      throw new Error('Failed to get driver status');
    }
    
    const status = await response.json();
    
    // Update the global status variables
    isCheckedIn = status.isCheckedIn;
    lastCheckInTime = status.lastCheckInTime ? new Date(status.lastCheckInTime) : null;
    lastCheckOutTime = status.lastCheckOutTime ? new Date(status.lastCheckOutTime) : null;
    
    // Update the UI
    updateDriverStatusUI();
    
    return status;
  } catch (error) {
    console.error('Error checking driver status:', error);
    showError('Error: Could not retrieve driver status. Please try again.');
    throw error;
  } finally {
    // Hide loading indicator
    document.getElementById('status-loading').style.display = 'none';
    document.getElementById('driver-status-panel').classList.remove('loading');
  }
}

// Check in the driver
async function checkInDriver(driverId, location, note = '') {
  try {
    // Disable the button and show loading state
    const checkInButton = document.getElementById('btn-check-in');
    checkInButton.disabled = true;
    checkInButton.classList.add('loading');
    
    // Prepare the payload
    const payload = { location };
    if (note) {
      payload.note = note;
    }
    
    // Make the API call
    const response = await fetch(`/api/drivers/${driverId}/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to check in');
    }
    
    const data = await response.json();
    
    // Update status
    isCheckedIn = true;
    lastCheckInTime = data.checkInTime ? new Date(data.checkInTime) : new Date();
    
    // Clear form fields
    document.getElementById('check-in-location').value = '';
    document.getElementById('check-in-note').value = '';
    
    // Update UI
    updateDriverStatusUI();
    
    showMessage('You have successfully checked in!', 'success');
    
    // Enable the QR scanner if it exists
    if (typeof enableQrScanner === 'function') {
      enableQrScanner();
    }
    
    return data;
  } catch (error) {
    console.error('Error checking in:', error);
    showError(`Check-in failed: ${error.message}`);
    throw error;
  } finally {
    // Re-enable the button and remove loading state
    const checkInButton = document.getElementById('btn-check-in');
    checkInButton.disabled = false;
    checkInButton.classList.remove('loading');
  }
}

// Check out the driver
async function checkOutDriver(driverId, note = '') {
  try {
    // Confirm the action
    if (!confirm('Are you sure you want to check out? You will not be able to scan employee IDs until you check in again.')) {
      return null;
    }
    
    // Disable the button and show loading state
    const checkOutButton = document.getElementById('btn-check-out');
    checkOutButton.disabled = true;
    checkOutButton.classList.add('loading');
    
    // Prepare the payload
    const payload = {};
    if (note) {
      payload.note = note;
    }
    
    // Make the API call
    const response = await fetch(`/api/drivers/${driverId}/check-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to check out');
    }
    
    const data = await response.json();
    
    // Update status
    isCheckedIn = false;
    lastCheckOutTime = data.checkOutTime ? new Date(data.checkOutTime) : new Date();
    
    // Clear form field
    document.getElementById('check-out-note').value = '';
    
    // Update UI
    updateDriverStatusUI();
    
    showMessage('You have successfully checked out!', 'success');
    
    // Disable the QR scanner if it exists
    if (typeof disableQrScanner === 'function') {
      disableQrScanner();
    }
    
    return data;
  } catch (error) {
    console.error('Error checking out:', error);
    showError(`Check-out failed: ${error.message}`);
    throw error;
  } finally {
    // Re-enable the button and remove loading state
    const checkOutButton = document.getElementById('btn-check-out');
    checkOutButton.disabled = false;
    checkOutButton.classList.remove('loading');
  }
}

// Update the driver status UI based on current state
function updateDriverStatusUI() {
  // Get UI elements
  const statusIcon = document.getElementById('status-icon');
  const statusText = document.getElementById('status-text');
  const lastCheckInTimeText = document.getElementById('last-check-in-time');
  const lastCheckOutTimeText = document.getElementById('last-check-out-time');
  const checkInForm = document.getElementById('check-in-form');
  const checkOutForm = document.getElementById('check-out-form');
  
  // Update status display
  if (isCheckedIn) {
    statusIcon.className = 'status-icon active';
    statusIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
    statusText.textContent = 'Checked In';
    statusText.className = 'status-text active';
    
    // Show check-out form, hide check-in form
    checkInForm.style.display = 'none';
    checkOutForm.style.display = 'block';
  } else {
    statusIcon.className = 'status-icon inactive';
    statusIcon.innerHTML = '<i class="fas fa-times-circle"></i>';
    statusText.textContent = 'Checked Out';
    statusText.className = 'status-text inactive';
    
    // Show check-in form, hide check-out form
    checkInForm.style.display = 'block';
    checkOutForm.style.display = 'none';
  }
  
  // Update timestamp texts
  if (lastCheckInTime) {
    lastCheckInTimeText.textContent = formatDateTime(lastCheckInTime);
  } else {
    lastCheckInTimeText.textContent = 'N/A';
  }
  
  if (lastCheckOutTime) {
    lastCheckOutTimeText.textContent = formatDateTime(lastCheckOutTime);
  } else {
    lastCheckOutTimeText.textContent = 'N/A';
  }
  
  // Update the panel's appearance based on status
  const panel = document.getElementById('driver-status-panel');
  if (isCheckedIn) {
    panel.classList.add('checked-in');
    panel.classList.remove('checked-out');
  } else {
    panel.classList.remove('checked-in');
    panel.classList.add('checked-out');
  }
  
  // Update the QR scanner availability message if it exists
  const scannerAvailability = document.getElementById('scanner-availability');
  if (scannerAvailability) {
    scannerAvailability.textContent = isCheckedIn ? 
      'QR scanner is active. You can now scan employee IDs.' : 
      'QR scanner is inactive. Please check in to activate the scanner.';
    
    scannerAvailability.className = isCheckedIn ? 'scanner-active' : 'scanner-inactive';
  }
  
  // Update manual check-in form availability if it exists
  const manualCheckIn = document.getElementById('manual-check-in');
  if (manualCheckIn) {
    const manualCheckInStatus = document.getElementById('manual-check-in-status');
    if (manualCheckInStatus) {
      manualCheckInStatus.textContent = isCheckedIn ? 
        'Manual check-in is available.' : 
        'Manual check-in is unavailable. Please check in first.';
      
      manualCheckInStatus.className = isCheckedIn ? 'available' : 'unavailable';
    }
    
    // Enable/disable the form elements
    const formElements = manualCheckIn.querySelectorAll('input, button, select, textarea');
    formElements.forEach(element => {
      element.disabled = !isCheckedIn;
    });
  }
}

// Format a date for display
function formatDateTime(date) {
  if (!date) return 'N/A';
  
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  
  return new Date(date).toLocaleString('en-US', options);
}

// Show a message to the user
function showMessage(message, type = 'info') {
  const messageContainer = document.getElementById('message-container');
  if (!messageContainer) return;
  
  const messageElement = document.createElement('div');
  messageElement.className = `alert alert-${type} alert-dismissible fade show`;
  messageElement.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  messageContainer.appendChild(messageElement);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    messageElement.classList.remove('show');
    setTimeout(() => {
      messageContainer.removeChild(messageElement);
    }, 500); // Wait for fade-out animation
  }, 5000);
}

// Show an error message
function showError(message) {
  showMessage(message, 'danger');
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', initDriverCheckin);

// Export functions for global access
window.checkDriverStatus = checkDriverStatus;
window.checkInDriver = checkInDriver;
window.checkOutDriver = checkOutDriver;
window.isDriverCheckedIn = () => isCheckedIn; // Utility function to check status from other scripts

// This variable is here to maintain backward compatibility with existing code
window.driverStatus = { isCheckedIn: false, lastCheckInTime: null, lastCheckOutTime: null };

// Override the updateDriverStatusUI function to also update the window.driverStatus object
const originalUpdateDriverStatusUI = updateDriverStatusUI;
updateDriverStatusUI = function() {
  // Call the original function
  originalUpdateDriverStatusUI();
  
  // Then update the global object for backward compatibility
  window.driverStatus = {
    isCheckedIn: isCheckedIn,
    lastCheckInTime: lastCheckInTime,
    lastCheckOutTime: lastCheckOutTime
  };
};
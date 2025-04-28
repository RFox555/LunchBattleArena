// driver-location.js - Location tracking utility for bus drivers

// Global variables
let watchId = null;
let activeWatchingPosition = false;
let routeName = null;
let driverStatus = 'active';

// DOM Elements
const locationStatusElem = document.getElementById('locationStatus');
const startTrackingBtn = document.getElementById('startTracking');
const stopTrackingBtn = document.getElementById('stopTracking');
const routeNameInput = document.getElementById('routeName');
const statusSelect = document.getElementById('driverStatus');

// Initialize tracking controls
function initLocationTracking() {
  // Make sure the DOM elements exist
  if (!locationStatusElem || !startTrackingBtn || !stopTrackingBtn) {
    console.error('Location tracking elements not found');
    return;
  }

  // Update UI with initial state
  updateTrackingUI();
  
  // Add event listeners
  startTrackingBtn.addEventListener('click', startTracking);
  stopTrackingBtn.addEventListener('click', stopTracking);
  
  if (routeNameInput) {
    routeNameInput.addEventListener('change', function(e) {
      routeName = e.target.value;
      if (activeWatchingPosition) {
        // Get current position and update with new route name
        getCurrentPosition();
      }
    });
  }
  
  if (statusSelect) {
    statusSelect.addEventListener('change', function(e) {
      driverStatus = e.target.value;
      if (activeWatchingPosition) {
        // Get current position and update with new status
        getCurrentPosition();
      }
    });
  }
}

// Start location tracking
function startTracking() {
  if (activeWatchingPosition) {
    showMessage('Already tracking your location');
    return;
  }
  
  if ('geolocation' in navigator) {
    activeWatchingPosition = true;
    updateTrackingUI();
    
    // Save route name if available
    if (routeNameInput) {
      routeName = routeNameInput.value;
    }
    
    // Save status if available
    if (statusSelect) {
      driverStatus = statusSelect.value;
    }
    
    // Start watching position
    watchId = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
      }
    );
    
    showMessage('Location tracking started');
  } else {
    showMessage('Error: Geolocation is not supported by your browser');
  }
}

// Stop location tracking
function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  
  activeWatchingPosition = false;
  updateTrackingUI();
  
  // Send a final update with inactive status
  if (driverStatus !== 'inactive') {
    const previousStatus = driverStatus;
    driverStatus = 'inactive';
    getCurrentPosition();
    driverStatus = previousStatus;
  }
  
  showMessage('Location tracking stopped');
}

// Handle position update
function handlePositionUpdate(position) {
  const { latitude, longitude } = position.coords;
  let speed = position.coords.speed;
  let heading = position.coords.heading;
  
  // Convert from m/s to mph if speed is available
  if (speed !== null) {
    speed = speed * 2.23694; // Convert m/s to mph
  }
  
  // Send update to server
  updateDriverLocation(latitude, longitude, heading, speed);
  
  // Update UI
  const timestamp = new Date().toLocaleTimeString();
  showMessage(`Location updated at ${timestamp}: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
}

// Handle position error
function handlePositionError(error) {
  console.error('Error getting position:', error);
  showMessage(`Error getting position: ${error.message}`);
  stopTracking();
}

// Get current position once
function getCurrentPosition() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      handlePositionUpdate,
      handlePositionError,
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
      }
    );
  }
}

// Update driver location on the server
async function updateDriverLocation(latitude, longitude, heading, speed) {
  try {
    const locationData = {
      latitude,
      longitude,
      heading: heading !== null ? heading : undefined,
      speed: speed !== null ? speed : undefined,
      routeName: routeName || undefined,
      status: driverStatus || 'active'
    };
    
    // Use PATCH to update existing location
    const response = await fetch('/api/bus-locations', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(locationData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to update location');
    }
    
    console.log('Location updated successfully');
  } catch (error) {
    console.error('Error updating location:', error);
    showMessage(`Error updating location: ${error.message}`);
  }
}

// Update UI based on tracking state
function updateTrackingUI() {
  if (activeWatchingPosition) {
    startTrackingBtn.disabled = true;
    stopTrackingBtn.disabled = false;
    locationStatusElem.classList.remove('inactive');
    locationStatusElem.classList.add('active');
    locationStatusElem.textContent = 'Tracking Active';
  } else {
    startTrackingBtn.disabled = false;
    stopTrackingBtn.disabled = true;
    locationStatusElem.classList.remove('active');
    locationStatusElem.classList.add('inactive');
    locationStatusElem.textContent = 'Tracking Inactive';
  }
}

// Show status message
function showMessage(message) {
  if (locationStatusElem) {
    locationStatusElem.textContent = message;
  }
  console.log(message);
}

// Stop tracking when page is unloaded
window.addEventListener('beforeunload', function() {
  if (activeWatchingPosition) {
    stopTracking();
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLocationTracking);
} else {
  initLocationTracking();
}

// Export functions for external use
window.driverLocationTracker = {
  start: startTracking,
  stop: stopTracking,
  isActive: () => activeWatchingPosition,
  setRouteName: (name) => {
    routeName = name;
    if (routeNameInput) routeNameInput.value = name;
    if (activeWatchingPosition) getCurrentPosition();
  },
  setStatus: (status) => {
    driverStatus = status;
    if (statusSelect) statusSelect.value = status;
    if (activeWatchingPosition) getCurrentPosition();
  }
};
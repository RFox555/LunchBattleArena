/**
 * Enhanced QR scanner for driver check-in/employee scanning
 * Integrates with driver status and properly handles employee check-ins
 */

// Elements
let html5QrCode = null;
let isScanning = false;

// Process the employee check-in
async function checkInEmployee(employeeId) {
  console.log("Checking in employee with ID:", employeeId);
  
  // Validate driver is checked in
  const isDriverCheckedIn = window.isDriverCheckedIn ? window.isDriverCheckedIn() : false;
  if (!isDriverCheckedIn) {
    showScannerError("You must check in as a driver before you can check in employees.");
    return;
  }
  
  // Validate employee ID
  if (!employeeId || employeeId.length !== 5 || !/^\d+$/.test(employeeId)) {
    showScannerError("Invalid employee ID. Please scan a valid QR code or enter a 5-digit ID.");
    return;
  }
  
  try {
    // Clear previous messages
    hideScannerMessages();
    
    // Get current driver location
    const location = document.getElementById('check-in-location').value || 'Bus Stop';
    
    // Prepare the payload
    const payload = {
      riderId: employeeId,
      location: location,
      note: 'Checked in via QR scan'
    };
    
    // Send the check-in request
    const response = await fetch('/api/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to check in employee');
    }
    
    // Parse the response
    const trip = await response.json();
    console.log("Check-in successful:", trip);
    
    // Play success sound
    playSuccessSound();
    
    // Show success message
    showScannerSuccess(`Employee ${employeeId} has been successfully checked in!`);
    
    // Display trip details
    const tripDetails = document.getElementById('trip-details');
    if (tripDetails) {
      document.getElementById('trip-id').textContent = trip.id;
      document.getElementById('trip-employee').textContent = trip.riderId;
      document.getElementById('trip-location').textContent = trip.location;
      document.getElementById('trip-time').textContent = new Date(trip.check_in_time || trip.timestamp).toLocaleString();
      document.getElementById('trip-note').textContent = trip.note || 'No note provided';
      tripDetails.style.display = 'block';
    }
    
    // Refresh trip history
    refreshTripHistory();
    
    return trip;
  } catch (error) {
    console.error("Check-in error:", error);
    showScannerError(`Failed to check in employee: ${error.message}`);
    return null;
  }
}

// Initialize scanner when page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log("Initializing driver scanner");
  
  // Find scanner elements
  const startButton = document.getElementById('start-scan');
  const stopButton = document.getElementById('stop-scan');
  const manualInput = document.getElementById('qr-manual-input');
  const manualSubmit = document.getElementById('qr-manual-submit');
  
  // Set up event listeners
  if (startButton) {
    startButton.addEventListener('click', startScanner);
    console.log("Start scanner button initialized");
  }
  
  if (stopButton) {
    stopButton.addEventListener('click', stopScanner);
    console.log("Stop scanner button initialized");
  }
  
  if (manualInput && manualSubmit) {
    manualSubmit.addEventListener('click', function() {
      const employeeId = manualInput.value.trim();
      if (employeeId) {
        manualInput.value = '';
        checkInEmployee(employeeId);
      }
    });
    console.log("Manual input initialized");
  }
  
  // Initialize scanner on demand to avoid camera permission popups on page load
  console.log('Driver scanner setup complete');
});

// Start scanner
function startScanner() {
  // Check if driver is checked in
  const isDriverCheckedIn = window.isDriverCheckedIn ? window.isDriverCheckedIn() : false;
  if (!isDriverCheckedIn) {
    showScannerError('You must check in before scanning employee QR codes.');
    return;
  }

  try {
    // Clear any previous error
    hideScannerMessages();
    
    // Create scanner if it doesn't exist
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode("reader");
    }
    
    // Configure scanner
    const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    // Start scanning
    html5QrCode.start(
      { facingMode: "environment" }, // Use back camera
      qrConfig,
      onScanSuccess,
      onScanFailure
    ).then(() => {
      // Scanner started successfully
      isScanning = true;
      updateScannerControls(true);
      console.log("QR scanner started");
    }).catch(err => {
      console.error("Failed to start scanner:", err);
      showScannerError('Failed to start scanner. Please check camera permissions.');
    });
  } catch (error) {
    console.error("Error starting scanner:", error);
    showScannerError('Error initializing scanner. Please try again.');
  }
}

// Stop scanner
function stopScanner() {
  if (html5QrCode && isScanning) {
    html5QrCode.stop().then(() => {
      isScanning = false;
      updateScannerControls(false);
      console.log("QR scanner stopped");
    }).catch(err => {
      console.error("Error stopping scanner:", err);
    });
  }
}

// Handle successful scan
function onScanSuccess(decodedText) {
  console.log("QR code scanned:", decodedText);
  
  // Stop scanner first
  stopScanner();
  
  // Process the scanned code
  checkInEmployee(decodedText.trim());
}

// Handle scan errors
function onScanFailure(error) {
  // Just log the error, don't display it
  console.log("QR scanning error:", error);
}

// Function to refresh trip history
function refreshTripHistory() {
  const tripsContainer = document.getElementById('trips-container');
  if (!tripsContainer) return;
  
  // Show loading indicator
  tripsContainer.innerHTML = '<div class="loading">Loading recent check-ins...</div>';
  
  // Fetch recent trips
  fetch('/api/trips/recent?limit=10')
    .then(response => {
      if (!response.ok) throw new Error('Failed to fetch recent trips');
      return response.json();
    })
    .then(trips => {
      if (trips.length === 0) {
        tripsContainer.innerHTML = '<div class="no-trips">No recent check-ins found.</div>';
        return;
      }
      
      // Create table
      let html = `
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Employee</th>
              <th>Location</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      // Add trips
      trips.forEach(trip => {
        const date = new Date(trip.check_in_time || trip.timestamp);
        html += `
          <tr>
            <td>${trip.id}</td>
            <td>${trip.riderId}</td>
            <td>${trip.location}</td>
            <td>${date.toLocaleString()}</td>
            <td>${trip.completed ? 'Completed' : 'Active'}</td>
          </tr>
        `;
      });
      
      html += `
          </tbody>
        </table>
      `;
      
      tripsContainer.innerHTML = html;
    })
    .catch(error => {
      console.error('Error fetching trips:', error);
      tripsContainer.innerHTML = `<div class="error">Failed to load trip history: ${error.message}</div>`;
    });
}

// Play success sound
function playSuccessSound() {
  const successSound = new Audio('data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAFAAAGUACFhYWFhYWFhYWFhYWFhYWFhYWFvb29vb29vb29vb29vb29vb29vb3f39/f39/f39/f39/f39/f39/f3////////////////wAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQCkAAAAAAAAAZQOGZkbgAAAAAAAAAAAAAAAAD/+xDEAAAHMAN/tAAAIgZIb/Z4ABIEAAFYIAAT8ogAAhHxQQEBAQE3d3cRI3cQEMuBAQx3EBAQEiIAAAAAAAxn///+AgICAgRERERERIiIiIiJVVVVVVV3d3d3d3e7u7u7u7vd3d3d3d4AAAABAQAQCBAAAAAAAAAAAAAAAAA=');
  successSound.play();
}

// Update scanner controls
function updateScannerControls(isStarted) {
  const startButton = document.getElementById('start-scan');
  const stopButton = document.getElementById('stop-scan');
  
  if (startButton && stopButton) {
    startButton.style.display = isStarted ? 'none' : 'inline-block';
    stopButton.style.display = isStarted ? 'inline-block' : 'none';
  }
}

// Show error message
function showScannerError(message) {
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
}

// Show success message
function showScannerSuccess(message) {
  const successElement = document.getElementById('success-message');
  if (successElement) {
    successElement.textContent = message;
    successElement.style.display = 'block';
  }
}

// Hide all scanner messages
function hideScannerMessages() {
  const errorElement = document.getElementById('error-message');
  const successElement = document.getElementById('success-message');
  
  if (errorElement) {
    errorElement.style.display = 'none';
  }
  
  if (successElement) {
    successElement.style.display = 'none';
  }
}

// For compatibility with driver check-in system
function enableQrScanner() {
  // Enable scanner controls
  const startButton = document.getElementById('start-scan');
  if (startButton) {
    startButton.disabled = false;
  }
  
  // Update availability message
  const scannerAvailability = document.getElementById('scanner-availability');
  if (scannerAvailability) {
    scannerAvailability.textContent = 'QR scanner is active. You can now scan employee IDs.';
    scannerAvailability.className = 'scanner-active';
  }
}

function disableQrScanner() {
  // First stop the scanner if it's running
  if (isScanning) {
    stopScanner();
  }
  
  // Disable scanner controls
  const startButton = document.getElementById('start-scan');
  if (startButton) {
    startButton.disabled = true;
  }
  
  // Update availability message
  const scannerAvailability = document.getElementById('scanner-availability');
  if (scannerAvailability) {
    scannerAvailability.textContent = 'QR scanner is inactive. Please check in to activate the scanner.';
    scannerAvailability.className = 'scanner-inactive';
  }
}

// Export functions for global access
window.startScanner = startScanner;
window.stopScanner = stopScanner;
window.enableQrScanner = enableQrScanner;
window.disableQrScanner = disableQrScanner;
window.checkInEmployee = checkInEmployee;
window.refreshTripHistory = refreshTripHistory;
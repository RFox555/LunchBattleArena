/**
 * Fixed QR Scanner Implementation
 * Completely standalone with no dependencies
 */

// Global variables
let html5QrCode = null;
let isScanning = false;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log("Fixed QR scanner script loaded");
  setupScanner();
});

// Set up the scanner
function setupScanner() {
  // Get DOM elements
  const startButton = document.getElementById('start-scan');
  const stopButton = document.getElementById('stop-scan');
  const manualInput = document.getElementById('qr-manual-input');
  const manualSubmit = document.getElementById('qr-manual-submit');
  const errorMessage = document.getElementById('error-message');
  const successMessage = document.getElementById('success-message');
  
  // Create scanner directly
  try {
    html5QrCode = new Html5Qrcode("reader");
    console.log("QR scanner created successfully");
  } catch (error) {
    console.error("Failed to create QR scanner:", error);
    return;
  }
  
  // Add event listeners
  if (startButton) {
    startButton.addEventListener('click', startScanner);
    console.log("Start button listener added");
  }
  
  if (stopButton) {
    stopButton.addEventListener('click', stopScanner);
    console.log("Stop button listener added");
  }
  
  // Set up manual entry
  if (manualInput && manualSubmit) {
    manualSubmit.addEventListener('click', function() {
      const employeeId = manualInput.value.trim();
      if (employeeId) {
        manualInput.value = '';
        processScannedCode(employeeId);
      }
    });
    console.log("Manual entry listeners added");
  }
}

// Start the scanner
function startScanner() {
  const errorMessage = document.getElementById('error-message');
  const startButton = document.getElementById('start-scan');
  const stopButton = document.getElementById('stop-scan');
  
  if (errorMessage) errorMessage.style.display = 'none';
  
  console.log("Starting scanner");
  
  const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } };
  
  html5QrCode.start(
    { facingMode: "environment" },
    qrConfig,
    onScanSuccess,
    onScanError
  ).then(() => {
    console.log("Scanner started successfully");
    isScanning = true;
    if (startButton) startButton.style.display = 'none';
    if (stopButton) stopButton.style.display = 'block';
  }).catch(error => {
    console.error("Error starting scanner:", error);
    if (errorMessage) {
      errorMessage.textContent = 'Failed to start scanner. Please check camera permissions.';
      errorMessage.style.display = 'block';
    }
  });
}

// Stop the scanner
function stopScanner() {
  const startButton = document.getElementById('start-scan');
  const stopButton = document.getElementById('stop-scan');
  
  if (html5QrCode && isScanning) {
    html5QrCode.stop().then(() => {
      console.log("Scanner stopped successfully");
      isScanning = false;
      if (startButton) startButton.style.display = 'block';
      if (stopButton) stopButton.style.display = 'none';
    }).catch(error => {
      console.error("Error stopping scanner:", error);
    });
  }
}

// Handle successful scan
function onScanSuccess(decodedText) {
  console.log("Successful scan:", decodedText);
  
  // Play success sound
  const beep = new Audio('data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAFAAAGUACFhYWFhYWFhYWFhYWFhYWFhYWFvb29vb29vb29vb29vb29vb29vb3f39/f39/f39/f39/f39/f39/f3////////////////wAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQCkAAAAAAAAAZQOGZkbgAAAAAAAAAAAAAAAAD/+xDEAAAHMAN/tAAAIgZIb/Z4ABIEAAFYIAAT8ogAAhHxQQEBAQE3d3cRI3cQEMuBAQx3EBAQEiIAAAAAAAxn///+AgICAgRERERERIiIiIiJVVVVVVV3d3d3d3e7u7u7u7vd3d3d3d4AAAABAQAQCBAAAAAAAAAAAAAAAAA=');
  beep.play();
  
  // Stop the scanner
  stopScanner();
  
  // Process the scanned code
  processScannedCode(decodedText.trim());
}

// Handle scan errors
function onScanError(error) {
  console.log("QR scan error (normal during scanning):", error);
}

// Process the scanned code (employee ID)
function processScannedCode(employeeId) {
  console.log("Processing employee ID:", employeeId);
  const successMessage = document.getElementById('success-message');
  const errorMessage = document.getElementById('error-message');
  
  // Validate employee ID
  if (!employeeId || employeeId.length !== 5 || !/^\d+$/.test(employeeId)) {
    console.error("Invalid employee ID:", employeeId);
    if (errorMessage) {
      errorMessage.textContent = 'Invalid employee ID. Please enter a valid 5-digit ID.';
      errorMessage.style.display = 'block';
    }
    return;
  }
  
  // Prepare check-in data
  const checkInData = {
    riderId: employeeId,
    location: 'Bus Stop',
    note: 'Scanned via QR code'
  };
  
  // Send API request
  fetch('/api/trips', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(checkInData),
    credentials: 'include'
  })
  .then(response => {
    if (response.ok) {
      return response.json().then(data => {
        console.log("Check-in successful:", data);
        
        if (successMessage) {
          successMessage.textContent = `Employee ${data.riderId} has been successfully checked in!`;
          successMessage.style.display = 'block';
        }
        
        // If there's a function to refresh the check-in list, call it
        if (typeof fetchRecentCheckIns === 'function') {
          fetchRecentCheckIns();
        }
        
        return data;
      });
    } else {
      return response.json().then(errorData => {
        throw new Error(errorData.message || 'Failed to check in employee');
      });
    }
  })
  .catch(error => {
    console.error("Check-in error:", error);
    if (errorMessage) {
      errorMessage.textContent = error.message || 'An error occurred during check-in';
      errorMessage.style.display = 'block';
    }
  });
}
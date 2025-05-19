/**
 * This file provides a simplified QR scanner implementation
 * that works correctly with the driver check-in status
 */

// Elements
let html5QrCode = null;
let isScanning = false;
let scannerInitialized = false;

// Initialize scanner when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Find scanner elements
  const startButton = document.getElementById('start-scan');
  const stopButton = document.getElementById('stop-scan');
  const manualInput = document.getElementById('qr-manual-input');
  const manualSubmit = document.getElementById('qr-manual-submit');
  
  // Set up event listeners
  if (startButton) {
    startButton.addEventListener('click', startScanner);
  }
  
  if (stopButton) {
    stopButton.addEventListener('click', stopScanner);
  }
  
  if (manualInput && manualSubmit) {
    manualSubmit.addEventListener('click', function() {
      const employeeId = manualInput.value.trim();
      if (employeeId) {
        manualInput.value = '';
        processQrCode(employeeId);
      }
    });
  }
  
  console.log('QR scanner setup complete');
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
  // Play success sound
  playSuccessSound();
  
  // Stop scanner
  stopScanner();
  
  // Process the scanned code
  processQrCode(decodedText.trim());
}

// Handle scan errors
function onScanFailure(error) {
  // Just log the error, don't display it
  console.log("QR scanning error:", error);
}

// Process the QR code (employee ID)
function processQrCode(code) {
  // Clean the code
  code = code.trim();
  
  console.log("Processing employee ID:", code);
  
  // Show success message
  showScannerSuccess('Processing employee ID: ' + code);
  
  // Call the check-in function if it exists
  if (typeof checkInEmployee === 'function') {
    checkInEmployee(code);
  } else {
    console.error("checkInEmployee function not found");
    showScannerError('Error: Check-in function not available');
  }
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

// For compatibility with the original code
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
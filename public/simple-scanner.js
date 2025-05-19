/**
 * BARE MINIMUM QR SCANNER IMPLEMENTATION
 * This is a completely independent implementation with no dependencies on other parts of the app
 */

// Elements - get them once
const startButton = document.getElementById('start-scan-button');
const stopButton = document.getElementById('stop-scan-button');
const manualInput = document.getElementById('employee-id-input');
const manualSubmit = document.getElementById('submit-id-button');
const status = document.getElementById('scan-status');

// Scanner state
let html5QrCode = null;
let isScanning = false;

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Create scanner instance
  try {
    html5QrCode = new Html5Qrcode("reader");
    console.log("Scanner initialized successfully");
  } catch (error) {
    console.error("Failed to initialize scanner:", error);
    showStatus("Scanner initialization failed. Try refreshing the page.", "error");
  }
  
  // Add button event listeners
  if (startButton) {
    startButton.addEventListener('click', startScanner);
  }
  
  if (stopButton) {
    stopButton.addEventListener('click', stopScanner);
  }
  
  // Setup manual entry
  if (manualInput && manualSubmit) {
    manualSubmit.addEventListener('click', function() {
      const id = manualInput.value.trim();
      if (id) {
        processEmployeeId(id);
        manualInput.value = '';
      }
    });
    
    // Also handle enter key
    manualInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        const id = manualInput.value.trim();
        if (id) {
          processEmployeeId(id);
          manualInput.value = '';
        }
      }
    });
  }
});

// Start scanning
function startScanner() {
  if (!html5QrCode) {
    showStatus("Scanner not initialized. Please refresh the page.", "error");
    return;
  }

  try {
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start(
      { facingMode: "environment" }, // Use back camera
      config,
      onScanSuccess,
      onScanError
    ).then(() => {
      // Scanner started successfully
      isScanning = true;
      updateButtons(true);
      showStatus("Scanner started. Point camera at QR code.", "success");
    }).catch(error => {
      console.error("Failed to start scanner:", error);
      showStatus("Failed to start scanner. Check camera permissions.", "error");
    });
  } catch (error) {
    console.error("Error starting scanner:", error);
    showStatus("Error starting scanner.", "error");
  }
}

// Stop scanning
function stopScanner() {
  if (html5QrCode && isScanning) {
    html5QrCode.stop().then(() => {
      isScanning = false;
      updateButtons(false);
      showStatus("Scanner stopped.", "info");
    }).catch(error => {
      console.error("Error stopping scanner:", error);
    });
  }
}

// Handle successful scan
function onScanSuccess(decodedText) {
  // Play beep sound
  playBeep();
  
  // Stop scanner
  stopScanner();
  
  // Process the employee ID
  processEmployeeId(decodedText);
}

// Handle scan errors (just log them)
function onScanError(error) {
  console.log("Scan error (normal during scanning):", error);
}

// Process the employee ID
function processEmployeeId(employeeId) {
  employeeId = employeeId.trim();
  console.log("Processing employee ID:", employeeId);
  
  // Show success message
  showStatus(`Successfully scanned ID: ${employeeId}`, "success");
  
  // In real app, you'd call an API here:
  // checkInEmployee(employeeId);
}

// Play a beep sound for successful scan
function playBeep() {
  const beep = new Audio('data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAFAAAGUACFhYWFhYWFhYWFhYWFhYWFhYWFvb29vb29vb29vb29vb29vb29vb3f39/f39/f39/f39/f39/f39/f3////////////////wAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQCkAAAAAAAAAZQOGZkbgAAAAAAAAAAAAAAAAD/+xDEAAAHMAN/tAAAIgZIb/Z4ABIEAAFYIAAT8ogAAhHxQQEBAQE3d3cRI3cQEMuBAQx3EBAQEiIAAAAAAAxn///+AgICAgRERERERIiIiIiJVVVVVVV3d3d3d3e7u7u7u7vd3d3d3d4AAAABAQAQCBAAAAAAAAAAAAAAAAA=');
  beep.play();
}

// Update button visibility
function updateButtons(isStarted) {
  if (startButton && stopButton) {
    startButton.style.display = isStarted ? 'none' : 'block';
    stopButton.style.display = isStarted ? 'block' : 'none';
  }
}

// Show status message
function showStatus(message, type) {
  if (status) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
  }
}
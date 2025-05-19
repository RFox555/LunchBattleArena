/**
 * QR Scanner functionality
 */

// Variables
let html5QrCode = null;
let isScanning = false;

document.addEventListener('DOMContentLoaded', function() {
  const startScanButton = document.getElementById('start-scan');
  const stopScanButton = document.getElementById('stop-scan');
  const qrManualInput = document.getElementById('qr-manual-input');
  const qrManualSubmit = document.getElementById('qr-manual-submit');
  const errorMessage = document.getElementById('error-message');
  
  // Initialize scanner when page loads
  if (startScanButton) {
    startScanButton.addEventListener('click', startScanner);
  }
  
  if (stopScanButton) {
    stopScanButton.addEventListener('click', stopScanner);
  }
  
  // Handle manual input
  if (qrManualInput && qrManualSubmit) {
    qrManualSubmit.addEventListener('click', function() {
      const employeeId = qrManualInput.value.trim();
      if (employeeId) {
        qrManualInput.value = '';
        processQrCode(employeeId);
      }
    });
  }
  
  console.log("QR scanner script loaded");
});

// Start scanner
function startScanner() {
  try {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
      errorMessage.style.display = 'none';
    }
    
    // Create scanner if needed
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode("reader");
    }
    
    // Scanner config
    const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    // Start scanner
    html5QrCode.start(
      { facingMode: "environment" },
      qrConfig,
      onScanSuccess,
      onScanFailure
    ).then(() => {
      isScanning = true;
      const startScanButton = document.getElementById('start-scan');
      const stopScanButton = document.getElementById('stop-scan');
      if (startScanButton) startScanButton.style.display = 'none';
      if (stopScanButton) stopScanButton.style.display = 'block';
      console.log("QR scanner started");
    }).catch(err => {
      console.error("Failed to start scanner:", err);
      const errorMessage = document.getElementById('error-message');
      if (errorMessage) {
        errorMessage.textContent = 'Failed to start scanner. Please check camera permissions.';
        errorMessage.style.display = 'block';
      }
    });
  } catch (error) {
    console.error("Error starting scanner:", error);
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
      errorMessage.textContent = 'Error initializing scanner. Please try again.';
      errorMessage.style.display = 'block';
    }
  }
}

// Stop scanner
function stopScanner() {
  if (html5QrCode && isScanning) {
    html5QrCode.stop().then(() => {
      isScanning = false;
      const startScanButton = document.getElementById('start-scan');
      const stopScanButton = document.getElementById('stop-scan');
      if (startScanButton) startScanButton.style.display = 'block';
      if (stopScanButton) stopScanButton.style.display = 'none';
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
  
  // Process QR code
  processQrCode(decodedText);
}

// Handle scan failure
function onScanFailure(error) {
  // Just log errors
  console.log("QR scan error:", error);
}

// Process QR code (employee ID)
function processQrCode(employeeId) {
  employeeId = employeeId.trim();
  console.log("Processing employee ID:", employeeId);
  
  // In driver-checkin.html, this should call checkInEmployee
  if (typeof checkInEmployee === 'function') {
    checkInEmployee(employeeId);
  } else {
    console.error("checkInEmployee function not found");
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
      errorMessage.textContent = 'Error: Unable to process employee ID.';
      errorMessage.style.display = 'block';
    }
  }
}

// Play success sound
function playSuccessSound() {
  const successSound = new Audio('data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAFAAAGUACFhYWFhYWFhYWFhYWFhYWFhYWFvb29vb29vb29vb29vb29vb29vb3f39/f39/f39/f39/f39/f39/f3////////////////wAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQCkAAAAAAAAAZQOGZkbgAAAAAAAAAAAAAAAAD/+xDEAAAHMAN/tAAAIgZIb/Z4ABIEAAFYIAAT8ogAAhHxQQEBAQE3d3cRI3cQEMuBAQx3EBAQEiIAAAAAAAxn///+AgICAgRERERERIiIiIiJVVVVVVV3d3d3d3e7u7u7u7vd3d3d3d4AAAABAQAQCBAAAAAAAAAAAAAAAAA=');
  successSound.play();
}
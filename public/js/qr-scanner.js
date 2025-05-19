/**
 * QR Scanner for Driver Check-in
 * This is a simplified version that works with the Html5QrCode library
 */

// Initialize QR Scanner when the page loads
document.addEventListener('DOMContentLoaded', function() {
  // Find required elements
  const startButton = document.getElementById('start-scan');
  const stopButton = document.getElementById('stop-scan');
  const errorMessage = document.getElementById('error-message');
  const readerElement = document.getElementById('reader');
  
  if (!readerElement) {
    console.error("QR reader element not found!");
    return;
  }
  
  // Global scanner object
  let html5QrCode = null;
  let isScanning = false;
  
  // Initialize scanner
  try {
    html5QrCode = new Html5Qrcode("reader");
    console.log("QR scanner initialized");
  } catch (err) {
    console.error("Error initializing QR scanner:", err);
  }
  
  // Set up button event handlers if they exist
  if (startButton) {
    startButton.addEventListener('click', startScanner);
  }
  
  if (stopButton) {
    stopButton.addEventListener('click', stopScanner);
  }
  
  // Manual input for QR code
  const manualInput = document.getElementById('qr-manual-input');
  const manualSubmit = document.getElementById('qr-manual-submit');
  
  if (manualInput && manualSubmit) {
    manualSubmit.addEventListener('click', function() {
      const riderId = manualInput.value.trim();
      if (riderId) {
        manualInput.value = '';
        processQrCode(riderId);
      }
    });
    
    manualInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        const riderId = manualInput.value.trim();
        if (riderId) {
          manualInput.value = '';
          processQrCode(riderId);
        }
      }
    });
  }
  
  // Start QR scanner
  function startScanner() {
    // First check if the driver is checked in
    const isCheckedIn = window.driverIsCheckedIn === true;
    
    if (!isCheckedIn) {
      if (errorMessage) {
        errorMessage.textContent = 'You must check in before you can scan employee QR codes.';
        errorMessage.style.display = 'block';
      }
      return;
    }
    
    // Hide any previous error messages
    if (errorMessage) {
      errorMessage.style.display = 'none';
    }
    
    // Check if scanner is available
    if (!html5QrCode) {
      try {
        html5QrCode = new Html5Qrcode("reader");
      } catch (err) {
        console.error("Failed to initialize scanner:", err);
        if (errorMessage) {
          errorMessage.textContent = 'Could not initialize the QR scanner. Please try again or use manual entry.';
          errorMessage.style.display = 'block';
        }
        return;
      }
    }
    
    // Configure and start the scanner
    const qrConfig = { 
      fps: 10, 
      qrbox: { width: 250, height: 250 }
    };
    
    html5QrCode.start(
      { facingMode: "environment" }, // Use back camera
      qrConfig,
      onScanSuccess,
      onScanFailure
    )
    .then(() => {
      // Scanner started successfully
      isScanning = true;
      if (startButton) startButton.style.display = 'none';
      if (stopButton) stopButton.style.display = 'block';
      console.log("QR scanner started successfully");
    })
    .catch(err => {
      console.error("Failed to start scanner:", err);
      if (errorMessage) {
        errorMessage.textContent = 'Failed to start camera. Please check permissions and try again, or use manual entry.';
        errorMessage.style.display = 'block';
      }
    });
  }
  
  // Stop QR scanner
  function stopScanner() {
    if (html5QrCode && isScanning) {
      html5QrCode.stop()
        .then(() => {
          isScanning = false;
          if (startButton) startButton.style.display = 'block';
          if (stopButton) stopButton.style.display = 'none';
          console.log("QR scanner stopped");
        })
        .catch(err => {
          console.error("Failed to stop scanner:", err);
        });
    }
  }
  
  // Handle successful scan
  function onScanSuccess(decodedText) {
    // Play success sound
    playSuccessSound();
    
    // Stop the scanner
    stopScanner();
    
    // Process the QR code
    processQrCode(decodedText);
  }
  
  // Handle scan failure (just log it)
  function onScanFailure(error) {
    // We don't need to show every failure
    console.log(`QR Code scanning error: ${error}`);
  }
  
  // Process the QR code result
  function processQrCode(riderId) {
    // Trim any whitespace
    riderId = riderId.trim();
    
    // Check if the handleQrCode function exists in the global scope
    if (typeof window.checkInEmployee === 'function') {
      // Call the function with the rider ID
      window.checkInEmployee(riderId);
    } else {
      console.error("checkInEmployee function not found");
      if (errorMessage) {
        errorMessage.textContent = 'Error processing QR code. Please try again.';
        errorMessage.style.display = 'block';
      }
    }
  }
  
  // Play a beep sound when QR code is successfully scanned
  function playSuccessSound() {
    // Simple beep sound (data URL)
    const successSound = new Audio('data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAFAAAGUACFhYWFhYWFhYWFhYWFhYWFhYWFvb29vb29vb29vb29vb29vb29vb3f39/f39/f39/f39/f39/f39/f3////////////////wAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQCkAAAAAAAAAZQOGZkbgAAAAAAAAAAAAAAAAD/+xDEAAAHMAN/tAAAIgZIb/Z4ABIEAAFYIAAT8ogAAhHxQQEBAQE3d3cRI3cQEMuBAQx3EBAQEiIAAAAAAAxn///+AgICAgRERERERIiIiIiJVVVVVVV3d3d3d3e7u7u7u7vd3d3d3d4AAAABAQAQCBAAAAAAAAAAAAAAAAA=');
    successSound.play().catch(e => console.log('Error playing sound:', e));
  }
  
  // Make functions available globally
  window.qrScanner = {
    start: startScanner,
    stop: stopScanner,
    isScanning: () => isScanning
  };
});
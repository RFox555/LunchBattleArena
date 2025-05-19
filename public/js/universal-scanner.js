/**
 * Universal QR Scanner Script - Will work anywhere
 */

// Variables
let html5QrCode;
let isScanning = false;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("Universal QR Scanner loaded");
    
    // Find elements
    const startButton = document.getElementById('start-scan');
    const stopButton = document.getElementById('stop-scan');
    const manualInput = document.getElementById('qr-manual-input');
    const manualSubmitButton = document.getElementById('qr-manual-submit');
    
    // Check if elements exist
    if (!startButton || !stopButton) {
        console.error("Scanner buttons not found");
        return;
    }
    
    try {
        // Create scanner instance
        html5QrCode = new Html5Qrcode("reader");
        console.log("QR scanner created successfully");
    } catch (error) {
        console.error("Failed to create QR scanner:", error);
    }
    
    // Add event listeners
    startButton.addEventListener('click', startScanner);
    stopButton.addEventListener('click', stopScanner);
    
    if (manualInput && manualSubmitButton) {
        manualSubmitButton.addEventListener('click', function() {
            const employeeId = manualInput.value.trim();
            if (employeeId) {
                processQrCode(employeeId);
                manualInput.value = '';
            }
        });
    }
});

// Start the scanner
function startScanner() {
    console.log("Starting scanner...");
    
    // Hide any error messages
    hideMessages();
    
    // Set up scanner config
    const qrboxFunction = function(viewfinderWidth, viewfinderHeight) {
        const minEdgePercentage = 0.7; // 70%
        const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
        const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
        return {
            width: qrboxSize,
            height: qrboxSize
        };
    };
    
    const config = {
        fps: 10,
        qrbox: qrboxFunction,
        aspectRatio: 1.0
    };
    
    // Start scanner
    html5QrCode.start(
        { facingMode: "environment" },
        config,
        qrCodeSuccessCallback,
        qrCodeErrorCallback
    )
    .then(() => {
        console.log("Scanner started successfully");
        isScanning = true;
        
        // Update UI
        const startButton = document.getElementById('start-scan');
        const stopButton = document.getElementById('stop-scan');
        if (startButton) startButton.style.display = 'none';
        if (stopButton) stopButton.style.display = 'inline-block';
        
        // Play a beep sound
        playBeep();
    })
    .catch(error => {
        console.error("Error starting scanner:", error);
        showError("Failed to start scanner. Please check camera permissions.");
    });
}

// Stop the scanner
function stopScanner() {
    console.log("Stopping scanner...");
    
    if (html5QrCode && isScanning) {
        html5QrCode.stop()
        .then(() => {
            console.log("Scanner stopped successfully");
            isScanning = false;
            
            // Update UI
            const startButton = document.getElementById('start-scan');
            const stopButton = document.getElementById('stop-scan');
            if (startButton) startButton.style.display = 'inline-block';
            if (stopButton) stopButton.style.display = 'none';
        })
        .catch(error => {
            console.error("Error stopping scanner:", error);
        });
    }
}

// Handle successful scan
function qrCodeSuccessCallback(decodedText) {
    console.log("QR code scanned successfully:", decodedText);
    
    // Play a beep sound
    playBeep();
    
    // Stop the scanner
    stopScanner();
    
    // Process the QR code
    processQrCode(decodedText);
}

// Handle QR code scan errors
function qrCodeErrorCallback(error) {
    // Just log the error, don't show it to the user
    console.log("QR code scan error:", error);
}

// Process QR code data
function processQrCode(employeeId) {
    console.log("Processing employee ID:", employeeId);
    
    // Validate employee ID format
    if (!employeeId || employeeId.length !== 5 || !/^\d+$/.test(employeeId)) {
        showError("Invalid employee ID. Please enter a 5-digit number.");
        return;
    }
    
    // Create check-in data
    const checkInData = {
        riderId: employeeId,
        location: "Bus Stop",
        note: "Checked in via universal scanner"
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
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.message || "Failed to check in employee");
            });
        }
        return response.json();
    })
    .then(data => {
        console.log("Check-in successful:", data);
        showSuccess(`Employee ${data.riderId} has been successfully checked in!`);
        
        // Update trip details if elements exist
        updateTripDetails(data);
        
        // Refresh check-ins list if function exists
        if (typeof fetchRecentCheckIns === 'function') {
            fetchRecentCheckIns();
        }
    })
    .catch(error => {
        console.error("Check-in error:", error);
        showError(error.message || "Error checking in employee");
    });
}

// Update trip details
function updateTripDetails(trip) {
    const tripDetails = document.getElementById('trip-details');
    const tripId = document.getElementById('trip-id');
    const tripEmployee = document.getElementById('trip-employee');
    const tripLocation = document.getElementById('trip-location');
    const tripTime = document.getElementById('trip-time');
    const tripNote = document.getElementById('trip-note');
    
    if (tripDetails && tripId && tripEmployee && tripLocation && tripTime) {
        tripId.textContent = trip.id;
        tripEmployee.textContent = trip.riderId;
        tripLocation.textContent = trip.location || 'N/A';
        
        // Handle both timestamp formats
        const timestamp = trip.timestamp || trip.check_in_time;
        tripTime.textContent = formatDateTime(timestamp);
        
        if (tripNote) {
            tripNote.textContent = trip.note || 'No note provided';
        }
        
        // Show the trip details
        tripDetails.style.display = 'block';
    }
}

// Format date and time
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Show success message
function showSuccess(message) {
    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');
    
    if (successMessage && errorMessage) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 5000);
    }
}

// Show error message
function showError(message) {
    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');
    
    if (successMessage && errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
}

// Hide messages
function hideMessages() {
    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');
    
    if (successMessage) successMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
}

// Play a beep sound
function playBeep() {
    try {
        const beep = new Audio('data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAFAAAGUACFhYWFhYWFhYWFhYWFhYWFhYWFvb29vb29vb29vb29vb29vb29vb3f39/f39/f39/f39/f39/f39/f3////////////////wAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQCkAAAAAAAAAZQOGZkbgAAAAAAAAAAAAAAAAD/+xDEAAAHMAN/tAAAIgZIb/Z4ABIEAAFYIAAT8ogAAhHxQQEBAQE3d3cRI3cQEMuBAQx3EBAQEiIAAAAAAAxn///+AgICAgRERERERIiIiIiJVVVVVVV3d3d3d3e7u7u7u7vd3d3d3d4AAAABAQAQCBAAAAAAAAAAAAAAAAA=');
        beep.play();
    } catch (error) {
        console.error("Error playing beep:", error);
    }
}
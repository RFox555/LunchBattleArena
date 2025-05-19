/**
 * Driver Scanner - Dedicated QR scanner script for the driver portal
 */

// DOM Elements
let startButton;
let stopButton;
let manualInput;
let submitButton;
let successMessage;
let errorMessage;
let tripDetails;
let tripId;
let tripEmployee;
let tripLocation;
let tripTime;
let tripNote;
let tripsContainer;
let refreshTripsButton;
let tabs;
let tabContents;

// Variables
let html5QrCode = null;
let isScanning = false;
let currentUser = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log("Driver Scanner JS loaded");
  
  // Find elements
  startButton = document.getElementById('startButton');
  stopButton = document.getElementById('stopButton');
  manualInput = document.getElementById('manualInput');
  submitButton = document.getElementById('submitButton');
  successMessage = document.getElementById('success-message');
  errorMessage = document.getElementById('error-message');
  tripDetails = document.getElementById('trip-details');
  tripId = document.getElementById('trip-id');
  tripEmployee = document.getElementById('trip-employee');
  tripLocation = document.getElementById('trip-location');
  tripTime = document.getElementById('trip-time');
  tripNote = document.getElementById('trip-note');
  tripsContainer = document.getElementById('trips-container');
  refreshTripsButton = document.getElementById('refresh-trips');
  tabs = document.querySelectorAll('.tab');
  tabContents = document.querySelectorAll('.tab-content');
  
  // Create scanner
  try {
    html5QrCode = new Html5Qrcode("reader");
    console.log("QR scanner created");
  } catch (error) {
    console.error("Failed to create QR scanner:", error);
    showError("Failed to initialize QR scanner");
  }
  
  // Setup button listeners
  if (startButton) startButton.addEventListener('click', startScanner);
  if (stopButton) stopButton.addEventListener('click', stopScanner);
  if (submitButton) {
    submitButton.addEventListener('click', function() {
      const id = manualInput.value.trim();
      if (id) {
        manualInput.value = '';
        checkInEmployee(id);
      } else {
        showError("Please enter an employee ID");
      }
    });
  }
  if (refreshTripsButton) {
    refreshTripsButton.addEventListener('click', fetchRecentCheckIns);
  }
  
  // Setup tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // Remove active class from all tabs
      tabs.forEach(tab => tab.classList.remove('active'));
      // Add active class to clicked tab
      this.classList.add('active');
      
      // Hide all tab contents
      tabContents.forEach(content => content.classList.remove('active'));
      // Show content for clicked tab
      const tabId = this.getAttribute('data-tab');
      document.querySelector(`.tab-content[data-tab="${tabId}"]`).classList.add('active');
    });
  });
  
  // Get current user
  getCurrentUser()
    .then(user => {
      if (user) {
        currentUser = user;
        const driverName = document.getElementById('driver-name');
        if (driverName) {
          driverName.textContent = user.name || user.username;
        }
        fetchRecentCheckIns();
      } else {
        console.error("No user found");
        showError("Not logged in. Please log in as a driver.");
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 2000);
      }
    })
    .catch(error => {
      console.error("Error getting current user:", error);
      showError("Error getting user information");
    });
});

// Get current user
async function getCurrentUser() {
  try {
    const response = await fetch('/api/user', {
      credentials: 'include'
    });
    
    if (response.ok) {
      return await response.json();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}

// Start scanner
function startScanner() {
  // Hide any previous messages
  hideMessages();
  
  try {
    // Configure scanner
    const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    // Start scanner
    html5QrCode.start(
      { facingMode: "environment" },
      qrConfig,
      onScanSuccess,
      onScanError
    ).then(() => {
      // Update UI
      isScanning = true;
      startButton.style.display = 'none';
      stopButton.style.display = 'inline-block';
      console.log("Scanner started");
    }).catch(error => {
      console.error("Failed to start scanner:", error);
      showError("Failed to start scanner. Please check camera permissions.");
    });
  } catch (error) {
    console.error("Error starting scanner:", error);
    showError("Error initializing scanner. Please try again.");
  }
}

// Stop scanner
function stopScanner() {
  if (html5QrCode && isScanning) {
    html5QrCode.stop().then(() => {
      // Update UI
      isScanning = false;
      startButton.style.display = 'inline-block';
      stopButton.style.display = 'none';
      console.log("Scanner stopped");
    }).catch(error => {
      console.error("Error stopping scanner:", error);
    });
  }
}

// Handle successful scan
function onScanSuccess(decodedText) {
  console.log("Successful scan:", decodedText);
  
  // Play beep sound
  playBeep();
  
  // Stop scanner
  stopScanner();
  
  // Process employee ID
  checkInEmployee(decodedText.trim());
}

// Handle scan errors
function onScanError(error) {
  // Just log errors, don't show to user
  console.log("QR scan error:", error);
}

// Check in employee
async function checkInEmployee(riderId) {
  // Hide previous messages
  hideMessages();
  
  // Validate employee ID
  if (!riderId || riderId.length !== 5 || !/^\d+$/.test(riderId)) {
    showError('Invalid employee ID. Please enter a valid 5-digit ID.');
    return;
  }
  
  // Prepare check-in data
  const checkInData = {
    riderId,
    location: 'Bus Stop',
    note: 'Checked in by driver'
  };
  
  try {
    // Send API request
    const response = await fetch('/api/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkInData),
      credentials: 'include'
    });
    
    if (response.ok) {
      // Success
      const trip = await response.json();
      console.log('Check-in successful:', trip);
      
      // Show success message
      showSuccess(`Employee ${trip.riderId} has been successfully checked in!`);
      
      // Update trip details
      tripId.textContent = trip.id;
      tripEmployee.textContent = trip.riderId;
      tripLocation.textContent = trip.location;
      tripTime.textContent = formatDateTime(trip.timestamp || trip.check_in_time);
      tripNote.textContent = trip.note || 'No note provided';
      
      // Show trip details
      tripDetails.style.display = 'block';
      
      // Refresh recent check-ins
      fetchRecentCheckIns();
    } else {
      // API error
      const errorData = await response.json();
      console.error('Check-in failed:', errorData);
      
      // Show error message
      showError(errorData.message || 'Failed to check in employee. Please try again.');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('An error occurred. Please check your connection and try again.');
  }
}

// Fetch recent check-ins
async function fetchRecentCheckIns() {
  if (!currentUser) {
    console.error("No current user for check-ins");
    return;
  }
  
  try {
    tripsContainer.innerHTML = '<div style="text-align: center; padding: 20px;">Loading check-ins...</div>';
    
    const response = await fetch('/api/trips/recent?limit=10', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const trips = await response.json();
      renderTripHistory(trips);
    } else {
      console.error('Failed to fetch recent check-ins:', await response.text());
      tripsContainer.innerHTML = '<div style="text-align: center; padding: 20px;">Failed to load recent check-ins</div>';
    }
  } catch (error) {
    console.error('Error fetching recent check-ins:', error);
    tripsContainer.innerHTML = '<div style="text-align: center; padding: 20px;">Failed to load recent check-ins</div>';
  }
}

// Show success message
function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.style.display = 'block';
  errorMessage.style.display = 'none';
}

// Show error message
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  successMessage.style.display = 'none';
}

// Hide messages
function hideMessages() {
  successMessage.style.display = 'none';
  errorMessage.style.display = 'none';
}

// Play beep sound
function playBeep() {
  try {
    const beep = new Audio('data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAFAAAGUACFhYWFhYWFhYWFhYWFhYWFhYWFvb29vb29vb29vb29vb29vb29vb3f39/f39/f39/f39/f39/f39/f3////////////////wAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQCkAAAAAAAAAZQOGZkbgAAAAAAAAAAAAAAAAD/+xDEAAAHMAN/tAAAIgZIb/Z4ABIEAAFYIAAT8ogAAhHxQQEBAQE3d3cRI3cQEMuBAQx3EBAQEiIAAAAAAAxn///+AgICAgRERERERIiIiIiJVVVVVVV3d3d3d3e7u7u7u7vd3d3d3d4AAAABAQAQCBAAAAAAAAAAAAAAAAA=');
    beep.play();
  } catch (error) {
    console.error("Error playing beep:", error);
  }
}

// Format date and time
function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

// Render trip history
function renderTripHistory(trips) {
  if (!trips || trips.length === 0) {
    tripsContainer.innerHTML = '<div style="text-align: center; padding: 20px;">No recent check-ins found</div>';
    return;
  }
  
  // Create table
  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Date & Time</th>
        <th>Employee ID</th>
        <th>Location</th>
        <th>Note</th>
      </tr>
    </thead>
    <tbody id="trip-list"></tbody>
  `;
  
  const tripList = table.querySelector('#trip-list');
  
  // Add rows for each trip
  trips.forEach(trip => {
    const row = document.createElement('tr');
    
    // Determine timestamp field (compatibility with both formats)
    const timestamp = trip.timestamp || trip.check_in_time;
    
    row.innerHTML = `
      <td>${formatDateTime(timestamp)}</td>
      <td>${trip.riderId}</td>
      <td>${trip.location || 'Not specified'}</td>
      <td>${trip.note || 'No note'}</td>
    `;
    
    tripList.appendChild(row);
  });
  
  // Update container
  tripsContainer.innerHTML = '';
  tripsContainer.appendChild(table);
}
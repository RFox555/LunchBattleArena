// Driver Ratings Dashboard Component
// This file provides functionality for displaying driver rating statistics and individual ratings

// Initialize the ratings display
function initializeRatings(driverId) {
  // Fetch and display rating statistics
  fetchRatingStats(driverId);
  
  // Fetch and display recent ratings
  fetchRecentRatings(driverId);
  
  console.log('Ratings dashboard initialized for driver ID:', driverId);
}

// Fetch rating statistics for the driver
function fetchRatingStats(driverId) {
  fetch(`/api/bus-ratings/stats/${driverId}`)
    .then(response => {
      if (!response.ok) throw new Error('Failed to fetch rating statistics');
      return response.json();
    })
    .then(stats => {
      displayRatingStats(stats);
    })
    .catch(error => {
      console.error('Error fetching rating statistics:', error);
      displayError('Failed to load rating statistics. Please try again later.');
    });
}

// Display rating statistics in the UI
function displayRatingStats(stats) {
  // Update the rating overview section
  document.getElementById('ratingOverall').textContent = stats.averageOverall.toFixed(1);
  document.getElementById('ratingComfort').textContent = stats.averageComfort.toFixed(1);
  document.getElementById('ratingCleanliness').textContent = stats.averageCleanliness.toFixed(1);
  document.getElementById('totalRatings').textContent = stats.totalRatings;
  
  // Update progress bars
  const overallPercent = (stats.averageOverall / 5) * 100;
  const comfortPercent = (stats.averageComfort / 5) * 100;
  const cleanlinessPercent = (stats.averageCleanliness / 5) * 100;
  
  document.getElementById('overallProgress').style.width = `${overallPercent}%`;
  document.getElementById('comfortProgress').style.width = `${comfortPercent}%`;
  document.getElementById('cleanlinessProgress').style.width = `${cleanlinessPercent}%`;
  
  // Set appropriate colors for the progress bars based on ratings
  setProgressColor('overallProgress', stats.averageOverall);
  setProgressColor('comfortProgress', stats.averageComfort);
  setProgressColor('cleanlinessProgress', stats.averageCleanliness);
  
  // Show the stats container
  document.getElementById('ratingStats').classList.remove('d-none');
}

// Set the appropriate color for progress bars based on rating value
function setProgressColor(elementId, ratingValue) {
  const element = document.getElementById(elementId);
  element.classList.remove('bg-success', 'bg-warning', 'bg-danger');
  
  if (ratingValue >= 4) {
    element.classList.add('bg-success');
  } else if (ratingValue >= 3) {
    element.classList.add('bg-warning');
  } else {
    element.classList.add('bg-danger');
  }
}

// Fetch recent ratings for the driver
function fetchRecentRatings(driverId) {
  fetch(`/api/bus-ratings/driver/${driverId}`)
    .then(response => {
      if (!response.ok) throw new Error('Failed to fetch ratings');
      return response.json();
    })
    .then(ratings => {
      displayRatings(ratings);
    })
    .catch(error => {
      console.error('Error fetching ratings:', error);
      displayError('Failed to load ratings. Please try again later.');
    });
}

// Display the list of ratings in the UI
function displayRatings(ratings) {
  const container = document.getElementById('ratingsContainer');
  
  // Clear existing content
  container.innerHTML = '';
  
  if (ratings.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info">
        No ratings have been submitted yet. Check back later for employee feedback.
      </div>
    `;
    return;
  }
  
  // Sort ratings by date (most recent first)
  ratings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  // Create a card for each rating
  ratings.forEach(rating => {
    const card = createRatingCard(rating);
    container.appendChild(card);
  });
}

// Create a card element for a single rating
function createRatingCard(rating) {
  // Format date
  const date = new Date(rating.timestamp);
  const formattedDate = date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Create card element
  const card = document.createElement('div');
  card.className = 'card mb-3';
  
  // Set card header color based on overall rating
  let headerClass = 'bg-success';
  if (rating.overallRating < 4) {
    headerClass = rating.overallRating >= 3 ? 'bg-warning' : 'bg-danger';
  }
  
  // Generate HTML for star ratings
  const generateStars = (count) => {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += `<i class="fas fa-star${i <= count ? ' text-warning' : ' text-muted'}"></i>`;
    }
    return stars;
  };
  
  // Build the card HTML
  card.innerHTML = `
    <div class="card-header ${headerClass} text-white d-flex justify-content-between align-items-center">
      <h5 class="mb-0">Overall Rating: ${rating.overallRating}/5</h5>
      <span class="badge bg-light text-dark">${formattedDate}</span>
    </div>
    <div class="card-body">
      <div class="row mb-3">
        <div class="col-md-6">
          <p class="card-text mb-1"><strong>Comfort:</strong> ${generateStars(rating.comfortRating)}</p>
        </div>
        <div class="col-md-6">
          <p class="card-text mb-1"><strong>Cleanliness:</strong> ${generateStars(rating.cleanlinessRating)}</p>
        </div>
      </div>
      ${rating.comment ? `
        <div class="comment-section">
          <h6>Comment:</h6>
          <p class="card-text border-start border-4 border-secondary ps-3 py-2 bg-light">${escapeHtml(rating.comment)}</p>
        </div>
      ` : ''}
    </div>
  `;
  
  return card;
}

// Helper function to escape HTML in user-provided content
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Display error message
function displayError(message) {
  const container = document.getElementById('ratingsContainer');
  container.innerHTML = `
    <div class="alert alert-danger">
      <i class="fas fa-exclamation-triangle me-2"></i> ${message}
    </div>
  `;
}
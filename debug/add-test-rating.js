// Script to add a test rating
import { db } from '../server/db.js';
import { busRatings } from '../shared/schema.js';

async function addTestRating() {
  try {
    console.log('Adding test bus rating...');
    
    // Insert a test rating
    const [rating] = await db
      .insert(busRatings)
      .values({
        driverId: 1, // Assuming driver1 has ID 1
        riderId: '12345', // Assuming rider1 has ID 12345
        comfortRating: 4,
        cleanlinessRating: 5,
        overallRating: 4,
        comment: 'This is a test rating from the debug script. The bus was very clean!'
      })
      .returning();
    
    console.log('Successfully added test rating:', rating);
  } catch (error) {
    console.error('Error adding test rating:', error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

// Run the function
addTestRating();
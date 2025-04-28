import { db, closePool } from '../server/db';
import { busRatings } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { storage } from '../server/storage';

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
    
    // Get ratings for driver
    console.log('\nFetching ratings for driver ID 1:');
    const driverRatings = await db
      .select()
      .from(busRatings)
      .where(eq(busRatings.driverId, 1));
    
    console.log(`Found ${driverRatings.length} ratings for driver 1:`);
    
    // Display each rating
    driverRatings.forEach((r, i) => {
      console.log(`\nRating #${i+1}:`);
      console.log(`Comfort: ${r.comfortRating}/5`);
      console.log(`Cleanliness: ${r.cleanlinessRating}/5`);
      console.log(`Overall: ${r.overallRating}/5`);
      console.log(`Comment: ${r.comment || 'No comment'}`);
      console.log(`Timestamp: ${r.timestamp}`);
    });
    
    // Calculate and display rating statistics
    if (driverRatings.length > 0) {
      const totalComfort = driverRatings.reduce((sum, r) => sum + r.comfortRating, 0);
      const totalCleanliness = driverRatings.reduce((sum, r) => sum + r.cleanlinessRating, 0);
      const totalOverall = driverRatings.reduce((sum, r) => sum + r.overallRating, 0);
      
      const avgComfort = totalComfort / driverRatings.length;
      const avgCleanliness = totalCleanliness / driverRatings.length;
      const avgOverall = totalOverall / driverRatings.length;
      
      console.log('\n----- RATING STATISTICS -----');
      console.log(`Average Comfort: ${avgComfort.toFixed(2)}/5`);
      console.log(`Average Cleanliness: ${avgCleanliness.toFixed(2)}/5`);
      console.log(`Average Overall: ${avgOverall.toFixed(2)}/5`);
      console.log(`Total Ratings: ${driverRatings.length}`);
      console.log('----------------------------');
    }
    
    // Test the storage.getBusRatingStats method
    console.log('\nTesting storage.getBusRatingStats method:');
    const ratingStats = await storage.getBusRatingStats(1);
    console.log('Rating statistics from storage method:');
    console.log(ratingStats);
    
    // Test retrieval by rider ID
    console.log('\nTesting storage.getBusRatingsByRiderId method:');
    const riderRatings = await storage.getBusRatingsByRiderId('12345');
    console.log(`Found ${riderRatings.length} ratings for rider 12345:`);
    console.log(riderRatings.map(r => ({
      id: r.id,
      driverId: r.driverId,
      comfortRating: r.comfortRating,
      cleanlinessRating: r.cleanlinessRating,
      overallRating: r.overallRating,
      timestamp: r.timestamp.toISOString()
    })));
    
  } catch (error) {
    console.error('Error in test script:', error);
  } finally {
    // Close the database connection
    await closePool();
    console.log('Database connection closed');
  }
}

// Run the function
addTestRating();
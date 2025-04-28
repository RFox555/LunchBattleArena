import { db, closePool } from '../server/db';
import { busRatings } from '../shared/schema';
import { eq } from 'drizzle-orm';

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
    driverRatings.forEach((r, i) => {
      console.log(`\nRating #${i+1}:`);
      console.log(`Comfort: ${r.comfortRating}/5`);
      console.log(`Cleanliness: ${r.cleanlinessRating}/5`);
      console.log(`Overall: ${r.overallRating}/5`);
      console.log(`Comment: ${r.comment || 'No comment'}`);
      console.log(`Timestamp: ${r.timestamp}`);
    });
    
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
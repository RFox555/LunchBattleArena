import { eq, desc, sql, and, avg } from "drizzle-orm";
import { db } from "./db";
import { 
  users, trips, busLocations, busRatings,
  type User, type InsertUser, 
  type Trip, type InsertTrip,
  type BusLocation, type InsertBusLocation, type UpdateBusLocation,
  type BusRating, type InsertBusRating
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// Interface for storage operations
export interface IStorage {
  // Session store
  sessionStore: session.Store;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByRiderId(riderId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  generateRiderId(): Promise<string>;
  listUsers(userType?: string): Promise<User[]>;
  
  // Trip operations
  createTrip(trip: InsertTrip): Promise<Trip>;
  getTrip(id: number): Promise<Trip | undefined>;
  getTripsByRiderId(riderId: string): Promise<Trip[]>;
  getTripsByDriverId(driverId: number): Promise<Trip[]>;
  completeTrip(id: number): Promise<Trip | undefined>;
  listRecentTrips(limit?: number): Promise<Trip[]>;
  
  // Bus location operations
  createBusLocation(location: InsertBusLocation): Promise<BusLocation>;
  getLatestBusLocation(driverId: number): Promise<BusLocation | undefined>;
  updateBusLocation(driverId: number, location: UpdateBusLocation): Promise<BusLocation | undefined>;
  listActiveBusLocations(): Promise<BusLocation[]>;
  getBusLocationHistory(driverId: number, limit?: number): Promise<BusLocation[]>;
  
  // Bus ratings operations
  createBusRating(rating: InsertBusRating): Promise<BusRating>;
  getBusRating(id: number): Promise<BusRating | undefined>;
  getBusRatingsByDriverId(driverId: number, limit?: number): Promise<BusRating[]>;
  getBusRatingsByRiderId(riderId: string): Promise<BusRating[]>;
  getBusRatingStats(driverId: number): Promise<{
    averageComfort: number;
    averageCleanliness: number;
    averageOverall: number;
    totalRatings: number;
  }>;
  
  // Setup operations
  setupDatabase(): Promise<void>;
  seedTestData(): Promise<void>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Create a PostgreSQL session store
    const PostgresStore = connectPg(session);
    this.sessionStore = new PostgresStore({
      pool,
      createTableIfMissing: true,
      tableName: 'session'
    });
  }

  // Set up the database with tables and initial data
  async setupDatabase(): Promise<void> {
    console.log("Setting up database...");
    try {
      // Check if tables exist
      const hasUsers = await this.hasTable("users");
      const hasTrips = await this.hasTable("trips");
      const hasBusLocations = await this.hasTable("bus_locations");
      const hasBusRatings = await this.hasTable("bus_ratings");
      
      if (!hasUsers || !hasTrips || !hasBusLocations || !hasBusRatings) {
        console.log("Creating database schema...");
        // Push the schema to the database
        await this.pushSchema();
        // Add test data
        await this.seedTestData();
      } else {
        console.log("Database schema already exists");
      }
    } catch (error) {
      console.error("Error setting up database:", error);
      throw error;
    }
  }

  // Check if a table exists
  private async hasTable(tableName: string): Promise<boolean> {
    try {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [tableName]);
      
      return result.rows[0].exists;
    } catch (error) {
      console.error(`Error checking if table ${tableName} exists:`, error);
      return false;
    }
  }

  // Push schema to database (this would normally use drizzle-kit but we're doing it manually)
  private async pushSchema(): Promise<void> {
    try {
      // Create users table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          user_type TEXT NOT NULL,
          rider_id TEXT,
          name TEXT NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
      
      // Create trips table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS trips (
          id SERIAL PRIMARY KEY,
          rider_id TEXT NOT NULL,
          driver_id INTEGER NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          location TEXT,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          note TEXT
        );
      `);

      // Create bus_locations table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS bus_locations (
          id SERIAL PRIMARY KEY,
          driver_id INTEGER NOT NULL,
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          heading INTEGER,
          speed DOUBLE PRECISION,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          route_name TEXT,
          status TEXT DEFAULT 'active'
        );
      `);
      
      // Create bus_ratings table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS bus_ratings (
          id SERIAL PRIMARY KEY,
          driver_id INTEGER NOT NULL,
          rider_id TEXT NOT NULL,
          trip_id INTEGER,
          comfort_rating INTEGER NOT NULL,
          cleanliness_rating INTEGER NOT NULL,
          overall_rating INTEGER NOT NULL,
          comment TEXT,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
      
      console.log("Database schema created successfully");
    } catch (error) {
      console.error("Error creating database schema:", error);
      throw error;
    }
  }

  // Add test data to the database
  async seedTestData(): Promise<void> {
    console.log("Seeding test data...");
    try {
      // Check if we already have users
      const existingUsers = await db.select().from(users).limit(1);
      if (existingUsers.length > 0) {
        console.log("Test data already exists");
        return;
      }
      
      // Create test driver
      const driver = await this.createUser({
        username: "driver1",
        password: "password123",
        name: "John Driver",
        userType: "driver"
      });
      
      // Create test rider
      const rider = await this.createUser({
        username: "rider1",
        password: "password123",
        name: "Jane Rider",
        userType: "rider",
        riderId: "12345"
      });
      
      // Create test trips
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      await db.insert(trips).values([
        {
          driverId: driver.id,
          riderId: rider.riderId!,
          timestamp: yesterday,
          location: "Main Street Bus Stop",
          note: "Morning commute",
          completed: true
        },
        {
          driverId: driver.id,
          riderId: rider.riderId!,
          timestamp: twoDaysAgo,
          location: "Downtown Transit Center",
          note: "Afternoon return",
          completed: true
        }
      ]);
      
      console.log("Test data seeded successfully");
    } catch (error) {
      console.error("Error seeding test data:", error);
      throw error;
    }
  }

  // Get user by ID
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return undefined;
    }
  }

  // Get user by username
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  // Get user by rider ID
  async getUserByRiderId(riderId: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.riderId, riderId));
      return user;
    } catch (error) {
      console.error("Error getting user by rider ID:", error);
      return undefined;
    }
  }

  // Create a new user
  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // If user is a rider, make sure they have a rider ID
      let riderId = insertUser.riderId;
      
      if (insertUser.userType === "rider") {
        if (riderId) {
          // Check if the rider ID is already taken
          const existingUser = await this.getUserByRiderId(riderId);
          if (existingUser) {
            throw new Error("This Rider ID is already in use. Please choose another one.");
          }
        } else {
          // Generate a rider ID if not provided
          riderId = await this.generateRiderId();
        }
      }
      
      // Create the user with complete data
      const userData = {
        ...insertUser,
        riderId: insertUser.userType === "rider" ? riderId : null
      };
      
      // Insert the user and get the result
      const [user] = await db.insert(users).values(userData).returning();
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  // Generate a unique rider ID
  async generateRiderId(): Promise<string> {
    // Try up to 10 times to generate a unique ID
    for (let i = 0; i < 10; i++) {
      const riderId = Math.floor(10000 + Math.random() * 90000).toString();
      
      // Check if the ID is already taken
      const existingUser = await this.getUserByRiderId(riderId);
      if (!existingUser) {
        return riderId;
      }
    }
    
    throw new Error("Failed to generate a unique rider ID after multiple attempts");
  }

  // List users, optionally filtering by user type
  async listUsers(userType?: string): Promise<User[]> {
    try {
      if (userType) {
        return await db
          .select()
          .from(users)
          .where(and(
            eq(users.userType, userType),
            eq(users.isActive, true)
          ));
      } else {
        return await db
          .select()
          .from(users)
          .where(eq(users.isActive, true));
      }
    } catch (error) {
      console.error("Error listing users:", error);
      return [];
    }
  }

  // Create a new trip
  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    try {
      console.log("Creating trip with data:", insertTrip);
      
      // Insert with current timestamp and default values for optional fields
      const [trip] = await db
        .insert(trips)
        .values({
          ...insertTrip,
          timestamp: new Date(),
          location: insertTrip.location || null,
          note: insertTrip.note || null
        })
        .returning();
      
      console.log("Trip created successfully:", trip);
      return trip;
    } catch (error) {
      console.error("Error creating trip:", error);
      throw error;
    }
  }

  // Get trip by ID
  async getTrip(id: number): Promise<Trip | undefined> {
    try {
      const [trip] = await db.select().from(trips).where(eq(trips.id, id));
      return trip;
    } catch (error) {
      console.error("Error getting trip by ID:", error);
      return undefined;
    }
  }

  // Get trips by rider ID
  async getTripsByRiderId(riderId: string): Promise<Trip[]> {
    try {
      return await db
        .select()
        .from(trips)
        .where(eq(trips.riderId, riderId))
        .orderBy(desc(trips.timestamp));
    } catch (error) {
      console.error("Error getting trips by rider ID:", error);
      return [];
    }
  }

  // Get trips by driver ID
  async getTripsByDriverId(driverId: number): Promise<Trip[]> {
    try {
      return await db
        .select()
        .from(trips)
        .where(eq(trips.driverId, driverId))
        .orderBy(desc(trips.timestamp));
    } catch (error) {
      console.error("Error getting trips by driver ID:", error);
      return [];
    }
  }

  // Mark a trip as completed
  async completeTrip(id: number): Promise<Trip | undefined> {
    try {
      const [trip] = await db
        .update(trips)
        .set({ completed: true })
        .where(eq(trips.id, id))
        .returning();
      
      return trip;
    } catch (error) {
      console.error("Error completing trip:", error);
      return undefined;
    }
  }

  // List recent trips with optional limit
  async listRecentTrips(limit: number = 10): Promise<Trip[]> {
    try {
      return await db
        .select()
        .from(trips)
        .orderBy(desc(trips.timestamp))
        .limit(limit);
    } catch (error) {
      console.error("Error listing recent trips:", error);
      return [];
    }
  }

  // Create a new bus location entry
  async createBusLocation(location: InsertBusLocation): Promise<BusLocation> {
    try {
      console.log("Creating bus location with data:", location);
      
      // Insert with current timestamp and provided values
      const [busLocation] = await db
        .insert(busLocations)
        .values({
          ...location,
          timestamp: new Date()
        })
        .returning();
      
      console.log("Bus location created successfully:", busLocation);
      return busLocation;
    } catch (error) {
      console.error("Error creating bus location:", error);
      throw error;
    }
  }

  // Get the latest location for a specific driver
  async getLatestBusLocation(driverId: number): Promise<BusLocation | undefined> {
    try {
      const [location] = await db
        .select()
        .from(busLocations)
        .where(eq(busLocations.driverId, driverId))
        .orderBy(desc(busLocations.timestamp))
        .limit(1);
      
      return location;
    } catch (error) {
      console.error("Error getting latest bus location:", error);
      return undefined;
    }
  }

  // Update a bus location (creates a new record with updated info)
  async updateBusLocation(driverId: number, location: UpdateBusLocation): Promise<BusLocation | undefined> {
    try {
      // Create a new location record with updated data
      const [updatedLocation] = await db
        .insert(busLocations)
        .values({
          driverId,
          latitude: location.latitude,
          longitude: location.longitude,
          heading: location.heading || undefined,
          speed: location.speed || undefined,
          routeName: location.routeName || undefined,
          status: location.status || 'active',
          timestamp: new Date()
        })
        .returning();
      
      return updatedLocation;
    } catch (error) {
      console.error("Error updating bus location:", error);
      return undefined;
    }
  }

  // List all active bus locations (for map display)
  async listActiveBusLocations(): Promise<BusLocation[]> {
    try {
      // Create a subquery to get the latest location for each driver
      const subquery = db
        .select({
          driverId: busLocations.driverId,
          maxTimestamp: sql`MAX(${busLocations.timestamp})`.as('max_timestamp')
        })
        .from(busLocations)
        .where(eq(busLocations.status, 'active'))
        .groupBy(busLocations.driverId)
        .as('latest_locations');
      
      // Join with the main table to get the full location data
      const locations = await db
        .select()
        .from(busLocations)
        .innerJoin(
          subquery,
          and(
            eq(busLocations.driverId, subquery.driverId),
            eq(busLocations.timestamp, subquery.maxTimestamp)
          )
        );
      
      // Extract just the bus location data from the join result
      return locations.map(result => result.bus_locations);
    } catch (error) {
      console.error("Error listing active bus locations:", error);
      return [];
    }
  }

  // Get location history for a specific driver
  async getBusLocationHistory(driverId: number, limit: number = 20): Promise<BusLocation[]> {
    try {
      return await db
        .select()
        .from(busLocations)
        .where(eq(busLocations.driverId, driverId))
        .orderBy(desc(busLocations.timestamp))
        .limit(limit);
    } catch (error) {
      console.error("Error getting bus location history:", error);
      return [];
    }
  }

  // Create a new bus rating
  async createBusRating(rating: InsertBusRating): Promise<BusRating> {
    try {
      console.log("Creating bus rating with data:", rating);
      
      // Insert with current timestamp
      const [busRating] = await db
        .insert(busRatings)
        .values({
          ...rating,
          timestamp: new Date()
        })
        .returning();
      
      console.log("Bus rating created successfully:", busRating);
      return busRating;
    } catch (error) {
      console.error("Error creating bus rating:", error);
      throw error;
    }
  }

  // Get bus rating by ID
  async getBusRating(id: number): Promise<BusRating | undefined> {
    try {
      const [rating] = await db.select().from(busRatings).where(eq(busRatings.id, id));
      return rating;
    } catch (error) {
      console.error("Error getting bus rating by ID:", error);
      return undefined;
    }
  }

  // Get ratings for a specific driver
  async getBusRatingsByDriverId(driverId: number, limit: number = 50): Promise<BusRating[]> {
    try {
      return await db
        .select()
        .from(busRatings)
        .where(eq(busRatings.driverId, driverId))
        .orderBy(desc(busRatings.timestamp))
        .limit(limit);
    } catch (error) {
      console.error("Error getting ratings for driver:", error);
      return [];
    }
  }

  // Get ratings submitted by a specific rider
  async getBusRatingsByRiderId(riderId: string): Promise<BusRating[]> {
    try {
      return await db
        .select()
        .from(busRatings)
        .where(eq(busRatings.riderId, riderId))
        .orderBy(desc(busRatings.timestamp));
    } catch (error) {
      console.error("Error getting ratings by rider:", error);
      return [];
    }
  }

  // Get rating statistics for a driver
  async getBusRatingStats(driverId: number): Promise<{
    averageComfort: number;
    averageCleanliness: number;
    averageOverall: number;
    totalRatings: number;
  }> {
    try {
      // Query for calculating averages and count
      const [result] = await db
        .select({
          averageComfort: avg(busRatings.comfortRating),
          averageCleanliness: avg(busRatings.cleanlinessRating),
          averageOverall: avg(busRatings.overallRating),
          totalRatings: sql<number>`count(*)`.as('total_ratings')
        })
        .from(busRatings)
        .where(eq(busRatings.driverId, driverId));
      
      // Format and handle null values - convert any type to number safely
      const comfortAvg = result.averageComfort ? Number(result.averageComfort) : 0;
      const cleanlinessAvg = result.averageCleanliness ? Number(result.averageCleanliness) : 0;
      const overallAvg = result.averageOverall ? Number(result.averageOverall) : 0;
        
      return {
        averageComfort: Math.round(comfortAvg * 10) / 10, // Round to 1 decimal place
        averageCleanliness: Math.round(cleanlinessAvg * 10) / 10,
        averageOverall: Math.round(overallAvg * 10) / 10,
        totalRatings: result.totalRatings || 0
      };
    } catch (error) {
      console.error("Error getting rating statistics:", error);
      return {
        averageComfort: 0,
        averageCleanliness: 0,
        averageOverall: 0,
        totalRatings: 0
      };
    }
  }
}

// Create and export the storage instance
export const storage = new DatabaseStorage();

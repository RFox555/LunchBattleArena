import { users, trips, type User, type InsertUser, type Trip, type InsertTrip } from "@shared/schema";

// Interface for storage operations
export interface IStorage {
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private trips: Map<number, Trip>;
  private riderIds: Set<string>;
  userCurrentId: number;
  tripCurrentId: number;

  constructor() {
    this.users = new Map();
    this.trips = new Map();
    this.riderIds = new Set();
    this.userCurrentId = 1;
    this.tripCurrentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByRiderId(riderId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.riderId === riderId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    let riderId: string | null = null;
    
    if (insertUser.userType === "rider") {
      riderId = await this.generateRiderId();
    }
    
    const user: User = { 
      ...insertUser, 
      id, 
      riderId: riderId || null,
      isActive: true,
      createdAt: new Date()
    };
    
    this.users.set(id, user);
    if (riderId) {
      this.riderIds.add(riderId);
    }
    
    return user;
  }

  async generateRiderId(): Promise<string> {
    // Generate a random 5-digit ID that doesn't exist yet
    let riderId: string;
    do {
      riderId = Math.floor(10000 + Math.random() * 90000).toString();
    } while (this.riderIds.has(riderId));
    
    return riderId;
  }

  async listUsers(userType?: string): Promise<User[]> {
    if (userType) {
      return Array.from(this.users.values()).filter(
        (user) => user.userType === userType && user.isActive
      );
    }
    return Array.from(this.users.values()).filter(user => user.isActive);
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const id = this.tripCurrentId++;
    const trip: Trip = {
      ...insertTrip,
      id,
      timestamp: new Date(),
      completed: false,
    };
    
    this.trips.set(id, trip);
    return trip;
  }

  async getTrip(id: number): Promise<Trip | undefined> {
    return this.trips.get(id);
  }

  async getTripsByRiderId(riderId: string): Promise<Trip[]> {
    return Array.from(this.trips.values()).filter(
      (trip) => trip.riderId === riderId
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getTripsByDriverId(driverId: number): Promise<Trip[]> {
    return Array.from(this.trips.values()).filter(
      (trip) => trip.driverId === driverId
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async completeTrip(id: number): Promise<Trip | undefined> {
    const trip = this.trips.get(id);
    if (trip) {
      const updatedTrip = { ...trip, completed: true };
      this.trips.set(id, updatedTrip);
      return updatedTrip;
    }
    return undefined;
  }

  async listRecentTrips(limit: number = 10): Promise<Trip[]> {
    return Array.from(this.trips.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}

export const storage = new MemStorage();

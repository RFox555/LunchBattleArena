import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertTripSchema, loginSchema } from "@shared/schema";
import express from "express";
import session from "express-session";
import { ZodError } from "zod";
import MemoryStore from "memorystore";

// Extend the Express session with our custom properties
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userType?: 'driver' | 'rider';
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session
  const SessionStore = MemoryStore(session);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "bus-tracker-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
      store: new SessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Authentication middleware
  const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
    console.log("Authentication check:", {
      sessionId: req.session.id,
      userId: req.session.userId,
      userType: req.session.userType,
      path: req.path,
      method: req.method
    });
    
    if (!req.session.userId) {
      console.log("Authentication failed: No userId in session");
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(data.username);
      
      if (!user || user.password !== data.password || user.userType !== data.userType) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Set user session
      req.session.userId = user.id;
      req.session.userType = user.userType;
      
      console.log("User logged in successfully", { 
        userId: user.id,
        userType: user.userType,
        riderId: user.riderId,
        sessionId: req.session.id
      });
      
      // Remove password from response
      const { password, ...safeUser } = user;
      return res.status(200).json(safeUser);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      return res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...safeUser } = user;
      return res.status(200).json(safeUser);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if rider ID exists (for riders only)
      if (userData.userType === "rider" && userData.riderId) {
        const existingRider = await storage.getUserByRiderId(userData.riderId);
        if (existingRider) {
          return res.status(400).json({ message: "This Rider ID is already in use. Please choose another one." });
        }
      }
      
      const user = await storage.createUser(userData);
      
      // Remove password from response
      const { password, ...safeUser } = user;
      return res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users", authenticateUser, async (req, res) => {
    try {
      const userType = req.query.userType as string | undefined;
      const users = await storage.listUsers(userType);
      
      // Remove passwords from response
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      return res.status(200).json(safeUsers);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/by-rider-id/:riderId", authenticateUser, async (req, res) => {
    try {
      const { riderId } = req.params;
      const user = await storage.getUserByRiderId(riderId);
      
      if (!user) {
        return res.status(404).json({ message: "Rider not found" });
      }
      
      // Remove password from response
      const { password, ...safeUser } = user;
      return res.status(200).json(safeUser);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Trip routes
  app.post("/api/check-in", authenticateUser, async (req, res) => {
    try {
      console.log("Check-in request received", {
        body: req.body,
        session: {
          userId: req.session.userId,
          userType: req.session.userType
        }
      });
      
      // Only drivers can check in riders
      if (req.session.userType !== "driver") {
        console.log("Check-in failed: Not a driver", { userType: req.session.userType });
        return res.status(403).json({ message: "Only drivers can check in riders" });
      }
      
      const { riderId, location, note } = req.body;
      
      if (!riderId) {
        return res.status(400).json({ message: "Rider ID is required" });
      }
      
      // Verify that the rider exists
      const rider = await storage.getUserByRiderId(riderId);
      if (!rider) {
        console.log("Check-in failed: Rider not found", { riderId });
        return res.status(404).json({ message: "Rider not found" });
      }
      
      console.log("Rider found, creating trip", { 
        riderId: rider.riderId, 
        name: rider.name,
        driverId: req.session.userId 
      });
      
      const trip = await storage.createTrip({
        riderId,
        driverId: req.session.userId!,
        location: location || null,
        note: note || null
      });
      
      console.log("Check-in successful, trip created", { tripId: trip.id });
      return res.status(201).json(trip);
    } catch (error) {
      console.error("Check-in failed with error:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/trips", authenticateUser, async (req, res) => {
    try {
      console.log("Trip creation request received", {
        body: req.body,
        session: {
          userId: req.session.userId,
          userType: req.session.userType
        }
      });
      
      // Only drivers can create trips
      if (req.session.userType !== "driver") {
        console.log("Trip creation failed: Not a driver", { userType: req.session.userType });
        return res.status(403).json({ message: "Only drivers can create trips" });
      }
      
      try {
        const tripData = insertTripSchema.parse({
          ...req.body,
          driverId: req.session.userId,
        });
        console.log("Trip data validated", tripData);
        
        // Verify that the rider exists
        const rider = await storage.getUserByRiderId(tripData.riderId);
        if (!rider) {
          console.log("Trip creation failed: Rider not found", { riderId: tripData.riderId });
          return res.status(404).json({ message: "Rider not found" });
        }
        
        console.log("Rider found", { riderId: rider.riderId, name: rider.name });
        const trip = await storage.createTrip(tripData);
        console.log("Trip created successfully", { tripId: trip.id });
        return res.status(201).json(trip);
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          console.log("Trip creation failed: Validation error", validationError.errors);
          return res.status(400).json({ message: validationError.errors });
        }
        throw validationError;
      }
    } catch (error) {
      console.error("Trip creation failed with error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/trips", authenticateUser, async (req, res) => {
    try {
      console.log("Getting trips for user", {
        userId: req.session.userId,
        userType: req.session.userType
      });
      
      let trips: any[] = [];
      
      if (req.session.userType === "driver") {
        trips = await storage.getTripsByDriverId(req.session.userId!);
        console.log(`Found ${trips.length} trips for driver ${req.session.userId}`);
      } else if (req.session.userType === "rider") {
        const user = await storage.getUser(req.session.userId!);
        if (user && user.riderId) {
          trips = await storage.getTripsByRiderId(user.riderId);
          console.log(`Found ${trips.length} trips for rider ${user.riderId}`);
        } else {
          console.log("No riderId found for user", req.session.userId);
        }
      }
      
      return res.status(200).json(trips);
    } catch (error) {
      console.error("Error fetching trips:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/trips/recent", authenticateUser, async (req, res) => {
    try {
      console.log("Getting recent trips", {
        userId: req.session.userId,
        userType: req.session.userType
      });
      
      // Only drivers can see all recent trips
      if (req.session.userType !== "driver") {
        console.log("Access denied: not a driver", { userType: req.session.userType });
        return res.status(403).json({ message: "Access denied" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const trips: any[] = await storage.listRecentTrips(limit);
      console.log(`Found ${trips.length} recent trips`);
      return res.status(200).json(trips);
    } catch (error) {
      console.error("Error fetching recent trips:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/trips/:id/complete", authenticateUser, async (req, res) => {
    try {
      // Only drivers can complete trips
      if (req.session.userType !== "driver") {
        return res.status(403).json({ message: "Only drivers can complete trips" });
      }
      
      const { id } = req.params;
      const trip = await storage.completeTrip(parseInt(id));
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      return res.status(200).json(trip);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

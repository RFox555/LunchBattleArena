import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertTripSchema, loginSchema } from "@shared/schema";
import express from "express";
import session from "express-session";
import { ZodError } from "zod";
import MemoryStore from "memorystore";

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
  const authenticateUser = (req: Request, res: Response, next: () => void) => {
    if (!req.session.userId) {
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
  app.post("/api/trips", authenticateUser, async (req, res) => {
    try {
      // Only drivers can create trips
      if (req.session.userType !== "driver") {
        return res.status(403).json({ message: "Only drivers can create trips" });
      }
      
      const tripData = insertTripSchema.parse({
        ...req.body,
        driverId: req.session.userId,
      });
      
      // Verify that the rider exists
      const rider = await storage.getUserByRiderId(tripData.riderId);
      if (!rider) {
        return res.status(404).json({ message: "Rider not found" });
      }
      
      const trip = await storage.createTrip(tripData);
      return res.status(201).json(trip);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/trips", authenticateUser, async (req, res) => {
    try {
      let trips = [];
      
      if (req.session.userType === "driver") {
        trips = await storage.getTripsByDriverId(req.session.userId!);
      } else if (req.session.userType === "rider") {
        const user = await storage.getUser(req.session.userId!);
        if (user && user.riderId) {
          trips = await storage.getTripsByRiderId(user.riderId);
        }
      }
      
      return res.status(200).json(trips);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/trips/recent", authenticateUser, async (req, res) => {
    try {
      // Only drivers can see all recent trips
      if (req.session.userType !== "driver") {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const trips = await storage.listRecentTrips(limit);
      return res.status(200).json(trips);
    } catch (error) {
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

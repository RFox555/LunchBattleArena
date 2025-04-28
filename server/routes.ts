import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertTripSchema, loginSchema, checkInSchema, type Trip } from "@shared/schema";
import express from "express";
import session from "express-session";
import { ZodError } from "zod";
import { WebSocketServer } from "ws";

// Extend the Express session with our custom properties
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userType?: 'driver' | 'rider';
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up database first
  await storage.setupDatabase();
  
  // Setup session with PostgreSQL store
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "transportation-tracking-system-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      },
      store: storage.sessionStore
    })
  );

  // Authentication middleware
  const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      // Validate login data
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(data.username);
      
      // Check credentials
      if (!user || user.password !== data.password || user.userType !== data.userType) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Set user session
      req.session.userId = user.id;
      req.session.userType = user.userType;
      
      console.log("User logged in successfully", { 
        userId: user.id,
        userType: user.userType,
        riderId: user.riderId
      });
      
      // Return user data (without password)
      const { password, ...safeUser } = user;
      return res.status(200).json(safeUser);
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid login data", errors: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
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
      
      // Return user data (without password)
      const { password, ...safeUser } = user;
      return res.status(200).json(safeUser);
    } catch (error) {
      console.error("Authentication check error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // User management routes
  app.post("/api/users", async (req, res) => {
    try {
      // Validate user data
      const userData = insertUserSchema.parse(req.body);
      
      // Check for existing username
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check for existing rider ID
      if (userData.userType === "rider" && userData.riderId) {
        const existingRider = await storage.getUserByRiderId(userData.riderId);
        if (existingRider) {
          return res.status(400).json({ message: "This Rider ID is already in use. Please choose another one." });
        }
      }
      
      // Create the user
      const user = await storage.createUser(userData);
      
      // Return user data (without password)
      const { password, ...safeUser } = user;
      return res.status(201).json(safeUser);
    } catch (error) {
      console.error("User creation error:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
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
      console.error("Error listing users:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/by-rider-id/:riderId", authenticateUser, async (req, res) => {
    try {
      // Only drivers should look up employees (stored as 'rider' in database)
      if (req.session.userType !== "driver") {
        return res.status(403).json({ message: "Only drivers can look up employees" });
      }
      
      const { riderId } = req.params;
      if (!riderId || typeof riderId !== 'string') {
        return res.status(400).json({ message: "Invalid rider ID" });
      }

      // Find the employee (stored as rider in database)
      const user = await storage.getUserByRiderId(riderId);
      if (!user) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // Return employee data (without password)
      const { password, ...safeUser } = user;
      return res.status(200).json(safeUser);
    } catch (error) {
      console.error("Error looking up rider:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Trip management routes
  app.post("/api/check-in", authenticateUser, async (req, res) => {
    try {
      // Validate check-in data
      const data = checkInSchema.parse(req.body);
      
      // Only drivers can check in employees
      if (req.session.userType !== "driver") {
        return res.status(403).json({ message: "Only drivers can check in employees" });
      }
      
      // Make sure the employee exists
      const employee = await storage.getUserByRiderId(data.riderId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // Create the trip record
      const tripData = {
        riderId: data.riderId,
        driverId: req.session.userId!,
        location: data.location,
        note: data.note || null
      };
      
      const trip = await storage.createTrip(tripData);
      console.log("Check-in successful, trip created", { tripId: trip.id });
      
      return res.status(201).json(trip);
    } catch (error) {
      console.error("Check-in error:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid check-in data", errors: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Simplified trip creation endpoint
  app.post("/api/trips", authenticateUser, async (req, res) => {
    try {
      // Only drivers can create trips
      if (req.session.userType !== "driver") {
        return res.status(403).json({ message: "Only drivers can create trips" });
      }
      
      const { riderId, location, note } = req.body;
      
      if (!riderId) {
        return res.status(400).json({ message: "Rider ID is required" });
      }
      
      // Check if rider exists
      const rider = await storage.getUserByRiderId(riderId);
      if (!rider) {
        return res.status(404).json({ message: "Rider not found" });
      }
      
      // Create the trip with minimal validation
      const tripData = {
        riderId,
        driverId: req.session.userId!,
        location: location || "Unknown location",
        note: note || null
      };
      
      console.log("Creating trip with data:", tripData);
      
      const trip = await storage.createTrip(tripData);
      console.log("Trip created successfully", { tripId: trip.id });
      return res.status(201).json(trip);
    } catch (error) {
      console.error("Trip creation error:", error);
      return res.status(500).json({ message: "Failed to create trip" });
    }
  });
  
  // Direct trip creation endpoint without authentication
  app.post("/api/direct-trips", async (req, res) => {
    try {
      const { riderId, location, note } = req.body;
      
      if (!riderId) {
        return res.status(400).json({ message: "Rider ID is required" });
      }
      
      // Check if rider exists
      const rider = await storage.getUserByRiderId(riderId);
      if (!rider) {
        return res.status(404).json({ message: "Rider not found" });
      }
      
      // Get the first driver from the system
      const drivers = await storage.listUsers("driver");
      if (!drivers || drivers.length === 0) {
        return res.status(500).json({ message: "No drivers available in the system" });
      }
      
      // Create the trip with minimal validation
      const tripData = {
        riderId,
        driverId: drivers[0].id,
        location: location || "Unknown location",
        note: note || null
      };
      
      console.log("Creating direct trip with data:", tripData);
      
      const trip = await storage.createTrip(tripData);
      console.log("Direct trip created successfully", { tripId: trip.id });
      return res.status(201).json(trip);
    } catch (error) {
      console.error("Direct trip creation error:", error);
      return res.status(500).json({ message: "Failed to create trip" });
    }
  });

  app.get("/api/trips", authenticateUser, async (req, res) => {
    try {
      let trips: Trip[] = [];
      
      // Get trips based on user type
      if (req.session.userType === "driver") {
        trips = await storage.getTripsByDriverId(req.session.userId!);
      } else if (req.session.userType === "rider") {
        const user = await storage.getUser(req.session.userId!);
        if (user?.riderId) {
          trips = await storage.getTripsByRiderId(user.riderId);
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
      // Only drivers can see all recent trips
      if (req.session.userType !== "driver") {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const trips = await storage.listRecentTrips(limit);
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
      console.error("Error completing trip:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add direct routes for HTML pages
  
  // Home page (default route)
  app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public' });
  });
  
  // Test page
  app.get('/test', (req, res) => {
    res.sendFile('direct-test.html', { root: './public' });
  });
  
  // Login page
  app.get('/login', (req, res) => {
    res.sendFile('login.html', { root: './public' });
  });
  
  // Registration page
  app.get('/register', (req, res) => {
    res.sendFile('register.html', { root: './public' });
  });
  
  // Direct check-in page (no auth required)
  app.get('/direct-checkin', (req, res) => {
    res.sendFile('direct-checkin.html', { root: './public' });
  });
  
  // Backward compatibility - redirect old check-in URL to direct-checkin
  app.get('/check-in', (req, res) => {
    res.redirect('/direct-checkin');
  });
  
  // Employee dashboard page
  app.get('/employee-dashboard', (req, res) => {
    res.sendFile('employee-dashboard.html', { root: './public' });
  });
  
  // Backward compatibility - redirect old rider URL to employee dashboard
  app.get('/rider-dashboard', (req, res) => {
    res.redirect('/employee-dashboard');
  });
  
  // Driver check-in page with QR scanner
  app.get('/driver-checkin', (req, res) => {
    res.sendFile('driver-checkin.html', { root: './public' });
  });
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Create WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
      console.log('Received message:', message.toString());
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  return httpServer;
}

import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertTripSchema, loginSchema, checkInSchema, checkOutSchema,
  insertBusLocationSchema, updateBusLocationSchema, insertBusRatingSchema, busRatingFormSchema,
  masterListValidationSchema, driverCheckInSchema, driverCheckOutSchema,
  type Trip, type BusLocation, type BusRating
} from "@shared/schema";
import express from "express";
import session from "express-session";
import * as cookieParser from "cookie-parser";
import { ZodError } from "zod";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import fs from "fs";
import { registerMasterListRoutes } from "./master-list";

// Extend the Express session with our custom properties
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userType?: 'driver' | 'rider' | 'admin'; // 'rider' represents employees, 'admin' for administrators
    createdAt?: string; // Added for session timestamp tracking
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up database first
  await storage.setupDatabase();
  
  // Register master list routes
  registerMasterListRoutes(app);
  
  // Add cookie parser middleware
  app.use(cookieParser.default());
  
  // Setup session with simple memory store for now
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "transportation-tracking-system-secret",
      resave: false,
      saveUninitialized: false,
      rolling: false,
      cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
        httpOnly: true,
        sameSite: 'lax'
      }
    })
  );
  
  // Explicitly serve public static files first
  app.use(express.static(path.join(process.cwd(), 'public'), {
    // Set the index file to be served when a directory is requested
    index: ['index.html'],
    // Enable extensions to be omitted in the URL
    extensions: ['html']
  }));
  
  // Custom handler to serve HTML pages directly without redirects
  app.use((req, res, next) => {
    // Skip API requests and static files like css, js, images, etc.
    if (req.path.startsWith('/api') || 
        req.path.endsWith('.html') || 
        req.path.endsWith('.css') || 
        req.path.endsWith('.js') || 
        req.path.endsWith('.png') || 
        req.path.endsWith('.jpg') || 
        req.path.endsWith('.svg') ||
        req.path === '/') {
      return next();
    }
    
    // Check for specific pages we know should have .html extension
    const knownPages = ['/login', '/register', '/driver-checkin', '/employee-dashboard', 
                        '/driver-ratings', '/bus-tracking', '/rate-bus'];
    
    // Check if we're requesting a known page
    if (knownPages.includes(req.path)) {
      console.log(`Directly serving ${req.path} as ${req.path}.html`);
      // Directly serve the HTML file without redirect
      return res.sendFile(path.join(process.cwd(), 'public', `${req.path.substring(1)}.html`));
    }
    
    // For other paths, check if an HTML file exists and serve directly
    const htmlPath = path.join(process.cwd(), 'public', `${req.path.substring(1)}.html`);
    if (fs.existsSync(htmlPath)) {
      console.log(`Directly serving ${req.path} as ${req.path}.html`);
      return res.sendFile(htmlPath);
    }
    
    // If we reach here, let the next middleware handle it
    next();
  });

  // Authentication middleware - supports both session and token auth
  const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
    console.log('Auth check - checking both session and token');
    
    // First try token-based authentication
    const token = req.cookies.auth_token;
    if (token && (global as any).activeUsers && (global as any).activeUsers[token]) {
      const userData = (global as any).activeUsers[token];
      console.log('Token auth successful for user:', userData.username);
      
      // Set session-like data for compatibility
      req.session = req.session || {} as any;
      req.session.userId = userData.id;
      req.session.userType = userData.userType;
      
      return next();
    }
    
    // Fall back to session-based authentication
    console.log('Session check - session object exists:', !!req.session);
    console.log('Session check - userId in session:', req.session?.userId);
    
    if (!req.session || !req.session.userId) {
      console.log('Both auth methods failed - returning 401');
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Touch the session to keep it active
    req.session.touch();
    
    // Continue to the next middleware/route handler
    next();
  };
  
  // Middleware to check if user is an admin
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (req.session.userType !== "admin") {
      return res.status(403).json({ message: "Access denied. Only administrators can access this resource." });
    }
    
    next();
  };

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log("Login attempt - session exists:", !!req.session);
      
      // Validate login data
      const data = loginSchema.parse(req.body);
      console.log("Login attempt for username:", data.username);
      
      const user = await storage.getUserByUsername(data.username);
      
      // Special handling for admin login
      if (data.userType === 'admin') {
        // Database columns use snake_case, JS properties use camelCase
        if (!user || user.password !== data.password || user.isAdmin !== true) {
          console.log("Admin login failed - invalid credentials or not an admin");
          return res.status(401).json({ message: "Invalid credentials" });
        }
        // Set user type to admin for the session
        user.userType = 'admin';
      } else if (data.userType === 'rider') {
        // Employee login check with master list validation
        if (!user || user.password !== data.password || user.userType !== data.userType) {
          console.log("Employee login failed - invalid credentials");
          return res.status(401).json({ message: "Invalid credentials" });
        }
        
        // Check if this employee is on the master list
        if (user.riderId) {
          const isOnMasterList = await storage.isOnMasterList(user.riderId);
          if (!isOnMasterList) {
            console.log(`Employee ${user.username} (ID: ${user.riderId}) is not on the master list but can still log in with warning`);
            user.onMasterList = false;
          } else {
            user.onMasterList = true;
          }
        }
      } else {
        // Driver login check 
        if (!user || user.password !== data.password || user.userType !== data.userType) {
          console.log("Driver login failed - invalid credentials");
          return res.status(401).json({ message: "Invalid credentials" });
        }
      }
      
      // Create a simple token and store it in cookie
      const token = `user_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store user data in memory with token
      (global as any).activeUsers = (global as any).activeUsers || {};
      (global as any).activeUsers[token] = {
        id: user.id,
        username: user.username,
        userType: user.userType,
        name: user.name,
        riderId: user.riderId,
        loginTime: new Date()
      };
      
      console.log("Login successful - token created:", token);
      
      // Set token in cookie
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: false,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
      });
      
      // Return user data in the format the frontend expects
      const { password, ...safeUser } = user;
      return res.status(200).json({ 
        success: true, 
        user: safeUser 
      });
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
    console.log("Auth check - cookies:", req.cookies);
    const token = req.cookies.auth_token;
    console.log("Auth check - token:", token);
    console.log("Auth check - activeUsers:", (global as any).activeUsers ? Object.keys((global as any).activeUsers) : 'undefined');
    
    if (!token || !(global as any).activeUsers || !(global as any).activeUsers[token]) {
      console.log("Auth check failed - no valid token");
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const userData = (global as any).activeUsers[token];
    console.log("Token auth - user found:", userData.username);
    
    return res.status(200).json(userData);
  });

  // User management routes
  app.post("/api/users", async (req, res) => {
    try {
      // Validate user data
      const userData = insertUserSchema.parse(req.body);
      
      // SECURITY: Completely block admin account creation
      if (userData.userType === "admin") {
        // Block all admin registration, no exceptions
        return res.status(403).json({ 
          message: "Administrator accounts cannot be created through registration" 
        });
      }
      
      // Check for existing username
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check for existing employee ID (stored as rider ID in database)
      if (userData.userType === "rider" && userData.riderId) {
        const existingEmployee = await storage.getUserByRiderId(userData.riderId);
        if (existingEmployee) {
          return res.status(400).json({ message: "This Employee ID is already in use. Please choose another one." });
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
  
  // Update master list of active employees
  app.post("/api/master-list", requireAdmin, async (req, res) => {
    try {
      
      // Validate the request body
      const result = masterListValidationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid master list data", 
          details: result.error.format() 
        });
      }
      
      const data = result.data;
      console.log(`Updating master list with ${data.employeeIds.length} employee IDs`);
      
      // Update the master list
      const updateResult = await storage.updateMasterList(data.employeeIds);
      
      return res.status(200).json({
        message: "Master list updated successfully",
        updated: updateResult.updated,
        deactivated: updateResult.deactivated
      });
    } catch (error) {
      console.error("Error updating master list:", error);
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
        return res.status(400).json({ message: "Invalid employee ID" });
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
      console.error("Error looking up employee:", error);
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
      
      // Check if the employee is on the master list
      if (!employee.onMasterList) {
        return res.status(403).json({
          message: "Employee not on current master list",
          details: "This employee ID is not on the current active employee list. Please contact an administrator."
        });
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
        return res.status(400).json({ message: "Employee ID is required" });
      }
      
      // Check if employee exists (stored as rider in database)
      const employee = await storage.getUserByRiderId(riderId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
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
  // Emergency direct trip creation endpoint has been removed

  app.get("/api/trips", authenticateUser, async (req, res) => {
    try {
      let trips: Trip[] = [];
      
      // Get trips based on user type
      if (req.session.userType === "driver") {
        trips = await storage.getTripsByDriverId(req.session.userId!);
      } else if (req.session.userType === "rider") {
        // "rider" user type represents employees in the database
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
  
  // Get active trips (checked in but not checked out)
  app.get("/api/trips/active", authenticateUser, async (req, res) => {
    try {
      // Only drivers can see active trips
      if (req.session.userType !== "driver") {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const trips = await storage.getActiveTrips();
      return res.status(200).json(trips);
    } catch (error) {
      console.error("Error fetching active trips:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Trip reporting endpoint with date range filter
  app.get("/api/trips/report", authenticateUser, async (req, res) => {
    try {
      // Only drivers can access reports
      if (req.session.userType !== "driver") {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get date parameters
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      // Parse dates
      const parsedStartDate = new Date(startDate as string);
      const parsedEndDate = new Date(endDate as string);
      
      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      // Set the end date to end of day
      parsedEndDate.setHours(23, 59, 59, 999);
      
      const trips = await storage.getTripReport(parsedStartDate, parsedEndDate);
      return res.status(200).json(trips);
    } catch (error) {
      console.error("Error generating trip report:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Check-out API (for drivers to check out employees)
  app.post("/api/check-out", authenticateUser, async (req, res) => {
    try {
      // Validate that the user is a driver
      if (req.session.userType !== "driver") {
        return res.status(403).json({ message: "Only drivers can check out employees" });
      }
      
      // Validate the request body
      const result = checkOutSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid check-out data", 
          details: result.error.format() 
        });
      }
      
      const data = result.data;
      
      // Verify that the trip exists
      const existingTrip = await storage.getTrip(data.tripId);
      if (!existingTrip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Verify that the trip belongs to the current driver
      if (existingTrip.driverId !== req.session.userId) {
        return res.status(403).json({ message: "You can only check out trips that you started" });
      }
      
      // Check out the trip
      const updatedTrip = await storage.checkOutTrip(data.tripId, data.note);
      if (!updatedTrip) {
        return res.status(404).json({ message: "Failed to check out trip" });
      }
      
      console.log("Check-out successful", { tripId: updatedTrip.id });
      return res.status(200).json(updatedTrip);
    } catch (error) {
      console.error("Error in check-out API:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Driver Check-in API (start shift) - both endpoints for compatibility
  app.post("/api/driver/checkin", authenticateUser, async (req, res) => {
    try {
      // Validate that the user is a driver
      if (req.session.userType !== "driver") {
        return res.status(403).json({ message: "Only drivers can use this endpoint" });
      }
      
      // Validate the request body
      const result = driverCheckInSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid driver check-in data", 
          details: result.error.format() 
        });
      }
      
      const data = result.data;
      
      // Check in the driver
      const updatedDriver = await storage.checkInDriver(
        req.session.userId!, 
        data.location,
        data.note
      );
      
      if (!updatedDriver) {
        return res.status(500).json({ message: "Failed to check in driver" });
      }
      
      // Return the updated driver info (without password)
      const { password, ...safeUser } = updatedDriver;
      console.log("Driver check-in successful", { driverId: updatedDriver.id });
      return res.status(200).json(safeUser);
    } catch (error) {
      console.error("Error in driver check-in API:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/driver/check-in", authenticateUser, async (req, res) => {
    try {
      // Validate that the user is a driver
      if (req.session.userType !== "driver") {
        return res.status(403).json({ message: "Only drivers can use this endpoint" });
      }
      
      // Validate the request body
      const result = driverCheckInSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid driver check-in data", 
          details: result.error.format() 
        });
      }
      
      const data = result.data;
      
      // Check in the driver
      const updatedDriver = await storage.checkInDriver(
        req.session.userId!, 
        data.location,
        data.note
      );
      
      if (!updatedDriver) {
        return res.status(500).json({ message: "Failed to check in driver" });
      }
      
      // Return the updated driver info (without password)
      const { password, ...safeUser } = updatedDriver;
      console.log("Driver check-in successful", { driverId: updatedDriver.id });
      return res.status(200).json(safeUser);
    } catch (error) {
      console.error("Error in driver check-in API:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Driver Check-out API (end shift)
  app.post("/api/driver/check-out", authenticateUser, async (req, res) => {
    try {
      // Validate that the user is a driver
      if (req.session.userType !== "driver") {
        return res.status(403).json({ message: "Only drivers can use this endpoint" });
      }
      
      // Validate the request body
      const result = driverCheckOutSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid driver check-out data", 
          details: result.error.format() 
        });
      }
      
      const data = result.data;
      
      // Check out the driver
      const updatedDriver = await storage.checkOutDriver(
        req.session.userId!,
        data.note
      );
      
      if (!updatedDriver) {
        return res.status(500).json({ message: "Failed to check out driver" });
      }
      
      // Return the updated driver info (without password)
      const { password, ...safeUser } = updatedDriver;
      console.log("Driver check-out successful", { driverId: updatedDriver.id });
      return res.status(200).json(safeUser);
    } catch (error) {
      console.error("Error in driver check-out API:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get driver status
  app.get("/api/driver/status", authenticateUser, async (req, res) => {
    try {
      // Validate that the user is a driver
      if (req.session.userType !== "driver") {
        return res.status(403).json({ message: "Only drivers can use this endpoint" });
      }
      
      // Get the driver's status
      const status = await storage.getDriverStatus(req.session.userId!);
      
      if (!status) {
        return res.status(404).json({ message: "Driver status not found" });
      }
      
      return res.status(200).json(status);
    } catch (error) {
      console.error("Error getting driver status:", error);
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
  // Direct check-in routes have been removed
  
  // Redirect old check-in URL to regular driver check-in page
  app.get('/check-in', (req, res) => {
    res.redirect('/driver-checkin.html');
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
  
  // Driver check-out page
  app.get('/driver-checkout', (req, res) => {
    res.sendFile('driver-checkout.html', { root: './public' });
  });
  
  // Bus tracking page
  app.get('/bus-tracking', (req, res) => {
    res.sendFile('bus-tracking.html', { root: './public' });
  });
  
  // Bus rating page for employees
  app.get('/rate-bus', (req, res) => {
    res.sendFile('rate-bus.html', { root: './public' });
  });
  
  // Driver ratings dashboard
  app.get('/driver-ratings', (req, res) => {
    res.sendFile('driver-ratings.html', { root: './public' });
  });
  
  // Bus Location API Endpoints
  // Driver check-in/check-out management routes
  app.post("/api/drivers/:driverId/check-in", authenticateUser, async (req, res) => {
    try {
      // Only drivers can check in
      if (req.session.userType !== "driver") {
        return res.status(403).json({ message: "Only drivers can use this endpoint" });
      }
      
      // Parse driver ID from route parameter
      const driverId = parseInt(req.params.driverId);
      if (isNaN(driverId)) {
        return res.status(400).json({ message: "Invalid driver ID" });
      }
      
      // Ensure the driver is checking themselves in (not another driver)
      if (driverId !== req.session.userId) {
        return res.status(403).json({ message: "You can only check yourself in" });
      }
      
      // Validate check-in data
      const data = driverCheckInSchema.parse(req.body);
      
      // Perform the check-in
      const updatedDriver = await storage.checkInDriver(driverId, data.location, data.note);
      
      if (!updatedDriver) {
        return res.status(404).json({ message: "Driver not found" });
      }
      
      // Return success response
      return res.status(200).json({ 
        message: "Driver checked in successfully",
        driverId: updatedDriver.id,
        name: updatedDriver.name,
        checkInTime: updatedDriver.lastCheckInTime
      });
    } catch (error) {
      console.error("Driver check-in error:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid check-in data", errors: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/drivers/:driverId/check-out", authenticateUser, async (req, res) => {
    try {
      // Only drivers can check out
      if (req.session.userType !== "driver") {
        return res.status(403).json({ message: "Only drivers can use this endpoint" });
      }
      
      // Parse driver ID from route parameter
      const driverId = parseInt(req.params.driverId);
      if (isNaN(driverId)) {
        return res.status(400).json({ message: "Invalid driver ID" });
      }
      
      // Ensure the driver is checking themselves out (not another driver)
      if (driverId !== req.session.userId) {
        return res.status(403).json({ message: "You can only check yourself out" });
      }
      
      // Validate check-out data if there's any in the request body
      let note = undefined;
      if (Object.keys(req.body).length > 0) {
        const data = driverCheckOutSchema.parse(req.body);
        note = data.note;
      }
      
      // Perform the check-out
      const updatedDriver = await storage.checkOutDriver(driverId, note);
      
      if (!updatedDriver) {
        return res.status(404).json({ message: "Driver not found" });
      }
      
      // Return success response
      return res.status(200).json({ 
        message: "Driver checked out successfully",
        driverId: updatedDriver.id,
        name: updatedDriver.name,
        checkOutTime: updatedDriver.lastCheckOutTime
      });
    } catch (error) {
      console.error("Driver check-out error:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid check-out data", errors: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/drivers/:driverId/status", authenticateUser, async (req, res) => {
    try {
      // Anyone can check a driver's status, but we'll keep authentication for security
      const driverId = parseInt(req.params.driverId);
      if (isNaN(driverId)) {
        return res.status(400).json({ message: "Invalid driver ID" });
      }
      
      // Get the driver's status
      const status = await storage.getDriverStatus(driverId);
      
      if (!status) {
        return res.status(404).json({ message: "Driver not found" });
      }
      
      // Return the status
      return res.status(200).json(status);
    } catch (error) {
      console.error("Driver status check error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create a new bus location (for drivers)
  app.post("/api/bus-locations", authenticateUser, async (req, res) => {
    try {
      // Only drivers can update bus locations
      if (req.session.userType !== "driver") {
        return res.status(403).json({ message: "Only drivers can update bus locations" });
      }
      
      // Validate location data
      const locationData = insertBusLocationSchema.parse({
        ...req.body,
        driverId: req.session.userId
      });
      
      // Create the location record
      const location = await storage.createBusLocation(locationData);
      console.log("Bus location created successfully", { locationId: location.id });
      
      // Broadcast location update to all connected WebSocket clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'location_update',
            data: location
          }));
        }
      });
      
      return res.status(201).json(location);
    } catch (error) {
      console.error("Bus location creation error:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid location data", errors: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Update a bus location
  app.patch("/api/bus-locations", authenticateUser, async (req, res) => {
    try {
      // Only drivers can update bus locations
      if (req.session.userType !== "driver") {
        return res.status(403).json({ message: "Only drivers can update bus locations" });
      }
      
      // Validate location data
      const locationData = updateBusLocationSchema.parse(req.body);
      
      // Update location
      const location = await storage.updateBusLocation(req.session.userId!, locationData);
      if (!location) {
        return res.status(404).json({ message: "Failed to update bus location" });
      }
      
      // Broadcast location update to all connected WebSocket clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'location_update',
            data: location
          }));
        }
      });
      
      return res.status(200).json(location);
    } catch (error) {
      console.error("Bus location update error:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid location data", errors: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get latest bus location for a driver
  app.get("/api/bus-locations/driver/:driverId", async (req, res) => {
    try {
      const driverId = parseInt(req.params.driverId);
      if (isNaN(driverId)) {
        return res.status(400).json({ message: "Invalid driver ID" });
      }
      
      const location = await storage.getLatestBusLocation(driverId);
      if (!location) {
        return res.status(404).json({ message: "No location found for this driver" });
      }
      
      return res.status(200).json(location);
    } catch (error) {
      console.error("Error fetching bus location:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get all active bus locations
  app.get("/api/bus-locations/active", async (req, res) => {
    try {
      const locations = await storage.listActiveBusLocations();
      return res.status(200).json(locations);
    } catch (error) {
      console.error("Error fetching active bus locations:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get location history for a driver
  app.get("/api/bus-locations/history/:driverId", authenticateUser, async (req, res) => {
    try {
      const driverId = parseInt(req.params.driverId);
      if (isNaN(driverId)) {
        return res.status(400).json({ message: "Invalid driver ID" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      const locations = await storage.getBusLocationHistory(driverId, limit);
      return res.status(200).json(locations);
    } catch (error) {
      console.error("Error fetching bus location history:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Bus Rating API Endpoints
  // Create a new bus rating
  app.post("/api/bus-ratings", authenticateUser, async (req, res) => {
    try {
      // Validate rating data
      const ratingData = busRatingFormSchema.parse(req.body);
      
      // Get the current user
      const user = await storage.getUser(req.session.userId!);
      if (!user || !user.riderId) {
        return res.status(400).json({ message: "Only employees can submit ratings" });
      }
      
      // Create the full rating data
      const fullRatingData = {
        driverId: ratingData.driverId,
        riderId: user.riderId,
        tripId: req.body.tripId, // Optional field
        comfortRating: ratingData.comfortRating,
        cleanlinessRating: ratingData.cleanlinessRating,
        overallRating: ratingData.overallRating,
        comment: ratingData.comment
      };
      
      // Create the rating
      const rating = await storage.createBusRating(fullRatingData);
      console.log("Bus rating created successfully", { ratingId: rating.id });
      
      return res.status(201).json(rating);
    } catch (error) {
      console.error("Bus rating creation error:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid rating data", errors: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get ratings for a specific driver
  app.get("/api/bus-ratings/driver/:driverId", authenticateUser, async (req, res) => {
    try {
      const driverId = parseInt(req.params.driverId);
      if (isNaN(driverId)) {
        return res.status(400).json({ message: "Invalid driver ID" });
      }
      
      const ratings = await storage.getBusRatingsByDriverId(driverId);
      return res.status(200).json(ratings);
    } catch (error) {
      console.error("Error fetching driver ratings:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get rating statistics for a driver
  app.get("/api/bus-ratings/stats/:driverId", async (req, res) => {
    try {
      const driverId = parseInt(req.params.driverId);
      if (isNaN(driverId)) {
        return res.status(400).json({ message: "Invalid driver ID" });
      }
      
      const stats = await storage.getBusRatingStats(driverId);
      return res.status(200).json(stats);
    } catch (error) {
      console.error("Error fetching rating statistics:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get ratings submitted by the current user
  app.get("/api/bus-ratings/my-ratings", authenticateUser, async (req, res) => {
    try {
      // Get the current user
      const user = await storage.getUser(req.session.userId!);
      if (!user || !user.riderId || user.userType !== "rider") {
        return res.status(400).json({ message: "Only employees can view their ratings" });
      }
      
      const ratings = await storage.getBusRatingsByRiderId(user.riderId);
      return res.status(200).json(ratings);
    } catch (error) {
      console.error("Error fetching user ratings:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Add route handlers for HTML pages
  app.get('/:page.html', (req, res, next) => {
    // This route will handle explicit .html requests
    // Let express.static handle it directly
    next();
  });

  // Special handling for root path
  app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
  });

  // Add a fallback handler for pages without .html extension
  app.get('/:page', (req, res, next) => {
    // Skip API routes and other special paths
    if (req.params.page.startsWith('api') || 
        req.params.page === 'ws' || 
        req.params.page.includes('.')) {
      return next();
    }
    
    const pagePath = path.join(process.cwd(), 'public', req.params.page + '.html');
    
    // Check if the HTML file exists
    if (fs.existsSync(pagePath)) {
      console.log('Redirecting from', req.params.page, 'to', req.params.page + '.html');
      return res.redirect('/' + req.params.page + '.html');
    }
    
    // Continue to next handler if file doesn't exist
    next();
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

  // 404 handler - must be after all other routes
  app.use((req, res) => {
    // Skip handling APIs with a JSON 404 response
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    
    // For all other pages, show our not-found page
    const notFoundPath = path.join(process.cwd(), 'public', '404.html');
    
    if (fs.existsSync(notFoundPath)) {
      return res.status(404).sendFile(notFoundPath);
    } else {
      // If we don't have a 404 page, just send a simple error message
      return res.status(404).send('Page not found');
    }
  });

  return httpServer;
}

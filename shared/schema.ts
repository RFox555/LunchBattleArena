import { pgTable, text, serial, timestamp, integer, boolean, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Database schema for users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  userType: text("user_type").notNull(), // "driver", "rider", or "admin"
  riderId: text("rider_id"), // 5-digit unique ID for riders
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  onMasterList: boolean("on_master_list").default(true).notNull(), // Flag for master list validation
  lastValidated: timestamp("last_validated"), // When the employee was last validated
  isCheckedIn: boolean("is_checked_in").default(false), // For drivers to track if they're on duty
  lastCheckInTime: timestamp("last_check_in_time"), // When driver started their shift
  lastCheckOutTime: timestamp("last_check_out_time"), // When driver ended their shift
  isAdmin: boolean("is_admin").default(false) // For admin privileges
});

// Database schema for trips table
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  riderId: text("rider_id").notNull(), // Must match a valid rider ID
  driverId: integer("driver_id").notNull(), // References user.id for a driver
  checkInTime: timestamp("check_in_time").defaultNow().notNull(), // When employee checked in
  checkOutTime: timestamp("check_out_time"), // When employee checked out (null if not checked out yet)
  location: text("location"),
  completed: boolean("completed").default(false).notNull(),
  note: text("note"),
});

// Database schema for bus locations
export const busLocations = pgTable("bus_locations", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull(), // References user.id for a driver
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  heading: integer("heading"), // Direction in degrees (0-359)
  speed: doublePrecision("speed"), // Speed in mph or km/h
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  routeName: text("route_name"), // Name of the route the bus is on
  status: text("status").default("active"), // active, inactive, off-duty, etc.
});

// Database schema for bus condition and comfort ratings
export const busRatings = pgTable("bus_ratings", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull(), // References user.id for a driver
  riderId: text("rider_id").notNull(), // The rider who submitted the rating
  tripId: integer("trip_id"), // References trip.id if the rating is for a specific trip (optional)
  comfortRating: integer("comfort_rating").notNull(), // Rating from 1-5
  cleanlinessRating: integer("cleanliness_rating").notNull(), // Rating from 1-5
  overallRating: integer("overall_rating").notNull(), // Rating from 1-5
  comment: text("comment"), // Optional feedback comment
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Schema for inserting users (for registration)
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  userType: true,
  name: true,
  riderId: true,
});

// Schema for inserting trips (for check-ins)
export const insertTripSchema = createInsertSchema(trips).pick({
  riderId: true,
  driverId: true,
  location: true,
  note: true,
});

// Schema for login validation
export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  userType: z.enum(["driver", "rider", "admin"]),
});

// Schema for check-in form
export const checkInSchema = z.object({
  riderId: z.string().min(5).max(5),
  location: z.string().min(1),
  note: z.string().optional(),
});

// Schema for check-out an employee
export const checkOutSchema = z.object({
  tripId: z.number().int().positive(),
  note: z.string().optional(),
});

// Schema for driver check-in
export const driverCheckInSchema = z.object({
  location: z.string().min(1),
  note: z.string().optional(),
});

// Schema for driver check-out
export const driverCheckOutSchema = z.object({
  note: z.string().optional(),
});

// Schema for master list validation
export const masterListValidationSchema = z.object({
  employeeIds: z.array(z.string().min(5).max(5)),
});

// Schema for inserting bus locations
export const insertBusLocationSchema = createInsertSchema(busLocations).pick({
  driverId: true,
  latitude: true,
  longitude: true,
  heading: true,
  speed: true, 
  routeName: true,
  status: true,
});

// Schema for updating bus location
export const updateBusLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(), 
  heading: z.number().optional(),
  speed: z.number().optional(),
  routeName: z.string().optional(),
  status: z.string().optional(),
});

// Schema for inserting bus ratings
export const insertBusRatingSchema = createInsertSchema(busRatings).pick({
  driverId: true,
  riderId: true,
  tripId: true,
  comfortRating: true,
  cleanlinessRating: true,
  overallRating: true,
  comment: true,
});

// Schema for validating bus rating submissions
export const busRatingFormSchema = z.object({
  driverId: z.number().int(),
  comfortRating: z.number().int().min(1).max(5),
  cleanlinessRating: z.number().int().min(1).max(5),
  overallRating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;
export type CheckInData = z.infer<typeof checkInSchema>;
export type CheckOutData = z.infer<typeof checkOutSchema>;
export type DriverCheckInData = z.infer<typeof driverCheckInSchema>;
export type DriverCheckOutData = z.infer<typeof driverCheckOutSchema>;
export type MasterListData = z.infer<typeof masterListValidationSchema>;
export type InsertBusLocation = z.infer<typeof insertBusLocationSchema>;
export type BusLocation = typeof busLocations.$inferSelect;
export type UpdateBusLocation = z.infer<typeof updateBusLocationSchema>;
export type InsertBusRating = z.infer<typeof insertBusRatingSchema>;
export type BusRating = typeof busRatings.$inferSelect;
export type BusRatingFormData = z.infer<typeof busRatingFormSchema>;

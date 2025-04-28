import { pgTable, text, serial, timestamp, integer, boolean, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Database schema for users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  userType: text("user_type").notNull(), // "driver" or "rider"
  riderId: text("rider_id"), // 5-digit unique ID for riders
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Database schema for trips table
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  riderId: text("rider_id").notNull(), // Must match a valid rider ID
  driverId: integer("driver_id").notNull(), // References user.id for a driver
  timestamp: timestamp("timestamp").defaultNow().notNull(),
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
  userType: z.enum(["driver", "rider"]),
});

// Schema for check-in form
export const checkInSchema = z.object({
  riderId: z.string().min(5).max(5),
  location: z.string().min(1),
  note: z.string().optional(),
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

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;
export type CheckInData = z.infer<typeof checkInSchema>;
export type InsertBusLocation = z.infer<typeof insertBusLocationSchema>;
export type BusLocation = typeof busLocations.$inferSelect;
export type UpdateBusLocation = z.infer<typeof updateBusLocationSchema>;

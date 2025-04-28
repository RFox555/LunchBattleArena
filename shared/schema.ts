import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  riderId: text("rider_id").notNull(),
  driverId: integer("driver_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  location: text("location"),
  completed: boolean("completed").default(false).notNull(),
  note: text("note"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  userType: true,
  name: true,
});

export const insertTripSchema = createInsertSchema(trips).pick({
  riderId: true,
  driverId: true,
  location: true,
  note: true,
});

export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  userType: z.enum(["driver", "rider"]),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;

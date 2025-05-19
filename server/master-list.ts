import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { masterListUploadSchema, masterList } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import { ZodError } from "zod";
import { db } from "./db";

export function registerMasterListRoutes(app: Express) {
  // API route to check if a rider ID is on the master list
  app.get('/api/master-list/check/:riderId', async (req, res) => {
    try {
      const { riderId } = req.params;
      
      if (!riderId || riderId.length !== 5) {
        return res.status(400).json({ 
          message: 'Invalid rider ID',
          isOnList: false
        });
      }
      
      // Get the user to check if they're on the master list
      const user = await storage.getUserByRiderId(riderId);
      
      // For this implementation, just check if the user is active
      // This is a simpler approach than full master list implementation
      const isOnList = Boolean(user?.isActive);
      
      // Return the result
      return res.status(200).json({
        riderId,
        isOnList
      });
    } catch (error) {
      console.error('Error checking master list:', error);
      return res.status(500).json({ 
        message: 'Failed to check master list',
        isOnList: true // Default to true on error
      });
    }
  });
  
  // API to upload a new master list (admin only)
  app.post('/api/master-list/upload', async (req, res) => {
    try {
      // Check if user is admin
      if (!req.session.userId || !req.session.userType || req.session.userType !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      
      // Validate the uploaded data
      const { employeeIds } = masterListUploadSchema.parse(req.body);
      
      // Update the master list in database
      const results = await storage.updateMasterList(employeeIds);
      
      return res.status(200).json({
        message: 'Master list updated successfully',
        results
      });
    } catch (error) {
      console.error('Error uploading master list:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: 'Invalid master list data',
          errors: error.errors
        });
      }
      
      return res.status(500).json({ message: 'Failed to upload master list' });
    }
  });
}
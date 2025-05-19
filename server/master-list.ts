import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { masterListUploadSchema, masterList } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import { ZodError } from "zod";
import { db } from "./db";

export function registerMasterListRoutes(app: Express) {
  // API route to get all master list entries
  app.get('/api/master-list', async (req, res) => {
    try {
      // Get active parameter (default to true)
      const activeOnly = req.query.active !== 'false';
      
      const masterListItems = await storage.getMasterList(activeOnly);
      
      return res.status(200).json(masterListItems);
    } catch (error) {
      console.error('Error getting master list:', error);
      return res.status(500).json({ message: 'Failed to retrieve master list' });
    }
  });

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
      
      // Check if this ID is in the uploaded master list
      // First query the master list directly
      const [masterListEntry] = await db
        .select()
        .from(masterList)
        .where(eq(masterList.employeeId, riderId));
      
      // If found and active, it's on the list
      if (masterListEntry && masterListEntry.isActive) {
        return res.status(200).json({
          riderId,
          isOnList: true
        });
      }
      
      // Otherwise, this ID is not on the master list
      return res.status(200).json({
        riderId,
        isOnList: false
      });
    } catch (error) {
      console.error('Error checking master list:', error);
      return res.status(500).json({ 
        message: 'Failed to check master list',
        isOnList: true // Default to true on error to avoid blocking check-ins
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
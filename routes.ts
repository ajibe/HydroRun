import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertWaterIntakeSchema, 
  insertActivitySchema, 
  insertRouteSchema,
  insertPostSchema,
  insertLikeSchema,
  insertCommentSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication/User Routes
  app.post("/api/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = z.object({
        username: z.string(),
        password: z.string()
      }).parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // In a real app, handle sessions or JWT here
      // For simplicity, just return the user (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  
  app.get("/api/users/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  
  app.patch("/api/users/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const userData = req.body;
      
      // Check if user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUser(userId, userData);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser!;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  
  // Water Tracking Routes
  app.post("/api/water-intake", async (req, res) => {
    try {
      const waterData = insertWaterIntakeSchema.parse(req.body);
      const waterIntake = await storage.addWaterIntake(waterData);
      res.status(201).json(waterIntake);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  
  app.get("/api/users/:userId/water-intake", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Optional date filter in format YYYY-MM-DD
      const dateFilter = req.query.date ? new Date(req.query.date as string) : undefined;
      
      let waterIntakes;
      if (dateFilter) {
        waterIntakes = await storage.getWaterIntakeByUserIdAndDate(userId, dateFilter);
      } else {
        waterIntakes = await storage.getWaterIntakeByUserId(userId);
      }
      
      res.json(waterIntakes);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  
  // Activity and Route Tracking Routes
  app.post("/api/activities", async (req, res) => {
    try {
      const activityData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity(activityData);
      res.status(201).json(activity);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  
  app.post("/api/routes", async (req, res) => {
    try {
      const routeData = insertRouteSchema.parse(req.body);
      const route = await storage.saveRoute(routeData);
      res.status(201).json(route);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  
  app.get("/api/activities/:activityId", async (req, res) => {
    try {
      const activityId = parseInt(req.params.activityId);
      const activity = await storage.getActivityById(activityId);
      
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      // Get associated route if exists
      const route = await storage.getRouteByActivityId(activityId);
      
      res.json({ activity, route });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  
  app.get("/api/users/:userId/activities", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const activities = await storage.getActivitiesByUserId(userId);
      res.json(activities);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  
  app.get("/api/activities/nearby", async (req, res) => {
    try {
      const { lat, lng, radius } = z.object({
        lat: z.coerce.number(),
        lng: z.coerce.number(),
        radius: z.coerce.number().default(5) // Default 5km radius
      }).parse(req.query);
      
      const activities = await storage.getPublicActivitiesNearby(lat, lng, radius);
      res.json(activities);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  
  // Social Routes
  app.post("/api/posts", async (req, res) => {
    try {
      const postData = insertPostSchema.parse(req.body);
      const post = await storage.createPost(postData);
      res.status(201).json(post);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  
  app.get("/api/posts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string || "10");
      const offset = parseInt(req.query.offset as string || "0");
      
      const posts = await storage.getPosts(limit, offset);
      res.json(posts);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  
  app.post("/api/likes", async (req, res) => {
    try {
      const likeData = insertLikeSchema.parse(req.body);
      const like = await storage.addLike(likeData);
      res.status(201).json(like);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  
  app.delete("/api/likes", async (req, res) => {
    try {
      const { userId, postId } = z.object({
        userId: z.number(),
        postId: z.number()
      }).parse(req.body);
      
      await storage.removeLike(userId, postId);
      res.status(204).end();
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  
  app.get("/api/posts/:postId/likes", async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const likes = await storage.getLikesByPostId(postId);
      res.json(likes);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  
  app.post("/api/comments", async (req, res) => {
    try {
      const commentData = insertCommentSchema.parse(req.body);
      const comment = await storage.addComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  
  app.get("/api/posts/:postId/comments", async (req, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const comments = await storage.getCommentsByPostId(postId);
      res.json(comments);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

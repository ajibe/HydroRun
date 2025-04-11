import { 
  User, InsertUser, 
  WaterIntake, InsertWaterIntake,
  Activity, InsertActivity,
  Route, InsertRoute,
  Post, InsertPost,
  Like, InsertLike,
  Comment, InsertComment,
  users, waterIntake, activities, routes, posts, likes, comments
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  
  // Water Intake methods
  addWaterIntake(intake: InsertWaterIntake): Promise<WaterIntake>;
  getWaterIntakeByUserId(userId: number): Promise<WaterIntake[]>;
  getWaterIntakeByUserIdAndDate(userId: number, date: Date): Promise<WaterIntake[]>;
  
  // Activity methods
  createActivity(activity: InsertActivity): Promise<Activity>;
  getActivityById(id: number): Promise<Activity | undefined>;
  getActivitiesByUserId(userId: number): Promise<Activity[]>;
  getRecentActivities(limit: number): Promise<Activity[]>;
  getPublicActivitiesNearby(lat: number, lng: number, radiusKm: number): Promise<Activity[]>;
  
  // Route methods
  saveRoute(route: InsertRoute): Promise<Route>;
  getRouteByActivityId(activityId: number): Promise<Route | undefined>;
  
  // Social methods
  createPost(post: InsertPost): Promise<Post>;
  getPosts(limit: number, offset: number): Promise<Post[]>;
  getPostsByUserId(userId: number): Promise<Post[]>;
  addLike(like: InsertLike): Promise<Like>;
  removeLike(userId: number, postId: number): Promise<void>;
  getLikesByPostId(postId: number): Promise<Like[]>;
  addComment(comment: InsertComment): Promise<Comment>;
  getCommentsByPostId(postId: number): Promise<Comment[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private waterIntakes: Map<number, WaterIntake>;
  private activities: Map<number, Activity>;
  private routes: Map<number, Route>;
  private posts: Map<number, Post>;
  private likes: Map<number, Like>;
  private comments: Map<number, Comment>;
  
  private userIdCounter: number;
  private waterIntakeIdCounter: number;
  private activityIdCounter: number;
  private routeIdCounter: number;
  private postIdCounter: number;
  private likeIdCounter: number;
  private commentIdCounter: number;

  constructor() {
    this.users = new Map();
    this.waterIntakes = new Map();
    this.activities = new Map();
    this.routes = new Map();
    this.posts = new Map();
    this.likes = new Map();
    this.comments = new Map();
    
    this.userIdCounter = 1;
    this.waterIntakeIdCounter = 1;
    this.activityIdCounter = 1;
    this.routeIdCounter = 1;
    this.postIdCounter = 1;
    this.likeIdCounter = 1;
    this.commentIdCounter = 1;
    
    // Add a test user for development
    this.createUser({
      username: "testuser",
      password: "password",
      email: "test@example.com",
      profilePicture: "",
      dailyWaterGoal: 2000
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { 
      ...insertUser, 
      id,
      profilePicture: insertUser.profilePicture || null,
      dailyWaterGoal: insertUser.dailyWaterGoal || 2000,
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Water Intake methods
  async addWaterIntake(intake: InsertWaterIntake): Promise<WaterIntake> {
    const id = this.waterIntakeIdCounter++;
    const waterIntake: WaterIntake = { 
      ...intake, 
      id, 
      timestamp: new Date() 
    };
    this.waterIntakes.set(id, waterIntake);
    return waterIntake;
  }
  
  async getWaterIntakeByUserId(userId: number): Promise<WaterIntake[]> {
    return Array.from(this.waterIntakes.values())
      .filter(intake => intake.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  async getWaterIntakeByUserIdAndDate(userId: number, date: Date): Promise<WaterIntake[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return Array.from(this.waterIntakes.values())
      .filter(intake => 
        intake.userId === userId && 
        intake.timestamp >= startOfDay && 
        intake.timestamp <= endOfDay
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
  
  // Activity methods
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.activityIdCounter++;
    const newActivity: Activity = { 
      ...activity, 
      id, 
      timestamp: new Date(),
      elevationGain: activity.elevationGain || null,
      weather: activity.weather || null,
      temperature: activity.temperature || null,
      isPublic: activity.isPublic ?? true
    };
    this.activities.set(id, newActivity);
    return newActivity;
  }
  
  async getActivityById(id: number): Promise<Activity | undefined> {
    return this.activities.get(id);
  }
  
  async getActivitiesByUserId(userId: number): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter(activity => activity.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  async getRecentActivities(limit: number): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter(activity => activity.isPublic)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  async getPublicActivitiesNearby(lat: number, lng: number, radiusKm: number): Promise<Activity[]> {
    // In a real app, we would use geospatial queries
    // For demo, just return recent public activities
    return this.getRecentActivities(10);
  }
  
  // Route methods
  async saveRoute(route: InsertRoute): Promise<Route> {
    const id = this.routeIdCounter++;
    const newRoute: Route = { ...route, id };
    this.routes.set(id, newRoute);
    return newRoute;
  }
  
  async getRouteByActivityId(activityId: number): Promise<Route | undefined> {
    return Array.from(this.routes.values())
      .find(route => route.activityId === activityId);
  }
  
  // Social methods
  async createPost(post: InsertPost): Promise<Post> {
    const id = this.postIdCounter++;
    const newPost: Post = { 
      ...post, 
      id, 
      timestamp: new Date(),
      activityId: post.activityId || null,
      imagePath: post.imagePath || null
    };
    this.posts.set(id, newPost);
    return newPost;
  }
  
  async getPosts(limit: number, offset: number): Promise<Post[]> {
    return Array.from(this.posts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);
  }
  
  async getPostsByUserId(userId: number): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(post => post.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  async addLike(like: InsertLike): Promise<Like> {
    // Check if like already exists
    const existingLike = Array.from(this.likes.values())
      .find(l => l.userId === like.userId && l.postId === like.postId);
      
    if (existingLike) return existingLike;
    
    const id = this.likeIdCounter++;
    const newLike: Like = { ...like, id };
    this.likes.set(id, newLike);
    return newLike;
  }
  
  async removeLike(userId: number, postId: number): Promise<void> {
    const likeToRemove = Array.from(this.likes.values())
      .find(like => like.userId === userId && like.postId === postId);
      
    if (likeToRemove) {
      this.likes.delete(likeToRemove.id);
    }
  }
  
  async getLikesByPostId(postId: number): Promise<Like[]> {
    return Array.from(this.likes.values())
      .filter(like => like.postId === postId);
  }
  
  async addComment(comment: InsertComment): Promise<Comment> {
    const id = this.commentIdCounter++;
    const newComment: Comment = { 
      ...comment, 
      id, 
      timestamp: new Date() 
    };
    this.comments.set(id, newComment);
    return newComment;
  }
  
  async getCommentsByPostId(postId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.postId === postId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    // Ensure we have proper values for optional fields
    const userData = {
      ...user,
      profilePicture: user.profilePicture || null,
      dailyWaterGoal: user.dailyWaterGoal || 2000
    };
    
    const [newUser] = await db.insert(users).values(userData).returning();
    return newUser;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Water Intake methods
  async addWaterIntake(intake: InsertWaterIntake): Promise<WaterIntake> {
    const [newIntake] = await db
      .insert(waterIntake)
      .values(intake)
      .returning();
    return newIntake;
  }

  async getWaterIntakeByUserId(userId: number): Promise<WaterIntake[]> {
    return await db
      .select()
      .from(waterIntake)
      .where(eq(waterIntake.userId, userId))
      .orderBy(desc(waterIntake.timestamp));
  }

  async getWaterIntakeByUserIdAndDate(userId: number, date: Date): Promise<WaterIntake[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await db
      .select()
      .from(waterIntake)
      .where(
        and(
          eq(waterIntake.userId, userId),
          gte(waterIntake.timestamp, startOfDay),
          lte(waterIntake.timestamp, endOfDay)
        )
      )
      .orderBy(asc(waterIntake.timestamp));
  }

  // Activity methods
  async createActivity(activity: InsertActivity): Promise<Activity> {
    // Ensure we have proper values for optional fields
    const activityData = {
      ...activity,
      elevationGain: activity.elevationGain || null,
      weather: activity.weather || null,
      temperature: activity.temperature || null,
      isPublic: activity.isPublic ?? true
    };
    
    const [newActivity] = await db
      .insert(activities)
      .values(activityData)
      .returning();
    return newActivity;
  }

  async getActivityById(id: number): Promise<Activity | undefined> {
    const [activity] = await db
      .select()
      .from(activities)
      .where(eq(activities.id, id));
    return activity;
  }

  async getActivitiesByUserId(userId: number): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.timestamp));
  }

  async getRecentActivities(limit: number): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .where(eq(activities.isPublic, true))
      .orderBy(desc(activities.timestamp))
      .limit(limit);
  }

  async getPublicActivitiesNearby(lat: number, lng: number, radiusKm: number): Promise<Activity[]> {
    // A simplified implementation - in a real app, would use PostGIS for geospatial queries
    return await db
      .select()
      .from(activities)
      .where(eq(activities.isPublic, true))
      .orderBy(desc(activities.timestamp))
      .limit(10);
  }

  // Route methods
  async saveRoute(route: InsertRoute): Promise<Route> {
    const [newRoute] = await db
      .insert(routes)
      .values(route)
      .returning();
    return newRoute;
  }

  async getRouteByActivityId(activityId: number): Promise<Route | undefined> {
    const [route] = await db
      .select()
      .from(routes)
      .where(eq(routes.activityId, activityId));
    return route;
  }

  // Social methods
  async createPost(post: InsertPost): Promise<Post> {
    // Ensure we have proper values for optional fields
    const postData = {
      ...post,
      activityId: post.activityId || null,
      imagePath: post.imagePath || null
    };
    
    const [newPost] = await db
      .insert(posts)
      .values(postData)
      .returning();
    return newPost;
  }

  async getPosts(limit: number, offset: number): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .orderBy(desc(posts.timestamp))
      .limit(limit)
      .offset(offset);
  }

  async getPostsByUserId(userId: number): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.timestamp));
  }

  async addLike(like: InsertLike): Promise<Like> {
    // Check if like already exists to maintain uniqueness
    const existingLikes = await db
      .select()
      .from(likes)
      .where(
        and(
          eq(likes.userId, like.userId),
          eq(likes.postId, like.postId)
        )
      );
      
    if (existingLikes.length > 0) {
      return existingLikes[0];
    }
    
    const [newLike] = await db
      .insert(likes)
      .values(like)
      .returning();
    return newLike;
  }

  async removeLike(userId: number, postId: number): Promise<void> {
    await db
      .delete(likes)
      .where(
        and(
          eq(likes.userId, userId),
          eq(likes.postId, postId)
        )
      );
  }

  async getLikesByPostId(postId: number): Promise<Like[]> {
    return await db
      .select()
      .from(likes)
      .where(eq(likes.postId, postId));
  }

  async addComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values(comment)
      .returning();
    return newComment;
  }

  async getCommentsByPostId(postId: number): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(asc(comments.timestamp));
  }
}

// Switch to use the database storage
export const storage = new DatabaseStorage();

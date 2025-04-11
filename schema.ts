import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  profilePicture: text("profile_picture"),
  dailyWaterGoal: integer("daily_water_goal").default(2000),
});

// Table relations - defined after all tables
export const usersRelations = relations(users, ({ many }) => ({
  waterIntakes: many(waterIntake),
  activities: many(activities),
  posts: many(posts),
  likes: many(likes),
  comments: many(comments),
}));

export const waterIntake = pgTable("water_intake", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  type: text("type").notNull(),
  distance: doublePrecision("distance").notNull(), // in kilometers
  duration: integer("duration").notNull(), // in seconds
  elevationGain: integer("elevation_gain"), // in meters
  weather: text("weather"),
  temperature: doublePrecision("temperature"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  isPublic: boolean("is_public").default(true),
});

export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull().references(() => activities.id),
  coordinates: text("coordinates").notNull(), // JSON string of coordinates array
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  activityId: integer("activity_id").references(() => activities.id),
  content: text("content").notNull(),
  imagePath: text("image_path"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  postId: integer("post_id").notNull().references(() => posts.id),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  postId: integer("post_id").notNull().references(() => posts.id),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  profilePicture: true,
  dailyWaterGoal: true,
});

export const insertWaterIntakeSchema = createInsertSchema(waterIntake).pick({
  userId: true,
  amount: true,
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  userId: true,
  title: true,
  type: true,
  distance: true,
  duration: true,
  elevationGain: true,
  weather: true,
  temperature: true,
  isPublic: true,
});

export const insertRouteSchema = createInsertSchema(routes).pick({
  activityId: true,
  coordinates: true,
});

export const insertPostSchema = createInsertSchema(posts).pick({
  userId: true,
  activityId: true,
  content: true,
  imagePath: true,
});

export const insertLikeSchema = createInsertSchema(likes).pick({
  userId: true,
  postId: true,
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  userId: true,
  postId: true,
  content: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type WaterIntake = typeof waterIntake.$inferSelect;
export type InsertWaterIntake = z.infer<typeof insertWaterIntakeSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export type Like = typeof likes.$inferSelect;
export type InsertLike = z.infer<typeof insertLikeSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

// Define the remaining relations after all tables are declared
export const waterIntakeRelations = relations(waterIntake, ({ one }) => ({
  user: one(users, { fields: [waterIntake.userId], references: [users.id] }),
}));

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  user: one(users, { fields: [activities.userId], references: [users.id] }),
  route: one(routes, { fields: [activities.id], references: [routes.activityId] }),
  posts: many(posts),
}));

export const routesRelations = relations(routes, ({ one }) => ({
  activity: one(activities, { fields: [routes.activityId], references: [activities.id] }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, { fields: [posts.userId], references: [users.id] }),
  activity: one(activities, { fields: [posts.activityId], references: [activities.id] }),
  likes: many(likes),
  comments: many(comments),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, { fields: [likes.userId], references: [users.id] }),
  post: one(posts, { fields: [likes.postId], references: [posts.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
}));

import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const neighborhoodVotes = pgTable("neighborhood_votes", {
  id: serial().primaryKey(),
  neighborhood: text().notNull().unique(),
  votes: integer().default(0).notNull(),
});

export const deviceVotes = pgTable("device_votes", {
  id: serial().primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  neighborhood: text().notNull(),
  votedAt: timestamp("voted_at").defaultNow(),
});

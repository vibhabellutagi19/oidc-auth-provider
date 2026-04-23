import {
  uuid,
  pgTable,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  firstName: varchar("first_name", { length: 25 }),
  lastName: varchar("last_name", { length: 25 }),

  profileImageURL: text("profile_image_url"),

  email: varchar("email", { length: 322 }).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),

  password: varchar("password", { length: 128 }),
  salt: text("salt"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clientsTable = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: varchar("client_id", { length: 50 }).unique(),
  clientSecret: varchar("client_secret", { length: 100 }),

  name: varchar("name", { length: 100 }).notNull(),
  url: text("url").notNull(),
  redirectUri: text("redirect_uri").notNull(),

  shortCode: varchar("short_code", { length: 50 }).unique(),
  shortCodeExpiresAt: timestamp("short_code_expires_at"),
  authorizedUserId: uuid("authorized_user_id"), // Track which user authorized this client

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tokensTable = pgTable("tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id),
  clientId: uuid("client_id").references(() => clientsTable.id),

  refreshToken: text("refresh_token").notNull(),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

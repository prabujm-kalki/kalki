import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { toNextJsHandler } from "better-auth/next-js";
import { db } from "@/db";
import { authAccounts, authSessions, authUsers, authVerifications } from "@/db/schema";
import { env } from "@/lib/env";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authUsers,
      session: authSessions,
      account: authAccounts,
      verification: authVerifications,
    },
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: ["http://localhost:3001"],
  emailAndPassword: { enabled: true },
  advanced: {
    crossSubDomainCookies: {
      enabled: false, // Prevents setting 'Domain=192.168.x.x' which browsers reject for IP addresses
    },
  },
});

export const authHandler = toNextJsHandler(auth);

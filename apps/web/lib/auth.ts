import * as schema from '@parabuains/db/schema';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins';
import { db } from './db';
import { sendPasswordResetEmail, sendVerificationEmail } from './email';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ to: user.email, url });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({ to: user.email, url });
    },
    expiresIn: 60 * 60 * 24, // 24 horas
  },
  socialProviders: {
    google: {
      // biome-ignore lint/style/noNonNullAssertion: OAuth credentials required; missing values throw at startup
      clientId: process.env.GOOGLE_CLIENT_ID!,
      // biome-ignore lint/style/noNonNullAssertion: OAuth credentials required; missing values throw at startup
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // refresh: 30 dias
    updateAge: 60 * 15, // access: 15 minutos
    cookieCache: {
      enabled: true,
      maxAge: 60 * 15,
    },
  },
  plugins: [
    twoFactor({
      totpOptions: {
        digits: 6,
        period: 30,
      },
      backupCodeOptions: {
        amount: 8,
        length: 10,
      },
    }),
  ],
  trustedOrigins: [process.env.NEXTAUTH_URL ?? 'http://localhost:3000'],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

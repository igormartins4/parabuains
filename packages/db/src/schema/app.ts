import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// ─── users ───────────────────────────────────────────────────────────────────
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    username: varchar('username', { length: 30 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }),
    displayName: varchar('display_name', { length: 100 }).notNull(),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    birthDate: date('birth_date').notNull(),
    birthYearHidden: boolean('birth_year_hidden').default(false).notNull(),
    privacyLevel: varchar('privacy_level', { length: 20 }).default('public').notNull(),
    countdownVisibility: varchar('countdown_visibility', { length: 20 })
      .default('public')
      .notNull(),
    totpSecret: varchar('totp_secret', { length: 255 }),
    totpEnabled: boolean('totp_enabled').default(false).notNull(),
    timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
    notificationSendHour: integer('notification_send_hour').default(8).notNull(),
    wallWhoCanPost: varchar('wall_who_can_post', { length: 20 }).default('friends').notNull(),
    wallAllowAnonymous: boolean('wall_allow_anonymous').default(true).notNull(),
    wallRequireApproval: boolean('wall_require_approval').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_users_birth_date').on(table.birthDate),
    index('idx_users_username').on(table.username),
    check(
      'users_privacy_level_check',
      sql`${table.privacyLevel} IN ('public', 'friends', 'private')`
    ),
    check(
      'users_countdown_visibility_check',
      sql`${table.countdownVisibility} IN ('public', 'friends')`
    ),
    check(
      'users_notification_send_hour_check',
      sql`${table.notificationSendHour} >= 0 AND ${table.notificationSendHour} <= 23`
    ),
    check(
      'users_wall_who_can_post_check',
      sql`${table.wallWhoCanPost} IN ('friends', 'authenticated')`
    ),
  ]
);

// ─── oauth_accounts ───────────────────────────────────────────────────────────
export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 50 }).notNull(),
    providerId: varchar('provider_id', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('oauth_accounts_provider_provider_id_key').on(table.provider, table.providerId),
  ]
);

// ─── friendships ──────────────────────────────────────────────────────────────
export const friendships = pgTable(
  'friendships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addresseeId: uuid('addressee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_friendships_addressee').on(table.addresseeId, table.status),
    index('idx_friendships_requester').on(table.requesterId, table.status),
    uniqueIndex('friendships_requester_addressee_key').on(table.requesterId, table.addresseeId),
    check('friendships_status_check', sql`${table.status} IN ('pending', 'accepted', 'blocked')`),
    check('friendships_no_self_friend', sql`${table.requesterId} != ${table.addresseeId}`),
  ]
);

// ─── username_history ─────────────────────────────────────────────────────────
export const usernameHistory = pgTable(
  'username_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    username: varchar('username', { length: 30 }).notNull(),
    changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_username_history_username').on(table.username),
    index('idx_username_history_user').on(table.userId),
  ]
);

// ─── totp_backup_codes ────────────────────────────────────────────────────────
export const totpBackupCodes = pgTable('totp_backup_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  codeHash: varchar('code_hash', { length: 255 }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── wall_messages ────────────────────────────────────────────────────────────
export const wallMessages = pgTable(
  'wall_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    isAnonymous: boolean('is_anonymous').default(false).notNull(),
    content: text('content').notNull(),
    isPrivate: boolean('is_private').default(false).notNull(),
    status: varchar('status', { length: 20 }).default('published').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_wall_messages_profile').on(table.profileId, table.createdAt),
    check('wall_messages_content_length', sql`char_length(${table.content}) <= 500`),
    check(
      'wall_messages_status_check',
      sql`${table.status} IN ('pending', 'published', 'rejected')`
    ),
  ]
);

// ─── message_reports ──────────────────────────────────────────────────────────
export const messageReports = pgTable(
  'message_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => wallMessages.id, { onDelete: 'cascade' }),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('message_reports_message_reporter_key').on(table.messageId, table.reporterId),
  ]
);

// ─── notification_preferences ─────────────────────────────────────────────────
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    channel: varchar('channel', { length: 20 }).notNull(),
    daysBefore: integer('days_before').array().default([1, 7]).notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('notification_preferences_user_channel_key').on(table.userId, table.channel),
    check('notification_preferences_channel_check', sql`${table.channel} IN ('email', 'push')`),
  ]
);

// ─── push_subscriptions ───────────────────────────────────────────────────────
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dhKey: text('p256dh_key').notNull(),
  authKey: text('auth_key').notNull(),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── notification_log ─────────────────────────────────────────────────────────
export const notificationLog = pgTable(
  'notification_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    channel: varchar('channel', { length: 20 }).notNull(),
    reminderType: varchar('reminder_type', { length: 10 }).notNull(),
    status: varchar('status', { length: 20 }).default('sent').notNull(),
    errorMessage: text('error_message'),
    sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_notif_log_recipient').on(table.recipientId, table.sentAt),
    check(
      'notification_log_reminder_type_check',
      sql`${table.reminderType} IN ('D7', 'D3', 'D1', 'Dday')`
    ),
    check('notification_log_status_check', sql`${table.status} IN ('sent', 'failed', 'skipped')`),
  ]
);

// ─── audit_logs ───────────────────────────────────────────────────────────────
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    resource: varchar('resource', { length: 100 }),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_logs_actor').on(table.actorId),
    index('idx_audit_logs_created').on(table.createdAt),
  ]
);

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const collaborators = sqliteTable('collaborators', {
  email: text('email').primaryKey(), createdAt: text('created_at').notNull(),
});
export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(), title: text('title').notNull(), category: text('category').notNull(),
  course: text('course').notNull(), summary: text('summary').notNull().default(''),
  ownerId: text('owner_id').notNull(), ownerEmail: text('owner_email').notNull(), sourceKey: text('source_key').notNull(),
  pdfKey: text('pdf_key'), state: text('state').notNull().default('draft'),
  revision: integer('revision').notNull().default(1), compiledRevision: integer('compiled_revision'),
  compileToken: text('compile_token'), compileUntil: integer('compile_until'),
  createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
}, t => [index('documents_owner_idx').on(t.ownerId), index('documents_state_idx').on(t.state)]);
export const compilations = sqliteTable('compilations', {
  id: text('id').primaryKey(), documentId: text('document_id').notNull(), userId: text('user_id').notNull(),
  revision: integer('revision').notNull(), status: text('status').notNull(),
  message: text('message').notNull().default(''), createdAt: text('created_at').notNull(),
}, t => [index('compilations_user_idx').on(t.userId, t.createdAt)]);

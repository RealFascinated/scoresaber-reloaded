# postgres-drizzle

PostgreSQL and Drizzle ORM best practices. This skill activates automatically when writing database schemas, queries, migrations, or any database-related code.

## Topics Covered

| Category | Topics |
|----------|--------|
| **Schema** | Column types, constraints, indexes, enums, JSONB, relations |
| **Queries** | Operators, joins, aggregations, subqueries, transactions |
| **Relations** | One-to-many, many-to-many, relational queries API |
| **Migrations** | drizzle-kit commands, workflows, configuration |
| **PostgreSQL** | PG18 features, RLS, partitioning, full-text search |
| **Performance** | Indexing strategies, query optimization, connection pooling |

## Example Usage

```
"Create a users table with email and timestamps"
"Add a posts table with foreign key to users"
"Write a query to get users with their posts"
"Set up drizzle migrations for production"
"Optimize this slow database query"
```

## Skill Structure

- **[SKILL.md](SKILL.md)** - Main skill file (concise overview)
- **Reference Files:**
  - [SCHEMA.md](references/SCHEMA.md) - Column types, constraints, indexes
  - [QUERIES.md](references/QUERIES.md) - Query patterns and operators
  - [RELATIONS.md](references/RELATIONS.md) - Relations API and relational queries
  - [MIGRATIONS.md](references/MIGRATIONS.md) - drizzle-kit workflows
  - [POSTGRES.md](references/POSTGRES.md) - PostgreSQL 18 features
  - [PERFORMANCE.md](references/PERFORMANCE.md) - Optimization and pooling
  - [CHEATSHEET.md](references/CHEATSHEET.md) - Quick reference

## Quick Start

```typescript
import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Schema
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('users_email_idx').on(table.email),
]);

// Connection
const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema: { users } });

// Query
const user = await db.query.users.findFirst({
  where: eq(users.email, 'user@example.com'),
});
```

## Resources

- **Drizzle Docs**: https://orm.drizzle.team
- **PostgreSQL Docs**: https://www.postgresql.org/docs/18/

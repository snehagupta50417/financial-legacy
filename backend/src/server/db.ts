import { PrismaClient } from '@prisma/client'
import path from 'node:path'
import { PrismaPg } from '@prisma/adapter-pg'

// Separate generated clients preserve the SQLite development/test client.
const postgres = process.env.KEEPER_DB_PROVIDER === 'postgres' || /^postgres(ql)?:/.test(process.env.DATABASE_URL || '')
const DatabaseClient: typeof PrismaClient = postgres ? require(path.resolve(__dirname, '../../prisma/.generated/client')).PrismaClient : PrismaClient

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new DatabaseClient({
    ...(postgres ? { adapter: new PrismaPg({ connectionString: postgresUrl(), max: 3, connectionTimeoutMillis: 10000 }, { schema: new URL(process.env.DATABASE_URL!).searchParams.get('schema') || 'keeper' }) } : {}),
    ...(postgres ? { transactionOptions: { maxWait: 10000, timeout: 20000 } } : {}),
    // Queries are only logged when asked for (PRISMA_LOG_QUERIES=1); otherwise the dev terminal drowns in SQL.
    log: process.env.PRISMA_LOG_QUERIES ? ['query', 'warn', 'error'] : ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
function postgresUrl() {
  const url = new URL(process.env.DATABASE_URL!);
  // pg verifies both CA and hostname. Keep compatibility with existing Prisma certificate URLs.
  const ca = url.searchParams.get('sslcert');
  url.searchParams.delete('sslcert'); url.searchParams.delete('sslaccept');
  url.searchParams.set('sslmode', 'verify-full');
  if (ca) url.searchParams.set('sslrootcert', ca);
  else if (!url.searchParams.has('sslrootcert') && url.hostname.endsWith('.pooler.supabase.com')) url.searchParams.set('sslrootcert', path.resolve(__dirname, '../../certs/supabase-root.crt')); 
  return url.href;
}

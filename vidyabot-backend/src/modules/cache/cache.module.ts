import { Module } from '@nestjs/common';

/**
 * CacheModule is a placeholder for any additional in-memory caching layer
 * (e.g. Redis or NestJS built-in cache manager) if needed in future.
 * For now, all caching is done via Supabase PostgreSQL in the service layer.
 */
@Module({})
export class CacheModule { }

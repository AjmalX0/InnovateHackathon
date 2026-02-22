import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

/**
 * @Global() — SupabaseService is available in every module
 * without needing to re-import SupabaseModule each time.
 */
@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}

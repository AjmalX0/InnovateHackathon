import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>('supabase.url');
    const key = this.configService.get<string>('supabase.serviceKey');

    if (!url || !key) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env',
      );
    }

    this.client = createClient(url, key, {
      auth: { persistSession: false }, // server-side — no browser session
    });

    this.logger.log('✅ Supabase client initialised');
  }

  /** Typed Supabase client — use this in every service. */
  get db(): SupabaseClient {
    return this.client;
  }
}

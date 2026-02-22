import { Module, Global } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Provides two Supabase clients:
 *
 * - SUPABASE_CLIENT      → service_role key (server-side only, bypasses RLS).
 *   Use this for trusted admin operations: inserts, updates, background jobs.
 *   NEVER expose this key or this client to browser / mobile clients.
 *
 * - SUPABASE_ANON_CLIENT → anon key (respects RLS).
 *   Use this when you want Row Level Security enforced on a query.
 */
@Global()
@Module({
    providers: [
        {
            provide: 'SUPABASE_CLIENT',
            useFactory: (): SupabaseClient => {
                const url = process.env.SUPABASE_URL;
                const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

                if (!url) throw new Error('Missing env: SUPABASE_URL');
                if (!serviceRoleKey) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY');

                return createClient(url, serviceRoleKey, {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false,
                    },
                });
            },
        },
        {
            provide: 'SUPABASE_ANON_CLIENT',
            useFactory: (): SupabaseClient => {
                const url = process.env.SUPABASE_URL;
                const anonKey = process.env.SUPABASE_ANON_KEY;

                if (!url) throw new Error('Missing env: SUPABASE_URL');
                if (!anonKey) throw new Error('Missing env: SUPABASE_ANON_KEY');

                return createClient(url, anonKey);
            },
        },
    ],
    exports: ['SUPABASE_CLIENT', 'SUPABASE_ANON_CLIENT'],
})
export class DatabaseModule { }

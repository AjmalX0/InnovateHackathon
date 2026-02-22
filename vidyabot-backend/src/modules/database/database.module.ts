import { Module, Global } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Global()
@Module({
    providers: [
        {
            provide: 'SUPABASE_CLIENT',
            useFactory: (): SupabaseClient => {
                const url = process.env.SUPABASE_URL || '';
                const key = process.env.SUPABASE_KEY || '';
                if (!url || !key) {
                    throw new Error('SUPABASE_URL and SUPABASE_KEY must be defined in the environment variables.');
                }
                return createClient(url, key);
            },
        },
    ],
    exports: ['SUPABASE_CLIENT'],
})
export class DatabaseModule { }

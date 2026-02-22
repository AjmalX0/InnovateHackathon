import { Module, Global } from '@nestjs/common';
import { Pool } from 'pg';

@Global()
@Module({
    providers: [
        {
            provide: 'DATABASE_POOL',
            useFactory: () => {
                return new Pool({
                    host: 'db.mqkzgqaulxznlvnfggjb.supabase.co',
                    port: 5432,
                    user: 'postgres',
                    password: 'Innovate@1234@Hackathon',
                    database: 'postgres',
                    ssl: { rejectUnauthorized: false },
                    max: 10,
                });
            },
        },
    ],
    exports: ['DATABASE_POOL'],
})
export class DatabaseModule { }

import { Module } from '@nestjs/common';

import { CapabilityService } from './capability.service';
import { CapabilityResponse } from './entities/capability-response.entity';

@Module({
    imports: [],
    providers: [CapabilityService],
    exports: [CapabilityService],
})
export class CapabilityModule { }

import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';

@Module({
  controllers: [RagController],
  providers:   [RagService],
  exports:     [RagService], // shared with ChatModule in Step 3
})
export class RagModule {}

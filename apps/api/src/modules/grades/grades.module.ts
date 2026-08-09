import { Module } from '@nestjs/common';
import { GradesController } from './grades.controller';
import { GradesService } from './grades.service';
import { TranscriptService } from './transcript.service';

@Module({
  controllers: [GradesController],
  providers: [GradesService, TranscriptService],
  exports: [GradesService],
})
export class GradesModule {}

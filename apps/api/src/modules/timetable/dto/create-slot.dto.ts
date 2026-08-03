import { IsIn, IsString } from 'class-validator';

export class CreateSlotDto {
  @IsIn(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'])
  day!: string;

  @IsString()
  startTime!: string; // '09:00'

  @IsString()
  endTime!: string; // '10:30'

  @IsString()
  roomId!: string;

  @IsString()
  teacherId!: string;

  @IsString()
  sectionId!: string;
}

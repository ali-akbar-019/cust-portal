import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsIn, IsString, ValidateNested } from 'class-validator';

class AttendanceRecordDto {
  @IsString()
  studentId!: string;

  @IsIn(['PRESENT', 'ABSENT'])
  status!: 'PRESENT' | 'ABSENT';
}

export class MarkAttendanceDto {
  @IsString()
  sectionId!: string;

  @IsDateString()
  date!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records!: AttendanceRecordDto[];
}

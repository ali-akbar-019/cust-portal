import { IsDateString, IsString } from 'class-validator';

export class CreateEnrollmentScheduleDto {
  @IsString()
  departmentId!: string;

  @IsString()
  term!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}

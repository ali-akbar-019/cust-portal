import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateComplaintDto {
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED'])
  status!: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

  @IsOptional()
  @IsString()
  response?: string;
}

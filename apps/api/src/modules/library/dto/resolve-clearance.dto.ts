import { IsIn, IsOptional, IsString } from 'class-validator';

export class ResolveClearanceDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  remarks?: string;
}

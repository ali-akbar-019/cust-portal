import { IsIn, IsOptional, IsString } from 'class-validator';

export class ResolveRequestDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  adminRemarks?: string;
}

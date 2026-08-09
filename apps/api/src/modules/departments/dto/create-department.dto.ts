import { IsOptional, IsString, Matches } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  name!: string;

  @IsString()
  @Matches(/^[A-Z0-9]{2,6}$/, { message: 'code must be 2-6 uppercase letters/digits' })
  code!: string;

  @IsOptional()
  @IsString()
  dayStartTime?: string;

  @IsOptional()
  @IsString()
  dayEndTime?: string;
}
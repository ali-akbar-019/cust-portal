import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  sectionId!: string;

  @IsString()
  @MinLength(3)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  deadline!: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}

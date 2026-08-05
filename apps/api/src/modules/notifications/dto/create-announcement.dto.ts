import { IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(3)
  message!: string;

  @IsIn(['ALL', 'DEPARTMENT', 'SECTION'])
  target!: 'ALL' | 'DEPARTMENT' | 'SECTION';

  @ValidateIf((o) => o.target === 'DEPARTMENT')
  @IsString()
  departmentId?: string;

  @ValidateIf((o) => o.target === 'SECTION')
  @IsString()
  sectionId?: string;
}

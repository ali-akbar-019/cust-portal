import { IsIn, IsString, MinLength, ValidateIf } from 'class-validator';

export class CreateRequestDto {
  @IsIn(['TRANSCRIPT', 'LETTER', 'COURSE_WITHDRAW', 'PERSONAL_INFO_CHANGE', 'GENERAL'])
  type!: 'TRANSCRIPT' | 'LETTER' | 'COURSE_WITHDRAW' | 'PERSONAL_INFO_CHANGE' | 'GENERAL';

  @IsString()
  @MinLength(3)
  details!: string;

  // required only when withdrawing from a specific course
  @ValidateIf((o) => o.type === 'COURSE_WITHDRAW')
  @IsString()
  sectionId?: string;
}

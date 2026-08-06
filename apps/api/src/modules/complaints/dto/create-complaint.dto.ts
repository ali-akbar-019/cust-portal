import { IsString, MinLength } from 'class-validator';

export class CreateComplaintDto {
  @IsString()
  @MinLength(3)
  subject!: string;

  @IsString()
  @MinLength(10)
  description!: string;
}

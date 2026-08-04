import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTeacherDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  departmentId!: string;

  @IsOptional()
  @IsString()
  designation?: string;
}

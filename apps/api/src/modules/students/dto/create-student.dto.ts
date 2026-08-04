import { IsEmail, IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateStudentDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  enrollmentNo!: string;

  @IsString()
  departmentId!: string;

  @IsInt()
  @Min(1)
  semester!: number;
}

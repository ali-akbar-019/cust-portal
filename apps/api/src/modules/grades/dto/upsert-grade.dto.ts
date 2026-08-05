import { IsNumber, IsString, Min } from 'class-validator';

export class UpsertGradeDto {
  @IsString()
  studentId!: string;

  @IsString()
  courseId!: string;

  @IsString()
  component!: string; // "quiz1", "midterm", "final"

  @IsNumber()
  @Min(0)
  marks!: number;

  @IsNumber()
  @Min(0)
  maxMarks!: number;
}

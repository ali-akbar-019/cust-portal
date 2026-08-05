import { IsDateString, IsNumber, IsString, Min, MinLength } from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  studentId!: string;

  @IsString()
  @MinLength(3)
  description!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsDateString()
  dueDate!: string;
}

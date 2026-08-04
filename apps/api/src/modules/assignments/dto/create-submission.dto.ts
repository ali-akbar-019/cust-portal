import { IsString } from 'class-validator';

export class CreateSubmissionDto {
  @IsString()
  fileUrl!: string; // uploaded separately, this DTO just links the file to the assignment
}

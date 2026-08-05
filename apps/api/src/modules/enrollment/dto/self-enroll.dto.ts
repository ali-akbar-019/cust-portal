import { IsString } from 'class-validator';

export class SelfEnrollDto {
  @IsString()
  sectionId!: string;
}

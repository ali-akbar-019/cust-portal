import { IsString } from 'class-validator';

export class ReserveBookDto {
  @IsString()
  bookId!: string;
}

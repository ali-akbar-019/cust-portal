import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import { Role } from '@cust/shared-types';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsIn(['STUDENT', 'TEACHER', 'ADMIN'])
  role!: Role;
}

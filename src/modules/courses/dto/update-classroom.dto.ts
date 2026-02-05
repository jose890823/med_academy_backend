import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateClassroomDto } from './create-classroom.dto';

/**
 * DTO para actualizar un aula virtual
 * Todos los campos son opcionales excepto cohortId que no se puede cambiar
 */
export class UpdateClassroomDto extends PartialType(OmitType(CreateClassroomDto, ['cohortId'] as const)) {}

import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCohortDto } from './create-cohort.dto';

/**
 * DTO para actualizar una convocatoria
 * Todos los campos son opcionales excepto courseId que no se puede cambiar
 */
export class UpdateCohortDto extends PartialType(
  OmitType(CreateCohortDto, ['courseId'] as const),
) {}

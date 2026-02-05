import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateSessionDto } from './create-session.dto';

/**
 * DTO para actualizar una sesión
 */
export class UpdateSessionDto extends PartialType(
  OmitType(CreateSessionDto, ['workshopId'] as const),
) {}

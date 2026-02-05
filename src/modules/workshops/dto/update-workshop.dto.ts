import { PartialType } from '@nestjs/swagger';
import { CreateWorkshopDto } from './create-workshop.dto';

/**
 * DTO para actualizar un workshop
 */
export class UpdateWorkshopDto extends PartialType(CreateWorkshopDto) {}

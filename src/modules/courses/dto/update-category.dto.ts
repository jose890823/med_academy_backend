import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';

/**
 * DTO para actualizar una categoría
 * Todos los campos son opcionales
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

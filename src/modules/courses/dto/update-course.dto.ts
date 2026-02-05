import { PartialType } from '@nestjs/swagger';
import { CreateCourseDto } from './create-course.dto';

/**
 * DTO para actualizar un curso
 * Todos los campos son opcionales
 */
export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

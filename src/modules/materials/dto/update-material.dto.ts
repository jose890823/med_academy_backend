import { PartialType } from '@nestjs/swagger';
import { CreateMaterialDto } from './create-material.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { MaterialStatus } from '../entities/material.entity';

/**
 * DTO para actualizar un material
 */
export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {
  @ApiPropertyOptional({
    example: 'active',
    description: 'Estado del material',
    enum: MaterialStatus,
  })
  @IsOptional()
  @IsEnum(MaterialStatus, { message: 'Estado inválido' })
  status?: MaterialStatus;
}

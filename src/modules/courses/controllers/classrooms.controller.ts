import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';
import { ClassroomsService } from '../services/classrooms.service';
import { CreateClassroomDto, UpdateClassroomDto } from '../dto';
import { Classroom } from '../entities/classroom.entity';

@ApiTags('Admin - Classrooms')
@Controller('v1/admin/classrooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class ClassroomsAdminController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  // ============================================
  // RUTAS ADMINISTRATIVAS
  // ============================================

  @Get('cohort/:cohortId')
  @ApiOperation({
    summary: 'Obtener aulas de una convocatoria',
    description: 'Retorna todas las aulas de una convocatoria',
  })
  @ApiParam({ name: 'cohortId', description: 'UUID de la convocatoria' })
  @ApiResponse({
    status: 200,
    description: 'Lista de aulas',
    type: [Classroom],
  })
  async findByCohort(
    @Param('cohortId', ParseUUIDPipe) cohortId: string,
  ): Promise<Classroom[]> {
    return this.classroomsService.findByCohort(cohortId);
  }

  @Get('cohort/:cohortId/available')
  @ApiOperation({
    summary: 'Obtener aulas con cupo disponible',
    description: 'Retorna las aulas activas con cupo disponible de una convocatoria',
  })
  @ApiParam({ name: 'cohortId', description: 'UUID de la convocatoria' })
  @ApiResponse({
    status: 200,
    description: 'Lista de aulas con cupo disponible',
    type: [Classroom],
  })
  async findAvailableByCohort(
    @Param('cohortId', ParseUUIDPipe) cohortId: string,
  ): Promise<Classroom[]> {
    return this.classroomsService.findAvailableByCohort(cohortId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener aula por ID',
    description: 'Retorna un aula por su ID',
  })
  @ApiParam({ name: 'id', description: 'UUID del aula' })
  @ApiResponse({
    status: 200,
    description: 'Aula encontrada',
    type: Classroom,
  })
  @ApiResponse({ status: 404, description: 'Aula no encontrada' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Classroom> {
    return this.classroomsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear aula',
    description: 'Crea una nueva aula virtual para una convocatoria',
  })
  @ApiResponse({
    status: 201,
    description: 'Aula creada exitosamente',
    type: Classroom,
  })
  @ApiResponse({ status: 404, description: 'Convocatoria no encontrada' })
  async create(@Body() dto: CreateClassroomDto): Promise<Classroom> {
    return this.classroomsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar aula',
    description: 'Actualiza un aula existente',
  })
  @ApiParam({ name: 'id', description: 'UUID del aula' })
  @ApiResponse({
    status: 200,
    description: 'Aula actualizada exitosamente',
    type: Classroom,
  })
  @ApiResponse({ status: 404, description: 'Aula no encontrada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClassroomDto,
  ): Promise<Classroom> {
    return this.classroomsService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({
    summary: 'Activar/Desactivar aula',
    description: 'Cambia el estado activo/inactivo de un aula',
  })
  @ApiParam({ name: 'id', description: 'UUID del aula' })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado exitosamente',
    type: Classroom,
  })
  @ApiResponse({ status: 404, description: 'Aula no encontrada' })
  async toggleActive(@Param('id', ParseUUIDPipe) id: string): Promise<Classroom> {
    return this.classroomsService.toggleActive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar aula',
    description: 'Elimina un aula (solo si no tiene estudiantes asignados)',
  })
  @ApiParam({ name: 'id', description: 'UUID del aula' })
  @ApiResponse({ status: 204, description: 'Aula eliminada exitosamente' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar un aula con estudiantes' })
  @ApiResponse({ status: 404, description: 'Aula no encontrada' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.classroomsService.delete(id);
  }
}

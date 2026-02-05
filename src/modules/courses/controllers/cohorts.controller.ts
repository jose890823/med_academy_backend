import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { UserRole } from '../../auth/entities/user.entity';
import { CohortsService } from '../services/cohorts.service';
import { CreateCohortDto, UpdateCohortDto, CohortQueryDto } from '../dto';
import { Cohort, CohortStatus } from '../entities/cohort.entity';

@ApiTags('Cohorts')
@Controller('v1/cohorts')
export class CohortsController {
  constructor(private readonly cohortsService: CohortsService) {}

  // ============================================
  // RUTAS PÚBLICAS
  // ============================================

  @Get('course/:courseId/open')
  @Public()
  @ApiOperation({
    summary: 'Obtener convocatorias abiertas de un curso',
    description: 'Retorna las convocatorias abiertas para inscripción de un curso',
  })
  @ApiParam({ name: 'courseId', description: 'UUID del curso' })
  @ApiResponse({
    status: 200,
    description: 'Lista de convocatorias abiertas',
    type: [Cohort],
  })
  async findOpenByCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<Cohort[]> {
    return this.cohortsService.findOpenByCourse(courseId);
  }

  @Get('code/:code')
  @Public()
  @ApiOperation({
    summary: 'Obtener convocatoria por código',
    description: 'Retorna una convocatoria por su código único',
  })
  @ApiParam({ name: 'code', description: 'Código de la convocatoria' })
  @ApiResponse({
    status: 200,
    description: 'Convocatoria encontrada',
    type: Cohort,
  })
  @ApiResponse({ status: 404, description: 'Convocatoria no encontrada' })
  async findByCode(@Param('code') code: string): Promise<Cohort> {
    return this.cohortsService.findByCode(code);
  }
}

@ApiTags('Admin - Cohorts')
@Controller('v1/admin/cohorts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class CohortsAdminController {
  constructor(private readonly cohortsService: CohortsService) {}

  // ============================================
  // RUTAS ADMINISTRATIVAS
  // ============================================

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las convocatorias (Admin)',
    description: 'Retorna todas las convocatorias con filtros y paginación',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de convocatorias con paginación',
  })
  async findAll(@Query() query: CohortQueryDto) {
    return this.cohortsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener convocatoria por ID (Admin)',
    description: 'Retorna una convocatoria por su ID',
  })
  @ApiParam({ name: 'id', description: 'UUID de la convocatoria' })
  @ApiResponse({
    status: 200,
    description: 'Convocatoria encontrada',
    type: Cohort,
  })
  @ApiResponse({ status: 404, description: 'Convocatoria no encontrada' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Cohort> {
    return this.cohortsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear convocatoria',
    description: 'Crea una nueva convocatoria para un curso',
  })
  @ApiResponse({
    status: 201,
    description: 'Convocatoria creada exitosamente',
    type: Cohort,
  })
  @ApiResponse({ status: 404, description: 'Curso no encontrado' })
  @ApiResponse({ status: 409, description: 'Ya existe una convocatoria con este código' })
  async create(@Body() dto: CreateCohortDto): Promise<Cohort> {
    return this.cohortsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar convocatoria',
    description: 'Actualiza una convocatoria existente',
  })
  @ApiParam({ name: 'id', description: 'UUID de la convocatoria' })
  @ApiResponse({
    status: 200,
    description: 'Convocatoria actualizada exitosamente',
    type: Cohort,
  })
  @ApiResponse({ status: 404, description: 'Convocatoria no encontrada' })
  @ApiResponse({ status: 409, description: 'Ya existe una convocatoria con este código' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCohortDto,
  ): Promise<Cohort> {
    return this.cohortsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Cambiar estado de la convocatoria',
    description: 'Cambia el estado de una convocatoria',
  })
  @ApiParam({ name: 'id', description: 'UUID de la convocatoria' })
  @ApiQuery({ name: 'status', enum: CohortStatus, description: 'Nuevo estado' })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado exitosamente',
    type: Cohort,
  })
  @ApiResponse({ status: 404, description: 'Convocatoria no encontrada' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status: CohortStatus,
  ): Promise<Cohort> {
    return this.cohortsService.updateStatus(id, status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar convocatoria',
    description: 'Elimina una convocatoria',
  })
  @ApiParam({ name: 'id', description: 'UUID de la convocatoria' })
  @ApiResponse({ status: 204, description: 'Convocatoria eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Convocatoria no encontrada' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.cohortsService.delete(id);
  }
}

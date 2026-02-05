import {
  Controller,
  Get,
  Post,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';
import { InstructorsService } from '../services/instructors.service';
import { InstructorProfile } from '../entities/instructor-profile.entity';
import {
  CreateInstructorProfileDto,
  UpdateInstructorProfileDto,
  InstructorQueryDto,
} from '../dto';

/**
 * Controlador de Perfiles de Instructores para administradores
 */
@ApiTags('Admin - Instructors')
@Controller('v1/admin/instructors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class InstructorsAdminController {
  constructor(private readonly instructorsService: InstructorsService) {}

  // ============================================
  // LISTAR
  // ============================================

  @Get()
  @ApiOperation({
    summary: 'Listar todos los instructores',
    description: 'Lista todos los perfiles de instructores (incluye inactivos)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de instructores con paginación',
  })
  async findAll(@Query() query: InstructorQueryDto) {
    // Admin puede ver todos, incluso inactivos
    const fullQuery = { ...query };
    if (query.isActive === undefined) {
      delete (fullQuery as any).isActive;
    }
    return this.instructorsService.findAll(fullQuery);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener instructor por ID',
    description: 'Obtiene un perfil de instructor específico',
  })
  @ApiParam({ name: 'id', description: 'UUID del perfil' })
  @ApiResponse({
    status: 200,
    description: 'Perfil de instructor',
    type: InstructorProfile,
  })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InstructorProfile> {
    return this.instructorsService.findById(id);
  }

  // ============================================
  // CREAR
  // ============================================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear perfil de instructor',
    description: 'Crea un nuevo perfil de instructor para un usuario existente',
  })
  @ApiResponse({
    status: 201,
    description: 'Perfil creado',
    type: InstructorProfile,
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Usuario ya tiene perfil de instructor',
  })
  async create(
    @Body() dto: CreateInstructorProfileDto,
  ): Promise<InstructorProfile> {
    return this.instructorsService.create(dto);
  }

  // ============================================
  // ACTUALIZAR
  // ============================================

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar perfil',
    description: 'Actualiza un perfil de instructor',
  })
  @ApiParam({ name: 'id', description: 'UUID del perfil' })
  @ApiResponse({
    status: 200,
    description: 'Perfil actualizado',
    type: InstructorProfile,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInstructorProfileDto,
  ): Promise<InstructorProfile> {
    return this.instructorsService.update(id, dto);
  }

  @Patch(':id/feature')
  @ApiOperation({
    summary: 'Destacar/quitar destacado',
    description: 'Alterna el estado de destacado de un instructor',
  })
  @ApiParam({ name: 'id', description: 'UUID del perfil' })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado',
    type: InstructorProfile,
  })
  async toggleFeatured(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InstructorProfile> {
    return this.instructorsService.toggleFeatured(id);
  }

  @Patch(':id/stats')
  @ApiOperation({
    summary: 'Actualizar estadísticas',
    description:
      'Recalcula las estadísticas del instructor (cursos, estudiantes, reviews)',
  })
  @ApiParam({ name: 'id', description: 'UUID del perfil' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas actualizadas',
  })
  async updateStats(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    const profile = await this.instructorsService.findById(id);
    await this.instructorsService.updateCourseStats(profile.userId);
    await this.instructorsService.updateReviewStats(profile.userId);
    return { message: 'Estadísticas actualizadas correctamente' };
  }

  // ============================================
  // ELIMINAR
  // ============================================

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar perfil',
    description: 'Elimina un perfil de instructor',
  })
  @ApiParam({ name: 'id', description: 'UUID del perfil' })
  @ApiResponse({ status: 204, description: 'Perfil eliminado' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.instructorsService.delete(id);
  }
}

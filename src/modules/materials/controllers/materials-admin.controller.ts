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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../auth/entities/user.entity';
import { MaterialsService } from '../services/materials.service';
import { Material } from '../entities/material.entity';
import {
  CreateMaterialDto,
  UpdateMaterialDto,
  MaterialQueryDto,
} from '../dto';

/**
 * Controlador de materiales para administradores
 * CRUD completo y gestión de archivos
 */
@ApiTags('Admin - Materials')
@Controller('v1/admin/materials')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class MaterialsAdminController {
  constructor(private readonly materialsService: MaterialsService) {}

  // ============================================
  // CREAR
  // ============================================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear material',
    description: 'Crea un nuevo material para un curso/módulo',
  })
  @ApiResponse({
    status: 201,
    description: 'Material creado',
    type: Material,
  })
  async create(
    @Body() dto: CreateMaterialDto,
    @CurrentUser() user: User,
  ): Promise<Material> {
    return this.materialsService.create(dto, user.id);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear múltiples materiales',
    description: 'Crea varios materiales a la vez',
  })
  @ApiResponse({
    status: 201,
    description: 'Materiales creados',
    type: [Material],
  })
  async createMany(
    @Body() materials: CreateMaterialDto[],
    @CurrentUser() user: User,
  ): Promise<Material[]> {
    return this.materialsService.createMany(materials, user.id);
  }

  // ============================================
  // LISTAR
  // ============================================

  @Get()
  @ApiOperation({
    summary: 'Listar materiales',
    description: 'Lista todos los materiales con filtros y paginación',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de materiales con paginación',
  })
  async findAll(@Query() query: MaterialQueryDto) {
    return this.materialsService.findAll(query);
  }

  @Get('course/:courseId')
  @ApiOperation({
    summary: 'Materiales de un curso',
    description: 'Lista todos los materiales de un curso',
  })
  @ApiParam({ name: 'courseId', description: 'UUID del curso' })
  @ApiResponse({
    status: 200,
    description: 'Lista de materiales del curso',
    type: [Material],
  })
  async findByCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<Material[]> {
    return this.materialsService.findByCourse(courseId);
  }

  @Get('module/:moduleId')
  @ApiOperation({
    summary: 'Materiales de un módulo',
    description: 'Lista todos los materiales de un módulo',
  })
  @ApiParam({ name: 'moduleId', description: 'UUID del módulo' })
  @ApiResponse({
    status: 200,
    description: 'Lista de materiales del módulo',
    type: [Material],
  })
  async findByModule(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ): Promise<Material[]> {
    return this.materialsService.findByModule(moduleId);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Estadísticas de materiales',
    description: 'Obtiene estadísticas de todos los materiales',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas',
  })
  async getStats(@Query('courseId') courseId?: string) {
    return this.materialsService.getStats(courseId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener material',
    description: 'Obtiene un material por su ID',
  })
  @ApiParam({ name: 'id', description: 'UUID del material' })
  @ApiResponse({
    status: 200,
    description: 'Material encontrado',
    type: Material,
  })
  @ApiResponse({ status: 404, description: 'Material no encontrado' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Material> {
    return this.materialsService.findById(id);
  }

  // ============================================
  // ACTUALIZAR
  // ============================================

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar material',
    description: 'Actualiza los datos de un material',
  })
  @ApiParam({ name: 'id', description: 'UUID del material' })
  @ApiResponse({
    status: 200,
    description: 'Material actualizado',
    type: Material,
  })
  @ApiResponse({ status: 404, description: 'Material no encontrado' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaterialDto,
  ): Promise<Material> {
    return this.materialsService.update(id, dto);
  }

  @Patch('module/:moduleId/reorder')
  @ApiOperation({
    summary: 'Reordenar materiales',
    description: 'Cambia el orden de los materiales de un módulo',
  })
  @ApiParam({ name: 'moduleId', description: 'UUID del módulo' })
  @ApiResponse({
    status: 200,
    description: 'Materiales reordenados',
    type: [Material],
  })
  async reorder(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() body: { materialIds: string[] },
  ): Promise<Material[]> {
    return this.materialsService.reorder(moduleId, body.materialIds);
  }

  // ============================================
  // ELIMINAR
  // ============================================

  @Patch(':id/archive')
  @ApiOperation({
    summary: 'Archivar material',
    description: 'Archiva un material (no lo elimina)',
  })
  @ApiParam({ name: 'id', description: 'UUID del material' })
  @ApiResponse({
    status: 200,
    description: 'Material archivado',
    type: Material,
  })
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Material> {
    return this.materialsService.archive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar material',
    description: 'Elimina un material (soft delete)',
  })
  @ApiParam({ name: 'id', description: 'UUID del material' })
  @ApiResponse({ status: 204, description: 'Material eliminado' })
  @ApiResponse({ status: 404, description: 'Material no encontrado' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.materialsService.delete(id);
  }

  @Delete(':id/permanent')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar permanentemente',
    description: 'Elimina un material de forma permanente (solo Super Admin)',
  })
  @ApiParam({ name: 'id', description: 'UUID del material' })
  @ApiResponse({ status: 204, description: 'Material eliminado permanentemente' })
  async hardDelete(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.materialsService.hardDelete(id);
  }
}

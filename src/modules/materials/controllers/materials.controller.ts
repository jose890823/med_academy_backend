import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../auth/entities/user.entity';
import { Public } from '../../auth/decorators/public.decorator';
import { MaterialsService } from '../services/materials.service';
import { Material } from '../entities/material.entity';
import { MaterialQueryDto } from '../dto';
import { ErrorCodes } from '../../../common/dto';

/**
 * Controlador de materiales para estudiantes
 * Endpoints para ver y descargar materiales
 */
@ApiTags('Materials')
@Controller('v1/materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  // ============================================
  // MATERIALES PÚBLICOS (sin auth)
  // ============================================

  @Get('public/course/:courseId')
  @Public()
  @ApiOperation({
    summary: 'Materiales públicos de un curso',
    description: 'Obtiene los materiales públicos de un curso (sin autenticación)',
  })
  @ApiParam({ name: 'courseId', description: 'UUID del curso' })
  @ApiResponse({
    status: 200,
    description: 'Lista de materiales públicos',
    type: [Material],
  })
  async getPublicMaterials(
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<Material[]> {
    return this.materialsService.findPublicByCourse(courseId);
  }

  // ============================================
  // MATERIALES POR MÓDULO (auth requerido)
  // ============================================

  @Get('module/:moduleId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Materiales de un módulo',
    description: 'Obtiene los materiales de un módulo (requiere estar inscrito)',
  })
  @ApiParam({ name: 'moduleId', description: 'UUID del módulo' })
  @ApiResponse({
    status: 200,
    description: 'Lista de materiales del módulo',
    type: [Material],
  })
  async getModuleMaterials(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @CurrentUser() user: User,
  ): Promise<Material[]> {
    // TODO: Validar que el usuario tiene acceso al módulo
    return this.materialsService.findByModule(moduleId);
  }

  // ============================================
  // MATERIALES POR CURSO (auth requerido)
  // ============================================

  @Get('course/:courseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Materiales de un curso',
    description: 'Obtiene todos los materiales de un curso (requiere estar inscrito)',
  })
  @ApiParam({ name: 'courseId', description: 'UUID del curso' })
  @ApiResponse({
    status: 200,
    description: 'Lista de materiales del curso',
    type: [Material],
  })
  async getCourseMaterials(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() user: User,
  ): Promise<Material[]> {
    // TODO: Validar que el usuario tiene acceso al curso
    return this.materialsService.findByCourse(courseId);
  }

  // ============================================
  // OBTENER MATERIAL
  // ============================================

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener material por ID',
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
    @CurrentUser() user: User,
  ): Promise<Material> {
    const material = await this.materialsService.findById(id);

    // Si es público, retornar
    if (material.isPublic) {
      return material;
    }

    // TODO: Validar acceso basado en inscripción
    // Por ahora, permitir a usuarios autenticados

    return material;
  }

  // ============================================
  // DESCARGA
  // ============================================

  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener URL de descarga',
    description: 'Obtiene la URL para descargar un material',
  })
  @ApiParam({ name: 'id', description: 'UUID del material' })
  @ApiResponse({
    status: 200,
    description: 'URL de descarga',
  })
  @ApiResponse({ status: 403, description: 'Sin acceso al material' })
  @ApiResponse({ status: 404, description: 'Material no encontrado' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<{
    url: string;
    filename: string;
    mimeType: string | null;
  }> {
    const material = await this.materialsService.findById(id);

    // Verificar si permite descarga
    if (!material.allowDownload) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Este material no permite descarga',
      });
    }

    // Si es público, permitir
    if (!material.isPublic) {
      // TODO: Validar acceso basado en inscripción
    }

    // Registrar la descarga
    await this.materialsService.registerDownload(id);

    return this.materialsService.getDownloadUrl(id);
  }
}

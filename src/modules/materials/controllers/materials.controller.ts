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
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../auth/entities/user.entity';
import { Public } from '../../auth/decorators/public.decorator';
import { MaterialsService } from '../services/materials.service';
import { EnrollmentsService } from '../../enrollments/services/enrollments.service';
import { CourseModule as CourseModuleEntity } from '../../courses/entities/course-module.entity';
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
  constructor(
    private readonly materialsService: MaterialsService,
    private readonly enrollmentsService: EnrollmentsService,
    @InjectRepository(CourseModuleEntity)
    private readonly courseModuleRepository: Repository<CourseModuleEntity>,
  ) {}

  /**
   * Verificar que el usuario tiene acceso al curso (inscrito o admin)
   */
  private async verifyAccess(
    user: User,
    courseId: string,
  ): Promise<void> {
    if (user.isAdmin()) return;

    const hasAccess = await this.enrollmentsService.hasAccess(
      user.id,
      courseId,
    );

    if (!hasAccess) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'No estás inscrito en este curso',
      });
    }
  }

  // ============================================
  // MATERIALES PÚBLICOS (sin auth)
  // ============================================

  @Get('public/course/:courseId')
  @Public()
  @ApiOperation({
    summary: 'Materiales públicos de un curso',
    description:
      'Obtiene los materiales públicos de un curso (sin autenticación)',
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
    description:
      'Obtiene los materiales de un módulo (requiere estar inscrito)',
  })
  @ApiParam({ name: 'moduleId', description: 'UUID del módulo' })
  @ApiResponse({
    status: 200,
    description: 'Lista de materiales del módulo',
    type: [Material],
  })
  @ApiResponse({ status: 403, description: 'No inscrito en el curso' })
  @ApiResponse({ status: 404, description: 'Módulo no encontrado' })
  async getModuleMaterials(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @CurrentUser() user: User,
  ): Promise<Material[]> {
    // Resolver moduleId → courseId
    const courseModule = await this.courseModuleRepository.findOne({
      where: { id: moduleId },
    });

    if (!courseModule) {
      throw new NotFoundException({
        code: 'MODULE_NOT_FOUND',
        message: 'El módulo no fue encontrado',
      });
    }

    await this.verifyAccess(user, courseModule.courseId);

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
    description:
      'Obtiene todos los materiales de un curso (requiere estar inscrito)',
  })
  @ApiParam({ name: 'courseId', description: 'UUID del curso' })
  @ApiResponse({
    status: 200,
    description: 'Lista de materiales del curso',
    type: [Material],
  })
  @ApiResponse({ status: 403, description: 'No inscrito en el curso' })
  async getCourseMaterials(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() user: User,
  ): Promise<Material[]> {
    await this.verifyAccess(user, courseId);

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
  @ApiResponse({ status: 403, description: 'Sin acceso al material' })
  @ApiResponse({ status: 404, description: 'Material no encontrado' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Material> {
    const material = await this.materialsService.findById(id);

    // Si es público, retornar sin verificar
    if (material.isPublic) {
      return material;
    }

    // Material vinculado a un curso: verificar inscripción
    if (material.courseId) {
      await this.verifyAccess(user, material.courseId);
    } else if (!user.isAdmin()) {
      // Material sin curso y no público: solo admins
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'No tienes acceso a este material',
      });
    }

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

    // Verificar acceso si no es público
    if (!material.isPublic) {
      if (material.courseId) {
        await this.verifyAccess(user, material.courseId);
      } else if (!user.isAdmin()) {
        throw new ForbiddenException({
          code: ErrorCodes.FORBIDDEN,
          message: 'No tienes acceso a este material',
        });
      }
    }

    // Registrar la descarga
    await this.materialsService.registerDownload(id);

    return this.materialsService.getDownloadUrl(id);
  }
}

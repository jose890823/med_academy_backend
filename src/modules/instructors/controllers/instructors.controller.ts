import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { InstructorsService } from '../services/instructors.service';
import { InstructorProfile } from '../entities/instructor-profile.entity';
import { InstructorQueryDto } from '../dto';

/**
 * Controlador público de Perfiles de Instructores
 */
@ApiTags('Instructors')
@Controller('v1/instructors')
@Public()
export class InstructorsController {
  constructor(private readonly instructorsService: InstructorsService) {}

  // ============================================
  // LISTAR
  // ============================================

  @Get()
  @ApiOperation({
    summary: 'Listar instructores',
    description: 'Lista perfiles de instructores con filtros',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de instructores con paginación',
  })
  async findAll(@Query() query: InstructorQueryDto) {
    return this.instructorsService.findAll(query);
  }

  @Get('featured')
  @ApiOperation({
    summary: 'Instructores destacados',
    description: 'Lista instructores marcados como destacados',
  })
  @ApiResponse({
    status: 200,
    description: 'Instructores destacados',
    type: [InstructorProfile],
  })
  async findFeatured(): Promise<InstructorProfile[]> {
    return this.instructorsService.findFeatured();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener instructor por ID',
    description: 'Obtiene un perfil de instructor específico',
  })
  @ApiParam({ name: 'id', description: 'UUID del perfil' })
  @ApiResponse({
    status: 200,
    description: 'Perfil de instructor encontrado',
    type: InstructorProfile,
  })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InstructorProfile> {
    return this.instructorsService.findById(id);
  }

  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Obtener instructor por slug',
    description: 'Obtiene un perfil de instructor por su URL slug',
  })
  @ApiParam({ name: 'slug', description: 'Slug del instructor' })
  @ApiResponse({
    status: 200,
    description: 'Perfil de instructor encontrado',
    type: InstructorProfile,
  })
  async findBySlug(
    @Param('slug') slug: string,
  ): Promise<InstructorProfile> {
    return this.instructorsService.findBySlug(slug);
  }

  @Get(':id/courses')
  @ApiOperation({
    summary: 'Cursos del instructor',
    description: 'Obtiene los cursos publicados de un instructor',
  })
  @ApiParam({ name: 'id', description: 'UUID del perfil de instructor' })
  @ApiResponse({
    status: 200,
    description: 'Cursos del instructor',
  })
  async getInstructorCourses(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.instructorsService.getInstructorCourses(id);
  }
}

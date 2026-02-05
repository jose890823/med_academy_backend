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
import { CoursesService } from '../services/courses.service';
import { CreateCourseDto, UpdateCourseDto, CourseQueryDto } from '../dto';
import { Course, CourseStatus } from '../entities/course.entity';

@ApiTags('Courses')
@Controller('v1/courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // ============================================
  // RUTAS PÚBLICAS
  // ============================================

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Obtener cursos publicados',
    description: 'Retorna la lista de cursos publicados con filtros y paginación',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de cursos publicados con paginación',
  })
  async findPublished(@Query() query: CourseQueryDto) {
    return this.coursesService.findPublished(query);
  }

  @Get('featured')
  @Public()
  @ApiOperation({
    summary: 'Obtener cursos destacados',
    description: 'Retorna los cursos destacados publicados',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Cantidad de cursos a retornar (default: 6)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de cursos destacados',
    type: [Course],
  })
  async findFeatured(@Query('limit') limit?: number): Promise<Course[]> {
    return this.coursesService.findFeatured(limit);
  }

  @Get('category/:categoryId')
  @Public()
  @ApiOperation({
    summary: 'Obtener cursos por categoría',
    description: 'Retorna los cursos publicados de una categoría',
  })
  @ApiParam({ name: 'categoryId', description: 'UUID de la categoría' })
  @ApiResponse({
    status: 200,
    description: 'Lista de cursos de la categoría',
    type: [Course],
  })
  async findByCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ): Promise<Course[]> {
    return this.coursesService.findByCategory(categoryId);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({
    summary: 'Obtener curso por slug',
    description: 'Retorna un curso publicado por su slug',
  })
  @ApiParam({ name: 'slug', description: 'Slug del curso' })
  @ApiResponse({
    status: 200,
    description: 'Curso encontrado',
    type: Course,
  })
  @ApiResponse({ status: 404, description: 'Curso no encontrado' })
  async findBySlug(@Param('slug') slug: string): Promise<Course> {
    return this.coursesService.findPublishedBySlug(slug);
  }
}

@ApiTags('Admin - Courses')
@Controller('v1/admin/courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class CoursesAdminController {
  constructor(private readonly coursesService: CoursesService) {}

  // ============================================
  // RUTAS ADMINISTRATIVAS
  // ============================================

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los cursos (Admin)',
    description: 'Retorna todos los cursos con filtros y paginación',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de cursos con paginación',
  })
  async findAll(@Query() query: CourseQueryDto) {
    return this.coursesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener curso por ID (Admin)',
    description: 'Retorna un curso por su ID (cualquier estado)',
  })
  @ApiParam({ name: 'id', description: 'UUID del curso' })
  @ApiResponse({
    status: 200,
    description: 'Curso encontrado',
    type: Course,
  })
  @ApiResponse({ status: 404, description: 'Curso no encontrado' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Course> {
    return this.coursesService.findById(id);
  }

  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Obtener curso por slug (Admin)',
    description: 'Retorna un curso por su slug (cualquier estado)',
  })
  @ApiParam({ name: 'slug', description: 'Slug del curso' })
  @ApiResponse({
    status: 200,
    description: 'Curso encontrado',
    type: Course,
  })
  @ApiResponse({ status: 404, description: 'Curso no encontrado' })
  async findBySlug(@Param('slug') slug: string): Promise<Course> {
    return this.coursesService.findBySlug(slug);
  }

  @Get('instructor/:instructorId')
  @ApiOperation({
    summary: 'Obtener cursos por instructor',
    description: 'Retorna los cursos asignados a un instructor',
  })
  @ApiParam({ name: 'instructorId', description: 'UUID del instructor' })
  @ApiResponse({
    status: 200,
    description: 'Lista de cursos del instructor',
    type: [Course],
  })
  async findByInstructor(
    @Param('instructorId', ParseUUIDPipe) instructorId: string,
  ): Promise<Course[]> {
    return this.coursesService.findByInstructor(instructorId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear curso',
    description: 'Crea un nuevo curso',
  })
  @ApiResponse({
    status: 201,
    description: 'Curso creado exitosamente',
    type: Course,
  })
  @ApiResponse({ status: 409, description: 'Ya existe un curso con este slug' })
  async create(@Body() dto: CreateCourseDto): Promise<Course> {
    return this.coursesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar curso',
    description: 'Actualiza un curso existente',
  })
  @ApiParam({ name: 'id', description: 'UUID del curso' })
  @ApiResponse({
    status: 200,
    description: 'Curso actualizado exitosamente',
    type: Course,
  })
  @ApiResponse({ status: 404, description: 'Curso no encontrado' })
  @ApiResponse({ status: 409, description: 'Ya existe un curso con este slug' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
  ): Promise<Course> {
    return this.coursesService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Cambiar estado del curso',
    description: 'Cambia el estado de un curso (draft, published, archived)',
  })
  @ApiParam({ name: 'id', description: 'UUID del curso' })
  @ApiQuery({ name: 'status', enum: CourseStatus, description: 'Nuevo estado' })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado exitosamente',
    type: Course,
  })
  @ApiResponse({ status: 404, description: 'Curso no encontrado' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status: CourseStatus,
  ): Promise<Course> {
    return this.coursesService.updateStatus(id, status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar curso',
    description: 'Elimina un curso (soft delete)',
  })
  @ApiParam({ name: 'id', description: 'UUID del curso' })
  @ApiResponse({ status: 204, description: 'Curso eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Curso no encontrado' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.coursesService.delete(id);
  }
}

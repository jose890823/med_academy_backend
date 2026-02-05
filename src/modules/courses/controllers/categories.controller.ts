import {
  Controller,
  Get,
  Post,
  Put,
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
import { Public } from '../../auth/decorators/public.decorator';
import { UserRole } from '../../auth/entities/user.entity';
import { CategoriesService } from '../services/categories.service';
import { CreateCategoryDto, UpdateCategoryDto, CategoryQueryDto } from '../dto';
import { Category } from '../entities/category.entity';

@ApiTags('Categories')
@Controller('v1/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ============================================
  // RUTAS PÚBLICAS
  // ============================================

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Obtener categorías activas',
    description: 'Retorna la lista de categorías activas ordenadas por orden y nombre',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorías activas',
    type: [Category],
  })
  async findActive(): Promise<Category[]> {
    return this.categoriesService.findActive();
  }

  @Get(':slug')
  @Public()
  @ApiOperation({
    summary: 'Obtener categoría por slug',
    description: 'Retorna una categoría por su slug',
  })
  @ApiParam({ name: 'slug', description: 'Slug de la categoría' })
  @ApiResponse({
    status: 200,
    description: 'Categoría encontrada',
    type: Category,
  })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  async findBySlug(@Param('slug') slug: string): Promise<Category> {
    return this.categoriesService.findBySlug(slug);
  }
}

@ApiTags('Admin - Categories')
@Controller('v1/admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class CategoriesAdminController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ============================================
  // RUTAS ADMINISTRATIVAS
  // ============================================

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las categorías (Admin)',
    description: 'Retorna todas las categorías con paginación',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorías con paginación',
  })
  async findAll(@Query() query: CategoryQueryDto) {
    return this.categoriesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener categoría por ID (Admin)',
    description: 'Retorna una categoría por su ID',
  })
  @ApiParam({ name: 'id', description: 'UUID de la categoría' })
  @ApiResponse({
    status: 200,
    description: 'Categoría encontrada',
    type: Category,
  })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Category> {
    return this.categoriesService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear categoría',
    description: 'Crea una nueva categoría',
  })
  @ApiResponse({
    status: 201,
    description: 'Categoría creada exitosamente',
    type: Category,
  })
  @ApiResponse({ status: 409, description: 'Ya existe una categoría con este slug' })
  async create(@Body() dto: CreateCategoryDto): Promise<Category> {
    return this.categoriesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar categoría',
    description: 'Actualiza una categoría existente',
  })
  @ApiParam({ name: 'id', description: 'UUID de la categoría' })
  @ApiResponse({
    status: 200,
    description: 'Categoría actualizada exitosamente',
    type: Category,
  })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  @ApiResponse({ status: 409, description: 'Ya existe una categoría con este slug' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar categoría',
    description: 'Elimina una categoría',
  })
  @ApiParam({ name: 'id', description: 'UUID de la categoría' })
  @ApiResponse({ status: 204, description: 'Categoría eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.categoriesService.delete(id);
  }
}

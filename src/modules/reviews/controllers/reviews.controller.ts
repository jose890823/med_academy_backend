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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { User } from '../../auth/entities/user.entity';
import { ReviewsService } from '../services/reviews.service';
import { Review } from '../entities/review.entity';
import { CreateReviewDto, UpdateReviewDto, ReviewQueryDto } from '../dto';

/**
 * Controlador de Reviews para estudiantes
 */
@ApiTags('Reviews')
@Controller('v1/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ============================================
  // REVIEWS PÚBLICOS
  // ============================================

  @Get('featured')
  @Public()
  @ApiOperation({
    summary: 'Reviews destacados',
    description: 'Obtiene reviews destacados y aprobados de todos los cursos',
  })
  @ApiResponse({
    status: 200,
    description: 'Reviews destacados',
  })
  async getFeaturedReviews(@Query() query: ReviewQueryDto) {
    return this.reviewsService.findAll({
      ...query,
      featured: true,
      sortBy: query.sortBy || 'helpfulCount',
    });
  }

  @Get('course/:courseId')
  @Public()
  @ApiOperation({
    summary: 'Reviews de un curso',
    description: 'Obtiene los reviews públicos de un curso',
  })
  @ApiParam({ name: 'courseId', description: 'UUID del curso' })
  @ApiResponse({
    status: 200,
    description: 'Reviews del curso',
  })
  async getCourseReviews(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.findAll({ ...query, courseId });
  }

  @Get('course/:courseId/summary')
  @Public()
  @ApiOperation({
    summary: 'Resumen de reviews',
    description: 'Obtiene el promedio y distribución de reviews de un curso',
  })
  @ApiParam({ name: 'courseId', description: 'UUID del curso' })
  @ApiResponse({
    status: 200,
    description: 'Resumen de reviews',
  })
  async getCourseSummary(
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
  }> {
    return this.reviewsService.getCourseSummary(courseId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Obtener review por ID',
    description: 'Obtiene un review específico',
  })
  @ApiParam({ name: 'id', description: 'UUID del review' })
  @ApiResponse({
    status: 200,
    description: 'Review encontrado',
    type: Review,
  })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<Review> {
    return this.reviewsService.findById(id);
  }

  // ============================================
  // CREAR REVIEW (AUTH REQUERIDO)
  // ============================================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear review',
    description: 'Crea un review para un curso (requiere inscripción)',
  })
  @ApiResponse({
    status: 201,
    description: 'Review creado',
    type: Review,
  })
  @ApiResponse({ status: 403, description: 'No tienes acceso a este curso' })
  @ApiResponse({
    status: 409,
    description: 'Ya dejaste un review para este curso',
  })
  async create(
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: User,
  ): Promise<Review> {
    return this.reviewsService.create(dto, user.id);
  }

  // ============================================
  // MIS REVIEWS
  // ============================================

  @Get('my/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mis reviews',
    description: 'Obtiene los reviews del usuario actual',
  })
  @ApiResponse({
    status: 200,
    description: 'Reviews del usuario',
  })
  async getMyReviews(
    @CurrentUser() user: User,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.findAll({ ...query, studentId: user.id });
  }

  // ============================================
  // ACTUALIZAR REVIEW
  // ============================================

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar review',
    description: 'Actualiza un review propio',
  })
  @ApiParam({ name: 'id', description: 'UUID del review' })
  @ApiResponse({
    status: 200,
    description: 'Review actualizado',
    type: Review,
  })
  @ApiResponse({ status: 403, description: 'No puedes editar este review' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() user: User,
  ): Promise<Review> {
    return this.reviewsService.update(id, dto, user.id);
  }

  // ============================================
  // MARCAR COMO ÚTIL
  // ============================================

  @Post(':id/helpful')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Marcar como útil',
    description: 'Marca un review como útil (voto de utilidad)',
  })
  @ApiParam({ name: 'id', description: 'UUID del review' })
  @ApiResponse({
    status: 200,
    description: 'Review marcado como útil',
    type: Review,
  })
  async markAsHelpful(@Param('id', ParseUUIDPipe) id: string): Promise<Review> {
    return this.reviewsService.markAsHelpful(id);
  }

  // ============================================
  // ELIMINAR REVIEW
  // ============================================

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar review',
    description: 'Elimina un review propio',
  })
  @ApiParam({ name: 'id', description: 'UUID del review' })
  @ApiResponse({ status: 204, description: 'Review eliminado' })
  @ApiResponse({ status: 403, description: 'No puedes eliminar este review' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.reviewsService.delete(id, user.id);
  }
}

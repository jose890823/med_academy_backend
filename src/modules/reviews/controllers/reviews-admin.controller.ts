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
import { ReviewsService } from '../services/reviews.service';
import { Review } from '../entities/review.entity';
import {
  ReviewQueryDto,
  InstructorResponseDto,
  ModerateReviewDto,
} from '../dto';

/**
 * Controlador de Reviews para administradores
 */
@ApiTags('Admin - Reviews')
@Controller('v1/admin/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class ReviewsAdminController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ============================================
  // LISTAR
  // ============================================

  @Get()
  @ApiOperation({
    summary: 'Listar todos los reviews',
    description:
      'Lista todos los reviews con filtros (incluye todos los estados)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de reviews con paginación',
  })
  async findAll(@Query() query: ReviewQueryDto) {
    return this.reviewsService.findAll(query);
  }

  @Get('pending')
  @ApiOperation({
    summary: 'Reviews pendientes de moderación',
    description: 'Lista reviews que requieren moderación',
  })
  @ApiResponse({
    status: 200,
    description: 'Reviews pendientes',
    type: [Review],
  })
  async findPendingModeration(): Promise<Review[]> {
    return this.reviewsService.findPendingModeration();
  }

  @Get(':id')
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
  // MODERACIÓN
  // ============================================

  @Patch(':id/moderate')
  @ApiOperation({
    summary: 'Moderar review',
    description: 'Aprobar, rechazar u ocultar un review',
  })
  @ApiParam({ name: 'id', description: 'UUID del review' })
  @ApiResponse({
    status: 200,
    description: 'Review moderado',
    type: Review,
  })
  async moderate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateReviewDto,
    @CurrentUser() user: User,
  ): Promise<Review> {
    return this.reviewsService.moderate(id, dto, user.id);
  }

  @Patch(':id/feature')
  @ApiOperation({
    summary: 'Destacar/quitar destacado',
    description: 'Alterna el estado de destacado de un review',
  })
  @ApiParam({ name: 'id', description: 'UUID del review' })
  @ApiResponse({
    status: 200,
    description: 'Review actualizado',
    type: Review,
  })
  async toggleFeatured(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Review> {
    return this.reviewsService.toggleFeatured(id);
  }

  // ============================================
  // RESPUESTA DE INSTRUCTOR
  // ============================================

  @Patch(':id/respond')
  @ApiOperation({
    summary: 'Responder a review',
    description: 'Agregar o actualizar respuesta del instructor',
  })
  @ApiParam({ name: 'id', description: 'UUID del review' })
  @ApiResponse({
    status: 200,
    description: 'Respuesta agregada',
    type: Review,
  })
  async respond(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InstructorResponseDto,
    @CurrentUser() user: User,
  ): Promise<Review> {
    return this.reviewsService.addInstructorResponse(id, dto, user.id);
  }

  // ============================================
  // ELIMINAR
  // ============================================

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar review',
    description: 'Elimina un review (admin)',
  })
  @ApiParam({ name: 'id', description: 'UUID del review' })
  @ApiResponse({ status: 204, description: 'Review eliminado' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.reviewsService.delete(id, user.id, true);
  }
}

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
import { DiscussionsService } from '../services/discussions.service';
import { Discussion } from '../entities/discussion.entity';
import {
  CreateDiscussionDto,
  UpdateDiscussionDto,
  DiscussionQueryDto,
} from '../dto';

/**
 * Controlador de Discusiones para usuarios
 */
@ApiTags('Forums - Discussions')
@Controller('v1/forums/discussions')
export class DiscussionsController {
  constructor(private readonly discussionsService: DiscussionsService) {}

  // ============================================
  // LISTAR (PÚBLICO)
  // ============================================

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Listar discusiones',
    description: 'Lista discusiones con filtros (foro general y de cursos públicos)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de discusiones con paginación',
  })
  async findAll(@Query() query: DiscussionQueryDto) {
    return this.discussionsService.findAll(query);
  }

  @Get('course/:courseId')
  @Public()
  @ApiOperation({
    summary: 'Discusiones de un curso',
    description: 'Lista discusiones de un curso específico',
  })
  @ApiParam({ name: 'courseId', description: 'UUID del curso' })
  @ApiResponse({
    status: 200,
    description: 'Discusiones del curso',
  })
  async findByCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query() query: DiscussionQueryDto,
  ) {
    return this.discussionsService.findAll({ ...query, courseId });
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Obtener discusión por ID',
    description: 'Obtiene una discusión específica (incrementa contador de vistas)',
  })
  @ApiParam({ name: 'id', description: 'UUID de la discusión' })
  @ApiResponse({
    status: 200,
    description: 'Discusión encontrada',
    type: Discussion,
  })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Discussion> {
    return this.discussionsService.findById(id, true);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({
    summary: 'Obtener discusión por slug',
    description: 'Obtiene una discusión por su URL slug',
  })
  @ApiParam({ name: 'slug', description: 'Slug de la discusión' })
  @ApiResponse({
    status: 200,
    description: 'Discusión encontrada',
    type: Discussion,
  })
  async findBySlug(
    @Param('slug') slug: string,
  ): Promise<Discussion> {
    return this.discussionsService.findBySlug(slug);
  }

  // ============================================
  // CREAR (AUTH REQUERIDO)
  // ============================================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear discusión',
    description: 'Crea una nueva discusión (requiere autenticación)',
  })
  @ApiResponse({
    status: 201,
    description: 'Discusión creada',
    type: Discussion,
  })
  @ApiResponse({ status: 403, description: 'No tienes acceso al foro del curso' })
  async create(
    @Body() dto: CreateDiscussionDto,
    @CurrentUser() user: User,
  ): Promise<Discussion> {
    return this.discussionsService.create(dto, user.id);
  }

  // ============================================
  // MIS DISCUSIONES
  // ============================================

  @Get('my/discussions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mis discusiones',
    description: 'Lista las discusiones creadas por el usuario actual',
  })
  @ApiResponse({
    status: 200,
    description: 'Discusiones del usuario',
  })
  async getMyDiscussions(
    @CurrentUser() user: User,
    @Query() query: DiscussionQueryDto,
  ) {
    return this.discussionsService.findAll({ ...query, authorId: user.id });
  }

  // ============================================
  // ACTUALIZAR
  // ============================================

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar discusión',
    description: 'Actualiza una discusión propia',
  })
  @ApiParam({ name: 'id', description: 'UUID de la discusión' })
  @ApiResponse({
    status: 200,
    description: 'Discusión actualizada',
    type: Discussion,
  })
  @ApiResponse({ status: 403, description: 'No puedes editar esta discusión' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDiscussionDto,
    @CurrentUser() user: User,
  ): Promise<Discussion> {
    return this.discussionsService.update(id, dto, user.id);
  }

  @Patch(':id/resolve/:postId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Marcar como resuelta',
    description: 'Marca una pregunta como resuelta con un post específico',
  })
  @ApiParam({ name: 'id', description: 'UUID de la discusión' })
  @ApiParam({ name: 'postId', description: 'UUID del post que resuelve' })
  @ApiResponse({
    status: 200,
    description: 'Discusión marcada como resuelta',
    type: Discussion,
  })
  async markAsResolved(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user: User,
  ): Promise<Discussion> {
    return this.discussionsService.markAsResolved(id, postId, user.id);
  }

  // ============================================
  // SUSCRIPCIONES
  // ============================================

  @Post(':id/subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Suscribirse a discusión',
    description: 'Suscribirse para recibir notificaciones de nuevas respuestas',
  })
  @ApiParam({ name: 'id', description: 'UUID de la discusión' })
  @ApiResponse({ status: 200, description: 'Suscrito exitosamente' })
  async subscribe(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.discussionsService.subscribe(id, user.id);
    return { subscribed: true };
  }

  @Delete(':id/subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancelar suscripción',
    description: 'Dejar de recibir notificaciones de esta discusión',
  })
  @ApiParam({ name: 'id', description: 'UUID de la discusión' })
  @ApiResponse({ status: 200, description: 'Suscripción cancelada' })
  async unsubscribe(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.discussionsService.unsubscribe(id, user.id);
    return { subscribed: false };
  }

  @Get(':id/subscribed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verificar suscripción',
    description: 'Verificar si el usuario está suscrito a la discusión',
  })
  @ApiParam({ name: 'id', description: 'UUID de la discusión' })
  @ApiResponse({ status: 200, description: 'Estado de suscripción' })
  async isSubscribed(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const subscribed = await this.discussionsService.isSubscribed(id, user.id);
    return { subscribed };
  }

  // ============================================
  // ELIMINAR
  // ============================================

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar discusión',
    description: 'Elimina una discusión propia',
  })
  @ApiParam({ name: 'id', description: 'UUID de la discusión' })
  @ApiResponse({ status: 204, description: 'Discusión eliminada' })
  @ApiResponse({ status: 403, description: 'No puedes eliminar esta discusión' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.discussionsService.delete(id, user.id);
  }
}

import {
  Controller,
  Get,
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
import { DiscussionsService } from '../services/discussions.service';
import { PostsService } from '../services/posts.service';
import { Discussion, DiscussionStatus } from '../entities/discussion.entity';
import { Post as ForumPost } from '../entities/post.entity';
import {
  ModerateDiscussionDto,
  ModeratePostDto,
  DiscussionQueryDto,
} from '../dto';

/**
 * Controlador de Foros para administradores
 */
@ApiTags('Admin - Forums')
@Controller('v1/admin/forums')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class ForumsAdminController {
  constructor(
    private readonly discussionsService: DiscussionsService,
    private readonly postsService: PostsService,
  ) {}

  // ============================================
  // DISCUSIONES
  // ============================================

  @Get('discussions')
  @ApiOperation({
    summary: 'Listar todas las discusiones',
    description:
      'Lista todas las discusiones con filtros (incluye todos los estados)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de discusiones con paginación',
  })
  async findAllDiscussions(@Query() query: DiscussionQueryDto) {
    return this.discussionsService.findAll(query);
  }

  @Get('discussions/locked')
  @ApiOperation({
    summary: 'Discusiones bloqueadas',
    description: 'Lista discusiones que han sido bloqueadas por moderación',
  })
  @ApiResponse({
    status: 200,
    description: 'Discusiones bloqueadas',
  })
  async findLockedDiscussions(@Query() query: DiscussionQueryDto) {
    return this.discussionsService.findAll({
      ...query,
      status: DiscussionStatus.LOCKED,
    });
  }

  @Get('discussions/:id')
  @ApiOperation({
    summary: 'Obtener discusión por ID',
    description: 'Obtiene una discusión específica (admin)',
  })
  @ApiParam({ name: 'id', description: 'UUID de la discusión' })
  @ApiResponse({
    status: 200,
    description: 'Discusión encontrada',
    type: Discussion,
  })
  async findDiscussionById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Discussion> {
    return this.discussionsService.findById(id);
  }

  @Patch('discussions/:id/moderate')
  @ApiOperation({
    summary: 'Moderar discusión',
    description: 'Cerrar, bloquear, archivar o fijar una discusión',
  })
  @ApiParam({ name: 'id', description: 'UUID de la discusión' })
  @ApiResponse({
    status: 200,
    description: 'Discusión moderada',
    type: Discussion,
  })
  async moderateDiscussion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateDiscussionDto,
    @CurrentUser() user: User,
  ): Promise<Discussion> {
    return this.discussionsService.moderate(id, dto, user.id);
  }

  @Patch('discussions/:id/pin')
  @ApiOperation({
    summary: 'Fijar/desfijar discusión',
    description: 'Alterna el estado de fijado de una discusión',
  })
  @ApiParam({ name: 'id', description: 'UUID de la discusión' })
  @ApiResponse({
    status: 200,
    description: 'Discusión actualizada',
    type: Discussion,
  })
  async togglePinDiscussion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Discussion> {
    const discussion = await this.discussionsService.findById(id);
    return this.discussionsService.moderate(
      id,
      { isPinned: !discussion.isPinned },
      user.id,
    );
  }

  @Patch('discussions/:id/lock')
  @ApiOperation({
    summary: 'Bloquear discusión',
    description: 'Bloquea una discusión (no permite nuevos posts)',
  })
  @ApiParam({ name: 'id', description: 'UUID de la discusión' })
  @ApiResponse({
    status: 200,
    description: 'Discusión bloqueada',
    type: Discussion,
  })
  async lockDiscussion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { reason?: string },
    @CurrentUser() user: User,
  ): Promise<Discussion> {
    return this.discussionsService.moderate(
      id,
      { status: DiscussionStatus.LOCKED, reason: dto.reason },
      user.id,
    );
  }

  @Patch('discussions/:id/unlock')
  @ApiOperation({
    summary: 'Desbloquear discusión',
    description: 'Desbloquea una discusión y permite nuevos posts',
  })
  @ApiParam({ name: 'id', description: 'UUID de la discusión' })
  @ApiResponse({
    status: 200,
    description: 'Discusión desbloqueada',
    type: Discussion,
  })
  async unlockDiscussion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Discussion> {
    return this.discussionsService.moderate(
      id,
      { status: DiscussionStatus.OPEN },
      user.id,
    );
  }

  @Delete('discussions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar discusión',
    description: 'Elimina una discusión (admin)',
  })
  @ApiParam({ name: 'id', description: 'UUID de la discusión' })
  @ApiResponse({ status: 204, description: 'Discusión eliminada' })
  async deleteDiscussion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.discussionsService.delete(id, user.id, true);
  }

  // ============================================
  // POSTS
  // ============================================

  @Get('posts/:id')
  @ApiOperation({
    summary: 'Obtener post por ID',
    description: 'Obtiene un post específico (admin)',
  })
  @ApiParam({ name: 'id', description: 'UUID del post' })
  @ApiResponse({
    status: 200,
    description: 'Post encontrado',
    type: ForumPost,
  })
  async findPostById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ForumPost> {
    return this.postsService.findById(id);
  }

  @Patch('posts/:id/moderate')
  @ApiOperation({
    summary: 'Moderar post',
    description: 'Ocultar o restaurar un post',
  })
  @ApiParam({ name: 'id', description: 'UUID del post' })
  @ApiResponse({
    status: 200,
    description: 'Post moderado',
    type: ForumPost,
  })
  async moderatePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModeratePostDto,
    @CurrentUser() user: User,
  ): Promise<ForumPost> {
    return this.postsService.moderate(id, dto, user.id);
  }

  @Delete('posts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar post',
    description: 'Elimina un post (admin)',
  })
  @ApiParam({ name: 'id', description: 'UUID del post' })
  @ApiResponse({ status: 204, description: 'Post eliminado' })
  async deletePost(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.postsService.delete(id, user.id, true);
  }
}

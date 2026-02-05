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
import { PostsService } from '../services/posts.service';
import { Post as ForumPost } from '../entities/post.entity';
import {
  CreatePostDto,
  UpdatePostDto,
  PostQueryDto,
} from '../dto';

/**
 * Controlador de Posts (respuestas) para usuarios
 */
@ApiTags('Forums - Posts')
@Controller('v1/forums/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // ============================================
  // LISTAR (PÚBLICO)
  // ============================================

  @Get('discussion/:discussionId')
  @Public()
  @ApiOperation({
    summary: 'Posts de una discusión',
    description: 'Lista todos los posts de una discusión con paginación',
  })
  @ApiParam({ name: 'discussionId', description: 'UUID de la discusión' })
  @ApiResponse({
    status: 200,
    description: 'Posts de la discusión',
  })
  async findByDiscussion(
    @Param('discussionId', ParseUUIDPipe) discussionId: string,
    @Query() query: PostQueryDto,
  ) {
    return this.postsService.findByDiscussion(discussionId, query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Obtener post por ID',
    description: 'Obtiene un post específico',
  })
  @ApiParam({ name: 'id', description: 'UUID del post' })
  @ApiResponse({
    status: 200,
    description: 'Post encontrado',
    type: ForumPost,
  })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ForumPost> {
    return this.postsService.findById(id);
  }

  @Get(':id/replies')
  @Public()
  @ApiOperation({
    summary: 'Respuestas de un post',
    description: 'Obtiene las respuestas anidadas de un post',
  })
  @ApiParam({ name: 'id', description: 'UUID del post' })
  @ApiResponse({
    status: 200,
    description: 'Respuestas del post',
    type: [ForumPost],
  })
  async getReplies(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ForumPost[]> {
    return this.postsService.getReplies(id);
  }

  // ============================================
  // CREAR (AUTH REQUERIDO)
  // ============================================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear post',
    description: 'Crea un nuevo post/respuesta en una discusión',
  })
  @ApiResponse({
    status: 201,
    description: 'Post creado',
    type: ForumPost,
  })
  @ApiResponse({ status: 400, description: 'Discusión cerrada o bloqueada' })
  async create(
    @Body() dto: CreatePostDto,
    @CurrentUser() user: User,
  ): Promise<ForumPost> {
    return this.postsService.create(dto, user.id);
  }

  // ============================================
  // ACTUALIZAR
  // ============================================

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar post',
    description: 'Actualiza un post propio (guarda historial de ediciones)',
  })
  @ApiParam({ name: 'id', description: 'UUID del post' })
  @ApiResponse({
    status: 200,
    description: 'Post actualizado',
    type: ForumPost,
  })
  @ApiResponse({ status: 403, description: 'No puedes editar este post' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: User,
  ): Promise<ForumPost> {
    return this.postsService.update(id, dto, user.id);
  }

  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Aceptar como respuesta',
    description: 'Marca un post como la respuesta aceptada (solo autor de la discusión)',
  })
  @ApiParam({ name: 'id', description: 'UUID del post' })
  @ApiResponse({
    status: 200,
    description: 'Post aceptado como respuesta',
    type: ForumPost,
  })
  @ApiResponse({ status: 403, description: 'Solo el autor de la discusión puede aceptar' })
  async acceptAsAnswer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ForumPost> {
    return this.postsService.acceptAsAnswer(id, user.id);
  }

  // ============================================
  // LIKES
  // ============================================

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dar like',
    description: 'Dar like a un post',
  })
  @ApiParam({ name: 'id', description: 'UUID del post' })
  @ApiResponse({
    status: 200,
    description: 'Like agregado',
    type: ForumPost,
  })
  @ApiResponse({ status: 400, description: 'Ya diste like a este post' })
  async like(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ForumPost> {
    return this.postsService.like(id, user.id);
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Quitar like',
    description: 'Quitar like de un post',
  })
  @ApiParam({ name: 'id', description: 'UUID del post' })
  @ApiResponse({
    status: 200,
    description: 'Like removido',
    type: ForumPost,
  })
  @ApiResponse({ status: 400, description: 'No has dado like a este post' })
  async unlike(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ForumPost> {
    return this.postsService.unlike(id, user.id);
  }

  @Get(':id/liked')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verificar like',
    description: 'Verificar si el usuario actual dio like al post',
  })
  @ApiParam({ name: 'id', description: 'UUID del post' })
  @ApiResponse({ status: 200, description: 'Estado del like' })
  async hasLiked(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const liked = await this.postsService.hasLiked(id, user.id);
    return { liked };
  }

  // ============================================
  // ELIMINAR
  // ============================================

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar post',
    description: 'Elimina un post propio',
  })
  @ApiParam({ name: 'id', description: 'UUID del post' })
  @ApiResponse({ status: 204, description: 'Post eliminado' })
  @ApiResponse({ status: 403, description: 'No puedes eliminar este post' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.postsService.delete(id, user.id);
  }
}

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Post, PostStatus } from '../entities/post.entity';
import { PostLike } from '../entities/post-like.entity';
import { Discussion, DiscussionStatus } from '../entities/discussion.entity';
import { DiscussionsService } from './discussions.service';
import {
  CreatePostDto,
  UpdatePostDto,
  ModeratePostDto,
  PostQueryDto,
} from '../dto';
import { ErrorCodes } from '../../../common/dto';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    @InjectRepository(Post)
    private readonly postRepository: TreeRepository<Post>,
    @InjectRepository(PostLike)
    private readonly likeRepository: Repository<PostLike>,
    @InjectRepository(Discussion)
    private readonly discussionRepository: Repository<Discussion>,
    private readonly discussionsService: DiscussionsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================
  // CREAR
  // ============================================

  /**
   * Crear un nuevo post
   */
  async create(dto: CreatePostDto, authorId: string): Promise<Post> {
    // Verificar discusión
    const discussion = await this.discussionsService.findById(dto.discussionId);

    if (!discussion.canAddPost()) {
      throw new BadRequestException({
        code: ErrorCodes.FORBIDDEN,
        message: 'No se pueden agregar respuestas a esta discusión',
      });
    }

    // Si hay post padre, verificar que existe
    let parent: Post | null = null;
    if (dto.parentId) {
      parent = await this.postRepository.findOne({
        where: { id: dto.parentId, discussionId: dto.discussionId },
      });
      if (!parent) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'El post padre no fue encontrado',
        });
      }
    }

    const post = this.postRepository.create({
      ...dto,
      authorId,
      parent,
    });

    const saved = await this.postRepository.save(post);

    // Actualizar contadores y última actividad
    await this.discussionsService.incrementPostCount(dto.discussionId);
    await this.discussionsService.updateLastActivity(
      dto.discussionId,
      authorId,
    );

    // Incrementar contador de respuestas del padre
    if (parent) {
      parent.incrementReplyCount();
      await this.postRepository.save(parent);
    }

    // Auto-suscribir al autor
    await this.discussionsService.subscribe(dto.discussionId, authorId);

    this.logger.log(
      `Post creado: ${saved.id} en discusión ${dto.discussionId}`,
    );

    // Emitir evento para notificaciones
    this.eventEmitter.emit('forum.post.created', {
      post: saved,
      discussion,
      authorId,
    });

    return saved;
  }

  // ============================================
  // CONSULTAS
  // ============================================

  /**
   * Listar posts de una discusión
   */
  async findByDiscussion(
    discussionId: string,
    query: PostQueryDto,
  ): Promise<{
    data: Post[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const {
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'ASC',
    } = query;

    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.discussionId = :discussionId', { discussionId })
      .andWhere('post.status = :status', { status: PostStatus.VISIBLE })
      .andWhere('post.parentId IS NULL'); // Solo posts de primer nivel

    // Ordenamiento
    const validSortFields = ['createdAt', 'likeCount'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`post.${sortField}`, sortOrder);

    // Paginación
    const total = await queryBuilder.getCount();
    const totalPages = Math.ceil(total / limit);

    queryBuilder.skip((page - 1) * limit).take(limit);

    const data = await queryBuilder.getMany();

    // Cargar respuestas anidadas para cada post
    for (const post of data) {
      post.children = await this.getReplies(post.id);
    }

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Obtener respuestas de un post (recursivo)
   */
  async getReplies(postId: string): Promise<Post[]> {
    const replies = await this.postRepository.find({
      where: { parentId: postId, status: PostStatus.VISIBLE },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });

    // Cargar respuestas anidadas
    for (const reply of replies) {
      reply.children = await this.getReplies(reply.id);
    }

    return replies;
  }

  /**
   * Obtener post por ID
   */
  async findById(id: string): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['author', 'discussion', 'moderatedBy'],
    });

    if (!post) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'El post no fue encontrado',
      });
    }

    return post;
  }

  // ============================================
  // ACTUALIZAR
  // ============================================

  /**
   * Actualizar post (solo autor)
   */
  async update(id: string, dto: UpdatePostDto, userId: string): Promise<Post> {
    const post = await this.findById(id);

    if (post.authorId !== userId) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'No puedes editar posts de otros usuarios',
      });
    }

    if (post.status !== PostStatus.VISIBLE) {
      throw new BadRequestException({
        code: ErrorCodes.FORBIDDEN,
        message: 'No se puede editar un post oculto o eliminado',
      });
    }

    post.edit(dto.content);

    const updated = await this.postRepository.save(post);

    this.logger.log(`Post actualizado: ${id}`);
    return updated;
  }

  /**
   * Moderar post (admin)
   */
  async moderate(
    id: string,
    dto: ModeratePostDto,
    moderatorId: string,
  ): Promise<Post> {
    const post = await this.findById(id);

    if (dto.status) {
      if (dto.status === PostStatus.HIDDEN) {
        post.hide(moderatorId, dto.reason);
      } else if (dto.status === PostStatus.VISIBLE) {
        post.restore();
      }
    }

    const updated = await this.postRepository.save(post);

    this.logger.log(`Post moderado: ${id} - ${dto.status}`);
    return updated;
  }

  /**
   * Aceptar como respuesta (solo autor de la discusión)
   */
  async acceptAsAnswer(id: string, userId: string): Promise<Post> {
    const post = await this.findById(id);
    const discussion = await this.discussionsService.findById(
      post.discussionId,
    );

    if (discussion.authorId !== userId) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Solo el autor de la discusión puede aceptar respuestas',
      });
    }

    // Quitar marca de respuesta aceptada de otros posts
    await this.postRepository.update(
      { discussionId: post.discussionId, isAcceptedAnswer: true },
      { isAcceptedAnswer: false, acceptedAt: null },
    );

    post.markAsAccepted();
    const updated = await this.postRepository.save(post);

    // Marcar discusión como resuelta
    await this.discussionsService.markAsResolved(post.discussionId, id, userId);

    this.logger.log(`Post aceptado como respuesta: ${id}`);

    // Emitir evento
    this.eventEmitter.emit('forum.post.accepted', {
      post: updated,
      discussion,
    });

    return updated;
  }

  // ============================================
  // LIKES
  // ============================================

  /**
   * Dar like a un post
   */
  async like(postId: string, userId: string): Promise<Post> {
    const post = await this.findById(postId);

    // Verificar si ya dio like
    const existing = await this.likeRepository.findOne({
      where: { postId, userId },
    });

    if (existing) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Ya diste like a este post',
      });
    }

    // Crear like
    const like = this.likeRepository.create({ postId, userId });
    await this.likeRepository.save(like);

    // Incrementar contador
    post.incrementLikes();
    const updated = await this.postRepository.save(post);

    this.logger.log(`Like agregado: post ${postId} por usuario ${userId}`);
    return updated;
  }

  /**
   * Quitar like de un post
   */
  async unlike(postId: string, userId: string): Promise<Post> {
    const post = await this.findById(postId);

    const result = await this.likeRepository.delete({ postId, userId });

    if (result.affected === 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'No has dado like a este post',
      });
    }

    // Decrementar contador
    post.decrementLikes();
    const updated = await this.postRepository.save(post);

    this.logger.log(`Like removido: post ${postId} por usuario ${userId}`);
    return updated;
  }

  /**
   * Verificar si usuario dio like
   */
  async hasLiked(postId: string, userId: string): Promise<boolean> {
    const like = await this.likeRepository.findOne({
      where: { postId, userId },
    });
    return !!like;
  }

  // ============================================
  // ELIMINAR
  // ============================================

  /**
   * Eliminar post (soft delete)
   */
  async delete(
    id: string,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<void> {
    const post = await this.findById(id);

    if (!isAdmin && post.authorId !== userId) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'No puedes eliminar posts de otros usuarios',
      });
    }

    // Marcar como eliminado
    post.status = PostStatus.DELETED;
    await this.postRepository.save(post);

    // Decrementar contador de la discusión
    await this.discussionsService.decrementPostCount(post.discussionId);

    // Decrementar contador del padre si existe
    if (post.parentId) {
      const parent = await this.postRepository.findOne({
        where: { id: post.parentId },
      });
      if (parent) {
        parent.decrementReplyCount();
        await this.postRepository.save(parent);
      }
    }

    this.logger.log(`Post eliminado: ${id}`);
  }
}

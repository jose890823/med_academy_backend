import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto, CategoryQueryDto } from '../dto';
import { ErrorCodes } from '../../../common/dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  /**
   * Crear una nueva categoría
   * @throws ConflictException si el slug ya existe
   */
  async create(dto: CreateCategoryDto): Promise<Category> {
    // Verificar que el slug no exista
    const existing = await this.categoryRepository.findOne({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Ya existe una categoría con este slug',
      });
    }

    const category = this.categoryRepository.create(dto);
    const saved = await this.categoryRepository.save(category);

    this.logger.log(`Categoría creada: ${saved.name} (${saved.id})`);
    return saved;
  }

  /**
   * Obtener todas las categorías con paginación
   */
  async findAll(query: CategoryQueryDto): Promise<{
    data: Category[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const { page = 1, limit = 20, isActive } = query;

    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    // Filtro por isActive
    if (isActive !== undefined) {
      queryBuilder.andWhere('category.isActive = :isActive', { isActive });
    }

    // Ordenar por order y nombre
    queryBuilder
      .orderBy('category.order', 'ASC')
      .addOrderBy('category.name', 'ASC');

    // Paginación
    const total = await queryBuilder.getCount();
    const totalPages = Math.ceil(total / limit);

    queryBuilder.skip((page - 1) * limit).take(limit);

    const data = await queryBuilder.getMany();

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
   * Obtener categorías activas (para listados públicos)
   */
  async findActive(): Promise<Category[]> {
    return this.categoryRepository.find({
      where: { isActive: true },
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Obtener una categoría por ID
   * @throws NotFoundException si no existe
   */
  async findById(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Categoría no encontrada',
      });
    }

    return category;
  }

  /**
   * Obtener una categoría por slug
   * @throws NotFoundException si no existe
   */
  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { slug } });

    if (!category) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Categoría no encontrada',
      });
    }

    return category;
  }

  /**
   * Actualizar una categoría
   * @throws NotFoundException si no existe
   * @throws ConflictException si el nuevo slug ya existe
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findById(id);

    // Verificar que el nuevo slug no exista (si se está cambiando)
    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.categoryRepository.findOne({
        where: { slug: dto.slug },
      });

      if (existing) {
        throw new ConflictException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Ya existe una categoría con este slug',
        });
      }
    }

    Object.assign(category, dto);
    const updated = await this.categoryRepository.save(category);

    this.logger.log(`Categoría actualizada: ${updated.name} (${updated.id})`);
    return updated;
  }

  /**
   * Eliminar una categoría
   * @throws NotFoundException si no existe
   */
  async delete(id: string): Promise<void> {
    const category = await this.findById(id);
    await this.categoryRepository.remove(category);

    this.logger.log(`Categoría eliminada: ${category.name} (${id})`);
  }
}

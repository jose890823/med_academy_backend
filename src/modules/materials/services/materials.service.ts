import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import {
  Material,
  MaterialStatus,
  MaterialType,
} from '../entities/material.entity';
import {
  CreateMaterialDto,
  UpdateMaterialDto,
  MaterialQueryDto,
} from '../dto';
import { ErrorCodes } from '../../../common/dto';

/**
 * Códigos de error específicos para Materials
 */
const MaterialErrorCodes = {
  MATERIAL_NOT_FOUND: 'MATERIAL_NOT_FOUND',
  MATERIAL_ACCESS_DENIED: 'MATERIAL_ACCESS_DENIED',
  MATERIAL_NOT_DOWNLOADABLE: 'MATERIAL_NOT_DOWNLOADABLE',
};

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
  ) {}

  // ============================================
  // CREAR
  // ============================================

  /**
   * Crear un nuevo material
   */
  async create(dto: CreateMaterialDto, uploadedById?: string): Promise<Material> {
    const material = this.materialRepository.create({
      ...dto,
      uploadedById: uploadedById || null,
      status: MaterialStatus.ACTIVE,
    });

    const saved = await this.materialRepository.save(material);

    this.logger.log(`Material creado: ${saved.id} (${saved.name})`);
    return saved;
  }

  /**
   * Crear múltiples materiales
   */
  async createMany(
    materials: CreateMaterialDto[],
    uploadedById?: string,
  ): Promise<Material[]> {
    const created: Material[] = [];

    for (const dto of materials) {
      const material = await this.create(dto, uploadedById);
      created.push(material);
    }

    this.logger.log(`${created.length} materiales creados`);
    return created;
  }

  // ============================================
  // CONSULTAS
  // ============================================

  /**
   * Obtener materiales con filtros y paginación
   */
  async findAll(query: MaterialQueryDto): Promise<{
    data: Material[];
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
      limit = 20,
      courseId,
      moduleId,
      type,
      status,
      isPublic,
      sortBy = 'order',
      sortOrder = 'ASC',
    } = query;

    const where: FindOptionsWhere<Material> = {};

    if (courseId) where.courseId = courseId;
    if (moduleId) where.moduleId = moduleId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (isPublic !== undefined) where.isPublic = isPublic;

    // Por defecto, no mostrar eliminados
    if (!status) {
      where.status = MaterialStatus.ACTIVE;
    }

    const validSortFields = ['order', 'name', 'createdAt', 'downloadCount', 'type'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'order';

    const [data, total] = await this.materialRepository.findAndCount({
      where,
      order: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['course', 'module'],
    });

    const totalPages = Math.ceil(total / limit);

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
   * Obtener materiales de un módulo
   */
  async findByModule(moduleId: string): Promise<Material[]> {
    return this.materialRepository.find({
      where: { moduleId, status: MaterialStatus.ACTIVE },
      order: { order: 'ASC' },
    });
  }

  /**
   * Obtener materiales de un curso
   */
  async findByCourse(courseId: string): Promise<Material[]> {
    return this.materialRepository.find({
      where: { courseId, status: MaterialStatus.ACTIVE },
      order: { order: 'ASC' },
      relations: ['module'],
    });
  }

  /**
   * Obtener material por ID
   */
  async findById(id: string): Promise<Material> {
    const material = await this.materialRepository.findOne({
      where: { id },
      relations: ['course', 'module', 'uploadedBy'],
    });

    if (!material) {
      throw new NotFoundException({
        code: MaterialErrorCodes.MATERIAL_NOT_FOUND,
        message: 'El material no fue encontrado',
      });
    }

    return material;
  }

  /**
   * Obtener materiales públicos de un curso
   */
  async findPublicByCourse(courseId: string): Promise<Material[]> {
    return this.materialRepository.find({
      where: {
        courseId,
        isPublic: true,
        status: MaterialStatus.ACTIVE,
      },
      order: { order: 'ASC' },
    });
  }

  // ============================================
  // ACTUALIZAR
  // ============================================

  /**
   * Actualizar material
   */
  async update(id: string, dto: UpdateMaterialDto): Promise<Material> {
    const material = await this.findById(id);

    Object.assign(material, dto);

    const updated = await this.materialRepository.save(material);

    this.logger.log(`Material actualizado: ${id}`);
    return updated;
  }

  /**
   * Reordenar materiales de un módulo
   */
  async reorder(
    moduleId: string,
    materialIds: string[],
  ): Promise<Material[]> {
    const materials = await this.findByModule(moduleId);

    // Actualizar orden basado en la posición en el array
    for (let i = 0; i < materialIds.length; i++) {
      const material = materials.find((m) => m.id === materialIds[i]);
      if (material) {
        material.order = i;
        await this.materialRepository.save(material);
      }
    }

    this.logger.log(`Materiales reordenados para módulo ${moduleId}`);
    return this.findByModule(moduleId);
  }

  // ============================================
  // ELIMINAR
  // ============================================

  /**
   * Archivar material (soft delete)
   */
  async archive(id: string): Promise<Material> {
    const material = await this.findById(id);
    material.status = MaterialStatus.ARCHIVED;

    const updated = await this.materialRepository.save(material);

    this.logger.log(`Material archivado: ${id}`);
    return updated;
  }

  /**
   * Eliminar material (marca como deleted)
   */
  async delete(id: string): Promise<void> {
    const material = await this.findById(id);
    material.status = MaterialStatus.DELETED;

    await this.materialRepository.save(material);

    this.logger.log(`Material eliminado: ${id}`);
  }

  /**
   * Eliminar permanentemente (hard delete)
   */
  async hardDelete(id: string): Promise<void> {
    const result = await this.materialRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException({
        code: MaterialErrorCodes.MATERIAL_NOT_FOUND,
        message: 'El material no fue encontrado',
      });
    }

    this.logger.log(`Material eliminado permanentemente: ${id}`);
  }

  // ============================================
  // ACCESO Y DESCARGA
  // ============================================

  /**
   * Verificar acceso a material
   * @param materialId ID del material
   * @param userId ID del usuario (opcional para públicos)
   * @param enrollmentCourseIds IDs de cursos en los que está inscrito
   */
  async verifyAccess(
    materialId: string,
    userId?: string,
    enrollmentCourseIds?: string[],
  ): Promise<boolean> {
    const material = await this.findById(materialId);

    // Si es público, permitir acceso
    if (material.isPublic) {
      return true;
    }

    // Si no hay usuario, denegar
    if (!userId) {
      return false;
    }

    // Verificar si el usuario está inscrito en el curso del material
    if (material.courseId && enrollmentCourseIds?.includes(material.courseId)) {
      return true;
    }

    return false;
  }

  /**
   * Registrar descarga/visualización
   */
  async registerDownload(id: string): Promise<Material> {
    const material = await this.findById(id);

    if (!material.isDownloadable) {
      throw new BadRequestException({
        code: MaterialErrorCodes.MATERIAL_NOT_DOWNLOADABLE,
        message: 'Este material no permite descarga',
      });
    }

    material.incrementDownloadCount();

    return this.materialRepository.save(material);
  }

  /**
   * Obtener URL de descarga
   * Prepara la URL (en el futuro puede generar URLs firmadas para S3)
   */
  async getDownloadUrl(id: string): Promise<{
    url: string;
    filename: string;
    mimeType: string | null;
  }> {
    const material = await this.findById(id);

    if (material.status !== MaterialStatus.ACTIVE) {
      throw new NotFoundException({
        code: MaterialErrorCodes.MATERIAL_NOT_FOUND,
        message: 'El material no está disponible',
      });
    }

    // TODO: En el futuro, generar URLs firmadas para S3/GCS
    // Por ahora, retornar la URL directa

    return {
      url: material.url,
      filename: material.originalFilename || material.name,
      mimeType: material.mimeType,
    };
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  /**
   * Obtener estadísticas de materiales
   */
  async getStats(courseId?: string): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    totalDownloads: number;
    totalSizeBytes: number;
  }> {
    const where: FindOptionsWhere<Material> = {};
    if (courseId) where.courseId = courseId;

    const materials = await this.materialRepository.find({ where });

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalDownloads = 0;
    let totalSizeBytes = 0;

    for (const material of materials) {
      // Por tipo
      byType[material.type] = (byType[material.type] || 0) + 1;

      // Por estado
      byStatus[material.status] = (byStatus[material.status] || 0) + 1;

      // Descargas
      totalDownloads += material.downloadCount;

      // Tamaño
      totalSizeBytes += Number(material.sizeBytes || 0);
    }

    return {
      total: materials.length,
      byType,
      byStatus,
      totalDownloads,
      totalSizeBytes,
    };
  }
}

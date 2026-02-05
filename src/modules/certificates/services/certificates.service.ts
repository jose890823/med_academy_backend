import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import {
  Certificate,
  CertificateType,
  CertificateStatus,
} from '../entities/certificate.entity';
import { Enrollment, EnrollmentStatus } from '../../enrollments/entities/enrollment.entity';
import {
  IssueCertificateDto,
  IssueWorkshopCertificateDto,
  RevokeCertificateDto,
  CertificateQueryDto,
} from '../dto';
import { ErrorCodes } from '../../../common/dto';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================
  // GENERADORES DE IDENTIFICADORES
  // ============================================

  /**
   * Genera número de certificado único: CERT-YYYY-NNNNNN
   */
  private async generateCertificateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.certificateRepository.count({
      where: { certificateNumber: Like(`CERT-${year}-%`) },
    });
    const number = (count + 1).toString().padStart(6, '0');
    return `CERT-${year}-${number}`;
  }

  /**
   * Genera código de verificación único de 9 caracteres
   */
  private generateVerificationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin caracteres confusos
    let code = '';
    const bytes = randomBytes(9);
    for (let i = 0; i < 9; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }

  /**
   * Genera QR code con URL de verificación
   */
  private async generateQRCode(verificationCode: string): Promise<string> {
    const url = `https://ultrasoundmedacademy.com/verify/${verificationCode}`;
    return QRCode.toDataURL(url, {
      width: 150,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }

  // ============================================
  // EMITIR CERTIFICADO DE CURSO
  // ============================================

  /**
   * Emite un certificado para una inscripción completada
   */
  async issueCertificate(dto: IssueCertificateDto): Promise<Certificate> {
    // Obtener inscripción con relaciones
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: dto.enrollmentId },
      relations: ['student', 'cohort', 'cohort.course'],
    });

    if (!enrollment) {
      throw new NotFoundException({
        code: ErrorCodes.ENROLL_NOT_FOUND,
        message: 'La inscripción no fue encontrada',
      });
    }

    // Verificar que la inscripción esté completada
    if (enrollment.status !== EnrollmentStatus.COMPLETED) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Solo se pueden emitir certificados para inscripciones completadas',
      });
    }

    // Verificar que no tenga ya un certificado de este tipo
    const existingCertificate = await this.certificateRepository.findOne({
      where: {
        enrollmentId: dto.enrollmentId,
        type: dto.type,
        status: CertificateStatus.GENERATED,
      },
    });

    if (existingCertificate) {
      throw new ConflictException({
        code: ErrorCodes.CERTIFICATE_ALREADY_EXISTS,
        message: 'Ya existe un certificado para esta inscripción',
      });
    }

    // Generar identificadores únicos
    const certificateNumber = await this.generateCertificateNumber();
    const verificationCode = this.generateVerificationCode();
    const qrCode = await this.generateQRCode(verificationCode);

    // Crear certificado
    const certificate = this.certificateRepository.create({
      certificateNumber,
      verificationCode,
      studentId: enrollment.studentId,
      enrollmentId: enrollment.id,
      type: dto.type,
      status: CertificateStatus.GENERATED,
      // Snapshot de datos del estudiante
      studentFirstName: enrollment.student.firstName,
      studentLastName: enrollment.student.lastName,
      studentEmail: enrollment.student.email,
      // Datos del programa
      programName: enrollment.cohort.course.title,
      programDescription: enrollment.cohort.course.shortDescription || null,
      programStartDate: enrollment.accessStartDate,
      completionDate: dto.completionDate || new Date(),
      instructionHours: dto.instructionHours || null,
      cmeCredits: dto.cmeCredits || null,
      // Calificación
      finalGrade: dto.finalGrade || null,
      gradeLabel: dto.gradeLabel || (dto.finalGrade && dto.finalGrade >= 70 ? 'Pass' : null),
      // Fechas
      issuedAt: new Date(),
      expiresAt: dto.expiresAt || null,
      // Autoridad
      issuingAuthority: 'Ultrasound MedAcademy',
      authorizedSignatory: dto.authorizedSignatory || 'Dr. Medical Director',
      signatoryTitle: dto.signatoryTitle || 'Director of Education',
      // Certificaciones
      associatedCertifications: dto.associatedCertifications || null,
      // QR
      qrCode,
      // Metadata
      metadata: dto.metadata || null,
    });

    const saved = await this.certificateRepository.save(certificate);

    // Actualizar enrollment con URL del certificado (se actualizará después de generar PDF)
    enrollment.certificateIssuedAt = new Date();
    await this.enrollmentRepository.save(enrollment);

    this.logger.log(
      `Certificado emitido: ${certificateNumber} para estudiante ${enrollment.studentId}`,
    );

    // Emitir evento
    this.eventEmitter.emit('certificate.issued', {
      certificate: saved,
      enrollment,
    });

    return saved;
  }

  // ============================================
  // GENERAR PDF
  // ============================================

  /**
   * Genera el PDF del certificado
   */
  async generatePdf(certificateId: string): Promise<Buffer> {
    const certificate = await this.findById(certificateId);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: 'LETTER',
        layout: 'landscape',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ============================================
      // DISEÑO DEL CERTIFICADO
      // ============================================

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const centerX = pageWidth / 2;

      // Borde decorativo
      doc
        .rect(30, 30, pageWidth - 60, pageHeight - 60)
        .lineWidth(3)
        .stroke('#1a365d');

      doc
        .rect(40, 40, pageWidth - 80, pageHeight - 80)
        .lineWidth(1)
        .stroke('#2563eb');

      // Encabezado
      doc
        .fontSize(14)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text(certificate.issuingAuthority.toUpperCase(), 0, 70, {
          align: 'center',
          width: pageWidth,
        });

      // Título
      doc
        .fontSize(42)
        .font('Helvetica-Bold')
        .fillColor('#1a365d')
        .text('CERTIFICATE', 0, 100, {
          align: 'center',
          width: pageWidth,
        });

      doc
        .fontSize(20)
        .font('Helvetica')
        .fillColor('#374151')
        .text('OF COMPLETION', 0, 150, {
          align: 'center',
          width: pageWidth,
        });

      // Línea decorativa
      doc
        .moveTo(centerX - 150, 185)
        .lineTo(centerX + 150, 185)
        .lineWidth(2)
        .stroke('#2563eb');

      // "This is to certify that"
      doc
        .fontSize(14)
        .font('Helvetica')
        .fillColor('#4b5563')
        .text('This is to certify that', 0, 210, {
          align: 'center',
          width: pageWidth,
        });

      // Nombre del estudiante
      doc
        .fontSize(32)
        .font('Helvetica-Bold')
        .fillColor('#1f2937')
        .text(certificate.studentFullName, 0, 240, {
          align: 'center',
          width: pageWidth,
        });

      // "has successfully completed"
      doc
        .fontSize(14)
        .font('Helvetica')
        .fillColor('#4b5563')
        .text('has successfully completed the program', 0, 290, {
          align: 'center',
          width: pageWidth,
        });

      // Nombre del programa
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#2563eb')
        .text(certificate.programName, 0, 320, {
          align: 'center',
          width: pageWidth,
        });

      // Detalles (horas, créditos, fecha)
      let detailsY = 370;
      const details: string[] = [];

      if (certificate.instructionHours) {
        details.push(`${certificate.instructionHours} Hours of Instruction`);
      }
      if (certificate.cmeCredits) {
        details.push(`${certificate.cmeCredits} CME/CEU Credits`);
      }
      if (certificate.finalGrade) {
        details.push(`Final Grade: ${certificate.finalGrade}%`);
      }

      if (details.length > 0) {
        doc
          .fontSize(12)
          .font('Helvetica')
          .fillColor('#6b7280')
          .text(details.join('  •  '), 0, detailsY, {
            align: 'center',
            width: pageWidth,
          });
        detailsY += 25;
      }

      // Fecha de emisión
      const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text(`Issued on ${issuedDate}`, 0, detailsY, {
          align: 'center',
          width: pageWidth,
        });

      // Certificaciones asociadas
      if (certificate.associatedCertifications && certificate.associatedCertifications.length > 0) {
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#6b7280')
          .text(
            `Prepares for: ${certificate.associatedCertifications.join(', ')}`,
            0,
            detailsY + 20,
            { align: 'center', width: pageWidth },
          );
      }

      // Firma y número de certificado (parte inferior)
      const bottomY = pageHeight - 130;

      // Línea de firma
      doc
        .moveTo(100, bottomY)
        .lineTo(300, bottomY)
        .lineWidth(1)
        .stroke('#9ca3af');

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#374151')
        .text(certificate.authorizedSignatory || 'Authorized Signatory', 100, bottomY + 5, {
          width: 200,
          align: 'center',
        });

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text(certificate.signatoryTitle || '', 100, bottomY + 22, {
          width: 200,
          align: 'center',
        });

      // QR Code (si está disponible, agregarlo como imagen)
      // Por ahora mostramos el código de verificación

      // Número de certificado y código de verificación
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text(`Certificate No: ${certificate.certificateNumber}`, pageWidth - 300, bottomY + 5, {
          width: 200,
          align: 'center',
        });

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text(
          `Verification Code: ${certificate.verificationCode}`,
          pageWidth - 300,
          bottomY + 20,
          { width: 200, align: 'center' },
        );

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#9ca3af')
        .text(
          `Verify at: ultrasoundmedacademy.com/verify/${certificate.verificationCode}`,
          pageWidth - 300,
          bottomY + 35,
          { width: 200, align: 'center' },
        );

      doc.end();
    });
  }

  // ============================================
  // CONSULTAS
  // ============================================

  /**
   * Obtener certificado por ID
   */
  async findById(id: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({
      where: { id },
      relations: ['student', 'enrollment'],
    });

    if (!certificate) {
      throw new NotFoundException({
        code: ErrorCodes.CERTIFICATE_NOT_FOUND,
        message: 'El certificado no fue encontrado',
      });
    }

    return certificate;
  }

  /**
   * Obtener certificado por número
   */
  async findByNumber(certificateNumber: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({
      where: { certificateNumber },
      relations: ['student'],
    });

    if (!certificate) {
      throw new NotFoundException({
        code: ErrorCodes.CERTIFICATE_NOT_FOUND,
        message: 'El certificado no fue encontrado',
      });
    }

    return certificate;
  }

  /**
   * Verificar certificado por código
   */
  async verify(verificationCode: string): Promise<{
    valid: boolean;
    certificate?: Certificate;
    message: string;
  }> {
    const certificate = await this.certificateRepository.findOne({
      where: { verificationCode },
    });

    if (!certificate) {
      return {
        valid: false,
        message: 'Certificado no encontrado',
      };
    }

    if (certificate.status === CertificateStatus.REVOKED) {
      return {
        valid: false,
        certificate,
        message: 'Este certificado ha sido revocado',
      };
    }

    if (certificate.isExpired) {
      return {
        valid: false,
        certificate,
        message: 'Este certificado ha expirado',
      };
    }

    return {
      valid: true,
      certificate,
      message: 'Certificado válido',
    };
  }

  /**
   * Listar certificados con filtros
   */
  async findAll(query: CertificateQueryDto): Promise<{
    data: Certificate[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { studentId, enrollmentId, type, status, search, page = 1, limit = 20 } = query;

    const where: FindOptionsWhere<Certificate> = {};

    if (studentId) where.studentId = studentId;
    if (enrollmentId) where.enrollmentId = enrollmentId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) where.programName = Like(`%${search}%`);

    const [data, total] = await this.certificateRepository.findAndCount({
      where,
      relations: ['student'],
      order: { issuedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtener certificados de un estudiante
   */
  async findByStudent(studentId: string): Promise<Certificate[]> {
    return this.certificateRepository.find({
      where: { studentId, status: CertificateStatus.GENERATED },
      order: { issuedAt: 'DESC' },
    });
  }

  // ============================================
  // REVOCAR CERTIFICADO
  // ============================================

  /**
   * Revocar un certificado
   */
  async revoke(
    certificateId: string,
    dto: RevokeCertificateDto,
    revokedBy: string,
  ): Promise<Certificate> {
    const certificate = await this.findById(certificateId);

    if (certificate.status === CertificateStatus.REVOKED) {
      throw new BadRequestException({
        code: ErrorCodes.CERTIFICATE_ALREADY_REVOKED,
        message: 'Este certificado ya fue revocado',
      });
    }

    certificate.status = CertificateStatus.REVOKED;
    certificate.revokedAt = new Date();
    certificate.revocationReason = dto.reason;
    certificate.revokedBy = revokedBy;

    const updated = await this.certificateRepository.save(certificate);

    this.logger.log(`Certificado revocado: ${certificate.certificateNumber}`);

    this.eventEmitter.emit('certificate.revoked', {
      certificate: updated,
    });

    return updated;
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  /**
   * Obtener estadísticas de certificados
   */
  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    thisMonth: number;
    thisYear: number;
  }> {
    const total = await this.certificateRepository.count();

    const byTypeRaw = await this.certificateRepository
      .createQueryBuilder('cert')
      .select('cert.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('cert.type')
      .getRawMany();

    const byType: Record<string, number> = {};
    byTypeRaw.forEach((row) => {
      byType[row.type] = parseInt(row.count, 10);
    });

    const byStatusRaw = await this.certificateRepository
      .createQueryBuilder('cert')
      .select('cert.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('cert.status')
      .getRawMany();

    const byStatus: Record<string, number> = {};
    byStatusRaw.forEach((row) => {
      byStatus[row.status] = parseInt(row.count, 10);
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const thisMonth = await this.certificateRepository
      .createQueryBuilder('cert')
      .where('cert.issuedAt >= :startOfMonth', { startOfMonth })
      .getCount();

    const thisYear = await this.certificateRepository
      .createQueryBuilder('cert')
      .where('cert.issuedAt >= :startOfYear', { startOfYear })
      .getCount();

    return {
      total,
      byType,
      byStatus,
      thisMonth,
      thisYear,
    };
  }

  /**
   * Actualizar URL del PDF después de subirlo
   */
  async updatePdfUrl(certificateId: string, pdfUrl: string): Promise<Certificate> {
    const certificate = await this.findById(certificateId);
    certificate.pdfUrl = pdfUrl;

    // También actualizar la inscripción si existe
    if (certificate.enrollmentId) {
      await this.enrollmentRepository.update(
        { id: certificate.enrollmentId },
        { certificateUrl: pdfUrl },
      );
    }

    return this.certificateRepository.save(certificate);
  }
}

import {
  Controller,
  Get,
  Post,
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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Public } from '../../auth/decorators/public.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../auth/entities/user.entity';
import { WorkshopsService } from '../services/workshops.service';
import { SessionsService } from '../services/sessions.service';
import { RegistrationsService } from '../services/registrations.service';
import { Workshop } from '../entities/workshop.entity';
import { WorkshopSession } from '../entities/workshop-session.entity';
import { WorkshopRegistration } from '../entities/workshop-registration.entity';
import { CreateRegistrationDto } from '../dto';

@ApiTags('Workshops')
@Controller('v1/workshops')
export class WorkshopsController {
  constructor(
    private readonly workshopsService: WorkshopsService,
    private readonly sessionsService: SessionsService,
    private readonly registrationsService: RegistrationsService,
  ) {}

  // ============================================
  // WORKSHOPS PÚBLICOS
  // ============================================

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Listar workshops publicados',
    description: 'Retorna los workshops publicados disponibles',
  })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiResponse({
    status: 200,
    description: 'Lista de workshops',
    type: [Workshop],
  })
  async findPublished(
    @Query('categoryId') categoryId?: string,
  ): Promise<Workshop[]> {
    if (categoryId) {
      return this.workshopsService.findByCategory(categoryId);
    }
    return this.workshopsService.findPublished();
  }

  @Get('featured')
  @Public()
  @ApiOperation({
    summary: 'Obtener workshops destacados',
    description: 'Retorna los workshops marcados como destacados',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Lista de workshops destacados',
    type: [Workshop],
  })
  async findFeatured(@Query('limit') limit?: number): Promise<Workshop[]> {
    return this.workshopsService.findFeatured(limit || 4);
  }

  @Get('course/:courseId')
  @Public()
  @ApiOperation({
    summary: 'Obtener workshops de un curso',
    description: 'Retorna los workshops asociados a un curso',
  })
  @ApiParam({ name: 'courseId', description: 'UUID del curso' })
  @ApiResponse({
    status: 200,
    description: 'Lista de workshops del curso',
    type: [Workshop],
  })
  async findByCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<Workshop[]> {
    return this.workshopsService.findByCourse(courseId);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({
    summary: 'Obtener workshop por slug',
    description: 'Retorna un workshop por su slug',
  })
  @ApiParam({ name: 'slug', description: 'Slug del workshop' })
  @ApiResponse({
    status: 200,
    description: 'Workshop encontrado',
    type: Workshop,
  })
  @ApiResponse({ status: 404, description: 'Workshop no encontrado' })
  async findBySlug(@Param('slug') slug: string): Promise<Workshop> {
    return this.workshopsService.findBySlug(slug);
  }

  // ============================================
  // SESIONES
  // ============================================

  @Get(':slug/sessions')
  @Public()
  @ApiOperation({
    summary: 'Obtener sesiones de un workshop',
    description: 'Retorna las próximas sesiones disponibles',
  })
  @ApiParam({ name: 'slug', description: 'Slug del workshop' })
  @ApiResponse({
    status: 200,
    description: 'Lista de sesiones',
    type: [WorkshopSession],
  })
  async getSessions(@Param('slug') slug: string): Promise<WorkshopSession[]> {
    const workshop = await this.workshopsService.findBySlug(slug);
    return this.sessionsService.findAvailable(workshop.id);
  }

  @Get('sessions/upcoming')
  @Public()
  @ApiOperation({
    summary: 'Obtener próximas sesiones',
    description: 'Retorna las próximas sesiones de todos los workshops',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Lista de próximas sesiones',
    type: [WorkshopSession],
  })
  async getUpcomingSessions(
    @Query('limit') limit?: number,
  ): Promise<WorkshopSession[]> {
    return this.sessionsService.findUpcoming(limit || 10);
  }

  @Get('sessions/city/:city')
  @Public()
  @ApiOperation({
    summary: 'Obtener sesiones por ciudad',
    description: 'Retorna las sesiones en una ciudad específica',
  })
  @ApiParam({ name: 'city', description: 'Nombre de la ciudad' })
  @ApiResponse({
    status: 200,
    description: 'Lista de sesiones en la ciudad',
    type: [WorkshopSession],
  })
  async getSessionsByCity(@Param('city') city: string): Promise<WorkshopSession[]> {
    return this.sessionsService.findByCity(city);
  }

  // ============================================
  // INSCRIPCIONES (Requiere autenticación)
  // ============================================

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Inscribirse a una sesión',
    description: 'Crea una inscripción para el usuario autenticado',
  })
  @ApiResponse({
    status: 201,
    description: 'Inscripción creada',
    type: WorkshopRegistration,
  })
  @ApiResponse({ status: 400, description: 'No se puede inscribir' })
  @ApiResponse({ status: 409, description: 'Ya está inscrito' })
  async register(
    @CurrentUser() user: User,
    @Body() dto: CreateRegistrationDto,
  ): Promise<WorkshopRegistration> {
    return this.registrationsService.create(user.id, dto);
  }

  @Get('my-registrations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener mis inscripciones',
    description: 'Retorna las inscripciones del usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de inscripciones',
    type: [WorkshopRegistration],
  })
  async getMyRegistrations(
    @CurrentUser() user: User,
  ): Promise<WorkshopRegistration[]> {
    return this.registrationsService.findByUser(user.id);
  }

  @Get('registration/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener inscripción por ID',
    description: 'Retorna los detalles de una inscripción',
  })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Inscripción encontrada',
    type: WorkshopRegistration,
  })
  async getRegistration(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkshopRegistration> {
    return this.registrationsService.findById(id);
  }

  @Post('registration/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancelar inscripción',
    description: 'Cancela una inscripción del usuario',
  })
  @ApiParam({ name: 'id', description: 'UUID de la inscripción' })
  @ApiResponse({
    status: 200,
    description: 'Inscripción cancelada',
    type: WorkshopRegistration,
  })
  async cancelRegistration(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
  ): Promise<WorkshopRegistration> {
    return this.registrationsService.cancel(id, body.reason);
  }
}

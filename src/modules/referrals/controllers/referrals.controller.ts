import {
  Controller,
  Get,
  Post,
  Put,
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
import { Public } from '../../auth/decorators/public.decorator';
import { User, UserRole } from '../../auth/entities/user.entity';
import { ReferralsService } from '../services/referrals.service';
import { ReferralCodesService } from '../services/referral-codes.service';
import {
  CreateReferralCodeDto,
  UpdateReferralCodeDto,
  ValidateReferralCodeDto,
} from '../dto';
import { ReferralCode } from '../entities/referral-code.entity';
import { Referral } from '../entities/referral.entity';

// ============================================
// CONTROLADOR PÚBLICO (Usuarios autenticados)
// ============================================

@ApiTags('Referrals')
@Controller('v1/referrals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReferralsController {
  constructor(
    private readonly referralsService: ReferralsService,
    private readonly referralCodesService: ReferralCodesService,
  ) {}

  // ============================================
  // CÓDIGOS DE REFERIDO (MIS CÓDIGOS)
  // ============================================

  @Get('my-codes')
  @ApiOperation({
    summary: 'Obtener mis códigos de referido',
    description: 'Retorna los códigos de referido del usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de códigos de referido',
    type: [ReferralCode],
  })
  async getMyCodes(@CurrentUser() user: User): Promise<ReferralCode[]> {
    return this.referralCodesService.findByUserId(user.id);
  }

  @Post('my-codes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear código de referido',
    description: 'Crea un nuevo código de referido para el usuario autenticado',
  })
  @ApiResponse({
    status: 201,
    description: 'Código creado exitosamente',
    type: ReferralCode,
  })
  @ApiResponse({ status: 409, description: 'El código ya existe' })
  async createMyCode(
    @CurrentUser() user: User,
    @Body() dto: CreateReferralCodeDto,
  ): Promise<ReferralCode> {
    return this.referralCodesService.create(user.id, dto);
  }

  @Put('my-codes/:id')
  @ApiOperation({
    summary: 'Actualizar mi código de referido',
    description: 'Actualiza un código de referido del usuario autenticado',
  })
  @ApiParam({ name: 'id', description: 'UUID del código' })
  @ApiResponse({
    status: 200,
    description: 'Código actualizado exitosamente',
    type: ReferralCode,
  })
  async updateMyCode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReferralCodeDto,
    @CurrentUser() user: User,
  ): Promise<ReferralCode> {
    // Verificar que el código pertenece al usuario
    const code = await this.referralCodesService.findById(id);
    if (code.userId !== user.id) {
      throw new Error('No tienes permiso para modificar este código');
    }
    return this.referralCodesService.update(id, dto);
  }

  @Get('my-codes/stats')
  @ApiOperation({
    summary: 'Estadísticas de mis códigos',
    description: 'Retorna estadísticas de los códigos del usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de códigos',
  })
  async getMyCodeStats(@CurrentUser() user: User) {
    return this.referralCodesService.getUserCodeStats(user.id);
  }

  // ============================================
  // MIS REFERIDOS
  // ============================================

  @Get('my-referrals')
  @ApiOperation({
    summary: 'Obtener mis referidos',
    description: 'Retorna los usuarios que he referido',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de referidos',
    type: [Referral],
  })
  async getMyReferrals(@CurrentUser() user: User): Promise<Referral[]> {
    return this.referralsService.findByReferrer(user.id);
  }

  @Get('my-referrals/stats')
  @ApiOperation({
    summary: 'Estadísticas de mis referidos',
    description: 'Retorna estadísticas de referidos y ganancias',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de referidos',
  })
  async getMyReferralStats(@CurrentUser() user: User) {
    return this.referralsService.getUserStats(user.id);
  }

  // ============================================
  // VALIDACIÓN DE CÓDIGO (PÚBLICO)
  // ============================================

  @Post('validate')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validar código de referido',
    description: 'Verifica si un código de referido es válido',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado de validación',
  })
  async validateCode(@Body() dto: ValidateReferralCodeDto) {
    const result = await this.referralCodesService.validateCode(dto.code);

    if (!result.valid) {
      return {
        valid: false,
        error: result.error,
      };
    }

    return {
      valid: true,
      discount: result.discount,
      message: `Código válido. Obtendrás ${result.discount}% de descuento`,
    };
  }
}

// ============================================
// CONTROLADOR ADMINISTRATIVO
// ============================================

@ApiTags('Admin - Referrals')
@Controller('v1/admin/referrals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class ReferralsAdminController {
  constructor(
    private readonly referralsService: ReferralsService,
    private readonly referralCodesService: ReferralCodesService,
  ) {}

  // ============================================
  // ESTADÍSTICAS GLOBALES
  // ============================================

  @Get('stats')
  @ApiOperation({
    summary: 'Estadísticas globales de referidos',
    description: 'Retorna estadísticas del programa de referidos',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas globales',
  })
  async getGlobalStats() {
    return this.referralsService.getGlobalStats();
  }

  @Get('top-referrers')
  @ApiOperation({
    summary: 'Top referidores',
    description: 'Retorna los usuarios con más referidos',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de top referidores',
  })
  async getTopReferrers(@Query('limit') limit?: number) {
    return this.referralsService.getTopReferrers(limit || 10);
  }

  // ============================================
  // GESTIÓN DE REFERIDOS
  // ============================================

  @Get()
  @ApiOperation({
    summary: 'Listar todos los referidos',
    description: 'Retorna todos los referidos con filtros y paginación',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de referidos con paginación',
  })
  async findAllReferrals(@Query() query: any) {
    return this.referralsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener referido por ID',
    description: 'Retorna un referido específico',
  })
  @ApiParam({ name: 'id', description: 'UUID del referido' })
  @ApiResponse({
    status: 200,
    description: 'Referido encontrado',
    type: Referral,
  })
  async findReferralById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Referral> {
    return this.referralsService.findById(id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Actualizar estado de referido',
    description: 'Cambia el estado de un referido',
  })
  @ApiParam({ name: 'id', description: 'UUID del referido' })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado',
    type: Referral,
  })
  async updateReferralStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
  ): Promise<Referral> {
    return this.referralsService.updateStatus(id, dto);
  }

  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Completar referido manualmente',
    description: 'Marca un referido como completado',
  })
  @ApiParam({ name: 'id', description: 'UUID del referido' })
  @ApiResponse({
    status: 200,
    description: 'Referido completado',
    type: Referral,
  })
  async completeReferral(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
  ): Promise<Referral> {
    return this.referralsService.completeReferral({
      referralId: id,
      ...dto,
    });
  }

  @Patch(':id/reward')
  @ApiOperation({
    summary: 'Marcar recompensa entregada',
    description: 'Registra que se entregó la recompensa',
  })
  @ApiParam({ name: 'id', description: 'UUID del referido' })
  @ApiResponse({
    status: 200,
    description: 'Recompensa registrada',
    type: Referral,
  })
  async markRewardDelivered(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
  ): Promise<Referral> {
    return this.referralsService.markRewardDelivered(id, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancelar referido',
    description: 'Cancela un referido',
  })
  @ApiParam({ name: 'id', description: 'UUID del referido' })
  @ApiResponse({
    status: 200,
    description: 'Referido cancelado',
    type: Referral,
  })
  async cancelReferral(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
  ): Promise<Referral> {
    return this.referralsService.cancel(id, body.reason);
  }

  // ============================================
  // GESTIÓN DE CÓDIGOS
  // ============================================

  @Get('codes')
  @ApiOperation({
    summary: 'Listar todos los códigos',
    description: 'Retorna todos los códigos de referido con paginación',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de códigos con paginación',
  })
  async findAllCodes(@Query() query: any) {
    return this.referralCodesService.findAll(query);
  }

  @Get('codes/:id')
  @ApiOperation({
    summary: 'Obtener código por ID',
    description: 'Retorna un código de referido específico',
  })
  @ApiParam({ name: 'id', description: 'UUID del código' })
  @ApiResponse({
    status: 200,
    description: 'Código encontrado',
    type: ReferralCode,
  })
  async findCodeById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReferralCode> {
    return this.referralCodesService.findById(id);
  }

  @Post('codes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear código de referido (Admin)',
    description: 'Crea un código de referido para cualquier usuario',
  })
  @ApiResponse({
    status: 201,
    description: 'Código creado exitosamente',
    type: ReferralCode,
  })
  async createCode(@Body() dto: any): Promise<ReferralCode> {
    return this.referralCodesService.adminCreate(dto);
  }

  @Put('codes/:id')
  @ApiOperation({
    summary: 'Actualizar código',
    description: 'Actualiza un código de referido',
  })
  @ApiParam({ name: 'id', description: 'UUID del código' })
  @ApiResponse({
    status: 200,
    description: 'Código actualizado',
    type: ReferralCode,
  })
  async updateCode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
  ): Promise<ReferralCode> {
    return this.referralCodesService.update(id, dto);
  }

  @Patch('codes/:id/activate')
  @ApiOperation({
    summary: 'Activar código',
    description: 'Activa un código de referido',
  })
  @ApiParam({ name: 'id', description: 'UUID del código' })
  @ApiResponse({
    status: 200,
    description: 'Código activado',
    type: ReferralCode,
  })
  async activateCode(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReferralCode> {
    return this.referralCodesService.activate(id);
  }

  @Patch('codes/:id/deactivate')
  @ApiOperation({
    summary: 'Desactivar código',
    description: 'Desactiva un código de referido',
  })
  @ApiParam({ name: 'id', description: 'UUID del código' })
  @ApiResponse({
    status: 200,
    description: 'Código desactivado',
    type: ReferralCode,
  })
  async deactivateCode(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReferralCode> {
    return this.referralCodesService.deactivate(id);
  }

  @Delete('codes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar código',
    description: 'Elimina un código de referido (solo si no ha sido usado)',
  })
  @ApiParam({ name: 'id', description: 'UUID del código' })
  @ApiResponse({ status: 204, description: 'Código eliminado' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar un código usado' })
  async deleteCode(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.referralCodesService.delete(id);
  }
}

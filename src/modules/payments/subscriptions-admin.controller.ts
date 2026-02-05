import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  PLAN_PRICES,
  InitialPaymentStatus,
} from './entities/subscription.entity';
import { User } from '../auth/entities/user.entity';
import { AssignPlanDto, RemovePlanDto } from './dto/assign-plan.dto';

@ApiTags('Subscriptions - Admin')
@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class SubscriptionsAdminController {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las suscripciones' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: SubscriptionStatus })
  @ApiQuery({ name: 'planType', required: false, enum: SubscriptionPlan })
  @ApiResponse({ status: 200, description: 'Lista de suscripciones' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: SubscriptionStatus,
    @Query('planType') planType?: SubscriptionPlan,
  ) {
    const queryBuilder = this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user')
      .orderBy('subscription.createdAt', 'DESC');

    if (status) {
      queryBuilder.andWhere('subscription.status = :status', { status });
    }

    if (planType) {
      queryBuilder.andWhere('subscription.planType = :planType', { planType });
    }

    const total = await queryBuilder.getCount();
    const subscriptions = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: subscriptions,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadisticas de suscripciones' })
  @ApiResponse({ status: 200, description: 'Estadisticas de suscripciones' })
  async getStats() {
    const [total, active, cancelled, byPlan] = await Promise.all([
      this.subscriptionRepository.count(),
      this.subscriptionRepository.count({
        where: { status: SubscriptionStatus.ACTIVE },
      }),
      this.subscriptionRepository.count({
        where: { status: SubscriptionStatus.CANCELLED },
      }),
      this.subscriptionRepository
        .createQueryBuilder('subscription')
        .select('subscription.planType', 'planType')
        .addSelect('COUNT(*)', 'count')
        .where('subscription.status = :status', {
          status: SubscriptionStatus.ACTIVE,
        })
        .groupBy('subscription.planType')
        .getRawMany(),
    ]);

    return {
      total,
      active,
      cancelled,
      suspended: total - active - cancelled,
      byPlan: byPlan.reduce(
        (acc, item) => {
          acc[item.planType] = parseInt(item.count);
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Obtener suscripcion activa de un usuario' })
  @ApiResponse({ status: 200, description: 'Suscripcion del usuario' })
  async getUserSubscription(@Param('userId', ParseUUIDPipe) userId: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: ['user'],
    });

    return subscription;
  }

  @Post('assign')
  @ApiOperation({ summary: 'Asignar plan a un usuario' })
  @ApiResponse({ status: 201, description: 'Plan asignado exitosamente' })
  @ApiResponse({ status: 400, description: 'Usuario ya tiene un plan activo' })
  async assignPlan(@Body() dto: AssignPlanDto) {
    // Verificar que el usuario existe
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar si ya tiene una suscripcion activa
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: { userId: dto.userId, status: SubscriptionStatus.ACTIVE },
    });

    if (existingSubscription) {
      // Actualizar el plan existente
      existingSubscription.planType = dto.planType;
      existingSubscription.monthlyPrice = PLAN_PRICES[dto.planType];
      existingSubscription.notes =
        dto.notes || `Plan actualizado a ${dto.planType} por admin`;
      existingSubscription.updatedAt = new Date();

      await this.subscriptionRepository.save(existingSubscription);

      return {
        message: 'Plan actualizado exitosamente',
        subscription: existingSubscription,
      };
    }

    // Crear nueva suscripcion
    const subscription = this.subscriptionRepository.create({
      userId: dto.userId,
      planType: dto.planType,
      status: SubscriptionStatus.ACTIVE,
      monthlyPrice: PLAN_PRICES[dto.planType],
      currency: 'USD',
      startDate: new Date(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 dias
      contractSigned: true,
      initialPaymentStatus: InitialPaymentStatus.COMPLETED,
      notes: dto.notes || `Plan ${dto.planType} asignado manualmente por admin`,
    });

    await this.subscriptionRepository.save(subscription);

    return {
      message: 'Plan asignado exitosamente',
      subscription,
    };
  }

  @Delete('remove/:userId')
  @ApiOperation({ summary: 'Remover plan de un usuario' })
  @ApiResponse({ status: 200, description: 'Plan removido exitosamente' })
  async removePlan(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto?: RemovePlanDto,
  ) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });

    if (!subscription) {
      return {
        message: 'El usuario no tiene un plan activo',
      };
    }

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.cancelledAt = new Date();
    subscription.cancellationReason =
      dto?.reason || 'Cancelado por administrador';

    await this.subscriptionRepository.save(subscription);

    return {
      message: 'Plan removido exitosamente',
      subscription,
    };
  }

  @Get('plans')
  @ApiOperation({ summary: 'Obtener lista de planes disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de planes' })
  async getPlans() {
    return [
      {
        id: SubscriptionPlan.FREE,
        name: 'Gratis',
        price: PLAN_PRICES[SubscriptionPlan.FREE],
        dailyLimit: 1,
        description: 'Plan gratuito con 1 idea por dia',
      },
      {
        id: SubscriptionPlan.CREATOR,
        name: 'Creador',
        price: PLAN_PRICES[SubscriptionPlan.CREATOR],
        dailyLimit: 3,
        description: 'Plan Creador con 3 ideas por dia',
      },
      {
        id: SubscriptionPlan.PRO,
        name: 'Pro',
        price: PLAN_PRICES[SubscriptionPlan.PRO],
        dailyLimit: 10,
        description: 'Plan Pro con 10 ideas por dia',
      },
    ];
  }
}

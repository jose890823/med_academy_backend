# CLAUDE.md - Backend NestJS

Este archivo define las reglas, patrones y convenciones que Claude debe seguir al trabajar con este proyecto backend NestJS.

## Comandos de Desarrollo

```bash
pnpm install                 # Instalar dependencias
pnpm run start:dev           # Modo desarrollo con watch
pnpm run build               # Build de produccion
pnpm run test                # Tests unitarios
pnpm run test:watch          # Tests en modo watch
pnpm run test -- --testPathPattern=auth   # Tests de modulo especifico
pnpm run lint                # ESLint con auto-fix
pnpm run test:e2e            # Tests end-to-end
```

**Swagger:** `http://localhost:3001/api/docs`

---

## Arquitectura del Proyecto

### Estructura de Carpetas

```
src/
├── app.module.ts             # Modulo raiz (Global)
├── main.ts                   # Entry point con Swagger y configuracion global
├── common/                   # Elementos transversales
│   ├── dto/                  # DTOs de respuesta estandar
│   ├── filters/              # Filtros de excepcion (HttpExceptionFilter)
│   ├── guards/               # Guards globales
│   ├── interceptors/         # ResponseInterceptor
│   └── utils/                # Utilidades (date-formatter, text-normalizer)
├── shared/                   # Configuracion global
│   ├── database.module.ts    # TypeORM setup
│   ├── seeder.module.ts      # Datos iniciales
│   └── encryption.service.ts # Servicios compartidos
├── modules/                  # Modulos de funcionalidad (feature-based)
│   └── {modulo}/
│       ├── dto/              # DTOs del modulo + index.ts
│       ├── entities/         # Entities TypeORM
│       ├── guards/           # Guards especificos
│       ├── decorators/       # Decoradores personalizados
│       ├── strategies/       # Estrategias JWT (solo auth)
│       ├── services/         # Services adicionales (opcional)
│       ├── {modulo}.controller.ts
│       ├── {modulo}-admin.controller.ts  # Controller admin (si aplica)
│       ├── {modulo}.service.ts
│       ├── {modulo}.module.ts
│       └── {modulo}.service.spec.ts
└── migrations/               # Migraciones de BD
```

### Organizacion Modular

- **Feature-based**: Cada modulo es auto-contenido con su estructura completa
- **Separation of Concerns**: Controllers, Services, Entities, DTOs bien separados
- **Controllers separados por rol**: `users.controller.ts` (publico) y `users-admin.controller.ts` (admin)

---

## Convenciones de Naming

### Archivos

| Tipo | Patron | Ejemplo |
|------|--------|---------|
| Controller | `{entidad}.controller.ts` | `auth.controller.ts` |
| Controller Admin | `{entidad}-admin.controller.ts` | `users-admin.controller.ts` |
| Service | `{entidad}.service.ts` | `niches.service.ts` |
| Service especializado | `{entidad}-{dominio}.service.ts` | `user-activity.service.ts` |
| Entity | `{entidad}.entity.ts` | `generation.entity.ts` |
| DTO | `{entidad}-{accion}.dto.ts` o `{accion}.dto.ts` | `create-niche.dto.ts`, `login.dto.ts` |
| Module | `{entidad}.module.ts` | `auth.module.ts` |
| Guard | `{nombre}.guard.ts` | `jwt-auth.guard.ts` |
| Strategy | `{nombre}.strategy.ts` | `jwt.strategy.ts` |
| Decorator | `{nombre}.decorator.ts` | `public.decorator.ts` |
| Filter | `{nombre}.filter.ts` | `http-exception.filter.ts` |
| Interceptor | `{nombre}.interceptor.ts` | `response.interceptor.ts` |
| Test | `{archivo}.spec.ts` | `auth.service.spec.ts` |
| Utilidad | `{nombre}.util.ts` | `date-formatter.util.ts` |

### Clases y Tipos

```typescript
// Controllers - PascalCase con sufijo Controller
export class AuthController {}
export class NichesAdminController {}

// Services - PascalCase con sufijo Service
export class GenerationsService {}
export class UserActivityService {}

// Entities - PascalCase singular
export class User {}
export class Generation {}

// DTOs - PascalCase con sufijo Dto
export class RegisterDto {}
export class CreateNicheDto {}
export class GenerationResponseDto {}

// Guards - PascalCase con sufijo Guard
export class JwtAuthGuard {}
export class RolesGuard {}

// Enums - PascalCase, valores en UPPER_SNAKE_CASE
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  CLIENT = 'client',
}
```

### Variables y Metodos

```typescript
// Variables - camelCase
const userRepository: Repository<User>
const jwtService: JwtService
let EmailService: any

// Constantes - UPPER_SNAKE_CASE
const INITIAL_NICHES = [...]
const MAX_OTP_ATTEMPTS = 3

// Booleanas con prefijo 'is', 'has', 'can'
const isPublic: boolean
const hasAccess: boolean
const canGenerate: boolean
const emailVerified: boolean

// Metodos CRUD en Services
async findAll(): Promise<Entity[]>
async findById(id: string): Promise<Entity>
async findBySlug(slug: string): Promise<Entity>
async create(dto: CreateDto): Promise<Entity>
async update(id: string, dto: UpdateDto): Promise<Entity>
async delete(id: string): Promise<void>

// Metodos privados/helpers - prefijo sin verbo CRUD
private async hashPassword(password: string): Promise<string>
private generateOtp(): string
private toResponseDto(entity: Entity): ResponseDto
private getTodayDate(timezone?: string): string
```

---

## Patrones de Codigo

### DTOs con Validaciones

**REGLAS OBLIGATORIAS:**
- Siempre usar `@ApiProperty()` con `example` y `description`
- Mensajes de validacion en espanol
- Usar `@IsNotEmpty()` para campos obligatorios
- Usar `@IsOptional()` para campos opcionales
- Crear archivo `index.ts` en carpeta dto que exporte todos

```typescript
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'juan.perez@example.com',
    description: 'Email del usuario (debe ser unico)',
  })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @IsEmail({}, { message: 'El email debe tener un formato valido' })
  email: string;

  @ApiProperty({
    example: 'P@ssw0rd123!',
    description: 'Contrasena (minimo 8 caracteres)',
    minLength: 8,
  })
  @IsNotEmpty({ message: 'La contrasena es obligatoria' })
  @IsString({ message: 'La contrasena debe ser una cadena de texto' })
  @MinLength(8, { message: 'La contrasena debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message: 'La contrasena debe contener mayuscula, minuscula, numero y caracter especial',
  })
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;
}

// dto/index.ts
export * from './create-user.dto';
export * from './update-user.dto';
export * from './user-response.dto';
```

### Controllers

**REGLAS OBLIGATORIAS:**
- Siempre usar decoradores Swagger (`@ApiTags`, `@ApiOperation`, `@ApiResponse`)
- `@Public()` para rutas sin autenticacion
- `@UseGuards(JwtAuthGuard)` para rutas protegidas
- `@Roles()` con `RolesGuard` para control de acceso por rol
- `@CurrentUser()` para obtener el usuario autenticado
- Mapear entities a DTOs de respuesta en el controller

```typescript
import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../auth/entities/user.entity';

@ApiTags('Niches')
@Controller('niches')
export class NichesController {
  constructor(private readonly nichesService: NichesService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Obtener todos los nichos',
    description: 'Retorna la lista de nichos activos ordenados por sortOrder',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de nichos',
    type: [NicheResponseDto],
  })
  async findAll(): Promise<NicheResponseDto[]> {
    const niches = await this.nichesService.findAll();
    return niches.map((niche) => this.toResponseDto(niche));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo nicho' })
  @ApiResponse({ status: 201, description: 'Nicho creado', type: NicheResponseDto })
  async create(
    @Body() createNicheDto: CreateNicheDto,
    @CurrentUser() user: User,
  ): Promise<NicheResponseDto> {
    const niche = await this.nichesService.create(createNicheDto);
    return this.toResponseDto(niche);
  }

  private toResponseDto(niche: Niche): NicheResponseDto {
    return {
      id: niche.id,
      name: niche.name,
      slug: niche.slug,
      // ... mapeo de propiedades
    };
  }
}
```

### Services

**REGLAS OBLIGATORIAS:**
- Logger privado: `private readonly logger = new Logger(ClassName.name)`
- Comentarios JSDoc para metodos publicos
- Usar excepciones especificas de NestJS
- Mensajes de error en espanol
- Inyectar repositorios con `@InjectRepository(Entity)`

```typescript
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class NichesService {
  private readonly logger = new Logger(NichesService.name);

  constructor(
    @InjectRepository(Niche)
    private readonly nicheRepository: Repository<Niche>,
    private readonly otherService: OtherService,
  ) {}

  /**
   * Obtener todos los nichos activos
   * @returns Lista de nichos ordenados por sortOrder
   */
  async findAll(): Promise<Niche[]> {
    return this.nicheRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * Buscar nicho por ID
   * @throws NotFoundException si no existe
   */
  async findById(id: string): Promise<Niche> {
    const niche = await this.nicheRepository.findOne({ where: { id } });
    if (!niche) {
      throw new NotFoundException('Nicho no encontrado');
    }
    return niche;
  }

  /**
   * Crear nuevo nicho
   * @throws ConflictException si ya existe el slug
   */
  async create(dto: CreateNicheDto): Promise<Niche> {
    const existing = await this.nicheRepository.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('Ya existe un nicho con este slug');
    }

    const niche = this.nicheRepository.create(dto);
    return this.nicheRepository.save(niche);
  }
}
```

### Entities TypeORM

**REGLAS OBLIGATORIAS:**
- `@Entity('nombre_tabla')` con nombre en snake_case plural
- `@PrimaryGeneratedColumn('uuid')` para IDs
- `@Index()` en campos de busqueda frecuente
- `@Exclude()` para campos sensibles (password, tokens, OTP)
- `@CreateDateColumn()`, `@UpdateDateColumn()`, `@DeleteDateColumn()` para timestamps
- Constructor con `Partial<Entity>` para inicializacion
- Metodos helper para logica de dominio

```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  CLIENT = 'client',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['isActive'])
export class User {
  @ApiProperty({ description: 'ID unico del usuario' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Email del usuario (unico)' })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 255 })
  firstName: string;

  @Column({ type: 'varchar', length: 255 })
  lastName: string;

  @Column({
    type: 'simple-array',
    default: UserRole.CLIENT,
  })
  roles: UserRole[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Exclude()
  @Column({ type: 'varchar', length: 500, nullable: true })
  refreshToken: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  // Relaciones
  @ManyToOne(() => Niche, { nullable: true })
  @JoinColumn({ name: 'nicheId' })
  niche: Niche | null;

  @Column({ type: 'uuid', nullable: true })
  nicheId: string | null;

  // Constructor
  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }

  // Metodos helper
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  hasRole(role: UserRole): boolean {
    return this.roles?.includes(role) ?? false;
  }

  isAdmin(): boolean {
    return this.hasRole(UserRole.ADMIN) || this.hasRole(UserRole.SUPER_ADMIN);
  }

  isSuperAdmin(): boolean {
    return this.hasRole(UserRole.SUPER_ADMIN);
  }
}
```

---

## Formato de Respuesta API

Todas las respuestas siguen este formato (aplicado por `ResponseInterceptor`):

```typescript
// Exito
{
  success: true,
  data: { /* payload */ },
  message: "Operacion realizada exitosamente",
  timestamp: "2025-01-17T10:30:00.000Z",
  path: "/api/niches"
}

// Error
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Los datos proporcionados no son validos",
    details: { /* detalles adicionales */ }
  },
  timestamp: "2025-01-17T10:30:00.000Z",
  path: "/api/niches"
}
```

---

## Decoradores Personalizados

### @Public()
Marca una ruta como publica (sin autenticacion):
```typescript
@Post('register')
@Public()
async register(@Body() dto: RegisterDto) {}
```

### @CurrentUser()
Obtiene el usuario autenticado del request:
```typescript
@Get('profile')
async getProfile(@CurrentUser() user: User) {}

// O una propiedad especifica
@Get('email')
async getEmail(@CurrentUser('email') email: string) {}
```

### @Roles()
Define los roles permitidos para una ruta:
```typescript
@Delete(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
async deleteUser(@Param('id') id: string) {}
```

---

## Manejo de Errores

### Excepciones a Usar

```typescript
// Recurso no encontrado
throw new NotFoundException('Usuario no encontrado');

// Datos invalidos o logica de negocio no cumplida
throw new BadRequestException('Debes seleccionar un nicho antes de generar contenido');

// Recurso ya existe (duplicados)
throw new ConflictException('El email ya esta registrado');

// Sin permiso para la accion
throw new ForbiddenException({
  message: 'Suscripcion requerida',
  code: 'SUBSCRIPTION_REQUIRED',
  trialExpired: true,
});

// Credenciales invalidas
throw new UnauthorizedException('Usuario no encontrado o inactivo');
```

---

## Soft Delete Pattern

```typescript
// Entidad con soft delete
@DeleteDateColumn()
deletedAt: Date | null;

// Busqueda incluyendo eliminados
const user = await this.userRepository.findOne({
  where: { email },
  withDeleted: true,
});

// Verificar si esta eliminado
if (user && !user.deletedAt) {
  throw new ConflictException('El email ya esta registrado');
}

// Soft delete
await this.userRepository.softDelete(id);

// Hard delete (si es necesario)
await this.userRepository.remove(user);
```

---

## Testing Pattern

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    // ... propiedades
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return a user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.findById(mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(service.findById('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
```

---

## Modulos Opcionales

Para modulos que pueden no estar disponibles:

```typescript
// En el modulo
import { existsSync } from 'fs';
import { join } from 'path';

let EmailModule: any = null;
const emailModulePath = join(__dirname, '../email/email.module');

if (existsSync(emailModulePath + '.ts') || existsSync(emailModulePath + '.js')) {
  try {
    EmailModule = require('../email/email.module').EmailModule;
  } catch (error) {
    // EmailModule no disponible
  }
}

@Module({
  imports: [
    ...(EmailModule ? [EmailModule] : []),
  ],
})
export class AuthModule {}

// En el service - inyeccion opcional
@Injectable()
export class AuthService {
  constructor(
    @Optional() @Inject('EmailService') private emailService?: any,
  ) {
    if (this.emailService) {
      this.logger.log('EmailService disponible');
    } else {
      this.logger.warn('EmailService no disponible');
    }
  }
}
```

---

## Configuracion Global (main.ts)

```typescript
// Prefijo global para todas las rutas
app.setGlobalPrefix('api');

// Validation Pipe global
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // Remover propiedades no validadas
    forbidNonWhitelisted: true,   // Rechazar si hay propiedades extra
    transform: true,              // Transformar segun tipos
  }),
);

// CORS configurado
app.enableCors({
  origin: (origin, callback) => { /* logica */ },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
});

// Swagger
const config = new DocumentBuilder()
  .setTitle('API')
  .setVersion('1.0')
  .addBearerAuth()
  .addTag('Auth', 'Autenticacion')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

---

## Base de Datos

- **Motor:** PostgreSQL
- **ORM:** TypeORM
- **Dev:** `synchronize: true` (crea tablas automaticamente)
- **Prod:** `synchronize: false` (usar migraciones)

### Relaciones

```typescript
// ManyToOne con cascade delete
@ManyToOne(() => User, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'userId' })
user: User;

// Indices compuestos unicos
@Index(['userId', 'generatedDate'], { unique: true })
@Entity('generations')
export class Generation {}
```

---

## Utilidades Disponibles

### DateFormatter (`common/utils/date-formatter.util.ts`)
```typescript
import { formatDateLongEn, formatTime12h, parseDateTime } from '../common/utils/date-formatter.util';

const formatted = formatDateLongEn(date); // "Monday, December 16, 2025"
const time = formatTime12h(date);          // "10:00 AM"
```

### TextNormalizer (`common/utils/text-normalizer.util.ts`)
```typescript
import { TextNormalizer } from '../common/utils/text-normalizer.util';

const slug = TextNormalizer.createSlug('Mi Titulo');        // "mi-titulo"
const normalized = TextNormalizer.normalize('Cafe');         // "cafe"
const matches = TextNormalizer.matches('buscar', 'a buscar'); // true
const fuzzy = TextNormalizer.fuzzyMatch('test', 'tset');     // true (tolerancia)
```

---

## Autenticacion

- **Access tokens:** 15 minutos de expiracion
- **Refresh tokens:** 7 dias con rotacion
- **OTP email:** 6 digitos, 10 min expiracion, 3 intentos max
- **Roles:** `client`, `admin`, `super_admin`

---

## Checklist para Nuevos Modulos

1. [ ] Crear carpeta en `src/modules/{nombre}/`
2. [ ] Crear entity en `entities/{nombre}.entity.ts`
3. [ ] Crear DTOs en `dto/` (create, update, response)
4. [ ] Crear `dto/index.ts` que exporte todos los DTOs
5. [ ] Crear service en `{nombre}.service.ts`
6. [ ] Crear controller en `{nombre}.controller.ts`
7. [ ] Crear controller admin si aplica: `{nombre}-admin.controller.ts`
8. [ ] Crear module en `{nombre}.module.ts`
9. [ ] Agregar module a `app.module.ts`
10. [ ] Crear tests en `{nombre}.service.spec.ts`
11. [ ] Documentar con Swagger todos los endpoints
12. [ ] Verificar que el modulo aparece en Swagger UI

---

## Do's and Don'ts

### Do's (Buenas Practicas)

- **Siempre** usar `@ApiProperty()` con ejemplo y descripcion en DTOs
- **Siempre** usar Logger con `new Logger(ClassName.name)` en services
- **Siempre** crear archivo `index.ts` en carpeta `dto/` que exporte todo
- **Siempre** tipar las respuestas de los metodos async con `Promise<T>`
- **Siempre** usar excepciones especificas (`NotFoundException`, `ConflictException`, etc.)
- **Siempre** documentar metodos publicos con comentarios JSDoc
- **Siempre** usar `@Exclude()` en campos sensibles de entities (password, tokens)
- **Siempre** crear indices `@Index()` en campos de busqueda frecuente
- **Siempre** mapear entities a DTOs de respuesta en controllers
- **Siempre** usar transacciones para operaciones de BD multiples
- **Siempre** validar datos de entrada con class-validator decorators
- **Siempre** usar mensajes de error en espanol para el usuario

### Don'ts (Malas Practicas)

- **NUNCA** exponer entities directamente en respuestas (usar DTOs)
- **NUNCA** guardar passwords en texto plano (usar bcrypt)
- **NUNCA** hardcodear valores de configuracion (usar ConfigService)
- **NUNCA** usar `console.log` en produccion (usar Logger)
- **NUNCA** ignorar errores en operaciones async (siempre try/catch)
- **NUNCA** hacer queries N+1 (usar relaciones con `relations` o QueryBuilder)
- **NUNCA** exponer tokens, OTP codes o datos sensibles en logs
- **NUNCA** usar `synchronize: true` en produccion (usar migraciones)
- **NUNCA** commitear archivos `.env` al repositorio
- **NUNCA** crear endpoints sin documentacion Swagger
- **NUNCA** omitir validaciones en DTOs de entrada

---

## Variables de Entorno

```bash
# 🌍 ENVIRONMENT
NODE_ENV=development

# 🗄️ POSTGRESQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=echomeddx
DB_USERNAME=postgres
DB_PASSWORD=your_password_here

# 🚀 SERVER
PORT=3001
APP_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# 🔐 JWT AUTHENTICATION
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRATION=24h
JWT_REFRESH_SECRET=your_super_secret_refresh_key
JWT_REFRESH_EXPIRATION=30d
BCRYPT_ROUNDS=10

# 📧 OTP
OTP_LENGTH=6
OTP_EXPIRATION_MINUTES=10
OTP_MAX_ATTEMPTS=3

# 📧 EMAIL (Gmail SMTP)
GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
EMAIL_FROM=noreply@echomeddx.com

# 🔒 ENCRYPTION
ENCRYPTION_KEY=your_32_character_encryption_key

# 🔴 REDIS
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 💳 STRIPE
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# 🤖 OPENAI
OPENAI_API_KEY=sk-your_openai_api_key

# 👤 SUPER ADMIN (creado automaticamente al iniciar)
SUPER_ADMIN_EMAIL=admin@echomeddx.com
SUPER_ADMIN_PASSWORD=ChangeThisPassword123!
SUPER_ADMIN_FIRST_NAME=Super
SUPER_ADMIN_LAST_NAME=Admin
```

Ver archivo `.env.example` para la lista completa con instrucciones.

---

## Git Workflow - OBLIGATORIO

**ANTES de ejecutar cualquier comando git, SIEMPRE seguir este flujo:**

### Flujo para subir cambios

```bash
# 1. Verificar estado
git status

# 2. Agregar cambios (incluye archivos nuevos)
git add .

# 3. Commit con mensaje descriptivo
git commit -m "feat(modulo): descripcion del cambio"

# 4. Actualizar rama dev local
git fetch origin dev:dev

# 5. Rebase sobre dev
git rebase dev

# 6. Push seguro (NUNCA usar --force, siempre --force-with-lease)
git push --force-with-lease
```

### Formato de commits

```
tipo(alcance): descripcion corta

Tipos:
- feat: Nueva funcionalidad
- fix: Correccion de bug
- refactor: Refactorizacion sin cambio de funcionalidad
- docs: Documentacion
- test: Tests
- chore: Tareas de mantenimiento
```

### Reglas obligatorias

- **NUNCA** subir cambios sin que el usuario lo pida explicitamente
- **NUNCA** usar `git push --force` (siempre `--force-with-lease`)
- **NUNCA** hacer push sin rebase sobre `dev`
- **NUNCA** commitear archivos `.env`, `node_modules/`, `dist/`
- **SIEMPRE** esperar que el usuario pruebe los cambios antes de commit
- **SIEMPRE** usar mensajes de commit descriptivos en ingles
- La rama principal de desarrollo es `dev`, no `main`

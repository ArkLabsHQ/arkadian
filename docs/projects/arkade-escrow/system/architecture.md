# Architecture: NestJS Backend

## Overview

arkade-escrow is built using NestJS, an opinionated Node.js framework that brings Angular-like architectural patterns to backend development. The framework provides dependency injection, modular organization, and extensive decorator-based metadata for building scalable, maintainable APIs.

The application follows a **domain-driven modular architecture** where each business domain is encapsulated in its own module with clearly defined responsibilities. This approach promotes code organization, testability, and separation of concerns.

## Module Structure

The application is organized into seven main modules, each handling a distinct domain:

### AppModule (Root)

The root module (`app.module.ts`) orchestrates the entire application:

```typescript
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: "sqlite",
        database: isTest ? ":memory:" : process.env.SQLITE_DB_PATH,
        synchronize: true,
        autoLoadEntities: true,
      }),
    }),
    AuthModule,
    EscrowsModule,
    UsersModule,
    HealthModule,
    AdminModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggingMiddleware)
      .exclude({ path: "health", method: RequestMethod.ALL })
      .forRoutes({ path: "*", method: RequestMethod.ALL });
  }
}
```

**Key responsibilities:**
- Database configuration (SQLite for POC, PostgreSQL-ready via TypeORM)
- Global module imports (Config, EventEmitter)
- Middleware registration (request logging for all routes except health checks)
- Auto-loading TypeORM entities from all modules

### AuthModule

Handles user authentication using Schnorr signatures and JWT tokens.

**Exports:**
- `AuthService`: Challenge creation, signature verification, JWT generation
- `AuthGuard`: Protects routes requiring authentication

**Dependencies:**
- `UsersModule` (imports User entity repository)
- `@nestjs/jwt` (JWT generation and validation)

**Key files:**
- `auth.service.ts`: Challenge-response authentication logic
- `auth.controller.ts`: Endpoints for signup/challenge and verification
- `auth.guard.ts`: CanActivate guard validating JWT tokens
- `user.decorator.ts`: Custom decorator extracting authenticated user from request

### UsersModule

Manages user entity and basic user operations.

**Exports:**
- `UsersService`: User CRUD operations
- `User` entity repository (via TypeOrmModule.forFeature)

**Key files:**
- `user.entity.ts`: User entity with public key, challenge fields, timestamps
- `users.service.ts`: User lookup and management
- `users.controller.ts`: User profile endpoints

### EscrowsModule

The core business domain handling escrow requests, contracts, arbitration, and execution.

**Sub-domains:**
- **Requests**: Creation and discovery of escrow requests (orderbook)
- **Contracts**: Contract lifecycle management (creation, funding detection, status tracking)
- **Arbitration**: Dispute resolution workflow
- **Execution**: Multi-party signature collection and transaction submission

**Exports:**
- `EscrowRequestsService`: Manages escrow request lifecycle
- `EscrowsContractsService`: Contract state management and funding detection
- `ArbitrationService`: Dispute handling

**Dependencies:**
- `AuthModule` (for protected routes)
- `UsersModule` (user lookups)
- `ArkModule` (blockchain interaction)

**Key files:**
- `escrows.module.ts`: Aggregates all escrow-related submodules
- `requests/escrow-requests.service.ts`: Orderbook and request management
- `contracts/escrows-contracts.service.ts`: Contract state machine
- `arbitration/arbitration.service.ts`: Arbitration workflow
- Entity files defining the escrow domain model

### ArkModule

Provides blockchain integration with the Arkade protocol.

**Exports:**
- `ArkService`: Transaction building and submission
- `ArkFundingWatcher`: Background service monitoring VTXO funding events
- `ARK_PROVIDER`: RestArkProvider instance (injectable token)

**Provider factory:**
```typescript
{
  provide: ARK_PROVIDER,
  inject: [ConfigService],
  useFactory: (cfg: ConfigService) => {
    const arkServerUrl = cfg.get<string>("ARK_SERVER_URL");
    return new RestArkProvider(
      arkServerUrl ?? "https://mutinynet.arkade.sh",
    );
  },
}
```

**Key files:**
- `ark.service.ts`: VEC script creation, transaction building, VTXO queries
- `funding-watcher.service.ts`: Polls for funded VTXOs, emits events
- `escrow.ts`: Virtual Escrow Contract script implementation

### AdminModule

Provides administrative endpoints for server operators.

**Exports:**
- `AdminService`: Server management operations
- `AdminController`: Admin-only API endpoints

**Key files:**
- `admin.service.ts`: Administrative business logic
- `admin.controller.ts`: Admin API routes

### HealthModule

Simple health check endpoint for monitoring and load balancers.

**Key files:**
- `health.controller.ts`: Returns 200 OK for health probes
- Excluded from request logging middleware

## Dependency Injection Pattern

NestJS uses a powerful dependency injection (DI) system inspired by Angular:

### Constructor Injection

Services are injected via constructor parameters with TypeScript decorators:

```typescript
@Injectable()
export class EscrowRequestsService {
  constructor(
    @InjectRepository(EscrowRequest)
    private readonly requestsRepo: Repository<EscrowRequest>,
    private readonly contractsService: EscrowsContractsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}
}
```

### Provider Registration

Services must be registered in module providers:

```typescript
@Module({
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
```

### Custom Providers

Factory providers allow dynamic configuration:

```typescript
{
  provide: ARK_PROVIDER,
  inject: [ConfigService],
  useFactory: (cfg: ConfigService) => {
    return new RestArkProvider(cfg.get("ARK_SERVER_URL"));
  },
}
```

## Service Layer Organization

Services contain business logic and are organized by responsibility:

### Transaction Script Pattern

Most services follow a transaction script pattern where each method handles one use case:

```typescript
@Injectable()
export class EscrowRequestsService {
  async create(dto: CreateEscrowRequestInDto, creatorPubkey: string) {
    // Validation
    // Entity creation
    // Persistence
    // Event emission
    return result;
  }

  async orderbook(limit: number, cursor: Cursor) {
    // Query building
    // Pagination logic
    // Transformation
    return { items, nextCursor, total };
  }
}
```

### Service Composition

Complex workflows compose multiple services:

```typescript
@Injectable()
export class EscrowsContractsService {
  constructor(
    private readonly arkService: ArkService,
    private readonly usersService: UsersService,
    @InjectRepository(EscrowContract) private readonly repo: Repository<EscrowContract>,
  ) {}
}
```

## Controller Design

Controllers handle HTTP concerns and delegate to services:

### Route Organization

```typescript
@ApiTags("1 - Escrow Requests")
@Controller("api/v1/escrows/requests")
export class EscrowRequestsController {
  constructor(
    private readonly requestsService: EscrowRequestsService,
    private readonly contractsService: EscrowsContractsService,
  ) {}

  @Get("orderbook")
  @ApiOkResponse(/* ... */)
  async orderbook(
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("cursor", ParseCursorPipe) cursor: Cursor,
  ): Promise<ApiEnvelope<OrderbookItemDto[]>> {
    const { items, nextCursor, total } = await this.requestsService.orderbook(limit, cursor);
    return paginatedEnvelope(items, { total, nextCursor });
  }

  @Post("")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async create(
    @Body() dto: CreateEscrowRequestInDto,
    @UserFromJwt() user: User,
  ): Promise<ApiEnvelope<CreateEscrowRequestOutDto>> {
    const data = await this.requestsService.create(dto, user.publicKey);
    return envelope(data);
  }
}
```

**Key patterns:**
- Decorators define HTTP methods, routes, guards, and documentation
- Query/body parameters are extracted with validation pipes
- Custom decorators like `@UserFromJwt()` inject authenticated user
- Services handle all business logic
- Response envelopes provide consistent API structure

## Middleware

### Request Logging Middleware

Applied globally to all routes (except health checks):

```typescript
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const { method, path } = req;
    Logger.log(`${method} ${path}`, "IncomingRequest");

    res.on("finish", () => {
      const { statusCode } = res;
      Logger.log(`${method} ${path} ${statusCode}`, "OutgoingResponse");
    });

    next();
  }
}
```

Logs both incoming requests and outgoing responses with status codes.

## Validation Pipes

### Global Validation Pipe

Configured in `main.ts` to validate all DTOs:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // Strip properties not in DTO
    forbidNonWhitelisted: true, // Reject requests with extra properties
    transform: true,            // Auto-transform primitives to correct types
  }),
);
```

### DTO Validation

Uses `class-validator` decorators:

```typescript
export class CreateEscrowRequestInDto {
  @ApiProperty({ enum: ["receiver", "sender"] })
  @IsEnum(["receiver", "sender"])
  side!: "receiver" | "sender";

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  description!: string;
}
```

Validation occurs automatically before controller methods execute. Invalid requests return 400 Bad Request with detailed error messages.

## Exception Filters

### Global HTTP Exception Filter

Configured in `main.ts`:

```typescript
app.useGlobalFilters(new HttpExceptionFilter());
```

Standardizes error responses across the application, ensuring consistent error formats for clients.

## Event Emitters

### Event-Driven Architecture

The application uses `@nestjs/event-emitter` for decoupled communication:

```typescript
@Injectable()
export class ArkFundingWatcher {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async checkFunding(contract: EscrowContract) {
    const vtxos = await this.arkService.getSpendableVtxoForContract(address);
    if (vtxos.length > 0) {
      this.eventEmitter.emit('contract.funded', { contractId, vtxos });
    }
  }
}
```

Services can listen for events without tight coupling to emitters:

```typescript
@OnEvent('contract.funded')
handleContractFunded(payload: { contractId: string; vtxos: VirtualCoin[] }) {
  // Update contract status
}
```

## TypeORM Entities

Entities define the database schema and are auto-loaded:

```typescript
@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "text" })
  publicKey!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

Repositories are injected via `@InjectRepository()` decorator and provide type-safe database access.

## Configuration Management

Environment variables are managed via `@nestjs/config`:

```typescript
ConfigModule.forRoot({ isGlobal: true })
```

Services inject `ConfigService` to access configuration:

```typescript
constructor(private readonly configService: ConfigService) {}

const arkUrl = this.configService.get<string>('ARK_SERVER_URL');
```

## Testing Architecture

NestJS provides excellent testing utilities:

### Unit Tests
- Mock dependencies using `@nestjs/testing`
- Test services in isolation

### Integration Tests
- Spin up in-memory database (SQLite `:memory:`)
- Test full request/response cycles with `supertest`

### E2E Tests
- Located in `server/test/`
- Test complete user journeys (e.g., escrow creation to execution)

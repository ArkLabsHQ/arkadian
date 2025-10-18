# API Design: REST API Patterns and Conventions

## Overview

arkade-escrow provides a RESTful API built with NestJS that follows modern best practices for HTTP API design. The API emphasizes consistency, type safety, comprehensive documentation, and developer experience through features like automatic validation, standardized error handling, and interactive documentation.

All endpoints are versioned under `/api/v1/` and documented using OpenAPI 3.0 (Swagger) specifications automatically generated from TypeScript decorators.

## NestJS Controllers

Controllers handle HTTP request/response concerns and delegate business logic to services:

### Controller Anatomy

```typescript
@ApiTags("1 - Escrow Requests")
@ApiExtraModels(ApiEnvelopeShellDto, CreateEscrowRequestOutDto)
@Controller("api/v1/escrows/requests")
export class EscrowRequestsController {
  constructor(
    private readonly requestsService: EscrowRequestsService,
    private readonly contractsService: EscrowsContractsService,
  ) {}

  @Post("")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiBody({ type: CreateEscrowRequestInDto })
  @ApiCreatedResponse({
    description: "Created successfully",
    schema: getSchemaPathForDto(CreateEscrowRequestOutDto),
  })
  @ApiUnauthorizedResponse({ description: "Missing/invalid JWT" })
  @ApiOperation({ summary: "Create an escrow request" })
  async create(
    @Body() dto: CreateEscrowRequestInDto,
    @UserFromJwt() user: User,
  ): Promise<ApiEnvelope<CreateEscrowRequestOutDto>> {
    const data = await this.requestsService.create(dto, user.publicKey);
    return envelope(data);
  }
}
```

**Key elements:**
- `@ApiTags()`: Groups endpoints in Swagger UI (numeric prefix for ordering)
- `@Controller()`: Defines base route path
- `@UseGuards()`: Applies authentication/authorization
- `@ApiOperation()`: Describes the endpoint
- `@ApiBody()`, `@ApiResponse()`: Document request/response schemas
- Parameter decorators: `@Body()`, `@Query()`, `@Param()`, `@UserFromJwt()`
- Return type: Typed response envelope for consistency

## Swagger/OpenAPI Integration

### Automatic Documentation Generation

The API documentation is generated automatically from decorators and TypeScript types:

```typescript
const config = new DocumentBuilder()
  .setTitle("ARK Escrow API")
  .setDescription("Custom header auth: `Authentication: Bearer <jwt>`")
  .setVersion("0.0.2")
  .addBearerAuth(
    { type: "http", scheme: "bearer", bearerFormat: "JWT", in: "header" },
    "bearer",
  )
  .build();

const doc = SwaggerModule.createDocument(app, config);
SwaggerModule.setup("api/v1/docs", app, doc, {
  swaggerOptions: {
    tagsSorter: "alpha",
    operationsSorter: "alpha",
    persistAuthorization: true,  // Remember JWT between page reloads
  },
});
```

**Interactive documentation available at:** `http://localhost:3000/api/v1/docs`

### Schema Documentation with Decorators

DTOs use decorators to generate rich schema information:

```typescript
export class CreateEscrowRequestInDto {
  @ApiProperty({
    enum: ["receiver", "sender"],
    description: "The receiver or sender of the funds",
  })
  @IsEnum(["receiver", "sender"])
  side!: "receiver" | "sender";

  @ApiProperty({
    minimum: 0,
    description: "Amount in satoshis or your smallest unit",
  })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  description!: string;

  @ApiPropertyOptional({
    description: "Whether the request is visible on the public orderbook",
  })
  @IsOptional()
  @IsBoolean()
  public?: boolean;
}
```

The `@ApiProperty()` decorators generate OpenAPI schema, while `@Is*()` decorators provide runtime validation.

## DTO Validation with class-validator

### Input Validation

All request bodies and query parameters are validated automatically using `class-validator`:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // Remove properties not in DTO
    forbidNonWhitelisted: true, // Reject requests with extra properties
    transform: true,            // Convert string "123" to number 123
  }),
);
```

### Validation Decorators

Common validation patterns:

```typescript
// String validation
@IsString()
@MinLength(10)
@MaxLength(100)
name!: string;

// Number validation
@IsNumber()
@Min(0)
@Max(1000000)
amount!: number;

// Enum validation
@IsEnum(["open", "cancelled"])
status!: "open" | "cancelled";

// Optional fields
@IsOptional()
@IsBoolean()
isPublic?: boolean;

// Nested object validation
@ValidateNested()
@Type(() => AddressDto)
address!: AddressDto;

// Array validation
@IsArray()
@ArrayMinSize(1)
@ArrayMaxSize(10)
@IsString({ each: true })
tags!: string[];
```

### Validation Errors

Invalid requests automatically return 400 Bad Request:

```json
{
  "statusCode": 400,
  "message": [
    "amount must not be less than 0",
    "description must be shorter than or equal to 1000 characters"
  ],
  "error": "Bad Request"
}
```

## Response Envelopes

All successful responses are wrapped in a consistent envelope structure:

### Simple Response Envelope

```typescript
export type ApiEnvelope<T> = {
  data: T;
};

export const envelope = <T>(data?: T): ApiEnvelope<T> => ({
  data: data ?? ({} as T),
});
```

**Example:**
```json
{
  "data": {
    "externalId": "q3f7p9n4z81k6c0b",
    "shareUrl": "https://app.example/escrows/requests/q3f7p9n4z81k6c0b"
  }
}
```

### Paginated Response Envelope

For list endpoints with cursor-based pagination:

```typescript
export type ApiPaginatedEnvelope<T> = {
  data: T;
  meta: {
    nextCursor?: string;
    total: number;
  };
};

export const paginatedEnvelope = <T>(
  data: T,
  meta: ApiPaginatedMeta,
): ApiPaginatedEnvelope<T> => ({
  data,
  meta,
});
```

**Example:**
```json
{
  "data": [
    { "externalId": "abc123", "amount": 1000, "..." },
    { "externalId": "def456", "amount": 2000, "..." }
  ],
  "meta": {
    "nextCursor": "MTczNDM1NzI5NjAwMDoxMg==",
    "total": 42
  }
}
```

### Empty Response

For operations that return nothing (e.g., DELETE):

```typescript
return envelope();  // Returns { data: {} }
```

### Schema Generation for Swagger

Helper functions generate OpenAPI schemas for envelopes:

```typescript
// For single object responses
getSchemaPathForDto(CreateEscrowRequestOutDto)

// For paginated list responses
getSchemaPathForPaginatedDto(OrderbookItemDto)

// For empty responses
getSchemaPathForEmptyResponse()
```

## Cursor-Based Pagination

### Why Cursor-Based Pagination?

Cursor-based pagination (vs offset-based) provides:
- **Consistent results** during concurrent writes
- **Better performance** for large datasets (no expensive OFFSET queries)
- **No duplicate/missing items** when data changes between requests

### Cursor Structure

Cursors encode timestamp + ID for stable ordering:

```typescript
export type Cursor = {
  createdBefore?: Date;
  idBefore?: number;
};

export function cursorToString(createdAt: Date, id: number): string {
  return Buffer.from(`${createdAt.getTime()}:${id}`, "utf8").toString("base64");
}

export function cursorFromString(cursor: string): Cursor {
  const raw = Buffer.from(cursor, "base64").toString("utf8");
  const [tsStr, idStr] = raw.split(":");
  return {
    createdBefore: Number.isFinite(ts) ? new Date(ts) : undefined,
    idBefore: Number.isFinite(idNum) ? idNum : undefined,
  };
}
```

**Encoded cursor example:** `MTczNDM1NzI5NjAwMDoxMg==` (base64)

**Decoded:** `{ createdBefore: Date(1734357296000), idBefore: 12 }`

### Query Parameters

```typescript
@Get("orderbook")
async orderbook(
  @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  @Query("cursor", ParseCursorPipe) cursor: Cursor,
): Promise<ApiEnvelope<OrderbookItemDto[]>> {
  const { items, nextCursor, total } = await this.service.orderbook(limit, cursor);
  return paginatedEnvelope(items, { total, nextCursor });
}
```

**Request:** `GET /api/v1/escrows/requests/orderbook?limit=20&cursor=MTczNDM1NzI5NjAwMDoxMg==`

### Custom Parse Pipe

```typescript
@Injectable()
export class ParseCursorPipe implements PipeTransform {
  transform(value: string | undefined): Cursor {
    if (!value) return emptyCursor;
    try {
      return cursorFromString(value);
    } catch {
      throw new BadRequestException("Invalid cursor format");
    }
  }
}
```

### Database Query with Cursor

```typescript
async orderbook(limit: number, cursor: Cursor) {
  const qb = this.repo.createQueryBuilder("req")
    .where("req.public = :public", { public: true })
    .andWhere("req.status = :status", { status: "open" })
    .orderBy("req.createdAt", "DESC")
    .addOrderBy("req.id", "DESC")
    .take(limit + 1);  // Fetch one extra to detect if there's a next page

  if (cursor.createdBefore && cursor.idBefore) {
    qb.andWhere(
      "(req.createdAt < :createdBefore OR (req.createdAt = :createdBefore AND req.id < :idBefore))",
      { createdBefore: cursor.createdBefore, idBefore: cursor.idBefore }
    );
  }

  const items = await qb.getMany();
  const hasMore = items.length > limit;
  if (hasMore) items.pop();

  const nextCursor = hasMore && items.length > 0
    ? cursorToString(items[items.length - 1].createdAt, items[items.length - 1].id)
    : undefined;

  const total = await qb.getCount();

  return { items, nextCursor, total };
}
```

**Key points:**
- Fetch `limit + 1` items to detect if more pages exist
- Remove extra item before returning
- Generate `nextCursor` from last item if more pages exist
- Order by `(createdAt DESC, id DESC)` for stable sorting

## Error Handling

### HTTP Exception Filter

Global exception filter standardizes error responses:

```typescript
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;

    const message = exception instanceof HttpException
      ? exception.message
      : "Internal server error";

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### Standard HTTP Exceptions

NestJS provides exception classes for common HTTP errors:

```typescript
throw new NotFoundException("Escrow request not found");
throw new BadRequestException("Invalid amount");
throw new UnauthorizedException("Missing JWT token");
throw new ForbiddenException("Only the request creator can cancel");
throw new ConflictException("Request already accepted or canceled");
throw new InternalServerErrorException("Database error");
```

### Validation Error Response

```json
{
  "statusCode": 400,
  "message": [
    "side must be one of the following values: receiver, sender",
    "amount must not be less than 0"
  ],
  "error": "Bad Request"
}
```

### Custom Error Response

```json
{
  "statusCode": 404,
  "message": "Escrow request not found",
  "timestamp": "2025-10-16T12:34:56.789Z",
  "path": "/api/v1/escrows/requests/invalid-id"
}
```

## CORS Configuration

CORS is enabled globally:

```typescript
const app = await NestFactory.create(AppModule);
app.enableCors();
```

**Default behavior:** Allows all origins in development.

**Production:** Should restrict to specific origins:

```typescript
app.enableCors({
  origin: ['https://app.example.com', 'https://admin.example.com'],
  credentials: true,
});
```

## API Versioning

### URL Path Versioning

All endpoints are prefixed with `/api/v1/`:

```typescript
@Controller("api/v1/escrows/requests")
export class EscrowRequestsController { }

@Controller("api/v1/auth")
export class AuthController { }

@Controller("api/v1/users")
export class UsersController { }
```

**Rationale:**
- **Explicit versioning** allows breaking changes without disrupting existing clients
- **Path-based** (vs header-based) makes API exploration easier
- **Consistent namespace** (`/api/v1/*`) simplifies routing and proxying

### Future Version Support

When introducing breaking changes:

1. Create new controllers with `api/v2/` prefix
2. Maintain `v1` controllers for backward compatibility
3. Document migration guide for clients
4. Deprecate `v1` endpoints after transition period

Example:

```typescript
// Legacy v1 endpoint
@Controller("api/v1/escrows/requests")
export class EscrowRequestsV1Controller { }

// New v2 endpoint with breaking changes
@Controller("api/v2/escrows/requests")
export class EscrowRequestsV2Controller { }
```

## Authentication Header

### Bearer Token Format

Protected endpoints require JWT in `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Swagger Integration

Bearer auth is configured globally in Swagger:

```typescript
.addBearerAuth(
  { type: "http", scheme: "bearer", bearerFormat: "JWT", in: "header" },
  "bearer",
)
```

Controllers mark protected endpoints with `@ApiBearerAuth()`:

```typescript
@Post("")
@UseGuards(AuthGuard)
@ApiBearerAuth()
async create(...) { }
```

This adds a padlock icon in Swagger UI and includes the `Authorization` header in requests.

## Common API Patterns

### GET Single Resource

```typescript
@Get(":externalId")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@ApiOkResponse({ schema: getSchemaPathForDto(GetEscrowRequestDto) })
@ApiNotFoundResponse({ description: "Escrow request not found" })
async getOne(
  @Param("externalId") externalId: string,
  @UserFromJwt() user: User,
): Promise<ApiEnvelope<GetEscrowRequestDto>> {
  const data = await this.service.getByExternalId(externalId, user.publicKey);
  return envelope(data);
}
```

### GET List with Pagination

```typescript
@Get("orderbook")
@ApiQuery({ name: "limit", required: false, type: "integer", example: 20 })
@ApiQuery({ name: "cursor", required: false, type: "string" })
@ApiOkResponse({ schema: getSchemaPathForPaginatedDto(OrderbookItemDto) })
async orderbook(
  @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  @Query("cursor", ParseCursorPipe) cursor: Cursor,
): Promise<ApiEnvelope<OrderbookItemDto[]>> {
  const { items, nextCursor, total } = await this.service.orderbook(limit, cursor);
  return paginatedEnvelope(items, { total, nextCursor });
}
```

### POST Create Resource

```typescript
@Post("")
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiBody({ type: CreateEscrowRequestInDto })
@ApiCreatedResponse({ schema: getSchemaPathForDto(CreateEscrowRequestOutDto) })
@ApiUnauthorizedResponse({ description: "Missing/invalid JWT" })
async create(
  @Body() dto: CreateEscrowRequestInDto,
  @UserFromJwt() user: User,
): Promise<ApiEnvelope<CreateEscrowRequestOutDto>> {
  const data = await this.service.create(dto, user.publicKey);
  return envelope(data);
}
```

### PATCH Update Resource

```typescript
@Patch(":id")
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiBody({ type: UpdateEscrowRequestDto })
@ApiOkResponse({ schema: getSchemaPathForDto(GetEscrowRequestDto) })
@ApiNotFoundResponse({ description: "Request not found" })
async update(
  @Param("id") id: string,
  @Body() dto: UpdateEscrowRequestDto,
  @UserFromJwt() user: User,
): Promise<ApiEnvelope<GetEscrowRequestDto>> {
  const data = await this.service.update(id, dto, user.publicKey);
  return envelope(data);
}
```

### DELETE Resource

```typescript
@Delete(":externalId")
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiOkResponse({ schema: getSchemaPathForEmptyResponse() })
@ApiNotFoundResponse({ description: "Request not found" })
@ApiForbiddenResponse({ description: "Not allowed to cancel this request" })
async cancel(
  @Param("externalId") externalId: string,
  @UserFromJwt() user: User,
): Promise<ApiEnvelope<void>> {
  await this.service.cancel(externalId, user.publicKey);
  return envelope();
}
```

## Request Logging Middleware

All requests (except health checks) are logged:

```typescript
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const { method, path } = req;
    Logger.log(`${method} ${path}`, "IncomingRequest");

    res.on("finish", () => {
      Logger.log(`${method} ${path} ${res.statusCode}`, "OutgoingResponse");
    });

    next();
  }
}
```

**Example logs:**
```
[IncomingRequest] POST /api/v1/escrows/requests
[OutgoingResponse] POST /api/v1/escrows/requests 201
```

## Health Check Endpoint

Simple health probe for load balancers and monitoring:

```typescript
@Controller("health")
export class HealthController {
  @Get()
  check() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-16T12:34:56.789Z"
}
```

Excluded from request logging middleware and authentication.

## API Design Best Practices

### Resource-Oriented URLs

URLs represent resources (nouns), not actions (verbs):

- ✅ `POST /api/v1/escrows/requests` (create request)
- ❌ `POST /api/v1/escrows/createRequest` (action in URL)

- ✅ `DELETE /api/v1/escrows/requests/:id` (cancel request)
- ❌ `POST /api/v1/escrows/requests/:id/cancel` (action in URL)

### HTTP Method Semantics

- `GET`: Read resources (idempotent, no side effects)
- `POST`: Create resources or trigger actions
- `PUT`: Replace entire resource
- `PATCH`: Partially update resource
- `DELETE`: Remove resource

### Status Code Usage

- `200 OK`: Successful GET, PATCH, PUT
- `201 Created`: Successful POST creating a resource
- `204 No Content`: Successful DELETE (alternative to 200 with empty body)
- `400 Bad Request`: Validation error or malformed request
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Authenticated but not authorized
- `404 Not Found`: Resource doesn't exist
- `409 Conflict`: Request conflicts with current state (e.g., duplicate creation)
- `500 Internal Server Error`: Unexpected server error

### Idempotency

`GET`, `PUT`, `DELETE` operations are idempotent (repeating has same effect).

`POST` is **not** idempotent (repeating may create duplicates). Consider:
- Unique constraints on database
- Idempotency keys for critical operations
- `409 Conflict` responses for duplicates

### Filtering, Sorting, Searching

Not yet implemented, but recommended patterns:

```
GET /api/v1/escrows/requests?status=open&side=receiver
GET /api/v1/escrows/requests?sort=-createdAt
GET /api/v1/escrows/requests?search=keyword
```

## Testing the API

### Swagger UI

Interactive testing at `http://localhost:3000/api/v1/docs`:

1. Authenticate by clicking "Authorize" and pasting JWT
2. Expand endpoint
3. Click "Try it out"
4. Fill parameters/body
5. Execute request
6. View response

### cURL Examples

```bash
# Get public orderbook
curl http://localhost:3000/api/v1/escrows/requests/orderbook

# Create request (authenticated)
curl -X POST http://localhost:3000/api/v1/escrows/requests \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"side":"sender","amount":10000,"description":"Test escrow"}'

# Get specific request
curl http://localhost:3000/api/v1/escrows/requests/abc123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Integration Tests

Using `supertest`:

```typescript
describe('EscrowRequestsController (e2e)', () => {
  it('should create escrow request', () => {
    return request(app.getHttpServer())
      .post('/api/v1/escrows/requests')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ side: 'sender', amount: 10000, description: 'Test' })
      .expect(201)
      .expect((res) => {
        expect(res.body.data).toHaveProperty('externalId');
      });
  });
});
```

## Future API Enhancements

1. **Rate limiting** per user/IP
2. **GraphQL endpoint** for flexible querying
3. **WebSocket support** for real-time contract updates
4. **Batch operations** (create multiple requests in one call)
5. **Field selection** (`?fields=externalId,amount`)
6. **Partial responses** (only return changed fields)
7. **ETag support** for caching
8. **API analytics** and usage metrics
9. **Request tracing** (correlation IDs)
10. **API gateway integration** (Kong, Tyk)

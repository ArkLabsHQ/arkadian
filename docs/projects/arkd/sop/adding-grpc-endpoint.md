# SOP: Adding a gRPC Endpoint

Step-by-step procedure for adding new gRPC endpoints to arkd.

## Prerequisites

- Understand hexagonal architecture (see `system/architecture/hexagonal-architecture.md`)
- Protocol Buffers knowledge
- Familiarity with application service layer

## Procedure

### 1. Update Proto Definition

**File**: `api-spec/protobuf/ark/v1/<service>.proto`

```protobuf
service AdminService {
  rpc CancelRound(CancelRoundRequest) returns (CancelRoundResponse) {
    option (google.api.http) = {
      post: "/v1/admin/round/{round_id}/cancel"
      body: "*"
    };
  }
}

message CancelRoundRequest {
  string round_id = 1;
  string reason = 2;
}

message CancelRoundResponse {
  bool success = 1;
  string message = 2;
}
```

### 2. Generate Proto Code

```bash
cd ${ARKD_REPO}
make proto
```

Generates:
- `api-spec/protobuf/gen/ark/v1/<service>.pb.go` - Messages
- `api-spec/protobuf/gen/ark/v1/<service>_grpc.pb.go` - Service interface

### 3. Add Domain Logic (if needed)

**File**: `internal/core/domain/<entity>.go`

```go
func (r *Round) CanBeCancelled() bool {
    return !r.Ended && !r.Failed
}
```

**File**: `internal/core/domain/errors.go`

```go
var ErrCannotCancelRound = errors.New("cannot cancel round")
```

### 4. Add Application Service Method

**File**: `internal/core/application/<service>.go`

```go
func (a *adminService) CancelRound(
    ctx context.Context,
    roundID, reason string,
) error {
    // 1. Load entity
    round, err := a.repoManager.RoundRepository().GetRound(ctx, roundID)
    if err != nil {
        return err
    }

    // 2. Validate (domain logic)
    if !round.CanBeCancelled() {
        return domain.ErrCannotCancelRound
    }

    // 3. Execute business logic
    round.Cancelled = true
    round.CancellationReason = reason

    // 4. Persist changes
    if err := a.repoManager.RoundRepository().UpdateRound(ctx, round); err != nil {
        return err
    }

    // 5. Publish event (optional)
    a.eventBroker.Publish(ctx, domain.TopicRoundCancelled, round)

    return nil
}
```

### 5. Implement gRPC Handler

**File**: `internal/interface/grpc/handlers/<service>service.go`

```go
func (h *adminHandler) CancelRound(
    ctx context.Context,
    req *arkv1.CancelRoundRequest,
) (*arkv1.CancelRoundResponse, error) {
    // 1. Validate request
    if req.RoundId == "" {
        return nil, status.Error(codes.InvalidArgument, "round_id required")
    }

    // 2. Call application service
    if err := h.adminService.CancelRound(ctx, req.RoundId, req.Reason); err != nil {
        return nil, handleError(err)
    }

    // 3. Return response
    return &arkv1.CancelRoundResponse{
        Success: true,
        Message: fmt.Sprintf("Round %s cancelled", req.RoundId),
    }, nil
}
```

### 6. Update Error Mapping

**File**: `internal/interface/grpc/handlers/arkservice.go`

```go
func handleError(err error) error {
    switch {
    case errors.Is(err, domain.ErrCannotCancelRound):
        return status.Error(codes.FailedPrecondition, "cannot cancel round")
    // ... other errors
    }
}
```

### 7. Configure Permissions

**File**: `internal/interface/grpc/permissions/permissions.go`

```go
var permissions = map[string][]bakery.Op{
    "/ark.v1.AdminService/CancelRound": {{
        Entity: "admin",
        Action: "write",
    }},
}
```

### 8. Add Database Support (if schema changes needed)

See `database-workflows.md` for migration and query procedures.

## Testing

### Unit Test (Application Layer)

```go
func TestAdminService_CancelRound(t *testing.T) {
    // Setup mocks
    mockRepo := &MockRoundRepository{}
    adminSvc := NewAdminService(mockRepo)

    // Execute
    err := adminSvc.CancelRound(context.Background(), "round-1", "test")

    // Assert
    assert.NoError(t, err)
}
```

### Integration Test (Handler)

```bash
# Start arkd
make run

# Test via grpcurl
grpcurl -d '{"round_id": "round-1", "reason": "Manual"}' \
  -H "macaroon: <admin-macaroon>" \
  localhost:7070 ark.v1.AdminService/CancelRound
```

## Validation Checklist

- [ ] Proto definition added and valid
- [ ] Proto code generated (`make proto`)
- [ ] Domain logic implemented (if needed)
- [ ] Application service method added
- [ ] gRPC handler implemented
- [ ] Request validation in handler
- [ ] Error handling and mapping
- [ ] Permissions configured
- [ ] Database changes (if needed)
- [ ] Unit tests added
- [ ] Integration test successful
- [ ] Code compiles (`make build`)
- [ ] All tests pass (`make test`)

## Common Patterns

### Query Endpoint (Read-only)
```go
func (h *handler) GetRound(ctx, req) (*Response, error) {
    round, err := h.indexer.GetRound(ctx, req.RoundId)
    return toProtoRound(round), nil
}
```

### Mutation Endpoint (Write)
```go
func (h *handler) UpdateRound(ctx, req) (*Response, error) {
    err := h.service.UpdateRound(ctx, req.RoundId, req.Data)
    return &Response{Success: true}, nil
}
```

### Streaming Endpoint
```go
func (h *handler) SubscribeEvents(req *Request, stream Server) error {
    eventChan := h.eventBroker.Subscribe(topic)
    for event := range eventChan {
        stream.Send(toProtoEvent(event))
    }
    return nil
}
```

## See Also

- `system/architecture/hexagonal-architecture.md` - Architecture patterns
- `database-workflows.md` - Database changes
- `development-workflow.md` - General workflow

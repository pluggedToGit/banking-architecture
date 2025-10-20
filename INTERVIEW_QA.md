# Banking Micro Frontend Architecture - Interview Q&A

## Foundational Understanding

### 1. Can you walk me through the high-level flow of how a user accesses a banking feature in your MFE architecture?

**Answer:**

The user journey follows a carefully orchestrated flow:

1. **Initial Authentication**: User opens the banking app, shell application loads and validates JWT token stored in localStorage. If invalid, redirects to ADFS SAML authentication.

2. **MFE Discovery**: Shell queries DynamoDB MFE registry to get available MFEs, filtering by user permissions and role (customer, premium, business).

3. **Health & Loading**: Parallel health checks are performed on all eligible MFEs. Those passing health checks are dynamically imported via Module Federation.

4. **Integration**: MFEs are mounted in designated DOM containers, with shared services (API client, event bus, user context, theme) injected during initialization.

5. **Runtime Navigation**: When user navigates to a banking feature (e.g., /payments), the dynamic router determines which MFE handles that route and activates it seamlessly.

6. **State Synchronization**: All MFEs share state through Redux store and communicate via event bus for cross-cutting concerns like balance updates or notifications.

The entire flow is designed for zero shell redeployment - new MFEs can be added or updated without touching the shell application.

### 2. What are the main advantages of using micro-frontends over a monolithic frontend in a banking context?

**Answer:**

Banking applications have unique requirements that make MFEs particularly advantageous:

**Team Autonomy & Velocity:**
- Independent deployment cycles - payments team can deploy without coordinating with accounts team
- Technology diversity - different teams can use React, Vue, or Angular based on expertise
- Parallel development reduces time-to-market for new banking products

**Risk Management:**
- Failure isolation - if investment portfolio MFE fails, core banking functions (accounts, payments) remain operational
- Gradual rollouts - deploy new features to 5% of premium customers first via canary deployments
- A/B testing capabilities for regulatory compliance and user experience optimization

**Regulatory & Compliance:**
- Separate audit trails per business domain
- Different security policies per MFE (e.g., stricter policies for wire transfers vs. account viewing)
- Easier compliance with banking regulations that require feature-level controls

**Business Agility:**
- White-labeling capability - enable/disable MFEs per bank configuration
- Market-specific features - international transfers only for certain regions
- Customer segment customization - wealth management features only for premium customers

### 3. How does your shell application remain agnostic to the specific MFEs it hosts?

**Answer:**

The shell maintains complete agnosticism through several architectural patterns:

**Configuration-Driven Architecture:**
```typescript
// Shell never hardcodes MFE references
const mfeConfig = await this.configService.fetchMFEConfig();
for (const mfe of mfeConfig.mfes) {
  if (this.shouldLoadMFE(mfe)) {
    await this.loadMFE(mfe); // Generic loading
  }
}
```

**Abstract Service Contracts:**
- MFEs implement standardized interfaces (IMFEApplication, IMFELifecycle)
- Shell provides dependency injection of shared services
- No direct imports or references to specific MFE code

**Dynamic Route Registration:**
- MFEs register their routes at runtime: `router.registerRoutes(mfeId, routes)`
- Shell's dynamic router handles routing without knowing route specifics
- Route guards and metadata are MFE-defined

**Event-Driven Communication:**
- Shell publishes generic events: `eventBus.emit('user:authenticated', userContext)`
- MFEs subscribe to relevant events without shell knowing who's listening
- Cross-MFE communication via abstract event contracts

**Metadata-Driven UI:**
- Shell renders navigation from MFE metadata (icon, name, priority)
- No hardcoded menu items or UI elements specific to business domains

This ensures new banking products can be added as MFEs without any shell code changes.

---

## Technical Deep Dive

### 4. Explain how Module Federation works in your implementation. What happens when an MFE fails to load?

**Answer:**

**Module Federation Implementation:**

Our Module Federation setup uses dynamic remotes for maximum flexibility:

```typescript
// Shell webpack config - no hardcoded remotes
new ModuleFederationPlugin({
  name: 'shell',
  remotes: {}, // Populated at runtime
  shared: {
    'react': { singleton: true, requiredVersion: '^18.0.0' },
    '@banking/shared-components': { singleton: true }
  }
})

// Dynamic loading
class DynamicRemoteLoader {
  async loadRemote(mfeConfig: MFEConfig): Promise<any> {
    const container = await this.loadRemoteContainer(mfeConfig.entryPoint);
    await container.init(__webpack_share_scopes__.default);
    const factory = await container.get('./App');
    return factory();
  }
}
```

**MFE Failure Handling - Multi-layered Approach:**

1. **Health Check Failure**: If health check fails, check cache for previous version
2. **Load Failure**: Try fallback CDN, then cached version, then generic fallback UI
3. **Runtime Failure**: Circuit breaker pattern isolates failing MFE, shows degraded experience

```typescript
async loadMFE(config: MFEConfig): Promise<void> {
  try {
    await this.validateMFEHealth(config);
    const mfeInstance = await this.dynamicImport(config.entryPoint);
    // ... success path
  } catch (error) {
    // Fallback strategy
    if (this.cache.has(config.id)) {
      await this.loadFromCache(config.id);
      this.showDegradedModeWarning();
    } else {
      await this.loadFallbackUI(config.id);
    }
  }
}
```

**Business Continuity**: Critical banking functions always have fallback UIs ensuring users can still access accounts and make payments even if the advanced MFE fails.

### 5. You mention using DynamoDB for MFE registry. Why not a relational database? What are the trade-offs?

**Answer:**

**Why DynamoDB for MFE Registry:**

**Global Distribution Requirements:**
- Banking applications need multi-region deployment
- DynamoDB Global Tables provide eventual consistency across regions
- Sub-millisecond lookups for MFE configuration retrieval
- Built-in replication eliminates single points of failure

**Scale & Performance Characteristics:**
```json
// MFE registry access pattern
{
  "mfe_id": "account_mfe",           // Partition key
  "version_environment": "2.1.0#production", // Sort key
  "is_active": "true",
  "deployment_config": { ... }
}
```

- Predictable single-digit millisecond latency
- No connection pooling issues during traffic spikes
- Automatic scaling during peak banking hours

**Operational Benefits:**
- Serverless - no database maintenance overhead
- DynamoDB Streams for real-time configuration change notifications
- TTL for automatic cleanup of old MFE versions

**Trade-offs:**

**Limitations:**
- Eventual consistency can cause brief config inconsistencies
- Limited query patterns (can't easily query "all beta MFEs across environments")
- No ACID transactions across items (mitigated by our design)

**When We'd Use RDS:**
- Complex relational queries needed
- Strong consistency requirements
- Audit trails requiring complex joins

**Mitigation Strategies:**
- Cache frequently accessed configs in shell application
- Use Global Secondary Indexes for additional query patterns
- Implement application-level consistency checks for critical operations

### 6. How do you handle version compatibility between the shell app and individual MFEs?

**Answer:**

**Multi-layered Compatibility Strategy:**

**1. Semantic Versioning Contract:**
```typescript
interface CompatibilityConfig {
  shell_version_min: "1.5.0",     // Minimum shell version required
  shell_version_max: "2.0.0",     // Maximum shell version tested
  shared_dependencies: {
    "@banking/design-system": "^3.2.0",
    "@banking/api-client": "^2.1.0"
  }
}
```

**2. Runtime Compatibility Checks:**
```typescript
class VersionCompatibilityChecker {
  async validateCompatibility(mfeConfig: MFEConfig): Promise<boolean> {
    // Check shell version compatibility
    if (!semver.satisfies(SHELL_VERSION, mfeConfig.compatibility.shell_version_range)) {
      this.logger.warn(`MFE ${mfeConfig.id} incompatible with shell ${SHELL_VERSION}`);
      return false;
    }
    
    // Validate shared dependency versions
    for (const [dep, version] of Object.entries(mfeConfig.shared_dependencies)) {
      if (!this.isSharedDependencyCompatible(dep, version)) {
        return false;
      }
    }
    
    return true;
  }
}
```

**3. Graceful Degradation:**
- **Compatible Version Loading**: If latest MFE version is incompatible, load the most recent compatible version
- **Feature Flag Coordination**: Shell version determines which MFE features are available
- **API Version Negotiation**: MFEs declare supported API versions, shell provides appropriate client

**4. Module Federation Shared Dependencies:**
```javascript
shared: {
  'react': {
    singleton: true,
    requiredVersion: '^18.0.0',
    strictVersion: true // Prevents version conflicts
  },
  '@banking/shared-components': {
    singleton: true,
    strictVersion: false, // Allow minor version differences
    requiredVersion: '^3.0.0'
  }
}
```

**5. Testing Strategy:**
- **Matrix Testing**: Test shell versions against MFE version combinations
- **Compatibility Automation**: CI/CD pipeline validates compatibility before deployment
- **Canary Rollouts**: Deploy incompatible versions to small user segments first

### 7. Walk me through your Event Bus implementation. How does it differ from using WebSockets for real-time updates?

**Answer:**

**Event Bus Architecture:**

Our Event Bus is a pub/sub system optimized for micro-frontend communication:

```typescript
class EventBus {
  private channels = new Map<string, Set<EventHandler>>();
  private eventQueue: Event[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  
  subscribe(channel: string, handler: EventHandler): void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(handler);
  }
  
  publish(channel: string, data: any): void {
    // Batch events for performance
    this.eventQueue.push({ channel, data, timestamp: Date.now() });
    this.scheduleBatchProcessing();
  }
  
  private scheduleBatchProcessing(): void {
    if (this.batchTimer) return;
    
    this.batchTimer = setTimeout(() => {
      this.processBatchedEvents();
      this.batchTimer = null;
    }, 16); // ~60fps
  }
}
```

**Event Bus vs WebSockets Comparison:**

**Event Bus Advantages:**
- **In-Memory Performance**: No network latency for client-side events
- **Type Safety**: TypeScript interfaces for event contracts
- **Debugging**: Easy to log, trace, and test event flows
- **Batching**: Multiple state updates can be batched for performance
- **Guaranteed Delivery**: No connection issues or retry logic needed

**Event Bus Limitations:**
- **Local Only**: Can't receive events from server or other browser tabs
- **No Persistence**: Events lost on page refresh
- **Single Browser Instance**: No cross-tab synchronization

**Hybrid Approach - Best of Both:**

We use Event Bus for client-side coordination and external systems for server events:

```typescript
class HybridEventSystem {
  constructor(
    private eventBus: EventBus,
    private serverEvents: ServerEventAdapter // Could be WebSocket, SSE, or polling
  ) {
    // Bridge server events to local event bus
    this.serverEvents.onEvent((serverEvent) => {
      this.eventBus.publish(serverEvent.type, {
        ...serverEvent.data,
        source: 'server'
      });
    });
  }
}
```

**Use Cases by Pattern:**
- **Event Bus**: State synchronization between MFEs, UI coordination, navigation events
- **Server Integration**: Account balance updates, transaction alerts, system notifications
- **Combined**: Real-time fraud alerts (server) triggering UI state changes (event bus) across multiple MFEs

---

## State Management & Data Flow

### 8. How do you prevent state conflicts when multiple MFEs try to update the same piece of shared state simultaneously?

**Answer:**

**Multi-layered Conflict Prevention Strategy:**

**1. Optimistic Locking with Versioning:**
```typescript
interface VersionedState {
  data: any;
  version: number;
  lastModified: timestamp;
  mfeId: string; // Which MFE last modified this
}

class StateManager {
  async updateState(stateKey: string, newValue: any, expectedVersion: number): Promise<boolean> {
    const currentState = this.getState(stateKey);
    
    if (currentState.version !== expectedVersion) {
      // Conflict detected - resolve using banking priority rules
      return this.resolveConflict(stateKey, newValue, currentState);
    }
    
    // Safe to update
    this.setState(stateKey, {
      data: newValue,
      version: currentState.version + 1,
      lastModified: Date.now(),
      mfeId: this.getCurrentMFEId()
    });
    
    return true;
  }
}
```

**2. Banking-Specific Conflict Resolution:**
```typescript
private resolveBankingConflict(current: State, incoming: State): State {
  // Rule 1: Account balance - always use server value
  if (this.isBalanceUpdate(current, incoming)) {
    return incoming;
  }
  
  // Rule 2: Security settings - use most restrictive
  if (this.isSecurityUpdate(current, incoming)) {
    return this.chooseMostRestrictive(current, incoming);
  }
  
  // Rule 3: Transaction status - completed beats pending
  if (this.isTransactionUpdate(current, incoming)) {
    return this.prioritizeTransactionStatus(current, incoming);
  }
  
  // Rule 4: Timestamps - last write wins for user preferences
  return incoming.lastModified > current.lastModified ? incoming : current;
}
```

**3. State Ownership & Isolation:**
- **Domain Boundaries**: Each MFE owns its primary state (accounts MFE owns account data)
- **Shared State Scoping**: Limit shared state to truly cross-cutting concerns (user context, notifications)
- **Read-Only Projections**: MFEs can read but not modify other domains' core state

**4. Event-Driven Coordination:**
```typescript
// Instead of direct state mutation
accountMFE.updateBalance(newBalance); // ❌ Direct conflict potential

// Use events for coordination
eventBus.publish('balance:update:requested', {
  accountId: '12345',
  newBalance: 1500.00,
  requestingMFE: 'payment'
});

// Account MFE owns the authoritative update
accountMFE.on('balance:update:requested', async (event) => {
  const validatedBalance = await this.validateWithServer(event);
  this.updateOwnedState('account.balance', validatedBalance);
});
```

**5. Critical Section Locks:**
For high-stakes operations like fund transfers:
```typescript
class CriticalSectionManager {
  private locks = new Map<string, Promise<void>>();
  
  async withLock<T>(resourceId: string, operation: () => Promise<T>): Promise<T> {
    const lockKey = `transfer:${resourceId}`;
    
    if (this.locks.has(lockKey)) {
      await this.locks.get(lockKey);
    }
    
    const lockPromise = this.executeWithLock(operation);
    this.locks.set(lockKey, lockPromise);
    
    try {
      return await lockPromise;
    } finally {
      this.locks.delete(lockKey);
    }
  }
}
```

### 9. Explain your optimistic update strategy. What happens if a banking transaction fails after the UI has already been updated?

**Answer:**

**Optimistic Update Implementation:**

```typescript
class OptimisticUpdateManager {
  private pendingUpdates = new Map<string, OptimisticUpdate>();
  
  async optimisticUpdate<T>(
    operationId: string,
    stateKey: string,
    optimisticValue: T,
    serverOperation: () => Promise<T>
  ): Promise<T> {
    
    // 1. Store current state for rollback
    const previousState = this.store.getState()[stateKey];
    const optimisticUpdate: OptimisticUpdate = {
      operationId,
      stateKey,
      previousValue: previousState,
      optimisticValue,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    this.pendingUpdates.set(operationId, optimisticUpdate);
    
    // 2. Apply optimistic update immediately
    this.store.dispatch({
      type: 'OPTIMISTIC_UPDATE',
      payload: { stateKey, value: optimisticValue, operationId }
    });
    
    // 3. Update UI with pending indicator
    this.showPendingIndicator(operationId);
    
    try {
      // 4. Execute server operation
      const serverResult = await serverOperation();
      
      // 5. Confirm optimistic update
      await this.confirmOptimisticUpdate(operationId, serverResult);
      
      return serverResult;
      
    } catch (error) {
      // 6. Rollback on failure
      await this.rollbackOptimisticUpdate(operationId, error);
      throw error;
    }
  }
}
```

**Banking Transaction Failure Handling:**

**Immediate Rollback with User Feedback:**
```typescript
private async rollbackOptimisticUpdate(operationId: string, error: Error): Promise<void> {
  const update = this.pendingUpdates.get(operationId);
  if (!update) return;
  
  // 1. Restore previous state
  this.store.dispatch({
    type: 'ROLLBACK_OPTIMISTIC_UPDATE',
    payload: {
      stateKey: update.stateKey,
      previousValue: update.previousValue,
      operationId
    }
  });
  
  // 2. Show contextual error message
  if (this.isFundTransferError(error)) {
    this.showErrorNotification({
      title: 'Transfer Failed',
      message: 'Your account balance has been restored. Please try again.',
      type: 'error',
      actions: [
        { label: 'Retry Transfer', onClick: () => this.retryOperation(operationId) },
        { label: 'Contact Support', onClick: () => this.openSupport() }
      ]
    });
  }
  
  // 3. Emit failure event for other MFEs
  this.eventBus.publish('transaction:failed', {
    operationId,
    error: error.message,
    affectedAccounts: update.affectedAccounts
  });
  
  // 4. Cleanup
  this.pendingUpdates.delete(operationId);
  this.hidePendingIndicator(operationId);
}
```

**Visual State Management:**
```typescript
// Redux state includes optimistic update tracking
interface BankingState {
  accounts: {
    '12345': {
      balance: 1500.00,
      optimisticOperations: ['transfer_abc123'], // Track pending operations
      lastConfirmedBalance: 1500.00 // Fallback for rollback
    }
  }
}

// UI Component shows pending state
function AccountBalance({ account }) {
  const hasPendingOperations = account.optimisticOperations.length > 0;
  
  return (
    <div className="balance-display">
      <span className={hasPendingOperations ? 'pending' : ''}>
        ${account.balance.toFixed(2)}
      </span>
      {hasPendingOperations && (
        <PendingIndicator 
          message="Processing transaction..."
          onCancel={() => cancelOptimisticUpdate(account.id)}
        />
      )}
    </div>
  );
}
```

**Banking-Specific Considerations:**

**Regulatory Compliance:**
- All optimistic updates logged for audit trail
- Failed operations trigger compliance workflow
- User actions during pending states are restricted

**User Experience:**
- Conservative optimistic updates for high-value transactions
- Immediate feedback for low-risk operations (viewing statements)
- Progressive disclosure of transaction status

### 10. How do you ensure data consistency across MFEs when dealing with critical banking operations like fund transfers?

**Answer:**

**Multi-layered Consistency Strategy:**

**1. Saga Pattern for Distributed Transactions:**
```typescript
class FundTransferSaga {
  async execute(transferRequest: TransferRequest): Promise<void> {
    const sagaId = this.generateSagaId();
    
    try {
      // Step 1: Reserve funds in source account
      await this.reserveFunds(transferRequest.fromAccount, transferRequest.amount, sagaId);
      
      // Step 2: Create pending transfer record
      await this.createPendingTransfer(transferRequest, sagaId);
      
      // Step 3: Execute transfer
      await this.executeTransfer(transferRequest, sagaId);
      
      // Step 4: Commit transaction
      await this.commitTransfer(sagaId);
      
      // Success - notify all MFEs
      this.eventBus.publish('transfer:completed', {
        sagaId,
        transferRequest,
        completedAt: new Date()
      });
      
    } catch (error) {
      // Compensating actions - rollback in reverse order
      await this.rollbackSaga(sagaId, error);
    }
  }
  
  private async rollbackSaga(sagaId: string, error: Error): Promise<void> {
    const sagaState = await this.getSagaState(sagaId);
    
    // Rollback completed steps in reverse order
    if (sagaState.transferExecuted) {
      await this.reverseTransfer(sagaId);
    }
    
    if (sagaState.pendingTransferCreated) {
      await this.deletePendingTransfer(sagaId);
    }
    
    if (sagaState.fundsReserved) {
      await this.releaseFunds(sagaState.fromAccount, sagaState.amount, sagaId);
    }
    
    // Notify failure
    this.eventBus.publish('transfer:failed', { sagaId, error });
  }
}
```

**2. Event Sourcing for Audit Trail:**
```typescript
interface TransferEvent {
  eventId: string;
  sagaId: string;
  eventType: 'FUNDS_RESERVED' | 'TRANSFER_INITIATED' | 'TRANSFER_COMPLETED' | 'TRANSFER_FAILED';
  timestamp: Date;
  data: any;
  userId: string;
  mfeId: string;
}

class EventStore {
  async appendEvent(event: TransferEvent): Promise<void> {
    // Atomic append to event log
    await this.eventLog.append(event);
    
    // Update read models asynchronously
    await this.updateProjections(event);
    
    // Publish to interested MFEs
    this.eventBus.publish(`transfer:${event.eventType.toLowerCase()}`, event);
  }
  
  async getEventHistory(sagaId: string): Promise<TransferEvent[]> {
    return this.eventLog.getEvents(sagaId);
  }
}
```

**3. Two-Phase Commit for Critical Updates:**
```typescript
class TwoPhaseCommitManager {
  async executeDistributedTransaction(operation: DistributedOperation): Promise<void> {
    const participants = operation.getParticipants(); // [accountMFE, transactionMFE, notificationMFE]
    const transactionId = this.generateTransactionId();
    
    // Phase 1: Prepare
    const prepareResults = await Promise.all(
      participants.map(participant => 
        participant.prepare(operation, transactionId)
      )
    );
    
    // Check if all participants can commit
    const canCommit = prepareResults.every(result => result.canCommit);
    
    if (canCommit) {
      // Phase 2: Commit
      await Promise.all(
        participants.map(participant => 
          participant.commit(transactionId)
        )
      );
    } else {
      // Abort transaction
      await Promise.all(
        participants.map(participant => 
          participant.abort(transactionId)
        )
      );
      
      throw new Error('Transaction aborted - participants could not commit');
    }
  }
}
```

**4. Idempotency & Deduplication:**
```typescript
class IdempotentOperationManager {
  private operationCache = new Map<string, OperationResult>();
  
  async executeIdempotent<T>(
    operationKey: string,
    operation: () => Promise<T>
  ): Promise<T> {
    
    // Check if operation already completed
    if (this.operationCache.has(operationKey)) {
      const cached = this.operationCache.get(operationKey)!;
      if (cached.status === 'completed') {
        return cached.result;
      }
      if (cached.status === 'in_progress') {
        // Wait for in-progress operation
        return cached.promise;
      }
    }
    
    // Execute operation
    const operationPromise = operation();
    this.operationCache.set(operationKey, {
      status: 'in_progress',
      promise: operationPromise,
      startedAt: Date.now()
    });
    
    try {
      const result = await operationPromise;
      
      // Cache successful result
      this.operationCache.set(operationKey, {
        status: 'completed',
        result,
        completedAt: Date.now()
      });
      
      return result;
      
    } catch (error) {
      // Remove failed operation from cache to allow retry
      this.operationCache.delete(operationKey);
      throw error;
    }
  }
}
```

**5. Real-time Consistency Monitoring:**
```typescript
class ConsistencyMonitor {
  private inconsistencyDetected = false;
  
  async validateCrossReference(transferId: string): Promise<boolean> {
    // Get same data from multiple MFEs
    const [accountMFEBalance, transactionMFERecord, auditMFELog] = await Promise.all([
      this.accountMFE.getBalance(transferId),
      this.transactionMFE.getTransferRecord(transferId),
      this.auditMFE.getTransferLog(transferId)
    ]);
    
    // Validate consistency
    const isConsistent = this.validateConsistency(
      accountMFEBalance,
      transactionMFERecord,
      auditMFELog
    );
    
    if (!isConsistent) {
      // Trigger reconciliation process
      await this.initiateReconciliation(transferId);
      
      // Alert operations team
      this.alertInconsistency(transferId, {
        accountMFEBalance,
        transactionMFERecord,
        auditMFELog
      });
    }
    
    return isConsistent;
  }
  
  private async initiateReconciliation(transferId: string): Promise<void> {
    // Freeze related operations
    await this.freezeAccount(transferId);
    
    // Get authoritative state from system of record
    const authoritativeState = await this.getAuthoritativeState(transferId);
    
    // Update all MFEs to match authoritative state
    await this.synchronizeState(transferId, authoritativeState);
    
    // Unfreeze operations
    await this.unfreezeAccount(transferId);
  }
}
```

**Banking Regulatory Compliance:**
- **Immutable Audit Trail**: All state changes recorded with cryptographic signatures
- **Real-time Monitoring**: Consistency violations trigger immediate alerts
- **Regulatory Reporting**: Automated generation of transaction reports from event store
- **Disaster Recovery**: Point-in-time recovery using event sourcing and snapshots
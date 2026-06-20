# Security Specification: Omnichannel Hub Zero-Trust Rules

## 1. Data Invariants
- **User Settings and Stores Configuration**: A user document at `/users/{userId}` can only be created, read, or modified by the authenticated user matching `request.auth.uid`. No user can read or modify another user's configurations.
- **Product Listings**: All products belong to a user and are stored under `/users/{userId}/products/{productId}`. These can only be accessed or modified by the owner (`request.auth.uid == userId`).
- **Input Integrity Constraints**:
  - A product title must be a string between 3 and 250 characters.
  - A product price must be a non-negative number.
  - Timestamp `createdAt` must be set dynamically to `request.time` upon creation and must remain immutable once written.
  - User ID path variable parameters must match the authenticating user UID exactly to prevent ID poisoning / spoofing.

---

## 2. The "Dirty Dozen" Malicious Payloads
Here are 12 malicious payloads meant to attack structure, integrity, or ownership, each of which must return `PERMISSION_DENIED`:

### Payload 1: Unauthorized Profile Intrusion (Identity Spoofing)
- **Path**: `/users/attacker_uid_999`
- **Request Auth**: `{ uid: "malicious_user_222" }`
- **Action**: `write` / `set`
- **Payload**: `{ userId: "attacker_uid_999", email: "victim@example.com", stores: {} }`
- **Vulnerability Guarded**: Attempts to overwrite another user's config document leading to configuration hijacking.

### Payload 2: Ghost Field Injector (Shadow Updates)
- **Path**: `/users/user_123/products/prod_abc`
- **Request Auth**: `{ uid: "user_123" }`
- **Action**: `update`
- **Payload**: `{ title: "New Title", price: 29.99, isVerified: true, fakeSystemAdminRole: true }`
- **Vulnerability Guarded**: Inserts unlisted administrative fields. Blocked by `affectedKeys().hasOnly()` gates.

### Payload 3: PII Broad Scan (PII Blanket read)
- **Path**: `/users/user_456`
- **Request Auth**: `{ uid: "user_789" }`
- **Action**: `get`
- **Vulnerability Guarded**: Reads another user's private details without owner privileges.

### Payload 4: Negative Pricing Poison (Value Poisoning)
- **Path**: `/users/user_123/products/prod_abc`
- **Request Auth**: `{ uid: "user_123" }`
- **Action**: `create`
- **Payload**: `{ id: "prod_abc", title: "Poison Product", price: -150.00, ownerId: "user_123" }`
- **Vulnerability Guarded**: Corrupting accounting charts with negative retail pricing.

### Payload 5: Deny-of-Wallet Long IDs (ID Poisoning / Resource Exhaustion)
- **Path**: `/users/user_123/products/very_long_attacker_string_payload_of_junk_characters_meant_to_bloat_database_storage_indices_1mb`
- **Request Auth**: `{ uid: "user_123" }`
- **Action**: `create`
- **Vulnerability Guarded**: Resource exploitation with massive index parameters. Guarded by `isValidId(productId)`.

### Payload 6: Unauthenticated Creation (Auth Gate Bypassing)
- **Path**: `/users/user_123/products/prod_def`
- **Request Auth**: `null` (Guest)
- **Action**: `create`
- **Vulnerability Guarded**: Creating data without a verified authenticating profile.

### Payload 7: Client Timestamp Bypassing (Temporal Forgery)
- **Path**: `/users/user_123/products/prod_xyz`
- **Request Auth**: `{ uid: "user_123" }`
- **Action**: `create`
- **Payload**: `{ id: "prod_xyz", title: "Valid Title", price: 29.99, createdAt: "2015-01-01T00:00:00Z" }`
- **Vulnerability Guarded**: Backdating or forging creation times. Forced to match `request.time`.

### Payload 8: Immutable Field Overwrite (Creation Hijack)
- **Path**: `/users/user_123/products/prod_abc`
- **Request Auth**: `{ uid: "user_123" }`
- **Action**: `update`
- **Payload**: `{ ownerId: "attacker_user_555" }`
- **Vulnerability Guarded**: Modifying the owner of a listing after initial catalog creation to claim another user's work.

### Payload 9: Empty Listing Spammer (Type Safety Failure)
- **Path**: `/users/user_123/products/prod_empty`
- **Request Auth**: `{ uid: "user_123" }`
- **Action**: `create`
- **Payload**: `{ id: "prod_empty", title: "", price: 0 }`
- **Vulnerability Guarded**: Injecting blank catalog listings that corrupt user dashboards.

### Payload 10: Anonymous Email Forgery (Spoof Attack)
- **Path**: `/users/user_123`
- **Request Auth**: `{ uid: "user_123", token: { email: "fakeadmin@google.com", email_verified: false } }`
- **Action**: `create`
- **Vulnerability Guarded**: Using unverified or anonymous emails to claim admin levels.

### Payload 11: Cross-User Content Hijack (Implicit Owner Shift)
- **Path**: `/users/user_123/products/prod_999`
- **Request Auth**: `{ uid: "user_555" }`
- **Action**: `create`
- **Payload**: `{ id: "prod_999", title: "Hijacked", ownerId: "user_123" }`
- **Vulnerability Guarded**: Attempts by non-owners to write to another user's document subcollection.

### Payload 12: List Scraping Without User Scopes (Query Scraping)
- **Path**: `/users/user_123/products`
- **Request Auth**: `{ uid: "user_888" }`
- **Action**: `list`
- **Vulnerability Guarded**: Sweeping collection ranges of other sellers without permissions check.

---

## 3. Test Verification Plan
Automated tests are simulated to verify that any of the 12 malicious payloads described above are instantly intercepted with a `PERMISSION_DENIED` status. In production, we will structure standard `firestore.rules` covering these gates.

-- Financial Legacy v0.3: PostgreSQL 18 relational contract.
-- Documentation contract, not a claim that migrations/tests have run.
-- Run with a migration-owner account; application login must not own objects or bypass RLS.
-- All sensitive payload columns ending _ciphertext contain authenticated application encryption.
BEGIN;
CREATE SCHEMA IF NOT EXISTS fl;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='fl_app') THEN CREATE ROLE fl_app NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='fl_dispatch') THEN CREATE ROLE fl_dispatch NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='fl_control') THEN CREATE ROLE fl_control NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='fl_purge') THEN CREATE ROLE fl_purge NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$;
CREATE FUNCTION fl.actor_id() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('fl.actor_id',true),'')::uuid $$;
CREATE FUNCTION fl.case_id() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('fl.case_id',true),'')::uuid $$;
CREATE FUNCTION fl.touch_updated() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=clock_timestamp(); NEW.version=OLD.version+1; RETURN NEW; END $$;

CREATE TABLE fl.users (
  id uuid PRIMARY KEY,
  oidc_issuer text NOT NULL,
  oidc_subject text NOT NULL,
  display_name text NOT NULL,
  locale text NOT NULL DEFAULT 'en-IN',
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','DELETED')),
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (oidc_issuer,oidc_subject),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.institutions (
  id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  synthetic boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.source_capabilities (
  id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  subject_types jsonb NOT NULL,
  methods jsonb NOT NULL,
  allowed_scopes jsonb NOT NULL,
  state text NOT NULL DEFAULT 'DISABLED' CHECK (state IN ('DISABLED','VALIDATING','SANDBOX','ENABLED','SUSPENDED')),
  synthetic boolean NOT NULL DEFAULT true,
  validation_reference text,
  reviewer_id uuid REFERENCES fl.users(id),
  reviewed_at timestamptz,
  next_review_at timestamptz,
  policy_version text NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.workflow_versions (
  id uuid PRIMARY KEY,
  institution_id uuid NOT NULL REFERENCES fl.institutions(id),
  category text NOT NULL,
  version_number integer NOT NULL CHECK (version_number>0),
  subject_types jsonb NOT NULL,
  requirements jsonb NOT NULL,
  source_reference text NOT NULL,
  source_reviewed_at timestamptz NOT NULL,
  reviewer_id uuid REFERENCES fl.users(id),
  content_hash char(64) NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  synthetic boolean NOT NULL DEFAULT true,
  UNIQUE(institution_id,category,version_number),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.cases (
  id uuid PRIMARY KEY,
  owner_user_id uuid NOT NULL REFERENCES fl.users(id),
  subject_id uuid NOT NULL,
  mode text NOT NULL CHECK (mode IN ('self_discovery','legacy','deceased_claim')),
  state text NOT NULL DEFAULT 'DRAFT' CHECK (state IN ('DRAFT','ACTIVE','WAITING_ON_USER','WAITING_ON_INSTITUTION','NEEDS_REVIEW','READY_TO_CLOSE','CLOSED')),
  title text NOT NULL,
  policy_version text NOT NULL,
  synthetic boolean NOT NULL DEFAULT true,
  closed_at timestamptz,
  deletion_requested_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.subjects (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  living_status text NOT NULL CHECK (living_status IN ('LIVING','DECEASED','UNKNOWN')),
  profile_ciphertext bytea NOT NULL,
  identifier_hmac bytea,
  declared_relationship text,
  UNIQUE(case_id),
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.case_members (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  user_id uuid NOT NULL REFERENCES fl.users(id),
  role text NOT NULL CHECK(role IN ('OWNER','CLAIMANT','OPERATOR','COLLABORATOR','RECIPIENT')),
  scope jsonb NOT NULL,
  state text NOT NULL DEFAULT 'ACTIVE' CHECK(state IN ('PENDING','ACTIVE','REVOKED','EXPIRED')),
  expires_at timestamptz,
  reason text,
  UNIQUE(case_id,user_id,role),
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.verifications (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  user_id uuid NOT NULL REFERENCES fl.users(id),
  check_type text NOT NULL CHECK(check_type IN ('IDENTITY','RELATIONSHIP')),
  method text NOT NULL,
  state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','VERIFIED','REJECTED','EXPIRED','REVOKED')),
  evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  reviewer_id uuid REFERENCES fl.users(id),
  rationale text,
  checked_at timestamptz,
  expires_at timestamptz,
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.authorities (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  claimant_id uuid NOT NULL REFERENCES fl.users(id),
  subject_scope jsonb NOT NULL,
  institution_scope jsonb NOT NULL,
  action_scope jsonb NOT NULL,
  evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  method text NOT NULL,
  state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','VERIFIED','REJECTED','EXPIRED','REVOKED')),
  reviewer_id uuid REFERENCES fl.users(id),
  rationale text,
  expires_at timestamptz,
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.consents (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  grantor_id uuid NOT NULL REFERENCES fl.users(id),
  purpose text NOT NULL,
  data_scope jsonb NOT NULL,
  recipient_scope jsonb NOT NULL,
  subject_scope jsonb NOT NULL,
  policy_version text NOT NULL,
  state text NOT NULL DEFAULT 'ACTIVE' CHECK(state IN ('ACTIVE','REVOKED','EXPIRED')),
  granted_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK(expires_at>granted_at),
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.holds (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  scope_type text NOT NULL CHECK(scope_type IN ('CASE','SUBJECT','ASSET','CLAIM','ACTION')),
  scope_id uuid NOT NULL,
  blocked_actions jsonb NOT NULL,
  reason_code text NOT NULL,
  state text NOT NULL DEFAULT 'ACTIVE' CHECK(state IN ('ACTIVE','RESOLVED')),
  reviewer_id uuid REFERENCES fl.users(id),
  rationale text,
  resolution_evidence_id uuid,
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.documents (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  uploader_id uuid NOT NULL REFERENCES fl.users(id),
  fixture_id text,
  storage_reference text NOT NULL,
  original_name text NOT NULL,
  sha256 char(64),
  media_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK(size_bytes>=0 AND size_bytes<=20971520),
  scan_state text NOT NULL DEFAULT 'QUARANTINED' CHECK(scan_state IN ('QUARANTINED','SCANNING','CLEAN','BLOCKED','FAILED')),
  processing_state text NOT NULL DEFAULT 'UPLOAD_PENDING' CHECK(processing_state IN ('UPLOAD_PENDING','READY','EXTRACTING','REVIEW_REQUIRED','REVIEWED','PROCESSING_FAILED','DELETE_PENDING','DELETED')),
  retention_class text NOT NULL,
  deleted_at timestamptz,
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.evidence (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  source_type text NOT NULL CHECK(source_type IN ('DECLARATION','DOCUMENT','INSTITUTION','SYNTHETIC_INSTITUTION','EXTERNAL_RECEIPT')),
  document_id uuid,
  source_reference text,
  locator jsonb NOT NULL,
  observed_at timestamptz,
  received_at timestamptz NOT NULL,
  authority_id uuid,
  review_state text NOT NULL DEFAULT 'PROPOSED' CHECK(review_state IN ('PROPOSED','ACCEPTED','REJECTED','DISPUTED')),
  metadata_ciphertext bytea,
  CHECK(document_id IS NOT NULL OR source_reference IS NOT NULL),
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.field_proposals (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  evidence_id uuid NOT NULL,
  field_path text NOT NULL,
  value_ciphertext bytea NOT NULL,
  confidence numeric(5,4) CHECK(confidence>=0 AND confidence<=1),
  extractor_version text NOT NULL,
  state text NOT NULL DEFAULT 'PROPOSED' CHECK(state IN ('PROPOSED','ACCEPTED','CORRECTED','REJECTED')),
  reviewer_id uuid REFERENCES fl.users(id),
  correction_reason text,
  supersedes_id uuid,
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.assets (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  subject_id uuid NOT NULL,
  institution_id uuid REFERENCES fl.institutions(id),
  category text NOT NULL CHECK(category IN ('BANK','FD','MUTUAL_FUND','SHARES_DEMAT','UNCLAIMED_DIVIDEND_SHARES','LIFE_INSURANCE','EPF','NPS','PPF_SMALL_SAVINGS','LOCKER')),
  reference_ciphertext bytea,
  reference_hmac bytea,
  category_schema_version integer NOT NULL DEFAULT 1,
  attributes_ciphertext bytea NOT NULL,
  evidence_state text NOT NULL CHECK(evidence_state IN ('SELF_DECLARED','POTENTIAL_MATCH','DOCUMENT_BACKED','INSTITUTION_VERIFIED')),
  lifecycle_state text NOT NULL DEFAULT 'UNKNOWN' CHECK(lifecycle_state IN ('UNKNOWN','OPEN','CLOSED','TRANSMITTED','DISPUTED')),
  canonical_asset_id uuid,
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.asset_evidence (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  asset_id uuid NOT NULL,
  evidence_id uuid NOT NULL,
  relationship_type text NOT NULL,
  UNIQUE(case_id,asset_id,evidence_id),
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.observations (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  asset_id uuid NOT NULL,
  evidence_id uuid NOT NULL,
  amount numeric(18,2),
  currency char(3),
  amount_type text NOT NULL CHECK(amount_type IN ('CASH_BALANCE','CURRENT_VALUE','PRINCIPAL','MATURITY_VALUE','POLICY_BENEFIT','SETTLED_AMOUNT','HISTORICAL_AMOUNT','UNITS','UNKNOWN')),
  units numeric(24,8),
  as_of_date date,
  review_state text NOT NULL CHECK(review_state IN ('PROPOSED','ACCEPTED','REJECTED','DISPUTED')),
  supersedes_id uuid,
  CHECK((amount IS NULL AND currency IS NULL) OR (amount IS NOT NULL AND currency IS NOT NULL)),
  CHECK(amount IS NULL OR units IS NULL),
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.nominations (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  asset_id uuid NOT NULL,
  state text NOT NULL CHECK(state IN ('UNKNOWN','DECLARED','DOCUMENTED')),
  details_ciphertext bytea,
  evidence_id uuid,
  reviewed_at timestamptz,
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.reconciliations (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  asset_ids jsonb NOT NULL,
  canonical_asset_id uuid,
  resolution text NOT NULL CHECK(resolution IN ('KEEP_SEPARATE','MERGE','DISPUTED','REVERSE')),
  evidence_ids jsonb NOT NULL,
  reviewer_id uuid NOT NULL REFERENCES fl.users(id),
  reason text NOT NULL,
  reversal_of uuid,
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.discovery_attempts (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  source_id uuid NOT NULL REFERENCES fl.source_capabilities(id),
  plan_scope jsonb NOT NULL,
  method text NOT NULL CHECK(method IN ('MANUAL','SYNTHETIC','CONNECTOR')),
  state text NOT NULL CHECK(state IN ('PLANNED','BLOCKED','READY','RUNNING','RESULTS','NO_RESULTS','PARTIAL','FAILED')),
  consent_id uuid,
  authority_id uuid,
  coverage jsonb NOT NULL,
  result_evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_code text,
  started_at timestamptz,
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.claims (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  asset_id uuid NOT NULL,
  institution_id uuid NOT NULL REFERENCES fl.institutions(id),
  workflow_version_id uuid NOT NULL REFERENCES fl.workflow_versions(id),
  authority_id uuid,
  state text NOT NULL DEFAULT 'DRAFT' CHECK(state IN ('DRAFT','AUTHORITY_REVIEW','DOCUMENT_COLLECTION','PACK_REVIEW','READY_FOR_SUBMISSION','SUBMISSION_PENDING','SUBMISSION_UNKNOWN','SUBMITTED','INSTITUTION_REVIEW','MORE_INFORMATION_REQUIRED','PARTIALLY_SETTLED','SETTLED','TRANSFERRED','REJECTED','UNRESOLVED_DISPUTE','CANCELLED')),
  external_reference_ciphertext bytea,
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.claim_requirements (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  claim_id uuid NOT NULL,
  requirement_key text NOT NULL,
  is_required boolean NOT NULL,
  state text NOT NULL DEFAULT 'MISSING' CHECK(state IN ('MISSING','PROPOSED','ACCEPTED','REJECTED','NEEDS_UPDATE')),
  evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  institution_response_ciphertext bytea,
  UNIQUE(case_id,claim_id,requirement_key),
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.claim_packs (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  claim_id uuid NOT NULL,
  pack_version integer NOT NULL CHECK(pack_version>0),
  manifest_ciphertext bytea NOT NULL,
  content_hash char(64) NOT NULL,
  storage_reference text NOT NULL,
  state text NOT NULL CHECK(state IN ('READY','SUPERSEDED','INVALIDATED')),
  UNIQUE(case_id,claim_id,pack_version),
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.approvals (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  actor_id uuid NOT NULL REFERENCES fl.users(id),
  action_type text NOT NULL CHECK(action_type IN ('CLAIM_HANDOFF','CLAIM_SUBMISSION','EXPORT','LIFETIME_SHARE','LEGACY_RELEASE')),
  recipient_id text NOT NULL,
  channel text NOT NULL,
  purpose text NOT NULL,
  pack_id uuid,
  snapshot_version integer,
  payload_hash char(64) NOT NULL,
  authority_id uuid,
  consent_id uuid,
  policy_version text NOT NULL,
  state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','APPROVED','CONSUMED','REJECTED','EXPIRED','INVALIDATED')),
  expires_at timestamptz NOT NULL,
  decided_at timestamptz,
  decision_reason text,
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.external_actions (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  claim_id uuid,
  approval_id uuid NOT NULL,
  connector_id uuid REFERENCES fl.source_capabilities(id),
  action_type text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash char(64) NOT NULL,
  state text NOT NULL CHECK(state IN ('CREATED','POLICY_CHECKED','QUEUED','EXECUTING','SUCCEEDED','FAILED_RETRYABLE','FAILED_FINAL','OUTCOME_UNKNOWN')),
  receipt_evidence_id uuid,
  attempt_count integer NOT NULL DEFAULT 0 CHECK(attempt_count>=0),
  sent_at timestamptz,
  UNIQUE(case_id,idempotency_key),
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.claim_outcomes (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  claim_id uuid NOT NULL,
  outcome_type text NOT NULL CHECK(outcome_type IN ('SETTLED','TRANSFERRED','PARTIALLY_SETTLED','REJECTED','UNRESOLVED_DISPUTE','CANCELLED')),
  amount numeric(18,2) CHECK(amount>=0),
  currency char(3),
  remaining_amount numeric(18,2) CHECK(remaining_amount>=0),
  remaining_known boolean NOT NULL DEFAULT false,
  effective_date date NOT NULL,
  evidence_id uuid NOT NULL,
  reviewer_id uuid REFERENCES fl.users(id),
  supersedes_id uuid,
  CHECK(remaining_known OR remaining_amount IS NULL),
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.tasks (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  related_type text NOT NULL,
  related_id uuid,
  task_type text NOT NULL,
  title text NOT NULL,
  assignee_id uuid REFERENCES fl.users(id),
  due_at timestamptz,
  due_source text NOT NULL CHECK(due_source IN ('SUGGESTED','INSTITUTION','USER')),
  state text NOT NULL DEFAULT 'OPEN' CHECK(state IN ('OPEN','IN_PROGRESS','BLOCKED','DONE','CANCELLED')),
  blocked_reason text,
  completion_evidence_id uuid,
  reminder_last_at timestamptz,
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.legacy_plans (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  snapshot_version integer NOT NULL DEFAULT 1 CHECK(snapshot_version>0),
  checklist jsonb NOT NULL,
  reviewed_at timestamptz,
  next_review_at timestamptz,
  UNIQUE(case_id),
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.trusted_contacts (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  contact_ciphertext bytea NOT NULL,
  relationship text NOT NULL,
  intended_scope jsonb NOT NULL,
  intended_trigger text NOT NULL,
  verification_state text NOT NULL DEFAULT 'UNVERIFIED' CHECK(verification_state IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  state text NOT NULL DEFAULT 'ACTIVE' CHECK(state IN ('ACTIVE','REMOVED')),
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.share_grants (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  recipient_id uuid NOT NULL REFERENCES fl.users(id),
  scope jsonb NOT NULL,
  approval_id uuid NOT NULL,
  verified_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.release_requests (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  contact_id uuid NOT NULL,
  evidence_ids jsonb NOT NULL,
  state text NOT NULL CHECK(state IN ('REQUESTED','EVIDENCE_REVIEW','RECIPIENT_VERIFICATION','AUTHORITY_REVIEW','READY','APPROVED','RELEASED','ON_HOLD','REJECTED','WITHDRAWN','EXPIRED')),
  reviewer_id uuid REFERENCES fl.users(id),
  approval_id uuid,
  released_at timestamptz,
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.exports (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  requestor_id uuid NOT NULL REFERENCES fl.users(id),
  scope jsonb NOT NULL,
  pack_id uuid,
  snapshot_version integer,
  approval_id uuid,
  storage_reference text,
  state text NOT NULL CHECK(state IN ('QUEUED','RUNNING','READY','FAILED','EXPIRED','DELETED')),
  expires_at timestamptz NOT NULL,
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.messages (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  actor_id uuid REFERENCES fl.users(id),
  actor_type text NOT NULL CHECK(actor_type IN ('USER','ASSISTANT','OPERATOR','SYSTEM')),
  content_ciphertext bytea NOT NULL,
  evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_message_id text,
  provider_version text,
  UNIQUE(case_id,actor_id,client_message_id),
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.voice_sessions (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  user_id uuid NOT NULL REFERENCES fl.users(id),
  language text NOT NULL,
  policy_version text NOT NULL,
  state text NOT NULL CHECK(state IN ('REQUESTED','RECORDING','STOPPED','PROCESSING','REVIEW_REQUIRED','FAILED','DELETED')),
  transcript_reference text,
  retention_class text NOT NULL,
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.support_cases (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  support_type text NOT NULL CHECK(support_type IN ('HELP','COMPLAINT','LEGAL','FRAUD')),
  owner_id uuid REFERENCES fl.users(id),
  state text NOT NULL CHECK(state IN ('OPEN','ASSIGNED','WAITING','RESOLVED','CLOSED')),
  reason_code text NOT NULL,
  details_ciphertext bytea NOT NULL,
  resolution_reference text,
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.retention_requests (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  requestor_id uuid NOT NULL REFERENCES fl.users(id),
  request_type text NOT NULL CHECK(request_type IN ('EXPORT','DELETE')),
  scope jsonb NOT NULL,
  state text NOT NULL CHECK(state IN ('REQUESTED','ACCESS_REVOKED','PURGING','ON_HOLD','WAITING_PROCESSOR','WAITING_BACKUP_EXPIRY','COMPLETED','FAILED')),
  purge_manifest_ciphertext bytea,
  hold_reference text,
  processor_receipts jsonb NOT NULL DEFAULT '[]'::jsonb,
  backup_expiry timestamptz,
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.audit_events (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  actor_id uuid REFERENCES fl.users(id),
  action text NOT NULL,
  object_type text NOT NULL,
  object_id uuid,
  reason_code text,
  request_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.outbox_events (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  actor_id uuid NOT NULL REFERENCES fl.users(id),
  event_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  aggregate_version integer NOT NULL,
  payload_reference text NOT NULL,
  state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','DISPATCHED','CANCELLED')),
  UNIQUE(case_id,event_type,aggregate_id,aggregate_version),
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.jobs (
  id uuid PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES fl.cases(id) DEFERRABLE INITIALLY DEFERRED,
  actor_id uuid NOT NULL REFERENCES fl.users(id),
  job_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  expected_version integer,
  policy_epoch integer NOT NULL,
  payload_reference text NOT NULL,
  state text NOT NULL DEFAULT 'QUEUED' CHECK(state IN ('QUEUED','RUNNING','SUCCEEDED','FAILED','CANCELLED','OUTCOME_UNKNOWN','DEAD_LETTER')),
  attempt_count integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_owner text,
  lease_expires_at timestamptz,
  error_code text,
  result_reference text,
  UNIQUE(id,case_id),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fl.idempotency_records (
  id uuid PRIMARY KEY,
  actor_id uuid NOT NULL REFERENCES fl.users(id),
  case_id uuid REFERENCES fl.cases(id),
  operation text NOT NULL,
  key text NOT NULL CHECK(length(key) BETWEEN 16 AND 128),
  request_hash char(64) NOT NULL,
  state text NOT NULL CHECK(state IN ('RUNNING','SUCCEEDED','FAILED')),
  result_reference text,
  expires_at timestamptz NOT NULL,
  UNIQUE NULLS NOT DISTINCT(actor_id,case_id,operation,key),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fl.cases ADD FOREIGN KEY(subject_id,id) REFERENCES fl.subjects(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.evidence ADD FOREIGN KEY (document_id,case_id) REFERENCES fl.documents(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.evidence ADD FOREIGN KEY (authority_id,case_id) REFERENCES fl.authorities(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.field_proposals ADD FOREIGN KEY (evidence_id,case_id) REFERENCES fl.evidence(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.field_proposals ADD FOREIGN KEY (supersedes_id,case_id) REFERENCES fl.field_proposals(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.assets ADD FOREIGN KEY (subject_id,case_id) REFERENCES fl.subjects(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.assets ADD FOREIGN KEY (canonical_asset_id,case_id) REFERENCES fl.assets(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.asset_evidence ADD FOREIGN KEY (asset_id,case_id) REFERENCES fl.assets(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.asset_evidence ADD FOREIGN KEY (evidence_id,case_id) REFERENCES fl.evidence(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.observations ADD FOREIGN KEY (asset_id,case_id) REFERENCES fl.assets(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.observations ADD FOREIGN KEY (evidence_id,case_id) REFERENCES fl.evidence(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.observations ADD FOREIGN KEY (supersedes_id,case_id) REFERENCES fl.observations(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.nominations ADD FOREIGN KEY (asset_id,case_id) REFERENCES fl.assets(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.nominations ADD FOREIGN KEY (evidence_id,case_id) REFERENCES fl.evidence(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.claims ADD FOREIGN KEY (asset_id,case_id) REFERENCES fl.assets(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.claims ADD FOREIGN KEY (authority_id,case_id) REFERENCES fl.authorities(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.claim_requirements ADD FOREIGN KEY (claim_id,case_id) REFERENCES fl.claims(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.claim_packs ADD FOREIGN KEY (claim_id,case_id) REFERENCES fl.claims(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.approvals ADD FOREIGN KEY (pack_id,case_id) REFERENCES fl.claim_packs(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.approvals ADD FOREIGN KEY (authority_id,case_id) REFERENCES fl.authorities(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.approvals ADD FOREIGN KEY (consent_id,case_id) REFERENCES fl.consents(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.external_actions ADD FOREIGN KEY (claim_id,case_id) REFERENCES fl.claims(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.external_actions ADD FOREIGN KEY (approval_id,case_id) REFERENCES fl.approvals(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.external_actions ADD FOREIGN KEY (receipt_evidence_id,case_id) REFERENCES fl.evidence(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.claim_outcomes ADD FOREIGN KEY (claim_id,case_id) REFERENCES fl.claims(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.claim_outcomes ADD FOREIGN KEY (evidence_id,case_id) REFERENCES fl.evidence(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.claim_outcomes ADD FOREIGN KEY (supersedes_id,case_id) REFERENCES fl.claim_outcomes(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.share_grants ADD FOREIGN KEY (approval_id,case_id) REFERENCES fl.approvals(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.release_requests ADD FOREIGN KEY (contact_id,case_id) REFERENCES fl.trusted_contacts(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.release_requests ADD FOREIGN KEY (approval_id,case_id) REFERENCES fl.approvals(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.exports ADD FOREIGN KEY (pack_id,case_id) REFERENCES fl.claim_packs(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.exports ADD FOREIGN KEY (approval_id,case_id) REFERENCES fl.approvals(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.tasks ADD FOREIGN KEY (completion_evidence_id,case_id) REFERENCES fl.evidence(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.discovery_attempts ADD FOREIGN KEY (consent_id,case_id) REFERENCES fl.consents(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.discovery_attempts ADD FOREIGN KEY (authority_id,case_id) REFERENCES fl.authorities(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.holds ADD FOREIGN KEY (resolution_evidence_id,case_id) REFERENCES fl.evidence(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.reconciliations ADD FOREIGN KEY (canonical_asset_id,case_id) REFERENCES fl.assets(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.reconciliations ADD FOREIGN KEY (reversal_of,case_id) REFERENCES fl.reconciliations(id,case_id) DEFERRABLE INITIALLY DEFERRED;

-- Array reference fields are application-validated for same-case existence before commit.
-- Scope selectors/related IDs must pass domain authorization; they are not unrestricted object access.
CREATE INDEX observations_lookup ON fl.observations(case_id,asset_id,as_of_date DESC,id);
CREATE INDEX task_queue ON fl.tasks(assignee_id,state,due_at);
CREATE INDEX job_lease ON fl.jobs(state,available_at,lease_expires_at);
CREATE INDEX outbox_dispatch ON fl.outbox_events(state,created_at);
CREATE INDEX claim_lookup ON fl.claims(case_id,state,updated_at);
CREATE INDEX asset_reference ON fl.assets(case_id,reference_hmac);
CREATE INDEX evidence_lookup ON fl.evidence(case_id,document_id);
CREATE INDEX member_lookup ON fl.case_members(user_id,state,expires_at);
CREATE INDEX audit_timeline ON fl.audit_events(case_id,created_at DESC,id);
CREATE INDEX idempotency_expiry ON fl.idempotency_records(expires_at);
CREATE TRIGGER touch_users BEFORE UPDATE ON fl.users FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
CREATE TRIGGER touch_institutions BEFORE UPDATE ON fl.institutions FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
CREATE TRIGGER touch_source_capabilities BEFORE UPDATE ON fl.source_capabilities FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
CREATE TRIGGER touch_workflow_versions BEFORE UPDATE ON fl.workflow_versions FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
CREATE TRIGGER touch_cases BEFORE UPDATE ON fl.cases FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
CREATE TRIGGER touch_subjects BEFORE UPDATE ON fl.subjects FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_subjects ON fl.subjects TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_case_members BEFORE UPDATE ON fl.case_members FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
CREATE TRIGGER touch_verifications BEFORE UPDATE ON fl.verifications FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_verifications ON fl.verifications TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_authorities BEFORE UPDATE ON fl.authorities FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.authorities ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_authorities ON fl.authorities TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_consents BEFORE UPDATE ON fl.consents FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_consents ON fl.consents TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_holds BEFORE UPDATE ON fl.holds FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_holds ON fl.holds TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_documents BEFORE UPDATE ON fl.documents FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_documents ON fl.documents TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_evidence BEFORE UPDATE ON fl.evidence FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_evidence ON fl.evidence TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_field_proposals BEFORE UPDATE ON fl.field_proposals FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.field_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_field_proposals ON fl.field_proposals TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_assets BEFORE UPDATE ON fl.assets FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_assets ON fl.assets TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_asset_evidence BEFORE UPDATE ON fl.asset_evidence FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.asset_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_asset_evidence ON fl.asset_evidence TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
ALTER TABLE fl.observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_observations ON fl.observations TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_nominations BEFORE UPDATE ON fl.nominations FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.nominations ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_nominations ON fl.nominations TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_reconciliations BEFORE UPDATE ON fl.reconciliations FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.reconciliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_reconciliations ON fl.reconciliations TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_discovery_attempts BEFORE UPDATE ON fl.discovery_attempts FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.discovery_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_discovery_attempts ON fl.discovery_attempts TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_claims BEFORE UPDATE ON fl.claims FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_claims ON fl.claims TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_claim_requirements BEFORE UPDATE ON fl.claim_requirements FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.claim_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_claim_requirements ON fl.claim_requirements TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_claim_packs BEFORE UPDATE ON fl.claim_packs FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.claim_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_claim_packs ON fl.claim_packs TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_approvals BEFORE UPDATE ON fl.approvals FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_approvals ON fl.approvals TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_external_actions BEFORE UPDATE ON fl.external_actions FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.external_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_external_actions ON fl.external_actions TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
ALTER TABLE fl.claim_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_claim_outcomes ON fl.claim_outcomes TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_tasks BEFORE UPDATE ON fl.tasks FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_tasks ON fl.tasks TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_legacy_plans BEFORE UPDATE ON fl.legacy_plans FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.legacy_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_legacy_plans ON fl.legacy_plans TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_trusted_contacts BEFORE UPDATE ON fl.trusted_contacts FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.trusted_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_trusted_contacts ON fl.trusted_contacts TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_share_grants BEFORE UPDATE ON fl.share_grants FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.share_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_share_grants ON fl.share_grants TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_release_requests BEFORE UPDATE ON fl.release_requests FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.release_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_release_requests ON fl.release_requests TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_exports BEFORE UPDATE ON fl.exports FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_exports ON fl.exports TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_messages BEFORE UPDATE ON fl.messages FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_messages ON fl.messages TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_voice_sessions BEFORE UPDATE ON fl.voice_sessions FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.voice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_voice_sessions ON fl.voice_sessions TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_support_cases BEFORE UPDATE ON fl.support_cases FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.support_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_support_cases ON fl.support_cases TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_retention_requests BEFORE UPDATE ON fl.retention_requests FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
ALTER TABLE fl.retention_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_retention_requests ON fl.retention_requests TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
ALTER TABLE fl.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_audit_events ON fl.audit_events TO fl_app USING (case_id=fl.case_id()) WITH CHECK (case_id=fl.case_id());
CREATE TRIGGER touch_outbox_events BEFORE UPDATE ON fl.outbox_events FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
CREATE TRIGGER touch_jobs BEFORE UPDATE ON fl.jobs FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
CREATE TRIGGER touch_idempotency_records BEFORE UPDATE ON fl.idempotency_records FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();

ALTER TABLE fl.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY self_user ON fl.users TO fl_app USING(id=fl.actor_id()) WITH CHECK(id=fl.actor_id());
ALTER TABLE fl.case_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_members ON fl.case_members TO fl_app USING(user_id=fl.actor_id() OR case_id=fl.case_id()) WITH CHECK(case_id=fl.case_id());
ALTER TABLE fl.cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_cases ON fl.cases FOR SELECT TO fl_app USING(owner_user_id=fl.actor_id() OR EXISTS(SELECT 1 FROM fl.case_members m WHERE m.case_id=cases.id AND m.user_id=fl.actor_id() AND m.state='ACTIVE' AND (m.expires_at IS NULL OR m.expires_at>now())));
CREATE POLICY create_cases ON fl.cases FOR INSERT TO fl_app WITH CHECK(owner_user_id=fl.actor_id());
CREATE POLICY update_cases ON fl.cases FOR UPDATE TO fl_app USING(id=fl.case_id()) WITH CHECK(id=fl.case_id());
ALTER TABLE fl.idempotency_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY self_idempotency ON fl.idempotency_records TO fl_app USING(actor_id=fl.actor_id()) WITH CHECK(actor_id=fl.actor_id());
ALTER TABLE fl.outbox_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_outbox_events ON fl.outbox_events TO fl_app USING(case_id=fl.case_id()) WITH CHECK(case_id=fl.case_id());
CREATE POLICY dispatch_outbox_events ON fl.outbox_events TO fl_dispatch USING(true) WITH CHECK(true);
ALTER TABLE fl.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_jobs ON fl.jobs TO fl_app USING(case_id=fl.case_id()) WITH CHECK(case_id=fl.case_id());
CREATE POLICY dispatch_jobs ON fl.jobs TO fl_dispatch USING(true) WITH CHECK(true);


CREATE TABLE fl.configuration_audit (id uuid PRIMARY KEY, actor_id uuid REFERENCES fl.users(id), action text NOT NULL, object_type text NOT NULL, object_id uuid, request_id uuid NOT NULL, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE fl.discovery_plans (id uuid PRIMARY KEY, case_id uuid NOT NULL REFERENCES fl.cases(id), state text NOT NULL CHECK(state IN ('DRAFT','REVIEWED','SUPERSEDED')), items jsonb NOT NULL, version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,case_id));
CREATE TABLE fl.legacy_snapshots (id uuid PRIMARY KEY, case_id uuid NOT NULL REFERENCES fl.cases(id), snapshot_version integer NOT NULL, content_ciphertext bytea NOT NULL, content_hash char(64) NOT NULL, created_by uuid NOT NULL REFERENCES fl.users(id), version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,case_id), UNIQUE(case_id,snapshot_version));
CREATE TABLE fl.access_capabilities (id uuid PRIMARY KEY, case_id uuid NOT NULL REFERENCES fl.cases(id), actor_id uuid NOT NULL REFERENCES fl.users(id), object_type text NOT NULL CHECK(object_type IN ('DOCUMENT','EXPORT','PACK')), object_id uuid NOT NULL, object_version integer NOT NULL, token_hash bytea NOT NULL, purpose text NOT NULL, expires_at timestamptz NOT NULL, consumed_at timestamptz, version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,case_id));
ALTER TABLE fl.discovery_attempts ADD COLUMN plan_id uuid;
ALTER TABLE fl.discovery_attempts ADD FOREIGN KEY(plan_id,case_id) REFERENCES fl.discovery_plans(id,case_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE fl.documents ADD COLUMN upload_expires_at timestamptz;
ALTER TABLE fl.documents ADD COLUMN upload_nonce_hash bytea;
CREATE INDEX capabilities_expiry ON fl.access_capabilities(expires_at);
ALTER TABLE fl.discovery_plans ENABLE ROW LEVEL SECURITY; CREATE POLICY scoped_discovery_plans ON fl.discovery_plans TO fl_app USING(case_id=fl.case_id()) WITH CHECK(case_id=fl.case_id());
ALTER TABLE fl.legacy_snapshots ENABLE ROW LEVEL SECURITY; CREATE POLICY scoped_legacy_snapshots ON fl.legacy_snapshots TO fl_app USING(case_id=fl.case_id()) WITH CHECK(case_id=fl.case_id());
ALTER TABLE fl.access_capabilities ENABLE ROW LEVEL SECURITY; CREATE POLICY scoped_access_capabilities ON fl.access_capabilities TO fl_app USING(case_id=fl.case_id()) WITH CHECK(case_id=fl.case_id());
CREATE TRIGGER touch_discovery_plans BEFORE UPDATE ON fl.discovery_plans FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();
CREATE TRIGGER touch_access_capabilities BEFORE UPDATE ON fl.access_capabilities FOR EACH ROW EXECUTE FUNCTION fl.touch_updated();

CREATE FUNCTION fl.resolve_actor(p_issuer text,p_subject text) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,fl AS $$ SELECT u.id FROM fl.users u WHERE u.oidc_issuer=p_issuer AND u.oidc_subject=p_subject AND u.status='ACTIVE' $$;
ALTER TABLE fl.case_members ADD COLUMN display_label text NOT NULL DEFAULT 'Case member';
GRANT USAGE ON SCHEMA fl TO fl_app,fl_dispatch,fl_control,fl_purge;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA fl TO fl_app;
REVOKE INSERT,UPDATE,DELETE ON fl.institutions,fl.source_capabilities,fl.workflow_versions FROM fl_app;
REVOKE UPDATE,DELETE ON fl.audit_events,fl.observations,fl.claim_outcomes FROM fl_app;
GRANT SELECT,UPDATE ON fl.outbox_events,fl.jobs TO fl_dispatch;
GRANT SELECT,INSERT,UPDATE ON fl.institutions,fl.source_capabilities,fl.workflow_versions TO fl_control;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA fl FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fl.actor_id(),fl.case_id(),fl.touch_updated() TO fl_app,fl_dispatch,fl_control;

GRANT USAGE ON SCHEMA fl TO fl_purge;
GRANT EXECUTE ON FUNCTION fl.actor_id(),fl.case_id() TO fl_purge;
GRANT SELECT,DELETE ON ALL TABLES IN SCHEMA fl TO fl_purge;
REVOKE DELETE ON fl.users,fl.institutions,fl.source_capabilities,fl.workflow_versions,fl.configuration_audit FROM fl_purge;
GRANT UPDATE ON fl.users TO fl_purge;
CREATE POLICY purge_users ON fl.users TO fl_purge USING(id=fl.actor_id()) WITH CHECK(id=fl.actor_id());
CREATE POLICY purge_cases ON fl.cases TO fl_purge USING(id=fl.case_id());
CREATE POLICY purge_idempotency ON fl.idempotency_records TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_subjects ON fl.subjects TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_case_members ON fl.case_members TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_verifications ON fl.verifications TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_authorities ON fl.authorities TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_consents ON fl.consents TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_holds ON fl.holds TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_documents ON fl.documents TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_evidence ON fl.evidence TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_field_proposals ON fl.field_proposals TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_assets ON fl.assets TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_asset_evidence ON fl.asset_evidence TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_observations ON fl.observations TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_nominations ON fl.nominations TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_reconciliations ON fl.reconciliations TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_discovery_attempts ON fl.discovery_attempts TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_claims ON fl.claims TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_claim_requirements ON fl.claim_requirements TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_claim_packs ON fl.claim_packs TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_approvals ON fl.approvals TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_external_actions ON fl.external_actions TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_claim_outcomes ON fl.claim_outcomes TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_tasks ON fl.tasks TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_legacy_plans ON fl.legacy_plans TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_trusted_contacts ON fl.trusted_contacts TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_share_grants ON fl.share_grants TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_release_requests ON fl.release_requests TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_exports ON fl.exports TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_messages ON fl.messages TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_voice_sessions ON fl.voice_sessions TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_support_cases ON fl.support_cases TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_retention_requests ON fl.retention_requests TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_audit_events ON fl.audit_events TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_outbox_events ON fl.outbox_events TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_jobs ON fl.jobs TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_discovery_plans ON fl.discovery_plans TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_legacy_snapshots ON fl.legacy_snapshots TO fl_purge USING(case_id=fl.case_id());
CREATE POLICY purge_access_capabilities ON fl.access_capabilities TO fl_purge USING(case_id=fl.case_id());
GRANT SELECT,INSERT ON fl.configuration_audit TO fl_control,fl_purge;
REVOKE UPDATE,DELETE ON fl.configuration_audit,fl.legacy_snapshots FROM fl_app;
REVOKE ALL ON fl.configuration_audit FROM fl_app;
GRANT EXECUTE ON FUNCTION fl.resolve_actor(text,text) TO fl_app;

ALTER TABLE fl.workflow_versions ADD UNIQUE(id,institution_id);
ALTER TABLE fl.assets ADD UNIQUE(id,case_id,institution_id);
ALTER TABLE fl.claims ADD FOREIGN KEY(workflow_version_id,institution_id) REFERENCES fl.workflow_versions(id,institution_id);
ALTER TABLE fl.claims ADD FOREIGN KEY(asset_id,case_id,institution_id) REFERENCES fl.assets(id,case_id,institution_id) DEFERRABLE INITIALLY DEFERRED;
COMMIT;

-- Bootstrap creates separate passworded LOGIN roles outside this file from untracked env,
-- grants only fl_app / fl_dispatch / fl_control as appropriate, never migration-owner.
-- API validates membership/action/authority/consent/holds BEFORE setting case context.
-- RLS prevents accidental case drift; it is not a full role/action policy engine.
-- Purge uses a separate audited lifecycle role/transaction; never grant runtime audit deletion.
-- Accepted observations/outcomes are append-only; correction appends superseding record.
-- Real-data schema owner, encryption/storage and retention approval are deployment gates.

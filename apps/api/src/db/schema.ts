import {
    bigint,
    boolean,
    check,
    date,
    index,
    integer,
    jsonb,
    numeric,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const crossChainAuthChallenges = pgTable(
    'cross_chain_auth_challenges',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        walletAddress: text('wallet_address').notNull(),
        chainId: integer('chain_id').notNull(),
        nonceHash: text('nonce_hash').notNull(),
        domain: text('domain').notNull(),
        message: text('message').notNull(),
        expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
        consumedAt: timestamp('consumed_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex('cross_chain_auth_challenges_nonce_idx').on(table.nonceHash),
        index('cross_chain_auth_challenges_wallet_chain_idx').on(
            table.walletAddress,
            table.chainId,
            table.expiresAt,
        ),
    ],
)

export const crossChainAuthSessions = pgTable(
    'cross_chain_auth_sessions',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        walletAddress: text('wallet_address').notNull(),
        chainId: integer('chain_id').notNull(),
        tokenHash: text('token_hash').notNull(),
        expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
        revokedAt: timestamp('revoked_at', { withTimezone: true }),
        lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex('cross_chain_auth_sessions_token_idx').on(table.tokenHash),
        index('cross_chain_auth_sessions_wallet_chain_idx').on(
            table.walletAddress,
            table.chainId,
            table.expiresAt,
        ),
    ],
)

export const crossChainRoutes = pgTable(
    'cross_chain_routes',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        quoteId: uuid('quote_id').notNull(),
        ownerAddress: text('owner_address').notNull(),
        providerId: text('provider_id').notNull(),
        executionModel: text('execution_model').notNull(),
        sourceAsset: jsonb('source_asset').notNull(),
        destinationAsset: jsonb('destination_asset').notNull(),
        recipient: text('recipient').notNull(),
        inputAmount: numeric('input_amount', { precision: 78, scale: 0 }).notNull(),
        outputAmount: numeric('output_amount', { precision: 78, scale: 0 }).notNull(),
        minimumOutputAmount: numeric('minimum_output_amount', { precision: 78, scale: 0 }).notNull(),
        feeAmountUsd: text('fee_amount_usd'),
        durationSeconds: integer('duration_seconds').notNull().default(0),
        status: text('status').notNull().default('quoted'),
        providerStatus: text('provider_status'),
        providerTrackingId: text('provider_tracking_id'),
        sourceTransactionHash: text('source_transaction_hash'),
        destinationTransactionHash: text('destination_transaction_hash'),
        failureCode: text('failure_code'),
        submissionAttempts: integer('submission_attempts').notNull().default(0),
        claimedAt: timestamp('claimed_at', { withTimezone: true }),
        submittedAt: timestamp('submitted_at', { withTimezone: true }),
        expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
        publicData: jsonb('public_data').notNull().default({}),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex('cross_chain_routes_quote_idx').on(table.quoteId),
        uniqueIndex('cross_chain_routes_source_tx_idx').on(table.sourceTransactionHash),
        index('cross_chain_routes_owner_created_idx').on(table.ownerAddress, table.createdAt),
        index('cross_chain_routes_status_expiry_idx').on(table.status, table.expiresAt),
        index('cross_chain_routes_provider_tracking_idx').on(table.providerId, table.providerTrackingId),
        check('cross_chain_routes_attempts_check', sql`${table.submissionAttempts} BETWEEN 0 AND 1`),
        check('cross_chain_routes_amounts_check', sql`
            ${table.inputAmount} > 0 AND ${table.outputAmount} >= 0 AND
            ${table.minimumOutputAmount} >= 0 AND
            ${table.minimumOutputAmount} <= ${table.outputAmount}
        `),
    ],
)

export const crossChainRouteSteps = pgTable(
    'cross_chain_route_steps',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        routeId: uuid('route_id').notNull().references(() => crossChainRoutes.id, {
            onDelete: 'cascade',
        }),
        stepIndex: integer('step_index').notNull(),
        stepType: text('step_type').notNull(),
        label: text('label').notNull(),
        chainId: integer('chain_id'),
        status: text('status').notNull().default('pending'),
        transactionHash: text('transaction_hash'),
        publicData: jsonb('public_data').notNull().default({}),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex('cross_chain_route_steps_order_idx').on(table.routeId, table.stepIndex),
        check('cross_chain_route_steps_index_check', sql`${table.stepIndex} >= 0`),
    ],
)

export const marketTokenCatalogCache = pgTable(
    'market_token_catalog_cache',
    {
        chainId: integer('chain_id').primaryKey(),
        schemaVersion: integer('schema_version').notNull(),
        rankedTokens: jsonb('ranked_tokens').notNull(),
        commonTokens: jsonb('common_tokens').notNull(),
        providerStatus: jsonb('provider_status'),
        exclusionCounts: jsonb('exclusion_counts'),
        partial: boolean('partial').notNull().default(false),
        generatedAt: timestamp('generated_at', { withTimezone: true }),
        lastAttemptedAt: timestamp('last_attempted_at', { withTimezone: true }),
        lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
        nextRefreshAt: timestamp('next_refresh_at', { withTimezone: true }),
        contentHash: text('content_hash'),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        index('market_token_catalog_next_refresh_idx').on(table.nextRefreshAt),
        index('market_token_catalog_last_success_idx').on(table.lastSuccessAt),
        check('market_token_catalog_chain_id_check', sql`${table.chainId} > 0`),
        check('market_token_catalog_schema_version_check', sql`${table.schemaVersion} > 0`),
    ],
)

import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateRetryPoliciesTable1704067200003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'retry_policies',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'chargebee_account_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'strategy',
            type: 'varchar',
            default: "'standard'",
          },
          {
            name: 'first_retry_hours',
            type: 'int',
            default: 24,
          },
          {
            name: 'second_retry_hours',
            type: 'int',
            default: 48,
          },
          {
            name: 'third_retry_hours',
            type: 'int',
            default: 72,
          },
          {
            name: 'max_retries',
            type: 'int',
            default: 3,
          },
          {
            name: 'enable_exponential_backoff',
            type: 'boolean',
            default: false,
          },
          {
            name: 'exponential_multiplier',
            type: 'numeric',
            precision: 3,
            scale: 2,
            default: 1.5,
          },
          {
            name: 'enable_circuit_breaker',
            type: 'boolean',
            default: true,
          },
          {
            name: 'circuit_breaker_threshold',
            type: 'int',
            default: 5,
          },
          {
            name: 'circuit_breaker_cooldown_minutes',
            type: 'int',
            default: 60,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['chargebee_account_id'],
            referencedTableName: 'chargebee_accounts',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            columnNames: ['chargebee_account_id'],
            isUnique: false,
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('retry_policies');
  }
}
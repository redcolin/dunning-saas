import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateChargebeeEntities1704067200001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ChargebeeAccount table
    await queryRunner.createTable(
      new Table({
        name: 'chargebee_accounts',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'user_id', type: 'uuid' },
          { name: 'chargebee_api_key', type: 'text' },
          { name: 'chargebee_site_url', type: 'varchar' },
          { name: 'status', type: 'varchar', default: "'connected'" },
          { name: 'connected_at', type: 'timestamp', isNullable: true },
          { name: 'last_sync_at', type: 'timestamp', isNullable: true },
          { name: 'sync_error', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      })
    );

    await queryRunner.createIndex(
      'chargebee_accounts',
      new TableIndex({
        name: 'IDX_chargebee_accounts_user_id',
        columnNames: ['user_id'],
        isUnique: true,
      })
    );

    // Customers table
    await queryRunner.createTable(
      new Table({
        name: 'customers',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'chargebee_account_id', type: 'uuid' },
          { name: 'chargebee_customer_id', type: 'varchar' },
          { name: 'customer_name', type: 'varchar', isNullable: true },
          { name: 'customer_email', type: 'varchar' },
          { name: 'country', type: 'varchar', isNullable: true },
          { name: 'annual_value', type: 'numeric', precision: 12, scale: 2, default: 0 },
          { name: 'segment', type: 'varchar', default: "'SMB'" },
          { name: 'last_payment_attempt_at', type: 'timestamp', isNullable: true },
          { name: 'failed_payment_count', type: 'int', default: 0 },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      })
    );

    await queryRunner.createIndex(
      'customers',
      new TableIndex({
        name: 'IDX_customers_account_id_customer_id',
        columnNames: ['chargebee_account_id', 'chargebee_customer_id'],
      })
    );

    // PaymentMethods table
    await queryRunner.createTable(
      new Table({
        name: 'payment_methods',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'customer_id', type: 'uuid' },
          { name: 'chargebee_payment_method_id', type: 'varchar' },
          { name: 'last4_digits', type: 'varchar' },
          { name: 'card_brand', type: 'varchar' },
          { name: 'exp_month', type: 'int' },
          { name: 'exp_year', type: 'int' },
          { name: 'country', type: 'varchar', isNullable: true },
          { name: 'is_primary', type: 'boolean', default: false },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      })
    );

    // FailedPayments table
    await queryRunner.createTable(
      new Table({
        name: 'failed_payments',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'customer_id', type: 'uuid' },
          { name: 'chargebee_account_id', type: 'uuid' },
          { name: 'chargebee_invoice_id', type: 'varchar' },
          { name: 'amount', type: 'numeric', precision: 12, scale: 2 },
          { name: 'currency', type: 'varchar', length: '3' },
          { name: 'decline_code', type: 'varchar' },
          { name: 'decline_reason_user', type: 'text', isNullable: true },
          { name: 'failure_type', type: 'varchar' },
          { name: 'first_attempt_at', type: 'timestamp' },
          { name: 'status', type: 'varchar', default: "'pending_retry'" },
          { name: 'retry_count', type: 'int', default: 0 },
          { name: 'last_retry_at', type: 'timestamp', isNullable: true },
          { name: 'recovered_at', type: 'timestamp', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      })
    );

    await queryRunner.createIndex(
      'failed_payments',
      new TableIndex({
        name: 'IDX_failed_payments_account_id_status',
        columnNames: ['chargebee_account_id', 'status'],
      })
    );

    await queryRunner.createIndex(
      'failed_payments',
      new TableIndex({
        name: 'IDX_failed_payments_customer_id_created',
        columnNames: ['customer_id', 'created_at'],
      })
    );

    // RetryAttempts table
    await queryRunner.createTable(
      new Table({
        name: 'retry_attempts',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'failed_payment_id', type: 'uuid' },
          { name: 'attempt_number', type: 'int' },
          { name: 'attempt_time', type: 'timestamp' },
          { name: 'result', type: 'varchar' },
          { name: 'decline_code', type: 'varchar', isNullable: true },
          { name: 'decline_reason', type: 'varchar', isNullable: true },
          { name: 'gateway_used', type: 'varchar' },
          { name: 'raw_response', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      })
    );

    // Foreign keys
    await queryRunner.createForeignKey(
      'chargebee_accounts',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'customers',
      new TableForeignKey({
        columnNames: ['chargebee_account_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'chargebee_accounts',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'payment_methods',
      new TableForeignKey({
        columnNames: ['customer_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'customers',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'failed_payments',
      new TableForeignKey({
        columnNames: ['customer_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'customers',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'retry_attempts',
      new TableForeignKey({
        columnNames: ['failed_payment_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'failed_payments',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('retry_attempts', 'FK_retry_attempts_failed_payment_id');
    await queryRunner.dropForeignKey('failed_payments', 'FK_failed_payments_customer_id');
    await queryRunner.dropForeignKey('payment_methods', 'FK_payment_methods_customer_id');
    await queryRunner.dropForeignKey('customers', 'FK_customers_chargebee_account_id');
    await queryRunner.dropForeignKey('chargebee_accounts', 'FK_chargebee_accounts_user_id');

    // Drop tables
    await queryRunner.dropTable('retry_attempts');
    await queryRunner.dropTable('failed_payments');
    await queryRunner.dropTable('payment_methods');
    await queryRunner.dropTable('customers');
    await queryRunner.dropTable('chargebee_accounts');
  }
}
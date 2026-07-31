import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateEmailEventsTable1704067200002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'email_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'customer_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'event_type',
            type: 'varchar',
            enum: ['bounce', 'complaint', 'unsubscribe', 'delivered', 'open', 'click'],
          },
          {
            name: 'bounce_type',
            type: 'varchar',
            isNullable: true,
            enum: ['permanent', 'transient', 'undetermined'],
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'send_grid_event_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['customer_id'],
            referencedTableName: 'customers',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      })
    );

    await queryRunner.createIndex(
      'email_events',
      new TableIndex({
        name: 'idx_email_events_customer_type',
        columnNames: ['customer_id', 'event_type'],
      })
    );

    await queryRunner.createIndex(
      'email_events',
      new TableIndex({
        name: 'idx_email_events_email_type',
        columnNames: ['email', 'event_type'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('email_events');
  }
}
import { AppDataSource } from '../config/database';
import { ChargebeeAccount } from '../models/ChargebeeAccount';
import { Customer } from '../models/Customer';
import { PaymentMethod } from '../models/PaymentMethod';
import { ChargebeeService } from './chargebeeService';
import { logger } from '../config/logger';

const chargebeeRepo = AppDataSource.getRepository(ChargebeeAccount);
const customerRepo = AppDataSource.getRepository(Customer);
const paymentMethodRepo = AppDataSource.getRepository(PaymentMethod);

export class SyncService {
  async syncCustomers(accountId: string): Promise<number> {
    try {
      const account = await chargebeeRepo.findOne({ where: { id: accountId } });
      if (!account) throw new Error('Account not found');

      const service = new ChargebeeService(account);
      const chargebeeCustomers = await service.fetchAllCustomers();

      let created = 0;
      let updated = 0;

      for (const cbCustomer of chargebeeCustomers) {
        const existing = await customerRepo.findOne({
          where: {
            chargebeeAccountId: accountId,
            chargebeeCustomerId: cbCustomer.id,
          },
        });

        if (existing) {
          // Update existing
          existing.customerName = cbCustomer.first_name || cbCustomer.company || null;
          existing.customerEmail = cbCustomer.email || existing.customerEmail;
          existing.country = cbCustomer.billing_address?.country || null;
          await customerRepo.save(existing);
          updated++;
        } else {
          // Create new
          const customer = new Customer();
          customer.chargebeeAccountId = accountId;
          customer.chargebeeCustomerId = cbCustomer.id;
          customer.customerName = cbCustomer.first_name || cbCustomer.company || null;
          customer.customerEmail = cbCustomer.email || 'unknown@example.com';
          customer.country = cbCustomer.billing_address?.country || null;
          customer.segment = 'SMB'; // Default, can be updated based on MRR later
          customer.annualValue = (cbCustomer.mrr || 0) * 12;

          await customerRepo.save(customer);
          created++;
        }
      }

      // Update sync timestamp
      account.lastSyncAt = new Date();
      account.syncError = null;
      await chargebeeRepo.save(account);

      logger.info(
        `Sync complete for account ${accountId}: ${created} created, ${updated} updated`
      );

      return created + updated;
    } catch (error: any) {
      logger.error(`Sync failed for account ${accountId}:`, error);

      const account = await chargebeeRepo.findOne({ where: { id: accountId } });
      if (account) {
        account.status = 'error';
        account.syncError = error.message;
        await chargebeeRepo.save(account);
      }

      throw error;
    }
  }

  async syncPaymentMethods(accountId: string): Promise<number> {
    try {
      const account = await chargebeeRepo.findOne({ where: { id: accountId } });
      if (!account) throw new Error('Account not found');

      const service = new ChargebeeService(account);
      const methods = await service.fetchAllPaymentMethods();

      let created = 0;
      let updated = 0;

      for (const method of methods) {
        // Find customer by Chargebee customer ID
        const customer = await customerRepo.findOne({
          where: {
            chargebeeAccountId: accountId,
            chargebeeCustomerId: method.customer_id,
          },
        });

        if (!customer) continue; // Skip if customer not found

        const existing = await paymentMethodRepo.findOne({
          where: {
            customerId: customer.id,
            chargebeePaymentMethodId: method.id,
          },
        });

        if (existing) {
          // Update
          existing.isPrimary = method.status === 'valid';
          await paymentMethodRepo.save(existing);
          updated++;
        } else {
          // Create new
          const pm = new PaymentMethod();
          pm.customerId = customer.id;
          pm.chargebeePaymentMethodId = method.id;
          pm.cardBrand = method.card_type || 'unknown';
          pm.last4Digits = method.last4 || '';
          pm.expMonth = method.expiry_month || 0;
          pm.expYear = method.expiry_year || 0;
          pm.country = method.billing_address?.country || null;
          pm.isPrimary = method.status === 'valid';

          await paymentMethodRepo.save(pm);
          created++;
        }
      }

      logger.info(
        `Payment methods synced for account ${accountId}: ${created} created, ${updated} updated`
      );

      return created + updated;
    } catch (error: any) {
      logger.error(`Payment method sync failed for account ${accountId}:`, error);
      throw error;
    }
  }

  async syncAll(accountId: string): Promise<{ customers: number; paymentMethods: number }> {
    const customers = await this.syncCustomers(accountId);
    const paymentMethods = await this.syncPaymentMethods(accountId);

    return { customers, paymentMethods };
  }
}

export const syncService = new SyncService();
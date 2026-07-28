import axios, { AxiosInstance } from 'axios';
import { AppDataSource } from '../config/database';
import { ChargebeeAccount } from '../models/ChargebeeAccount';
import { logger } from '../config/logger';

export class ChargebeeService {
  private api: AxiosInstance;

  constructor(account: ChargebeeAccount) {
    const apiKey = this.decryptApiKey(account.chargebeeApiKey);

    this.api = axios.create({
      baseURL: `https://${account.chargebeeSiteUrl}/api/v2`,
      auth: {
        username: apiKey,
        password: '',
      },
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.api.get('/customers?limit=1');
      logger.info('Chargebee connection test successful');
      return true;
    } catch (error) {
      logger.error('Chargebee connection test failed:', error);
      return false;
    }
  }

  async fetchAllCustomers(limit: number = 100): Promise<any[]> {
    try {
      const customers = [];
      let offset = 0;

      while (true) {
        const response = await this.api.get('/customers', {
          params: { limit, offset },
        });

        if (!response.data.list || response.data.list.length === 0) break;

        customers.push(...response.data.list.map((item: any) => item.customer));
        offset += limit;

        if (response.data.list.length < limit) break;
      }

      logger.info(`Fetched ${customers.length} customers from Chargebee`);
      return customers;
    } catch (error) {
      logger.error('Failed to fetch customers:', error);
      throw error;
    }
  }

  async fetchAllPaymentMethods(limit: number = 100): Promise<any[]> {
    try {
      const methods = [];
      let offset = 0;

      while (true) {
        const response = await this.api.get('/payment_sources', {
          params: { limit, offset },
        });

        if (!response.data.list || response.data.list.length === 0) break;

        methods.push(...response.data.list.map((item: any) => item.payment_source));
        offset += limit;

        if (response.data.list.length < limit) break;
      }

      logger.info(`Fetched ${methods.length} payment methods from Chargebee`);
      return methods;
    } catch (error) {
      logger.error('Failed to fetch payment methods:', error);
      throw error;
    }
  }

  async fetchFailedInvoices(limit: number = 100): Promise<any[]> {
    try {
      const invoices = [];
      let offset = 0;
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

      while (true) {
        const response = await this.api.get('/invoices', {
          params: {
            status: 'not_paid',
            updated_after: thirtyDaysAgo,
            limit,
            offset,
          },
        });

        if (!response.data.list || response.data.list.length === 0) break;

        invoices.push(...response.data.list.map((item: any) => item.invoice));
        offset += limit;

        if (response.data.list.length < limit) break;
      }

      logger.info(`Fetched ${invoices.length} failed invoices from Chargebee`);
      return invoices;
    } catch (error) {
      logger.error('Failed to fetch failed invoices:', error);
      throw error;
    }
  }

  private encryptApiKey(key: string): string {
    // TODO: Implement encryption
    return key;
  }

  private decryptApiKey(encrypted: string): string {
    // TODO: Implement decryption
    return encrypted;
  }
}

export async function createChargebeeService(
  accountId: string
): Promise<ChargebeeService> {
  const chargebeeRepo = AppDataSource.getRepository(ChargebeeAccount);
  const account = await chargebeeRepo.findOne({ where: { id: accountId } });

  if (!account) {
    throw new Error('Chargebee account not found');
  }

  return new ChargebeeService(account);
}
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { hashPassword, verifyPassword, generateJWT } from '../utils/auth';

const userRepository = AppDataSource.getRepository(User);

export class AuthService {
  async signup(email: string, password: string, fullName?: string) {
    // Check if user exists
    const existing = await userRepository.findOne({ where: { email } });
    if (existing) {
      throw new Error('User already exists');
    }

    // Create user
    const user = new User();
    user.email = email;
    user.passwordHash = await hashPassword(password);
    user.fullName = fullName || null;

    await userRepository.save(user);

    // Generate token
    const token = generateJWT(user.id);

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      token,
    };
  }

  async login(email: string, password: string) {
    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const token = generateJWT(user.id);

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      token,
    };
  }

  async getUserById(userId: string) {
    return userRepository.findOne({ where: { id: userId } });
  }
}

export const authService = new AuthService();
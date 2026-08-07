import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';

export type SafeUser = {
  _id?: string;
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
  dateOfBirth?: Date;
  isTwoFactorEnabled: boolean;
  adminCurrencyPreference?: string;
};

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) { }

  async onModuleInit() {
    try {
      const adminEmail = 't00368258@gmail.com';
      const existing = await this.userModel
        .findOne({ email: adminEmail })
        .exec();
      if (!existing) {
        const passwordHash = await bcrypt.hash('password123', 12);
        await this.userModel.create({
          name: 'System Admin',
          email: adminEmail,
          password: passwordHash,
          role: 'admin',
          phone: '+919999999999',
        });
        console.log(
          '[UsersService] Default Admin user created: admin@autotrade.app / password123',
        );
      } else if (existing.role !== 'admin') {
        await this.userModel
          .findByIdAndUpdate(existing._id, { role: 'admin' })
          .exec();
      }
    } catch (err: any) {
      console.warn('[UsersService] Admin seed check error:', err?.message);
    }
  }

  /** Registers a new user account with hashed password. */
  async create(
    name: string,
    email: string,
    password: string,
    phone?: string,
    role: string = 'customer',
  ): Promise<SafeUser> {
    const existingUser = await this.userModel.exists({ email });
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }
    const user = await this.userModel.create({
      name,
      email,
      password,
      role,
      ...(phone ? { phone } : {}),
    });
    return this.toSafeUser(user);
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email })
      .select('+password +twoFactorSecret')
      .exec();
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone }).exec();
  }

  async findById(id: string): Promise<SafeUser | null> {
    const user = await this.userModel.findById(id).exec();
    return user ? this.toSafeUser(user) : null;
  }

  async findByEmail(email: string): Promise<SafeUser | null> {
    const user = await this.userModel.findOne({ email }).exec();
    return user ? this.toSafeUser(user) : null;
  }

  async updatePassword(id: string, password: string): Promise<void> {
    const hash = await bcrypt.hash(password, 12);
    await this.userModel.findByIdAndUpdate(id, { password: hash }).exec();
  }

  toSafeUser(user: UserDocument): SafeUser {
    const trimmedName = (user.name || '').trim();
    const parts = trimmedName.split(/\s+/).filter(Boolean);
    let firstName = parts[0] || '';
    let lastName = parts.slice(1).join(' ');

    if (/^\d+$/.test(lastName.trim())) {
      lastName = '';
    }

    if (/^user_\d+$/i.test(firstName)) {
      firstName = 'User';
    }

    const cleanFirstName = firstName || 'User';

    return {
      _id: user.id || user._id?.toString(),
      id: user.id || user._id?.toString(),
      firstName: cleanFirstName,
      lastName: lastName || '',
      name: lastName ? `${cleanFirstName} ${lastName}` : cleanFirstName,
      email: user.email,
      phone: user.phone,
      role: user.role || 'customer',
      avatar: user.avatar,
      dateOfBirth: user.dateOfBirth,
      isTwoFactorEnabled: !!user.isTwoFactorEnabled,
      adminCurrencyPreference: user.adminCurrencyPreference,
    };
  }

  async updateProfile(
    userId: string,
    data: UpdateProfileDto,
  ): Promise<SafeUser> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');

    if (data.email && data.email.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
      const normalizedEmail = data.email.toLowerCase().trim();
      const existing = await this.userModel
        .findOne({ email: normalizedEmail })
        .exec();
      if (existing && existing._id?.toString() !== userId && existing.id !== userId) {
        throw new ConflictException('Email is already in use');
      }
      user.email = normalizedEmail;
    }

    if (data.name !== undefined) user.name = data.name.trim();

    if (data.phone !== undefined) {
      const cleanPhone = data.phone.trim().replace(/\D/g, '');
      if (cleanPhone) {
        if (cleanPhone.length !== 10) {
          throw new BadRequestException('Please enter a valid 10-digit mobile number.');
        }
        const existingPhone = await this.userModel
          .findOne({ phone: cleanPhone })
          .exec();
        if (existingPhone && existingPhone._id?.toString() !== userId && existingPhone.id !== userId) {
          throw new ConflictException('Phone number is already in use');
        }
        user.phone = cleanPhone;
      }
    }

    if (data.avatar !== undefined) user.avatar = data.avatar || undefined;
    if (data.dateOfBirth !== undefined) {
      user.dateOfBirth = data.dateOfBirth
        ? new Date(data.dateOfBirth)
        : undefined;
    }

    await user.save();
    return this.toSafeUser(user);
  }

  async updateAdminCurrency(id: string, currency: string): Promise<SafeUser> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.adminCurrencyPreference = currency;
    await user.save();
    return this.toSafeUser(user);
  }

  async findByIdWithSecret(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('+twoFactorSecret').exec();
  }
}

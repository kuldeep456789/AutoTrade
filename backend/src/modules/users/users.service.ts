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
import { ChangePasswordDto } from './dto/change-password.dto';

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
  gender?: string;
  dateOfBirth?: Date;
};

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async onModuleInit() {
    try {
      const adminEmail = 'admin@vastra.app';
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
          '[UsersService] Default Admin user created: admin@vastra.app / password123',
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

  /** Retrieves user document including sensitive password hash for authentication. */
  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  /** Finds a user by mobile phone number. */
  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone }).exec();
  }

  /** Finds a user by ID and returns safe user DTO. */
  async findById(id: string): Promise<SafeUser | null> {
    const user = await this.userModel.findById(id).exec();
    return user ? this.toSafeUser(user) : null;
  }

  /** Finds a user by email address and returns safe user DTO. */
  async findByEmail(email: string): Promise<SafeUser | null> {
    const user = await this.userModel.findOne({ email }).exec();
    return user ? this.toSafeUser(user) : null;
  }

  /** Updates user password hash directly. */
  async updatePassword(id: string, password: string): Promise<void> {
    const hash = await bcrypt.hash(password, 12);
    await this.userModel.findByIdAndUpdate(id, { password: hash }).exec();
  }

  /** Sanitizes user document into safe DTO stripped of sensitive fields. */
  toSafeUser(user: UserDocument): SafeUser {
    const trimmedName = (user.name || '').trim();
    const parts = trimmedName.split(/\s+/).filter(Boolean);
    let firstName = parts[0] || '';
    let lastName = parts.slice(1).join(' ');

    // If lastName is purely numeric (e.g. "0048" from legacy phone generation), clear it
    if (/^\d+$/.test(lastName.trim())) {
      lastName = '';
    }

    // Clean up generic auto-generated username prefix if present
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
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
    };
  }

  async updateProfile(
    userId: string,
    data: UpdateProfileDto,
  ): Promise<SafeUser> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');

    if (data.email && data.email !== user.email) {
      const normalizedEmail = data.email.toLowerCase().trim();
      const existing = await this.userModel
        .findOne({ email: normalizedEmail })
        .exec();
      if (existing) throw new ConflictException('Email is already in use');
      user.email = normalizedEmail;
    }

    if (data.name !== undefined) user.name = data.name.trim();
    if (data.phone !== undefined && data.phone !== user.phone) {
      const trimmedPhone = data.phone.trim();
      if (trimmedPhone) {
        const existingPhone = await this.userModel
          .findOne({ phone: trimmedPhone })
          .exec();
        if (existingPhone && existingPhone.id !== userId) {
          throw new ConflictException('Phone number is already in use');
        }
      }
      user.phone = trimmedPhone || undefined;
    }
    if (data.avatar !== undefined) user.avatar = data.avatar || undefined;
    if (data.gender !== undefined) user.gender = data.gender || undefined;
    if (data.dateOfBirth !== undefined)
      user.dateOfBirth = data.dateOfBirth
        ? new Date(data.dateOfBirth)
        : undefined;

    await user.save();
    return this.toSafeUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userModel
      .findById(userId)
      .select('+password')
      .exec();
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch)
      throw new BadRequestException('Current password is incorrect');

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(dto.newPassword)) {
      throw new BadRequestException('Password must contain at least 8 char');
    }

    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const hash = await bcrypt.hash(dto.newPassword, 12);
    user.password = hash;
    await user.save();
  }
}

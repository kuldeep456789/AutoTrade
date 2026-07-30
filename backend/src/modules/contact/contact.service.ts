import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contact } from './schemas/contact.schema';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ContactService {
  constructor(
    @InjectModel(Contact.name) private contactModel: Model<Contact>,
    private mailService: MailService,
  ) {}

  async createContactMessage(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) {
    try {
      const newContact = new this.contactModel({
        name: data.name?.trim(),
        email: data.email?.toLowerCase().trim(),
        subject: data.subject?.trim(),
        message: data.message?.trim(),
        status: 'pending',
      });
      const saved = await newContact.save();
      console.log(
        '[ContactService] Contact message saved to MongoDB successfully ID:',
        saved._id,
      );

      // Send email alert to admin asynchronously
      this.mailService.sendSystemAlert(
        `New Contact Message: ${saved.subject}`,
        `You have received a new contact message from <b>${saved.name}</b> (${saved.email}).<br><br><b>Message:</b><br>${saved.message}`
      ).catch(e => console.error('[ContactService] Failed to send email alert:', e));

      return {
        success: true,
        message: 'Message sent successfully',
        data: saved,
      };
    } catch (error: any) {
      console.error(
        '[ContactService] Error saving contact message to MongoDB:',
        error,
      );
      throw new InternalServerErrorException(
        error?.message || 'Failed to save contact message',
      );
    }
  }

  async findAll() {
    try {
      return await this.contactModel.find().sort({ createdAt: -1 }).exec();
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to fetch contact messages',
      );
    }
  }

  async findByEmail(email: string) {
    try {
      const clean = (email || '').trim();
      if (!clean) return [];
      return await this.contactModel
        .find({
          email: {
            $regex: new RegExp(
              `^${clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
              'i',
            ),
          },
        })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch user messages');
    }
  }

  async updateStatus(id: string, status: string) {
    try {
      const updated = await this.contactModel
        .findByIdAndUpdate(id, { status }, { new: true })
        .exec();
      return updated;
    } catch (error) {
      throw new InternalServerErrorException('Failed to update message status');
    }
  }

  async replyMessage(id: string, adminReply: string, status = 'resolved') {
    try {
      const updated = await this.contactModel
        .findByIdAndUpdate(
          id,
          { adminReply, repliedAt: new Date(), status },
          { new: true },
        )
        .exec();
      return updated;
    } catch (error) {
      throw new InternalServerErrorException('Failed to save reply');
    }
  }
}

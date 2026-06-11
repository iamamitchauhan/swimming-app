import mongoose from 'mongoose';
import { InvitationModel } from '../../models/invitation.model';
import { UserRole } from '../../shared/constants/roles';

export type PlainInvitation = {
  _id: string;
  email: string;
  role: string;
  clubId: string;
  invitedBy: string;
  tokenHash: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
};

export class InvitationRepository {
  async create(data: {
    email: string;
    role: UserRole;
    clubId: string;
    invitedBy: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PlainInvitation> {
    const doc = await new InvitationModel({
      email: data.email,
      role: data.role,
      clubId: new mongoose.Types.ObjectId(data.clubId),
      invitedBy: new mongoose.Types.ObjectId(data.invitedBy),
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      status: 'pending',
    }).save();

    const plain = await InvitationModel.findById(doc._id).lean<PlainInvitation>().exec();
    if (!plain) throw new Error('Failed to retrieve created invitation');
    return plain;
  }

  async findByTokenHash(tokenHash: string): Promise<PlainInvitation | null> {
    return InvitationModel.findOne({ tokenHash, status: 'pending' })
      .lean<PlainInvitation>()
      .exec();
  }

  async findPendingByEmailAndClub(
    email: string,
    clubId: string,
  ): Promise<PlainInvitation | null> {
    return InvitationModel.findOne({
      email,
      clubId: new mongoose.Types.ObjectId(clubId),
      status: 'pending',
      expiresAt: { $gt: new Date() },
    })
      .lean<PlainInvitation>()
      .exec();
  }

  async markAccepted(id: string): Promise<void> {
    await InvitationModel.findByIdAndUpdate(id, { $set: { status: 'accepted' } }).exec();
  }

  async findByClub(clubId: string): Promise<PlainInvitation[]> {
    return InvitationModel.find({ clubId: new mongoose.Types.ObjectId(clubId) })
      .sort({ createdAt: -1 })
      .lean<PlainInvitation[]>()
      .exec();
  }

  async findBySender(invitedBy: string): Promise<PlainInvitation[]> {
    return InvitationModel.find({ invitedBy: new mongoose.Types.ObjectId(invitedBy) })
      .sort({ createdAt: -1 })
      .lean<PlainInvitation[]>()
      .exec();
  }

  async findById(id: string): Promise<PlainInvitation | null> {
    return InvitationModel.findById(id).lean<PlainInvitation>().exec();
  }

  async resend(id: string, expiresAt: Date): Promise<PlainInvitation | null> {
    return InvitationModel.findByIdAndUpdate(
      id,
      { $set: { status: 'pending', expiresAt } },
      { new: true },
    )
      .lean<PlainInvitation>()
      .exec();
  }

  async delete(id: string): Promise<PlainInvitation | null> {
    return InvitationModel.findByIdAndDelete(id).lean<PlainInvitation>().exec();
  }
}

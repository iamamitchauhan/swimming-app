import mongoose from 'mongoose';
import { ClubModel } from '../../models/club.model';

export type PlainClub = {
  _id: string;
  name: string;
  address: string;
  phone: string;
  logoUrl: string | null;
  ownerId: string;
  status: string;
  rejectionReason: string | null;
  clubSize: string | null;
  region: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class ClubRepository {
  async findById(id: string): Promise<PlainClub | null> {
    return ClubModel.findById(id).lean<PlainClub>().exec();
  }

  async findByOwner(ownerId: string): Promise<PlainClub | null> {
    return ClubModel.findOne({ ownerId: new mongoose.Types.ObjectId(ownerId) })
      .lean<PlainClub>()
      .exec();
  }

  async findPending(): Promise<PlainClub[]> {
    return ClubModel.find({ status: 'pending_review' })
      .sort({ createdAt: 1 })
      .lean<PlainClub[]>()
      .exec();
  }

  async findAll(): Promise<PlainClub[]> {
    return ClubModel.find().sort({ createdAt: -1 }).lean<PlainClub[]>().exec();
  }

  async approve(id: string): Promise<PlainClub | null> {
    return ClubModel.findByIdAndUpdate(
      id,
      { $set: { status: 'approved', rejectionReason: null } },
      { new: true },
    )
      .lean<PlainClub>()
      .exec();
  }

  async reject(id: string, reason: string): Promise<PlainClub | null> {
    return ClubModel.findByIdAndUpdate(
      id,
      { $set: { status: 'rejected', rejectionReason: reason } },
      { new: true },
    )
      .lean<PlainClub>()
      .exec();
  }
}

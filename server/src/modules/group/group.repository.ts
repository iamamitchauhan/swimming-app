import { Types } from "mongoose";
import { GroupModel, IGroup } from "../../models/group.model";

// ─── Plain types ────────────────────────────────────────────────────────────────

export type PlainGroup = {
  _id: string;
  name: string;
  clubId: string;
  createdBy: string;
  updatedBy: string;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateGroupData = {
  name: string;
  clubId: string;
  createdBy: string;
  updatedBy: string;
};

export type UpdateGroupData = {
  name?: string;
  updatedBy: string;
};

export type SoftDeleteData = {
  deletedBy: string;
  deletedAt: Date;
};

// ─── Repository ─────────────────────────────────────────────────────────────────

export class GroupRepository {
  async findByClub(clubId: string): Promise<PlainGroup[]> {
    return GroupModel.find({ clubId: new Types.ObjectId(clubId), deletedAt: null })
      .sort({ name: 1 })
      .lean<PlainGroup[]>()
      .exec();
  }

  async findById(id: string): Promise<PlainGroup | null> {
    return GroupModel.findOne({ _id: new Types.ObjectId(id), deletedAt: null })
      .lean<PlainGroup>()
      .exec();
  }

  async findByName(clubId: string, name: string): Promise<PlainGroup | null> {
    return GroupModel.findOne({
      clubId: new Types.ObjectId(clubId),
      name: name.trim(),
      deletedAt: null,
    })
      .lean<PlainGroup>()
      .exec();
  }

  async create(data: CreateGroupData): Promise<PlainGroup> {
    const created = await GroupModel.create({
      name: data.name.trim(),
      clubId: new Types.ObjectId(data.clubId),
      createdBy: new Types.ObjectId(data.createdBy),
      updatedBy: new Types.ObjectId(data.updatedBy),
    });
    return created.toObject<PlainGroup>();
  }

  async update(id: string, data: UpdateGroupData): Promise<PlainGroup | null> {
    return GroupModel.findByIdAndUpdate(
      id,
      {
        ...(data.name !== undefined && { name: data.name.trim() }),
        updatedBy: new Types.ObjectId(data.updatedBy),
      },
      { new: true },
    )
      .lean<PlainGroup>()
      .exec();
  }

  async softDelete(id: string, data: SoftDeleteData): Promise<PlainGroup | null> {
    return GroupModel.findByIdAndUpdate(
      id,
      {
        deletedAt: data.deletedAt,
        deletedBy: new Types.ObjectId(data.deletedBy),
      },
      { new: true },
    )
      .lean<PlainGroup>()
      .exec();
  }
}

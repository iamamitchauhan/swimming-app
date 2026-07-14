import { Types } from "mongoose";
import { GroupModel, IGroup } from "../../models/group.model";

// ─── Plain types ────────────────────────────────────────────────────────────────

export type PopulatedUser = {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type PlainGroup = {
  _id: string;
  name: string;
  color: string;
  clubId: string;
  createdBy: PopulatedUser;
  updatedBy: PopulatedUser;
  deletedBy: PopulatedUser | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateGroupData = {
  name: string;
  color: string;
  clubId: string;
  createdBy: string;
  updatedBy: string;
};

export type UpdateGroupData = {
  name?: string;
  color?: string;
  updatedBy: string;
};

export type SoftDeleteData = {
  deletedBy: string;
  deletedAt: Date;
};

// ─── Repository ─────────────────────────────────────────────────────────────────

export class GroupRepository {
  private populateUser() {
    return [
      { path: "createdBy", select: "firstName lastName email" },
      { path: "updatedBy", select: "firstName lastName email" },
    ];
  }

  async findByClub(clubId: string): Promise<PlainGroup[]> {
    return GroupModel.find({ clubId: new Types.ObjectId(clubId), deletedAt: null })
      .populate(this.populateUser())
      .sort({ name: 1 })
      .lean<PlainGroup[]>()
      .exec();
  }

  async findById(id: string): Promise<PlainGroup | null> {
    return GroupModel.findOne({ _id: new Types.ObjectId(id), deletedAt: null })
      .populate(this.populateUser())
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
      color: data.color?.trim() ?? "",
      clubId: new Types.ObjectId(data.clubId),
      createdBy: new Types.ObjectId(data.createdBy),
      updatedBy: new Types.ObjectId(data.updatedBy),
    });
    return this.findById(created._id.toString()) as Promise<PlainGroup>;
  }

  async update(id: string, data: UpdateGroupData): Promise<PlainGroup | null> {
    await GroupModel.findByIdAndUpdate(
      id,
      {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.color !== undefined && { color: data.color.trim() }),
        updatedBy: new Types.ObjectId(data.updatedBy),
      },
      { new: true },
    ).exec();
    return this.findById(id);
  }

  async softDelete(id: string, data: SoftDeleteData): Promise<PlainGroup | null> {
    await GroupModel.findByIdAndUpdate(
      id,
      {
        deletedAt: data.deletedAt,
        deletedBy: new Types.ObjectId(data.deletedBy),
      },
      { new: true },
    ).exec();
    return GroupModel.findById(id).populate(this.populateUser()).lean<PlainGroup>().exec();
  }
}

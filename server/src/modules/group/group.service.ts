import { GroupRepository, CreateGroupData, UpdateGroupData } from "./group.repository";
import { NotFoundError, ConflictError, BadRequestError } from "../../shared/errors/domain.errors";
import logger from "../../shared/utils/logger";

export class GroupService {
  constructor(private readonly repo: GroupRepository) {}

  async listByClub(clubId: string) {
    return this.repo.findByClub(clubId);
  }

  async getById(id: string) {
    const group = await this.repo.findById(id);
    if (!group) throw new NotFoundError("Group not found");
    return group;
  }

  async create(clubId: string, userId: string, name: string) {
    if (!name?.trim()) throw new BadRequestError("name is required");

    const existing = await this.repo.findByName(clubId, name);
    if (existing) throw new ConflictError(`Group "${name.trim()}" already exists`);

    const data: CreateGroupData = {
      name: name.trim(),
      clubId,
      createdBy: userId,
      updatedBy: userId,
    };

    const created = await this.repo.create(data);
    logger.info({ groupId: created._id, clubId }, "group.created");
    return created;
  }

  async update(id: string, userId: string, name: string) {
    if (!name?.trim()) throw new BadRequestError("name is required");

    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError("Group not found");

    const conflict = await this.repo.findByName(existing.clubId, name);
    if (conflict && conflict._id !== id) {
      throw new ConflictError(`Group "${name.trim()}" already exists`);
    }

    const data: UpdateGroupData = { name: name.trim(), updatedBy: userId };
    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundError("Group not found");

    logger.info({ groupId: id, clubId: existing.clubId }, "group.updated");
    return updated;
  }

  async delete(id: string, userId: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError("Group not found");

    const deleted = await this.repo.softDelete(id, {
      deletedBy: userId,
      deletedAt: new Date(),
    });
    if (!deleted) throw new NotFoundError("Group not found");

    logger.info({ groupId: id, clubId: existing.clubId }, "group.deleted");
    return deleted;
  }
}

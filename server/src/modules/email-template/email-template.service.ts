import { EmailTemplateRepository, TemplateInput } from "./email-template.repository";
import { BadRequestError } from "../../shared/errors/domain.errors";
import logger from "../../shared/utils/logger";
import { EmailTemplateModel } from "../../models/email-template.model";

export class EmailTemplateService {
  constructor(private readonly repo: EmailTemplateRepository) {}

  async listByClub(clubId: string) {
    return this.repo.findByClub(clubId);
  }

  async findByGroupAndType(groupId: string, type: "offer" | "rejection") {
    return this.repo.findByGroupAndType(groupId, type);
  }

  async bulkUpsert(clubId: string, userId: string, templates: TemplateInput[]) {
    if (!Array.isArray(templates) || templates.length === 0) {
      throw new BadRequestError("templates must be a non-empty array");
    }

    const validTypes = new Set<"offer" | "rejection">(["offer", "rejection"]);

    for (let i = 0; i < templates.length; i++) {
      const t = templates[i];
      if (!validTypes.has(t.type as "offer" | "rejection")) {
        throw new BadRequestError(`templates[${i}].type must be offer or rejection`);
      }
      if (t.type === "offer" && !t.groupId?.trim()) {
        throw new BadRequestError(`templates[${i}].groupId is required for offer templates`);
      }
      if (typeof t.subject !== "string") throw new BadRequestError(`templates[${i}].subject must be a string`);
      if (typeof t.body !== "string") throw new BadRequestError(`templates[${i}].body must be a string`);
    }

    const saved = await this.repo.upsertBulk(clubId, userId, templates);
    logger.info({ clubId, count: saved.length }, "email-templates.bulk-upserted");
    return saved;
  }

  async create(template: TemplateInput & { clubId: string; userId: string; createdBy: string; updatedBy: string }) {
    const created = await EmailTemplateModel.create(template);
    return created;
  }
}

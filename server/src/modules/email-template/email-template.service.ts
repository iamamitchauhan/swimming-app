import { EmailTemplateRepository, TemplateInput } from "./email-template.repository";
import { BadRequestError } from "../../shared/errors/domain.errors";
import logger from "../../shared/utils/logger";

export class EmailTemplateService {
  constructor(private readonly repo: EmailTemplateRepository) {}

  async listByClub(clubId: string) {
    return this.repo.findByClub(clubId);
  }

  async bulkUpsert(clubId: string, userId: string, templates: TemplateInput[]) {
    if (!Array.isArray(templates) || templates.length === 0) {
      throw new BadRequestError("templates must be a non-empty array");
    }

    for (let i = 0; i < templates.length; i++) {
      const t = templates[i];
      if (!t.groupId?.trim()) throw new BadRequestError(`templates[${i}].groupId is required`);
      if (typeof t.subject !== "string") throw new BadRequestError(`templates[${i}].subject must be a string`);
      if (typeof t.body !== "string") throw new BadRequestError(`templates[${i}].body must be a string`);
    }

    const saved = await this.repo.upsertBulk(clubId, userId, templates);
    logger.info({ clubId, count: saved.length }, "email-templates.bulk-upserted");
    return saved;
  }
}

import { Types } from "mongoose";
import { EmailTemplateModel, IEmailTemplate } from "../../models/email-template.model";

// ─── Plain types ────────────────────────────────────────────────────────────────

export type PlainEmailTemplate = {
  _id: string;
  clubId: string;
  groupId: string | null;
  type: "offer" | "rejection";
  subject: string;
  body: string;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TemplateInput = {
  groupId: string | null;
  type: "offer" | "rejection";
  subject: string;
  body: string;
};

// ─── Repository ─────────────────────────────────────────────────────────────────

export class EmailTemplateRepository {
  async findByClub(clubId: string): Promise<PlainEmailTemplate[]> {
    return EmailTemplateModel.find({ clubId: new Types.ObjectId(clubId) })
      .lean<PlainEmailTemplate[]>()
      .exec();
  }

  async upsertBulk(clubId: string, userId: string, templates: TemplateInput[]): Promise<PlainEmailTemplate[]> {
    const clubOid = new Types.ObjectId(clubId);
    const userOid = new Types.ObjectId(userId);

    const ops = templates.map((t) => ({
      updateOne: {
        filter: { clubId: clubOid, groupId: t.groupId, type: t.type },
        update: {
          $set: {
            subject: t.subject,
            body: t.body,
            updatedBy: userOid,
          },
          $setOnInsert: {
            clubId: clubOid,
            groupId: t.groupId,
            type: t.type,
            createdBy: userOid,
          },
        },
        upsert: true,
      },
    }));

    await EmailTemplateModel.bulkWrite(ops);

    return this.findByClub(clubId);
  }
}

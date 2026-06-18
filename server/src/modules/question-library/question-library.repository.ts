import { QuestionLibraryModel, IQuestion } from '../../models/question-library.model';

// ─── Plain types ──────────────────────────────────────────────────────────────

export type PlainQuestion = IQuestion;

export type PlainQuestionCategory = {
  _id: string;
  category: string;
  questions: PlainQuestion[];
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateCategoryData = {
  category: string;
  questions: PlainQuestion[];
  sortOrder?: number;
};

export type UpdateCategoryData = Partial<{
  category: string;
  questions: PlainQuestion[];
  sortOrder: number;
}>;

// ─── Repository ───────────────────────────────────────────────────────────────

export class QuestionLibraryRepository {
  async findAll(): Promise<PlainQuestionCategory[]> {
    return QuestionLibraryModel.find()
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean<PlainQuestionCategory[]>()
      .exec();
  }

  async findById(id: string): Promise<PlainQuestionCategory | null> {
    return QuestionLibraryModel.findById(id).lean<PlainQuestionCategory>().exec();
  }

  async findByCategory(category: string): Promise<PlainQuestionCategory | null> {
    return QuestionLibraryModel.findOne({ category }).lean<PlainQuestionCategory>().exec();
  }

  async create(data: CreateCategoryData): Promise<PlainQuestionCategory> {
    const created = await QuestionLibraryModel.create(data);
    return created.toObject<PlainQuestionCategory>();
  }

  async update(id: string, data: UpdateCategoryData): Promise<PlainQuestionCategory | null> {
    return QuestionLibraryModel.findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean<PlainQuestionCategory>()
      .exec();
  }

  async delete(id: string): Promise<PlainQuestionCategory | null> {
    return QuestionLibraryModel.findByIdAndDelete(id).lean<PlainQuestionCategory>().exec();
  }

  async addQuestion(id: string, question: PlainQuestion): Promise<PlainQuestionCategory | null> {
    return QuestionLibraryModel.findByIdAndUpdate(
      id,
      { $push: { questions: question } },
      { new: true },
    )
      .lean<PlainQuestionCategory>()
      .exec();
  }

  async updateQuestion(
    id: string,
    questionIndex: number,
    question: Partial<PlainQuestion>,
  ): Promise<PlainQuestionCategory | null> {
    const setFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(question)) {
      setFields[`questions.${questionIndex}.${key}`] = value;
    }
    return QuestionLibraryModel.findByIdAndUpdate(id, { $set: setFields }, { new: true })
      .lean<PlainQuestionCategory>()
      .exec();
  }

  async removeQuestion(
    id: string,
    questionIndex: number,
  ): Promise<PlainQuestionCategory | null> {
    const doc = await QuestionLibraryModel.findById(id).exec();
    if (!doc) return null;
    doc.questions.splice(questionIndex, 1);
    await doc.save();
    return doc.toObject<PlainQuestionCategory>();
  }
}

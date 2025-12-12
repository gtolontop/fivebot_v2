import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FormSubmissionStatus } from '@prisma/client';

@Injectable()
export class FormsService {
  constructor(private prisma: PrismaService) {}

  async getConfig(guildId: string, botId: string) {
    let config = await this.prisma.formConfig.findUnique({
      where: { guildId },
      include: {
        forms: {
          include: {
            questions: { orderBy: { position: 'asc' } },
            _count: { select: { submissions: true } },
          },
        },
      },
    });

    if (!config) {
      config = await this.prisma.formConfig.create({
        data: { guildId, botId, enabled: true },
        include: {
          forms: {
            include: {
              questions: { orderBy: { position: 'asc' } },
              _count: { select: { submissions: true } },
            },
          },
        },
      });
    }

    return config;
  }

  async updateConfig(guildId: string, botId: string, data: { enabled?: boolean; maxActiveForms?: number }) {
    return this.prisma.formConfig.upsert({
      where: { guildId },
      update: data,
      create: { guildId, botId, ...data },
    });
  }

  async createForm(guildId: string, botId: string, dto: any) {
    const config = await this.getConfig(guildId, botId);

    return this.prisma.form.create({
      data: {
        configId: config.id,
        guildId,
        name: dto.name,
        description: dto.description,
        slug: dto.slug || dto.name.toLowerCase().replace(/\s+/g, '-'),
        submissionChannelId: dto.submissionChannelId,
        isActive: dto.isActive ?? true,
        requiresReview: dto.requiresReview ?? true,
        maxSubmissions: dto.maxSubmissions,
        cooldownMinutes: dto.cooldownMinutes ?? 0,
        requiredRoleIds: dto.requiredRoleIds ? JSON.stringify(dto.requiredRoleIds) : null,
        blacklistedRoleIds: dto.blacklistedRoleIds ? JSON.stringify(dto.blacklistedRoleIds) : null,
        approvalRoleId: dto.approvalRoleId,
        approvalMessage: dto.approvalMessage,
        denialMessage: dto.denialMessage,
        embedColor: dto.embedColor,
      },
      include: { questions: true },
    });
  }

  async updateForm(formId: string, dto: any) {
    return this.prisma.form.update({
      where: { id: formId },
      data: {
        name: dto.name,
        description: dto.description,
        slug: dto.slug,
        submissionChannelId: dto.submissionChannelId,
        isActive: dto.isActive,
        requiresReview: dto.requiresReview,
        maxSubmissions: dto.maxSubmissions,
        cooldownMinutes: dto.cooldownMinutes,
        requiredRoleIds: dto.requiredRoleIds ? JSON.stringify(dto.requiredRoleIds) : undefined,
        blacklistedRoleIds: dto.blacklistedRoleIds ? JSON.stringify(dto.blacklistedRoleIds) : undefined,
        approvalRoleId: dto.approvalRoleId,
        approvalMessage: dto.approvalMessage,
        denialMessage: dto.denialMessage,
        embedColor: dto.embedColor,
      },
      include: { questions: { orderBy: { position: 'asc' } } },
    });
  }

  async deleteForm(formId: string) {
    await this.prisma.form.delete({ where: { id: formId } });
    return { success: true };
  }

  async getForm(formId: string) {
    return this.prisma.form.findUnique({
      where: { id: formId },
      include: { questions: { orderBy: { position: 'asc' } } },
    });
  }

  async addQuestion(formId: string, dto: any) {
    const form = await this.prisma.form.findUnique({
      where: { id: formId },
      include: { questions: true },
    });

    if (!form) throw new NotFoundException('Form not found');

    const maxPosition = form.questions.reduce((max, q) => Math.max(max, q.position), -1);

    return this.prisma.formQuestion.create({
      data: {
        formId,
        question: dto.question,
        description: dto.description,
        type: dto.type || 'SHORT_TEXT',
        required: dto.required ?? true,
        position: maxPosition + 1,
        options: dto.options ? JSON.stringify(dto.options) : null,
        minLength: dto.minLength,
        maxLength: dto.maxLength,
        placeholder: dto.placeholder,
      },
    });
  }

  async updateQuestion(questionId: string, dto: any) {
    return this.prisma.formQuestion.update({
      where: { id: questionId },
      data: {
        question: dto.question,
        description: dto.description,
        type: dto.type,
        required: dto.required,
        options: dto.options ? JSON.stringify(dto.options) : undefined,
        minLength: dto.minLength,
        maxLength: dto.maxLength,
        placeholder: dto.placeholder,
      },
    });
  }

  async deleteQuestion(questionId: string) {
    await this.prisma.formQuestion.delete({ where: { id: questionId } });
    return { success: true };
  }

  async reorderQuestions(formId: string, questionIds: string[]) {
    const updates = questionIds.map((id, index) =>
      this.prisma.formQuestion.update({
        where: { id },
        data: { position: index },
      })
    );
    await this.prisma.$transaction(updates);
    return { success: true };
  }

  async getSubmissions(formId: string, status?: string) {
    return this.prisma.formSubmission.findMany({
      where: {
        formId,
        ...(status && { status: status as FormSubmissionStatus }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewSubmission(submissionId: string, reviewerId: string, status: 'APPROVED' | 'DENIED', reviewNote?: string) {
    return this.prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        status,
        reviewerId,
        reviewedAt: new Date(),
        reviewNote,
      },
    });
  }
}

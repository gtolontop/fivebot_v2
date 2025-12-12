import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FormsService } from './forms.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('forms')
@UseGuards(JwtAuthGuard)
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get('config/:guildId')
  async getConfig(@Param('guildId') guildId: string, @Query('botId') botId: string) {
    return this.formsService.getConfig(guildId, botId);
  }

  @Put('config/:guildId')
  async updateConfig(
    @Param('guildId') guildId: string,
    @Query('botId') botId: string,
    @Body() dto: { enabled?: boolean; maxActiveForms?: number }
  ) {
    return this.formsService.updateConfig(guildId, botId, dto);
  }

  @Post(':guildId')
  async createForm(
    @Param('guildId') guildId: string,
    @Query('botId') botId: string,
    @Body() dto: any
  ) {
    return this.formsService.createForm(guildId, botId, dto);
  }

  @Get(':formId')
  async getForm(@Param('formId') formId: string) {
    return this.formsService.getForm(formId);
  }

  @Put(':formId')
  async updateForm(@Param('formId') formId: string, @Body() dto: any) {
    return this.formsService.updateForm(formId, dto);
  }

  @Delete(':formId')
  async deleteForm(@Param('formId') formId: string) {
    return this.formsService.deleteForm(formId);
  }

  @Post(':formId/questions')
  async addQuestion(@Param('formId') formId: string, @Body() dto: any) {
    return this.formsService.addQuestion(formId, dto);
  }

  @Put('questions/:questionId')
  async updateQuestion(@Param('questionId') questionId: string, @Body() dto: any) {
    return this.formsService.updateQuestion(questionId, dto);
  }

  @Delete('questions/:questionId')
  async deleteQuestion(@Param('questionId') questionId: string) {
    return this.formsService.deleteQuestion(questionId);
  }

  @Put(':formId/reorder-questions')
  async reorderQuestions(@Param('formId') formId: string, @Body() body: { questionIds: string[] }) {
    return this.formsService.reorderQuestions(formId, body.questionIds);
  }

  @Get(':formId/submissions')
  async getSubmissions(@Param('formId') formId: string, @Query('status') status?: string) {
    return this.formsService.getSubmissions(formId, status);
  }

  @Put('submissions/:submissionId/review')
  async reviewSubmission(
    @Param('submissionId') submissionId: string,
    @Body() dto: { reviewedBy: string; status: 'APPROVED' | 'DENIED'; reviewNote?: string }
  ) {
    return this.formsService.reviewSubmission(submissionId, dto.reviewedBy, dto.status, dto.reviewNote);
  }
}

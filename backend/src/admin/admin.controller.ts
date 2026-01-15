import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard) // 관리자 기능은 인증 필요
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('ingest/:brandSlug/run')
  async runIngest(@Param('brandSlug') brandSlug: string) {
    return await this.adminService.ingestFromFatSecret(brandSlug);
  }
}

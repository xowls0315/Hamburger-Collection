import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('comments')
@Controller('posts/:postId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @ApiOperation({
    summary: '댓글 목록 조회',
    description: '특정 게시글의 댓글 목록을 조회합니다. 인증 필요 없음.',
  })
  @ApiParam({ name: 'postId', description: '게시글 ID (UUID)' })
  @ApiResponse({ status: 200, description: '댓글 목록 조회 성공' })
  findAll(@Param('postId') postId: string) {
    return this.commentsService.findAllByPostId(postId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '댓글 작성',
    description: '게시글에 댓글을 작성합니다. 로그인 필요.',
  })
  @ApiParam({ name: 'postId', description: '게시글 ID (UUID)' })
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({ status: 201, description: '댓글 작성 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  create(
    @Param('postId') postId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: any,
  ) {
    return this.commentsService.create(postId, createCommentDto, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '댓글 수정',
    description: '자신의 댓글을 수정합니다. 로그인 필요.',
  })
  @ApiParam({ name: 'postId', description: '게시글 ID (UUID)' })
  @ApiParam({ name: 'id', description: '댓글 ID (UUID)' })
  @ApiBody({ type: UpdateCommentDto })
  @ApiResponse({ status: 200, description: '댓글 수정 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '수정 권한 없음' })
  update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Req() req: any,
  ) {
    return this.commentsService.update(id, updateCommentDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '댓글 삭제',
    description: '자신의 댓글을 삭제합니다. 로그인 필요.',
  })
  @ApiParam({ name: 'postId', description: '게시글 ID (UUID)' })
  @ApiParam({ name: 'id', description: '댓글 ID (UUID)' })
  @ApiResponse({ status: 200, description: '댓글 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '삭제 권한 없음' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.commentsService.remove(id, req.user.id);
  }
}

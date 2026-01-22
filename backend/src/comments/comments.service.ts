import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
  ) {}

  async findAllByPostId(postId: string): Promise<Comment[]> {
    return await this.commentsRepository.find({
      where: { postId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async create(
    postId: string,
    createCommentDto: CreateCommentDto,
    userId: string,
  ): Promise<Comment> {
    const comment = this.commentsRepository.create({
      ...createCommentDto,
      postId,
      userId,
    });
    const savedComment = await this.commentsRepository.save(comment);
    // user relation을 포함해서 반환
    const createdComment = await this.commentsRepository.findOne({
      where: { id: savedComment.id },
      relations: ['user'],
    });
    
    if (!createdComment) {
      throw new NotFoundException(`Comment with id ${savedComment.id} not found`);
    }
    
    return createdComment;
  }

  async update(
    id: string,
    updateCommentDto: UpdateCommentDto,
    userId: string,
  ): Promise<Comment> {
    const comment = await this.commentsRepository.findOne({ where: { id } });

    if (!comment) {
      throw new NotFoundException(`Comment with id ${id} not found`);
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    Object.assign(comment, updateCommentDto);
    const savedComment = await this.commentsRepository.save(comment);
    // user relation을 포함해서 반환
    const updatedComment = await this.commentsRepository.findOne({
      where: { id: savedComment.id },
      relations: ['user'],
    });
    
    if (!updatedComment) {
      throw new NotFoundException(`Comment with id ${savedComment.id} not found`);
    }
    
    return updatedComment;
  }

  async remove(id: string, userId: string): Promise<void> {
    const comment = await this.commentsRepository.findOne({ where: { id } });

    if (!comment) {
      throw new NotFoundException(`Comment with id ${id} not found`);
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentsRepository.remove(comment);
  }
}

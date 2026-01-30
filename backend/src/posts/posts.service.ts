import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
  ) {}

  async findAll(options?: { page?: number; limit?: number }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    // QueryBuilder를 사용하여 댓글 개수 포함
    const queryBuilder = this.postsRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .loadRelationCountAndMap('post._count.comments', 'post.comments')
      .orderBy('post.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [posts, total] = await queryBuilder.getManyAndCount();

    // loadRelationCountAndMap이 제대로 작동하지 않을 수 있으므로 직접 댓글 개수 조회
    // 한 번의 쿼리로 모든 게시글의 댓글 개수를 가져옴 (성능 최적화)
    const postIds = posts.map((post) => post.id);
    const commentCountsMap: Record<string, number> = {};

    if (postIds.length > 0) {
      const commentCounts = await this.postsRepository.manager
        .createQueryBuilder()
        .select('post_id', 'postId')
        .addSelect('COUNT(*)', 'count')
        .from('comments', 'comment')
        .where('comment.post_id IN (:...postIds)', { postIds })
        .groupBy('comment.post_id')
        .getRawMany() as Array<{ postId: string; count: string }>;

      commentCounts.forEach((item) => {
        commentCountsMap[item.postId] = parseInt(item.count, 10);
      });
    }

    // 각 게시글에 댓글 개수 추가
    const postsWithCount = posts.map((post) => ({
      ...post,
      _count: {
        comments: commentCountsMap[post.id] || 0,
      },
    }));

    return {
      posts: postsWithCount,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['user', 'comments', 'comments.user'],
    });

    if (!post) {
      throw new NotFoundException(`Post with id ${id} not found`);
    }

    // 조회수 증가
    post.viewCount += 1;
    await this.postsRepository.save(post);

    return post;
  }

  async create(createPostDto: CreatePostDto, userId: string): Promise<Post> {
    const post = this.postsRepository.create({
      ...createPostDto,
      userId,
    });
    return await this.postsRepository.save(post);
  }

  async update(
    id: string,
    updatePostDto: UpdatePostDto,
    userId: string,
  ): Promise<Post> {
    const post = await this.postsRepository.findOne({ where: { id } });

    if (!post) {
      throw new NotFoundException(`Post with id ${id} not found`);
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    Object.assign(post, updatePostDto);
    return await this.postsRepository.save(post);
  }

  async remove(id: string, userId: string): Promise<void> {
    const post = await this.postsRepository.findOne({ where: { id } });

    if (!post) {
      throw new NotFoundException(`Post with id ${id} not found`);
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.postsRepository.remove(post);
  }
}

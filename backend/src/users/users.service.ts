import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: {
    kakaoId: string;
    nickname: string;
    profileImage?: string;
  }): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return await this.usersRepository.save(user);
  }

  /** 일반 회원가입 (아이디·비밀번호·이메일·닉네임) */
  async createLocal(data: {
    loginId: string;
    password: string;
    email: string;
    nickname: string;
  }): Promise<User> {
    const existing = await this.findByLoginId(data.loginId);
    if (existing) {
      throw new ConflictException('이미 사용 중인 아이디입니다.');
    }
    const emailUser = await this.findByEmail(data.email);
    if (emailUser) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }
    const hashed = await bcrypt.hash(data.password, 10);
    const user = this.usersRepository.create({
      loginId: data.loginId,
      password: hashed,
      email: data.email,
      nickname: data.nickname,
      kakaoId: null,
      profileImage: null,
    });
    return await this.usersRepository.save(user);
  }

  async findByKakaoId(kakaoId: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { kakaoId } });
  }

  async findByLoginId(loginId: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { loginId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { email } });
  }

  async findOne(id: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { id } });
  }

  /** 아이디·비밀번호 검증 (로그인용). 성공 시 User, 실패 시 null */
  async validateLocalUser(loginId: string, plainPassword: string): Promise<User | null> {
    const user = await this.findByLoginId(loginId);
    if (!user || !user.password) return null;
    const ok = await bcrypt.compare(plainPassword, user.password);
    return ok ? user : null;
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    await this.usersRepository.update(id, updateData);
    const updatedUser = await this.findOne(id);
    if (!updatedUser) {
      throw new Error('User not found');
    }
    return updatedUser;
  }
}

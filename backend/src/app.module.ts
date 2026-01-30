import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { BrandsModule } from './brands/brands.module';
import { MenuItemsModule } from './menu-items/menu-items.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { PostsModule } from './posts/posts.module';
import { CommentsModule } from './comments/comments.module';
import { AuthModule } from './auth/auth.module';
import { StoresModule } from './stores/stores.module';
import { AdminModule } from './admin/admin.module';
import { FavoritesModule } from './favorites/favorites.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const schema = configService.get<string>('DB_SCHEMA') ?? 'public';
        // 스키마가 public이 아닐 때: search_path에 public 포함 → public.uuid_generate_v4() 사용 가능
        const extra: { options: string } | undefined =
          schema !== 'public'
            ? { options: `-c search_path="${schema}",public` }
            : undefined;
        return {
          type: 'postgres',
          host: configService.get('DB_HOST'),
          port: configService.get('DB_PORT'),
          username: configService.get('DB_USERNAME'),
          password: configService.get('DB_PASSWORD'),
          database: configService.get('DB_DATABASE'),
          schema,
          ssl:
            configService.get('DB_SSL') === 'true'
              ? { rejectUnauthorized: false }
              : false,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: configService.get('NODE_ENV') === 'development',
          logging: configService.get('NODE_ENV') === 'development',
          ...(extra && { extra }),
        };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    BrandsModule,
    MenuItemsModule,
    NutritionModule,
    PostsModule,
    CommentsModule,
    AuthModule,
    StoresModule,
    AdminModule,
    FavoritesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { AuthService } from "@/core/application/services/AuthService";
import { CategoryService } from "@/core/application/services/CategoryService";
import { ChatService } from "@/core/application/services/ChatService";
import { NotificationService } from "@/core/application/services/NotificationService";
import { ProductService } from "@/core/application/services/ProductService";
import { ProfileService } from "@/core/application/services/ProfileService";
import { SliderAdService } from "@/core/application/services/SliderAdService";
import type { IAuthRepository } from "@/core/domain/repositories/IAuthRepository";
import type { ICategoryRepository } from "@/core/domain/repositories/ICategoryRepository";
import type { IChatRepository } from "@/core/domain/repositories/IChatRepository";
import type { INotificationRepository } from "@/core/domain/repositories/INotificationRepository";
import type { IPreferencesRepository } from "@/core/domain/repositories/IPreferencesRepository";
import type { IProductRepository } from "@/core/domain/repositories/IProductRepository";
import type { IProfileRepository } from "@/core/domain/repositories/IProfileRepository";
import type { ISliderAdRepository } from "@/core/domain/repositories/ISliderAdRepository";
import type { IAuthService } from "@/core/domain/services/IAuthService";
import type { ICategoryService } from "@/core/domain/services/ICategoryService";
import type { IChatService } from "@/core/domain/services/IChatService";
import type { INotificationService } from "@/core/domain/services/INotificationService";
import type { IProductService } from "@/core/domain/services/IProductService";
import type { IProfileService } from "@/core/domain/services/IProfileService";
import type { ISliderAdService } from "@/core/domain/services/ISliderAdService";
import { HttpClient } from "../api/HttpClient";
import { ApiAuthRepository } from "../repositories/ApiAuthRepository";
import { ApiCategoryRepository } from "../repositories/ApiCategoryRepository";
import { ApiChatRepository } from "../repositories/ApiChatRepository";
import { ApiNotificationRepository } from "../repositories/ApiNotificationRepository";
import { ApiProductRepository } from "../repositories/ApiProductRepository";
import { ApiProfileRepository } from "../repositories/ApiProfileRepository";
import { ApiSliderAdRepository } from "../repositories/ApiSliderAdRepository";
import { PreferencesRepository } from "../repositories/PreferencesRepository";

class Container {
  private instances = new Map<string, unknown>();

  constructor() {
    const httpClient = new HttpClient();

    const productRepository = new ApiProductRepository(httpClient);
    const productService = new ProductService(productRepository);

    const authRepository = new ApiAuthRepository(httpClient);
    const authService = new AuthService(authRepository);

    const profileRepository = new ApiProfileRepository(httpClient);
    const profileService = new ProfileService(profileRepository);

    const notificationRepository = new ApiNotificationRepository(httpClient);
    const notificationService = new NotificationService(notificationRepository);

    const sliderAdRepository = new ApiSliderAdRepository(httpClient);
    const sliderAdService = new SliderAdService(sliderAdRepository);

    const categoryRepository = new ApiCategoryRepository(httpClient);
    const categoryService = new CategoryService(categoryRepository);

    const chatRepository = new ApiChatRepository(httpClient);
    const chatService = new ChatService(chatRepository);

    const preferencesRepository = new PreferencesRepository();

    this.register<HttpClient>("httpClient", httpClient);
    this.register<IProductRepository>("productRepository", productRepository);
    this.register<IProductService>("productService", productService);
    this.register<IAuthRepository>("authRepository", authRepository);
    this.register<IAuthService>("authService", authService);
    this.register<IProfileRepository>("profileRepository", profileRepository);
    this.register<IProfileService>("profileService", profileService);
    this.register<INotificationRepository>(
      "notificationRepository",
      notificationRepository,
    );
    this.register<INotificationService>(
      "notificationService",
      notificationService,
    );
    this.register<ISliderAdRepository>("sliderAdRepository", sliderAdRepository);
    this.register<ISliderAdService>("sliderAdService", sliderAdService);
    this.register<ICategoryRepository>("categoryRepository", categoryRepository);
    this.register<ICategoryService>("categoryService", categoryService);
    this.register<IChatRepository>("chatRepository", chatRepository);
    this.register<IChatService>("chatService", chatService);
    this.register<IPreferencesRepository>(
      "preferencesRepository",
      preferencesRepository,
    );
  }

  register<T>(key: string, instance: T): void {
    this.instances.set(key, instance);
  }

  resolve<T>(key: string): T {
    const instance = this.instances.get(key);
    if (!instance) {
      throw new Error(
        `[DI Container] No instance registered for key: "${key}"`,
      );
    }
    return instance as T;
  }
}

const container = new Container();
export default container;

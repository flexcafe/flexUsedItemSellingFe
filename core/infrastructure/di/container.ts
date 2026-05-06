import { HttpClient } from "../api/HttpClient";
import { ApiProductRepository } from "../repositories/ApiProductRepository";
import { ApiAuthRepository } from "../repositories/ApiAuthRepository";
import { ApiProfileRepository } from "../repositories/ApiProfileRepository";
import { PreferencesRepository } from "../repositories/PreferencesRepository";
import { ProductService } from "@/core/application/services/ProductService";
import { AuthService } from "@/core/application/services/AuthService";
import { ProfileService } from "@/core/application/services/ProfileService";
import type { IProductRepository } from "@/core/domain/repositories/IProductRepository";
import type { IProductService } from "@/core/domain/services/IProductService";
import type { IAuthRepository } from "@/core/domain/repositories/IAuthRepository";
import type { IAuthService } from "@/core/domain/services/IAuthService";
import type { IProfileRepository } from "@/core/domain/repositories/IProfileRepository";
import type { IProfileService } from "@/core/domain/services/IProfileService";
import type { IPreferencesRepository } from "@/core/domain/repositories/IPreferencesRepository";

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

    const preferencesRepository = new PreferencesRepository();

    this.register<HttpClient>("httpClient", httpClient);
    this.register<IProductRepository>("productRepository", productRepository);
    this.register<IProductService>("productService", productService);
    this.register<IAuthRepository>("authRepository", authRepository);
    this.register<IAuthService>("authService", authService);
    this.register<IProfileRepository>("profileRepository", profileRepository);
    this.register<IProfileService>("profileService", profileService);
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
      throw new Error(`[DI Container] No instance registered for key: "${key}"`);
    }
    return instance as T;
  }
}

const container = new Container();
export default container;

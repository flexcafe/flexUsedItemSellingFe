import { createContext, useContext, type ReactNode } from "react";

import type { IPreferencesRepository } from "@/core/domain/repositories/IPreferencesRepository";
import type { IAuthService } from "@/core/domain/services/IAuthService";
import type { ICategoryService } from "@/core/domain/services/ICategoryService";
import type { IChatService } from "@/core/domain/services/IChatService";
import type { IClientReportService } from "@/core/domain/services/IClientReportService";
import type { INotificationService } from "@/core/domain/services/INotificationService";
import type { IProductService } from "@/core/domain/services/IProductService";
import type { IProfileService } from "@/core/domain/services/IProfileService";
import type { ISliderAdService } from "@/core/domain/services/ISliderAdService";

export interface AppServices {
  authService: IAuthService;
  productService: IProductService;
  profileService: IProfileService;
  notificationService: INotificationService;
  sliderAdService: ISliderAdService;
  categoryService: ICategoryService;
  chatService: IChatService;
  clientReportService: IClientReportService;
  preferencesRepository: IPreferencesRepository;
}

const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({
  services,
  children,
}: {
  services: AppServices;
  children: ReactNode;
}) {
  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices(): AppServices {
  const ctx = useContext(ServicesContext);
  if (!ctx) {
    throw new Error("useServices must be used within a ServicesProvider");
  }
  return ctx;
}

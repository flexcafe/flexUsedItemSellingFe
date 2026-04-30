import { createContext, useContext, type ReactNode } from "react";

import type { IAuthService } from "@/core/domain/services/IAuthService";
import type { IProductService } from "@/core/domain/services/IProductService";
import type { IPreferencesRepository } from "@/core/domain/repositories/IPreferencesRepository";

export interface AppServices {
  authService: IAuthService;
  productService: IProductService;
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


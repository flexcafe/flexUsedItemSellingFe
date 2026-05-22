export type FraudType =
  | "FAKE_PRODUCT"
  | "FAKE_PAYMENT"
  | "HARASSMENT"
  | "OTHER";

export const CLIENT_FRAUD_TYPES: readonly FraudType[] = [
  "FAKE_PRODUCT",
  "FAKE_PAYMENT",
  "HARASSMENT",
  "OTHER",
];

export interface SuggestionInput {
  nickname: string;
  name: string;
  details: string;
}

export interface FraudReportInput {
  fraudUserName: string;
  reportedReferralCode: string;
  tradeDate: string;
  tradeTime: string;
  fraudType: FraudType;
  details: string;
}

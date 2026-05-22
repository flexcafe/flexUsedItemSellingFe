export type SuggestionStatus = string;
export type FraudReportStatus = string;

export interface ClientSuggestion {
  id: string;
  userId: string | null;
  userNickname: string | null;
  userPhone: string | null;
  nickname: string;
  name: string;
  details: string;
  status: SuggestionStatus;
  pointsAwarded: number;
  adminNote: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientFraudReport {
  id: string;
  reporterId: string | null;
  reporterNickname: string | null;
  reporterPhone: string | null;
  reportedUserId: string | null;
  reportedUserNickname: string | null;
  reportedUserPhone: string | null;
  fraudUserName: string;
  reportedReferralCode: string;
  tradeDate: string | null;
  tradeTime: string | null;
  fraudType: string;
  details: string;
  status: FraudReportStatus;
  adminNote: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  reportedUserIsBanned: boolean;
  createdAt: string;
  updatedAt: string;
}

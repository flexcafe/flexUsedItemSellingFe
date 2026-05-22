export interface ClientSuggestionDto {
  id?: string | null;
  userId?: string | null;
  userNickname?: string | null;
  userPhone?: string | null;
  nickname?: string | null;
  name?: string | null;
  details?: string | null;
  status?: string | null;
  pointsAwarded?: number | string | null;
  adminNote?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ClientFraudReportDto {
  id?: string | null;
  reporterId?: string | null;
  reporterNickname?: string | null;
  reporterPhone?: string | null;
  reportedUserId?: string | null;
  reportedUserNickname?: string | null;
  reportedUserPhone?: string | null;
  fraudUserName?: string | null;
  reportedReferralCode?: string | null;
  tradeDate?: string | null;
  tradeTime?: string | null;
  fraudType?: string | null;
  details?: string | null;
  status?: string | null;
  adminNote?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  reportedUserIsBanned?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

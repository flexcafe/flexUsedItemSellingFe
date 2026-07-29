import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { UserRankTier } from "@/core/domain/entities/ProfileRewards";
import type { AppLocale } from "@/core/domain/types/locale";
import type {
  ProductCondition,
  ProductStatus,
} from "@/core/domain/types/product";
import { useServices } from "./ServicesProvider";

type Dictionary = Record<string, Record<AppLocale, string>>;

/** Second line under category name (parenthetical / locale hint). Matched by slug substring. */
const CATEGORY_SECONDARY: {
  match: (slug: string) => boolean;
  labels: Record<AppLocale, string>;
}[] = [
  {
    match: (s) =>
      /mobile|laptop|computer|phone|모바일|노트북/i.test(s) ||
      s.includes("mobile") ||
      s.includes("laptop"),
    labels: {
    ko: "(모바일&노트북)",
    my: "(မိုဘိုင်းနှင့် လက်ပ်တော့ပ်)",
    zh: "(手机与笔记本)",
    en: "(Mobile & laptops)",
  },
  },
  {
    match: (s) =>
      /house|home|kitchen|가정|household/i.test(s) || s.includes("house"),
    labels: {
    ko: "(가정용품)",
    my: "(အိမ်သုံးပစ္စည်း)",
    zh: "(家居用品)",
    en: "(Household)",
  },
  },
  {
    match: (s) =>
      /book|study|education|student|책|학생/i.test(s) || s.includes("book"),
    labels: {
    ko: "(책&학생용품)",
    my: "(စာအုပ်နှင့် ကျောင်းသုံးပစ္စည်း)",
    zh: "(图书与学习用品)",
    en: "(Books & school)",
  },
  },
  {
    match: (s) =>
      /part[-\s]?time|job|work|일자리|briefcase/i.test(s) || s.includes("part"),
    labels: {
    ko: "(일자리)",
    my: "(အလုပ်အကိုင်)",
    zh: "(兼职/工作)",
    en: "(Jobs)",
  },
  },
  {
    match: (s) =>
      /hous|rent|dorm|apartment|주택|기숙사/i.test(s) || s.includes("housing"),
    labels: {
    ko: "(주택·기숙사)",
    my: "(အိမ်ခြံမြေ·နေထိုင်ရာ)",
    zh: "(住房/宿舍)",
    en: "(Housing & dorms)",
  },
  },
  {
    match: (s) =>
      /promo|gift|share|event|프로모션|나눔/i.test(s) ||
      s.includes("promotion"),
    labels: {
    ko: "(프로모션·나눔)",
    my: "(ပရိုမိုးရှင်း·မျှဝေခြင်း)",
    zh: "(促销/分享)",
    en: "(Promos & sharing)",
  },
  },
  {
    match: (s) =>
      /look|want|seek|구해|searching/i.test(s) || s.includes("looking"),
    labels: {
    ko: "(구해요)",
    my: "(ရှာဖွေနေသည်)",
    zh: "(求购)",
    en: "(Looking for)",
  },
  },
  {
    match: (s) =>
      /electronic|gadget|가전|디지털/i.test(s) || s.includes("electronic"),
    labels: {
    ko: "(전자·가젯)",
    my: "(အီလက်ထရောနစ်)",
    zh: "(电子数码)",
    en: "(Electronics)",
  },
  },
];

function resolveCategorySecondLine(slug: string, locale: AppLocale): string {
  const s = (slug ?? "").trim().toLowerCase();
  if (!s) return "";
  for (const row of CATEGORY_SECONDARY) {
    if (row.match(s)) return row.labels[locale];
  }
  return "";
}

const DICT: Dictionary = {
  appName: {
    ko: "Flex Used Market",
    my: "Flex Used Market",
    zh: "Flex Used Market",
    en: "Flex Used Market",
  },
  signInSubtitle: {
    ko: "전화번호 또는 이메일로 로그인하세요",
    my: "ဖုန်းနံပါတ် သို့မဟုတ် အီးမေးလ်ဖြင့် ဝင်ရောက်ပါ",
    zh: "使用手机号或邮箱登录",
    en: "Sign in with your phone number or email",
  },
  phone: {
    ko: "전화번호",
    my: "ဖုန်းနံပါတ်",
    zh: "手机号",
    en: "Phone number",
  },
  facebookId: { ko: "페이스북 ID", my: "ဖေ့စ်ဘွတ် ID", zh: "Facebook ID", en: "Facebook ID" },
  password: { ko: "비밀번호", my: "စကားဝှက်", zh: "密码", en: "Password" },
  show: { ko: "보기", my: "ပြရန်", zh: "显示", en: "Show" },
  hide: { ko: "숨기기", my: "ဖျောက်ရန်", zh: "隐藏", en: "Hide" },
  showPassword: { ko: "비밀번호 보기", my: "စကားဝှက် ပြရန်", zh: "显示密码", en: "Show password" },
  hidePassword: {
    ko: "비밀번호 숨기기",
    my: "စကားဝှက် ဖျောက်ရန်",
    zh: "隐藏密码",
    en: "Hide password",
  },
  signIn: {
    ko: "로그인",
    my: "ဝင်မည်",
    zh: "登录",
    en: "Sign in",
  },
  forgotPassword: {
    ko: "비밀번호 찾기",
    my: "စကားဝှက် မေ့နေပါသလား",
    zh: "忘记密码",
    en: "Forgot password?",
  },
  forgotPasswordTitle: {
    ko: "비밀번호 재설정",
    my: "စကားဝှက် ပြန်လည်သတ်မှတ်ရန်",
    zh: "重置密码",
    en: "Reset password",
  },
  forgotPasswordSubtitle: {
    ko: "등록된 전화번호 또는 이메일로 6자리 인증코드를 받습니다.",
    my: "မှတ်ပုံတင်ထားသော ဖုန်းနံပါတ် သို့မဟုတ် အီးမေးလ်သို့ ကုဒ် ၆ လုံး ပို့ပေးပါမည်။",
    zh: "将向注册手机号或邮箱发送 6 位验证码。",
    en: "We'll send a 6-digit code to your registered phone number or email.",
  },
  forgotPasswordSendOtp: {
    ko: "인증번호 받기",
    my: "OTP ပို့မည်",
    zh: "获取验证码",
    en: "Get verification code",
  },
  forgotPasswordResetStepHint: {
    ko: "받은 6자리 코드와 새 비밀번호를 입력하세요.",
    my: "ရရှိသော ကုဒ် ၆ လုံးနှင့် စကားဝှက်အသစ်ကို ရိုက်ထည့်ပါ။",
    zh: "请输入收到的 6 位验证码和新密码。",
    en: "Enter the 6-digit code you received and your new password.",
  },
  forgotPasswordResetSubmit: {
    ko: "비밀번호 변경",
    my: "စကားဝှက် ပြောင်းမည်",
    zh: "更新密码",
    en: "Update password",
  },
  forgotPasswordOtpSent: {
    ko: "비밀번호 재설정 인증번호가 전송되었습니다.",
    my: "စကားဝှက် ပြန်လည်သတ်မှတ်ရန် OTP ပို့ပြီးပါပြီ။",
    zh: "密码重置验证码已发送。",
    en: "Password reset code has been sent.",
  },
  forgotPasswordSuccess: {
    ko: "비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요.",
    my: "စကားဝှက် ပြောင်းပြီးပါပြီ။ အသစ်ဖြင့် ဝင်ရောက်ပါ။",
    zh: "密码已更新，请使用新密码登录。",
    en: "Password updated. Please sign in with your new password.",
  },
  forgotPasswordSuccessTitle: {
    ko: "완료",
    my: "အောင်မြင်သည်",
    zh: "成功",
    en: "Done",
  },
  forgotPasswordDeactivated: {
    ko: "계정이 비활성화되었거나 정지되었습니다.",
    my: "အကောင့် ပိတ်ထားသည် သို့မဟုတ် ပိတ်ပင်ထားသည်။",
    zh: "账号已停用或被封禁。",
    en: "This account is deactivated or suspended.",
  },
  forgotPasswordAdminAccount: {
    ko: "관리자 계정은 관리자 대시보드를 이용하세요.",
    my: "အက်ဒမင်အကောင့် — admin dashboard သုံးပါ။",
    zh: "管理员账号请使用管理后台。",
    en: "Admin accounts should use the admin dashboard.",
  },
  forgotPasswordPhoneNotFound: {
    ko: "등록되지 않은 전화번호 또는 이메일입니다.",
    my: "မှတ်ပုံတင်ထားသော ဖုန်းနံပါတ် သို့မဟုတ် အီးမေးလ် မရှိပါ။",
    zh: "该手机号或邮箱未注册。",
    en: "This phone number or email is not registered.",
  },
  forgotPasswordRateLimit: {
    ko: "요청이 너무 많습니다. 잠시 후 다시 시도하세요.",
    my: "တောင်းဆိုမှု များလွန်းသည်။ ခဏနေ၍ ပြန်ကြိုးစားပါ။",
    zh: "请求过于频繁，请稍后再试。",
    en: "Too many requests. Please try again later.",
  },
  forgotPasswordInvalidOtp: {
    ko: "인증번호가 올바르지 않거나 만료되었습니다.",
    my: "OTP မမှန်ကန်ပါ သို့မဟုတ် သက်တမ်းကုန်ပါပြီ။",
    zh: "验证码无效或已过期。",
    en: "Invalid or expired verification code.",
  },
  forgotPasswordMismatch: {
    ko: "비밀번호가 일치하지 않거나 인증 요청이 없습니다.",
    my: "စကားဝှက် မကိုက်ညီပါ သို့မဟုတ် OTP တောင်းဆိုမှု မရှိပါ။",
    zh: "密码不一致或尚未请求重置验证码。",
    en: "Passwords do not match.",
  },
  newPassword: {
    ko: "새 비밀번호",
    my: "စကားဝှက်အသစ်",
    zh: "新密码",
    en: "New password",
  },
  newPasswordPlaceholder: {
    ko: "새 비밀번호 입력",
    my: "စကားဝှက်အသစ် ရိုက်ထည့်ပါ",
    zh: "输入新密码",
    en: "New password",
  },
  phoneMode: {
    ko: "전화번호",
    my: "ဖုန်း",
    zh: "手机号",
    en: "Phone",
  },
  facebookMode: { ko: "페이스북", my: "ဖေ့စ်ဘွတ်", zh: "Facebook", en: "Facebook" },
  loginFailedTitle: {
    ko: "로그인 실패",
    my: "ဝင်ရောက်မှု မအောင်မြင်ပါ",
    zh: "登录失败",
    en: "Sign-in failed",
  },
  termsTitle: {
    ko: "이용약관",
    my: "အသုံးပြုမှု စည်းမျဉ်း",
    zh: "使用条款",
    en: "Terms of Use",
  },
  /** Stable BE keys (`TERMS_OF_USE_TITLE` / `TERMS_OF_USE`) — same pattern as `noti.*`. */
  TERMS_OF_USE_TITLE: {
    ko: "이용약관",
    my: "အသုံးပြုမှု စည်းမျဉ်း",
    zh: "使用条款",
    en: "Terms of Use",
  },
  TERMS_OF_USE: {
    ko: `FLEX USED ITEM MARKETPLACE — 이용약관 (EULA)

최종 업데이트: 2026년 7월
버전 {version}

계정을 생성하거나 로그인하거나 본 앱을 사용하는 경우, 본 이용약관에 동의한 것으로 간주됩니다.

1. 불쾌한 콘텐츠 및 악용 사용자에 대한 무관용
불쾌한 콘텐츠와 악용 사용자에 대해 무관용 정책을 적용합니다. 불법적이거나, 혐오·괴롭힘·성적 노골적·폭력적·위협적·차별적·사기성·스팸 또는 그 밖의 불쾌한 콘텐츠를 게시·공유·전송·업로드해서는 안 됩니다. 본 정책을 위반하는 계정은 사전 통지 없이 정지되거나 영구 퇴출될 수 있습니다.

2. 사용자 생성 콘텐츠
리스팅, 채팅 메시지, 리뷰, 프로필 정보 및 제출하는 기타 자료는 사용자 생성 콘텐츠입니다. 귀하의 콘텐츠와 다른 사용자와의 상호작용에 대한 책임은 전적으로 귀하에게 있습니다.

3. 콘텐츠 필터링
불쾌한 콘텐츠를 앱에 표시되기 전후에 감지하고 차단하기 위해 자동 필터링과 사람 검토를 사용합니다. 필터링된 콘텐츠는 거부되거나 삭제될 수 있습니다.

4. 불쾌한 콘텐츠 신고
본 약관을 위반하는 리스팅, 메시지, 리뷰 또는 프로필은 앱 내 신고 기능을 사용해 신고해야 합니다. 신고 내용은 운영팀이 검토합니다.

5. 악용 사용자 차단
다른 사용자를 차단할 수 있습니다. 차단 시 해당 사용자의 콘텐츠가 즉시 피드에서 제거되고 추가 연락이 차단됩니다. 차단은 운영팀에도 전달되어 조사가 이뤄질 수 있습니다.

6. 24시간 이내 조치
불쾌한 콘텐츠 신고에 대해 24시간 이내에 조치합니다. 신고가 확인되면 해당 콘텐츠를 삭제하고, 제공한 사용자를 퇴출(차단)할 수 있습니다.

7. 계정 해지
불쾌한 콘텐츠를 게시하거나 다른 사용자를 괴롭히거나 플랫폼을 악용하는 계정은 정지 또는 영구 차단될 수 있습니다.

8. 문의
안전 관련 문제는 앱 내 신고 기능을 이용하거나 앱스토어 등록 정보에 안내된 지원 채널로 연락해 주세요.

동의 / 수락을 누르면, 불쾌한 콘텐츠 및 악용 사용자에 대한 무관용 정책을 포함한 본 약관을 읽고 동의한 것으로 확인됩니다.`,
    my: `FLEX USED ITEM MARKETPLACE — အသုံးပြုမှု စည်းမျဉ်း (EULA)

နောက်ဆုံး အပ်ဒိတ်: ဇူလိုင် ၂၀၂၆
ဗားရှင်း {version}

အကောင့်ဖန်တီးခြင်း၊ ဝင်ရောက်ခြင်း သို့မဟုတ် ဤအက်ပ်ကို အသုံးပြုခြင်းဖြင့် ဤအသုံးပြုမှု စည်းမျဉ်းများကို သဘောတူသည်ဟု မှတ်ယူပါသည်။

1. မလိုလားအပ်သော အကြောင်းအရာနှင့် အလွဲသုံးစားသူများအတွက် လုံးဝ လက်မခံ
မလိုလားအပ်သော အကြောင်းအရာနှင့် အလွဲသုံးစားသူများကို လုံးဝ လက်မခံပါ။ တရားမဝင်၊ မုန်းတီးမှု၊ နှောင့်ယှက်မှု၊ လိင်ပိုင်းဆိုင်ရာ ထင်ရှား၊ အကြမ်းဖက်၊ ခြိမ်းခြောက်၊ ခွဲခြားဆက်ဆံ၊ လိမ်လည်၊ စပမ်း သို့မဟုတ် အခြား မလိုလားအပ်သော အကြောင်းအရာများကို တင်ခြင်း၊ မျှဝေခြင်း၊ ပို့ခြင်း၊ အပ်လုဒ်လုပ်ခြင်း မပြုရပါ။ ဤမူဝါဒကို ချိုးဖောက်သော အကောင့်များကို ကြိုတင်အသိပေးခြင်းမရှိဘဲ ဆိုင်းငံ့ခြင်း သို့မဟုတ် အပြီးအပိုင် ထုတ်ပယ်နိုင်ပါသည်။

2. အသုံးပြုသူ ဖန်တီးသော အကြောင်းအရာ
စာရင်းများ၊ ချတ်စာများ၊ သုံးသပ်ချက်များ၊ ပရိုဖိုင်အချက်အလက်နှင့် သင်တင်သွင်းသော အခြားပစ္စည်းများသည် အသုံးပြုသူ ဖန်တီးသော အကြောင်းအရာဖြစ်သည်။ သင့်အကြောင်းအရာနှင့် အခြားအသုံးပြုသူများနှင့် အပြန်အလှန်ဆက်ဆံမှုအတွက် သင်သာလျှင် တာဝန်ရှိသည်။

3. အကြောင်းအရာ စစ်ထုတ်ခြင်း
မလိုလားအပ်သော အကြောင်းအရာကို အက်ပ်တွင် ပေါ်မလာမီ သို့မဟုတ် ပေါ်ပြီးနောက် ရှာဖွေပိတ်ရန် အလိုအလျောက် စစ်ထုတ်ခြင်းနှင့် လူကြည့်ရှု စစ်ဆေးခြင်းကို အသုံးပြုသည်။ စစ်ထုတ်ထားသော အကြောင်းအရာကို ငြင်းပယ်ခြင်း သို့မဟုတ် ဖယ်ရှားနိုင်သည်။

4. မလိုလားအပ်သော အကြောင်းအရာ တိုင်ကြားခြင်း
ဤစည်းမျဉ်းများကို ချိုးဖောက်သော စာရင်းများ၊ စာများ၊ သုံးသပ်ချက်များ သို့မဟုတ် ပရိုဖိုင်များကို အက်ပ်အတွင်း တိုင်ကြားမှု လုပ်ဆောင်ချက်ဖြင့် အလံတင်ရပါမည်။ တိုင်ကြားမှုများကို ကျွန်ုပ်တို့၏ အဖွဲ့က စစ်ဆေးသည်။

5. အလွဲသုံးစားသူ ပိတ်ခြင်း
အခြားအသုံးပြုသူများကို ပိတ်နိုင်သည်။ ပိတ်လိုက်သည်နှင့် ထိုအသုံးပြုသူ၏ အကြောင်းအရာသည် သင့်ဖိဒ်မှ ချက်ချင်း ပျောက်သွားပြီး ထပ်မံ ဆက်သွယ်၍ မရတော့ပါ။ ပိတ်ခြင်းသည် စုံစမ်းစစ်ဆေးရန် ကျွန်ုပ်တို့၏ စည်းကမ်းထိန်းသိမ်းရေးအဖွဲ့ကိုလည်း အသိပေးသည်။

6. ၂၄ နာရီအတွင်း အရေးယူခြင်း
မလိုလားအပ်သော အကြောင်းအရာ တိုင်ကြားမှုများကို ၂၄ နာရီအတွင်း အရေးယူသည်။ တိုင်ကြားမှု အတည်ပြုပါက ချိုးဖောက်သော အကြောင်းအရာကို ဖယ်ရှားပြီး ထိုအကြောင်းအရာ ပေးသူကို ထုတ်ပယ် (ပိတ်) နိုင်သည်။

7. အကောင့် ရပ်ဆိုင်းခြင်း
မလိုလားအပ်သော အကြောင်းအရာတင်ခြင်း၊ အခြားသူများကို နှောင့်ယှက်ခြင်း သို့မဟုတ် ပလက်ဖောင်းကို အလွဲသုံးစားလုပ်သော အကောင့်များကို ဆိုင်းငံ့ခြင်း သို့မဟုတ် အပြီးအပိုင် ပိတ်နိုင်သည်။

8. ဆက်သွယ်ရန်
ဘေးကင်းရေးဆိုင်ရာ ကိစ္စများအတွက် အက်ပ်အတွင်း တိုင်ကြားမှုကို အသုံးပြုပါ သို့မဟုတ် အက်ပ်စတိုး စာရင်းတွင် ဖော်ပြထားသော ပံ့ပိုးမှု လမ်းကြောင်းများမှ ဆက်သွယ်ပါ။

သဘောတူသည် / လက်ခံသည် ကို နှိပ်ခြင်းဖြင့် မလိုလားအပ်သော အကြောင်းအရာနှင့် အလွဲသုံးစားသူများအတွက် လုံးဝ လက်မခံမူဝါဒ အပါအဝင် ဤစည်းမျဉ်းများကို ဖတ်ပြီး သဘောတူကြောင်း အတည်ပြုသည်။`,
    zh: `FLEX USED ITEM MARKETPLACE — 使用条款（EULA）

最后更新：2026年7月
版本 {version}

创建账户、登录或使用本应用，即表示您同意本使用条款。

1. 对不当内容和滥用用户零容忍
我们对不当内容和滥用用户采取零容忍政策。您不得发布、分享、发送或上传任何非法、仇恨、骚扰、色情、暴力、威胁、歧视、欺诈、垃圾信息或其他不当内容。违反本政策的账户可能被暂停或永久封禁，恕不另行通知。

2. 用户生成内容
商品信息、聊天消息、评价、个人资料及您提交的其他材料均为用户生成内容。您应对自己的内容以及与其他用户的互动承担全部责任。

3. 内容过滤
我们使用自动过滤和人工审核，在不当内容出现在应用中之前或之后进行检测和拦截。被过滤的内容可能被拒绝或删除。

4. 举报不当内容
您必须使用应用内的举报功能，标记违反本条款的商品、消息、评价或个人资料。举报将由我们的团队审核。

5. 屏蔽滥用用户
您可以屏蔽其他用户。屏蔽后，该用户的内容会立即从您的动态中移除，并阻止进一步联系。屏蔽也会通知我们的审核团队以便调查。

6. 24小时内处理
我们在24小时内对不当内容举报采取行动。举报一经确认，我们将删除违规内容，并可能封禁（驱逐）提供该内容的用户。

7. 账户终止
我们可能暂停或永久封禁发布不当内容、骚扰他人或以其他方式滥用平台的账户。

8. 联系我们
如有安全相关问题，请使用应用内举报功能，或通过应用商店页面所列支持渠道联系我们。

点击“同意 / 接受”，即确认您已阅读并同意本条款，包括对不当内容和滥用用户的零容忍政策。`,
    en: `FLEX USED ITEM MARKETPLACE — TERMS OF USE (EULA)

Last updated: July 2026
Version {version}

By creating an account, logging in, or using this app, you agree to these Terms of Use.

1. NO TOLERANCE FOR OBJECTIONABLE CONTENT OR ABUSIVE USERS
We have zero tolerance for objectionable content or abusive users. You must not post, share, send, or upload any content that is illegal, hateful, harassing, sexually explicit, violent, threatening, discriminatory, fraudulent, spam, or otherwise objectionable. Accounts that violate this policy may be suspended or permanently ejected without notice.

2. USER-GENERATED CONTENT
Listings, chat messages, reviews, profile information, and other materials you submit are user-generated content. You are solely responsible for your content and for your interactions with other users.

3. CONTENT FILTERING
We use automated filtering and human review to detect and block objectionable material before or after it appears in the app. Filtered content may be rejected or removed.

4. REPORTING OBJECTIONABLE CONTENT
You must use the in-app Report feature to flag listings, messages, reviews, or profiles that violate these Terms. Reports are reviewed by our team.

5. BLOCKING ABUSIVE USERS
You may block other users. Blocking immediately removes that user's content from your feed and prevents further contact. Blocking also notifies our moderation team so we can investigate.

6. MODERATION WITHIN 24 HOURS
We act on objectionable content reports within 24 hours. When a report is confirmed, we remove the offending content and may eject (ban) the user who provided it.

7. ACCOUNT TERMINATION
We may suspend or permanently ban accounts that post objectionable content, harass others, or otherwise abuse the platform.

8. CONTACT
For safety concerns, use in-app reporting or contact support through the channels listed in the app store listing.

By tapping Agree / Accept, you confirm that you have read and agree to these Terms, including the zero-tolerance policy for objectionable content and abusive users.`,
  },
  termsSafetyBadge: {
    ko: "안전 정책",
    my: "ဘေးကင်းရေး မူဝါဒ",
    zh: "安全政策",
    en: "Safety policy",
  },
  termsDocumentLabel: {
    ko: "약관 전문",
    my: "စည်းမျဉ်း အပြည့်အစုံ",
    zh: "完整条款",
    en: "Full terms",
  },
  termsScrollHint: {
    ko: "끝까지 스크롤",
    my: "အောက်ထိ ရွှေ့ပါ",
    zh: "请滑到底部",
    en: "Scroll to end",
  },
  termsScrollComplete: {
    ko: "확인 완료",
    my: "ဖတ်ပြီးပါပြီ",
    zh: "已读完",
    en: "Read",
  },
  termsScrollRequiredTitle: {
    ko: "약관을 끝까지 읽어 주세요",
    my: "စည်းမျဉ်းကို အဆုံးထိ ဖတ်ပါ",
    zh: "请先阅读完整条款",
    en: "Please finish reading",
  },
  termsScrollRequiredBody: {
    ko: "동의하기 전에 약관 내용을 끝까지 스크롤해 확인해야 합니다.",
    my: "သဘောတူမီ စည်းမျဉ်းကို အဆုံးထိ ရွှေ့ဖတ်ရပါမည်။",
    zh: "同意前请先滚动并阅读完整条款。",
    en: "Scroll through the full Terms before agreeing.",
  },
  termsHighlightZeroTolerance: {
    ko: "불쾌한 콘텐츠와 악용 사용자에 대해 무관용 정책을 적용합니다.",
    my: "မလိုလားအပ်သော အကြောင်းအရာနှင့် အလွဲသုံးစားသူများကို လုံးဝ လက်မခံပါ။",
    zh: "我们对不当内容和滥用用户采取零容忍政策。",
    en: "Zero tolerance for objectionable content and abusive users.",
  },
  termsHighlightReportBlock: {
    ko: "사용자는 부적절한 콘텐츠를 신고하고 악용 사용자를 차단할 수 있습니다.",
    my: "မသင့်လျော်သော အကြောင်းအရာကို တိုင်ကြားပြီး အလွဲသုံးစားသူကို ပိတ်နိုင်ပါသည်။",
    zh: "用户可举报不当内容并屏蔽滥用用户。",
    en: "You can report objectionable content and block abusive users.",
  },
  termsVersionLabel: {
    ko: "버전",
    my: "ဗားရှင်း",
    zh: "版本",
    en: "Version",
  },
  termsMustAcceptBeforeAuth: {
    ko: "로그인 또는 회원가입 전에 약관에 동의해야 합니다. 불쾌한 콘텐츠와 악용 사용자에 대해 무관용 정책을 적용합니다.",
    my: "ဝင်ရောက်/စာရင်းသွင်းမီ စည်းမျဉ်းကို သဘောတူရပါမည်။ မလိုလားအပ်သော အကြောင်းအရာနှင့် အလွဲသုံးစားသူများကို လုံးဝ လက်မခံပါ။",
    zh: "登录或注册前必须同意条款。我们对不当内容和滥用用户采取零容忍政策。",
    en: "You must agree to the Terms before signing in or registering. We have a zero-tolerance policy for objectionable content and abusive users.",
  },
  termsMustAcceptAgain: {
    ko: "약관이 업데이트되었습니다. 앱을 계속 사용하려면 새 약관에 동의해 주세요.",
    my: "စည်းမျဉ်း အသစ်ရှိပါသည်။ ဆက်အသုံးပြုရန် သဘောတူပါ။",
    zh: "条款已更新。请重新同意后继续使用应用。",
    en: "Terms were updated. Please accept the latest version to continue.",
  },
  termsAgree: {
    ko: "동의",
    my: "သဘောတူသည်",
    zh: "同意",
    en: "Agree",
  },
  termsDisagree: {
    ko: "동의 안 함",
    my: "သဘောမတူ",
    zh: "不同意",
    en: "Disagree",
  },
  termsDisagreeTitle: {
    ko: "약관 미동의",
    my: "စည်းမျဉ်း မသဘောတူပါ",
    zh: "未同意条款",
    en: "Terms not accepted",
  },
  termsDisagreeBody: {
    ko: "약관에 동의하지 않으면 로그인하거나 회원가입할 수 없습니다.",
    my: "စည်းမျဉ်းကို မသဘောတူပါက ဝင်ရောက်/စာရင်းသွင်း၍ မရပါ။",
    zh: "不同意条款将无法登录或注册。",
    en: "You cannot sign in or register without agreeing to the Terms.",
  },
  termsDisagreeAuthenticatedBody: {
    ko: "새 약관에 동의하지 않으면 앱을 사용할 수 없습니다. 로그아웃하시겠습니까?",
    my: "စည်းမျဉ်းအသစ်ကို မသဘောတူပါက အက်ပ်ကို အသုံးပြု၍ မရပါ။ ထွက်မလား။",
    zh: "不同意新条款将无法继续使用。是否退出登录？",
    en: "You cannot use the app without accepting the updated Terms. Sign out?",
  },
  termsStay: {
    ko: "계속 보기",
    my: "ဆက်ကြည့်မည်",
    zh: "继续阅读",
    en: "Keep reading",
  },
  termsSignOut: {
    ko: "로그아웃",
    my: "ထွက်မည်",
    zh: "退出登录",
    en: "Sign out",
  },
  termsLoadFailed: {
    ko: "이용약관을 불러오지 못했습니다",
    my: "စည်းမျဉ်း မရယူနိုင်ပါ",
    zh: "无法加载使用条款",
    en: "Could not load Terms of Use",
  },
  termsLoadFailedHint: {
    ko: "네트워크를 확인한 뒤 다시 시도하세요.",
    my: "ကွန်ရက်ကို စစ်ဆေးပြီး ထပ်မံကြိုးစားပါ။",
    zh: "请检查网络后重试。",
    en: "Check your connection and try again.",
  },
  termsRetry: {
    ko: "다시 시도",
    my: "ပြန်ကြိုးစား",
    zh: "重试",
    en: "Retry",
  },
  termsAcceptFailed: {
    ko: "약관 동의에 실패했습니다. 다시 시도하세요.",
    my: "စည်းမျဉ်း သဘောတူမှု မအောင်မြင်ပါ။ ထပ်မံကြိုးစားပါ။",
    zh: "同意条款失败，请重试。",
    en: "Failed to accept Terms. Please try again.",
  },
  termsRequiredForRegister: {
    ko: "회원가입을 위해 먼저 이용약관에 동의해 주세요.",
    my: "စာရင်းသွင်းရန် အရင် စည်းမျဉ်းကို သဘောတူပါ။",
    zh: "注册前请先同意使用条款。",
    en: "Please agree to the Terms before registering.",
  },
  loginFailedBody: {
    ko: "자격 증명을 확인하고 다시 시도하세요.",
    my: "အထောက်အထားများကို စစ်ဆေးပြီး ပြန်လည်ကြိုးစားပါ။",
    zh: "请检查账号信息后重试。",
    en: "Please check your credentials and try again.",
  },
  invalidRequestTitle: {
    ko: "요청 오류",
    my: "မမှန်ကန်သော တောင်းဆိုမှု",
    zh: "请求无效",
    en: "Invalid request",
  },
  invalidRequestBody: {
    ko: "전화번호 또는 이메일 중 하나만 입력해 다시 시도하세요.",
    my: "ဖုန်းနံပါတ် သို့မဟုတ် အီးမေးလ် တစ်ခုတည်းသာ ထည့်ပြီး ပြန်ကြိုးစားပါ။",
    zh: "请只填写一种登录方式（手机号或邮箱）。",
    en: "Please check your input and try again.",
  },
  invalidCredsBody: {
    ko: "자격 증명이 올바르지 않거나 계정이 비활성화되었습니다.",
    my: "အထောက်အထား မမှန်ကန်ပါ သို့မဟုတ် အကောင့်မသက်ဝင်ပါ။",
    zh: "账号或密码错误，或账号未激活。",
    en: "Invalid credentials.",
  },
  errorTitle: {
    ko: "오류",
    my: "အမှား",
    zh: "错误",
    en: "Error",
  },
  commonLoading: {
    ko: "불러오는 중…",
    my: "ဖွင့်နေသည်…",
    zh: "加载中…",
    en: "Loading…",
  },
  flexLoaderTrade: {
    ko: "거래",
    my: "ရောင်းဝယ်",
    zh: "交易",
    en: "TRADE",
  },
  flexLoaderList: {
    ko: "등록",
    my: "တင်ရန်",
    zh: "上架",
    en: "LIST",
  },
  flexLoaderMeet: {
    ko: "만남",
    my: "တွေ့ဆုံ",
    zh: "面交",
    en: "MEET",
  },
  genericErrorBody: {
    ko: "문제가 발생했습니다. 다시 시도하세요.",
    my: "တစ်ခုခု မှားသွားပါသည်။ ပြန်လည်ကြိုးစားပါ။",
    zh: "出了点问题，请重试。",
    en: "Something went wrong. Please try again.",
  },
  phoneRequired: {
    ko: "전화번호를 입력하세요",
    my: "ဖုန်းနံပါတ် လိုအပ်သည်",
    zh: "请输入手机号",
    en: "Phone number is required",
  },
  phoneInvalid: {
    ko: "올바른 전화번호를 입력하세요",
    my: "မှန်ကန်သော ဖုန်းနံပါတ် ရိုက်ထည့်ပါ",
    zh: "请输入有效的手机号",
    en: "Enter a valid phone number",
  },
  otpInvalid: {
    ko: "6자리 인증번호를 입력하세요",
    my: "ကုဒ် ၆ လုံး ရိုက်ထည့်ပါ",
    zh: "请输入 6 位验证码",
    en: "Enter a valid 6-digit code",
  },
  facebookIdRequired: {
    ko: "Facebook ID를 입력하세요",
    my: "Facebook ID လိုအပ်သည်",
    zh: "请输入 Facebook ID",
    en: "请输入 Facebook ID",
  },
  passwordRequired: {
    ko: "비밀번호를 입력하세요",
    my: "စကားဝှက် လိုအပ်သည်",
    zh: "请输入密码",
    en: "Password is required",
  },

  // Register screen
  signUp: {
    ko: "회원가입",
    my: "စာရင်းသွင်းရန်",
    zh: "注册",
    en: "Sign up",
  },
  signUpCta: { ko: "가입하기", my: "စာရင်းသွင်းမည်", zh: "立即注册", en: "Create account" },
  haveAccount: {
    ko: "이미 계정이 있으신가요?",
    my: "အကောင့်ရှိပြီးလား?",
    zh: "已有账号?",
    en: "Already have an account?",
  },
  noAccount: {
    ko: "계정이 없으신가요?",
    my: "အကောင့်မရှိသေးပါလား?",
    zh: "还没有账号?",
    en: "Don't have an account?",
  },
  registrationMethod: {
    ko: "가입 방법",
    my: "စာရင်းသွင်းနည်း",
    zh: "注册方式",
    en: "Registration method",
  },
  both: {
    ko: "둘다",
    my: "နှစ်ခုလုံး",
    zh: "两者",
    en: "Both",
  },
  phoneOnly: { ko: "전화", my: "ဖုန်းသာ", zh: "仅手机号", en: "Phone only" },
  phoneAndFacebook: {
    ko: "페이스북과 전화번호 모두 필요",
    my: "Facebook နှင့် ဖုန်းနှစ်ခုလိုအပ်သည်",
    zh: "需要 Facebook 与手机号",
    en: "需要 Facebook 与手机号",
  },
  nickname: {
    ko: "닉네임",
    my: "အမည်ခေါ်",
    zh: "昵称",
    en: "Nickname",
  },
  nicknamePlaceholder: {
    ko: "닉네임을 입력하세요",
    my: "အမည်ခေါ်ကို ရိုက်ထည့်ပါ",
    zh: "请输入昵称",
    en: "Enter a nickname",
  },
  check: {
    ko: "확인",
    my: "စစ်ဆေးရန်",
    zh: "检查",
    en: "Check",
  },
  nicknameAvailable: {
    ko: "사용 가능한 닉네임입니다",
    my: "အသုံးပြုနိုင်သော အမည်",
    zh: "可以使用",
    en: "Nickname is available",
  },
  nicknameTooShort: {
    ko: "닉네임은 2자 이상이어야 합니다",
    my: "အမည်သည် စာလုံး၂လုံးအနည်းဆုံးရှိရမည်",
    zh: "昵称至少需要 2 个字符",
    en: "Nickname must be at least 2 characters",
  },
  confirmPassword: {
    ko: "비밀번호 확인",
    my: "စကားဝှက်အတည်ပြုရန်",
    zh: "确认密码",
    en: "Confirm password",
  },
  confirmPasswordPlaceholder: {
    ko: "비밀번호를 다시 입력하세요",
    my: "စကားဝှက်ကို ပြန်လည်ရိုက်ထည့်ပါ",
    zh: "请再次输入密码",
    en: "Confirm password",
  },
  passwordMismatch: {
    ko: "비밀번호가 일치하지 않습니다",
    my: "စကားဝှက်မကိုက်ညီပါ",
    zh: "两次密码不一致",
    en: "Passwords do not match",
  },
  phoneNumber: {
    ko: "전화번호",
    my: "ဖုန်းနံပါတ်",
    zh: "手机号码",
    en: "Phone number",
  },
  phoneNumberPlaceholder: {
    ko: "09-XXXX-XXXX",
    my: "09-XXXX-XXXX",
    zh: "09-XXXX-XXXX",
    en: "Phone number",
  },
  sendCode: {
    ko: "전송",
    my: "ပို့မည်",
    zh: "发送",
    en: "Send",
  },
  emailAddress: { ko: "이메일 주소", my: "အီးမေးလ်လိပ်စာ", zh: "电子邮箱", en: "Email" },
  emailPlaceholder: {
    ko: "example@email.com",
    my: "example@email.com",
    zh: "example@email.com",
    en: "Email address",
  },
  emailInvalid: {
    ko: "올바른 이메일 주소를 입력하세요",
    my: "မှန်ကန်သော အီးမေးလ်ထည့်ပါ",
    zh: "请输入有效的邮箱地址",
    en: "Enter a valid email address",
  },
  kPayRegistration: {
    ko: "K-pay 등록",
    my: "K-pay မှတ်ပုံတင်",
    zh: "K-pay 注册信息",
    en: "K-pay 등록",
  },
  kPayName: {
    ko: "K-pay 등록 이름",
    my: "K-pay မှတ်ပုံတင်အမည်",
    zh: "K-pay 注册姓名",
    en: "K-pay registered name",
  },
  kPayNamePlaceholder: {
    ko: "K-pay에 등록된 이름을 입력하세요",
    my: "K-pay တွင်မှတ်ပုံတင်ထားသော အမည်ကိုထည့်ပါ",
    zh: "请输入 K-pay 注册的姓名",
    en: "Enter the name registered on K-pay",
  },
  kPayPhone: {
    ko: "K-pay 등록 전화번호",
    my: "K-pay မှတ်ပုံတင်ဖုန်း",
    zh: "K-pay 注册手机号",
    en: "K-pay registered phone",
  },
  kPayWarning: {
    ko: "실제 이름과 번호가 K-pay 등록 정보와 다르면 입금 및 출금(대금 및 포인트)이 안됩니다",
    my: "အမည်နှင့်ဖုန်းနံပါတ်သည် K-pay မှတ်ပုံတင်ချက်နှင့်မတူပါက ငွေထည့်/ထုတ် (ငွေနှင့် ပွိုင့်) မလုပ်နိုင်ပါ",
    zh: "若姓名和手机号与 K-pay 登记信息不符，存取款（款项与积分）将无法处理",
    en: "If the name and phone do not match K-pay registration, deposits and withdrawals (payments and points) cannot be processed.",
  },
  gender: {
    ko: "성별",
    my: "ကျား/မ",
    zh: "性别",
    en: "Gender",
  },
  male: { ko: "남자", my: "ကျား", zh: "男", en: "Male" },
  female: { ko: "여자", my: "မ", zh: "女", en: "Female" },
  age: { ko: "나이", my: "အသက်", zh: "年龄", en: "Age" },
  agePlaceholder: { ko: "나이", my: "အသက်", zh: "年龄", en: "Age" },
  ageInvalid: {
    ko: "유효한 나이를 입력하세요 (14-120)",
    my: "မှန်ကန်သော အသက်ထည့်ပါ (14-120)",
    zh: "请输入有效年龄 (14-120)",
    en: "Enter a valid age (14–120)",
  },
  maritalStatus: {
    ko: "결혼 여부",
    my: "အိမ်ထောင်ရေးအခြေအနေ",
    zh: "婚姻状况",
    en: "Marital status",
  },
  married: { ko: "기혼", my: "အိမ်ထောင်ရှိ", zh: "已婚", en: "Married" },
  single: { ko: "미혼", my: "အိမ်ထောင်မရှိ", zh: "未婚", en: "Single" },
  region: { ko: "지역", my: "ဒေသ", zh: "地区", en: "Region" },
  regionVerify: {
    ko: "클릭하여 지역 인증",
    my: "ဒေသအတည်ပြုရန် နှိပ်ပါ",
    zh: "点击验证您的位置",
    en: "Tap to verify your location",
  },
  regionVerified: {
    ko: "지역 인증 완료",
    my: "ဒေသအတည်ပြုပြီးပြီ",
    zh: "地区已验证",
    en: "Region verified",
  },
  regionPlaceholder: {
    ko: "지역명을 입력하세요",
    my: "ဒေသအမည်ထည့်ပါ",
    zh: "请输入地区名称",
    en: "Enter region name",
  },
  referralCodeLabel: {
    ko: "추천 코드 (선택)",
    my: "ရည်ညွှန်းကုဒ် (ရွေးချယ်နိုင်)",
    zh: "推荐码（选填）",
    en: "Referral code (optional)",
  },
  optional: {
    ko: "선택사항",
    my: "ရွေးချယ်",
    zh: "选填",
    en: "Optional",
  },
  referralPlaceholder: {
    ko: "친구의 초대 코드를 입력하세요",
    my: "မိတ်ဆွေ၏ ဖိတ်ခေါ်ကုဒ် ထည့်ပါ",
    zh: "请输入好友的邀请码",
    en: "Referral code",
  },
  referralCodeInvalid: {
    ko: "유효하지 않은 추천 코드입니다.",
    my: "ရည်ညွှန်းကုဒ် မမှန်ပါ။",
    zh: "邀请码无效。",
    en: "Invalid referral code.",
  },
  referralCodeCopiedTitle: {
    ko: "복사됨",
    my: "ကူးယူပြီး",
    zh: "已复制",
    en: "Copied",
  },
  referralCodeCopiedBody: {
    ko: "초대 코드가 클립보드에 복사되었습니다.",
    my: "ဖိတ်ခေါ်ကုဒ်ကို ကူးယူပြီးပါပြီ။",
    zh: "邀请码已复制到剪贴板。",
    en: "Invite code copied to clipboard.",
  },
  referralCodeCopy: {
    ko: "복사",
    my: "ကူးယူမည်",
    zh: "复制",
    en: "Copy",
  },
  referralCodeShare: {
    ko: "공유",
    my: "မျှဝေမည်",
    zh: "分享",
    en: "Share",
  },
  profileInviteCodeTitle: {
    ko: "내 초대 코드",
    my: "ကျွန်ုပ်၏ ဖိတ်ခေါ်ကုဒ်",
    zh: "我的邀请码",
    en: "My invite code",
  },
  profileInviteCodeHint: {
    ko: "친구가 가입할 때 이 코드를 입력하면 됩니다.",
    my: "မိတ်ဆွေများသည် စာရင်းသွင်းစဉ် ဤကုဒ်ကို ထည့်ပါ။",
    zh: "好友注册时填写此邀请码即可。",
    en: "Friends can enter this code when they sign up.",
  },
  publicProfileReferralTitle: {
    ko: "이 판매자의 초대 코드",
    my: "ဤရောင်းသူ၏ ဖိတ်ခေါ်ကုဒ်",
    zh: "该卖家的邀请码",
    en: "This seller's invite code",
  },
  publicProfileReferralHint: {
    ko: "가입 시 이 코드를 추천 코드로 입력하세요.",
    my: "စာရင်းသွင်းရာတွင် ဤကုဒ်ကို ရည်ညွှန်းကုဒ်အဖြစ် ထည့်ပါ။",
    zh: "注册时将此码作为推荐码填写。",
    en: "Enter this as a referral code when registering.",
  },
  facebookIdPlaceholder: {
    ko: "100012345678901",
    my: "100012345678901",
    zh: "100012345678901",
    en: "100012345678901",
  },
  registerFailedTitle: {
    ko: "회원가입 실패",
    my: "စာရင်းသွင်းခြင်း မအောင်မြင်ပါ",
    zh: "注册失败",
    en: "Registration failed",
  },
  registerFailedBody: {
    ko: "입력한 정보를 확인하세요.",
    my: "သင်ထည့်သွင်းထားသော အချက်အလက်များကို ပြန်စစ်ဆေးပါ",
    zh: "请检查你输入的信息。",
    en: "Registration failed. Please try again.",
  },
  registerConflictBody: {
    ko: "전화번호, 이메일 또는 Facebook ID가 이미 사용 중입니다.",
    my: "ဖုန်း၊ အီးမေးလ် သို့မဟုတ် Facebook ID သည် သုံးထားပြီးဖြစ်သည်",
    zh: "手机号、邮箱或 Facebook ID 已被使用。",
    en: "Phone, email, or Facebook ID is already in use.",
  },
  registerSuccessTitle: {
    ko: "회원가입 완료",
    my: "စာရင်းသွင်းခြင်း အောင်မြင်ပါသည်",
    zh: "注册成功",
    en: "Registration complete",
  },
  registerSuccessBody: {
    ko: "전화 및 이메일 인증을 완료해 주세요.",
    my: "ဖုန်းနှင့် အီးမေးလ် အတည်ပြုခြင်းပြီးစေပါ",
    zh: "请完成手机号与邮箱验证。",
    en: "Please complete phone and email verification.",
  },

  // Verification screen
  verification: {
    ko: "본인 인증",
    my: "အတည်ပြုခြင်း",
    zh: "身份验证",
    en: "Verification",
  },
  phoneVerification: {
    ko: "전화번호 인증",
    my: "ဖုန်း အတည်ပြု",
    zh: "手机号验证",
    en: "Phone verification",
  },
  phoneVerifyStartTitle: {
    ko: "전화번호 인증 시작",
    my: "ဖုန်းနံပါတ် အတည်ပြုခြင်း စတင်ရန်",
    zh: "开始手机号验证",
    en: "Verify your phone",
  },
  phoneVerifyIntro: {
    ko: "SMS로 인증 코드를 받아 전화번호를 확인합니다.",
    my: "SMS မှ အတည်ပြုကုဒ်ရယူပြီး ဖုန်းနံပါတ်ကို အတည်ပြုပါ။",
    zh: "通过短信验证码确认您的手机号。",
    en: "We'll send an SMS code to confirm your phone number.",
  },
  phoneVerifyStepPhone: {
    ko: "번호",
    my: "နံပါတ်",
    zh: "号码",
    en: "Number",
  },
  phoneVerifyStepCode: {
    ko: "코드",
    my: "ကုဒ်",
    zh: "验证码",
    en: "Code",
  },
  phoneVerifyStepDone: {
    ko: "완료",
    my: "ပြီး",
    zh: "完成",
    en: "Done",
  },
  phoneSendCodeButton: {
    ko: "인증 코드 받기",
    my: "အတည်ပြုကုဒ် ရယူမည်",
    zh: "获取验证码",
    en: "Send verification code",
  },
  phoneCodeSentHint: {
    ko: "코드를 전송했습니다. 아래에 입력한 뒤 인증을 완료하세요.",
    my: "ကုဒ်ပို့ပြီးပါပြီ။ အောက်တွင် ထည့်ပြီး အတည်ပြုပါ။",
    zh: "验证码已发送。请在下方输入并完成验证。",
    en: "Code sent. Enter it below to finish verification.",
  },
  phoneVerifiedTitle: {
    ko: "전화번호 인증 완료",
    my: "ဖုန်းနံပါတ် အတည်ပြုပြီး",
    zh: "手机号已验证",
    en: "Phone verified",
  },
  phoneVerifiedBody: {
    ko: "이 계정의 전화번호가 확인되었습니다.",
    my: "ဤအကောင့်၏ ဖုန်းနံပါတ်ကို အတည်ပြုပြီးပါပြီ။",
    zh: "此账号的手机号已确认。",
    en: "This account’s phone number is confirmed.",
  },
  emailVerification: {
    ko: "이메일 인증",
    my: "အီးမေးလ် အတည်ပြု",
    zh: "邮箱验证",
    en: "Email verification",
  },
  emailVerifyStartTitle: {
    ko: "이메일 인증 시작",
    my: "အီးမေးလ် အတည်ပြုခြင်း စတင်ရန်",
    zh: "开始邮箱验证",
    en: "Verify your email",
  },
  emailVerifyIntro: {
    ko: "이메일로 받은 인증 토큰을 입력해 이메일을 확인합니다.",
    my: "အီးမေးလ်မှ ရရှိသော တိုကင်ကို ထည့်ပြီး အီးမေးလ်ကို အတည်ပြုပါ။",
    zh: "输入邮箱收到的验证令牌以确认邮箱。",
    en: "Enter the verification token from your email to confirm it.",
  },
  emailVerifyStepEmail: {
    ko: "이메일",
    my: "အီးမေးလ်",
    zh: "邮箱",
    en: "Email",
  },
  emailVerifyStepToken: {
    ko: "토큰",
    my: "တိုကင်",
    zh: "令牌",
    en: "Token",
  },
  emailVerifyStepDone: {
    ko: "완료",
    my: "ပြီး",
    zh: "完成",
    en: "Done",
  },
  emailCodeSentHint: {
    ko: "인증 메일을 보냈습니다. 받은 토큰을 아래에 입력하세요.",
    my: "အတည်ပြုအီးမေးလ် ပို့ပြီးပါပြီ။ ရရှိသော တိုကင်ကို အောက်တွင် ထည့်ပါ။",
    zh: "验证邮件已发送。请在下方输入收到的令牌。",
    en: "Verification email sent. Paste the token below.",
  },
  emailVerifiedTitle: {
    ko: "이메일 인증 완료",
    my: "အီးမေးလ် အတည်ပြုပြီး",
    zh: "邮箱已验证",
    en: "Email verified",
  },
  emailVerifiedBody: {
    ko: "이 계정의 이메일이 확인되었습니다.",
    my: "ဤအကောင့်၏ အီးမေးလ်ကို အတည်ပြုပြီးပါပြီ။",
    zh: "此账号的邮箱已确认。",
    en: "This account’s email address is confirmed.",
  },
  kbzPayVerification: {
    ko: "KBZPay 인증",
    my: "KBZPay အတည်ပြု",
    zh: "KBZPay 验证",
    en: "KBZPay verification",
  },
  otpCode: {
    ko: "인증 코드",
    my: "အတည်ပြုကုဒ်",
    zh: "验证码",
    en: "Verification code",
  },
  otpPlaceholder: {
    ko: "6자리 코드 입력",
    my: "ဂဏန်း ၆ လုံးထည့်ပါ",
    zh: "请输入 6 位验证码",
    en: "6-digit code",
  },
  verify: {
    ko: "인증하기",
    my: "အတည်ပြုမည်",
    zh: "验证",
    en: "Verify",
  },
  sendEmailVerificationButton: {
    ko: "인증 메일 보내기",
    my: "အီးမေးလ် အတည်ပြုစာ ပို့မည်",
    zh: "发送邮箱验证",
    en: "Send email verification",
  },
  verifyEmailButton: {
    ko: "이메일 인증하기",
    my: "အီးမေးလ် အတည်ပြုမည်",
    zh: "验证邮箱",
    en: "Verify email",
  },
  resend: {
    ko: "재전송",
    my: "ပြန်ပို့ရန်",
    zh: "重新发送",
    en: "Resend",
  },
  emailToken: { ko: "이메일 토큰", my: "အီးမေးလ် တိုကင်", zh: "邮箱令牌", en: "Email token" },
  emailTokenPlaceholder: {
    ko: "이메일로 받은 토큰 입력",
    my: "အီးမေးလ်မှ တိုကင်ထည့်ပါ",
    zh: "请输入邮箱收到的令牌",
    en: "Email verification token",
  },
  kbzPayMessagePlaceholder: {
    ko: "관리자에게 전달할 메시지",
    my: "အုပ်ချုပ်သူထံသို့ မက်ဆေ့ချ်",
    zh: "发送给管理员的消息",
    en: "Optional message to admin",
  },
  kbzPayRequestIntro: {
    ko: "요청 후 관리자가 송금할 전화번호를 보내드립니다. 안내를 받기 전에는 송금하지 마세요.",
    my: "တောင်းဆိုပြီးနောက် အုပ်ချုပ်သူက ငွေလွှဲရန် ဖုန်းနံပါတ် ပို့ပေးပါမည်။ ညွှန်ကြားချက် မရမချင်း ငွေမလွှဲပါနှင့်။",
    zh: "提交请求后，管理员会发送收款手机号。收到指引前请勿转账。",
    en: "After you request verification, an admin will send the transfer phone. Do not transfer money before you receive it.",
  },
  kbzPayStartTitle: {
    ko: "KBZPay 인증 시작",
    my: "KBZPay အတည်ပြုခြင်း စတင်ရန်",
    zh: "开始 KBZPay 验证",
    en: "Start KBZPay verification",
  },
  kbzPayBeforeStart: {
    ko: "시작 전 필수 사항",
    my: "မစတင်မီ လိုအပ်ချက်များ",
    zh: "开始前请确认",
    en: "Required before you start",
  },
  kbzPayPhoneRequirement: {
    ko: "전화번호 인증 완료",
    my: "ဖုန်းနံပါတ် အတည်ပြုပြီး",
    zh: "手机号已验证",
    en: "Phone number verified",
  },
  kbzPayEmailRequirement: {
    ko: "이메일 인증 완료",
    my: "အီးမေးလ် အတည်ပြုပြီး",
    zh: "邮箱已验证",
    en: "Email verified",
  },
  kbzPayFlowRequest: {
    ko: "요청",
    my: "တောင်း",
    zh: "申请",
    en: "Request",
  },
  kbzPayFlowInstruction: {
    ko: "안내",
    my: "ညွှန်",
    zh: "指引",
    en: "Instructions",
  },
  kbzPayFlowTransfer: {
    ko: "송금",
    my: "လွှဲ",
    zh: "转账",
    en: "Transfer",
  },
  kbzPayFlowReview: {
    ko: "검토",
    my: "စစ်",
    zh: "审核",
    en: "Review",
  },
  requestVerification: {
    ko: "인증 요청",
    my: "အတည်ပြုတောင်းဆိုမည်",
    zh: "请求验证",
    en: "Request verification",
  },
  continueToApp: {
    ko: "앱으로 이동",
    my: "Appသို့ သွားမည်",
    zh: "进入应用",
    en: "Continue to app",
  },
  otpSent: {
    ko: "인증 코드를 전송했습니다",
    my: "အတည်ပြုကုဒ်ကို ပို့ပြီး",
    zh: "验证码已发送",
    en: "Verification code sent.",
  },
  otpVerified: {
    ko: "전화번호가 인증되었습니다",
    my: "ဖုန်းနံပါတ် အတည်ပြုပြီး",
    zh: "手机号已验证",
    en: "Phone verified.",
  },
  emailSent: {
    ko: "이메일 인증 링크를 전송했습니다",
    my: "အီးမေးလ် အတည်ပြုလင့်ခ် ပို့ပြီး",
    zh: "验证链接已发送到邮箱",
    en: "Verification email sent.",
  },
  emailVerified: {
    ko: "이메일이 인증되었습니다",
    my: "အီးမေးလ် အတည်ပြုပြီး",
    zh: "邮箱已验证",
    en: "Email verified",
  },
  kbzPayRequested: {
    ko: "KBZPay 인증이 요청되었습니다",
    my: "KBZPay အတည်ပြု တောင်းဆိုပြီး",
    zh: "KBZPay 验证已请求",
    en: "KBZPay verification requested",
  },
  kbzPayPendingHint: {
    ko: "정확히 100 MMK를 송금한 후 거래번호를 제출하세요.",
    my: "တိတိကျကျ 100 MMK ကို လွှဲပြီးနောက် ငွေလွှဲ လုပ်ဆောင်မှုအမှတ်ကို တင်ပြပါ။",
    zh: "请准确转账 100 MMK，然后提交交易号。",
    en: "Transfer exactly 100 MMK, then submit your transaction ID.",
  },
  kbzPayStatusPendingInstruction: {
    ko: "관리자 안내 대기",
    my: "အုပ်ချုပ်သူ ညွှန်ကြားချက်ကို စောင့်ဆိုင်းနေသည်",
    zh: "等待管理员指引",
    en: "Waiting for instructions",
  },
  kbzPayStatusInstructionReady: {
    ko: "안내 발송됨",
    my: "ညွှန်ကြားချက် ပို့ပြီး",
    zh: "指引已发送",
    en: "Ready to transfer",
  },
  kbzPayStatusTransactionSubmitted: {
    ko: "거래번호 제출됨",
    my: "လုပ်ဆောင်မှုအမှတ် တင်ပြပြီး",
    zh: "交易号已提交",
    en: "Under review",
  },
  kbzPayWaitInstructionHint: {
    ko: "요청이 접수되었습니다. 관리자가 송금 전화번호를 보낼 때까지 기다려주세요. 지금은 송금할 필요가 없습니다.",
    my: "တောင်းဆိုချက်ကို လက်ခံပြီးပါပြီ။ အုပ်ချုပ်သူက ငွေလွှဲရန် ဖုန်းနံပါတ် ပို့ပေးသည်အထိ စောင့်ပါ။ ယခု ငွေလွှဲရန် မလိုသေးပါ။",
    zh: "请求已收到。请等待管理员发送收款手机号，现在无需转账。",
    en: "Your request was received. Wait for the admin to send a transfer phone. You do not need to transfer anything yet.",
  },
  kbzPayWaitingTitle: {
    ko: "관리자 안내 대기 중",
    my: "အုပ်ချုပ်သူ ညွှန်ကြားချက်ကို စောင့်နေသည်",
    zh: "正在等待管理员指引",
    en: "Waiting for admin instructions",
  },
  kbzPayInstructionDetailsPending: {
    ko: "안내가 준비 중이지만 송금 전화번호가 아직 표시되지 않습니다. 잠시 후 상태를 확인하세요.",
    my: "ညွှန်ကြားချက်ကို ပြင်ဆင်နေသော်လည်း ငွေလွှဲရန် ဖုန်းနံပါတ် မပေါ်သေးပါ။ ခဏနောက် အခြေအနေကို စစ်ဆေးပါ။",
    zh: "指引正在准备中，但收款手机号尚未显示。请稍后检查状态。",
    en: "The instruction is being prepared, but the transfer phone is not available yet. Check again shortly.",
  },
  kbzPayCheckStatus: {
    ko: "상태 확인",
    my: "အခြေအနေ စစ်ဆေးရန်",
    zh: "检查状态",
    en: "Check status",
  },
  kbzPayAmountLabel: {
    ko: "송금 금액",
    my: "လွှဲမည့် ပမာဏ",
    zh: "转账金额",
    en: "Amount",
  },
  kbzPayAmountValue: {
    ko: "100 MMK",
    my: "100 MMK",
    zh: "100 MMK",
    en: "100 MMK",
  },
  kbzPayAdminPhoneLabel: {
    ko: "송금용 관리자 전화번호",
    my: "လွှဲပြောင်းရန် အုပ်ချုပ်သူ ဖုန်းနံပါတ်",
    zh: "管理员收款手机号",
    en: "Admin KBZPay phone",
  },
  kbzPayAdminNoteLabel: {
    ko: "관리자 메모",
    my: "အုပ်ချုပ်သူ မှတ်ချက်",
    zh: "管理员备注",
    en: "Admin note",
  },
  kbzPayTxnIdLabel: {
    ko: "KBZ 거래번호",
    my: "KBZ လုပ်ဆောင်မှုအမှတ်",
    zh: "KBZ 交易号",
    en: "KBZPay transaction ID",
  },
  kbzPayTxnIdPlaceholder: {
    ko: "KBZ-TXN-20260506-000321",
    my: "KBZ-TXN-20260506-000321",
    zh: "KBZ-TXN-20260506-000321",
    en: "Transaction ID",
  },
  kbzPayTxnIdHelp: {
    ko: "KBZPay 송금 완료 화면 또는 거래 내역에서 거래번호를 복사하세요.",
    my: "KBZPay ငွေလွှဲပြီးသည့် စာမျက်နှာ သို့မဟုတ် မှတ်တမ်းမှ လုပ်ဆောင်မှုအမှတ်ကို ကူးယူပါ။",
    zh: "请从 KBZPay 转账成功页面或交易记录中复制交易号。",
    en: "Copy this from the KBZPay success screen or transaction history.",
  },
  submitTransaction: {
    ko: "거래번호 제출",
    my: "လုပ်ဆောင်မှုအမှတ် တင်ပြမည်",
    zh: "提交交易号",
    en: "Submit transaction",
  },
  kbzPayTransactionSubmitted: {
    ko: "KBZ 거래번호가 제출되었습니다.",
    my: "KBZ လုပ်ဆောင်မှုအမှတ်ကို တင်ပြပြီးပါပြီ။",
    zh: "已提交 KBZ 交易号。",
    en: "Transaction submitted.",
  },
  kbzPaySubmittedHint: {
    ko: "제출 완료. 관리자 확인을 기다리는 중입니다.",
    my: "တင်ပြပြီးပါပြီ။ အုပ်ချုပ်သူ အတည်ပြုမှုကို စောင့်နေပါသည်။",
    zh: "已提交，等待管理员核验。",
    en: "Transaction submitted. Waiting for admin review.",
  },
  kbzPayReviewTitle: {
    ko: "관리자가 확인 중입니다",
    my: "အုပ်ချုပ်သူ စစ်ဆေးနေသည်",
    zh: "管理员正在审核",
    en: "Admin review in progress",
  },
  kbzPayVerifiedTitle: {
    ko: "KBZPay 인증 완료",
    my: "KBZPay အတည်ပြုပြီး",
    zh: "KBZPay 验证完成",
    en: "KBZPay verified",
  },
  kbzPayVerifiedBody: {
    ko: "KBZPay 계정이 인증되었습니다. 이제 인증이 필요한 기능을 사용할 수 있습니다.",
    my: "သင်၏ KBZPay အကောင့်ကို အတည်ပြုပြီးပါပြီ။ ယခု အတည်ပြုမှုလိုအပ်သော လုပ်ဆောင်ချက်များကို အသုံးပြုနိုင်ပါသည်။",
    zh: "您的 KBZPay 账户已通过验证，现在可以使用需要验证的功能。",
    en: "Your KBZPay account is verified. You can now use features that require verification.",
  },
  kbzPayPhoneCopied: {
    ko: "송금 전화번호를 복사했습니다.",
    my: "ငွေလွှဲရန် ဖုန်းနံပါတ်ကို ကူးယူပြီးပါပြီ။",
    zh: "收款手机号已复制。",
    en: "Transfer phone copied.",
  },
  actionCopy: {
    ko: "복사",
    my: "ကူးယူ",
    zh: "复制",
    en: "Copy",
  },
  kbzPayAlreadySubmittedTitle: {
    ko: "요청이 이미 처리 중입니다",
    my: "တောင်းဆိုချက်ကို လုပ်ဆောင်နေပြီးဖြစ်သည်",
    zh: "请求已在处理中",
    en: "Request already in progress",
  },
  kbzPayAlreadySubmittedBody: {
    ko: "최신 상태를 불러왔습니다. 현재 단계의 안내를 확인하세요.",
    my: "နောက်ဆုံးအခြေအနေကို ပြန်ယူပြီးပါပြီ။ လက်ရှိအဆင့်၏ ညွှန်ကြားချက်ကို ကြည့်ပါ။",
    zh: "已刷新最新状态，请查看当前步骤的指引。",
    en: "We refreshed your latest status. Follow the instructions shown for the current step.",
  },
  kbzPaySubmittedTxnLabel: {
    ko: "제출한 거래번호",
    my: "တင်ပြထားသော လုပ်ဆောင်မှုအမှတ်",
    zh: "已提交的交易号",
    en: "Submitted transaction ID",
  },
  kbzPayTxnRequired: {
    ko: "KBZPay 거래번호가 필요합니다.",
    my: "KBZPay လုပ်ဆောင်မှုအမှတ် လိုအပ်ပါသည်။",
    zh: "需要填写 KBZPay 交易号。",
    en: "KBZPay transaction ID is required.",
  },
  kbzPayTxnInvalid: {
    ko: "유효한 KBZPay 거래번호를 입력하세요.",
    my: "မှန်ကန်သော KBZPay လုပ်ဆောင်မှုအမှတ်ကို ထည့်ပါ။",
    zh: "请输入有效的 KBZPay 交易号。",
    en: "Enter a valid KBZPay transaction ID.",
  },
  kbzPayNeedsVerificationFirst: {
    ko: "먼저 전화번호와 이메일 인증을 완료해 주세요.",
    my: "အရင်ဆုံး ဖုန်းနှင့် အီးမေးလ် အတည်ပြုခြင်းကို ပြီးစီးပါ။",
    zh: "请先完成手机号和邮箱验证。",
    en: "Please complete phone and email verification first.",
  },
  profileTitle: {
    ko: "프로필",
    my: "ပရိုဖိုင်",
    zh: "个人资料",
    en: "Profile",
  },
  profileTabRewards: { ko: "리워드", my: "ဆုလာဘ်", zh: "奖励", en: "Rewards" },
  profileTabVerifications: { ko: "인증", my: "အတည်ပြု", zh: "验证", en: "Verifications" },
  verificationsOverviewTitle: {
    ko: "인증 진행 상황",
    my: "အတည်ပြု တိုးတက်မှု",
    zh: "验证进度",
    en: "Verification progress",
  },
  verificationsOverviewHint: {
    ko: "아래 순서로 인증을 완료하면 더 많은 기능을 사용할 수 있습니다.",
    my: "အစဉ်အတိုင်း အတည်ပြုပြီး လုပ်ဆောင်ချက် ပိုမို သုံးနိုင်ပါသည်။",
    zh: "按以下顺序完成验证后，即可使用更多功能。",
    en: "Complete these in order to unlock more features.",
  },
  verificationsProgressCount: {
    ko: "{done}/{total}",
    my: "{done}/{total}",
    zh: "{done}/{total}",
    en: "{done}/{total}",
  },
  verificationsAllComplete: {
    ko: "모든 인증이 완료되었습니다.",
    my: "အတည်ပြုမှုအားလုံး ပြီးပါပြီ။",
    zh: "全部验证已完成。",
    en: "All verifications are complete.",
  },
  verificationsNextHint: {
    ko: "다음 단계",
    my: "နောက်တစ်ဆင့်",
    zh: "下一步",
    en: "Up next",
  },
  verificationStatusComplete: {
    ko: "완료",
    my: "ပြီး",
    zh: "完成",
    en: "Done",
  },
  verificationStatusPending: {
    ko: "진행 중",
    my: "လုပ်ဆဲ",
    zh: "进行中",
    en: "In progress",
  },
  verificationStatusTodo: {
    ko: "대기",
    my: "ကျန်",
    zh: "待办",
    en: "To do",
  },
  profileTabPassword: { ko: "비밀번호", my: "စကားဝှက်", zh: "密码", en: "Password" },
  profileMemberFallback: {
    ko: "Flex Used Market 회원",
    my: "Flex Used Market အဖွဲ့ဝင်",
    zh: "Flex Used Market 用户",
    en: "Flex Used Market member",
  },
  profileEmailFallback: {
    ko: "이메일 없음",
    my: "အီးမေးလ် မရှိပါ",
    zh: "暂无邮箱",
    en: "No email",
  },
  profileStatusVerified: {
    ko: "인증 완료",
    my: "အတည်ပြုပြီး",
    zh: "已验证",
    en: "Verified",
  },
  profileStatusNotVerified: {
    ko: "미인증",
    my: "အတည်မပြုရသေး",
    zh: "未验证",
    en: "Not verified",
  },
  profileStatusRequested: {
    ko: "요청됨",
    my: "တောင်းဆိုထားသည်",
    zh: "已请求",
    en: "Requested",
  },
  profileVerifiedHint: {
    ko: "이미 인증이 완료되었습니다.",
    my: "အတည်ပြုခြင်း ပြီးစီးပြီးဖြစ်သည်။",
    zh: "已完成验证。",
    en: "Already verified.",
  },
  facebookVerification: {
    ko: "페이스북 인증",
    my: "Facebook အတည်ပြု",
    zh: "Facebook 验证",
    en: "Facebook verification",
  },
  facebookLinkIntro: {
    ko: "먼저 Facebook 계정을 연결한 뒤, 페이지 팔로우 인증샷을 제출하세요.",
    my: "အရင် Facebook အကောင့်ကို ချိတ်ဆက်ပြီးနောက် စာမျက်နှာ လိုက်နာမှု အထောက်အထား တင်ပြပါ။",
    zh: "请先绑定 Facebook 账号，再提交关注页面的截图证明。",
    en: "First link your Facebook account, then submit a follow-proof screenshot.",
  },
  facebookStartTitle: {
    ko: "Facebook 인증 시작",
    my: "Facebook အတည်ပြုခြင်း စတင်ရန်",
    zh: "开始 Facebook 验证",
    en: "Start Facebook verification",
  },
  facebookFlowLink: {
    ko: "연결",
    my: "ချိတ်",
    zh: "绑定",
    en: "Link",
  },
  facebookFlowFollow: {
    ko: "팔로우",
    my: "လိုက်",
    zh: "关注",
    en: "Follow",
  },
  facebookFlowReview: {
    ko: "검토",
    my: "စစ်",
    zh: "审核",
    en: "Review",
  },
  facebookLinkStepTitle: {
    ko: "1. Facebook 계정 연결",
    my: "၁။ Facebook အကောင့် ချိတ်ဆက်ရန်",
    zh: "1. 绑定 Facebook 账号",
    en: "1. Link Facebook account",
  },
  facebookFollowStepTitle: {
    ko: "2. 페이지 팔로우 인증",
    my: "၂။ စာမျက်နှာ လိုက်နာမှု အတည်ပြုရန်",
    zh: "2. 提交关注证明",
    en: "2. Prove you follow our page",
  },
  facebookLinkedTitle: {
    ko: "Facebook 연결됨",
    my: "Facebook ချိတ်ဆက်ပြီး",
    zh: "Facebook 已绑定",
    en: "Facebook linked",
  },
  facebookFollowReviewTitle: {
    ko: "팔로우 인증 검토 중",
    my: "လိုက်နာမှု အထောက်အထား စစ်ဆေးနေသည်",
    zh: "关注证明审核中",
    en: "Follow proof under review",
  },
  facebookFollowApprovedTitle: {
    ko: "팔로우 인증 승인됨",
    my: "လိုက်နာမှု အတည်ပြုပြီးပါပြီ",
    zh: "关注证明已通过",
    en: "Follow proof approved",
  },
  facebookFollowRejectedHint: {
    ko: "이전 제출이 거절되었습니다. 새 스크린샷으로 다시 제출하세요.",
    my: "ယခင် တင်ပြချက်ကို ငြင်းပယ်ထားပါသည်။ မျက်နှာပြင်ပုံ အသစ်ဖြင့် ပြန်တင်ပါ။",
    zh: "上次提交被拒绝。请用新截图重新提交。",
    en: "Your last submission was rejected. Submit a new screenshot.",
  },
  facebookOAuthButton: {
    ko: "Facebook으로 계속",
    my: "Facebook ဖြင့် ဆက်လုပ်မည်",
    zh: "使用 Facebook 继续",
    en: "Continue with Facebook",
  },
  facebookManualTokenHint: {
    ko: "OAuth가 액세스 토큰을 자동으로 채웁니다. 필요하면 직접 붙여넣을 수도 있습니다.",
    my: "OAuth က အသုံးပြုခွင့် တိုကင်ကို အလိုအလျောက် ဖြည့်ပေးသည်။ လိုအပ်ပါက ကိုယ်တိုင် ကူးထည့်နိုင်သည်။",
    zh: "OAuth 会自动填入访问令牌。如需也可手动粘贴。",
    en: "OAuth fills the access token automatically. You can also paste a token manually.",
  },
  facebookAccessTokenPlaceholder: {
    ko: "Facebook 액세스 토큰",
    my: "Facebook အသုံးပြုခွင့် တိုကင်",
    zh: "Facebook 访问令牌",
    en: "Facebook access token",
  },
  facebookProfileUrlPlaceholder: {
    ko: "Facebook 프로필 URL",
    my: "Facebook ပရိုဖိုင် URL",
    zh: "Facebook 主页链接",
    en: "Facebook profile URL",
  },
  facebookLinkAccount: {
    ko: "Facebook 계정 연결",
    my: "Facebook အကောင့် ချိတ်ဆက်မည်",
    zh: "绑定 Facebook 账号",
    en: "Link Facebook account",
  },
  facebookLinkedSuccess: {
    ko: "Facebook 계정이 연결되었습니다.",
    my: "Facebook အကောင့်ကို ချိတ်ဆက်ပြီးပါပြီ။",
    zh: "Facebook 账号已绑定。",
    en: "Facebook account linked successfully.",
  },
  facebookOAuthTokenReceived: {
    ko: "Facebook 토큰을 받았습니다. 프로필 URL을 확인한 뒤 계정을 연결하세요.",
    my: "Facebook တိုကင် ရရှိပြီးပါပြီ။ ပရိုဖိုင် URL ကို စစ်ဆေးပြီး အကောင့်ကို ချိတ်ဆက်ပါ။",
    zh: "已获取 Facebook 令牌。请确认主页链接后绑定账号。",
    en: "Facebook token received. Review the profile URL, then link your account.",
  },
  facebookMissingAppId: {
    ko: "Facebook 로그인을 사용하려면 앱 설정을 완료해 주세요.",
    my: "Facebook ဝင်ရောက်မှု အသုံးပြုရန် အက်ပ် ဆက်တင်ကို ပြည့်စုံအောင် လုပ်ပါ။",
    zh: "请先完成应用配置后再使用 Facebook 登录。",
    en: "Facebook login is not configured for this app yet.",
  },
  facebookLoginFailed: {
    ko: "Facebook 로그인에 실패했습니다. Facebook SDK를 추가한 뒤 EAS 개발 앱을 다시 빌드하고 시도하세요.",
    my: "Facebook ဝင်ရောက်မှု မအောင်မြင်ပါ။ Facebook SDK ထည့်သွင်းပြီးနောက် EAS development app ကို ပြန်တည်ဆောက်ပြီး ထပ်မံ စမ်းကြည့်ပါ။",
    zh: "Facebook 登录失败。请在添加 Facebook SDK 后重新构建 EAS 开发版应用，然后再试。",
    en: "Facebook login failed. Rebuild the EAS development app after adding the Facebook SDK, then try again.",
  },
  mediaLibraryPermissionRequired: {
    ko: "사진 라이브러리 접근 권한이 필요합니다.",
    my: "ဓာတ်ပုံ စုစည်းမှု ခွင့်ပြုချက် လိုအပ်ပါသည်။",
    zh: "需要相册访问权限。",
    en: "Media library permission is required.",
  },
  facebookMissingPageUrl: {
    ko: "팔로우 인증을 제출하려면 공식 페이지 주소가 필요합니다.",
    my: "လိုက်နာမှု အထောက်အထား တင်ပြရန် တရားဝင် စာမျက်နှာ လိပ်စာ လိုအပ်ပါသည်။",
    zh: "提交关注证明前需要配置官方主页地址。",
    en: "Official page URL is not configured yet.",
  },
  facebookLinkRequired: {
    ko: "Facebook 액세스 토큰과 프로필 URL이 필요합니다.",
    my: "Facebook အသုံးပြုခွင့် တိုကင်နှင့် ပရိုဖိုင် URL လိုအပ်ပါသည်။",
    zh: "需要 Facebook 访问令牌和主页链接。",
    en: "Facebook access token and profile URL are required.",
  },
  facebookNameLabel: {
    ko: "Facebook 이름",
    my: "Facebook အမည်",
    zh: "Facebook 名称",
    en: "Facebook name",
  },
  facebookOpenProfile: {
    ko: "Facebook 프로필 열기",
    my: "Facebook ပရိုဖိုင် ဖွင့်မည်",
    zh: "打开 Facebook 主页",
    en: "Open Facebook profile",
  },
  facebookFollowProof: {
    ko: "페이지 팔로우 인증",
    my: "စာမျက်နှာ လိုက်နာမှု အထောက်အထား",
    zh: "关注证明",
    en: "Facebook follow proof",
  },
  facebookFollowIntro: {
    ko: "공식 페이지를 팔로우한 뒤 스크린샷을 제출하면 관리자가 확인합니다.",
    my: "တရားဝင် စာမျက်နှာကို လိုက်နာပြီး မျက်နှာပြင်ပုံ တင်ပြပါ။ အုပ်ချုပ်သူက စစ်ဆေးပါမည်။",
    zh: "关注官方主页后提交截图，管理员将进行审核。",
    en: "Follow our official page, then submit a screenshot for admin review.",
  },
  facebookNamePlaceholder: {
    ko: "Facebook 이름",
    my: "သင့် Facebook အမည်",
    zh: "您的 Facebook 名称",
    en: "Your Facebook name",
  },
  facebookPageUrlPlaceholder: {
    ko: "팔로우한 Facebook 페이지 URL",
    my: "လိုက်နာထားသော Facebook စာမျက်နှာ URL",
    zh: "您关注的 Facebook 主页链接",
    en: "Facebook page URL you followed",
  },
  facebookScreenshotButton: {
    ko: "팔로우 스크린샷 선택",
    my: "လိုက်နာမှု မျက်နှာပြင်ပုံ ရွေးမည်",
    zh: "选择关注截图",
    en: "Choose screenshot",
  },
  facebookScreenshotSelected: {
    ko: "스크린샷이 선택되었습니다",
    my: "မျက်နှာပြင်ပုံကို ရွေးပြီးပါပြီ",
    zh: "已选择截图",
    en: "Screenshot selected",
  },
  facebookSubmitFollowProof: {
    ko: "팔로우 인증 제출",
    my: "လိုက်နာမှု အထောက်အထား တင်ပြမည်",
    zh: "提交关注证明",
    en: "Submit follow proof",
  },
  facebookFollowSubmitted: {
    ko: "팔로우 인증이 검토를 위해 제출되었습니다.",
    my: "လိုက်နာမှု အထောက်အထားကို စစ်ဆေးရန် တင်ပြပြီးပါပြီ။",
    zh: "关注证明已提交，等待审核。",
    en: "Facebook follow proof submitted for review.",
  },
  facebookFollowRequired: {
    ko: "먼저 Facebook을 연결한 뒤 팔로우 스크린샷을 선택하세요.",
    my: "အရင် Facebook ကို ချိတ်ဆက်ပြီး လိုက်နာမှု မျက်နှာပြင်ပုံကို ရွေးပါ။",
    zh: "请先绑定 Facebook，再选择关注截图。",
    en: "Link Facebook first, then choose a follow screenshot.",
  },
  facebookFollowLatestStatus: {
    ko: "최근 팔로우 검토 상태",
    my: "နောက်ဆုံး လိုက်နာမှု စစ်ဆေးမှု အခြေအနေ",
    zh: "最近关注审核状态",
    en: "Latest submission status",
  },
  facebookFollowNoSubmission: {
    ko: "아직 제출 내역 없음",
    my: "တင်ပြချက် မရှိသေးပါ",
    zh: "暂无提交记录",
    en: "No submission yet",
  },
  facebookOpenPage: {
    ko: "공식 페이지 열기",
    my: "တရားဝင် စာမျက်နှာ ဖွင့်မည်",
    zh: "打开官方主页",
    en: "Open Facebook page",
  },
  facebookFollowAdminNote: {
    ko: "관리자 메모",
    my: "အုပ်ချုပ်သူ မှတ်ချက်",
    zh: "管理员备注",
    en: "Admin note",
  },
  rewardMyProfile: {
    ko: "내 프로필",
    my: "ကျွန်ုပ်၏ ပရိုဖိုင်",
    zh: "我的资料",
    en: "My rewards",
  },
  rewardMyPoints: {
    ko: "내 포인트",
    my: "ကျွန်ုပ်၏ ပွိုင့်",
    zh: "我的积分",
    en: "My points",
  },
  rewardCashoutHint: {
    ko: "5,000 포인트부터 현금 인출이 가능합니다.",
    my: "ပွိုင့် ၅,၀၀၀ မှ စတင်၍ ငွေသားထုတ်ယူနိုင်ပါသည်။",
    zh: "积分满 5,000 起可申请提现吗。",
    en: "Points can be withdrawn after KBZPay verification.",
  },
  rewardWithdrawalAmount: {
    ko: "인출 금액",
    my: "ထုတ်ယူမည့် ပမာဏ",
    zh: "提现金额",
    en: "Withdrawal amount",
  },
  rewardWithdrawalPlaceholder: {
    ko: "금액을 입력하세요",
    my: "ပမာဏကို ထည့်ပါ",
    zh: "请输入金额",
    en: "Enter points",
  },
  rewardRequestWithdrawal: {
    ko: "인출 요청",
    my: "ထုတ်ယူရန် တောင်းဆိုမည်",
    zh: "申请提现",
    en: "Request withdrawal",
  },
  rewardTransactionStats: {
    ko: "거래 통계",
    my: "ငွေလဲလှယ်မှု စာရင်းအင်း",
    zh: "交易统计",
    en: "Transaction stats",
  },
  rewardTotalTransactions: {
    ko: "총 거래 수",
    my: "စုစုပေါင်း လုပ်ဆောင်မှု အရေအတွက်",
    zh: "交易总数",
    en: "Total deals",
  },
  rewardCompletedSales: {
    ko: "판매 완료",
    my: "ရောင်းပြီး (ပြီးစီး)",
    zh: "已完成销售",
    en: "Sales",
  },
  rewardCompletedPurchases: {
    ko: "구매 완료",
    my: "ဝယ်ပြီး (ပြီးစီး)",
    zh: "已完成购买",
    en: "Purchases",
  },
  rewardRankSystem: {
    ko: "회원 등급 체계",
    my: "အသင်းဝင်အဆင့် စနစ်",
    zh: "会员等级体系",
    en: "Rank system",
  },
  rewardRankLadderUnavailable: {
    ko: "등급 정보를 불러오지 못했습니다. 아래로 당겨 새로고침하세요.",
    my: "အဆင့်အချက်အလက် မရရှိပါ။ အောက်သို့ ဆွဲပြီး ပြန်လည်စတင်ပါ။",
    zh: "无法加载等级说明，请下拉刷新。",
    en: "Rank ladder unavailable.",
  },
  rewardCurrentRank: {
    ko: "현재 등급",
    my: "လက်ရှိ အဆင့်",
    zh: "当前等级",
    en: "Current rank",
  },
  rewardNextRank: {
    ko: "다음 등급",
    my: "နောက် အဆင့်",
    zh: "下一等级",
    en: "Next rank",
  },
  rewardAvailablePoints: {
    ko: "인출 가능 포인트",
    my: "ထုတ်ယူနိုင်သော ပွိုင့်",
    zh: "可提现积分",
    en: "Available",
  },
  rewardPendingWithdrawal: {
    ko: "인출 대기",
    my: "ထုတ်ယူရန် စောင့်ဆိုင်းနေသည်",
    zh: "待处理提现",
    en: "Pending withdrawal",
  },
  rewardWithdrawalHistory: {
    ko: "인출 내역",
    my: "ထုတ်ယူမှု မှတ်တမ်း",
    zh: "提现记录",
    en: "Withdrawal history",
  },
  rewardNoWithdrawals: {
    ko: "아직 인출 요청이 없습니다.",
    my: "ထုတ်ယူရန် တောင်းဆိုမှု မရှိသေးပါ။",
    zh: "暂无提现申请。",
    en: "No withdrawal requests yet.",
  },
  rewardWithdrawalRequested: {
    ko: "인출 요청이 제출되었습니다.",
    my: "ထုတ်ယူရန် တောင်းဆိုမှုကို တင်ပြပြီးပါပြီ။",
    zh: "提现申请已提交。",
    en: "Withdrawal requested.",
  },
  rewardWithdrawalKbzRequired: {
    ko: "인출 요청 전에 KBZPay 인증을 완료하세요.",
    my: "ထုတ်ယူရန် မတောင်းဆိုမီ KBZPay ကို အတည်ပြုပါ။",
    zh: "申请提现前请先完成 KBZPay 验证。",
    en: "KBZPay verification is required to withdraw.",
  },
  rewardWithdrawalMin: {
    ko: "현금 인출을 요청하려면 인출 가능 포인트가 최소 5,000 이상이어야 합니다.",
    my: "ငွေသားထုတ်ယူရန် အနည်းဆုံး ထုတ်ယူနိုင်သော ပွိုင့် ၅,၀၀၀ လိုအပ်သည်။",
    zh: "申请提现需要至少 5,000 可提现积分。",
    en: "Minimum withdrawal is 5000 points.",
  },
  rewardWithdrawalAmountRequired: {
    ko: "인출 금액을 입력하세요.",
    my: "ထုတ်ယူမည့် ပမာဏကို ထည့်ပါ။",
    zh: "请输入提现金额。",
    en: "Enter a valid amount.",
  },
  rewardWithdrawalAmountTooHigh: {
    ko: "인출 금액은 인출 가능 포인트를 초과할 수 없습니다.",
    my: "ပမာဏသည် ထုတ်ယူနိုင်သော ပွိုင့်ထက် မကျော်လွန်ရပါ။",
    zh: "金额不能超过可提现积分。",
    en: "Amount exceeds available points.",
  },
  rewardWithdrawalFailed: {
    ko: "인출 요청에 실패했습니다. 다시 시도하세요.",
    my: "ထုတ်ယူရန် တောင်းဆိုမှု မအောင်မြင်ပါ။ ထပ်မံကြိုးစားပါ။",
    zh: "提现申请失败，请重试。",
    en: "Withdrawal request failed.",
  },
  rewardRetry: {
    ko: "다시 시도",
    my: "ထပ်ကြိုးစားမည်",
    zh: "重试",
    en: "Retry",
  },
  rewardMaxRank: {
    ko: "최고 등급 도달",
    my: "အမြင့်ဆုံး အဆင့်သို့ ရောက်ရှိပြီး",
    zh: "已达到最高等级",
    en: "You've reached the top rank",
  },
  rewardPointsToNext: {
    ko: "포인트 남음 (다음 등급까지)",
    my: "နောက်အဆင့်သို့ ရောက်ရန် လိုအပ်သော ပွိုင့်",
    zh: "距离下一等级还差积分",
    en: "points to next rank",
  },
  signOutButton: {
    ko: "로그아웃",
    my: "ထွက်မည်",
    zh: "退出登录",
    en: "Sign out",
  },
  appVersionDisplay: {
    ko: "버전 {version} (빌드 {build})",
    my: "Version {version} (Build {build})",
    zh: "版本 {version}（构建 {build}）",
    en: "Version {version} (Build {build})",
  },
  tabsHome: {
    ko: "홈",
    my: "ပင်မ",
    zh: "首页",
    en: "Home",
  },
  tabsProducts: { ko: "상품", my: "ပစ္စည်းများ", zh: "商品", en: "Products" },
  tabsExplore: { ko: "탐색", my: "စူးစမ်း", zh: "探索", en: "Explore" },
  tabsProfile: { ko: "프로필", my: "ပရိုဖိုင်", zh: "个人资料", en: "Profile" },
  tabsNotifications: { ko: "알림", my: "အသိပေးချက်", zh: "通知", en: "Notifications" },
  tabsChats: { ko: "채팅", my: "ချတ်", zh: "聊天", en: "Chats" },
  chatInboxTitle: { ko: "채팅함", my: "ချတ်စာများ", zh: "聊天收件箱", en: "Chats" },
  chatInboxSubtitle: {
    ko: "구매·판매 대화를 한곳에서 확인하세요. 판매자는 구매자가 첫 메시지를 보낸 뒤에만 알림을 받습니다.",
    my: "ဝယ်ယူမှု/ရောင်းချမှု စကားပြောများကို တစ်နေရာတည်းတွင် ကြည့်ပါ။ ရောင်းသူသည် ဝယ်သူ ပထမမက်ဆေ့ပို့မှသာ အကြောင်းကြားချက် ရမည်။",
    zh: "在此查看所有买卖对话。卖家仅在买家发送第一条消息后才会收到通知。",
    en: "View your buy and sell conversations. Sellers are notified after the buyer sends the first message.",
  },
  chatInboxEmpty: {
    ko: "아직 대화가 없습니다.",
    my: "စကားပြောခန်း မရှိသေးပါ။",
    zh: "暂无聊天。",
    en: "No conversations yet.",
  },
  chatInboxEmptyHint: {
    ko: "상품 상세에서 판매자에게 메시지를 내면 여기에 표시됩니다.",
    my: "ကုန်ပစ္စည်း အသေးစိတ်မှ ရောင်းသူထံ စာပို့ပါက ဤနေရာတွင် ပေါ်လာမည်။",
    zh: "在商品详情页联系卖家后，对话会显示在这里。",
    en: "Message a seller from a product page and it will appear here.",
  },
  chatNoMessagesYet: {
    ko: "메시지 없음",
    my: "မက်ဆေ့ချ် မရှိသေး",
    zh: "暂无消息",
    en: "No messages yet",
  },
  chatTapToStart: {
    ko: "탭하여 대화 시작",
    my: "နှိပ်ပြီး စကားပြောစတင်ပါ",
    zh: "点击开始聊天",
    en: "Tap to start chatting",
  },
  chatListingFallback: {
    ko: "상품",
    my: "ကုန်ပစ္စည်း",
    zh: "商品",
    en: "Listing",
  },
  chatSellerFallback: { ko: "판매자", my: "ရောင်းသူ", zh: "卖家", en: "Seller" },
  chatBuyerFallback: { ko: "구매자", my: "ဝယ်သူ", zh: "买家", en: "Buyer" },
  chatOpeningRoom: {
    ko: "채팅방을 여는 중…",
    my: "ချတ်ခန်း ဖွင့်နေသည်…",
    zh: "正在打开聊天室…",
    en: "Opening chat…",
  },
  chatOpenRoomFailed: {
    ko: "채팅방을 열지 못했습니다.",
    my: "ချတ်ခန်း ဖွင့်၍ မရပါ။",
    zh: "无法打开聊天室。",
    en: "Could not open chat room.",
  },
  chatMissingListing: {
    ko: "상품 정보가 없어 채팅을 시작할 수 없습니다.",
    my: "ကုန်ပစ္စည်း အချက်အလက် မရှိသောကြောင့် ချတ်မစတင်နိုင်ပါ။",
    zh: "缺少商品信息，无法开始聊天。",
    en: "Missing listing info; cannot start chat.",
  },
  chatRetry: {
    ko: "다시 시도",
    my: "ပြန်ကြိုးစားမည်",
    zh: "重试",
    en: "Retry",
  },
  chatInboxLoadFailed: {
    ko: "채팅 목록을 불러오지 못했습니다.",
    my: "ချတ်စာရင်း ရယူ၍ မရပါ။",
    zh: "无法加载聊天列表。",
    en: "Could not load chats.",
  },
  chatLoadingOlder: {
    ko: "이전 메시지 불러오는 중…",
    my: "အရင်မက်ဆေ့ချ်များ ရယူနေသည်…",
    zh: "正在加载更早的消息…",
    en: "Loading older messages…",
  },
  chatThreadEmpty: {
    ko: "이 상품에 대해 궁금한 점을 물어보세요.",
    my: "ဤကုန်ပစ္စည်းအကြောင်း မေးမြန်းရန် မင်္ဂလာပါ ပြောပါ။",
    zh: "打个招呼，问问这件商品吧。",
    en: "Say hello and ask about this listing.",
  },
  chatInputPlaceholder: {
    ko: "메시지 입력…",
    my: "မက်ဆေ့ချ် ရိုက်ထည့်ပါ…",
    zh: "输入消息…",
    en: "Type a message…",
  },
  chatSystemMessage: {
    ko: "시스템 메시지",
    my: "စနစ်မက်ဆေ့ချ်",
    zh: "系统消息",
    en: "System message",
  },
  chatSystemDirectTradeRequested: {
    ko: "직거래 요청",
    my: "တိုက်ရိုက်တွေ့ဆုံ တောင်းဆိုချက်",
    zh: "当面交易请求",
    en: "In-person trade requested",
  },
  chatSystemDirectTradeLocationAccepted: {
    ko: "만남 장소 확정",
    my: "တွေ့ဆုံမည့် နေရာ အတည်ပြုပြီး",
    zh: "见面地点已确认",
    en: "Meeting place confirmed",
  },
  chatSystemDirectTradeLocationChangeRequested: {
    ko: "장소 변경 요청",
    my: "နေရာပြောင်းရန် တောင်းဆိုချက်",
    zh: "请求更改地点",
    en: "Location change requested",
  },
  chatSystemDirectTradeLocationChangeDenied: {
    ko: "장소 변경 거절",
    my: "နေရာပြောင်းရန် ငြင်းပယ်",
    zh: "已拒绝更改地点",
    en: "Location change denied",
  },
  chatSystemSafePaymentRequested: {
    ko: "안전결제 요청",
    my: "လုံခြုံငွေပေးချေမှု တောင်းဆိုမှု",
    zh: "担保支付请求",
    en: "Safe payment requested",
  },
  chatSystemSafePaymentInstructionSent: {
    ko: "결제 안내 발송",
    my: "ငွေပေးချေမှု ညွှန်ကြားချက် ပို့ပြီး",
    zh: "已发送付款指引",
    en: "Payment instructions sent",
  },
  chatSystemSafePaymentInitiated: {
    ko: "안전결제 진행 시작",
    my: "လုံခြုံငွေပေးချေမှု စတင်ပြီး",
    zh: "担保支付已开始",
    en: "Safe payment started",
  },
  chatSystemSafePaymentVerified: {
    ko: "결제 확인됨",
    my: "ငွေပေးချေမှု အတည်ပြုပြီး",
    zh: "付款已确认",
    en: "Payment confirmed",
  },
  chatSystemSafePaymentTransferred: {
    ko: "대금 이체 완료",
    my: "ငွေလွှဲပြီးပါပြီ",
    zh: "已完成转账",
    en: "Transfer completed",
  },
  chatSystemTransactionCompleted: {
    ko: "거래 완료",
    my: "အရောင်းအဝယ် ပြီးစီးပြီး",
    zh: "交易已完成",
    en: "Transaction completed",
  },
  chatTradeTools: {
    ko: "거래 도구",
    my: "ကုန်သွယ်မှုကိရိယာ",
    zh: "交易工具",
    en: "Trade tools",
  },
  chatOpenLiveMap: {
    ko: "지도 열기",
    my: "မြေပုံ ဖွင့်မည်",
    zh: "打开地图",
    en: "Open map",
  },
  chatMapNoLocations: {
    ko: "공유 중인 위치가 없습니다. 위치 공유를 시작해 주세요.",
    my: "မျှဝေထားသော တည်နေရာ မရှိသေးပါ။ တည်နေရာမျှဝေမှု စတင်ပါ။",
    zh: "暂无共享位置，请先开始位置共享。",
    en: "No shared locations yet. Start location sharing first.",
  },
  chatDirectTradeButton: {
    ko: "직거래",
    my: "တိုက်ရိုက်တွေ့ဆုံ",
    zh: "当面交易",
    en: "In-person trade",
  },
  chatDirectTradeTitle: {
    ko: "직거래 일정 설정",
    my: "တိုက်ရိုက်တွေ့ဆုံ အချိန်သတ်မှတ်",
    zh: "设置当面交易",
    en: "Set up in-person trade",
  },
  chatDirectTradeSave: {
    ko: "직거래 요청 저장",
    my: "တိုက်ရိုက်တွေ့ဆုံ တောင်းဆိုချက် သိမ်းမည်",
    zh: "保存当面交易请求",
    en: "Save in-person trade request",
  },
  chatDirectTradeValidation: {
    ko: "날짜와 시간을 입력해주세요.",
    my: "ရက်စွဲနှင့် အချိန်ကို ဖြည့်ပါ။",
    zh: "请填写日期和时间。",
    en: "Please enter date and time.",
  },
  chatDirectTradeSaved: {
    ko: "직거래 일정이 업데이트되었습니다.",
    my: "တိုက်ရိုက်တွေ့ဆုံ အချက်အလက်ကို ပြင်ပြီးပါပြီ။",
    zh: "当面交易信息已更新。",
    en: "In-person trade details updated.",
  },
  chatDirectTradeFailed: {
    ko: "직거래 요청에 실패했습니다.",
    my: "တိုက်ရိုက်တွေ့ဆုံ တောင်းဆိုမှု မအောင်မြင်ပါ။",
    zh: "提交当面交易失败。",
    en: "Failed to submit in-person trade.",
  },
  chatDirectTradeNeedStartFirst: {
    ko: "먼저 만남 날짜와 시간을 설정해 주세요.",
    my: "ဦးစွာ တွေ့ဆုံမည့် ရက်စွဲနှင့် အချိန်ကို သတ်မှတ်ပါ။",
    zh: "请先设置见面日期和时间。",
    en: "Set meeting date and time first.",
  },
  chatDirectTradeBuyerOnly: {
    ko: "구매자만 이용할 수 있습니다.",
    my: "ဝယ်သူသာ လုပ်ဆောင်နိုင်ပါသည်။",
    zh: "仅买家可操作。",
    en: "Buyers only.",
  },
  chatDirectTradeSellerOnly: {
    ko: "판매자만 이용할 수 있습니다.",
    my: "ရောင်းသူသာ လုပ်ဆောင်နိုင်ပါသည်။",
    zh: "仅卖家可操作。",
    en: "Sellers only.",
  },
  chatDirectTradeOpsMessageTypeIssue: {
    ko: "서버 메시지 유형(MessageType) 설정 오류입니다. 고객 지원에 문의해 주세요.",
    my: "ဆာဗာ မက်ဆေ့ချ် အမျိုးအစား (MessageType) ပြင်ဆင်မှု ပြဿနာရှိပါသည်။ အကူအညီဌာနကို ဆက်သွယ်ပါ။",
    zh: "服务器消息类型（MessageType）配置异常，请联系客服。",
    en: "Server message type (MessageType) misconfigured. Contact support.",
  },
  chatDirectTradeChooseListingFirst: {
    ko: "먼저 목록에 있는 만남 장소를 선택해 주세요.",
    my: "ဦးစွာ စာရင်းထဲမှ တွေ့ဆုံမည့် နေရာကို ရွေးချယ်ပါ။",
    zh: "请先选择列表中的见面地点。",
    en: "Choose a meeting place from the list first.",
  },
  chatDirectTradeAlreadyListingUsePicker: {
    ko: "이미 목록에 있는 장소입니다. 장소 선택 화면을 이용해 주세요.",
    my: "ဤနေရာသည် စာရင်းထဲတွင် ရှိပြီးသား နေရာဖြစ်ပါသည်။ နေရာရွေးချယ်မှု မျက်နှာပြင်ကို သုံးပါ။",
    zh: "该地点已在列表中，请使用地点选择器。",
    en: "This place is already listed. Use the place picker.",
  },
  chatDirectTradePendingChangeExists: {
    ko: "이미 장소 변경 요청이 진행 중입니다.",
    my: "နေရာပြောင်းရန် တောင်းဆိုမှု တစ်ခု ဆိုင်းငံ့နေပြီးဖြစ်ပါသည်။",
    zh: "已有地点更改请求待处理。",
    en: "A location change request is already pending.",
  },
  chatDirectTradeGpsRequiresAgreed: {
    ko: "먼저 만남 장소에 합의하고, 진행 중인 변경 요청이 없어야 합니다.",
    my: "ဦးစွာ တွေ့ဆုံမည့် နေရာကို သဘောတူပြီးမှ သုံးပါ (နေရာပြောင်းတောင်းဆိုမှု မဆိုင်းငံ့ရသေးရ)။",
    zh: "请先约定见面地点，且不能有进行中的地点更改请求。",
    en: "Agree on a meeting place first, with no pending change request.",
  },
  chatActiveDealBlockedTitle: {
    ko: "진행 거래 미선택",
    my: "လက်ရှိ ချုပ်ဆိုမှု မဟုတ်",
    zh: "非进行中交易",
    en: "Not the active deal",
  },
  chatActiveDealBlockedMessage: {
    ko: "판매자가 다른 구매자를 선택했습니다. 채팅은 계속할 수 있지만 거래 관련 기능은 사용할 수 없습니다. 이 채팅이 진행 중인 거래여야 한다면 판매자에게 문의하세요.",
    my: "ရောင်းသူက အခြား ဝယ်သူတစ်ဦးကို ရွေးချယ်ထားပါသည်။ ချတ်ဆက်လက်လုပ်နိုင်သော်လုံး ချုပ်ဆိုမှု လုပ်ဆောင်ချက်များ မစတင်နိုင်ပါ။ ဤချတ်သည် လက်ရှိ ချုပ်ဆိုမှု ဖြစ်သင့်လျှင် ရောင်းသူကို ဆက်သွယ်ပါ။",
    zh: "卖家已选择其他买家。您仍可聊天，但无法发起交易相关操作。若本聊天应为进行中的交易，请联系卖家。",
    en: "The seller chose another buyer. You can still chat, but trade actions are unavailable. Contact the seller if this chat should be the active deal.",
  },
  chatActiveDealSellerProductNote: {
    ko: "판매자는 내 판매글 상세에서 구매자를 선택할 수 있어요. 여기서도 이 구매자를 선택할 수 있습니다.",
    my: "ရောင်းသူသည် မိမိ၏ ရောင်းချမှုစာမျက်နှာ အသေးစိတ်တွင် ဝယ်သူကို ရွေးချယ်နိုင်ပါသည်။ ဤနေရာတွင်လည်း ဤဝယ်သူကို ရွေးချယ်နိုင်ပါသည်။",
    zh: "卖家可在“我的商品详情”中选择买家，你也可以在这里选择该买家。",
    en: "Sellers can pick a buyer in My listing details, or select this buyer here.",
  },
  chatActiveDealBuyerProductNote: {
    ko: "판매자가 상품 상세 화면에서 진행 중인 구매자를 선택합니다.",
    my: "ရောင်းသူသည် ပစ္စည်းအသေးစိတ် မျက်နှာပြင်မှ လက်ရှိ ဝယ်သူကို ရွေးချယ်ပါသည်။",
    zh: "卖家会在商品详情页选择当前进行中的买家。",
    en: "The seller selects the active buyer on the product detail screen.",
  },
  chatActiveDealSelectThisBuyer: {
    ko: "이 구매자 선택",
    my: "ဤဝယ်သူကို ရွေးချယ်မည်",
    zh: "选择该买家",
    en: "Select this buyer",
  },
  chatActiveDealDismiss: {
    ko: "OK",
    my: "OK",
    zh: "OK",
    en: "OK",
  },
  chatDirectTradeRequestTitle: {
    ko: "직거래 요청",
    my: "တိုက်ရိုက်တွေ့ဆုံရန် တောင်းဆိုချက်",
    zh: "当面交易请求",
    en: "In-person trade request",
  },
  chatDirectTradeRequestDate: {
    ko: "만남 날짜",
    my: "တွေ့မည့်ရက်",
    zh: "见面日期",
    en: "Meeting date",
  },
  chatDirectTradeRequestTime: {
    ko: "만남 시간",
    my: "တွေ့မည့်အချိန်",
    zh: "见面时间",
    en: "Meeting time",
  },
  chatDirectTradeRequestLocation: {
    ko: "만남 장소",
    my: "တွေ့မည့်နေရာ",
    zh: "见面地点",
    en: "Meeting place",
  },
  chatDirectTradeRequestNoLocation: {
    ko: "약속된 장소 없음",
    my: "သတ်မှတ်ထားသော နေရာ မရှိပါ",
    zh: "未指定地点",
    en: "No place specified",
  },
  chatDirectTradePickLocation: {
    ko: "만남 장소 선택",
    my: "တွေ့ဆုံရန် နေရာ ရွေးချယ်ပါ",
    zh: "选择见面地点",
    en: "Choose meeting place",
  },
  chatDirectTradeNoLocations: {
    ko: "등록된 만남 장소가 없습니다.",
    my: "တွေ့ဆုံရန် နေရာ မရှိပါ။",
    zh: "暂无登记的见面地点。",
    en: "No registered meeting places.",
  },
  chatDirectTradeRequestOtherPlace: {
    ko: "다른 장소 제안하기",
    my: "အခြားနေရာ အဆိုပြုရန်",
    zh: "提议其他地点",
    en: "Suggest another place",
  },
  chatDirectTradeRequestChangeSubmit: {
    ko: "장소 변경 요청",
    my: "နေရာပြောင်းရန် တောင်းဆိုမည်",
    zh: "请求更改地点",
    en: "Request location change",
  },
  chatUseCurrentLocation: {
    ko: "현지 위치 사용",
    my: "လက်ရှိတည်နေရာ သုံးမည်",
    zh: "使用当前位置",
    en: "Use current location",
  },
  chatGpsError: {
    ko: "위치를 가져올 수 없습니다. 다시 시도해 주세요.",
    my: "တည်နေရာ ရယူ၍မရပါ။ ထပ်စမ်းပါ။",
    zh: "无法获取位置，请重试。",
    en: "Could not get location. Please try again.",
  },
  chatDirectTradeChangeLocation: {
    ko: "장소 변경",
    my: "နေရာ ပြောင်းရန်",
    zh: "更改地点",
    en: "Change location",
  },
  chatDirectTradeLocationLabel: {
    ko: "약속 장소",
    my: "တွေ့ဆုံမည့် နေရာ",
    zh: "约定地点",
    en: "Agreed place",
  },
  chatDirectTradeAwaitingLocation: {
    ko: "구매자가 장소를 선택할 때까지 기다리는 중...",
    my: "ဝယ်သူ နေရာရွေးရန် စောင့်ဆိုင်းနေသည်...",
    zh: "等待买家选择地点...",
    en: "Waiting for buyer to choose a place…",
  },
  chatDirectTradeAwaitingDetails: {
    ko: "직거래 정보를 불러오는 중...",
    my: "တိုက်ရိုက်တွေ့ဆုံ အချက်အလက် ရယူနေသည်...",
    zh: "正在加载当面交易信息...",
    en: "Loading in-person trade details…",
  },
  chatDirectTradePendingChange: {
    ko: "장소 변경 요청 있음",
    my: "နေရာပြောင်းရန် တောင်းဆိုမှု ရှိသည်",
    zh: "有地点更改请求",
    en: "Location change requested",
  },
  chatDirectTradePendingSeller: {
    ko: "판매자의 응답을 기다리는 중...",
    my: "ရောင်းသူ၏ အကြောင်းပြန်ချက်ကို စောင့်ဆိုင်းနေသည်...",
    zh: "等待卖家回复...",
    en: "Waiting for seller response…",
  },
  chatDirectTradeLocationRequestPending: {
    ko: "장소 변경 요청이 판매자 확인을 기다리는 중입니다.",
    my: "နေရာပြောင်းရန် တောင်းဆိုမှု ရောင်းသူ အတည်ပြုချက်ကို စောင့်နေသည်။",
    zh: "地点更改请求待卖家确认。",
    en: "Location change awaiting seller confirmation.",
  },
  chatDirectTradeAccept: {
    ko: "수락",
    my: "လက်ခံမည်",
    zh: "接受",
    en: "Accept",
  },
  chatDirectTradeDeny: {
    ko: "거절",
    my: "ငြင်းပယ်မည်",
    zh: "拒绝",
    en: "Deny",
  },
  chatDirectTradeLocationAccepted: {
    ko: "만남 장소가 확정되었습니다",
    my: "တွေ့ဆုံရန် နေရာ သတ်မှတ်ပြီးပါပြီ",
    zh: "见面地点已确认",
    en: "Meeting place confirmed",
  },
  chatDirectTradeLocationDenied: {
    ko: "장소 변경이 거절되었습니다",
    my: "နေရာပြောင်းလဲမှု ငြင်းပယ်ခံရပါသည်",
    zh: "地点更改已被拒绝",
    en: "Location change was denied",
  },
  chatDirectTradeLocationChangeRequested: {
    ko: "장소 변경이 요청되었습니다",
    my: "နေရာပြောင်းရန် တောင်းဆိုထားပါသည်",
    zh: "已请求更改地点",
    en: "Location change requested",
  },
  chatSafePaymentButton: {
    ko: "안전결제",
    my: "လုံခြုံငွေပေးချေမှု",
    zh: "担保支付",
    en: "Safe payment",
  },
  chatSafePaymentTitle: {
    ko: "안전결제",
    my: "လုံခြုံငွေပေးချေမှု",
    zh: "担保支付",
    en: "Safe payment",
  },
  chatSafePaymentBuyerOnly: {
    ko: "안전결제 요청과 제출은 구매자만 가능합니다.",
    my: "လုံခြုံငွေပေးချေမှုကို ဝယ်သူသာ တောင်းဆို/တင်ပြနိုင်ပါသည်။",
    zh: "仅买家可以请求或提交担保支付。",
    en: "Only buyers can request or submit safe payment.",
  },
  chatSafePaymentStatusLabel: {
    ko: "현재 상태",
    my: "လက်ရှိအခြေအနေ",
    zh: "当前状态",
    en: "Current status",
  },
  chatSafePaymentRequestHint: {
    ko: "안전결제를 요청하면 관리자가 KBZ 수취 번호를 안내합니다.",
    my: "လုံခြုံငွေပေးချေမှု တောင်းဆိုပြီးနောက် Admin က KBZ လက်ခံနံပါတ် ပေးပို့ပါမည်။",
    zh: "请求担保支付后，管理员会发送 KBZ 收款号码。",
    en: "After you request safe payment, an admin sends a KBZ payee number.",
  },
  chatSafePaymentRequest: {
    ko: "안전결제 요청",
    my: "လုံခြုံငွေပေးချေမှု တောင်းဆိုမည်",
    zh: "请求担保支付",
    en: "Request safe payment",
  },
  chatSafePaymentRequestSuccess: {
    ko: "안전결제를 요청했습니다. 관리자 안내를 기다려주세요.",
    my: "လုံခြုံငွေပေးချေမှု တောင်းဆိုပြီးပါပြီ။ Admin ညွှန်ကြားချက်ကို စောင့်ပါ။",
    zh: "担保支付请求已发送，请等待管理员指引。",
    en: "Safe payment requested. Wait for admin instructions.",
  },
  chatSafePaymentLoadFailed: {
    ko: "안전결제 정보를 불러오지 못했습니다.",
    my: "လုံခြုံငွေပေးချေမှု အချက်အလက် မရယူနိုင်ပါ။",
    zh: "加载担保支付信息失败。",
    en: "Failed to load safe payment info.",
  },
  chatSafePaymentNoInstruction: {
    ko: "관리자 안내 대기 중",
    my: "Admin ညွှန်ကြားချက် စောင့်ဆိုင်းနေသည်",
    zh: "等待管理员指引",
    en: "Waiting for admin instructions",
  },
  chatSafePaymentInstructionPhone: {
    ko: "관리자 수취 번호",
    my: "Admin လက်ခံဖုန်းနံပါတ်",
    zh: "管理员收款号码",
    en: "Admin payee number",
  },
  chatSafePaymentInstructionSentAt: {
    ko: "안내 발송 시각",
    my: "ညွှန်ကြားချက် ပို့ချိန်",
    zh: "指引发送时间",
    en: "Instructions sent at",
  },
  chatSafePaymentInstructionNote: {
    ko: "관리자 메모",
    my: "Admin မှတ်ချက်",
    zh: "管理员备注",
    en: "Admin note",
  },
  chatSafePaymentFormName: {
    ko: "송금자 KBZ 이름",
    my: "ပေးချေသူ KBZ အမည်",
    zh: "付款人 KBZ 姓名",
    en: "Payer KBZ name",
  },
  chatSafePaymentFormPhone: {
    ko: "송금자 KBZ 전화번호",
    my: "ပေးချေသူ KBZ ဖုန်း",
    zh: "付款人 KBZ 手机号",
    en: "Payer KBZ phone",
  },
  chatSafePaymentFormAmount: {
    ko: "결제 금액 (MMK)",
    my: "ငွေပေးချေမှုပမာဏ (MMK)",
    zh: "支付金额 (MMK)",
    en: "Payment amount (MMK)",
  },
  chatSafePaymentFormTxnId: {
    ko: "KBZ 거래 ID",
    my: "KBZ လုပ်ဆောင်မှု ID",
    zh: "KBZ 交易号",
    en: "KBZ 거래 ID",
  },
  chatSafePaymentSubmit: {
    ko: "결제 정보 제출",
    my: "ငွေပေးချေမှု အချက်အလက် တင်ပြမည်",
    zh: "提交支付信息",
    en: "Submit payment info",
  },
  chatSafePaymentValidation: {
    ko: "이름, 전화번호, 금액, 거래 ID를 모두 입력해주세요.",
    my: "အမည်၊ ဖုန်း၊ ငွေပမာဏနှင့် လုပ်ဆောင်မှု ID ကို အပြည့်အစုံ ဖြည့်ပါ။",
    zh: "请完整填写姓名、手机号、金额和交易号。",
    en: "Please fill in name, phone, amount, and transaction ID.",
  },
  chatSafePaymentAmountMismatch: {
    ko: "결제 금액이 거래 금액과 일치하지 않습니다. 정확한 금액을 입력해주세요.",
    my: "ငွေပမာဏသည် ကုန်သွယ်မှုပမာဏနှင့် မကိုက်ညီပါ။ မှန်ကန်သောပမာဏကို ထည့်ပါ။",
    zh: "支付金额与交易金额不匹配，请输入正确的金额。",
    en: "Amount does not match the trade total. Enter the correct amount.",
  },
  chatSafePaymentSubmitSuccess: {
    ko: "결제 정보를 제출했습니다. 관리자 확인을 기다려주세요.",
    my: "ငွေပေးချေမှုအချက်အလက် တင်ပြပြီးပါပြီ။ Admin အတည်ပြုချက်ကို စောင့်ပါ။",
    zh: "支付信息已提交，请等待管理员确认。",
    en: "Payment info submitted. Wait for admin confirmation.",
  },
  chatCompleteTradeButton: {
    ko: "완료/취소/리뷰",
    my: "ပြီးစီး/ပယ်ဖျက်/သုံးသပ်ချက်",
    zh: "完成/取消/评价",
    en: "Complete / cancel / review",
  },
  chatCompleteTradeTitle: {
    ko: "거래 완료 확인",
    my: "အရောင်းအဝယ် ပြီးစီးကြောင်း အတည်ပြု",
    zh: "确认交易完成",
    en: "Confirm trade completion",
  },
  chatCompleteTradeStatus: {
    ko: "거래 상태",
    my: "အရောင်းအဝယ် အခြေအနေ",
    zh: "交易状态",
    en: "Trade status",
  },
  chatCompleteTradeHint: {
    ko: "양측이 완료를 누르면 거래 상태가 COMPLETED가 됩니다.",
    my: "နှစ်ဖက်စလုံး ပြီးစီးကြောင်း အတည်ပြုပါက အခြေအနေ COMPLETED သို့ ရောက်မည်။",
    zh: "买卖双方都确认后，交易状态会变为 COMPLETED。",
    en: "When both sides confirm, the trade status becomes COMPLETED.",
  },
  chatCompleteTradeModalGuide: {
    ko: "이 화면에서 거래를 완료하거나 취소할 수 있습니다. 취소 시 20포인트가 차감됩니다. 안전결제가 이미 시작된 경우 취소할 수 없습니다.",
    my: "ဤမျက်နှာပြင်တွင် အရောင်းအဝယ်ကို ပြီးစီးအောင်လုပ်ခြင်း သို့မဟုတ် ပယ်ဖျက်နိုင်ပါသည်။ ပယ်ဖျက်ပါက ပွိုင့် 20 လျှော့ယူမည်။ လုံခြုံငွေပေးချေမှု စတင်ပြီးပါက ပယ်ဖျက်၍မရပါ။",
    zh: "在此页面可完成或取消交易。取消将扣除 20 积分。若担保支付已开始，则不允许取消。",
    en: "Complete or cancel the trade here. Canceling deducts 20 points. Cancel is blocked once safe payment has started.",
  },  chatCompleteTradeAction: {
    ko: "거래 완료 표시",
    my: "အရောင်းအဝယ် ပြီးစီးကြောင်း မှတ်သားမည်",
    zh: "标记交易完成",
    en: "Mark trade complete",
  },
  chatCompleteTradeSuccess: {
    ko: "거래 완료 상태를 업데이트했습니다.",
    my: "အရောင်းအဝယ် ပြီးစီးအခြေအနေကို အပ်ဒိတ်လုပ်ပြီးပါပြီ။",
    zh: "交易完成状态已更新。",
    en: "Trade completion status updated.",
  },
  chatCompleteTradePendingBoth: {
    ko: "상대방의 완료 확인을 기다리는 중입니다.",
    my: "တစ်ဖက်ဖက်၏ ပြီးစီးအတည်ပြုချက်ကို စောင့်နေသည်။",
    zh: "正在等待对方确认完成。",
    en: "Waiting for the other party to confirm.",
  },
  chatCompleteTradeUnavailable: {
    ko: "완료 가능한 거래를 찾지 못했습니다.",
    my: "ပြီးစီးမှတ်သားနိုင်သော အရောင်းအဝယ် မတွေ့ပါ။",
    zh: "未找到可完成的交易。",
    en: "No completable trade found.",
  },
  chatCompleteTradeWaitAdminReceived: {
    ko: "관리자가 안전결제 입금 확인 후에만 완료할 수 있습니다.",
    my: "Admin က လုံခြုံငွေပေးချေမှု လက်ခံကြောင်း အတည်ပြုပြီးမှ ပြီးစီးနိုင်ပါသည်။",
    zh: "需管理员确认担保支付已收款后才能完成交易。",
    en: "Complete only after admin confirms safe payment was received.",
  },
  chatCompleteTradeUseSafePaymentId: {
    ko: "안전결제가 시작된 거래입니다. 안전결제 거래 기준으로 완료를 진행하세요.",
    my: "လုံခြုံငွေပေးချေမှု စတင်ထားသော အရောင်းအဝယ်ဖြစ်သည်။ Safe payment 거래 ID ဖြင့် ပြီးစီးလုပ်ဆောင်ပါ။",
    zh: "该交易已进入担保支付流程，请使用担保支付交易继续完成。",
    en: "This trade is in safe payment. Continue completion via the safe-payment trade.",
  },
  chatCompleteTradeAlreadyDone: {
    ko: "이 거래는 이미 안전결제로 완료되었습니다.",
    my: "ဤအရောင်းအဝယ်သည် လုံခြုံငွေပေးချေမှုဖြင့် ပြီးစီးပြီးဖြစ်သည်။",
    zh: "该交易已通过担保支付完成。",
    en: "This trade was already completed via safe payment.",
  },
  chatCancelTradeTitle: {
    ko: "거래 취소",
    my: "အရောင်းအဝယ် ပယ်ဖျက်",
    zh: "取消交易",
    en: "Cancel trade",
  },
  chatCancelTradeAction: {
    ko: "거래 취소",
    my: "အရောင်းအဝယ် ပယ်ဖျက်",
    zh: "取消交易",
    en: "Cancel trade",
  },
  chatCancelTradeConfirm: {
    ko: "이 거래를 취소할까요? 계정에서 20포인트가 차감됩니다. 안전결제가 이미 시작된 경우 취소할 수 없습니다.",
    my: "ဤအရောင်းအဝယ်ကို ပယ်ဖျက်မလား။ သင့်အကောင့်မှ ပွိုင့် 20 လျှော့မည်။ လုံခြုံငွေပေးချေမှု စတင်ပြီးပါက ပယ်ဖျက်၍မရပါ။",
    zh: "要取消该交易吗？将从账户扣除 20 积分。若担保支付已发起，则不允许取消。",
    en: "Cancel this trade? 20 points will be deducted. Cancel is not allowed if safe payment has started.",
  },
  chatCancelTradeSuccess: {
    ko: "거래가 취소되었습니다. 취소 수수료로 20포인트가 차감되었습니다.",
    my: "အရောင်းအဝယ်ကို ပယ်ဖျက်ပြီးပါပြီ။ ပယ်ဖျက်မှုအတွက် ပွိုင့် 20 လျှော့ယူခဲ့သည်။",
    zh: "交易已取消，已扣除 20 积分作为取消费用。",
    en: "Trade canceled. 20 points deducted as a cancellation fee.",
  },
  chatCancelTradePenaltyNote: {
    ko: "취소됨. 취소 수수료로 20포인트 차감.",
    my: "ပယ်ဖျက်ပြီး။ ပယ်ဖျက်မှုအတွက် ပွိုင့် 20 လျှော့ယူထားသည်။",
    zh: "已取消，已扣除 20 积分作为取消费用。",
    en: "Canceled. 20-point cancellation fee applied.",
  },
  chatCancelTradeBlocked: {
    ko: "이 거래는 이미 완료되었거나 환불되어 취소할 수 없습니다.",
    my: "ဤအရောင်းအဝယ်သည် ပြီးစီးပြီး သို့မဟုတ် ပြန်အမ်းပြီးဖြစ်သဖြင့် ပယ်ဖျက်၍မရပါ။",
    zh: "该交易已完成或已退款，无法取消。",
    en: "This trade is already completed or refunded and cannot be canceled.",
  },
  chatCancelTradeSafePaymentBlocked: {
    ko: "결제 제출 후에는 안전결제를 취소할 수 없습니다.",
    my: "ငွေပေးချေမှု တင်ပြီးနောက် လုံခြုံငွေပေးချေမှုကို ပယ်ဖျက်၍မရပါ။",
    zh: "提交付款后无法取消担保支付。",
    en: "Safe payment cannot be canceled after payment is submitted.",
  },
  chatCancelTradeFailed: {
    ko: "거래를 취소하지 못했습니다. 다시 시도해 주세요.",
    my: "အရောင်းအဝယ်ကို ပယ်ဖျက်၍မရပါ။ ထပ်မံကြိုးစားပါ။",
    zh: "无法取消该交易，请重试。",
    en: "Could not cancel the trade. Please try again.",
  },
  chatReviewTitle: {
    ko: "거래 리뷰",
    my: "အရောင်းအဝယ် သုံးသပ်ချက်",
    zh: "交易评价",
    en: "Trade review",
  },
  chatReviewHint: {
    ko: "거래가 완료되었습니다. 상대방을 평가해주세요.",
    my: "အရောင်းအဝယ် ပြီးစီးပြီးပါပြီ။ တစ်ဖက်ကို အကဲဖြတ်ပေးပါ။",
    zh: "交易已完成，请为对方评分。",
    en: "Trade completed. Please rate the other party.",
  },
  chatReviewStarsLabel: {
    ko: "별점 (1~5)",
    my: "ကြယ်ပွင့်အဆင့် (၁~၅)",
    zh: "评分（1~5）",
    en: "Rating (1–5)",
  },
  chatReviewCommentLabel: {
    ko: "리뷰 코멘트 (선택)",
    my: "သုံးသပ်ချက် (ရွေးချယ်နိုင်)",
    zh: "评价内容（可选）",
    en: "Review (optional)",
  },
  chatReviewCommentPlaceholder: {
    ko: "거래 후기를 입력하세요",
    my: "အရောင်းအဝယ် အတွေ့အကြုံကို ရေးပါ",
    zh: "填写交易反馈",
    en: "Share feedback about the trade",
  },
  chatReviewSubmit: {
    ko: "리뷰 제출",
    my: "သုံးသပ်ချက် တင်ပြမည်",
    zh: "提交评价",
    en: "Submit review",
  },
  chatReviewValidation: {
    ko: "별점을 선택해주세요.",
    my: "ကြယ်ပွင့်အဆင့်ကို ရွေးပါ။",
    zh: "请选择评分。",
    en: "Please select a rating.",
  },
  chatReviewSuccess: {
    ko: "리뷰를 제출했습니다.",
    my: "သုံးသပ်ချက်ကို တင်ပြပြီးပါပြီ။",
    zh: "评价已提交。",
    en: "Review submitted.",
  },
  chatReviewCompleteFirst: {
    ko: "먼저 거래를 완료해 주세요.",
    my: "ဦးစွာ အရောင်းအဝယ်ကို ပြီးစီးအောင် လုပ်ပါ။",
    zh: "请先完成交易。",
    en: "Complete the trade first.",
  },
  chatReviewUnlockedHelper: {
    ko: "지금 리뷰를 남길 수 있어요. 상대방은 거래를 완료한 뒤 리뷰를 남길 수 있습니다.",
    my: "ယခု သုံးသပ်ချက်ရေးနိုင်ပါပြီ။ တစ်ဖက်သူက အရောင်းအဝယ် ပြီးစီးပြီးမှ သုံးသပ်ချက်ရေးနိုင်ပါသည်။",
    zh: "你现在可以评价；对方在完成交易后才能评价。",
    en: "You can review now; the other party can review after they complete.",
  },
  chatMeetingDateLabel: {
    ko: "만남 날짜",
    my: "တွေ့ဆုံမည့် ရက်စွဲ",
    zh: "见面日期",
    en: "Meeting date",
  },
  chatMeetingTimeLabel: {
    ko: "만남 시간",
    my: "တွေ့ဆုံမည့် အချိန်",
    zh: "见面时间",
    en: "Meeting time",
  },
  chatMeetingDatePlaceholder: {
    ko: "YYYY-MM-DD",
    my: "YYYY-MM-DD",
    zh: "YYYY-MM-DD",
    en: "YYYY-MM-DD",
  },
  chatMeetingTimePlaceholder: {
    ko: "HH:mm (24시간)",
    my: "HH:mm (၂၄ နာရီ)",
    zh: "HH:mm（24小时）",
    en: "HH:mm (24-hour)",
  },
  dateTimePickerConfirm: {
    ko: "완료",
    my: "ပြီးပြီ",
    zh: "完成",
    en: "Done",
  },
  dateTimePickerCancel: {
    ko: "취소",
    my: "ပယ်ဖျက်",
    zh: "取消",
    en: "Cancel",
  },
  dateTimePickerSelectDate: {
    ko: "날짜 선택",
    my: "ရက်စွဲ ရွေးချယ်ရန်",
    zh: "选择日期",
    en: "Select date",
  },
  dateTimePickerSelectTime: {
    ko: "시간 선택",
    my: "အချိန် ရွေးချယ်ရန်",
    zh: "选择时间",
    en: "Select time",
  },
  chatMeetingDateInvalid: {
    ko: "날짜 형식이 올바르지 않습니다.",
    my: "ရက်စွဲ ပုံစံ မမှန်ပါ။",
    zh: "日期格式无效。",
    en: "Invalid date format.",
  },
  chatMeetingTimeInvalid: {
    ko: "시간 형식이 올바르지 않습니다. (HH:mm)",
    my: "အချိန် ပုံစံ မမှန်ပါ။ (HH:mm)",
    zh: "时间格式无效（HH:mm）。",
    en: "Invalid time format (HH:mm).",
  },
  chatMeetingCoordsPairRequired: {
    ko: "위도와 경도는 함께 입력해야 합니다.",
    my: "လတ္တီကျုနှင့် လောင်ဂျီကျု နှစ်ခုလုံး ထည့်ပါ။",
    zh: "纬度和经度需同时填写。",
    en: "Latitude and longitude must both be set.",
  },
  chatMeetingCoordsInvalid: {
    ko: "위도(-90~90) 또는 경도(-180~180) 값이 올바르지 않습니다.",
    my: "လတ္တီကျု (-90~90) သို့မဟုတ် လောင်ဂျီကျု (-180~180) မမှန်ပါ။",
    zh: "纬度（-90~90）或经度（-180~180）无效。",
    en: "Invalid latitude (−90–90) or longitude (−180–180).",
  },
  chatMeetingLocationPlaceholder: {
    ko: "만남 장소",
    my: "တွေ့ဆုံမည့် နေရာ",
    zh: "见面地点",
    en: "Meeting place",
  },
  chatMeetingLatitudePlaceholder: {
    ko: "위도 (선택)",
    my: "လတ္တီကျု (မဖြစ်မနေ မဟုတ်)",
    zh: "纬度（可选）",
    en: "Latitude (optional)",
  },
  chatMeetingLongitudePlaceholder: {
    ko: "경도 (선택)",
    my: "လောင်ဂျီကျု (မဖြစ်မနေ မဟုတ်)",
    zh: "经度（可选）",
    en: "Longitude (optional)",
  },
  chatLocationRequiresDirectTrade: {
    ko: "실시간 위치는 직거래 일정을 저장한 후 사용할 수 있습니다.",
    my: "တိုက်ရိုက်တွေ့ဆုံမှု အချိန်သတ်မှတ်ပြီးမှ တိုက်ရိုက် တည်နေရာ မျှဝေနိုင်ပါသည်။",
    zh: "保存当面交易安排后可使用实时位置共享。",
    en: "Live location is available after saving an in-person trade schedule.",
  },
  chatTradeToolsSubtitleNoDirectTrade: {
    ko: "직거래·안전결제·완료",
    my: "တိုက်ရိုက်တွေ့ဆုံ · လုံခြုံငွေပေးချေမှု · ပြီးစီး",
    zh: "当面交易 · 担保支付 · 完成",
    en: "In-person · Safe pay · Complete",
  },
  chatStartSharing: {
    ko: "공유 시작",
    my: "မျှဝေမှု စတင်",
    zh: "开始共享",
    en: "Start sharing",
  },
  chatUpdateLocation: {
    ko: "위치 업데이트",
    my: "တည်နေရာ အပ်ဒိတ်",
    zh: "更新位置",
    en: "Update location",
  },
  chatStopSharing: {
    ko: "공유 중지",
    my: "မျှဝေမှု ရပ်မည်",
    zh: "停止共享",
    en: "Stop sharing",
  },
  chatLiveLocationMap: {
    ko: "실시간 위치 지도",
    my: "တိုက်ရိုက် တည်နေရာ မြေပုံ",
    zh: "实时位置地图",
    en: "Live location map",
  },
  chatLocationStatusSharing: {
    ko: "공유 중",
    my: "မျှဝေနေသည်",
    zh: "共享中",
    en: "Sharing",
  },
  chatLocationStatusStarting: {
    ko: "시작 중",
    my: "စတင်နေသည်",
    zh: "启动中",
    en: "Starting",
  },
  chatLocationStatusOff: {
    ko: "꺼짐",
    my: "ပိတ်ထား",
    zh: "已关闭",
    en: "Off",
  },
  chatLocationUpdatedAt: {
    ko: "위치 업데이트 시각: {time}",
    my: "တည်နေရာ အပ်ဒိတ် အချိန်: {time}",
    zh: "位置更新时间：{time}",
      en: "Chat Location Updated At"
  },
  chatLocationPermissionDenied: {
    ko: "위치 권한이 필요합니다.",
    my: "တည်နေရာခွင့်ပြုချက် လိုအပ်ပါသည်။",
    zh: "需要位置权限。",
    en: "Location permission is required.",
  },
  chatLocationAlreadyActive: {
    ko: "이미 위치 공유가 활성화되어 좌표만 갱신했습니다.",
    my: "တည်နေရာမျှဝေမှု လုပ်ဆောင်နေပြီး ဖြစ်သောကြောင့် လက်ရှိ tọa标 ကိုသာ အပ်ဒိတ် လုပ်ခဲ့သည်။",
    zh: "位置共享已在进行，仅更新了坐标。",
    en: "Location sharing is already active; coordinates were updated.",
  },
  chatLocationStartFailed: {
    ko: "위치 공유 시작에 실패했습니다.",
    my: "တည်နေရာမျှဝေမှု စတင်ရာတွင် မအောင်မြင်ပါ။",
    zh: "开始位置共享失败。",
    en: "Failed to start location sharing.",
  },
  chatLocationUpdateFailed: {
    ko: "위치 업데이트에 실패했습니다.",
    my: "တည်နေရာ အပ်ဒိတ် မအောင်မြင်ပါ။",
    zh: "更新位置失败。",
    en: "Failed to update location.",
  },
  chatLocationStopFailed: {
    ko: "위치 공유 중지에 실패했습니다.",
    my: "တည်နေရာမျှဝေမှု ရပ်ရန် မအောင်မြင်ပါ။",
    zh: "停止位置共享失败。",
    en: "Failed to stop location sharing.",
  },
  chatLocationStarted: {
    ko: "위치 공유를 시작했습니다.",
    my: "တည်နေရာမျှဝေမှု စတင်ပြီးပါပြီ။",
    zh: "已开始共享位置。",
    en: "Location sharing started.",
  },
  chatLocationStopped: {
    ko: "위치 공유를 중지했습니다.",
    my: "တည်နေရာမျှဝေမှု ရပ်ပြီးပါပြီ။",
    zh: "已停止共享位置。",
    en: "Location sharing stopped.",
  },
  chatLocationUpdated: {
    ko: "위치를 업데이트했습니다.",
    my: "တည်နေရာ အပ်ဒိတ် လုပ်ပြီးပါပြီ။",
    zh: "位置已更新。",
    en: "Location updated.",
  },
  notificationsTitle: {
    ko: "알림함",
    my: "အသိပေးစာများ",
    zh: "通知收件箱",
    en: "Notifications",
  },
  notificationsEmpty: {
    ko: "아직 알림이 없습니다.",
    my: "အသိပေးချက် မရှိသေးပါ။",
    zh: "暂无通知。",
    en: "No notifications yet.",
  },
  actionCooldownRemaining: {
    ko: "{hours}시간 {minutes}분 후에 다시 시도할 수 있습니다.",
    my: "{hours} နာရီ {minutes} မိနစ်အကြာတွင် ပြန်လည်ကြိုးစားနိုင်ပါသည်။",
    zh: "{hours} 小时 {minutes} 分钟后可再次操作。",
    en: "You can try again in {hours}h {minutes}m.",
  },
  "noti.kbz.requested.title": {
    ko: "KBZPay 인증 요청됨",
    my: "KBZPay အတည်ပြုရန် တောင်းဆိုပြီး",
    zh: "已请求 KBZPay 验证",
    en: "KBZPay verification requested",
  },
  "noti.kbz.requested.body": {
    ko: "요청이 접수되었습니다. 관리자 안내를 기다려주세요. {message}",
    my: "တောင်းဆိုမှုကို လက်ခံပြီးပါပြီ။ အုပ်ချုပ်သူ ညွှန်ကြားချက်ကို စောင့်ပါ။ {message}",
    zh: "请求已提交，请等待管理员指引。{message}",
    en: "Request received. Please wait for admin instructions. {message}",
  },
  "noti.kbz.instruction.title": {
    ko: "KBZPay 송금 안내 도착",
    my: "KBZPay လွှဲပြောင်းညွှန်ကြားချက် ရရှိပြီး",
    zh: "收到 KBZPay 转账指引",
    en: "KBZPay transfer instructions",
  },
  "noti.kbz.instruction.body": {
    ko: "아래 번호로 {amount} MMK 송금 후 거래번호를 제출하세요. {transferPhone} {adminNote}",
    my: "{transferPhone} သို့ {amount} MMK လွှဲပြီးနောက် လုပ်ဆောင်မှုအမှတ်ကို တင်ပြပါ။ {adminNote}",
    zh: "请向 {transferPhone} 转账 {amount} MMK，然后提交交易号。{adminNote}",
    en: "Transfer {amount} MMK to {transferPhone}, then submit the transaction ID. {adminNote}",
  },
  "noti.kbz.transactionSubmitted.title": {
    ko: "KBZPay 거래번호 제출됨",
    my: "KBZPay လုပ်ဆောင်မှုအမှတ် တင်ပြပြီး",
    zh: "已提交 KBZPay 交易号",
    en: "KBZPay transaction submitted",
  },
  "noti.kbz.transactionSubmitted.body": {
    ko: "거래번호: {kbzTransactionId}. 관리자 확인을 기다리는 중입니다.",
    my: "လုပ်ဆောင်မှုအမှတ်: {kbzTransactionId}။ အုပ်ချုပ်သူ အတည်ပြုမှုကို စောင့်နေပါသည်။",
    zh: "交易号：{kbzTransactionId}。等待管理员核验。",
    en: "Transaction ID: {kbzTransactionId}. Waiting for admin review.",
  },
  "noti.kbz.verified.title": {
    ko: "KBZPay 인증 완료",
    my: "KBZPay အတည်ပြုပြီး",
    zh: "KBZPay 验证已完成",
    en: "KBZPay verified",
  },
  "noti.kbz.verified.body": {
    ko: "인증이 완료되었습니다. {adminNote}",
    my: "အတည်ပြုခြင်း ပြီးစီးပြီးပါပြီ။ {adminNote}",
    zh: "验证已完成。{adminNote}",
    en: "Verification complete. {adminNote}",
  },

  "noti.points.reviewReceived.title": {
    ko: "리뷰로 포인트 적립",
    my: "သုံးသပ်ချက်ဖြင့် အမှတ်များ",
    zh: "评价获得积分",
    en: "Review points received",
  },
  "noti.points.reviewReceived.body": {
    ko: "별점 {stars} 리뷰로 {pointsAwarded}점이 적립되었습니다.",
    my: "{stars} ကြယ်ပွင့်သုံးသပ်ချက်ဖြင့် အမှတ် {pointsAwarded} ရရှိပါသည်။",
    zh: "您收到 {stars} 星评价，获得 {pointsAwarded} 积分。",
    en: "You earned points from a review. {points}",
  },
  "noti.points.withdrawalRequested.title": {
    ko: "출금 요청 접수",
    my: "ငွေထုတ်ယူမှု တောင်းဆိုမှု လက်ခံပြီး",
    zh: "提现已提交",
    en: "Withdrawal requested",
  },
  "noti.points.withdrawalRequested.body": {
    ko: "금액 {amount} MMK 출금 요청이 접수되었습니다. (요청 ID: {withdrawalId})",
    my: "ငွေပမာဏ {amount} MMK ငွေထုတ်ယူမှု တောင်းဆိုမှုကို လက်ခံပြီးပါပြီ။ (တောင်းဆိုမှု ID: {withdrawalId})",
    zh: "已收到提现申请，金额 {amount} MMK（申请 ID：{withdrawalId}）。",
    en: "Withdrawal of {amount} points requested.",
  },
  "noti.points.withdrawalApproved.title": {
    ko: "출금 승인",
    my: "ငွေထုတ်ယူမှု အတည်ပြုပြီး",
    zh: "提现已通过",
    en: "Withdrawal approved",
  },
  "noti.points.withdrawalApproved.body": {
    ko: "출금이 승인되었습니다. 금액: {amount} MMK. {adminNote}",
    my: "ငွေထုတ်ယူမှုကို အတည်ပြုပြီးပါပြီ။ ပမာဏ: {amount} MMK။ {adminNote}",
    zh: "提现已批准，金额 {amount} MMK。{adminNote}",
    en: "提现已批准，金额 {amount} MMK。{adminNote}",
  },
  "noti.points.withdrawalRejected.title": {
    ko: "출금 거절",
    my: "ငွေထုတ်ယူမှု ငြင်းပယ်ခံရ",
    zh: "提现已拒绝",
    en: "Withdrawal rejected",
  },
  "noti.points.withdrawalRejected.body": {
    ko: "출금 요청이 거절되었습니다. 금액: {amount} MMK. {adminNote}",
    my: "ငွေထုတ်ယူမှု တောင်းဆိုမှုကို ငြင်းပယ်ထားပါသည်။ ပမာဏ: {amount} MMK။ {adminNote}",
    zh: "提现已拒绝，金额 {amount} MMK。{adminNote}",
    en: "提现已拒绝，金额 {amount} MMK。{adminNote}",
  },
  "noti.points.withdrawalPaid.title": {
    ko: "출금 완료",
    my: "ငွေထုတ်ယူမှု ပြီးစီး",
    zh: "提现已打款",
    en: "Withdrawal paid",
  },
  "noti.points.withdrawalPaid.body": {
    ko: "출금이 완료되었습니다. 금액: {amount} MMK. 참조: {kbzTransferRef}",
    my: "ငွေထုတ်ယူမှု ပြီးစီးပါပြီ။ ပမာဏ: {amount} MMK။ ကိုးကား: {kbzTransferRef}",
    zh: "提现已完成，金额 {amount} MMK。参考：{kbzTransferRef}",
    en: "提现已完成，金额 {amount} MMK。参考：{kbzTransferRef}",
  },
  "noti.points.bonus.registration.title": {
    ko: "가입 보너스 포인트",
    my: "စာရင်းသွင်းအပိုအမှတ်",
    zh: "注册奖励积分",
    en: "Registration bonus",
  },
  "noti.points.bonus.registration.body": {
    ko: "회원가입 보너스로 {amount}점이 적립되었습니다.",
    my: "စာရင်းသွင်းအပိုအမှတ်အဖြစ် အမှတ် {amount} ရရှိပါသည်။",
    zh: "注册奖励：获得 {amount} 积分。",
    en: "You received a registration bonus. {points}",
  },
  "noti.points.bonus.phone.title": {
    ko: "휴대폰 인증 보너스",
    my: "ဖုန်းအတည်ပြုအပိုအမှတ်",
    zh: "手机验证奖励",
    en: "Phone verification bonus",
  },
  "noti.points.bonus.phone.body": {
    ko: "휴대폰 인증 완료 보너스로 {amount}점이 적립되었습니다.",
    my: "ဖုန်းအတည်ပြုပြီးနောက် အပိုအမှတ် {amount} ရရှိပါသည်။",
    zh: "完成手机验证，获得 {amount} 积分。",
    en: "You received points for phone verification. {points}",
  },
  "noti.points.bonus.email.title": {
    ko: "이메일 인증 보너스",
    my: "အီးမေးလ်အတည်ပြုအပိုအမှတ်",
    zh: "邮箱验证奖励",
    en: "Email verification bonus",
  },
  "noti.points.bonus.email.body": {
    ko: "이메일 인증 완료 보너스로 {amount}점이 적립되었습니다.",
    my: "အီးမေးလ်အတည်ပြုပြီးနောက် အပိုအမှတ် {amount} ရရှိပါသည်။",
    zh: "完成邮箱验证，获得 {amount} 积分。",
    en: "You received points for email verification. {points}",
  },
  "noti.points.bonus.kbzpay.title": {
    ko: "KBZPay 인증 보너스",
    my: "KBZPay အတည်ပြုအပိုအမှတ်",
    zh: "KBZPay 验证奖励",
    en: "KBZPay 验证奖励",
  },
  "noti.points.bonus.kbzpay.body": {
    ko: "KBZPay 인증 완료 보너스로 {amount}점이 적립되었습니다.",
    my: "KBZPay အတည်ပြုပြီးနောက် အပိုအမှတ် {amount} ရရှိပါသည်။",
    zh: "完成 KBZPay 验证，获得 {amount} 积分。",
    en: "You received points for KBZPay verification. {points}",
  },
  "noti.points.bonus.generic.title": {
    ko: "보너스 포인트",
    my: "အပိုအမှတ်",
    zh: "奖励积分",
    en: "Bonus points",
  },
  "noti.points.bonus.generic.body": {
    ko: "{amount}점 보너스가 적립되었습니다. ({sourceType})",
    my: "အပိုအမှတ် {amount} ရရှိပါသည်။ ({sourceType})",
    zh: "获得奖励积分 {amount}。（{sourceType}）",
    en: "获得奖励积分 {amount}。（{sourceType}）",
  },

  "noti.facebook.linked.title": {
    ko: "Facebook 연동 완료",
    my: "Facebook ချိတ်ဆက်မှု ပြီးစီး",
    zh: "Facebook 已绑定",
    en: "Facebook 已绑定",
  },
  "noti.facebook.linked.body": {
    ko: "{facebookName} 계정이 연결되었습니다.",
    my: "{facebookName} အကောင့်ကို ချိတ်ဆက်ပြီးပါပြီ။",
    zh: "已绑定 Facebook 账号：{facebookName}。",
    en: "已绑定 Facebook 账号：{facebookName}。",
  },
  "noti.facebook.followSubmitted.title": {
    ko: "페이지 팔로우 인증 제출됨",
    my: "စာမျက်နှာ လိုက်ပါမှုအတည်ပြု တင်ပြပြီး",
    zh: "已提交关注页面凭证",
    en: "Facebook follow proof submitted",
  },
  "noti.facebook.followSubmitted.body": {
    ko: "관리자 검토 중입니다. 페이지: {facebookPageUrl}",
    my: "အုပ်ချုပ်သူ စစ်ဆေးနေပါသည်။ စာမျက်နှာ: {facebookPageUrl}",
    zh: "等待管理员审核。页面：{facebookPageUrl}",
    en: "Your Facebook follow proof was submitted.",
  },
  "noti.facebook.rewarded.title": {
    ko: "Facebook 팔로우 보상",
    my: "Facebook လိုက်ပါမှုဆုလာဘ်",
    zh: "Facebook 关注奖励",
    en: "Facebook 关注奖励",
  },
  "noti.facebook.rewarded.body": {
    ko: "페이지 팔로우가 승인되어 포인트가 지급되었습니다.",
    my: "စာမျက်နှာ လိုက်ပါမှုကို အတည်ပြုပြီး အမှတ်များ ပေးအပ်ပါသည်။",
    zh: "关注审核已通过，积分已发放。",
    en: "You received a Facebook follow reward. {points}",
  },

  "noti.sections.general": {
    ko: "일반",
    my: "အထွေထွေ",
    zh: "通用",
    en: "General",
  },
  "noti.sections.generalHint": {
    ko: "KBZPay, 포인트, 제안·신고, 계정 알림",
    my: "KBZPay၊ အမှတ်များ၊ အကြံပြု/တိုင်ကြား၊ အကောင့်",
    zh: "KBZPay、积分、建议/举报与账户通知",
    en: "Account and reward updates",
  },
  "noti.sections.chat": {
    ko: "채팅·거래",
    my: "ချတ် နှင့် ကုန်သွယ်မှု",
    zh: "聊天与交易",
    en: "Chat",
  },
  "noti.sections.chatHint": {
    ko: "안전결제, 만남, 거래 업데이트",
    my: "လုံခြုံငွေပေးချေမှု၊ တွေ့ဆုံမှုနှင့် ကုန်သွယ်မှု အပ်ဒိတ်",
    zh: "担保支付、见面与交易动态",
    en: "Trade and chat updates",
  },
  "noti.chat.empty": {
    ko: "채팅 알림이 없습니다.",
    my: "ချတ် အသိပေးချက် မရှိသေးပါ။",
    zh: "暂无聊天通知。",
    en: "No chat notifications",
  },
  "noti.chat.filterAll": {
    ko: "전체",
    my: "အားလုံး",
    zh: "全部",
    en: "All",
  },
  "noti.chat.filterUnread": {
    ko: "읽지 않음",
    my: "မဖတ်ရသေး",
    zh: "未读",
    en: "Unread",
  },

  "noti.chat.events.CHAT_SAFE_PAYMENT_REQUESTED_CLIENT.title": {
    ko: "안전결제 요청됨",
    my: "လုံခြုံငွေပေးချေမှု တောင်းဆိုပြီး",
    zh: "已请求担保支付",
    en: "Safe payment requested",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_REQUESTED_CLIENT.body": {
    ko: "요청이 접수되었습니다. 관리자가 KBZPay 번호를 알림으로내면, KBZPay에서 결제 후 채팅에서 거래 ID를 제출하세요.",
    my: "တောင်းဆိုမှုကို လက်ခံပြီးပါပြီ။ Admin က KBZPay နံပါတ်ကို အသိပေးချက်ဖြင့် ပို့ပေးမည်။ ရရှိပြီးနောက် KBZPay တွင် ပေးချေပြီး ချတ်တွင် လုပ်ဆောင်မှုအမှတ်ကို တင်ပြပါ။",
    zh: "您的请求已提交。管理员将通过通知发送 KBZPay 号码。收到后请在 KBZPay 付款，并在聊天中提交交易号。",
    en: "Safe payment was requested for {productTitle}.",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_REQUESTED_ADMIN.title": {
    ko: "안전결제 요청",
    my: "လုံခြုံငွေပေးချေမှု တောင်းဆိုမှု",
    zh: "担保支付请求",
    en: "Safe payment request (admin)",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_REQUESTED_ADMIN.body": {
    ko: "구매자가 안전결제를 요청했습니다. KBZPay 수취 번호를 보내주세요.",
    my: "ဝယ်သူက လုံခြုံငွေပေးချေမှု တောင်းဆိုထားသည်။ KBZPay လက်ခံနံပါတ်ကို ပို့ပေးပါ။",
    zh: "买家请求了担保支付。请发送 KBZPay 收款号码。",
    en: "A buyer requested safe payment for {productTitle}.",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_CLIENT.title": {
    ko: "KBZPay 송금 안내",
    my: "KBZPay လွှဲပြောင်းညွှန်ကြားချက်",
    zh: "KBZPay 转账指引",
    en: "KBZPay 转账指引",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_CLIENT.body": {
    ko: "{{adminReceivingPhone}}(으)로 송금하세요. KBZPay에서 결제 후 채팅에서 거래 ID를 제출하세요.",
    my: "{{adminReceivingPhone}} သို့ လွှဲပေးပါ။ KBZPay တွင် ပေးချေပြီးနောက် ချတ်တွင် လုပ်ဆောင်မှုအမှတ်ကို တင်ပြပါ။",
    zh: "请转账至 {{adminReceivingPhone}}。在 KBZPay 付款后，打开聊天提交交易号。",
    en: "Payment instructions were sent for {productTitle}.",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_CLIENT.bodyNote": {
    ko: "메모: {{adminNote}}",
    my: "မှတ်ချက်: {{adminNote}}",
    zh: "备注：{{adminNote}}",
    en: "备注：{{adminNote}}",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_ADMIN.title": {
    ko: "안내 발송 완료",
    my: "ညွှန်ကြားချက် ပို့ပြီး",
    zh: "指引已发送",
    en: "Payment instructions sent (admin)",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_ADMIN.body": {
    ko: "구매자에게 KBZPay 안내를 보냈습니다. 수취 번호: {{adminReceivingPhone}}",
    my: "ဝယ်သူထံ KBZPay ညွှန်ကြားချက် ပို့ပြီးပါပြီ။ လက်ခံနံပါတ်: {{adminReceivingPhone}}",
    zh: "已向买家发送 KBZPay 指引。收款号码：{{adminReceivingPhone}}",
    en: "已向买家发送 KBZPay 指引。收款号码：{{adminReceivingPhone}}",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_SUBMITTED_CLIENT.title": {
    ko: "결제 정보 제출됨",
    my: "ငွေပေးချေမှု တင်ပြပြီး",
    zh: "已提交付款",
    en: "Payment info submitted",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_SUBMITTED_CLIENT.body": {
    ko: "KBZ 거래 ID가 제출되었습니다. 관리자가 확인 후 입금 완료 시 채팅이 업데이트됩니다.",
    my: "KBZ လုပ်ဆောင်မှုအမှတ်ကို တင်ပြပြီးပါပြီ။ Admin အတည်ပြုပြီး ငွေလက်ခံပြီးပါက ချတ်ကို အပ်ဒိတ်လုပ်ပါမည်။",
    zh: "您的 KBZ 交易号已提交。管理员核实后会在聊天中更新收款状态。",
    en: "Payment details were submitted for {productTitle}.",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_SUBMITTED_ADMIN.title": {
    ko: "안전결제 검토 필요",
    my: "လုံခြုံငွေပေးချေမှု စစ်ဆေးရန်",
    zh: "担保支付待审核",
    en: "Payment submitted (admin)",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_SUBMITTED_ADMIN.body": {
    ko: "구매자가 KBZ 결제를 제출했습니다. 거래 ID: {{kbzTransactionId}} · 금액: {{paymentAmount}} MMK",
    my: "ဝယ်သူက KBZ ငွေပေးချေမှု တင်ပြထားသည်။ လုပ်ဆောင်မှုအမှတ်: {{kbzTransactionId}} · ပမာဏ: {{paymentAmount}} MMK",
    zh: "买家已提交 KBZ 付款。交易号：{{kbzTransactionId}} · 金额：{{paymentAmount}} MMK",
    en: "买家已提交 KBZ 付款。交易号：{{kbzTransactionId}} · 金额：{{paymentAmount}} MMK",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_RECEIVED_CLIENT.buyer.title": {
    ko: "결제 확인됨",
    my: "ငွေပေးချေမှု အတည်ပြုပြီး",
    zh: "付款已确认",
    en: "Payment received",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_RECEIVED_CLIENT.buyer.body": {
    ko: "관리자가 결제를 확인했습니다. 거래가 끝나면 완료 처리할 수 있습니다.",
    my: "Admin က သင့်ငွေပေးချေမှုကို အတည်ပြုပြီးပါပြီ။ ကုန်သွယ်မှု ပြီးဆုံးပါက ပြီးမြောက်ဟု မှတ်သားနိုင်ပါသည်။",
    zh: "管理员已确认您的付款。交易完成后可标记完成。",
    en: "Your safe payment for {productTitle} was confirmed.",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_RECEIVED_CLIENT.buyer.bodyNote": {
    ko: "메모: {{adminNote}}",
    my: "မှတ်ချက်: {{adminNote}}",
    zh: "备注：{{adminNote}}",
    en: "备注：{{adminNote}}",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_RECEIVED_CLIENT.seller.title": {
    ko: "구매자 결제 확보됨",
    my: "ဝယ်သူငွေပေးချေမှု လုံခြုံမှု",
    zh: "买家付款已确认",
    en: "Buyer payment received",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_RECEIVED_CLIENT.seller.body": {
    ko: "관리자가 구매자 결제를 확인했습니다. 채팅에서 거래를 완료하세요.",
    my: "Admin က ဝယ်သူ၏ ငွေပေးချေမှုကို အတည်ပြုပြီးပါပြီ။ ချတ်တွင် ကုန်သွယ်မှုကို ပြီးမြောက်အောင် လုပ်ဆောင်ပါ။",
    zh: "管理员已确认买家付款。请在聊天中完成交易。",
    en: "Buyer payment for {productTitle} was confirmed.",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_RECEIVED_CLIENT.seller.bodyNote": {
    ko: "메모: {{adminNote}}",
    my: "မှတ်ချက်: {{adminNote}}",
    zh: "备注：{{adminNote}}",
    en: "备注：{{adminNote}}",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_RECEIVED_ADMIN.title": {
    ko: "입금 확인 처리됨",
    my: "ငွေလက်ခံ အတည်ပြုပြီး",
    zh: "已标记收款",
    en: "Payment received (admin)",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_RECEIVED_ADMIN.body": {
    ko: "이 안전결제를 입금 확인 처리했습니다.",
    my: "ဤလုံခြုံငွေပေးချေမှုကို ငွေလက်ခံအဖြစ် မှတ်သားပြီးပါပြီ။",
    zh: "您已将此担保支付标记为已收款。",
    en: "Safe payment received for {productTitle}.",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_TRANSFERRED_CLIENT.seller.title": {
    ko: "대금이 송금되었습니다",
    my: "ငွေလွှဲပြောင်း ရရှိပြီး",
    zh: "款项已释放给您",
    en: "Funds transferred",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_TRANSFERRED_CLIENT.seller.body": {
    ko: "관리자가 대금을 송금했습니다. 참조: {{transferRef}}",
    my: "Admin က သင့်ရငွေကို လွှဲပြောင်းပြီးပါပြီ။ ကိုးကား: {{transferRef}}",
    zh: "管理员已向您转账。参考：{{transferRef}}",
    en: "Payment for {productTitle} was transferred to you.",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_TRANSFERRED_CLIENT.buyer.title": {
    ko: "판매자에게 결제 해제됨",
    my: "ရောင်းသူထံ ငွေလွှဲပြောင်း ပြီး",
    zh: "已向卖家放款",
    en: "Funds transferred to seller",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_TRANSFERRED_CLIENT.buyer.body": {
    ko: "관리자가 판매자에게 결제를 해제했습니다. 참조: {{transferRef}}",
    my: "Admin က ရောင်းသူထံ ငွေကို လွှဲပြောင်းပြီးပါပြီ။ ကိုးကား: {{transferRef}}",
    zh: "管理员已向卖家释放款项。参考：{{transferRef}}",
    en: "Payment for {productTitle} was transferred to the seller.",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_TRANSFERRED_ADMIN.title": {
    ko: "결제 송금 완료",
    my: "ငွေလွှဲပြောင်း ပြီးစီး",
    zh: "已完成放款",
    en: "Funds transferred (admin)",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_TRANSFERRED_ADMIN.body": {
    ko: "안전결제가 판매자에게 송금 처리되었습니다. 참조: {{transferRef}}",
    my: "လုံခြုံငွေပေးချေမှုကို ရောင်းသူထံ လွှဲပြောင်းပြီးဟု မှတ်သားပြီးပါပြီ။ ကိုးကား: {{transferRef}}",
    zh: "担保支付已标记为已向卖家转账。参考：{{transferRef}}",
    en: "Safe payment transferred for {productTitle}.",
  },

  "noti.chat.events.CHAT_TRANSACTION_CANCELLED_SELF_PENALTY.title": {
    ko: "Transaction cancelled",
    my: "Transaction cancelled",
    zh: "Transaction cancelled",
    en: "Transaction cancelled",
  },
  "noti.chat.events.CHAT_TRANSACTION_CANCELLED_SELF_PENALTY.body": {
    ko: "{{deductedPoints}} points were deducted for cancellation. Balance after: {{balanceAfter}}.",
    my: "{{deductedPoints}} points were deducted for cancellation. Balance after: {{balanceAfter}}.",
    zh: "{{deductedPoints}} points were deducted for cancellation. Balance after: {{balanceAfter}}.",
    en: "{{deductedPoints}} points were deducted for cancellation. Balance after: {{balanceAfter}}.",
  },
  "noti.chat.events.CHAT_TRANSACTION_CANCELLED_COUNTERPARTY.title": {
    ko: "Transaction cancelled",
    my: "Transaction cancelled",
    zh: "Transaction cancelled",
    en: "Transaction cancelled",
  },
  "noti.chat.events.CHAT_TRANSACTION_CANCELLED_COUNTERPARTY.body": {
    ko: "The other party cancelled this transaction. Cancelled by: {{cancelledByUserId}}.",
    my: "The other party cancelled this transaction. Cancelled by: {{cancelledByUserId}}.",
    zh: "The other party cancelled this transaction. Cancelled by: {{cancelledByUserId}}.",
    en: "The other party cancelled this transaction. Cancelled by: {{cancelledByUserId}}.",
  },

  "noti.suggestion.events.SUGGESTION_SUBMITTED_CLIENT.title": {
    ko: "제안 접수됨",
    my: "အကြံပြုချက် လက်ခံပြီး",
    zh: "建议已提交",
    en: "Suggestion submitted",
  },
  "noti.suggestion.events.SUGGESTION_SUBMITTED_CLIENT.body": {
    ko: "제안이 접수되었습니다. 검토 후 포인트가 지급될 수 있습니다.",
    my: "သင့်အကြံပြုချက်ကို လက်ခံပြီးပါပြီ။ စစ်ဆေးပြီးနောက် ပွိုင့်ရနိုင်ပါသည်။",
    zh: "您的建议已提交，审核通过后可能获得积分奖励。",
    en: "Your suggestion was submitted.",
  },
  "noti.suggestion.events.SUGGESTION_SUBMITTED_ADMIN.title": {
    ko: "새 제안",
    my: "အကြံပြုချက် အသစ်",
    zh: "新建议",
    en: "New suggestion (admin)",
  },
  "noti.suggestion.events.SUGGESTION_SUBMITTED_ADMIN.body": {
    ko: "{{nickname}} ({{name}}) · {{accountNickname}} · {{phone}}",
    my: "{{nickname}} ({{name}}) · {{accountNickname}} · {{phone}}",
    zh: "{{nickname}}（{{name}}）· {{accountNickname}} · {{phone}}",
    en: "{{nickname}}（{{name}}）· {{accountNickname}} · {{phone}}",
  },
  "noti.suggestion.events.SUGGESTION_REWARDED_CLIENT.title": {
    ko: "제안 보상",
    my: "အကြံပြုချက် ဆုလာဘ်",
    zh: "建议奖励",
    en: "Suggestion rewarded",
  },
  "noti.suggestion.events.SUGGESTION_REWARDED_CLIENT.body": {
    ko: "제안이 채택되어 {{pointsAwarded}}포인트가 지급되었습니다.",
    my: "အကြံပြုချက်အတွက် {{pointsAwarded}} ပွိုင့် ရရှိပါသည်။",
    zh: "您的建议已采纳，获得 {{pointsAwarded}} 积分。",
    en: "You received a reward for your suggestion. {points}",
  },
  "noti.suggestion.events.SUGGESTION_REWARDED_ADMIN.title": {
    ko: "제안 보상 처리됨",
    my: "အကြံပြုချက် ဆုလာဘ် ပေးပြီး",
    zh: "已发放建议奖励",
    en: "Suggestion rewarded (admin)",
  },
  "noti.suggestion.events.SUGGESTION_REWARDED_ADMIN.body": {
    ko: "사용자에게 {{pointsAwarded}}포인트를 지급했습니다.",
    my: "အသုံးပြုသူထံ {{pointsAwarded}} ပွိုင့် ပေးအပ်ပြီးပါပြီ။",
    zh: "已向用户发放 {{pointsAwarded}} 积分。",
    en: "Suggestion reward issued. {points}",
  },
  "noti.suggestion.events.SUGGESTION_DISMISSED_CLIENT.title": {
    ko: "제안 검토 완료",
    my: "အကြံပြုချက် စစ်ဆေးပြီး",
    zh: "建议已处理",
    en: "Suggestion dismissed",
  },
  "noti.suggestion.events.SUGGESTION_DISMISSED_CLIENT.body": {
    ko: "제안이 반영되지 않았습니다. 다른 아이디어도 환영합니다.",
    my: "ဤအကြံပြုချက်ကို မလက်ခံပါ။ အခြကြံများကို ဆက်လက်ပို့နိုင်ပါသည်။",
    zh: "该建议暂未采纳，欢迎继续提交其他想法。",
    en: "Your suggestion was dismissed.",
  },
  "noti.suggestion.events.SUGGESTION_DISMISSED_CLIENT.bodyNote": {
    ko: "관리자 메모: {{adminNote}}",
    my: "Admin မှတ်ချက်: {{adminNote}}",
    zh: "管理员备注：{{adminNote}}",
    en: "Admin note: {adminNote}",
  },

  "noti.fraud.events.FRAUD_REPORT_SUBMITTED_CLIENT.title": {
    ko: "사기 신고 접수",
    my: "လိမ်လည်မှု တိုင်ကြားချက် လက်ခံ",
    zh: "诈骗举报已提交",
    en: "Fraud report submitted",
  },
  "noti.fraud.events.FRAUD_REPORT_SUBMITTED_CLIENT.body": {
    ko: "신고가 접수되었습니다. 검토 후 알려드리겠습니다.",
    my: "တိုင်ကြားချက်ကို လက်ခံပြီးပါပြီ။ စစ်ဆေးပြီး အကြောင်းကြားပါမည်။",
    zh: "您的举报已受理，我们将尽快审核。",
    en: "Your fraud report was submitted.",
  },
  "noti.fraud.events.FRAUD_REPORT_SUBMITTED_ADMIN.title": {
    ko: "새 사기 신고",
    my: "လိမ်လည်မှု တိုင်ကြားချက် အသစ်",
    zh: "新诈骗举报",
    en: "New fraud report (admin)",
  },
  "noti.fraud.events.FRAUD_REPORT_SUBMITTED_ADMIN.body": {
    ko: "{{fraudUserName}} · 코드 {{reportedReferralCode}} · {{fraudType}}",
    my: "{{fraudUserName}} · ကုဒ် {{reportedReferralCode}} · {{fraudType}}",
    zh: "{{fraudUserName}} · 邀请码 {{reportedReferralCode}} · {{fraudType}}",
    en: "{{fraudUserName}} · 邀请码 {{reportedReferralCode}} · {{fraudType}}",
  },
  "noti.fraud.events.FRAUD_REPORT_CONFIRMED_CLIENT.title": {
    ko: "신고 확인됨",
    my: "တိုင်ကြားချက် အတည်ပြုပြီး",
    zh: "举报已确认",
    en: "Fraud report confirmed",
  },
  "noti.fraud.events.FRAUD_REPORT_CONFIRMED_CLIENT.body": {
    ko: "신고가 확인되었습니다. 조치가 진행 중입니다.",
    my: "တိုင်ကြားချက်ကို အတည်ပြုပြီးပါပြီ။ ဆက်လက်လုပ်ဆောင်နေပါသည်။",
    zh: "您的举报已确认，我们正在处理。",
    en: "Your fraud report was confirmed.",
  },
  "noti.fraud.events.FRAUD_REPORT_CONFIRMED_CLIENT.bodyBlocked": {
    ko: "신고가 확인되었고 해당 사용자가 차단되었습니다.",
    my: "တိုင်ကြားချက်အတည်ပြုပြီး အသုံးပြုသူကို ပိတ်ပင်ထားပါသည်။",
    zh: "举报已确认，相关用户已被封禁。",
    en: "The reported account was blocked.",
  },
  "noti.fraud.events.FRAUD_REPORT_DISMISSED_CLIENT.title": {
    ko: "신고 기각",
    my: "တိုင်ကြားချက် ပယ်ချခြင်း",
    zh: "举报未通过",
    en: "Fraud report dismissed",
  },
  "noti.fraud.events.FRAUD_REPORT_DISMISSED_CLIENT.body": {
    ko: "신고 내용을 확인했으나 조치 대상이 아닙니다.",
    my: "တိုင်ကြားချက်ကို စစ်ဆေးပြီးသော်လည်း လုပ်ဆောင်ရန် မလိုအပ်ပါ။",
    zh: "经审核，该举报暂不成立。",
    en: "Your fraud report was dismissed.",
  },
  "noti.fraud.events.FRAUD_REPORT_ACTION_REPORTED_USER.title": {
    ko: "사기 신고 관련 조치",
    my: "လိမ်လည်မှု တိုင်ကြားချက် ဆိုင်ရာ",
    zh: "欺诈举报相关通知",
    en: "Account action notice",
  },
  "noti.fraud.events.FRAUD_REPORT_ACTION_REPORTED_USER.body": {
    ko: "귀하에 대한 신고가 확인되어 계정이 검토 중입니다.",
    my: "သင့်အပေါ် တိုင်ကြားချက်အတည်ပြုပြီး အကောင့်ကို စစ်ဆေးနေပါသည်။",
    zh: "针对您的举报已确认，账号正在审核中。",
    en: "Action was taken on a reported account.",
  },
  "noti.fraud.events.ACCOUNT_BANNED_CLIENT.title": {
    ko: "계정 정지",
    my: "အကောင့် ပိတ်ပင်",
    zh: "账号已封禁",
    en: "Account banned",
  },
  "noti.fraud.events.ACCOUNT_BANNED_CLIENT.body": {
    ko: "계정이 정지되었습니다.",
    my: "သင့်အကောင့်ကို ပိတ်ပင်ထားပါသည်။",
    zh: "您的账号已被封禁。",
    en: "Your account has been banned.",
  },
  "noti.fraud.events.ACCOUNT_BANNED_CLIENT.bodyReason": {
    ko: "사유: {{adminNote}}",
    my: "အကြောင်းရင်း: {{adminNote}}",
    zh: "原因：{{adminNote}}",
    en: "原因：{{adminNote}}",
  },
  "noti.fraud.events.ACCOUNT_UNBANNED_CLIENT.title": {
    ko: "계정 정지 해제",
    my: "အကောင့် ပိတ်ပင်မှု ဖြုတ်ပြီး",
    zh: "账号已解封",
    en: "Account unbanned",
  },
  "noti.fraud.events.ACCOUNT_UNBANNED_CLIENT.body": {
    ko: "계정 정지가 해제되었습니다. 다시 이용할 수 있습니다.",
    my: "အကောင့် ပိတ်ပင်မှုကို ဖြုတ်ပြီးပါပြီ။ ပြန်လည်အသုံးပြုနိုင်ပါသည်။",
    zh: "账号已解封，您可以继续使用。",
    en: "Your account ban has been lifted.",
  },

  homeWelcome: {
    ko: "환영합니다",
    my: "ကြိုဆိုပါသည်",
    zh: "欢迎",
    en: "Welcome",
  },
  homeBrandTitle: {
    ko: "Flex Used Market",
    my: "Flex Used Market",
    zh: "Flex Used Market",
    en: "Flex Used Market",
  },
  homeDashboardSubtitle: {
    ko: "중고거래 대시보드입니다.",
    my: "အသုံးပြုပြီး ပစ္စည်း စျေးကွက် ဒက်ရှ်ဘုတ်",
    zh: "你的二手市场仪表板。",
    en: "Your used-goods marketplace dashboard.",
  },
  homeHeroSubtitle: {
    ko: "카테고리로 상품을 빠르게 찾아보세요.",
    my: "အမျိုးအစားအလိုက် ပစ္စည်းများကို မြန်မြန်ရှာဖွေပါ။",
    zh: "按分类快速查找商品。",
    en: "Find listings quickly by category.",
  },
  homeCategoriesTitle: {
    ko: "카테고리",
    my: "အမျိုးအစားများ",
    zh: "分类",
    en: "Categories",
  },
  homeAllCategory: {
    ko: "전체",
    my: "အားလုံး",
    zh: "全部",
    en: "All",
  },
  homeProductsTitle: {
    ko: "상품",
    my: "ပစ္စည်းများ",
    zh: "商品",
    en: "Products",
  },
  homeSearchPlaceholder: {
    ko: "제목·설명 검색 (예: iphone)",
    my: "ခေါင်းစဉ် သို့မဟုတ် ဖော်ပြချက် ရှာဖွေရန် (ဥပမာ iphone)",
    zh: "搜索标题或描述（如 iphone）",
    en: "Search title or description (e.g. iphone)",
  },
  homeSearchClearAccessibility: {
    ko: "검색어 지우기",
    my: "ရှာဖွေစာသား ဖျက်ရန်",
    zh: "清除搜索",
    en: "Clear search",
  },
  homeRadiusFilterTitle: {
    ko: "반경 필터",
    my: "အကွာအဝေး စစ်ထုတ်မှု",
    zh: "半径筛选",
    en: "Radius filter",
  },
  homeRadiusFilterAll: {
    ko: "전체",
    my: "အားလုံး",
    zh: "全部",
    en: "All",
  },
  homeRadiusFilterKmUnit: {
    ko: "km",
    my: "km",
    zh: "公里",
    en: "km",
  },
  homeRadiusFilterHint: {
    ko: "내 위치 기준 거리로 상품을 좁힙니다.",
    my: "သင့်တည်နေရာမှ အကွာအဝေးအလိုက် ပစ္စည်းများကို စစ်ထုတ်ပါသည်။",
    zh: "按与您位置的距离筛选商品。",
    en: "Filter listings by distance from your location.",
  },
  homeRadiusFilterSummaryAll: {
    ko: "거리 제한 없음",
    my: "အကွာအဝေး မကန့်သတ်",
    zh: "不限距离",
    en: "No distance limit",
  },
  homeRadiusFilterSummaryWithin: {
    ko: "{km}km 이내",
    my: "{km}km အတွင်း",
    zh: "{km}公里内",
      en: "Home Radius Filter Summary Within"
  },
  homeRadiusFilterNoLocationHint: {
    ko: "위치를 활성화하면 반경 필터를 사용할 수 있습니다.",
    my: "တည်နေရာဖွင့်ပြီးမှ အကွာအဝေး စစ်ထုတ်မှုကို အသုံးပြုနိုင်သည်။",
    zh: "开启定位后可使用半径筛选。",
    en: "Enable location to use the radius filter.",
  },
  homeProductsNearYouHint: {
    ko: "가까운 거래 위치 순",
    my: "အနီးဆုံး လဲလှယ်ရာ နေရာအလိုက်",
    zh: "按距离排序",
    en: "Sorted by distance",
  },
  homeProductsLoadingMore: {
    ko: "더 불러오는 중…",
    my: "ထပ်မံတင်နေသည်…",
    zh: "正在加载更多…",
    en: "Loading more…",
  },
  homeProductsLoadError: {
    ko: "상품 목록을 불러오지 못했습니다. 아래로 당겨 다시 시도하세요.",
    my: "ပစ္စည်းစာရင်း မရရှိနိုင်ပါ။ အောက်သို့ ဆွဲချပြီး ပြန်ကြိုးစားပါ။",
    zh: "商品列表加载失败，请下拉重试。",
    en: "Failed to load products. Pull down to retry.",
  },
  homeLoadingProducts: {
    ko: "상품을 불러오는 중...",
    my: "ပစ္စည်းများကို တင်နေသည်...",
    zh: "正在加载商品...",
    en: "Loading products…",
  },
  homeNoProductsForCategory: {
    ko: "이 카테고리에 상품이 없습니다.",
    my: "ဒီအမျိုးအစားတွင် ပစ္စည်းမရှိသေးပါ။",
    zh: "该分类下暂无商品。",
    en: "No products in this category.",
  },
  homeNoProductsForSearch: {
    ko: "검색과 일치하는 상품이 없습니다.",
    my: "ရှာဖွေမှုနှင့် ကိုက်ညီသော ပစ္စည်းမရှိပါ။",
    zh: "没有符合搜索条件的商品。",
    en: "No products match your search.",
  },
  homeCategoryFallback: {
    ko: "일반",
    my: "အထွေထွေ",
    zh: "通用",
    en: "General",
  },
  productListingNoImage: {
    ko: "사진 없음",
    my: "ပုံမရှိ",
    zh: "暂无图片",
    en: "No photo",
  },
  homeCategoryErrorRetryHint: {
    ko: "카테고리를 불러오지 못했습니다. 아래로 당겨 새로고침하세요.",
    my: "အမျိုးအစားများ မရရှိနိုင်ပါ။ အောက်သို့ ဆွဲချပြီး ပြန်လည်ရယူပါ။",
    zh: "分类加载失败，请下拉刷新。",
    en: "Failed to load categories. Pull down to refresh.",
  },
  homeMarketTitleFlex: {
    ko: "FLEX Used market",
    my: "FLEX Used market",
    zh: "FLEX Used market",
    en: "FLEX Used market",
  },
  homeMyProfileButton: {
    ko: "본인정보",
    my: "ကိုယ်ရေးအချက်အလက်",
    zh: "个人资料",
    en: "Profile",
  },
  homeSuggestReportButton: {
    ko: "제안/신고",
    my: "အကြံပြု/တိုင်ကြား",
    zh: "建议/举报",
    en: "Suggest / report",
  },
  homeSuggestionReportButton: {
    ko: "제안 / 사기 신고",
    my: "အကြံပြုချက် / လိမ်လည်မှု တိုင်ကြားရန်",
    zh: "建议 / 诈骗举报",
    en: "Suggestion / fraud report",
  },
  homeSuggestionReportTitle: {
    ko: "제안 및 사기 신고",
    my: "အကြံပြုချက်နှင့် လိမ်လည်မှုတိုင်ကြားချက်",
    zh: "建议与诈骗举报",
    en: "Suggestions & fraud reports",
  },
  homeReportsSubtitle: {
    ko: "앱 개선 아이디어를 제안하거나 사기 거래를 신고하세요.",
    my: "အက်ပ်တိုးတက်စေသော အကြံပြုချက် သို့မဟုတ် လိမ်လည်မှုကို တိုင်ကြားပါ။",
    zh: "提交改进建议或举报欺诈交易。",
    en: "Submit improvement ideas or report fraudulent trades.",
  },
  homeReportsNewSubmission: {
    ko: "새 제출",
    my: "အသစ် တင်သွင်းရန်",
    zh: "新提交",
    en: "New submission",
  },
  homeReportsYourHistory: {
    ko: "제출 내역",
    my: "တင်သွင်းမှု မှတ်တမ်း",
    zh: "提交记录",
    en: "Your submissions",
  },
  homeReportsEmptySuggestions: {
    ko: "아직 제출한 제안이 없습니다.",
    my: "အကြံပြုချက် မတင်ရသေးပါ။",
    zh: "暂无建议记录。",
    en: "No suggestions yet.",
  },
  homeReportsEmptyFraud: {
    ko: "아직 제출한 사기 신고가 없습니다.",
    my: "လိမ်လည်မှု တိုင်ကြားချက် မတင်ရသေးပါ။",
    zh: "暂无诈骗举报记录。",
    en: "No fraud reports yet.",
  },
  homeReportsFraudTypeLabel: {
    ko: "사기 유형",
    my: "လိမ်လည်မှု အမျိုးအစား",
    zh: "诈骗类型",
    en: "Fraud type",
  },
  homeReportsPointsAwarded: {
    ko: "+{points} 포인트",
    my: "+{points} ပွိုင့်",
    zh: "+{points} 积分",
      en: "Home Reports Points Awarded"
  },
  homeSuggestionTab: {
    ko: "제안",
    my: "အကြံပြုချက်",
    zh: "建议",
    en: "Suggestion",
  },
  homeFraudTab: {
    ko: "사기 신고",
    my: "လိမ်လည်မှု တိုင်ကြားချက်",
    zh: "诈骗举报",
    en: "Fraud report",
  },
  homeSuggestionNicknamePlaceholder: {
    ko: "닉네임",
    my: "အမည်ပြောင်",
    zh: "昵称",
    en: "Nickname",
  },
  homeSuggestionNamePlaceholder: {
    ko: "이름",
    my: "အမည်",
    zh: "姓名",
    en: "Name",
  },
  homeSuggestionDetailsPlaceholder: {
    ko: "개선 아이디어를 자세히 적어주세요.",
    my: "တိုးတက်စေလိုသော အကြံပြုချက်ကို အသေးစိတ်ရေးပါ။",
    zh: "请详细填写你的建议。",
    en: "Describe your suggestion in detail.",
  },
  homeSuggestionSubmit: {
    ko: "제안 보내기",
    my: "အကြံပြုချက် ပို့မည်",
    zh: "提交建议",
    en: "Submit suggestion",
  },
  homeMySuggestions: {
    ko: "내 제안 내역",
    my: "ကျွန်ုပ်၏ အကြံပြုချက်များ",
    zh: "我的建议",
    en: "My suggestions",
  },
  homeFraudUserNamePlaceholder: {
    ko: "사기 사용자 이름",
    my: "လိမ်လည်သူ အမည်",
    zh: "诈骗者姓名",
    en: "Fraudster name",
  },
  homeFraudReferralCodePlaceholder: {
    ko: "신고 대상 추천코드",
    my: "တိုင်ကြားမည့်သူ referral code",
    zh: "被举报人邀请码",
    en: "Reported user's invite code",
  },
  homeFraudTradeDatePlaceholder: {
    ko: "거래일 (YYYY-MM-DD)",
    my: "အရောင်းအဝယ်နေ့ (YYYY-MM-DD)",
    zh: "交易日期 (YYYY-MM-DD)",
    en: "Trade date (YYYY-MM-DD)",
  },
  homeFraudTradeTimePlaceholder: {
    ko: "거래시간 (HH:mm)",
    my: "အရောင်းအဝယ်အချိန် (HH:mm)",
    zh: "交易时间 (HH:mm)",
    en: "Trade time (HH:mm)",
  },
  homeFraudTypeFakeProduct: {
    ko: "가짜 상품",
    my: "အတု ပစ္စည်း",
    zh: "假货",
    en: "Fake product",
  },
  homeFraudTypeFakePayment: {
    ko: "가짜 결제",
    my: "အတု ငွေပေးချေမှု",
    zh: "虚假付款",
    en: "Fake payment",
  },
  homeFraudTypeHarassment: {
    ko: "괴롭힘",
    my: "အနှောင့်အယှက်",
    zh: "骚扰",
    en: "Harassment",
  },
  homeFraudTypeOther: {
    ko: "기타",
    my: "အခြား",
    zh: "其他",
    en: "Other",
  },
  homeFraudDetailsPlaceholder: {
    ko: "피해 내용을 자세히 적어주세요.",
    my: "ဖြစ်စဉ်အသေးစိတ်ကို ရေးပါ။",
    zh: "请详细描述情况。",
    en: "Describe what happened in detail.",
  },
  homeFraudSubmit: {
    ko: "사기 신고 제출",
    my: "လိမ်လည်မှု တိုင်ကြားမည်",
    zh: "提交诈骗举报",
    en: "Submit fraud report",
  },
  homeMyFraudReports: {
    ko: "내 사기 신고 내역",
    my: "ကျွန်ုပ်၏ လိမ်လည်မှု တိုင်ကြားချက်များ",
    zh: "我的诈骗举报",
    en: "My fraud reports",
  },
  homeReportsSubmitting: {
    ko: "제출 중...",
    my: "တင်သွင်းနေသည်...",
    zh: "提交中...",
    en: "Submitting…",
  },
  homeReportsSuccessTitle: {
    ko: "완료",
    my: "အောင်မြင်သည်",
    zh: "成功",
    en: "Success",
  },
  homeSuggestionSubmitted: {
    ko: "제안이 접수되었습니다.",
    my: "အကြံပြုချက် လက်ခံရရှိပါသည်။",
    zh: "建议已提交。",
    en: "Suggestion submitted.",
  },
  homeFraudSubmitted: {
    ko: "사기 신고가 접수되었습니다.",
    my: "လိမ်လည်မှု တိုင်ကြားချက် လက်ခံရရှိပါသည်။",
    zh: "诈骗举报已提交。",
    en: "Fraud report submitted.",
  },
  homeReportsSubmitFailed: {
    ko: "제출에 실패했습니다. 잠시 후 다시 시도하세요.",
    my: "တင်သွင်းမှု မအောင်မြင်ပါ။ ခဏနေ၍ ပြန်ကြိုးစားပါ။",
    zh: "提交失败，请稍后重试。",
    en: "Submit failed. Please try again later.",
  },
  homeLogoutCaps: {
    ko: "Logout",
    my: "ထွက်မည်",
    zh: "退出",
    en: "Logout",
  },
  productsMyTitle: {
    ko: "내 상품",
    my: "ကျွန်ုပ်၏ ပစ္စည်းများ",
    zh: "我的商品",
    en: "My listings",
  },
  productsMySubtitle: {
    ko: "판매 중인 내 상품을 관리하세요.",
    my: "ရောင်းချနေသော သင့်ပစ္စည်းများကို စီမံပါ။",
    zh: "管理你发布的出售商品。",
    en: "Manage the items you are selling.",
  },
  productsNewListing: {
    ko: "+ 새 등록",
    my: "+ အသစ်ထည့်မည်",
    zh: "+ 新建发布",
    en: "+ New listing",
  },
  productsLoading: {
    ko: "상품을 불러오는 중…",
    my: "ပစ္စည်းများ တင်နေသည်…",
    zh: "正在加载商品…",
    en: "Loading products…",
  },
  productsLoadError: {
    ko: "내 상품 목록을 불러오지 못했습니다.\n다시 시도해 주세요.",
    my: "သင့်ပစ္စည်းစာရင်း မရရှိနိုင်ပါ။\nထပ်ကြိုးစားပါ။",
    zh: "无法加载你的商品列表。\n请重试。",
    en: "Could not load your listings.\nPlease try again.",
  },
  productsRetry: {
    ko: "다시 시도",
    my: "ပြန်ကြိုးစားမည်",
    zh: "重试",
    en: "Retry",
  },
  productsFilterAll: {
    ko: "All",
    my: "All",
    zh: "All",
    en: "All",
  },
  productsEmpty: {
    ko: "등록된 상품이 없습니다.",
    my: "ပစ္စည်းမရှိသေးပါ။",
    zh: "暂无商品。",
    en: "No listings yet.",
  },
  productsEmptyHint: {
    ko: "새 등록으로 첫 상품을 올려 보세요.",
    my: "အသစ်ထည့်ခြင်းဖြင့် ပထမပစ္စည်းကို တင်ပါ။",
    zh: "点击新建发布你的第一件商品。",
    en: "Tap new listing to post your first item.",
  },
  productsListingCount: {
    ko: "등록 {count}건",
    my: "စာရင်း {count} ခု",
    zh: "共 {count} 件",
      en: "共 {count} 件"
  },
  productsLoadingMore: {
    ko: "더 불러오는 중…",
    my: "ထပ်မံတင်နေသည်…",
    zh: "正在加载更多…",
    en: "Loading more…",
  },
  productsStatusDraft: {
    ko: "임시저장",
    my: "မူကြမ်း",
    zh: "草稿",
    en: "Draft",
  },
  productsStatusActive: {
    ko: "판매중",
    my: "ရောင်းချနေ",
    zh: "在售",
    en: "Active",
  },
  productsStatusInactive: {
    ko: "비활성",
    my: "ပိတ်ထား",
    zh: "已停用",
    en: "Inactive",
  },
  productsStatusSold: {
    ko: "판매완료",
    my: "ရောင်းပြီး",
    zh: "已售",
    en: "Sold",
  },
  productsStatusDeleted: {
    ko: "삭제됨",
    my: "ဖျက်ပြီး",
    zh: "已删除",
    en: "Deleted",
  },
  productsDetail: {
    ko: "상세",
    my: "အသေးစိတ်",
    zh: "详情",
    en: "Details",
  },
  productsEdit: {
    ko: "수정",
    my: "ပြင်မည်",
    zh: "编辑",
    en: "Edit",
  },
  productsArchive: {
    ko: "보관",
    my: "သိမ်းမည်",
    zh: "下架",
    en: "Archive",
  },
  productsArchiveShort: {
    ko: "…",
    my: "…",
    zh: "…",
    en: "…",
  },
  productsArchiveTitle: {
    ko: "상품 보관",
    my: "ပစ္စည်းသိမ်းမည်",
    zh: "下架商品",
    en: "Archive listing",
  },
  productsArchiveMessage: {
    ko: '"{name}"을(를) 보관할까요?',
    my: '"{name}" ကို သိမ်းမလား?',
    zh: "确定下架「{name}」吗？",
    en: 'Archive "{name}"?',
  },
  productsAlertCategoryTitle: {
    ko: "카테고리 필요",
    my: "အမျိုးအစားလိုအပ်သည်",
    zh: "需要分类",
    en: "Category required",
  },
  productsAlertCategoryBody: {
    ko: "카테고리를 선택해 주세요.",
    my: "အမျိုးအစားရွေးပါ။",
    zh: "请选择分类。",
    en: "Please select a category.",
  },
  productsAlertMissingTitle: {
    ko: "입력 누락",
    my: "ထည့်သွင်းမှု မပြည့်စုံ",
    zh: "缺少信息",
    en: "Missing information",
  },
  productsAlertMissingBody: {
    ko: "제목과 설명을 입력해 주세요.",
    my: "ခေါင်းစီးနှင့် ဖော်ပြချက်ထည့်ပါ။",
    zh: "请填写标题和描述。",
    en: "Please enter a title and description.",
  },
  productsAlertPaymentTitle: {
    ko: "결제 수단",
    my: "ငွေပေးချေမှု နည်းလမ်း",
    zh: "支付方式",
    en: "Payment methods",
  },
  productsAlertPaymentBody: {
    ko: "결제 수단을 하나 이상 선택해 주세요.",
    my: "ငွေပေးချေမှု နည်းလမ်းတစ်ခုအနည်းဆုံး ရွေးပါ။",
    zh: "请至少选择一种支付方式。",
    en: "Select at least one payment method.",
  },
  productsAlertCoordsTitle: {
    ko: "좌표",
    my: "ကိုဩဒိနိတ်",
    zh: "坐标",
    en: "Coordinates",
  },
  productsAlertCoordsBody: {
    ko: "위도와 경도는 함께 입력해야 합니다.",
    my: "လတ္တီတွဒ်နှင့် လောင်ဂျီတွဒ်ကို အတူတူ ထည့်ပါ။",
    zh: "纬度和经度需同时填写。",
    en: "Latitude and longitude must both be set.",
  },
  productsAlertPriceTitle: {
    ko: "가격 필요",
    my: "စျေးနှုန်းလိုအပ်သည်",
    zh: "需要价格",
    en: "Price required",
  },
  productsAlertPriceBody: {
    ko: "새 상품의 유효한 가격을 입력해 주세요.",
    my: "ပစ္စသစ်အတွက် မှန်ကန်သော စျေးနှုန်းထည့်ပါ။",
    zh: "请为新商品填写有效价格。",
    en: "Enter a valid price for a new listing.",
  },
  productsAlertDeliveryFeePayerTitle: {
    ko: "배송비 부담",
    my: "ပို့ဆောင်ခ ပေးချေသူ",
    zh: "运费承担方",
    en: "Delivery fee payer",
  },
  productsAlertDeliveryFeePayerBody: {
    ko: "배송 가능일 때는 배송비를 BUYER 또는 SELLER 중 하나로 선택해야 합니다.",
    my: "ပို့ဆောင်ရနိုင်သည့်အခါ ပို့ဆောင်ခကို BUYER သို့မဟုတ် SELLER တစ်ခုခုဖြင့် ရွေးပါ။",
    zh: "开启配送时，必须选择由买家或卖家承担运费（BUYER 或 SELLER）。",
    en: "When delivery is enabled, choose BUYER or SELLER for the delivery fee.",
  },
  productsAlertImagesLimitTitle: {
    ko: "이미지 개수",
    my: "ပုံ အရေအတွက်",
    zh: "图片数量",
    en: "Image limit",
  },
  productsAlertImagesLimitBody: {
    ko: "이미지 URL은 최대 5개까지 보낼 수 있습니다.",
    my: "ပုံ URL အများဆုံး ၅ ခုသာ ပို့နိုင်သည်။",
    zh: "最多只能提交 5 个图片 URL。",
    en: "You can submit at most 5 image URLs.",
  },
  productsSuccessTitle: {
    ko: "완료",
    my: "ပြီးပါပြီ",
    zh: "完成",
    en: "Done",
  },
  productsSuccessCreated: {
    ko: "상품이 등록되었습니다.",
    my: "ပစ္စည်းထည့်သွင်းပြီးပါပြီ။",
    zh: "商品已创建。",
    en: "Listing created.",
  },
  productsSuccessUpdated: {
    ko: "상품이 수정되었습니다.",
    my: "ပစ္စည်းပြင်ဆင်ပြီးပါပြီ။",
    zh: "商品已更新。",
    en: "Listing updated.",
  },
  productsErrorRequestTitle: {
    ko: "요청 실패",
    my: "တောင်းဆိုမှု မအောင်မြင်ပါ",
    zh: "请求失败",
    en: "Request failed",
  },
  productsErrorRequestBody: {
    ko: "입력을 확인한 뒤 다시 시도해 주세요.",
    my: "ထည့်သွင်းချက်များစစ်ပြီး ထပ်ကြိုးစားပါ။",
    zh: "请检查输入后重试。",
    en: "Check your input and try again.",
  },
  productsModalDetailTitle: {
    ko: "내 상품 상세",
    my: "ကျွန်ုပ်၏ ပစ္စည်း အသေးစိတ်",
    zh: "我的商品详情",
    en: "My listing details",
  },
  productsModalClose: {
    ko: "닫기",
    my: "ပိတ်မည်",
    zh: "关闭",
    en: "Close",
  },
  productsModalCreateTitle: {
    ko: "상품 등록",
    my: "ပစ္စည်းအသစ်ထည့်မည်",
    zh: "发布商品",
    en: "Create listing",
  },
  productsModalEditTitle: {
    ko: "상품 수정",
    my: "ပစ္စည်းပြင်မည်",
    zh: "编辑商品",
    en: "Edit listing",
  },
  productsComposerProgress: {
    ko: "{current} / {total} 단계",
    my: "{current} / {total} အဆင့်",
    zh: "第 {current} / {total} 步",
    en: "Step {current} of {total}",
  },
  productsComposerStepTitle1: {
    ko: "기본 정보",
    my: "အခြေခံ",
    zh: "基本信息",
    en: "Basics",
  },
  productsComposerStepTitle2: {
    ko: "결제·배송",
    my: "ငွေ/ပို့",
    zh: "支付配送",
    en: "Pay & ship",
  },
  productsComposerStepTitle3: {
    ko: "직거래",
    my: "တွေ့ဆုံ",
    zh: "面交",
    en: "Meetup",
  },
  productsComposerStepTitle4: {
    ko: "사진",
    my: "ပုံများ",
    zh: "照片",
    en: "Photos",
  },
  productsComposerStepHint1: {
    ko: "카테고리, 제목, 설명, 가격·상태를 입력하세요.",
    my: "အမျိုးအစား၊ ခေါင်းစီး၊ ဖော်ပြချက်၊ စျေးနှုန်း၊ အခြေအနေကို ဖြည့်ပါ။",
    zh: "请填写分类、标题、描述、价格和成色。",
    en: "Category, title, description, price, and condition.",
  },
  productsComposerStepHint2: {
    ko: "결제 수단과 배송 옵션을 선택하세요.",
    my: "ငွေပေးချေမှု နည်းလမ်းနှင့် ပို့ဆောင်မှု ရွေးချယ်ပါ။",
    zh: "请选择支付方式和配送选项。",
    en: "Choose how buyers pay and whether you offer delivery.",
  },
  productsComposerStepHint3: {
    ko: "직거래 장소와 지도, 참고 정보를 입력하세요.",
    my: "တိုက်ရိုက်လဲလှယ်ရာနေရာ၊ မြေပုံနှင့် မှတ်ချက်များ ဖြည့်ပါ။",
    zh: "请填写当面交易地点、地图与补充说明。",
    en: "Set the meetup spot, map pin, and handy notes.",
  },
  productsComposerStepHint4: {
    ko: "선호 거래 장소와 상품 사진을 추가한 뒤 저장하세요.",
    my: "နှစ်သက်နေရာများနှင့် ပစ္စည်းပုံများ ထည့်ပြီး သိမ်းပါ။",
    zh: "请添加偏好地点与商品照片，然后保存。",
    en: "Add preferred places and product photos, then save.",
  },
  productsComposerNext: {
    ko: "다음",
    my: "နောက်တစ်ဆင့်",
    zh: "下一步",
    en: "Next",
  },
  productsComposerBack: {
    ko: "이전",
    my: "နောက်သို့",
    zh: "上一步",
    en: "Back",
  },
  productsDetailNoData: {
    ko: "데이터가 없습니다.",
    my: "ဒေတာမရှိပါ။",
    zh: "暂无数据。",
    en: "No data.",
  },
  productsDetailLoading: {
    ko: "상품 정보를 불러오는 중…",
    my: "ပစ္စည်းအချက်အလက် တင်နေသည်…",
    zh: "正在加载商品信息…",
    en: "Loading listing…",
  },
  productsDetailSectionListing: {
    ko: "상품 정보",
    my: "ပစ္စည်းအချက်အလက်",
    zh: "商品信息",
    en: "Listing info",
  },
  productsDetailSectionTrade: {
    ko: "거래 · 위치",
    my: "လဲလှယ်မှု · တည်နေရာ",
    zh: "交易与位置",
    en: "Trade & location",
  },
  productsDetailSectionDelivery: {
    ko: "배송",
    my: "ပို့ဆောင်မှု",
    zh: "配送",
    en: "Delivery",
  },
  productsDetailSectionPreferred: {
    ko: "선호 거래 장소",
    my: "နှစ်သက်သော လဲလှယ်ရာနေရာများ",
    zh: "偏好交易地点",
    en: "Preferred meeting places",
  },
  productsDetailSectionPhotos: {
    ko: "사진",
    my: "ဓာတ်ပုံများ",
    zh: "图片",
    en: "Photos",
  },
  productsDetailViewCount: {
    ko: "조회수",
    my: "ကြည့်ရှုမှု",
    zh: "浏览量",
    en: "Views",
  },
  productsDetailCreatedAt: {
    ko: "등록일",
    my: "တင်သည့်ရက်",
    zh: "发布时间",
    en: "Created",
  },
  productsDetailUpdatedAt: {
    ko: "수정일",
    my: "ပြင်ဆင်သည့်ရက်",
    zh: "更新时间",
    en: "Updated",
  },
  productsDetailCoordinates: {
    ko: "좌표",
    my: "ကိုဩဒိနိတ်",
    zh: "坐标",
    en: "Coordinates",
  },
  productsDetailListingId: {
    ko: "상품 ID",
    my: "ပစ္စည်း ID",
    zh: "商品 ID",
    en: "Listing ID",
  },
  productsPaymentCash: {
    ko: "현금",
    my: "ငွေသား",
    zh: "现金",
    en: "Cash",
  },
  productsPaymentKbzpay: {
    ko: "KBZ Pay",
    my: "KBZ Pay",
    zh: "KBZ Pay",
    en: "KBZ Pay",
  },
  productsActiveDealTitle: {
    ko: "진행 중인 거래",
    my: "လက်ရှိ ချုပ်ဆိုမှု",
    zh: "进行中的交易",
    en: "Active deal",
  },
  productsActiveDealHint: {
    ko: "이 상품에서 직거래 또는 안전결제를 시작할 수 있는 구매자 채팅을 선택하세요.",
    my: "ဤပစ္စည်းအတွက် တိုက်ရိုက်တွေ့ဆုံ သို့မဟုတ် လုံခြုံငွေပေးချေမှု စတင်နိုင်သော ဝယ်သူ ချတ်ကို ရွေးချယ်ပါ။",
    zh: "选择可为此商品发起当面交易或担保支付的买家聊天。",
    en: "Choose the buyer chat that can start in-person trade or safe payment for this listing.",
  },
  productsActiveDealEmpty: {
    ko: "이 상품에 대한 구매자 채팅이 아직 없습니다.",
    my: "ဤပစ္စည်းအတွက် ဝယ်သူ ချတ်များ မရှိသေးပါ။",
    zh: "该商品暂无买家聊天。",
    en: "No buyer chats for this listing yet.",
  },
  productsActiveDealSet: {
    ko: "선택",
    my: "ရွေးချယ်မည်",
    zh: "选择",
    en: "Select",
  },
  productsActiveDealClear: {
    ko: "해제",
    my: "ဖယ်ရှားမည်",
    zh: "清除",
    en: "Clear",
  },
  productsActiveDealSelected: {
    ko: "선택된 진행 거래",
    my: "ရွေးချယ်ထားသော လက်ရှိ ချုပ်ဆိုမှု",
    zh: "已选进行中的交易",
    en: "Active deal selected",
  },
  productsActiveDealNotSelected: {
    ko: "선택 안 됨",
    my: "မရွေးချယ်ရသေးပါ",
    zh: "未选择",
    en: "Not selected",
  },
  productsActiveDealUpdated: {
    ko: "진행 중인 거래가 업데이트되었습니다.",
    my: "လက်ရှိ ချုပ်ဆိုမှုကို ပြင်ဆင်ပြီးပါပြီ။",
    zh: "进行中的交易已更新。",
    en: "Active deal updated.",
  },
  productsActiveDealFailed: {
    ko: "진행 중인 거래를 업데이트하지 못했습니다. 다시 시도해 주세요.",
    my: "လက်ရှိ ချုပ်ဆိုမှုကို ပြင်ဆင်၍မရပါ။ ထပ်မံကြိုးစားပါ။",
    zh: "无法更新进行中的交易，请重试。",
    en: "Could not update the active deal. Please try again.",
  },
  productsDetailEditListing: {
    ko: "수정",
    my: "ပြင်မည်",
    zh: "编辑",
    en: "Edit",
  },
  productsDetailDescription: {
    ko: "설명",
    my: "ဖော်ပြချက်",
    zh: "描述",
    en: "Description",
  },
  productsDetailPhotosCount: {
    ko: "사진 {current}/{total}",
    my: "ပုံ {current}/{total}",
    zh: "图片 {current}/{total}",
      en: "图片 {current}/{total}"
  },
  publicDetailSellerReviews: {
    ko: "리뷰",
    my: "သုံးသပ်ချက်များ",
    zh: "评价",
    en: "Reviews",
  },
  publicDetailViewSeller: {
    ko: "판매자 프로필 보기",
    my: "ရောင်းသူ ပရိုဖိုင်ကြည့်ရန်",
    zh: "查看卖家资料",
    en: "View seller profile",
  },
  publicDetailLoadMoreReviews: {
    ko: "리뷰 더 보기",
    my: "သုံးသပ်ချက်များ ထပ်ကြည့်ရန်",
    zh: "加载更多评价",
    en: "Load more reviews",
  },
  publicDetailChatSeller: {
    ko: "판매자에게 메시지",
    my: "ရောင်းသူကို စာပို့မည်",
    zh: "联系卖家",
    en: "Message seller",
  },
  publicDetailChatOpenFailedHint: {
    ko: "채팅방을 열지 못했습니다. 다시 시도해 주세요.",
    my: "ချတ်ခန်း ဖွင့်၍ မရပါ။ ထပ်ကြိုးစားပါ။",
    zh: "无法打开聊天，请重试。",
    en: "Could not open chat. Please try again.",
  },
  publicDetailChatNoAutoSendHint: {
    ko: "대화만 열리며, 메시지를 보내기 전까지 판매자에게 알림이 가지 않습니다.",
    my: "စကားပြောခန်းသာ ဖွင့်မည် — မက်ဆေ့မပို့မချင်း ရောင်းသူထံ အကြောင်းကြားချက် မရပါ။",
    zh: "仅打开对话；在您发送消息前，卖家不会收到通知。",
    en: "Opens the chat only; the seller is not notified until you send a message.",
  },
  publicDetailChatSoon: {
    ko: "채팅 기능은 곧 제공됩니다.",
    my: "ချတ် 기능ကို မကြာမီ ရပါမည်။",
    zh: "聊天功能即将上线。",
    en: "Chat is coming soon.",
  },
  publicProfileTitle: {
    ko: "판매자 프로필",
    my: "ရောင်းသူ ပရိုဖိုင်",
    zh: "卖家资料",
    en: "Seller profile",
  },
  publicProfileRegion: {
    ko: "지역: {region}",
    my: "ဒေသ: {region}",
    zh: "地区：{region}",
      en: "Public Profile Region"
  },
  publicProfileRatingSummary: {
    ko: "★ {avg} · 리뷰 {count}건",
    my: "★ {avg} · သုံးသပ်ချက် {count}",
    zh: "★ {avg} · {count} 条评价",
      en: "Public Profile Rating Summary"
  },
  publicProfileMemberSince: {
    ko: "가입일",
    my: "အဖွဲ့ဝင်စတင်ရက်",
    zh: "注册时间",
    en: "Member since",
  },
  publicProfileReviewsSection: {
    ko: "리뷰",
    my: "သုံးသပ်ချက်များ",
    zh: "评价",
    en: "Reviews",
  },
  publicProfilePrev: {
    ko: "이전",
    my: "ယခင်",
    zh: "上一页",
    en: "Previous",
  },
  publicProfileNext: {
    ko: "다음",
    my: "နောက်",
    zh: "下一页",
    en: "Next",
  },
  publicProfilePage: {
    ko: "페이지 {page}",
    my: "စာမျက်နှာ {page}",
    zh: "第 {page} 页",
      en: "Public Profile Page"
  },
  publicProfileNoComment: {
    ko: "코멘트 없음",
    my: "မှတ်ချက်မရှိ",
    zh: "无评论",
    en: "No comment",
  },
  publicDetailOpenInMaps: {
    ko: "지도 앱에서 열기",
    my: "မြေပုံအက်ပ်တွင် ဖွင့်ရန်",
    zh: "在地图应用中打开",
    en: "Open in maps",
  },
  publicDetailMapsUnavailable: {
    ko: "지도 앱을 열 수 없습니다.",
    my: "မြေပုံအက်ပ် မဖွင့်နိုင်ပါ။",
    zh: "无法打开地图应用。",
    en: "Could not open maps.",
  },
  userRankNewbie: {
    ko: "뉴비",
    my: "အသစ်",
    zh: "新手",
    en: "Newbie",
  },
  userRankBronze: {
    ko: "브론즈",
    my: "ကြေးဝါ",
    zh: "青铜",
    en: "Bronze",
  },
  userRankSilver: {
    ko: "실버",
    my: "ငွေ",
    zh: "白银",
    en: "Silver",
  },
  userRankGold: {
    ko: "골드",
    my: "ရွှေ",
    zh: "黄金",
    en: "Gold",
  },
  userRankVip: {
    ko: "VIP",
    my: "VIP",
    zh: "VIP",
    en: "VIP",
  },
  productsLabelStatus: {
    ko: "상태",
    my: "အခြေအနေ",
    zh: "状态",
    en: "Status",
  },
  productsLabelTitle: {
    ko: "제목",
    my: "ခေါင်းစီး",
    zh: "标题",
    en: "Title",
  },
  productsLabelCondition: {
    ko: "상태(물품)",
    my: "အခြေအနေ (ပစ္စည်း)",
    zh: "成色",
    en: "Condition",
  },
  productsLabelCategoryId: {
    ko: "카테고리 ID",
    my: "အမျိုးအစား ID",
    zh: "分类 ID",
    en: "Category ID",
  },
  productsLabelPayment: {
    ko: "결제",
    my: "ငွေပေးချေမှု",
    zh: "支付",
    en: "Payment",
  },
  productsLabelLocation: {
    ko: "거래 장소",
    my: "လဲလှယ်ရာနေရာ",
    zh: "交易地点",
    en: "Trade location",
  },
  productsLabelPrice: {
    ko: "가격",
    my: "စျေးနှုန်း",
    zh: "价格",
    en: "Price",
  },
  productsLabelDescription: {
    ko: "설명",
    my: "ဖော်ပြချက်",
    zh: "描述",
    en: "Description",
  },
  productsFieldCategory: {
    ko: "카테고리",
    my: "အမျိုးအစား",
    zh: "分类",
    en: "Category",
  },
  productsFieldTitle: {
    ko: "제목",
    my: "ခေါင်းစီး",
    zh: "标题",
    en: "Title",
  },
  productsFieldDescription: {
    ko: "설명",
    my: "ဖော်ပြချက်",
    zh: "描述",
    en: "Description",
  },
  productsFieldPrice: {
    ko: "가격",
    my: "စျေးနှုန်း",
    zh: "价格",
    en: "Price",
  },
  productsFieldPriceCreateOnly: {
    ko: "가격",
    my: "စျေးနှုန်း",
    zh: "价格",
    en: "Price",
  },
  productsPriceLockedHint: {
    ko: "등록 후에는 가격을 변경할 수 없습니다.",
    my: "တင်ပြီးနောက် စျေးနှုန်းကို ပြင်၍မရပါ။",
    zh: "上架后不可修改价格。",
    en: "Price can’t be changed after the listing is created.",
  },
  productsFieldCondition: {
    ko: "상태(물품)",
    my: "အခြေအနေ (ပစ္စည်း)",
    zh: "成色",
    en: "Condition",
  },
  /** UI label for `ProductCondition` enum; API still receives NEW / LIKE_NEW / … */
  productsConditionNew: {
    ko: "새상품",
    my: "အသစ်",
    zh: "全新",
    en: "New",
  },
  productsConditionLikeNew: {
    ko: "거의 새것",
    my: "အသစ်နီးပါး",
    zh: "几乎全新",
    en: "Like new",
  },
  productsConditionGood: {
    ko: "양호",
    my: "ကောင်း",
    zh: "良好",
    en: "Good",
  },
  productsConditionFair: {
    ko: "보통",
    my: "အလယ်",
    zh: "一般",
    en: "Fair",
  },
  productsConditionPoor: {
    ko: "상태 나쁨",
    my: "မကောင်း",
    zh: "较差",
    en: "Poor",
  },
  productsFieldStatus: {
    ko: "판매 상태",
    my: "ရောင်းချမှု အခြေအနေ",
    zh: "销售状态",
    en: "Listing status",
  },
  productsFieldPaymentMethods: {
    ko: "결제 수단",
    my: "ငွေပေးချေမှု နည်းလမ်းများ",
    zh: "支付方式",
    en: "Payment methods",
  },
  productsFieldDirectLocation: {
    ko: "직거래 장소",
    my: "တိုက်ရိုက် လဲလှယ်ရာနေရာ",
    zh: "当面交易地点",
    en: "In-person meeting place",
  },
  productsDirectTradeMapTitle: {
    ko: "직거래 위치 — 지도",
    my: "တိုက်ရိုက် လဲလှယ်ရာ — မြေပုံ",
    zh: "当面交易地点 — 地图",
    en: "Meeting place — map",
  },
  productsDirectTradeMapHint: {
    ko: "지도를 탭하거나 핀을 드래그하면 직거래 좌표가 저장됩니다.",
    my: "မြေပုံကို နှိပ်ပါ သို့မဟုတ် ပင်ကို ဆွဲပါ၊ တိုက်ရိုက်လဲလှယ်ရာ ကိုဩဒိနိတ်သိမ်းပါမည်။",
    zh: "点击地图或拖动图钉即可保存当面交易坐标。",
    en: "Tap the map or drag the pin to save meeting coordinates.",
  },
  /** Step 2 — short helper under the direct meet-up address field */
  productsDirectTradeSectionHelp: {
    ko: "주소를 적은 뒤 지도에서 핀을 찍거나, GPS로 현재 위치를 불러올 수 있어요.",
    my: "လိပ်စာရေးပြီးနောက် မြေပုံတွင် ပင်ထိုးပါ သို့မဟုတ် GPS ဖြင့် လက်ရှိတည်နေရာကို ယူပါ။",
    zh: "填写见面地址后，可在地图选点或使用 GPS 定位当前位置。",
    en: "Enter an address, then pick a pin on the map or use GPS for your current location.",
  },
  /** Primary action — opens full-screen map picker for direct trade */
  productsDirectTradeOpenMap: {
    ko: "지도에서 위치 정하기",
    my: "မြေပုံတွင် တည်နေရာ ရွေးပါ",
    zh: "在地图上选点",
    en: "Pick on map",
  },
  /** Secondary — GPS for direct trade pin */
  productsDirectTradeGpsHint: {
    ko: "GPS로 현재 위치를 불러옵니다(위치 권한 필요).",
    my: "GPS ဖြင့် လက်ရှိတည်နေရာကို ယူပါ (တည်နေရာခွင့်ပြုချက် လိုအပ်သည်)။",
    zh: "使用 GPS 读取当前位置（需位置权限）。",
    en: "Use GPS for your current location (location permission required).",
  },
  /** Label above lat/lng when a pin is saved */
  productsDirectTradeCoordsSaved: {
    ko: "선택된 만남 좌표",
    my: "ရွေးချယ်ထားသော တွေ့ဆုံမှု ကိုဩဒိနိတ်",
    zh: "已选见面坐标",
    en: "Meeting coordinates selected",
  },
  productsDirectTradeClearPin: {
    ko: "핀 지우기",
    my: "ပင်ဖယ်ရန်",
    zh: "清除图钉",
    en: "Clear pin",
  },
  productsFieldLatitude: {
    ko: "위도",
    my: "လတ္တီတွဒ်",
    zh: "纬度",
    en: "Latitude",
  },
  productsFieldLongitude: {
    ko: "경도",
    my: "လောင်ဂျီတွဒ်",
    zh: "经度",
    en: "Longitude",
  },
  productsFieldNearbyLandmarks: {
    ko: "근처 랜드마크",
    my: "အနီးအနား လမ်းမှတ်များ",
    zh: "附近地标",
    en: "Nearby landmarks",
  },
  productsFieldPreferredTradeTime: {
    ko: "선호 거래 시간",
    my: "အလိုရှိသော အရောင်းအဝယ် အချိန်",
    zh: "偏好交易时间",
    en: "Preferred trade time",
  },
  productsFieldMapScreenshotUrl: {
    ko: "지도 스크린샷 이미지",
    my: "မြေပုံ screenshot ပုံ",
    zh: "地图截图图片",
    en: "Map screenshot image",
  },
  productsFieldPreferredLocations: {
    ko: "선호 거래 장소 (최대 3개)",
    my: "နှစ်သက်သော လဲလှယ်နေရာများ (အများဆုံး ၃ ခု)",
    zh: "偏好交易地点（最多3个）",
    en: "Preferred meeting places (max 3)",
  },
  productsPreferredLocationsIntro: {
    ko: "직거래 외 추가로 만나기 좋은 곳입니다. 각 줄마다 이름과 주소가 필요하며, 지도에서 핀으로 위치를 선택할 수 있습니다(선택).",
    my: "တိုက်ရိုက်လဲလှယ်မှု အပြင် ထပ်မံတွေ့ရန် နေရာများ။ တစ်ကြောင်းလျှင် အမည်နှင့် လိပ်စာ လိုအပ်သည်။ မြေပုံပေါ်တွင် ပင်ထိုးခြင်းဖြင့် တည်နေရာ ရွေးချယ်နိုင်သည်။",
    zh: "除当面交易点外，可添加最多 3 个备选见面点；每行需填写名称和地址，并可通过地图选点（可选）。",
    en: "Besides the main meeting point, add up to 3 alternatives. Each row needs a name and address; map pin is optional.",
  },
  productsFieldPreferredLocationItem: {
    ko: "거래 장소",
    my: "လဲလှယ်နေရာ",
    zh: "交易地点",
    en: "Meeting place",
  },
  productsFieldImages: {
    ko: "상품 이미지",
    my: "ကုန်ပစ္စည်း ပုံများ",
    zh: "商品图片",
    en: "Product photos",
  },
  productsPickImages: {
    ko: "이미지 업로드",
    my: "ပုံတင်ရန်",
    zh: "上传图片",
    en: "Upload photos",
  },
  productsPickMapScreenshot: {
    ko: "지도 스크린샷 업로드",
    my: "မြေပုံ screenshot တင်ရန်",
    zh: "上传地图截图",
    en: "Upload map screenshot",
  },
  productsClearSelectedImages: {
    ko: "선택한 이미지 지우기",
    my: "ရွေးထားသော ပုံများ ဖယ်ရှားရန်",
    zh: "清除已选图片",
    en: "Clear selected photos",
  },
  productsClearMapScreenshot: {
    ko: "스크린샷 지우기",
    my: "screenshot ဖယ်ရှားရန်",
    zh: "清除截图",
    en: "Clear screenshot",
  },
  productsSelectedImagesCount: {
    ko: "{count}개 이미지 선택됨",
    my: "ပုံ {count} ခု ရွေးထားသည်",
    zh: "已选择 {count} 张图片",
      en: "Products Selected Images Count"
  },
  productsSelectedMapScreenshot: {
    ko: "선택된 스크린샷: {name}",
    my: "ရွေးထားသော screenshot: {name}",
    zh: "已选截图：{name}",
      en: "Products Selected Map Screenshot"
  },
  productsExistingImagesCount: {
    ko: "현재 등록 이미지: {count}개",
    my: "လက်ရှိပုံများ: {count} ခု",
    zh: "当前图片：{count} 张",
      en: "Products Existing Images Count"
  },
  productsExistingMapScreenshot: {
    ko: "현재 지도 스크린샷이 등록되어 있습니다.",
    my: "လက်ရှိ မြေပုံ screenshot ရှိပါသည်။",
    zh: "当前已存在地图截图。",
    en: "A map screenshot is already set.",
  },
  productsFieldDeliveryFeePayer: {
    ko: "배송비 부담",
    my: "ပို့ဆောင်ခ တာဝန်",
    zh: "运费承担",
    en: "Delivery fee payer",
  },
  productsFieldDelivery: {
    ko: "배송",
    my: "ပို့ဆောင်မှု",
    zh: "配送",
    en: "Delivery",
  },
  productsPlaceholderTitle: {
    ko: "예: iPhone 13 Pro Max",
    my: "ဥပမာ iPhone 13 Pro Max",
    zh: "例如 iPhone 13 Pro Max",
    en: "例如 iPhone 13 Pro Max",
  },
  productsPlaceholderDescription: {
    ko: "예: 스크래치 없음, 배터리 87%",
    my: "ဥပမာ အကွာအဝေးမရှိ၊ ဘက်ထရီ ၈၇%",
    zh: "例如：无划痕，电池 87%",
    en: "e.g. No scratches, battery 87%",
  },
  productsPlaceholderPrice: {
    ko: "예: 980,000",
    my: "ဥပမာ 980,000",
    zh: "例如 980,000",
    en: "e.g. 980,000",
  },
  productsPlaceholderLocation: {
    ko: "예: 파베단 타운শ립",
    my: "ဥပမာ ပါဘေဒန် မြို့နယ်",
    zh: "例如帕贝丹镇区",
    en: "e.g. Pabedan Township",
  },
  productsPlaceholderLat: {
    ko: "위도",
    my: "လတ္တီတွဒ်",
    zh: "纬度",
    en: "Latitude",
  },
  productsPlaceholderLng: {
    ko: "경도",
    my: "လောင်ဂျီတွဒ်",
    zh: "经度",
    en: "Longitude",
  },
  productsMapPickHint: {
    ko: "현재 위치를 불러오거나, 지도에서 거래 지점을 선택하세요.",
    my: "လက်ရှိတည်နေရာယူပါ သို့မဟုတ် မြေပုံပေါ်တွင် လဲလှယ်နေရာရွေးပါ။",
    zh: "请获取当前位置，或在地图上选择交易点。",
    en: "Get your current location, or pick a trade point on the map.",
  },
  productsMapUseCurrent: {
    ko: "현재 위치로 지도 시작",
    my: "လက်ရှိတည်နေရာဖြင့် မြေပုံစတင်",
    zh: "使用当前位置",
    en: "Use current location",
  },
  productsMapUpdateFromCurrent: {
    ko: "현재 위치로 갱신",
    my: "လက်ရှိတည်နေရာဖြင့် ပြန်လည်သတ်မှတ်",
    zh: "用当前位置更新",
    en: "Update from current location",
  },
  productsMapLocating: {
    ko: "위치 확인 중…",
    my: "တည်နေရာရှာနေသည်…",
    zh: "定位中…",
    en: "Locating…",
  },
  productsPreferredLocationAdd: {
    ko: "+ 장소 추가",
    my: "+ နေရာ ထည့်ရန်",
    zh: "+ 添加地点",
    en: "+ Add place",
  },
  productsPreferredLocationRemove: {
    ko: "삭제",
    my: "ဖျက်ရန်",
    zh: "删除",
    en: "Remove",
  },
  productsPreferredLocationPickMap: {
    ko: "지도에서 위치 선택",
    my: "မြေပုံပေါ်မှ တည်နေရာရွေးပါ",
    zh: "在地图上选择位置",
    en: "Pick on map",
  },
  productsPreferredLocationClearPin: {
    ko: "지도 핀 지우기",
    my: "မြေပုံပင်ဖယ်ရန်",
    zh: "清除地图定位",
    en: "Clear map pin",
  },
  productsPreferredLocationNoPin: {
    ko: "지도 위치 미설정 (선택)",
    my: "မြေပုံတည်နေရာ မသတ်မှတ်ရသေး (ရွေးချယ်)",
    zh: "尚未设置地图位置（可选）",
    en: "No map pin yet (optional)",
  },
  productsPreferredLocationMapTitle: {
    ko: "선호 장소 {index} — 지도",
    my: "နှစ်သက်နေရာ {index} — မြေပုံ",
    zh: "偏好地点 {index} — 地图",
      en: "Products Preferred Location Map Title"
  },
  productsPreferredLocationMapHint: {
    ko: "지도를 탭하거나 핀을 드래그하면 이 장소의 좌표가 저장됩니다.",
    my: "မြေပုံကို နှိပ်ပါ သို့မဟုတ် ပင်ကို ဆွဲပါ၊ ဤနေရာ၏ ကိုဩဒိနိတ်သိမ်းပါမည်။",
    zh: "点击地图或拖动图钉即可保存该地点的坐标。",
    en: "Tap the map or drag the pin to save coordinates for this place.",
  },
  productsAlertPreferredLocationTitle: {
    ko: "선호 거래 장소 확인",
    my: "နှစ်သက်နေရာ စစ်ဆေးပါ",
    zh: "请检查偏好交易地点",
    en: "Check preferred meeting places",
  },
  productsAlertPreferredLocationBody: {
    ko: "선호 거래 장소는 label과 address를 모두 입력해야 합니다.",
    my: "နှစ်သက်နေရာတွင် label နှင့် address ကို နှစ်ခုလုံး ဖြည့်ပါ။",
    zh: "偏好交易地点必须同时填写 label 和 address。",
    en: "Preferred places must include both label and address.",
  },
  productsPlaceholderNearbyLandmarks: {
    ko: "예: 술레 파고다 신호등 근처",
    my: "ဥပမာ Sule Pagoda မီးပွိုင့်အနီး",
    zh: "例如：苏雷宝塔红绿灯附近",
    en: "e.g. Near Sule Pagoda traffic light",
  },
  productsPlaceholderPreferredTradeTime: {
    ko: "HH:mm (24시간)",
    my: "HH:mm (၂၄ နာရီ)",
    zh: "HH:mm（24小时）",
    en: "HH:mm (24-hour)",
  },
  productsPlaceholderMapScreenshotUrl: {
    ko: "https://.../map-shot.jpg",
    my: "https://.../map-shot.jpg",
    zh: "https://.../map-shot.jpg",
    en: "https://.../map-shot.jpg",
  },
  productsPlaceholderPreferredLocationLabel: {
    ko: "예: 백화점 정문, 지하철 3번 출구",
    my: "ဥပမာ − ဈေးအဝင်ပေါက်၊ မီထရာ ထွက်ပေါက်",
    zh: "例如：商场正门、地铁A口",
    en: "e.g. Mall main entrance, subway exit A",
  },
  productsPlaceholderPreferredLocationAddress: {
    ko: "예: Pabedan Township, Yangon",
    my: "ဥပမာ Pabedan Township, Yangon",
    zh: "例如：Pabedan Township, Yangon",
    en: "例如：Pabedan Township, Yangon",
  },
  productsPlaceholderPreferredLocationLatitude: {
    ko: "위도 (선택)",
    my: "လတ္တီတွဒ် (ရွေးချယ်)",
    zh: "纬度（可选）",
    en: "Latitude (optional)",
  },
  productsPlaceholderPreferredLocationLongitude: {
    ko: "경도 (선택)",
    my: "လောင်ဂျီတွဒ် (ရွေးချယ်)",
    zh: "经度（可选）",
    en: "Longitude (optional)",
  },
  productsPlaceholderImages: {
    ko: "https://.../1.jpg, https://.../2.jpg",
    my: "https://.../1.jpg, https://.../2.jpg",
    zh: "https://.../1.jpg, https://.../2.jpg",
    en: "https://.../1.jpg, https://.../2.jpg",
  },
  productsAlertImagePermissionBody: {
    ko: "사진 접근 권한이 필요합니다.",
    my: "ဓာတ်ပုံခန်းသို့ ဝင်ခွင့်လိုအပ်ပါသည်။",
    zh: "需要照片访问权限。",
    en: "Photo access permission is required.",
  },
  productsAlertImageTypeTitle: {
    ko: "이미지 형식 오류",
    my: "ပုံဖော်မတ် အမှား",
    zh: "图片格式错误",
    en: "Invalid image type",
  },
  productsAlertImageTypeBody: {
    ko: "PNG, JPEG, WebP 파일만 업로드할 수 있습니다.",
    my: "PNG, JPEG, WebP ပုံများသာ တင်နိုင်ပါသည်။",
    zh: "仅支持 PNG、JPEG、WebP。",
    en: "仅支持 PNG、JPEG、WebP。",
  },
  productsAlertImageSizeTitle: {
    ko: "이미지 크기 오류",
    my: "ပုံအရွယ်အစား အမှား",
    zh: "图片大小错误",
    en: "Image too large",
  },
  productsAlertImageSizeBody: {
    ko: "이미지 한 장은 4MB 이하여야 합니다.",
    my: "ပုံတစ်ပုံလျှင် 4MB အောက် ဖြစ်ရပါမည်။",
    zh: "单张图片必须小于 4MB。",
    en: "Each image must be under 4MB.",
  },
  productsDeliveryOn: {
    ko: "배송 가능",
    my: "ပို့ဆောင်ရန်",
    zh: "可配送",
    en: "Delivery available",
  },
  productsDeliveryOff: {
    ko: "배송 불가",
    my: "ပို့ဆောင်မရ",
    zh: "不可配送",
    en: "No delivery",
  },
  productsDeliveryBuyerPays: {
    ko: "구매자 부담",
    my: "ဝယ်သူပေးချေ",
    zh: "买家承担",
    en: "Buyer pays",
  },
  productsDeliverySellerPays: {
    ko: "판매자 부담",
    my: "ရောင်းသူပေးချေ",
    zh: "卖家承担",
    en: "Seller pays",
  },
  productsSaveCreate: {
    ko: "등록",
    my: "ထည့်မည်",
    zh: "创建",
    en: "Create",
  },
  productsSaveUpdate: {
    ko: "수정 저장",
    my: "ပြင်ပြီး သိမ်းမည်",
    zh: "保存修改",
    en: "Save changes",
  },
  productsSaving: {
    ko: "저장 중…",
    my: "သိမ်းနေသည်…",
    zh: "保存中…",
    en: "Saving…",
  },
  loginPasswordLabel: {
    ko: "비밀번호",
    my: "စကားဝှက်",
    zh: "密码",
    en: "Password",
  },
  loginVerifyRequiredFallback: {
    ko: "로그인 전에 전화와 이메일 인증이 필요합니다",
    my: "ဝင်ရန်မီ ဖုန်းနှင့် အီးမေးလ် အတည်ပြုရန်လိုအပ်သည်",
    zh: "登录前需要完成手机和邮箱验证",
    en: "Phone and email verification are required before signing in",
  },
  skipVerification: {
    ko: "인증 건너뛰기",
    my: "အတည်ပြုခြင်းကို ကျော်ရန်",
    zh: "跳过验证",
    en: "Skip for now",
  },
  skipVerificationText: {
    ko: "인증을 건너뛰고 로그인으로 이동합니다.",
    my: "အတည်ပြုခြင်းကို ကျော်ပြီး လော့ဂ်အင်သို့ သွားပါ။",
    zh: "跳过验证并前往登录。",
    en: "You can finish verification later in Profile.",
  },
  actionCancel: { ko: "취소", my: "မလုပ်တော့", zh: "取消", en: "Cancel" },
  actionVerify: { ko: "인증", my: "အတည်ပြု", zh: "验证", en: "Verify" },
};

const PRODUCT_CONDITION_LABEL_KEY: Record<ProductCondition, keyof typeof DICT> =
  {
    NEW: "productsConditionNew",
    LIKE_NEW: "productsConditionLikeNew",
    GOOD: "productsConditionGood",
    FAIR: "productsConditionFair",
    POOR: "productsConditionPoor",
  };

const PRODUCT_STATUS_LABEL_KEY: Record<ProductStatus, keyof typeof DICT> = {
  DRAFT: "productsStatusDraft",
  ACTIVE: "productsStatusActive",
  INACTIVE: "productsStatusInactive",
  SOLD: "productsStatusSold",
  DELETED: "productsStatusDeleted",
};

/** Locale key for product condition chips / detail (API still uses `NEW`, `LIKE_NEW`, …). */
export function productConditionLabelKey(
  condition: ProductCondition,
): keyof typeof DICT {
  return PRODUCT_CONDITION_LABEL_KEY[condition];
}

/** Locale key for seller listing status badge (API uses `ACTIVE`, `DRAFT`, …). */
export function productStatusLabelKey(
  status: ProductStatus,
): keyof typeof DICT {
  return PRODUCT_STATUS_LABEL_KEY[status];
}

const USER_RANK_LABEL_KEY: Record<UserRankTier, keyof typeof DICT> = {
  NEWBIE: "userRankNewbie",
  BRONZE: "userRankBronze",
  SILVER: "userRankSilver",
  GOLD: "userRankGold",
  VIP: "userRankVip",
};

/** Locale key for public profile rank badge (`NEWBIE`, `BRONZE`, …). */
export function userRankLabelKey(
  rank: string | null | undefined,
): keyof typeof DICT {
  const tier = rank?.trim().toUpperCase() as UserRankTier;
  return USER_RANK_LABEL_KEY[tier] ?? "userRankNewbie";
}

export function parseProductCondition(
  raw: string | null | undefined,
): ProductCondition | null {
  if (!raw || typeof raw !== "string") return null;
  return Object.hasOwn(PRODUCT_CONDITION_LABEL_KEY, raw)
    ? (raw as ProductCondition)
    : null;
}

/** Localized condition label for detail screens (API values: `NEW`, `LIKE_NEW`, …). */
export function formatProductConditionForDisplay(
  raw: string | null | undefined,
  translate: (key: keyof typeof DICT) => string,
): string {
  const c = parseProductCondition(raw);
  return c ? translate(productConditionLabelKey(c)) : raw?.trim() || "—";
}

function t(key: keyof typeof DICT, locale: AppLocale): string {
  return DICT[key][locale];
}

function formatTemplate(
  template: string,
  vars?: Record<string, unknown>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_m, k: string) => {
    const v = vars[k];
    return typeof v === "string" || typeof v === "number" ? String(v) : "";
  });
}

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => Promise<void>;
  t: (key: keyof typeof DICT) => string;
  tf: (key: keyof typeof DICT, vars?: Record<string, unknown>) => string;
  categorySecondLine: (slug: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("ko");
  const { preferencesRepository } = useServices();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await preferencesRepository.getLocale();
      if (mounted && saved) setLocaleState(saved);
    })();
    return () => {
      mounted = false;
    };
  }, [preferencesRepository]);

  const setLocale = useCallback(
    async (next: AppLocale) => {
      setLocaleState(next);
      await preferencesRepository.setLocale(next);
    },
    [preferencesRepository],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => t(key, locale),
      tf: (key, vars) => formatTemplate(t(key, locale), vars),
      categorySecondLine: (slug) => resolveCategorySecondLine(slug, locale),
    }),
    [locale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}

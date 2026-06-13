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
    },
  },
  {
    match: (s) =>
      /house|home|kitchen|가정|household/i.test(s) || s.includes("house"),
    labels: {
      ko: "(가정용품)",
      my: "(အိမ်သုံးပစ္စည်း)",
      zh: "(家居用品)",
    },
  },
  {
    match: (s) =>
      /book|study|education|student|책|학생/i.test(s) || s.includes("book"),
    labels: {
      ko: "(책&학생용품)",
      my: "(စာအုပ်နှင့် ကျောင်းသုံးပစ္စည်း)",
      zh: "(图书与学习用品)",
    },
  },
  {
    match: (s) =>
      /part[-\s]?time|job|work|일자리|briefcase/i.test(s) || s.includes("part"),
    labels: {
      ko: "(일자리)",
      my: "(အလုပ်အကိုင်)",
      zh: "(兼职/工作)",
    },
  },
  {
    match: (s) =>
      /hous|rent|dorm|apartment|주택|기숙사/i.test(s) || s.includes("housing"),
    labels: {
      ko: "(주택·기숙사)",
      my: "(အိမ်ခြံမြေ·နေထိုင်ရာ)",
      zh: "(住房/宿舍)",
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
    },
  },
  {
    match: (s) =>
      /look|want|seek|구해|searching/i.test(s) || s.includes("looking"),
    labels: {
      ko: "(구해요)",
      my: "(ရှာဖွေနေသည်)",
      zh: "(求购)",
    },
  },
  {
    match: (s) =>
      /electronic|gadget|가전|디지털/i.test(s) || s.includes("electronic"),
    labels: {
      ko: "(전자·가젯)",
      my: "(အီလက်ထရောနစ်)",
      zh: "(电子数码)",
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
  },
  signInSubtitle: {
    ko: "계정에 로그인하세요",
    my: "သင့်အကောင့်သို့ ဝင်ရောက်ပါ",
    zh: "登录你的账号",
  },
  phone: { ko: "전화번호", my: "ဖုန်းနံပါတ်", zh: "手机号" },
  facebookId: { ko: "페이스북 ID", my: "ဖေ့စ်ဘွတ် ID", zh: "Facebook ID" },
  password: { ko: "비밀번호", my: "စကားဝှက်", zh: "密码" },
  show: { ko: "보기", my: "ပြရန်", zh: "显示" },
  hide: { ko: "숨기기", my: "ဖျောက်ရန်", zh: "隐藏" },
  showPassword: { ko: "비밀번호 보기", my: "စကားဝှက် ပြရန်", zh: "显示密码" },
  hidePassword: {
    ko: "비밀번호 숨기기",
    my: "စကားဝှက် ဖျောက်ရန်",
    zh: "隐藏密码",
  },
  signIn: { ko: "로그인", my: "ဝင်မည်", zh: "登录" },
  forgotPassword: {
    ko: "비밀번호 찾기",
    my: "စကားဝှက် မေ့နေပါသလား",
    zh: "忘记密码",
  },
  forgotPasswordTitle: {
    ko: "비밀번호 재설정",
    my: "စကားဝှက် ပြန်လည်သတ်မှတ်ရန်",
    zh: "重置密码",
  },
  forgotPasswordSubtitle: {
    ko: "등록된 전화번호로 6자리 SMS 인증번호를 받습니다.",
    my: "မှတ်ပုံတင်ထားသော ဖုန်းနံပါတ်သို့ SMS OTP ၆ လုံးပို့ပေးပါမည်။",
    zh: "将向注册手机号发送 6 位短信验证码。",
  },
  forgotPasswordSendOtp: {
    ko: "인증번호 받기",
    my: "OTP ပို့မည်",
    zh: "获取验证码",
  },
  forgotPasswordResetStepHint: {
    ko: "SMS로 받은 6자리 코드와 새 비밀번호를 입력하세요.",
    my: "SMS မှ ရသော ကုဒ် ၆ လုံးနှင့် စကားဝှက်အသစ်ကို ရိုက်ထည့်ပါ။",
    zh: "请输入短信 6 位验证码和新密码。",
  },
  forgotPasswordResetSubmit: {
    ko: "비밀번호 변경",
    my: "စကားဝှက် ပြောင်းမည်",
    zh: "更新密码",
  },
  forgotPasswordOtpSent: {
    ko: "비밀번호 재설정 인증번호가 전송되었습니다.",
    my: "စကားဝှက် ပြန်လည်သတ်မှတ်ရန် OTP ပို့ပြီးပါပြီ။",
    zh: "密码重置验证码已发送。",
  },
  forgotPasswordSuccess: {
    ko: "비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요.",
    my: "စကားဝှက် ပြောင်းပြီးပါပြီ။ အသစ်ဖြင့် ဝင်ရောက်ပါ။",
    zh: "密码已更新，请使用新密码登录。",
  },
  forgotPasswordSuccessTitle: {
    ko: "완료",
    my: "အောင်မြင်သည်",
    zh: "成功",
  },
  forgotPasswordDeactivated: {
    ko: "계정이 비활성화되었거나 정지되었습니다.",
    my: "အကောင့် ပိတ်ထားသည် သို့မဟုတ် ပိတ်ပင်ထားသည်။",
    zh: "账号已停用或被封禁。",
  },
  forgotPasswordAdminAccount: {
    ko: "관리자 계정은 관리자 대시보드를 이용하세요.",
    my: "အက်ဒမင်အကောင့် — admin dashboard သုံးပါ။",
    zh: "管理员账号请使用管理后台。",
  },
  forgotPasswordPhoneNotFound: {
    ko: "등록되지 않은 전화번호입니다.",
    my: "မှတ်ပုံတင်ထားသော ဖုန်းနံပါတ် မရှိပါ။",
    zh: "该手机号未注册。",
  },
  forgotPasswordRateLimit: {
    ko: "요청이 너무 많습니다. 잠시 후 다시 시도하세요.",
    my: "တောင်းဆိုမှု များလွန်းသည်။ ခဏနေ၍ ပြန်ကြိုးစားပါ။",
    zh: "请求过于频繁，请稍后再试。",
  },
  forgotPasswordInvalidOtp: {
    ko: "인증번호가 올바르지 않거나 만료되었습니다.",
    my: "OTP မမှန်ကန်ပါ သို့မဟုတ် သက်တမ်းကုန်ပါပြီ။",
    zh: "验证码无效或已过期。",
  },
  forgotPasswordMismatch: {
    ko: "비밀번호가 일치하지 않거나 인증 요청이 없습니다.",
    my: "စကားဝှက် မကိုက်ညီပါ သို့မဟုတ် OTP တောင်းဆိုမှု မရှိပါ။",
    zh: "密码不一致或尚未请求重置验证码。",
  },
  newPassword: {
    ko: "새 비밀번호",
    my: "စကားဝှက်အသစ်",
    zh: "新密码",
  },
  newPasswordPlaceholder: {
    ko: "새 비밀번호 입력",
    my: "စကားဝှက်အသစ် ရိုက်ထည့်ပါ",
    zh: "输入新密码",
  },
  phoneMode: { ko: "전화번호", my: "ဖုန်း", zh: "手机号" },
  facebookMode: { ko: "페이스북", my: "ဖေ့စ်ဘွတ်", zh: "Facebook" },
  loginFailedTitle: {
    ko: "로그인 실패",
    my: "ဝင်ရောက်မှု မအောင်မြင်ပါ",
    zh: "登录失败",
  },
  loginFailedBody: {
    ko: "자격 증명을 확인하고 다시 시도하세요.",
    my: "အထောက်အထားများကို စစ်ဆေးပြီး ပြန်လည်ကြိုးစားပါ။",
    zh: "请检查账号信息后重试。",
  },
  invalidRequestTitle: {
    ko: "요청 오류",
    my: "မမှန်ကန်သော တောင်းဆိုမှု",
    zh: "请求无效",
  },
  invalidRequestBody: {
    ko: "전화번호 또는 Facebook ID 중 하나만 선택해 다시 시도하세요.",
    my: "ဖုန်း သို့မဟုတ် Facebook ID တစ်ခုတည်းကိုသာ ရွေးပြီး ပြန်လည်ကြိုးစားပါ။",
    zh: "每次只能选择一种登录方式（手机号或 Facebook ID）。",
  },
  invalidCredsBody: {
    ko: "자격 증명이 올바르지 않거나 계정이 비활성화되었습니다.",
    my: "အထောက်အထား မမှန်ကန်ပါ သို့မဟုတ် အကောင့်မသက်ဝင်ပါ။",
    zh: "账号或密码错误，或账号未激活。",
  },
  errorTitle: { ko: "오류", my: "အမှား", zh: "错误" },
  genericErrorBody: {
    ko: "문제가 발생했습니다. 다시 시도하세요.",
    my: "တစ်ခုခု မှားသွားပါသည်။ ပြန်လည်ကြိုးစားပါ။",
    zh: "出了点问题，请重试。",
  },
  phoneRequired: {
    ko: "전화번호를 입력하세요",
    my: "ဖုန်းနံပါတ် လိုအပ်သည်",
    zh: "请输入手机号",
  },
  phoneInvalid: {
    ko: "올바른 전화번호를 입력하세요",
    my: "မှန်ကန်သော ဖုန်းနံပါတ် ရိုက်ထည့်ပါ",
    zh: "请输入有效的手机号",
  },
  otpInvalid: {
    ko: "6자리 인증번호를 입력하세요",
    my: "ကုဒ် ၆ လုံး ရိုက်ထည့်ပါ",
    zh: "请输入 6 位验证码",
  },
  facebookIdRequired: {
    ko: "Facebook ID를 입력하세요",
    my: "Facebook ID လိုအပ်သည်",
    zh: "请输入 Facebook ID",
  },
  passwordRequired: {
    ko: "비밀번호를 입력하세요",
    my: "စကားဝှက် လိုအပ်သည်",
    zh: "请输入密码",
  },

  // Register screen
  signUp: { ko: "회원가입", my: "စာရင်းသွင်းရန်", zh: "注册" },
  signUpCta: { ko: "가입하기", my: "စာရင်းသွင်းမည်", zh: "立即注册" },
  haveAccount: {
    ko: "이미 계정이 있으신가요?",
    my: "အကောင့်ရှိပြီးလား?",
    zh: "已有账号?",
  },
  noAccount: {
    ko: "계정이 없으신가요?",
    my: "အကောင့်မရှိသေးပါလား?",
    zh: "还没有账号?",
  },
  registrationMethod: {
    ko: "가입 방법",
    my: "စာရင်းသွင်းနည်း",
    zh: "注册方式",
  },
  both: { ko: "둘다", my: "နှစ်ခုလုံး", zh: "两者" },
  phoneOnly: { ko: "전화", my: "ဖုန်းသာ", zh: "仅手机号" },
  phoneAndFacebook: {
    ko: "페이스북과 전화번호 모두 필요",
    my: "Facebook နှင့် ဖုန်းနှစ်ခုလိုအပ်သည်",
    zh: "需要 Facebook 与手机号",
  },
  nickname: { ko: "닉네임", my: "အမည်ခေါ်", zh: "昵称" },
  nicknamePlaceholder: {
    ko: "닉네임을 입력하세요",
    my: "အမည်ခေါ်ကို ရိုက်ထည့်ပါ",
    zh: "请输入昵称",
  },
  check: { ko: "확인", my: "စစ်ဆေးရန်", zh: "检查" },
  nicknameAvailable: {
    ko: "사용 가능한 닉네임입니다",
    my: "အသုံးပြုနိုင်သော အမည်",
    zh: "可以使用",
  },
  nicknameTooShort: {
    ko: "닉네임은 2자 이상이어야 합니다",
    my: "အမည်သည် စာလုံး၂လုံးအနည်းဆုံးရှိရမည်",
    zh: "昵称至少需要 2 个字符",
  },
  confirmPassword: {
    ko: "비밀번호 확인",
    my: "စကားဝှက်အတည်ပြုရန်",
    zh: "确认密码",
  },
  confirmPasswordPlaceholder: {
    ko: "비밀번호를 다시 입력하세요",
    my: "စကားဝှက်ကို ပြန်လည်ရိုက်ထည့်ပါ",
    zh: "请再次输入密码",
  },
  passwordMismatch: {
    ko: "비밀번호가 일치하지 않습니다",
    my: "စကားဝှက်မကိုက်ညီပါ",
    zh: "两次密码不一致",
  },
  phoneNumber: { ko: "전화번호", my: "ဖုန်းနံပါတ်", zh: "手机号码" },
  phoneNumberPlaceholder: {
    ko: "09-XXXX-XXXX",
    my: "09-XXXX-XXXX",
    zh: "09-XXXX-XXXX",
  },
  sendCode: { ko: "전송", my: "ပို့မည်", zh: "发送" },
  emailAddress: { ko: "이메일 주소", my: "အီးမေးလ်လိပ်စာ", zh: "电子邮箱" },
  emailPlaceholder: {
    ko: "example@email.com",
    my: "example@email.com",
    zh: "example@email.com",
  },
  emailInvalid: {
    ko: "올바른 이메일 주소를 입력하세요",
    my: "မှန်ကန်သော အီးမေးလ်ထည့်ပါ",
    zh: "请输入有效的邮箱地址",
  },
  kPayRegistration: {
    ko: "K-pay 등록",
    my: "K-pay မှတ်ပုံတင်",
    zh: "K-pay 注册信息",
  },
  kPayName: {
    ko: "K-pay 등록 이름",
    my: "K-pay မှတ်ပုံတင်အမည်",
    zh: "K-pay 注册姓名",
  },
  kPayNamePlaceholder: {
    ko: "K-pay에 등록된 이름을 입력하세요",
    my: "K-pay တွင်မှတ်ပုံတင်ထားသော အမည်ကိုထည့်ပါ",
    zh: "请输入 K-pay 注册的姓名",
  },
  kPayPhone: {
    ko: "K-pay 등록 전화번호",
    my: "K-pay မှတ်ပုံတင်ဖုန်း",
    zh: "K-pay 注册手机号",
  },
  kPayWarning: {
    ko: "실제 이름과 번호가 K-pay 등록 정보와 다르면 입금 및 출금(대금 및 포인트)이 안됩니다",
    my: "အမည်နှင့်ဖုန်းနံပါတ်သည် K-pay မှတ်ပုံတင်ချက်နှင့်မတူပါက ငွေထည့်/ထုတ် (ငွေနှင့် ပွိုင့်) မလုပ်နိုင်ပါ",
    zh: "若姓名和手机号与 K-pay 登记信息不符，存取款（款项与积分）将无法处理",
  },
  gender: { ko: "성별", my: "ကျား/မ", zh: "性别" },
  male: { ko: "남자", my: "ကျား", zh: "男" },
  female: { ko: "여자", my: "မ", zh: "女" },
  age: { ko: "나이", my: "အသက်", zh: "年龄" },
  agePlaceholder: { ko: "나이", my: "အသက်", zh: "年龄" },
  ageInvalid: {
    ko: "유효한 나이를 입력하세요 (14-120)",
    my: "မှန်ကန်သော အသက်ထည့်ပါ (14-120)",
    zh: "请输入有效年龄 (14-120)",
  },
  maritalStatus: { ko: "결혼 여부", my: "အိမ်ထောင်ရေးအခြေအနေ", zh: "婚姻状况" },
  married: { ko: "기혼", my: "အိမ်ထောင်ရှိ", zh: "已婚" },
  single: { ko: "미혼", my: "အိမ်ထောင်မရှိ", zh: "未婚" },
  region: { ko: "지역", my: "ဒေသ", zh: "地区" },
  regionVerify: {
    ko: "클릭하여 지역 인증",
    my: "ဒေသအတည်ပြုရန် နှိပ်ပါ",
    zh: "点击验证您的位置",
  },
  regionVerified: {
    ko: "지역 인증 완료",
    my: "ဒေသအတည်ပြုပြီးပြီ",
    zh: "地区已验证",
  },
  regionPlaceholder: {
    ko: "지역명을 입력하세요",
    my: "ဒေသအမည်ထည့်ပါ",
    zh: "请输入地区名称",
  },
  referralCodeLabel: {
    ko: "추천 코드 (선택)",
    my: "ရည်ညွှန်းကုဒ် (ရွေးချယ်နိုင်)",
    zh: "推荐码（选填）",
  },
  optional: { ko: "선택사항", my: "ရွေးချယ်", zh: "选填" },
  referralPlaceholder: {
    ko: "친구의 초대 코드를 입력하세요",
    my: "မိတ်ဆွေ၏ ဖိတ်ခေါ်ကုဒ် ထည့်ပါ",
    zh: "请输入好友的邀请码",
  },
  referralCodeInvalid: {
    ko: "유효하지 않은 추천 코드입니다.",
    my: "ရည်ညွှန်းကုဒ် မမှန်ပါ။",
    zh: "邀请码无效。",
  },
  referralCodeCopiedTitle: {
    ko: "복사됨",
    my: "ကူးယူပြီး",
    zh: "已复制",
  },
  referralCodeCopiedBody: {
    ko: "초대 코드가 클립보드에 복사되었습니다.",
    my: "ဖိတ်ခေါ်ကုဒ်ကို ကူးယူပြီးပါပြီ။",
    zh: "邀请码已复制到剪贴板。",
  },
  referralCodeCopy: {
    ko: "복사",
    my: "ကူးယူမည်",
    zh: "复制",
  },
  referralCodeShare: {
    ko: "공유",
    my: "မျှဝေမည်",
    zh: "分享",
  },
  profileInviteCodeTitle: {
    ko: "내 초대 코드",
    my: "ကျွန်ုပ်၏ ဖိတ်ခေါ်ကုဒ်",
    zh: "我的邀请码",
  },
  profileInviteCodeHint: {
    ko: "친구가 가입할 때 이 코드를 입력하면 됩니다.",
    my: "မိတ်ဆွေများသည် စာရင်းသွင်းစဉ် ဤကုဒ်ကို ထည့်ပါ။",
    zh: "好友注册时填写此邀请码即可。",
  },
  publicProfileReferralTitle: {
    ko: "이 판매자의 초대 코드",
    my: "ဤရောင်းသူ၏ ဖိတ်ခေါ်ကုဒ်",
    zh: "该卖家的邀请码",
  },
  publicProfileReferralHint: {
    ko: "가입 시 이 코드를 추천 코드로 입력하세요.",
    my: "စာရင်းသွင်းရာတွင် ဤကုဒ်ကို ရည်ညွှန်းကုဒ်အဖြစ် ထည့်ပါ။",
    zh: "注册时将此码作为推荐码填写。",
  },
  facebookIdPlaceholder: {
    ko: "100012345678901",
    my: "100012345678901",
    zh: "100012345678901",
  },
  registerFailedTitle: {
    ko: "회원가입 실패",
    my: "စာရင်းသွင်းခြင်း မအောင်မြင်ပါ",
    zh: "注册失败",
  },
  registerFailedBody: {
    ko: "입력한 정보를 확인하세요.",
    my: "သင်ထည့်သွင်းထားသော အချက်အလက်များကို ပြန်စစ်ဆေးပါ",
    zh: "请检查你输入的信息。",
  },
  registerConflictBody: {
    ko: "전화번호, 이메일 또는 Facebook ID가 이미 사용 중입니다.",
    my: "ဖုန်း၊ အီးမေးလ် သို့မဟုတ် Facebook ID သည် သုံးထားပြီးဖြစ်သည်",
    zh: "手机号、邮箱或 Facebook ID 已被使用。",
  },
  registerSuccessTitle: {
    ko: "회원가입 완료",
    my: "စာရင်းသွင်းခြင်း အောင်မြင်ပါသည်",
    zh: "注册成功",
  },
  registerSuccessBody: {
    ko: "전화 및 이메일 인증을 완료해 주세요.",
    my: "ဖုန်းနှင့် အီးမေးလ် အတည်ပြုခြင်းပြီးစေပါ",
    zh: "请完成手机号与邮箱验证。",
  },

  // Verification screen
  verification: { ko: "본인 인증", my: "အတည်ပြုခြင်း", zh: "身份验证" },
  phoneVerification: {
    ko: "전화번호 인증",
    my: "ဖုန်းနံပါတ်အတည်ပြုခြင်း",
    zh: "手机号验证",
  },
  emailVerification: {
    ko: "이메일 인증",
    my: "အီးမေးလ်အတည်ပြုခြင်း",
    zh: "邮箱验证",
  },
  kbzPayVerification: {
    ko: "K-pay 인증 요청",
    my: "K-pay အတည်ပြုတောင်းဆိုရန်",
    zh: "K-pay 验证",
  },
  otpCode: { ko: "인증 코드", my: "အတည်ပြုကုဒ်", zh: "验证码" },
  otpPlaceholder: {
    ko: "6자리 코드 입력",
    my: "ဂဏန်း ၆ လုံးထည့်ပါ",
    zh: "请输入 6 位验证码",
  },
  verify: { ko: "인증하기", my: "အတည်ပြုမည်", zh: "验证" },
  sendEmailVerificationButton: {
    ko: "인증 메일 보내기",
    my: "အီးမေးလ် အတည်ပြုစာ ပို့မည်",
    zh: "发送邮箱验证",
  },
  verifyEmailButton: {
    ko: "이메일 인증하기",
    my: "အီးမေးလ် အတည်ပြုမည်",
    zh: "验证邮箱",
  },
  resend: { ko: "재전송", my: "ပြန်ပို့ရန်", zh: "重新发送" },
  emailToken: { ko: "이메일 토큰", my: "အီးမေးလ် တိုကင်", zh: "邮箱令牌" },
  emailTokenPlaceholder: {
    ko: "이메일로 받은 토큰 입력",
    my: "အီးမေးလ်မှ တိုကင်ထည့်ပါ",
    zh: "请输入邮箱收到的令牌",
  },
  kbzPayMessagePlaceholder: {
    ko: "관리자에게 전달할 메시지",
    my: "အုပ်ချုပ်သူထံသို့ မက်ဆေ့ချ်",
    zh: "发送给管理员的消息",
  },
  kbzPayRequestIntro: {
    ko: "관리자에게 KBZPay 송금 안내를 요청하세요.",
    my: "KBZPay လွှဲပြောင်းရန် ညွှန်ကြားချက်ပေးရန် အုပ်ချုပ်သူကို တောင်းဆိုပါ။",
    zh: "请联系管理员获取 KBZPay 转账指引。",
  },
  requestVerification: {
    ko: "인증 요청",
    my: "အတည်ပြုတောင်းဆိုမည်",
    zh: "请求验证",
  },
  continueToApp: { ko: "앱으로 이동", my: "Appသို့ သွားမည်", zh: "进入应用" },
  otpSent: {
    ko: "인증 코드를 전송했습니다",
    my: "အတည်ပြုကုဒ်ကို ပို့ပြီး",
    zh: "验证码已发送",
  },
  otpVerified: {
    ko: "전화번호가 인증되었습니다",
    my: "ဖုန်းနံပါတ် အတည်ပြုပြီး",
    zh: "手机号已验证",
  },
  emailSent: {
    ko: "이메일 인증 링크를 전송했습니다",
    my: "အီးမေးလ် အတည်ပြုလင့်ခ် ပို့ပြီး",
    zh: "验证链接已发送到邮箱",
  },
  emailVerified: {
    ko: "이메일이 인증되었습니다",
    my: "အီးမေးလ် အတည်ပြုပြီး",
    zh: "邮箱已验证",
  },
  kbzPayRequested: {
    ko: "K-pay 인증이 요청되었습니다",
    my: "K-pay အတည်ပြု တောင်းဆိုပြီး",
    zh: "K-pay 验证已请求",
  },
  kbzPayPendingHint: {
    ko: "정확히 100 MMK를 송금한 후 거래번호를 제출하세요.",
    my: "တိတိကျကျ 100 MMK ကို လွှဲပြီးနောက် ငွေလွှဲ လုပ်ဆောင်မှုအမှတ်ကို တင်ပြပါ။",
    zh: "请准确转账 100 MMK，然后提交交易号。",
  },
  kbzPayStatusPendingInstruction: {
    ko: "관리자 안내 대기",
    my: "အုပ်ချုပ်သူ ညွှန်ကြားချက်ကို စောင့်ဆိုင်းနေသည်",
    zh: "等待管理员指引",
  },
  kbzPayStatusInstructionReady: {
    ko: "안내 발송됨",
    my: "ညွှန်ကြားချက် ပို့ပြီး",
    zh: "指引已发送",
  },
  kbzPayStatusTransactionSubmitted: {
    ko: "거래번호 제출됨",
    my: "လုပ်ဆောင်မှုအမှတ် တင်ပြပြီး",
    zh: "交易号已提交",
  },
  kbzPayWaitInstructionHint: {
    ko: "관리자의 송금 안내를 기다려주세요.",
    my: "အုပ်ချုပ်သူ၏ လွှဲပြောင်းညွှန်ကြားချက်ကို စောင့်ပါ။",
    zh: "请等待管理员的转账指引。",
  },
  kbzPayAmountLabel: {
    ko: "송금 금액",
    my: "လွှဲမည့် ပမာဏ",
    zh: "转账金额",
  },
  kbzPayAmountValue: {
    ko: "100 MMK",
    my: "100 MMK",
    zh: "100 MMK",
  },
  kbzPayAdminPhoneLabel: {
    ko: "송금용 관리자 전화번호",
    my: "လွှဲပြောင်းရန် အုပ်ချုပ်သူ ဖုန်းနံပါတ်",
    zh: "管理员收款手机号",
  },
  kbzPayAdminNoteLabel: {
    ko: "관리자 메모",
    my: "အုပ်ချုပ်သူ မှတ်ချက်",
    zh: "管理员备注",
  },
  kbzPayTxnIdLabel: {
    ko: "KBZ 거래번호",
    my: "KBZ လုပ်ဆောင်မှုအမှတ်",
    zh: "KBZ 交易号",
  },
  kbzPayTxnIdPlaceholder: {
    ko: "KBZ-TXN-20260506-000321",
    my: "KBZ-TXN-20260506-000321",
    zh: "KBZ-TXN-20260506-000321",
  },
  submitTransaction: {
    ko: "거래번호 제출",
    my: "လုပ်ဆောင်မှုအမှတ် တင်ပြမည်",
    zh: "提交交易号",
  },
  kbzPayTransactionSubmitted: {
    ko: "KBZ 거래번호가 제출되었습니다.",
    my: "KBZ လုပ်ဆောင်မှုအမှတ်ကို တင်ပြပြီးပါပြီ။",
    zh: "已提交 KBZ 交易号。",
  },
  kbzPaySubmittedHint: {
    ko: "제출 완료. 관리자 확인을 기다리는 중입니다.",
    my: "တင်ပြပြီးပါပြီ။ အုပ်ချုပ်သူ အတည်ပြုမှုကို စောင့်နေပါသည်။",
    zh: "已提交，等待管理员核验。",
  },
  kbzPaySubmittedTxnLabel: {
    ko: "제출한 거래번호",
    my: "တင်ပြထားသော လုပ်ဆောင်မှုအမှတ်",
    zh: "已提交的交易号",
  },
  kbzPayTxnRequired: {
    ko: "KBZPay 거래번호가 필요합니다.",
    my: "KBZPay လုပ်ဆောင်မှုအမှတ် လိုအပ်ပါသည်။",
    zh: "需要填写 KBZPay 交易号。",
  },
  kbzPayTxnInvalid: {
    ko: "유효한 KBZPay 거래번호를 입력하세요.",
    my: "မှန်ကန်သော KBZPay လုပ်ဆောင်မှုအမှတ်ကို ထည့်ပါ။",
    zh: "请输入有效的 KBZPay 交易号。",
  },
  kbzPayNeedsVerificationFirst: {
    ko: "먼저 전화번호와 이메일 인증을 완료해 주세요.",
    my: "အရင်ဆုံး ဖုန်းနှင့် အီးမေးလ် အတည်ပြုခြင်းကို ပြီးစီးပါ။",
    zh: "请先完成手机号和邮箱验证。",
  },
  profileTitle: { ko: "프로필", my: "ပရိုဖိုင်", zh: "个人资料" },
  profileTabRewards: { ko: "리워드", my: "ဆုလာဘ်", zh: "奖励" },
  profileTabVerifications: { ko: "인증", my: "အတည်ပြု", zh: "验证" },
  profileTabPassword: { ko: "비밀번호", my: "စကားဝှက်", zh: "密码" },
  profileMemberFallback: {
    ko: "Flex Used Market 회원",
    my: "Flex Used Market အဖွဲ့ဝင်",
    zh: "Flex Used Market 用户",
  },
  profileEmailFallback: {
    ko: "이메일 없음",
    my: "အီးမေးလ် မရှိပါ",
    zh: "暂无邮箱",
  },
  profileStatusVerified: { ko: "인증 완료", my: "အတည်ပြုပြီး", zh: "已验证" },
  profileStatusNotVerified: {
    ko: "미인증",
    my: "အတည်မပြုရသေး",
    zh: "未验证",
  },
  profileStatusRequested: {
    ko: "요청됨",
    my: "တောင်းဆိုထားသည်",
    zh: "已请求",
  },
  profileVerifiedHint: {
    ko: "이미 인증이 완료되었습니다.",
    my: "အတည်ပြုခြင်း ပြီးစီးပြီးဖြစ်သည်။",
    zh: "已完成验证。",
  },
  facebookVerification: {
    ko: "Facebook verification",
    my: "Facebook verification",
    zh: "Facebook verification",
  },
  facebookLinkIntro: {
    ko: "Link your Facebook account with a verified access token and profile URL.",
    my: "Link your Facebook account with a verified access token and profile URL.",
    zh: "Link your Facebook account with a verified access token and profile URL.",
  },
  facebookOAuthButton: {
    ko: "Continue with Facebook",
    my: "Continue with Facebook",
    zh: "Continue with Facebook",
  },
  facebookManualTokenHint: {
    ko: "OAuth fills the access token automatically. You can also paste a token manually.",
    my: "OAuth fills the access token automatically. You can also paste a token manually.",
    zh: "OAuth fills the access token automatically. You can also paste a token manually.",
  },
  facebookAccessTokenPlaceholder: {
    ko: "Facebook access token",
    my: "Facebook access token",
    zh: "Facebook access token",
  },
  facebookProfileUrlPlaceholder: {
    ko: "Facebook profile URL",
    my: "Facebook profile URL",
    zh: "Facebook profile URL",
  },
  facebookLinkAccount: {
    ko: "Link Facebook account",
    my: "Link Facebook account",
    zh: "Link Facebook account",
  },
  facebookLinkedSuccess: {
    ko: "Facebook account linked successfully.",
    my: "Facebook account linked successfully.",
    zh: "Facebook account linked successfully.",
  },
  facebookOAuthTokenReceived: {
    ko: "Facebook token received. Review the profile URL, then link your account.",
    my: "Facebook token received. Review the profile URL, then link your account.",
    zh: "Facebook token received. Review the profile URL, then link your account.",
  },
  facebookMissingAppId: {
    ko: "Set EXPO_PUBLIC_FACEBOOK_APP_ID before using Facebook OAuth.",
    my: "Set EXPO_PUBLIC_FACEBOOK_APP_ID before using Facebook OAuth.",
    zh: "Set EXPO_PUBLIC_FACEBOOK_APP_ID before using Facebook OAuth.",
  },
  facebookMissingPageUrl: {
    ko: "Set EXPO_PUBLIC_FACEBOOK_PAGE_URL before submitting follow proof.",
    my: "Set EXPO_PUBLIC_FACEBOOK_PAGE_URL before submitting follow proof.",
    zh: "Set EXPO_PUBLIC_FACEBOOK_PAGE_URL before submitting follow proof.",
  },
  facebookLinkRequired: {
    ko: "Facebook access token and profile URL are required.",
    my: "Facebook access token and profile URL are required.",
    zh: "Facebook access token and profile URL are required.",
  },
  facebookNameLabel: {
    ko: "Facebook name",
    my: "Facebook name",
    zh: "Facebook name",
  },
  facebookOpenProfile: {
    ko: "Open Facebook profile",
    my: "Open Facebook profile",
    zh: "Open Facebook profile",
  },
  facebookFollowProof: {
    ko: "Facebook follow proof",
    my: "Facebook follow proof",
    zh: "Facebook follow proof",
  },
  facebookFollowIntro: {
    ko: "Submit your Facebook follow screenshot for manual admin review.",
    my: "Submit your Facebook follow screenshot for manual admin review.",
    zh: "Submit your Facebook follow screenshot for manual admin review.",
  },
  facebookNamePlaceholder: {
    ko: "Your Facebook name",
    my: "Your Facebook name",
    zh: "Your Facebook name",
  },
  facebookPageUrlPlaceholder: {
    ko: "Facebook page URL you followed",
    my: "Facebook page URL you followed",
    zh: "Facebook page URL you followed",
  },
  facebookScreenshotButton: {
    ko: "Choose follow screenshot",
    my: "Choose follow screenshot",
    zh: "Choose follow screenshot",
  },
  facebookScreenshotSelected: {
    ko: "Screenshot selected",
    my: "Screenshot selected",
    zh: "Screenshot selected",
  },
  facebookSubmitFollowProof: {
    ko: "Submit follow proof",
    my: "Submit follow proof",
    zh: "Submit follow proof",
  },
  facebookFollowSubmitted: {
    ko: "Facebook follow proof submitted for review.",
    my: "Facebook follow proof submitted for review.",
    zh: "Facebook follow proof submitted for review.",
  },
  facebookFollowRequired: {
    ko: "Link Facebook first, then choose a follow screenshot.",
    my: "Link Facebook first, then choose a follow screenshot.",
    zh: "Link Facebook first, then choose a follow screenshot.",
  },
  facebookFollowLatestStatus: {
    ko: "Latest follow review",
    my: "Latest follow review",
    zh: "Latest follow review",
  },
  facebookFollowNoSubmission: {
    ko: "No submission yet",
    my: "No submission yet",
    zh: "No submission yet",
  },
  facebookOpenPage: {
    ko: "Open followed page",
    my: "Open followed page",
    zh: "Open followed page",
  },
  facebookFollowAdminNote: {
    ko: "Admin note",
    my: "Admin note",
    zh: "Admin note",
  },
  rewardMyProfile: {
    ko: "내 프로필",
    my: "ကျွန်ုပ်၏ ပရိုဖိုင်",
    zh: "我的资料",
  },
  rewardMyPoints: {
    ko: "내 포인트",
    my: "ကျွန်ုပ်၏ ပွိုင့်",
    zh: "我的积分",
  },
  rewardCashoutHint: {
    ko: "5,000 포인트부터 현금 인출이 가능합니다.",
    my: "ပွိုင့် ၅,၀၀၀ မှ စတင်၍ ငွေသားထုတ်ယူနိုင်ပါသည်။",
    zh: "积分满 5,000 起可申请提现吗。",
  },
  rewardWithdrawalAmount: {
    ko: "인출 금액",
    my: "ထုတ်ယူမည့် ပမာဏ",
    zh: "提现金额",
  },
  rewardWithdrawalPlaceholder: {
    ko: "금액을 입력하세요",
    my: "ပမာဏကို ထည့်ပါ",
    zh: "请输入金额",
  },
  rewardRequestWithdrawal: {
    ko: "인출 요청",
    my: "ထုတ်ယူရန် တောင်းဆိုမည်",
    zh: "申请提现",
  },
  rewardTransactionStats: {
    ko: "거래 통계",
    my: "ငွေလဲလှယ်မှု စာရင်းအင်း",
    zh: "交易统计",
  },
  rewardTotalTransactions: {
    ko: "총 거래 수",
    my: "စုစုပေါင်း လုပ်ဆောင်မှု အရေအတွက်",
    zh: "交易总数",
  },
  rewardCompletedSales: {
    ko: "판매 완료",
    my: "ရောင်းပြီး (ပြီးစီး)",
    zh: "已完成销售",
  },
  rewardCompletedPurchases: {
    ko: "구매 완료",
    my: "ဝယ်ပြီး (ပြီးစီး)",
    zh: "已完成购买",
  },
  rewardRankSystem: {
    ko: "회원 등급 체계",
    my: "အသင်းဝင်အဆင့် စနစ်",
    zh: "会员等级体系",
  },
  rewardRankLadderUnavailable: {
    ko: "등급 정보를 불러오지 못했습니다. 아래로 당겨 새로고침하세요.",
    my: "အဆင့်အချက်အလက် မရရှိပါ။ အောက်သို့ ဆွဲပြီး ပြန်လည်စတင်ပါ။",
    zh: "无法加载等级说明，请下拉刷新。",
  },
  rewardCurrentRank: {
    ko: "현재 등급",
    my: "လက်ရှိ အဆင့်",
    zh: "当前等级",
  },
  rewardNextRank: {
    ko: "다음 등급",
    my: "နောက် အဆင့်",
    zh: "下一等级",
  },
  rewardAvailablePoints: {
    ko: "인출 가능 포인트",
    my: "ထုတ်ယူနိုင်သော ပွိုင့်",
    zh: "可提现积分",
  },
  rewardPendingWithdrawal: {
    ko: "인출 대기",
    my: "ထုတ်ယူရန် စောင့်ဆိုင်းနေသည်",
    zh: "待处理提现",
  },
  rewardWithdrawalHistory: {
    ko: "인출 내역",
    my: "ထုတ်ယူမှု မှတ်တမ်း",
    zh: "提现记录",
  },
  rewardNoWithdrawals: {
    ko: "아직 인출 요청이 없습니다.",
    my: "ထုတ်ယူရန် တောင်းဆိုမှု မရှိသေးပါ။",
    zh: "暂无提现申请。",
  },
  rewardWithdrawalRequested: {
    ko: "인출 요청이 제출되었습니다.",
    my: "ထုတ်ယူရန် တောင်းဆိုမှုကို တင်ပြပြီးပါပြီ။",
    zh: "提现申请已提交。",
  },
  rewardWithdrawalKbzRequired: {
    ko: "인출 요청 전에 KBZPay 인증을 완료하세요.",
    my: "ထုတ်ယူရန် မတောင်းဆိုမီ KBZPay ကို အတည်ပြုပါ။",
    zh: "申请提现前请先完成 KBZPay 验证。",
  },
  rewardWithdrawalMin: {
    ko: "현금 인출을 요청하려면 인출 가능 포인트가 최소 5,000 이상이어야 합니다.",
    my: "ငွေသားထုတ်ယူရန် အနည်းဆုံး ထုတ်ယူနိုင်သော ပွိုင့် ၅,၀၀၀ လိုအပ်သည်။",
    zh: "申请提现需要至少 5,000 可提现积分。",
  },
  rewardWithdrawalAmountRequired: {
    ko: "인출 금액을 입력하세요.",
    my: "ထုတ်ယူမည့် ပမာဏကို ထည့်ပါ။",
    zh: "请输入提现金额。",
  },
  rewardWithdrawalAmountTooHigh: {
    ko: "인출 금액은 인출 가능 포인트를 초과할 수 없습니다.",
    my: "ပမာဏသည် ထုတ်ယူနိုင်သော ပွိုင့်ထက် မကျော်လွန်ရပါ။",
    zh: "金额不能超过可提现积分。",
  },
  rewardWithdrawalFailed: {
    ko: "인출 요청에 실패했습니다. 다시 시도하세요.",
    my: "ထုတ်ယူရန် တောင်းဆိုမှု မအောင်မြင်ပါ။ ထပ်မံကြိုးစားပါ။",
    zh: "提现申请失败，请重试。",
  },
  rewardRetry: {
    ko: "다시 시도",
    my: "ထပ်ကြိုးစားမည်",
    zh: "重试",
  },
  rewardMaxRank: {
    ko: "최고 등급 도달",
    my: "အမြင့်ဆုံး အဆင့်သို့ ရောက်ရှိပြီး",
    zh: "已达到最高等级",
  },
  rewardPointsToNext: {
    ko: "포인트 남음 (다음 등급까지)",
    my: "နောက်အဆင့်သို့ ရောက်ရန် လိုအပ်သော ပွိုင့်",
    zh: "距离下一等级还差积分",
  },
  signOutButton: { ko: "로그아웃", my: "ထွက်မည်", zh: "退出登录" },
  tabsHome: { ko: "홈", my: "ပင်မ", zh: "首页" },
  tabsProducts: { ko: "상품", my: "ပစ္စည်းများ", zh: "商品" },
  tabsExplore: { ko: "탐색", my: "စူးစမ်း", zh: "探索" },
  tabsProfile: { ko: "프로필", my: "ပရိုဖိုင်", zh: "个人资料" },
  tabsNotifications: { ko: "알림", my: "အသိပေးချက်", zh: "通知" },
  tabsChats: { ko: "채팅", my: "ချတ်", zh: "聊天" },
  chatInboxTitle: { ko: "채팅함", my: "ချတ်စာများ", zh: "聊天收件箱" },
  chatInboxSubtitle: {
    ko: "구매·판매 대화를 한곳에서 확인하세요. 판매자는 구매자가 첫 메시지를 보낸 뒤에만 알림을 받습니다.",
    my: "ဝယ်ယူမှု/ရောင်းချမှု စကားပြောများကို တစ်နေရာတည်းတွင် ကြည့်ပါ။ ရောင်းသူသည် ဝယ်သူ ပထမမက်ဆေ့ပို့မှသာ အကြောင်းကြားချက် ရမည်။",
    zh: "在此查看所有买卖对话。卖家仅在买家发送第一条消息后才会收到通知。",
  },
  chatInboxEmpty: {
    ko: "아직 대화가 없습니다.",
    my: "စကားပြောခန်း မရှိသေးပါ။",
    zh: "暂无聊天。",
  },
  chatInboxEmptyHint: {
    ko: "상품 상세에서 판매자에게 메시지를 내면 여기에 표시됩니다.",
    my: "ကုန်ပစ္စည်း အသေးစိတ်မှ ရောင်းသူထံ စာပို့ပါက ဤနေရာတွင် ပေါ်လာမည်။",
    zh: "在商品详情页联系卖家后，对话会显示在这里。",
  },
  chatNoMessagesYet: {
    ko: "메시지 없음",
    my: "မက်ဆေ့ချ် မရှိသေး",
    zh: "暂无消息",
  },
  chatTapToStart: {
    ko: "탭하여 대화 시작",
    my: "နှိပ်ပြီး စကားပြောစတင်ပါ",
    zh: "点击开始聊天",
  },
  chatListingFallback: { ko: "상품", my: "ကုန်ပစ္စည်း", zh: "商品" },
  chatSellerFallback: { ko: "판매자", my: "ရောင်းသူ", zh: "卖家" },
  chatBuyerFallback: { ko: "구매자", my: "ဝယ်သူ", zh: "买家" },
  chatOpeningRoom: {
    ko: "채팅방을 여는 중…",
    my: "ချတ်ခန်း ဖွင့်နေသည်…",
    zh: "正在打开聊天室…",
  },
  chatOpenRoomFailed: {
    ko: "채팅방을 열지 못했습니다.",
    my: "ချတ်ခန်း ဖွင့်၍ မရပါ။",
    zh: "无法打开聊天室。",
  },
  chatMissingListing: {
    ko: "상품 정보가 없어 채팅을 시작할 수 없습니다.",
    my: "ကုန်ပစ္စည်း အချက်အလက် မရှိသောကြောင့် ချတ်မစတင်နိုင်ပါ။",
    zh: "缺少商品信息，无法开始聊天。",
  },
  chatRetry: { ko: "다시 시도", my: "ပြန်ကြိုးစားမည်", zh: "重试" },
  chatInboxLoadFailed: {
    ko: "채팅 목록을 불러오지 못했습니다.",
    my: "ချတ်စာရင်း ရယူ၍ မရပါ။",
    zh: "无法加载聊天列表。",
  },
  chatLoadingOlder: {
    ko: "이전 메시지 불러오는 중…",
    my: "အရင်မက်ဆေ့ချ်များ ရယူနေသည်…",
    zh: "正在加载更早的消息…",
  },
  chatThreadEmpty: {
    ko: "이 상품에 대해 궁금한 점을 물어보세요.",
    my: "ဤကုန်ပစ္စည်းအကြောင်း မေးမြန်းရန် မင်္ဂလာပါ ပြောပါ။",
    zh: "打个招呼，问问这件商品吧。",
  },
  chatInputPlaceholder: {
    ko: "메시지 입력…",
    my: "မက်ဆေ့ချ် ရိုက်ထည့်ပါ…",
    zh: "输入消息…",
  },
  chatSystemMessage: {
    ko: "시스템 메시지",
    my: "စနစ်မက်ဆေ့ချ်",
    zh: "系统消息",
  },
  chatSystemDirectTradeRequested: {
    ko: "직거래 요청",
    my: "တိုက်ရိုက်တွေ့ဆုံ တောင်းဆိုချက်",
    zh: "当面交易请求",
  },
  chatSystemDirectTradeLocationAccepted: {
    ko: "만남 장소 확정",
    my: "တွေ့ဆုံမည့် နေရာ အတည်ပြုပြီး",
    zh: "见面地点已确认",
  },
  chatSystemDirectTradeLocationChangeRequested: {
    ko: "장소 변경 요청",
    my: "နေရာပြောင်းရန် တောင်းဆိုချက်",
    zh: "请求更改地点",
  },
  chatSystemDirectTradeLocationChangeDenied: {
    ko: "장소 변경 거절",
    my: "နေရာပြောင်းရန် ငြင်းပယ်",
    zh: "已拒绝更改地点",
  },
  chatSystemSafePaymentRequested: {
    ko: "안전결제 요청",
    my: "လုံခြုံငွေပေးချေမှု တောင်းဆိုမှု",
    zh: "担保支付请求",
  },
  chatSystemSafePaymentInstructionSent: {
    ko: "결제 안내 발송",
    my: "ငွေပေးချေမှု ညွှန်ကြားချက် ပို့ပြီး",
    zh: "已发送付款指引",
  },
  chatSystemSafePaymentInitiated: {
    ko: "안전결제 진행 시작",
    my: "လုံခြုံငွေပေးချေမှု စတင်ပြီး",
    zh: "担保支付已开始",
  },
  chatSystemSafePaymentVerified: {
    ko: "결제 확인됨",
    my: "ငွေပေးချေမှု အတည်ပြုပြီး",
    zh: "付款已确认",
  },
  chatSystemSafePaymentTransferred: {
    ko: "대금 이체 완료",
    my: "ငွေလွှဲပြီးပါပြီ",
    zh: "已完成转账",
  },
  chatSystemTransactionCompleted: {
    ko: "거래 완료",
    my: "အရောင်းအဝယ် ပြီးစီးပြီး",
    zh: "交易已完成",
  },
  chatTradeTools: {
    ko: "거래 도구",
    my: "ကုန်သွယ်မှုကိရိယာ",
    zh: "交易工具",
  },
  chatOpenLiveMap: {
    ko: "지도 열기",
    my: "မြေပုံ ဖွင့်မည်",
    zh: "打开地图",
  },
  chatMapNoLocations: {
    ko: "공유 중인 위치가 없습니다. 위치 공유를 시작해 주세요.",
    my: "မျှဝေထားသော တည်နေရာ မရှိသေးပါ။ တည်နေရာမျှဝေမှု စတင်ပါ။",
    zh: "暂无共享位置，请先开始位置共享。",
  },
  chatDirectTradeButton: {
    ko: "직거래",
    my: "တိုက်ရိုက်တွေ့ဆုံ",
    zh: "当面交易",
  },
  chatDirectTradeTitle: {
    ko: "직거래 일정 설정",
    my: "တိုက်ရိုက်တွေ့ဆုံ အချိန်သတ်မှတ်",
    zh: "设置当面交易",
  },
  chatDirectTradeSave: {
    ko: "직거래 요청 저장",
    my: "တိုက်ရိုက်တွေ့ဆုံ တောင်းဆိုချက် သိမ်းမည်",
    zh: "保存当面交易请求",
  },
  chatDirectTradeValidation: {
    ko: "날짜와 시간을 입력해주세요.",
    my: "ရက်စွဲနှင့် အချိန်ကို ဖြည့်ပါ။",
    zh: "请填写日期和时间。",
  },
  chatDirectTradeSaved: {
    ko: "직거래 일정이 업데이트되었습니다.",
    my: "တိုက်ရိုက်တွေ့ဆုံ အချက်အလက်ကို ပြင်ပြီးပါပြီ။",
    zh: "当面交易信息已更新。",
  },
  chatDirectTradeFailed: {
    ko: "직거래 요청에 실패했습니다.",
    my: "တိုက်ရိုက်တွေ့ဆုံ တောင်းဆိုမှု မအောင်မြင်ပါ။",
    zh: "提交当面交易失败。",
  },
  chatDirectTradeNeedStartFirst: {
    ko: "먼저 만남 날짜와 시간을 설정해 주세요.",
    my: "ဦးစွာ တွေ့ဆုံမည့် ရက်စွဲနှင့် အချိန်ကို သတ်မှတ်ပါ။",
    zh: "请先设置见面日期和时间。",
  },
  chatDirectTradeBuyerOnly: {
    ko: "구매자만 이용할 수 있습니다.",
    my: "ဝယ်သူသာ လုပ်ဆောင်နိုင်ပါသည်။",
    zh: "仅买家可操作。",
  },
  chatDirectTradeSellerOnly: {
    ko: "판매자만 이용할 수 있습니다.",
    my: "ရောင်းသူသာ လုပ်ဆောင်နိုင်ပါသည်။",
    zh: "仅卖家可操作。",
  },
  chatDirectTradeOpsMessageTypeIssue: {
    ko: "서버 메시지 유형(MessageType) 설정 오류입니다. 고객 지원에 문의해 주세요.",
    my: "ဆာဗာ မက်ဆေ့ချ် အမျိုးအစား (MessageType) ပြင်ဆင်မှု ပြဿနာရှိပါသည်။ အကူအညီဌာနကို ဆက်သွယ်ပါ။",
    zh: "服务器消息类型（MessageType）配置异常，请联系客服。",
  },
  chatDirectTradeChooseListingFirst: {
    ko: "먼저 목록에 있는 만남 장소를 선택해 주세요.",
    my: "ဦးစွာ စာရင်းထဲမှ တွေ့ဆုံမည့် နေရာကို ရွေးချယ်ပါ။",
    zh: "请先选择列表中的见面地点。",
  },
  chatDirectTradeAlreadyListingUsePicker: {
    ko: "이미 목록에 있는 장소입니다. 장소 선택 화면을 이용해 주세요.",
    my: "ဤနေရာသည် စာရင်းထဲတွင် ရှိပြီးသား နေရာဖြစ်ပါသည်။ နေရာရွေးချယ်မှု မျက်နှာပြင်ကို သုံးပါ။",
    zh: "该地点已在列表中，请使用地点选择器。",
  },
  chatDirectTradePendingChangeExists: {
    ko: "이미 장소 변경 요청이 진행 중입니다.",
    my: "နေရာပြောင်းရန် တောင်းဆိုမှု တစ်ခု ဆိုင်းငံ့နေပြီးဖြစ်ပါသည်။",
    zh: "已有地点更改请求待处理。",
  },
  chatDirectTradeGpsRequiresAgreed: {
    ko: "먼저 만남 장소에 합의하고, 진행 중인 변경 요청이 없어야 합니다.",
    my: "ဦးစွာ တွေ့ဆုံမည့် နေရာကို သဘောတူပြီးမှ သုံးပါ (နေရာပြောင်းတောင်းဆိုမှု မဆိုင်းငံ့ရသေးရ)။",
    zh: "请先约定见面地点，且不能有进行中的地点更改请求。",
  },
  chatActiveDealBlockedTitle: {
    ko: "진행 거래 미선택",
    my: "လက်ရှိ ချုပ်ဆိုမှု မဟုတ်",
    zh: "非进行中交易",
  },
  chatActiveDealBlockedMessage: {
    ko: "판매자가 다른 구매자를 선택했습니다. 채팅은 계속할 수 있지만 거래 관련 기능은 사용할 수 없습니다. 이 채팅이 진행 중인 거래여야 한다면 판매자에게 문의하세요.",
    my: "ရောင်းသူက အခြား ဝယ်သူတစ်ဦးကို ရွေးချယ်ထားပါသည်။ ချတ်ဆက်လက်လုပ်နိုင်သော်လုံး ချုပ်ဆိုမှု လုပ်ဆောင်ချက်များ မစတင်နိုင်ပါ။ ဤချတ်သည် လက်ရှိ ချုပ်ဆိုမှု ဖြစ်သင့်လျှင် ရောင်းသူကို ဆက်သွယ်ပါ။",
    zh: "卖家已选择其他买家。您仍可聊天，但无法发起交易相关操作。若本聊天应为进行中的交易，请联系卖家。",
  },
  chatActiveDealSellerProductNote: {
    ko: "판매자는 내 판매글 상세에서 구매자를 선택할 수 있어요. 여기서도 이 구매자를 선택할 수 있습니다.",
    my: "ရောင်းသူသည် မိမိ၏ ရောင်းချမှုစာမျက်နှာ အသေးစိတ်တွင် ဝယ်သူကို ရွေးချယ်နိုင်ပါသည်။ ဤနေရာတွင်လည်း ဤဝယ်သူကို ရွေးချယ်နိုင်ပါသည်။",
    zh: "卖家可在“我的商品详情”中选择买家，你也可以在这里选择该买家。",
  },
  chatActiveDealBuyerProductNote: {
    ko: "판매자가 상품 상세 화면에서 진행 중인 구매자를 선택합니다.",
    my: "ရောင်းသူသည် ပစ္စည်းအသေးစိတ် မျက်နှာပြင်မှ လက်ရှိ ဝယ်သူကို ရွေးချယ်ပါသည်။",
    zh: "卖家会在商品详情页选择当前进行中的买家。",
  },
  chatActiveDealSelectThisBuyer: {
    ko: "이 구매자 선택",
    my: "ဤဝယ်သူကို ရွေးချယ်မည်",
    zh: "选择该买家",
  },
  chatActiveDealDismiss: {
    ko: "OK",
    my: "OK",
    zh: "OK",
  },
  chatDirectTradeRequestTitle: {
    ko: "직거래 요청",
    my: "တိုက်ရိုက်တွေ့ဆုံရန် တောင်းဆိုချက်",
    zh: "当面交易请求",
  },
  chatDirectTradeRequestDate: {
    ko: "만남 날짜",
    my: "တွေ့မည့်ရက်",
    zh: "见面日期",
  },
  chatDirectTradeRequestTime: {
    ko: "만남 시간",
    my: "တွေ့မည့်အချိန်",
    zh: "见面时间",
  },
  chatDirectTradeRequestLocation: {
    ko: "만남 장소",
    my: "တွေ့မည့်နေရာ",
    zh: "见面地点",
  },
  chatDirectTradeRequestNoLocation: {
    ko: "약속된 장소 없음",
    my: "သတ်မှတ်ထားသော နေရာ မရှိပါ",
    zh: "未指定地点",
  },
  chatDirectTradePickLocation: {
    ko: "만남 장소 선택",
    my: "တွေ့ဆုံရန် နေရာ ရွေးချယ်ပါ",
    zh: "选择见面地点",
  },
  chatDirectTradeNoLocations: {
    ko: "등록된 만남 장소가 없습니다.",
    my: "တွေ့ဆုံရန် နေရာ မရှိပါ။",
    zh: "暂无登记的见面地点。",
  },
  chatDirectTradeRequestOtherPlace: {
    ko: "다른 장소 제안하기",
    my: "အခြားနေရာ အဆိုပြုရန်",
    zh: "提议其他地点",
  },
  chatDirectTradeRequestChangeSubmit: {
    ko: "장소 변경 요청",
    my: "နေရာပြောင်းရန် တောင်းဆိုမည်",
    zh: "请求更改地点",
  },
  chatUseCurrentLocation: {
    ko: "현지 위치 사용",
    my: "လက်ရှိတည်နေရာ သုံးမည်",
    zh: "使用当前位置",
  },
  chatGpsError: {
    ko: "위치를 가져올 수 없습니다. 다시 시도해 주세요.",
    my: "တည်နေရာ ရယူ၍မရပါ။ ထပ်စမ်းပါ။",
    zh: "无法获取位置，请重试。",
  },
  chatDirectTradeChangeLocation: {
    ko: "장소 변경",
    my: "နေရာ ပြောင်းရန်",
    zh: "更改地点",
  },
  chatDirectTradeLocationLabel: {
    ko: "약속 장소",
    my: "တွေ့ဆုံမည့် နေရာ",
    zh: "约定地点",
  },
  chatDirectTradeAwaitingLocation: {
    ko: "구매자가 장소를 선택할 때까지 기다리는 중...",
    my: "ဝယ်သူ နေရာရွေးရန် စောင့်ဆိုင်းနေသည်...",
    zh: "等待买家选择地点...",
  },
  chatDirectTradeAwaitingDetails: {
    ko: "직거래 정보를 불러오는 중...",
    my: "တိုက်ရိုက်တွေ့ဆုံ အချက်အလက် ရယူနေသည်...",
    zh: "正在加载当面交易信息...",
  },
  chatDirectTradePendingChange: {
    ko: "장소 변경 요청 있음",
    my: "နေရာပြောင်းရန် တောင်းဆိုမှု ရှိသည်",
    zh: "有地点更改请求",
  },
  chatDirectTradePendingSeller: {
    ko: "판매자의 응답을 기다리는 중...",
    my: "ရောင်းသူ၏ အကြောင်းပြန်ချက်ကို စောင့်ဆိုင်းနေသည်...",
    zh: "等待卖家回复...",
  },
  chatDirectTradeLocationRequestPending: {
    ko: "장소 변경 요청이 판매자 확인을 기다리는 중입니다.",
    my: "နေရာပြောင်းရန် တောင်းဆိုမှု ရောင်းသူ အတည်ပြုချက်ကို စောင့်နေသည်။",
    zh: "地点更改请求待卖家确认。",
  },
  chatDirectTradeAccept: {
    ko: "수락",
    my: "လက်ခံမည်",
    zh: "接受",
  },
  chatDirectTradeDeny: {
    ko: "거절",
    my: "ငြင်းပယ်မည်",
    zh: "拒绝",
  },
  chatDirectTradeLocationAccepted: {
    ko: "만남 장소가 확정되었습니다",
    my: "တွေ့ဆုံရန် နေရာ သတ်မှတ်ပြီးပါပြီ",
    zh: "见面地点已确认",
  },
  chatDirectTradeLocationDenied: {
    ko: "장소 변경이 거절되었습니다",
    my: "နေရာပြောင်းလဲမှု ငြင်းပယ်ခံရပါသည်",
    zh: "地点更改已被拒绝",
  },
  chatDirectTradeLocationChangeRequested: {
    ko: "장소 변경이 요청되었습니다",
    my: "နေရာပြောင်းရန် တောင်းဆိုထားပါသည်",
    zh: "已请求更改地点",
  },
  chatSafePaymentButton: {
    ko: "안전결제",
    my: "လုံခြုံငွေပေးချေမှု",
    zh: "担保支付",
  },
  chatSafePaymentTitle: {
    ko: "안전결제",
    my: "လုံခြုံငွေပေးချေမှု",
    zh: "担保支付",
  },
  chatSafePaymentBuyerOnly: {
    ko: "안전결제 요청과 제출은 구매자만 가능합니다.",
    my: "လုံခြုံငွေပေးချေမှုကို ဝယ်သူသာ တောင်းဆို/တင်ပြနိုင်ပါသည်။",
    zh: "仅买家可以请求或提交担保支付。",
  },
  chatSafePaymentStatusLabel: {
    ko: "현재 상태",
    my: "လက်ရှိအခြေအနေ",
    zh: "当前状态",
  },
  chatSafePaymentRequestHint: {
    ko: "안전결제를 요청하면 관리자가 KBZ 수취 번호를 안내합니다.",
    my: "လုံခြုံငွေပေးချေမှု တောင်းဆိုပြီးနောက် Admin က KBZ လက်ခံနံပါတ် ပေးပို့ပါမည်။",
    zh: "请求担保支付后，管理员会发送 KBZ 收款号码。",
  },
  chatSafePaymentRequest: {
    ko: "안전결제 요청",
    my: "လုံခြုံငွေပေးချေမှု တောင်းဆိုမည်",
    zh: "请求担保支付",
  },
  chatSafePaymentRequestSuccess: {
    ko: "안전결제를 요청했습니다. 관리자 안내를 기다려주세요.",
    my: "လုံခြုံငွေပေးချေမှု တောင်းဆိုပြီးပါပြီ။ Admin ညွှန်ကြားချက်ကို စောင့်ပါ။",
    zh: "担保支付请求已发送，请等待管理员指引。",
  },
  chatSafePaymentLoadFailed: {
    ko: "안전결제 정보를 불러오지 못했습니다.",
    my: "လုံခြုံငွေပေးချေမှု အချက်အလက် မရယူနိုင်ပါ။",
    zh: "加载担保支付信息失败。",
  },
  chatSafePaymentNoInstruction: {
    ko: "관리자 안내 대기 중",
    my: "Admin ညွှန်ကြားချက် စောင့်ဆိုင်းနေသည်",
    zh: "等待管理员指引",
  },
  chatSafePaymentInstructionPhone: {
    ko: "관리자 수취 번호",
    my: "Admin လက်ခံဖုန်းနံပါတ်",
    zh: "管理员收款号码",
  },
  chatSafePaymentInstructionSentAt: {
    ko: "안내 발송 시각",
    my: "ညွှန်ကြားချက် ပို့ချိန်",
    zh: "指引发送时间",
  },
  chatSafePaymentInstructionNote: {
    ko: "관리자 메모",
    my: "Admin မှတ်ချက်",
    zh: "管理员备注",
  },
  chatSafePaymentFormName: {
    ko: "송금자 KBZ 이름",
    my: "ပေးချေသူ KBZ အမည်",
    zh: "付款人 KBZ 姓名",
  },
  chatSafePaymentFormPhone: {
    ko: "송금자 KBZ 전화번호",
    my: "ပေးချေသူ KBZ ဖုန်း",
    zh: "付款人 KBZ 手机号",
  },
  chatSafePaymentFormAmount: {
    ko: "결제 금액 (MMK)",
    my: "ငွေပေးချေမှုပမာဏ (MMK)",
    zh: "支付金额 (MMK)",
  },
  chatSafePaymentFormTxnId: {
    ko: "KBZ 거래 ID",
    my: "KBZ လုပ်ဆောင်မှု ID",
    zh: "KBZ 交易号",
  },
  chatSafePaymentSubmit: {
    ko: "결제 정보 제출",
    my: "ငွေပေးချေမှု အချက်အလက် တင်ပြမည်",
    zh: "提交支付信息",
  },
  chatSafePaymentValidation: {
    ko: "이름, 전화번호, 금액, 거래 ID를 모두 입력해주세요.",
    my: "အမည်၊ ဖုန်း၊ ငွေပမာဏနှင့် လုပ်ဆောင်မှု ID ကို အပြည့်အစုံ ဖြည့်ပါ။",
    zh: "请完整填写姓名、手机号、金额和交易号。",
  },
  chatSafePaymentAmountMismatch: {
    ko: "결제 금액이 거래 금액과 일치하지 않습니다. 정확한 금액을 입력해주세요.",
    my: "ငွေပမာဏသည် ကုန်သွယ်မှုပမာဏနှင့် မကိုက်ညီပါ။ မှန်ကန်သောပမာဏကို ထည့်ပါ။",
    zh: "支付金额与交易金额不匹配，请输入正确的金额。",
  },
  chatSafePaymentSubmitSuccess: {
    ko: "결제 정보를 제출했습니다. 관리자 확인을 기다려주세요.",
    my: "ငွေပေးချေမှုအချက်အလက် တင်ပြပြီးပါပြီ။ Admin အတည်ပြုချက်ကို စောင့်ပါ။",
    zh: "支付信息已提交，请等待管理员确认。",
  },
  chatCompleteTradeButton: {
    ko: "완료/취소/리뷰",
    my: "ပြီးစီး/ပယ်ဖျက်/သုံးသပ်ချက်",
    zh: "完成/取消/评价",
  },
  chatCompleteTradeTitle: {
    ko: "거래 완료 확인",
    my: "အရောင်းအဝယ် ပြီးစီးကြောင်း အတည်ပြု",
    zh: "确认交易完成",
  },
  chatCompleteTradeStatus: {
    ko: "거래 상태",
    my: "အရောင်းအဝယ် အခြေအနေ",
    zh: "交易状态",
  },
  chatCompleteTradeHint: {
    ko: "양측이 완료를 누르면 거래 상태가 COMPLETED가 됩니다.",
    my: "နှစ်ဖက်စလုံး ပြီးစီးကြောင်း အတည်ပြုပါက အခြေအနေ COMPLETED သို့ ရောက်မည်။",
    zh: "买卖双方都确认后，交易状态会变为 COMPLETED。",
  },
  chatCompleteTradeModalGuide: {
    ko: "이 화면에서 거래를 완료하거나 취소할 수 있습니다. 취소 시 20포인트가 차감됩니다. 안전결제가 이미 시작된 경우 취소할 수 없습니다.",
    my: "ဤမျက်နှာပြင်တွင် အရောင်းအဝယ်ကို ပြီးစီးအောင်လုပ်ခြင်း သို့မဟုတ် ပယ်ဖျက်နိုင်ပါသည်။ ပယ်ဖျက်ပါက ပွိုင့် 20 လျှော့ယူမည်။ လုံခြုံငွေပေးချေမှု စတင်ပြီးပါက ပယ်ဖျက်၍မရပါ။",
    zh: "在此页面可完成或取消交易。取消将扣除 20 积分。若担保支付已开始，则不允许取消。",
  },  chatCompleteTradeAction: {
    ko: "거래 완료 표시",
    my: "အရောင်းအဝယ် ပြီးစီးကြောင်း မှတ်သားမည်",
    zh: "标记交易完成",
  },
  chatCompleteTradeSuccess: {
    ko: "거래 완료 상태를 업데이트했습니다.",
    my: "အရောင်းအဝယ် ပြီးစီးအခြေအနေကို အပ်ဒိတ်လုပ်ပြီးပါပြီ။",
    zh: "交易完成状态已更新。",
  },
  chatCompleteTradePendingBoth: {
    ko: "상대방의 완료 확인을 기다리는 중입니다.",
    my: "တစ်ဖက်ဖက်၏ ပြီးစီးအတည်ပြုချက်ကို စောင့်နေသည်။",
    zh: "正在等待对方确认完成。",
  },
  chatCompleteTradeUnavailable: {
    ko: "완료 가능한 거래를 찾지 못했습니다.",
    my: "ပြီးစီးမှတ်သားနိုင်သော အရောင်းအဝယ် မတွေ့ပါ။",
    zh: "未找到可完成的交易。",
  },
  chatCompleteTradeWaitAdminReceived: {
    ko: "관리자가 안전결제 입금 확인 후에만 완료할 수 있습니다.",
    my: "Admin က လုံခြုံငွေပေးချေမှု လက်ခံကြောင်း အတည်ပြုပြီးမှ ပြီးစီးနိုင်ပါသည်။",
    zh: "需管理员确认担保支付已收款后才能完成交易。",
  },
  chatCompleteTradeUseSafePaymentId: {
    ko: "안전결제가 시작된 거래입니다. 안전결제 거래 기준으로 완료를 진행하세요.",
    my: "လုံခြုံငွေပေးချေမှု စတင်ထားသော အရောင်းအဝယ်ဖြစ်သည်။ Safe payment 거래 ID ဖြင့် ပြီးစီးလုပ်ဆောင်ပါ။",
    zh: "该交易已进入担保支付流程，请使用担保支付交易继续完成。",
  },
  chatCompleteTradeAlreadyDone: {
    ko: "이 거래는 이미 안전결제로 완료되었습니다.",
    my: "ဤအရောင်းအဝယ်သည် လုံခြုံငွေပေးချေမှုဖြင့် ပြီးစီးပြီးဖြစ်သည်။",
    zh: "该交易已通过担保支付完成。",
  },
  chatCancelTradeTitle: {
    ko: "거래 취소",
    my: "အရောင်းအဝယ် ပယ်ဖျက်",
    zh: "取消交易",
  },
  chatCancelTradeAction: {
    ko: "거래 취소",
    my: "အရောင်းအဝယ် ပယ်ဖျက်",
    zh: "取消交易",
  },
  chatCancelTradeConfirm: {
    ko: "이 거래를 취소할까요? 계정에서 20포인트가 차감됩니다. 안전결제가 이미 시작된 경우 취소할 수 없습니다.",
    my: "ဤအရောင်းအဝယ်ကို ပယ်ဖျက်မလား။ သင့်အကောင့်မှ ပွိုင့် 20 လျှော့မည်။ လုံခြုံငွေပေးချေမှု စတင်ပြီးပါက ပယ်ဖျက်၍မရပါ။",
    zh: "要取消该交易吗？将从账户扣除 20 积分。若担保支付已发起，则不允许取消。",
  },
  chatCancelTradeSuccess: {
    ko: "거래가 취소되었습니다. 취소 수수료로 20포인트가 차감되었습니다.",
    my: "အရောင်းအဝယ်ကို ပယ်ဖျက်ပြီးပါပြီ။ ပယ်ဖျက်မှုအတွက် ပွိုင့် 20 လျှော့ယူခဲ့သည်။",
    zh: "交易已取消，已扣除 20 积分作为取消费用。",
  },
  chatCancelTradePenaltyNote: {
    ko: "취소됨. 취소 수수료로 20포인트 차감.",
    my: "ပယ်ဖျက်ပြီး။ ပယ်ဖျက်မှုအတွက် ပွိုင့် 20 လျှော့ယူထားသည်။",
    zh: "已取消，已扣除 20 积分作为取消费用。",
  },
  chatCancelTradeBlocked: {
    ko: "이 거래는 이미 완료되었거나 환불되어 취소할 수 없습니다.",
    my: "ဤအရောင်းအဝယ်သည် ပြီးစီးပြီး သို့မဟုတ် ပြန်အမ်းပြီးဖြစ်သဖြင့် ပယ်ဖျက်၍မရပါ။",
    zh: "该交易已完成或已退款，无法取消。",
  },
  chatCancelTradeSafePaymentBlocked: {
    ko: "결제 제출 후에는 안전결제를 취소할 수 없습니다.",
    my: "ငွေပေးချေမှု တင်ပြီးနောက် လုံခြုံငွေပေးချေမှုကို ပယ်ဖျက်၍မရပါ။",
    zh: "提交付款后无法取消担保支付。",
  },
  chatCancelTradeFailed: {
    ko: "거래를 취소하지 못했습니다. 다시 시도해 주세요.",
    my: "အရောင်းအဝယ်ကို ပယ်ဖျက်၍မရပါ။ ထပ်မံကြိုးစားပါ။",
    zh: "无法取消该交易，请重试。",
  },
  chatReviewTitle: {
    ko: "거래 리뷰",
    my: "အရောင်းအဝယ် သုံးသပ်ချက်",
    zh: "交易评价",
  },
  chatReviewHint: {
    ko: "거래가 완료되었습니다. 상대방을 평가해주세요.",
    my: "အရောင်းအဝယ် ပြီးစီးပြီးပါပြီ။ တစ်ဖက်ကို အကဲဖြတ်ပေးပါ။",
    zh: "交易已完成，请为对方评分。",
  },
  chatReviewStarsLabel: {
    ko: "별점 (1~5)",
    my: "ကြယ်ပွင့်အဆင့် (၁~၅)",
    zh: "评分（1~5）",
  },
  chatReviewCommentLabel: {
    ko: "리뷰 코멘트 (선택)",
    my: "သုံးသပ်ချက် (ရွေးချယ်နိုင်)",
    zh: "评价内容（可选）",
  },
  chatReviewCommentPlaceholder: {
    ko: "거래 후기를 입력하세요",
    my: "အရောင်းအဝယ် အတွေ့အကြုံကို ရေးပါ",
    zh: "填写交易反馈",
  },
  chatReviewSubmit: {
    ko: "리뷰 제출",
    my: "သုံးသပ်ချက် တင်ပြမည်",
    zh: "提交评价",
  },
  chatReviewValidation: {
    ko: "별점을 선택해주세요.",
    my: "ကြယ်ပွင့်အဆင့်ကို ရွေးပါ။",
    zh: "请选择评分。",
  },
  chatReviewSuccess: {
    ko: "리뷰를 제출했습니다.",
    my: "သုံးသပ်ချက်ကို တင်ပြပြီးပါပြီ။",
    zh: "评价已提交。",
  },
  chatReviewCompleteFirst: {
    ko: "먼저 거래를 완료해 주세요.",
    my: "ဦးစွာ အရောင်းအဝယ်ကို ပြီးစီးအောင် လုပ်ပါ။",
    zh: "请先完成交易。",
  },
  chatReviewUnlockedHelper: {
    ko: "지금 리뷰를 남길 수 있어요. 상대방은 거래를 완료한 뒤 리뷰를 남길 수 있습니다.",
    my: "ယခု သုံးသပ်ချက်ရေးနိုင်ပါပြီ။ တစ်ဖက်သူက အရောင်းအဝယ် ပြီးစီးပြီးမှ သုံးသပ်ချက်ရေးနိုင်ပါသည်။",
    zh: "你现在可以评价；对方在完成交易后才能评价。",
  },
  chatMeetingDateLabel: {
    ko: "만남 날짜",
    my: "တွေ့ဆုံမည့် ရက်စွဲ",
    zh: "见面日期",
  },
  chatMeetingTimeLabel: {
    ko: "만남 시간",
    my: "တွေ့ဆုံမည့် အချိန်",
    zh: "见面时间",
  },
  chatMeetingDatePlaceholder: {
    ko: "YYYY-MM-DD",
    my: "YYYY-MM-DD",
    zh: "YYYY-MM-DD",
  },
  chatMeetingTimePlaceholder: {
    ko: "HH:mm (24시간)",
    my: "HH:mm (၂၄ နာရီ)",
    zh: "HH:mm（24小时）",
  },
  dateTimePickerConfirm: {
    ko: "완료",
    my: "ပြီးပြီ",
    zh: "完成",
  },
  dateTimePickerCancel: {
    ko: "취소",
    my: "ပယ်ဖျက်",
    zh: "取消",
  },
  dateTimePickerSelectDate: {
    ko: "날짜 선택",
    my: "ရက်စွဲ ရွေးချယ်ရန်",
    zh: "选择日期",
  },
  dateTimePickerSelectTime: {
    ko: "시간 선택",
    my: "အချိန် ရွေးချယ်ရန်",
    zh: "选择时间",
  },
  chatMeetingDateInvalid: {
    ko: "날짜 형식이 올바르지 않습니다.",
    my: "ရက်စွဲ ပုံစံ မမှန်ပါ။",
    zh: "日期格式无效。",
  },
  chatMeetingTimeInvalid: {
    ko: "시간 형식이 올바르지 않습니다. (HH:mm)",
    my: "အချိန် ပုံစံ မမှန်ပါ။ (HH:mm)",
    zh: "时间格式无效（HH:mm）。",
  },
  chatMeetingCoordsPairRequired: {
    ko: "위도와 경도는 함께 입력해야 합니다.",
    my: "လတ္တီကျုနှင့် လောင်ဂျီကျု နှစ်ခုလုံး ထည့်ပါ။",
    zh: "纬度和经度需同时填写。",
  },
  chatMeetingCoordsInvalid: {
    ko: "위도(-90~90) 또는 경도(-180~180) 값이 올바르지 않습니다.",
    my: "လတ္တီကျု (-90~90) သို့မဟုတ် လောင်ဂျီကျု (-180~180) မမှန်ပါ။",
    zh: "纬度（-90~90）或经度（-180~180）无效。",
  },
  chatMeetingLocationPlaceholder: {
    ko: "만남 장소",
    my: "တွေ့ဆုံမည့် နေရာ",
    zh: "见面地点",
  },
  chatMeetingLatitudePlaceholder: {
    ko: "위도 (선택)",
    my: "လတ္တီကျု (မဖြစ်မနေ မဟုတ်)",
    zh: "纬度（可选）",
  },
  chatMeetingLongitudePlaceholder: {
    ko: "경도 (선택)",
    my: "လောင်ဂျီကျု (မဖြစ်မနေ မဟုတ်)",
    zh: "经度（可选）",
  },
  chatLocationRequiresDirectTrade: {
    ko: "실시간 위치는 직거래 일정을 저장한 후 사용할 수 있습니다.",
    my: "တိုက်ရိုက်တွေ့ဆုံမှု အချိန်သတ်မှတ်ပြီးမှ တိုက်ရိုက် တည်နေရာ မျှဝေနိုင်ပါသည်။",
    zh: "保存当面交易安排后可使用实时位置共享。",
  },
  chatTradeToolsSubtitleNoDirectTrade: {
    ko: "직거래·안전결제·완료",
    my: "တိုက်ရိုက်တွေ့ဆုံ · လုံခြုံငွေပေးချေမှု · ပြီးစီး",
    zh: "当面交易 · 担保支付 · 完成",
  },
  chatStartSharing: {
    ko: "공유 시작",
    my: "မျှဝေမှု စတင်",
    zh: "开始共享",
  },
  chatUpdateLocation: {
    ko: "위치 업데이트",
    my: "တည်နေရာ အပ်ဒိတ်",
    zh: "更新位置",
  },
  chatStopSharing: {
    ko: "공유 중지",
    my: "မျှဝေမှု ရပ်မည်",
    zh: "停止共享",
  },
  chatLiveLocationMap: {
    ko: "실시간 위치 지도",
    my: "တိုက်ရိုက် တည်နေရာ မြေပုံ",
    zh: "实时位置地图",
  },
  chatLocationStatusSharing: {
    ko: "공유 중",
    my: "မျှဝေနေသည်",
    zh: "共享中",
  },
  chatLocationStatusStarting: {
    ko: "시작 중",
    my: "စတင်နေသည်",
    zh: "启动中",
  },
  chatLocationStatusOff: {
    ko: "꺼짐",
    my: "ပိတ်ထား",
    zh: "已关闭",
  },
  chatLocationUpdatedAt: {
    ko: "위치 업데이트 시각: {time}",
    my: "တည်နေရာ အပ်ဒိတ် အချိန်: {time}",
    zh: "位置更新时间：{time}",
  },
  chatLocationPermissionDenied: {
    ko: "위치 권한이 필요합니다.",
    my: "တည်နေရာခွင့်ပြုချက် လိုအပ်ပါသည်။",
    zh: "需要位置权限。",
  },
  chatLocationAlreadyActive: {
    ko: "이미 위치 공유가 활성화되어 좌표만 갱신했습니다.",
    my: "တည်နေရာမျှဝေမှု လုပ်ဆောင်နေပြီး ဖြစ်သောကြောင့် လက်ရှိ tọa标 ကိုသာ အပ်ဒိတ် လုပ်ခဲ့သည်။",
    zh: "位置共享已在进行，仅更新了坐标。",
  },
  chatLocationStartFailed: {
    ko: "위치 공유 시작에 실패했습니다.",
    my: "တည်နေရာမျှဝေမှု စတင်ရာတွင် မအောင်မြင်ပါ။",
    zh: "开始位置共享失败。",
  },
  chatLocationUpdateFailed: {
    ko: "위치 업데이트에 실패했습니다.",
    my: "တည်နေရာ အပ်ဒိတ် မအောင်မြင်ပါ။",
    zh: "更新位置失败。",
  },
  chatLocationStopFailed: {
    ko: "위치 공유 중지에 실패했습니다.",
    my: "တည်နေရာမျှဝေမှု ရပ်ရန် မအောင်မြင်ပါ။",
    zh: "停止位置共享失败。",
  },
  chatLocationStarted: {
    ko: "위치 공유를 시작했습니다.",
    my: "တည်နေရာမျှဝေမှု စတင်ပြီးပါပြီ။",
    zh: "已开始共享位置。",
  },
  chatLocationStopped: {
    ko: "위치 공유를 중지했습니다.",
    my: "တည်နေရာမျှဝေမှု ရပ်ပြီးပါပြီ။",
    zh: "已停止共享位置。",
  },
  chatLocationUpdated: {
    ko: "위치를 업데이트했습니다.",
    my: "တည်နေရာ အပ်ဒိတ် လုပ်ပြီးပါပြီ။",
    zh: "位置已更新。",
  },
  notificationsTitle: { ko: "알림함", my: "အသိပေးစာများ", zh: "通知收件箱" },
  notificationsEmpty: {
    ko: "아직 알림이 없습니다.",
    my: "အသိပေးချက် မရှိသေးပါ။",
    zh: "暂无通知。",
  },
  actionCooldownRemaining: {
    ko: "{hours}시간 {minutes}분 후에 다시 시도할 수 있습니다.",
    my: "{hours} နာရီ {minutes} မိနစ်အကြာတွင် ပြန်လည်ကြိုးစားနိုင်ပါသည်။",
    zh: "{hours} 小时 {minutes} 分钟后可再次操作。",
  },
  "noti.kbz.requested.title": {
    ko: "KBZPay 인증 요청됨",
    my: "KBZPay အတည်ပြုရန် တောင်းဆိုပြီး",
    zh: "已请求 KBZPay 验证",
  },
  "noti.kbz.requested.body": {
    ko: "요청이 접수되었습니다. 관리자 안내를 기다려주세요. {message}",
    my: "တောင်းဆိုမှုကို လက်ခံပြီးပါပြီ။ အုပ်ချုပ်သူ ညွှန်ကြားချက်ကို စောင့်ပါ။ {message}",
    zh: "请求已提交，请等待管理员指引。{message}",
  },
  "noti.kbz.instruction.title": {
    ko: "KBZPay 송금 안내 도착",
    my: "KBZPay လွှဲပြောင်းညွှန်ကြားချက် ရရှိပြီး",
    zh: "收到 KBZPay 转账指引",
  },
  "noti.kbz.instruction.body": {
    ko: "아래 번호로 {amount} MMK 송금 후 거래번호를 제출하세요. {transferPhone} {adminNote}",
    my: "{transferPhone} သို့ {amount} MMK လွှဲပြီးနောက် လုပ်ဆောင်မှုအမှတ်ကို တင်ပြပါ။ {adminNote}",
    zh: "请向 {transferPhone} 转账 {amount} MMK，然后提交交易号。{adminNote}",
  },
  "noti.kbz.transactionSubmitted.title": {
    ko: "KBZPay 거래번호 제출됨",
    my: "KBZPay လုပ်ဆောင်မှုအမှတ် တင်ပြပြီး",
    zh: "已提交 KBZPay 交易号",
  },
  "noti.kbz.transactionSubmitted.body": {
    ko: "거래번호: {kbzTransactionId}. 관리자 확인을 기다리는 중입니다.",
    my: "လုပ်ဆောင်မှုအမှတ်: {kbzTransactionId}။ အုပ်ချုပ်သူ အတည်ပြုမှုကို စောင့်နေပါသည်။",
    zh: "交易号：{kbzTransactionId}。等待管理员核验。",
  },
  "noti.kbz.verified.title": {
    ko: "KBZPay 인증 완료",
    my: "KBZPay အတည်ပြုပြီး",
    zh: "KBZPay 验证已完成",
  },
  "noti.kbz.verified.body": {
    ko: "인증이 완료되었습니다. {adminNote}",
    my: "အတည်ပြုခြင်း ပြီးစီးပြီးပါပြီ။ {adminNote}",
    zh: "验证已完成。{adminNote}",
  },

  "noti.points.reviewReceived.title": {
    ko: "리뷰로 포인트 적립",
    my: "သုံးသပ်ချက်ဖြင့် အမှတ်များ",
    zh: "评价获得积分",
  },
  "noti.points.reviewReceived.body": {
    ko: "별점 {stars} 리뷰로 {pointsAwarded}점이 적립되었습니다.",
    my: "{stars} ကြယ်ပွင့်သုံးသပ်ချက်ဖြင့် အမှတ် {pointsAwarded} ရရှိပါသည်။",
    zh: "您收到 {stars} 星评价，获得 {pointsAwarded} 积分。",
  },
  "noti.points.withdrawalRequested.title": {
    ko: "출금 요청 접수",
    my: "ငွေထုတ်ယူမှု တောင်းဆိုမှု လက်ခံပြီး",
    zh: "提现已提交",
  },
  "noti.points.withdrawalRequested.body": {
    ko: "금액 {amount} MMK 출금 요청이 접수되었습니다. (요청 ID: {withdrawalId})",
    my: "ငွေပမာဏ {amount} MMK ငွေထုတ်ယူမှု တောင်းဆိုမှုကို လက်ခံပြီးပါပြီ။ (တောင်းဆိုမှု ID: {withdrawalId})",
    zh: "已收到提现申请，金额 {amount} MMK（申请 ID：{withdrawalId}）。",
  },
  "noti.points.withdrawalApproved.title": {
    ko: "출금 승인",
    my: "ငွေထုတ်ယူမှု အတည်ပြုပြီး",
    zh: "提现已通过",
  },
  "noti.points.withdrawalApproved.body": {
    ko: "출금이 승인되었습니다. 금액: {amount} MMK. {adminNote}",
    my: "ငွေထုတ်ယူမှုကို အတည်ပြုပြီးပါပြီ။ ပမာဏ: {amount} MMK။ {adminNote}",
    zh: "提现已批准，金额 {amount} MMK。{adminNote}",
  },
  "noti.points.withdrawalRejected.title": {
    ko: "출금 거절",
    my: "ငွေထုတ်ယူမှု ငြင်းပယ်ခံရ",
    zh: "提现已拒绝",
  },
  "noti.points.withdrawalRejected.body": {
    ko: "출금 요청이 거절되었습니다. 금액: {amount} MMK. {adminNote}",
    my: "ငွေထုတ်ယူမှု တောင်းဆိုမှုကို ငြင်းပယ်ထားပါသည်။ ပမာဏ: {amount} MMK။ {adminNote}",
    zh: "提现已拒绝，金额 {amount} MMK。{adminNote}",
  },
  "noti.points.withdrawalPaid.title": {
    ko: "출금 완료",
    my: "ငွေထုတ်ယူမှု ပြီးစီး",
    zh: "提现已打款",
  },
  "noti.points.withdrawalPaid.body": {
    ko: "출금이 완료되었습니다. 금액: {amount} MMK. 참조: {kbzTransferRef}",
    my: "ငွေထုတ်ယူမှု ပြီးစီးပါပြီ။ ပမာဏ: {amount} MMK။ ကိုးကား: {kbzTransferRef}",
    zh: "提现已完成，金额 {amount} MMK。参考：{kbzTransferRef}",
  },
  "noti.points.bonus.registration.title": {
    ko: "가입 보너스 포인트",
    my: "စာရင်းသွင်းအပိုအမှတ်",
    zh: "注册奖励积分",
  },
  "noti.points.bonus.registration.body": {
    ko: "회원가입 보너스로 {amount}점이 적립되었습니다.",
    my: "စာရင်းသွင်းအပိုအမှတ်အဖြစ် အမှတ် {amount} ရရှိပါသည်။",
    zh: "注册奖励：获得 {amount} 积分。",
  },
  "noti.points.bonus.phone.title": {
    ko: "휴대폰 인증 보너스",
    my: "ဖုန်းအတည်ပြုအပိုအမှတ်",
    zh: "手机验证奖励",
  },
  "noti.points.bonus.phone.body": {
    ko: "휴대폰 인증 완료 보너스로 {amount}점이 적립되었습니다.",
    my: "ဖုန်းအတည်ပြုပြီးနောက် အပိုအမှတ် {amount} ရရှိပါသည်။",
    zh: "完成手机验证，获得 {amount} 积分。",
  },
  "noti.points.bonus.email.title": {
    ko: "이메일 인증 보너스",
    my: "အီးမေးလ်အတည်ပြုအပိုအမှတ်",
    zh: "邮箱验证奖励",
  },
  "noti.points.bonus.email.body": {
    ko: "이메일 인증 완료 보너스로 {amount}점이 적립되었습니다.",
    my: "အီးမေးလ်အတည်ပြုပြီးနောက် အပိုအမှတ် {amount} ရရှိပါသည်။",
    zh: "完成邮箱验证，获得 {amount} 积分。",
  },
  "noti.points.bonus.kbzpay.title": {
    ko: "KBZPay 인증 보너스",
    my: "KBZPay အတည်ပြုအပိုအမှတ်",
    zh: "KBZPay 验证奖励",
  },
  "noti.points.bonus.kbzpay.body": {
    ko: "KBZPay 인증 완료 보너스로 {amount}점이 적립되었습니다.",
    my: "KBZPay အတည်ပြုပြီးနောက် အပိုအမှတ် {amount} ရရှိပါသည်။",
    zh: "完成 KBZPay 验证，获得 {amount} 积分。",
  },
  "noti.points.bonus.generic.title": {
    ko: "보너스 포인트",
    my: "အပိုအမှတ်",
    zh: "奖励积分",
  },
  "noti.points.bonus.generic.body": {
    ko: "{amount}점 보너스가 적립되었습니다. ({sourceType})",
    my: "အပိုအမှတ် {amount} ရရှိပါသည်။ ({sourceType})",
    zh: "获得奖励积分 {amount}。（{sourceType}）",
  },

  "noti.facebook.linked.title": {
    ko: "Facebook 연동 완료",
    my: "Facebook ချိတ်ဆက်မှု ပြီးစီး",
    zh: "Facebook 已绑定",
  },
  "noti.facebook.linked.body": {
    ko: "{facebookName} 계정이 연결되었습니다.",
    my: "{facebookName} အကောင့်ကို ချိတ်ဆက်ပြီးပါပြီ။",
    zh: "已绑定 Facebook 账号：{facebookName}。",
  },
  "noti.facebook.followSubmitted.title": {
    ko: "페이지 팔로우 인증 제출됨",
    my: "စာမျက်နှာ လိုက်ပါမှုအတည်ပြု တင်ပြပြီး",
    zh: "已提交关注页面凭证",
  },
  "noti.facebook.followSubmitted.body": {
    ko: "관리자 검토 중입니다. 페이지: {facebookPageUrl}",
    my: "အုပ်ချုပ်သူ စစ်ဆေးနေပါသည်။ စာမျက်နှာ: {facebookPageUrl}",
    zh: "等待管理员审核。页面：{facebookPageUrl}",
  },
  "noti.facebook.rewarded.title": {
    ko: "Facebook 팔로우 보상",
    my: "Facebook လိုက်ပါမှုဆုလာဘ်",
    zh: "Facebook 关注奖励",
  },
  "noti.facebook.rewarded.body": {
    ko: "페이지 팔로우가 승인되어 포인트가 지급되었습니다.",
    my: "စာမျက်နှာ လိုက်ပါမှုကို အတည်ပြုပြီး အမှတ်များ ပေးအပ်ပါသည်။",
    zh: "关注审核已通过，积分已发放。",
  },

  "noti.sections.general": {
    ko: "일반",
    my: "အထွေထွေ",
    zh: "通用",
  },
  "noti.sections.generalHint": {
    ko: "KBZPay, 포인트, 제안·신고, 계정 알림",
    my: "KBZPay၊ အမှတ်များ၊ အကြံပြု/တိုင်ကြား၊ အကောင့်",
    zh: "KBZPay、积分、建议/举报与账户通知",
  },
  "noti.sections.chat": {
    ko: "채팅·거래",
    my: "ချတ် နှင့် ကုန်သွယ်မှု",
    zh: "聊天与交易",
  },
  "noti.sections.chatHint": {
    ko: "안전결제, 만남, 거래 업데이트",
    my: "လုံခြုံငွေပေးချေမှု၊ တွေ့ဆုံမှုနှင့် ကုန်သွယ်မှု အပ်ဒိတ်",
    zh: "担保支付、见面与交易动态",
  },
  "noti.chat.empty": {
    ko: "채팅 알림이 없습니다.",
    my: "ချတ် အသိပေးချက် မရှိသေးပါ။",
    zh: "暂无聊天通知。",
  },
  "noti.chat.filterAll": {
    ko: "전체",
    my: "အားလုံး",
    zh: "全部",
  },
  "noti.chat.filterUnread": {
    ko: "읽지 않음",
    my: "မဖတ်ရသေး",
    zh: "未读",
  },

  "noti.chat.events.CHAT_SAFE_PAYMENT_REQUESTED_CLIENT.title": {
    ko: "안전결제 요청됨",
    my: "လုံခြုံငွေပေးချေမှု တောင်းဆိုပြီး",
    zh: "已请求担保支付",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_REQUESTED_CLIENT.body": {
    ko: "요청이 접수되었습니다. 관리자가 KBZPay 번호를 알림으로내면, KBZPay에서 결제 후 채팅에서 거래 ID를 제출하세요.",
    my: "တောင်းဆိုမှုကို လက်ခံပြီးပါပြီ။ Admin က KBZPay နံပါတ်ကို အသိပေးချက်ဖြင့် ပို့ပေးမည်။ ရရှိပြီးနောက် KBZPay တွင် ပေးချေပြီး ချတ်တွင် လုပ်ဆောင်မှုအမှတ်ကို တင်ပြပါ။",
    zh: "您的请求已提交。管理员将通过通知发送 KBZPay 号码。收到后请在 KBZPay 付款，并在聊天中提交交易号。",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_REQUESTED_ADMIN.title": {
    ko: "안전결제 요청",
    my: "လုံခြုံငွေပေးချေမှု တောင်းဆိုမှု",
    zh: "担保支付请求",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_REQUESTED_ADMIN.body": {
    ko: "구매자가 안전결제를 요청했습니다. KBZPay 수취 번호를 보내주세요.",
    my: "ဝယ်သူက လုံခြုံငွေပေးချေမှု တောင်းဆိုထားသည်။ KBZPay လက်ခံနံပါတ်ကို ပို့ပေးပါ။",
    zh: "买家请求了担保支付。请发送 KBZPay 收款号码。",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_CLIENT.title": {
    ko: "KBZPay 송금 안내",
    my: "KBZPay လွှဲပြောင်းညွှန်ကြားချက်",
    zh: "KBZPay 转账指引",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_CLIENT.body": {
    ko: "{{adminReceivingPhone}}(으)로 송금하세요. KBZPay에서 결제 후 채팅에서 거래 ID를 제출하세요.",
    my: "{{adminReceivingPhone}} သို့ လွှဲပေးပါ။ KBZPay တွင် ပေးချေပြီးနောက် ချတ်တွင် လုပ်ဆောင်မှုအမှတ်ကို တင်ပြပါ။",
    zh: "请转账至 {{adminReceivingPhone}}。在 KBZPay 付款后，打开聊天提交交易号。",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_CLIENT.bodyNote": {
    ko: "메모: {{adminNote}}",
    my: "မှတ်ချက်: {{adminNote}}",
    zh: "备注：{{adminNote}}",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_ADMIN.title": {
    ko: "안내 발송 완료",
    my: "ညွှန်ကြားချက် ပို့ပြီး",
    zh: "指引已发送",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_INSTRUCTION_SENT_ADMIN.body": {
    ko: "구매자에게 KBZPay 안내를 보냈습니다. 수취 번호: {{adminReceivingPhone}}",
    my: "ဝယ်သူထံ KBZPay ညွှန်ကြားချက် ပို့ပြီးပါပြီ။ လက်ခံနံပါတ်: {{adminReceivingPhone}}",
    zh: "已向买家发送 KBZPay 指引。收款号码：{{adminReceivingPhone}}",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_SUBMITTED_CLIENT.title": {
    ko: "결제 정보 제출됨",
    my: "ငွေပေးချေမှု တင်ပြပြီး",
    zh: "已提交付款",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_SUBMITTED_CLIENT.body": {
    ko: "KBZ 거래 ID가 제출되었습니다. 관리자가 확인 후 입금 완료 시 채팅이 업데이트됩니다.",
    my: "KBZ လုပ်ဆောင်မှုအမှတ်ကို တင်ပြပြီးပါပြီ။ Admin အတည်ပြုပြီး ငွေလက်ခံပြီးပါက ချတ်ကို အပ်ဒိတ်လုပ်ပါမည်။",
    zh: "您的 KBZ 交易号已提交。管理员核实后会在聊天中更新收款状态。",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_SUBMITTED_ADMIN.title": {
    ko: "안전결제 검토 필요",
    my: "လုံခြုံငွေပေးချေမှု စစ်ဆေးရန်",
    zh: "担保支付待审核",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_SUBMITTED_ADMIN.body": {
    ko: "구매자가 KBZ 결제를 제출했습니다. 거래 ID: {{kbzTransactionId}} · 금액: {{paymentAmount}} MMK",
    my: "ဝယ်သူက KBZ ငွေပေးချေမှု တင်ပြထားသည်။ လုပ်ဆောင်မှုအမှတ်: {{kbzTransactionId}} · ပမာဏ: {{paymentAmount}} MMK",
    zh: "买家已提交 KBZ 付款。交易号：{{kbzTransactionId}} · 金额：{{paymentAmount}} MMK",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_RECEIVED_CLIENT.buyer.title": {
    ko: "결제 확인됨",
    my: "ငွေပေးချေမှု အတည်ပြုပြီး",
    zh: "付款已确认",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_RECEIVED_CLIENT.buyer.body": {
    ko: "관리자가 결제를 확인했습니다. 거래가 끝나면 완료 처리할 수 있습니다.",
    my: "Admin က သင့်ငွေပေးချေမှုကို အတည်ပြုပြီးပါပြီ။ ကုန်သွယ်မှု ပြီးဆုံးပါက ပြီးမြောက်ဟု မှတ်သားနိုင်ပါသည်။",
    zh: "管理员已确认您的付款。交易完成后可标记完成。",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_RECEIVED_CLIENT.buyer.bodyNote": {
    ko: "메모: {{adminNote}}",
    my: "မှတ်ချက်: {{adminNote}}",
    zh: "备注：{{adminNote}}",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_RECEIVED_CLIENT.seller.title": {
    ko: "구매자 결제 확보됨",
    my: "ဝယ်သူငွေပေးချေမှု လုံခြုံမှု",
    zh: "买家付款已确认",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_RECEIVED_CLIENT.seller.body": {
    ko: "관리자가 구매자 결제를 확인했습니다. 채팅에서 거래를 완료하세요.",
    my: "Admin က ဝယ်သူ၏ ငွေပေးချေမှုကို အတည်ပြုပြီးပါပြီ။ ချတ်တွင် ကုန်သွယ်မှုကို ပြီးမြောက်အောင် လုပ်ဆောင်ပါ။",
    zh: "管理员已确认买家付款。请在聊天中完成交易。",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_RECEIVED_CLIENT.seller.bodyNote": {
    ko: "메모: {{adminNote}}",
    my: "မှတ်ချက်: {{adminNote}}",
    zh: "备注：{{adminNote}}",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_RECEIVED_ADMIN.title": {
    ko: "입금 확인 처리됨",
    my: "ငွေလက်ခံ အတည်ပြုပြီး",
    zh: "已标记收款",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_RECEIVED_ADMIN.body": {
    ko: "이 안전결제를 입금 확인 처리했습니다.",
    my: "ဤလုံခြုံငွေပေးချေမှုကို ငွေလက်ခံအဖြစ် မှတ်သားပြီးပါပြီ။",
    zh: "您已将此担保支付标记为已收款。",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_TRANSFERRED_CLIENT.seller.title": {
    ko: "대금이 송금되었습니다",
    my: "ငွေလွှဲပြောင်း ရရှိပြီး",
    zh: "款项已释放给您",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_TRANSFERRED_CLIENT.seller.body": {
    ko: "관리자가 대금을 송금했습니다. 참조: {{transferRef}}",
    my: "Admin က သင့်ရငွေကို လွှဲပြောင်းပြီးပါပြီ။ ကိုးကား: {{transferRef}}",
    zh: "管理员已向您转账。参考：{{transferRef}}",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_TRANSFERRED_CLIENT.buyer.title": {
    ko: "판매자에게 결제 해제됨",
    my: "ရောင်းသူထံ ငွေလွှဲပြောင်း ပြီး",
    zh: "已向卖家放款",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_TRANSFERRED_CLIENT.buyer.body": {
    ko: "관리자가 판매자에게 결제를 해제했습니다. 참조: {{transferRef}}",
    my: "Admin က ရောင်းသူထံ ငွေကို လွှဲပြောင်းပြီးပါပြီ။ ကိုးကား: {{transferRef}}",
    zh: "管理员已向卖家释放款项。参考：{{transferRef}}",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_TRANSFERRED_ADMIN.title": {
    ko: "결제 송금 완료",
    my: "ငွေလွှဲပြောင်း ပြီးစီး",
    zh: "已完成放款",
  },
  "noti.chat.events.CHAT_SAFE_PAYMENT_TRANSFERRED_ADMIN.body": {
    ko: "안전결제가 판매자에게 송금 처리되었습니다. 참조: {{transferRef}}",
    my: "လုံခြုံငွေပေးချေမှုကို ရောင်းသူထံ လွှဲပြောင်းပြီးဟု မှတ်သားပြီးပါပြီ။ ကိုးကား: {{transferRef}}",
    zh: "担保支付已标记为已向卖家转账。参考：{{transferRef}}",
  },

  "noti.chat.events.CHAT_TRANSACTION_CANCELLED_SELF_PENALTY.title": {
    ko: "Transaction cancelled",
    my: "Transaction cancelled",
    zh: "Transaction cancelled",
  },
  "noti.chat.events.CHAT_TRANSACTION_CANCELLED_SELF_PENALTY.body": {
    ko: "{{deductedPoints}} points were deducted for cancellation. Balance after: {{balanceAfter}}.",
    my: "{{deductedPoints}} points were deducted for cancellation. Balance after: {{balanceAfter}}.",
    zh: "{{deductedPoints}} points were deducted for cancellation. Balance after: {{balanceAfter}}.",
  },
  "noti.chat.events.CHAT_TRANSACTION_CANCELLED_COUNTERPARTY.title": {
    ko: "Transaction cancelled",
    my: "Transaction cancelled",
    zh: "Transaction cancelled",
  },
  "noti.chat.events.CHAT_TRANSACTION_CANCELLED_COUNTERPARTY.body": {
    ko: "The other party cancelled this transaction. Cancelled by: {{cancelledByUserId}}.",
    my: "The other party cancelled this transaction. Cancelled by: {{cancelledByUserId}}.",
    zh: "The other party cancelled this transaction. Cancelled by: {{cancelledByUserId}}.",
  },

  "noti.suggestion.events.SUGGESTION_SUBMITTED_CLIENT.title": {
    ko: "제안 접수됨",
    my: "အကြံပြုချက် လက်ခံပြီး",
    zh: "建议已提交",
  },
  "noti.suggestion.events.SUGGESTION_SUBMITTED_CLIENT.body": {
    ko: "제안이 접수되었습니다. 검토 후 포인트가 지급될 수 있습니다.",
    my: "သင့်အကြံပြုချက်ကို လက်ခံပြီးပါပြီ။ စစ်ဆေးပြီးနောက် ပွိုင့်ရနိုင်ပါသည်။",
    zh: "您的建议已提交，审核通过后可能获得积分奖励。",
  },
  "noti.suggestion.events.SUGGESTION_SUBMITTED_ADMIN.title": {
    ko: "새 제안",
    my: "အကြံပြုချက် အသစ်",
    zh: "新建议",
  },
  "noti.suggestion.events.SUGGESTION_SUBMITTED_ADMIN.body": {
    ko: "{{nickname}} ({{name}}) · {{accountNickname}} · {{phone}}",
    my: "{{nickname}} ({{name}}) · {{accountNickname}} · {{phone}}",
    zh: "{{nickname}}（{{name}}）· {{accountNickname}} · {{phone}}",
  },
  "noti.suggestion.events.SUGGESTION_REWARDED_CLIENT.title": {
    ko: "제안 보상",
    my: "အကြံပြုချက် ဆုလာဘ်",
    zh: "建议奖励",
  },
  "noti.suggestion.events.SUGGESTION_REWARDED_CLIENT.body": {
    ko: "제안이 채택되어 {{pointsAwarded}}포인트가 지급되었습니다.",
    my: "အကြံပြုချက်အတွက် {{pointsAwarded}} ပွိုင့် ရရှိပါသည်။",
    zh: "您的建议已采纳，获得 {{pointsAwarded}} 积分。",
  },
  "noti.suggestion.events.SUGGESTION_REWARDED_ADMIN.title": {
    ko: "제안 보상 처리됨",
    my: "အကြံပြုချက် ဆုလာဘ် ပေးပြီး",
    zh: "已发放建议奖励",
  },
  "noti.suggestion.events.SUGGESTION_REWARDED_ADMIN.body": {
    ko: "사용자에게 {{pointsAwarded}}포인트를 지급했습니다.",
    my: "အသုံးပြုသူထံ {{pointsAwarded}} ပွိုင့် ပေးအပ်ပြီးပါပြီ။",
    zh: "已向用户发放 {{pointsAwarded}} 积分。",
  },
  "noti.suggestion.events.SUGGESTION_DISMISSED_CLIENT.title": {
    ko: "제안 검토 완료",
    my: "အကြံပြုချက် စစ်ဆေးပြီး",
    zh: "建议已处理",
  },
  "noti.suggestion.events.SUGGESTION_DISMISSED_CLIENT.body": {
    ko: "제안이 반영되지 않았습니다. 다른 아이디어도 환영합니다.",
    my: "ဤအကြံပြုချက်ကို မလက်ခံပါ။ အခြကြံများကို ဆက်လက်ပို့နိုင်ပါသည်။",
    zh: "该建议暂未采纳，欢迎继续提交其他想法。",
  },
  "noti.suggestion.events.SUGGESTION_DISMISSED_CLIENT.bodyNote": {
    ko: "관리자 메모: {{adminNote}}",
    my: "Admin မှတ်ချက်: {{adminNote}}",
    zh: "管理员备注：{{adminNote}}",
  },

  "noti.fraud.events.FRAUD_REPORT_SUBMITTED_CLIENT.title": {
    ko: "사기 신고 접수",
    my: "လိမ်လည်မှု တိုင်ကြားချက် လက်ခံ",
    zh: "诈骗举报已提交",
  },
  "noti.fraud.events.FRAUD_REPORT_SUBMITTED_CLIENT.body": {
    ko: "신고가 접수되었습니다. 검토 후 알려드리겠습니다.",
    my: "တိုင်ကြားချက်ကို လက်ခံပြီးပါပြီ။ စစ်ဆေးပြီး အကြောင်းကြားပါမည်။",
    zh: "您的举报已受理，我们将尽快审核。",
  },
  "noti.fraud.events.FRAUD_REPORT_SUBMITTED_ADMIN.title": {
    ko: "새 사기 신고",
    my: "လိမ်လည်မှု တိုင်ကြားချက် အသစ်",
    zh: "新诈骗举报",
  },
  "noti.fraud.events.FRAUD_REPORT_SUBMITTED_ADMIN.body": {
    ko: "{{fraudUserName}} · 코드 {{reportedReferralCode}} · {{fraudType}}",
    my: "{{fraudUserName}} · ကုဒ် {{reportedReferralCode}} · {{fraudType}}",
    zh: "{{fraudUserName}} · 邀请码 {{reportedReferralCode}} · {{fraudType}}",
  },
  "noti.fraud.events.FRAUD_REPORT_CONFIRMED_CLIENT.title": {
    ko: "신고 확인됨",
    my: "တိုင်ကြားချက် အတည်ပြုပြီး",
    zh: "举报已确认",
  },
  "noti.fraud.events.FRAUD_REPORT_CONFIRMED_CLIENT.body": {
    ko: "신고가 확인되었습니다. 조치가 진행 중입니다.",
    my: "တိုင်ကြားချက်ကို အတည်ပြုပြီးပါပြီ။ ဆက်လက်လုပ်ဆောင်နေပါသည်။",
    zh: "您的举报已确认，我们正在处理。",
  },
  "noti.fraud.events.FRAUD_REPORT_CONFIRMED_CLIENT.bodyBlocked": {
    ko: "신고가 확인되었고 해당 사용자가 차단되었습니다.",
    my: "တိုင်ကြားချက်အတည်ပြုပြီး အသုံးပြုသူကို ပိတ်ပင်ထားပါသည်။",
    zh: "举报已确认，相关用户已被封禁。",
  },
  "noti.fraud.events.FRAUD_REPORT_DISMISSED_CLIENT.title": {
    ko: "신고 기각",
    my: "တိုင်ကြားချက် ပယ်ချခြင်း",
    zh: "举报未通过",
  },
  "noti.fraud.events.FRAUD_REPORT_DISMISSED_CLIENT.body": {
    ko: "신고 내용을 확인했으나 조치 대상이 아닙니다.",
    my: "တိုင်ကြားချက်ကို စစ်ဆေးပြီးသော်လည်း လုပ်ဆောင်ရန် မလိုအပ်ပါ။",
    zh: "经审核，该举报暂不成立。",
  },
  "noti.fraud.events.FRAUD_REPORT_ACTION_REPORTED_USER.title": {
    ko: "사기 신고 관련 조치",
    my: "လိမ်လည်မှု တိုင်ကြားချက် ဆိုင်ရာ",
    zh: "欺诈举报相关通知",
  },
  "noti.fraud.events.FRAUD_REPORT_ACTION_REPORTED_USER.body": {
    ko: "귀하에 대한 신고가 확인되어 계정이 검토 중입니다.",
    my: "သင့်အပေါ် တိုင်ကြားချက်အတည်ပြုပြီး အကောင့်ကို စစ်ဆေးနေပါသည်။",
    zh: "针对您的举报已确认，账号正在审核中。",
  },
  "noti.fraud.events.ACCOUNT_BANNED_CLIENT.title": {
    ko: "계정 정지",
    my: "အကောင့် ပိတ်ပင်",
    zh: "账号已封禁",
  },
  "noti.fraud.events.ACCOUNT_BANNED_CLIENT.body": {
    ko: "계정이 정지되었습니다.",
    my: "သင့်အကောင့်ကို ပိတ်ပင်ထားပါသည်။",
    zh: "您的账号已被封禁。",
  },
  "noti.fraud.events.ACCOUNT_BANNED_CLIENT.bodyReason": {
    ko: "사유: {{adminNote}}",
    my: "အကြောင်းရင်း: {{adminNote}}",
    zh: "原因：{{adminNote}}",
  },
  "noti.fraud.events.ACCOUNT_UNBANNED_CLIENT.title": {
    ko: "계정 정지 해제",
    my: "အကောင့် ပိတ်ပင်မှု ဖြုတ်ပြီး",
    zh: "账号已解封",
  },
  "noti.fraud.events.ACCOUNT_UNBANNED_CLIENT.body": {
    ko: "계정 정지가 해제되었습니다. 다시 이용할 수 있습니다.",
    my: "အကောင့် ပိတ်ပင်မှုကို ဖြုတ်ပြီးပါပြီ။ ပြန်လည်အသုံးပြုနိုင်ပါသည်။",
    zh: "账号已解封，您可以继续使用。",
  },

  homeWelcome: { ko: "환영합니다", my: "ကြိုဆိုပါသည်", zh: "欢迎" },
  homeBrandTitle: {
    ko: "Flex Used Market",
    my: "Flex Used Market",
    zh: "Flex Used Market",
  },
  homeDashboardSubtitle: {
    ko: "중고거래 대시보드입니다.",
    my: "အသုံးပြုပြီး ပစ္စည်း စျေးကွက် ဒက်ရှ်ဘုတ်",
    zh: "你的二手市场仪表板。",
  },
  homeHeroSubtitle: {
    ko: "카테고리로 상품을 빠르게 찾아보세요.",
    my: "အမျိုးအစားအလိုက် ပစ္စည်းများကို မြန်မြန်ရှာဖွေပါ။",
    zh: "按分类快速查找商品。",
  },
  homeCategoriesTitle: {
    ko: "카테고리",
    my: "အမျိုးအစားများ",
    zh: "分类",
  },
  homeAllCategory: {
    ko: "전체",
    my: "အားလုံး",
    zh: "全部",
  },
  homeProductsTitle: {
    ko: "상품",
    my: "ပစ္စည်းများ",
    zh: "商品",
  },
  homeSearchPlaceholder: {
    ko: "제목·설명 검색 (예: iphone)",
    my: "ခေါင်းစဉ် သို့မဟုတ် ဖော်ပြချက် ရှာဖွေရန် (ဥပမာ iphone)",
    zh: "搜索标题或描述（如 iphone）",
  },
  homeSearchClearAccessibility: {
    ko: "검색어 지우기",
    my: "ရှာဖွေစာသား ဖျက်ရန်",
    zh: "清除搜索",
  },
  homeRadiusFilterTitle: {
    ko: "반경 필터",
    my: "အကွာအဝေး စစ်ထုတ်မှု",
    zh: "半径筛选",
  },
  homeRadiusFilterAll: {
    ko: "전체",
    my: "အားလုံး",
    zh: "全部",
  },
  homeRadiusFilterKmUnit: {
    ko: "km",
    my: "km",
    zh: "公里",
  },
  homeRadiusFilterHint: {
    ko: "내 위치 기준 거리로 상품을 좁힙니다.",
    my: "သင့်တည်နေရာမှ အကွာအဝေးအလိုက် ပစ္စည်းများကို စစ်ထုတ်ပါသည်။",
    zh: "按与您位置的距离筛选商品。",
  },
  homeRadiusFilterSummaryAll: {
    ko: "거리 제한 없음",
    my: "အကွာအဝေး မကန့်သတ်",
    zh: "不限距离",
  },
  homeRadiusFilterSummaryWithin: {
    ko: "{km}km 이내",
    my: "{km}km အတွင်း",
    zh: "{km}公里内",
  },
  homeRadiusFilterNoLocationHint: {
    ko: "위치를 활성화하면 반경 필터를 사용할 수 있습니다.",
    my: "တည်နေရာဖွင့်ပြီးမှ အကွာအဝေး စစ်ထုတ်မှုကို အသုံးပြုနိုင်သည်။",
    zh: "开启定位后可使用半径筛选。",
  },
  homeProductsNearYouHint: {
    ko: "가까운 거래 위치 순",
    my: "အနီးဆုံး လဲလှယ်ရာ နေရာအလိုက်",
    zh: "按距离排序",
  },
  homeProductsLoadingMore: {
    ko: "더 불러오는 중…",
    my: "ထပ်မံတင်နေသည်…",
    zh: "正在加载更多…",
  },
  homeProductsLoadError: {
    ko: "상품 목록을 불러오지 못했습니다. 아래로 당겨 다시 시도하세요.",
    my: "ပစ္စည်းစာရင်း မရရှိနိုင်ပါ။ အောက်သို့ ဆွဲချပြီး ပြန်ကြိုးစားပါ။",
    zh: "商品列表加载失败，请下拉重试。",
  },
  homeLoadingProducts: {
    ko: "상품을 불러오는 중...",
    my: "ပစ္စည်းများကို တင်နေသည်...",
    zh: "正在加载商品...",
  },
  homeNoProductsForCategory: {
    ko: "이 카테고리에 상품이 없습니다.",
    my: "ဒီအမျိုးအစားတွင် ပစ္စည်းမရှိသေးပါ။",
    zh: "该分类下暂无商品。",
  },
  homeNoProductsForSearch: {
    ko: "검색과 일치하는 상품이 없습니다.",
    my: "ရှာဖွေမှုနှင့် ကိုက်ညီသော ပစ္စည်းမရှိပါ။",
    zh: "没有符合搜索条件的商品。",
  },
  homeCategoryFallback: {
    ko: "일반",
    my: "အထွေထွေ",
    zh: "通用",
  },
  productListingNoImage: {
    ko: "사진 없음",
    my: "ပုံမရှိ",
    zh: "暂无图片",
  },
  homeCategoryErrorRetryHint: {
    ko: "카테고리를 불러오지 못했습니다. 아래로 당겨 새로고침하세요.",
    my: "အမျိုးအစားများ မရရှိနိုင်ပါ။ အောက်သို့ ဆွဲချပြီး ပြန်လည်ရယူပါ။",
    zh: "分类加载失败，请下拉刷新。",
  },
  homeMarketTitleFlex: {
    ko: "FLEX Used market",
    my: "FLEX Used market",
    zh: "FLEX Used market",
  },
  homeMyProfileButton: {
    ko: "본인정보",
    my: "ကိုယ်ရေးအချက်အလက်",
    zh: "个人资料",
  },
  homeSuggestReportButton: {
    ko: "제안/신고",
    my: "အကြံပြု/တိုင်ကြား",
    zh: "建议/举报",
  },
  homeSuggestionReportButton: {
    ko: "제안 / 사기 신고",
    my: "အကြံပြုချက် / လိမ်လည်မှု တိုင်ကြားရန်",
    zh: "建议 / 诈骗举报",
  },
  homeSuggestionReportTitle: {
    ko: "제안 및 사기 신고",
    my: "အကြံပြုချက်နှင့် လိမ်လည်မှုတိုင်ကြားချက်",
    zh: "建议与诈骗举报",
  },
  homeReportsSubtitle: {
    ko: "앱 개선 아이디어를 제안하거나 사기 거래를 신고하세요.",
    my: "အက်ပ်တိုးတက်စေသော အကြံပြုချက် သို့မဟုတ် လိမ်လည်မှုကို တိုင်ကြားပါ။",
    zh: "提交改进建议或举报欺诈交易。",
  },
  homeReportsNewSubmission: {
    ko: "새 제출",
    my: "အသစ် တင်သွင်းရန်",
    zh: "新提交",
  },
  homeReportsYourHistory: {
    ko: "제출 내역",
    my: "တင်သွင်းမှု မှတ်တမ်း",
    zh: "提交记录",
  },
  homeReportsEmptySuggestions: {
    ko: "아직 제출한 제안이 없습니다.",
    my: "အကြံပြုချက် မတင်ရသေးပါ။",
    zh: "暂无建议记录。",
  },
  homeReportsEmptyFraud: {
    ko: "아직 제출한 사기 신고가 없습니다.",
    my: "လိမ်လည်မှု တိုင်ကြားချက် မတင်ရသေးပါ။",
    zh: "暂无诈骗举报记录。",
  },
  homeReportsFraudTypeLabel: {
    ko: "사기 유형",
    my: "လိမ်လည်မှု အမျိုးအစား",
    zh: "诈骗类型",
  },
  homeReportsPointsAwarded: {
    ko: "+{points} 포인트",
    my: "+{points} ပွိုင့်",
    zh: "+{points} 积分",
  },
  homeSuggestionTab: {
    ko: "제안",
    my: "အကြံပြုချက်",
    zh: "建议",
  },
  homeFraudTab: {
    ko: "사기 신고",
    my: "လိမ်လည်မှု တိုင်ကြားချက်",
    zh: "诈骗举报",
  },
  homeSuggestionNicknamePlaceholder: {
    ko: "닉네임",
    my: "အမည်ပြောင်",
    zh: "昵称",
  },
  homeSuggestionNamePlaceholder: {
    ko: "이름",
    my: "အမည်",
    zh: "姓名",
  },
  homeSuggestionDetailsPlaceholder: {
    ko: "개선 아이디어를 자세히 적어주세요.",
    my: "တိုးတက်စေလိုသော အကြံပြုချက်ကို အသေးစိတ်ရေးပါ။",
    zh: "请详细填写你的建议。",
  },
  homeSuggestionSubmit: {
    ko: "제안 보내기",
    my: "အကြံပြုချက် ပို့မည်",
    zh: "提交建议",
  },
  homeMySuggestions: {
    ko: "내 제안 내역",
    my: "ကျွန်ုပ်၏ အကြံပြုချက်များ",
    zh: "我的建议",
  },
  homeFraudUserNamePlaceholder: {
    ko: "사기 사용자 이름",
    my: "လိမ်လည်သူ အမည်",
    zh: "诈骗者姓名",
  },
  homeFraudReferralCodePlaceholder: {
    ko: "신고 대상 추천코드",
    my: "တိုင်ကြားမည့်သူ referral code",
    zh: "被举报人邀请码",
  },
  homeFraudTradeDatePlaceholder: {
    ko: "거래일 (YYYY-MM-DD)",
    my: "အရောင်းအဝယ်နေ့ (YYYY-MM-DD)",
    zh: "交易日期 (YYYY-MM-DD)",
  },
  homeFraudTradeTimePlaceholder: {
    ko: "거래시간 (HH:mm)",
    my: "အရောင်းအဝယ်အချိန် (HH:mm)",
    zh: "交易时间 (HH:mm)",
  },
  homeFraudTypeFakeProduct: {
    ko: "가짜 상품",
    my: "အတု ပစ္စည်း",
    zh: "假货",
  },
  homeFraudTypeFakePayment: {
    ko: "가짜 결제",
    my: "အတု ငွေပေးချေမှု",
    zh: "虚假付款",
  },
  homeFraudTypeHarassment: {
    ko: "괴롭힘",
    my: "အနှောင့်အယှက်",
    zh: "骚扰",
  },
  homeFraudTypeOther: {
    ko: "기타",
    my: "အခြား",
    zh: "其他",
  },
  homeFraudDetailsPlaceholder: {
    ko: "피해 내용을 자세히 적어주세요.",
    my: "ဖြစ်စဉ်အသေးစိတ်ကို ရေးပါ။",
    zh: "请详细描述情况。",
  },
  homeFraudSubmit: {
    ko: "사기 신고 제출",
    my: "လိမ်လည်မှု တိုင်ကြားမည်",
    zh: "提交诈骗举报",
  },
  homeMyFraudReports: {
    ko: "내 사기 신고 내역",
    my: "ကျွန်ုပ်၏ လိမ်လည်မှု တိုင်ကြားချက်များ",
    zh: "我的诈骗举报",
  },
  homeReportsSubmitting: {
    ko: "제출 중...",
    my: "တင်သွင်းနေသည်...",
    zh: "提交中...",
  },
  homeReportsSuccessTitle: {
    ko: "완료",
    my: "အောင်မြင်သည်",
    zh: "成功",
  },
  homeSuggestionSubmitted: {
    ko: "제안이 접수되었습니다.",
    my: "အကြံပြုချက် လက်ခံရရှိပါသည်။",
    zh: "建议已提交。",
  },
  homeFraudSubmitted: {
    ko: "사기 신고가 접수되었습니다.",
    my: "လိမ်လည်မှု တိုင်ကြားချက် လက်ခံရရှိပါသည်။",
    zh: "诈骗举报已提交。",
  },
  homeReportsSubmitFailed: {
    ko: "제출에 실패했습니다. 잠시 후 다시 시도하세요.",
    my: "တင်သွင်းမှု မအောင်မြင်ပါ။ ခဏနေ၍ ပြန်ကြိုးစားပါ။",
    zh: "提交失败，请稍后重试。",
  },
  homeLogoutCaps: {
    ko: "Logout",
    my: "ထွက်မည်",
    zh: "退出",
  },
  productsMyTitle: {
    ko: "내 상품",
    my: "ကျွန်ုပ်၏ ပစ္စည်းများ",
    zh: "我的商品",
  },
  productsMySubtitle: {
    ko: "판매 중인 내 상품을 관리하세요.",
    my: "ရောင်းချနေသော သင့်ပစ္စည်းများကို စီမံပါ။",
    zh: "管理你发布的出售商品。",
  },
  productsNewListing: {
    ko: "+ 새 등록",
    my: "+ အသစ်ထည့်မည်",
    zh: "+ 新建发布",
  },
  productsLoading: {
    ko: "상품을 불러오는 중…",
    my: "ပစ္စည်းများ တင်နေသည်…",
    zh: "正在加载商品…",
  },
  productsLoadError: {
    ko: "내 상품 목록을 불러오지 못했습니다.\n다시 시도해 주세요.",
    my: "သင့်ပစ္စည်းစာရင်း မရရှိနိုင်ပါ။\nထပ်ကြိုးစားပါ။",
    zh: "无法加载你的商品列表。\n请重试。",
  },
  productsRetry: {
    ko: "다시 시도",
    my: "ပြန်ကြိုးစားမည်",
    zh: "重试",
  },
  productsFilterAll: {
    ko: "All",
    my: "All",
    zh: "All",
  },
  productsEmpty: {
    ko: "등록된 상품이 없습니다.",
    my: "ပစ္စည်းမရှိသေးပါ။",
    zh: "暂无商品。",
  },
  productsEmptyHint: {
    ko: "새 등록으로 첫 상품을 올려 보세요.",
    my: "အသစ်ထည့်ခြင်းဖြင့် ပထမပစ္စည်းကို တင်ပါ။",
    zh: "点击新建发布你的第一件商品。",
  },
  productsListingCount: {
    ko: "등록 {count}건",
    my: "စာရင်း {count} ခု",
    zh: "共 {count} 件",
  },
  productsLoadingMore: {
    ko: "더 불러오는 중…",
    my: "ထပ်မံတင်နေသည်…",
    zh: "正在加载更多…",
  },
  productsStatusDraft: {
    ko: "임시저장",
    my: "မူကြမ်း",
    zh: "草稿",
  },
  productsStatusActive: {
    ko: "판매중",
    my: "ရောင်းချနေ",
    zh: "在售",
  },
  productsStatusInactive: {
    ko: "비활성",
    my: "ပိတ်ထား",
    zh: "已停用",
  },
  productsStatusSold: {
    ko: "판매완료",
    my: "ရောင်းပြီး",
    zh: "已售",
  },
  productsStatusDeleted: {
    ko: "삭제됨",
    my: "ဖျက်ပြီး",
    zh: "已删除",
  },
  productsDetail: {
    ko: "상세",
    my: "အသေးစိတ်",
    zh: "详情",
  },
  productsEdit: {
    ko: "수정",
    my: "ပြင်မည်",
    zh: "编辑",
  },
  productsArchive: {
    ko: "보관",
    my: "သိမ်းမည်",
    zh: "下架",
  },
  productsArchiveShort: {
    ko: "…",
    my: "…",
    zh: "…",
  },
  productsArchiveTitle: {
    ko: "상품 보관",
    my: "ပစ္စည်းသိမ်းမည်",
    zh: "下架商品",
  },
  productsArchiveMessage: {
    ko: '"{name}"을(를) 보관할까요?',
    my: '"{name}" ကို သိမ်းမလား?',
    zh: "确定下架「{name}」吗？",
  },
  productsAlertCategoryTitle: {
    ko: "카테고리 필요",
    my: "အမျိုးအစားလိုအပ်သည်",
    zh: "需要分类",
  },
  productsAlertCategoryBody: {
    ko: "카테고리를 선택해 주세요.",
    my: "အမျိုးအစားရွေးပါ။",
    zh: "请选择分类。",
  },
  productsAlertMissingTitle: {
    ko: "입력 누락",
    my: "ထည့်သွင်းမှု မပြည့်စုံ",
    zh: "缺少信息",
  },
  productsAlertMissingBody: {
    ko: "제목과 설명을 입력해 주세요.",
    my: "ခေါင်းစီးနှင့် ဖော်ပြချက်ထည့်ပါ။",
    zh: "请填写标题和描述。",
  },
  productsAlertPaymentTitle: {
    ko: "결제 수단",
    my: "ငွေပေးချေမှု နည်းလမ်း",
    zh: "支付方式",
  },
  productsAlertPaymentBody: {
    ko: "결제 수단을 하나 이상 선택해 주세요.",
    my: "ငွေပေးချေမှု နည်းလမ်းတစ်ခုအနည်းဆုံး ရွေးပါ။",
    zh: "请至少选择一种支付方式。",
  },
  productsAlertCoordsTitle: {
    ko: "좌표",
    my: "ကိုဩဒိနိတ်",
    zh: "坐标",
  },
  productsAlertCoordsBody: {
    ko: "위도와 경도는 함께 입력해야 합니다.",
    my: "လတ္တီတွဒ်နှင့် လောင်ဂျီတွဒ်ကို အတူတူ ထည့်ပါ။",
    zh: "纬度和经度需同时填写。",
  },
  productsAlertPriceTitle: {
    ko: "가격 필요",
    my: "စျေးနှုန်းလိုအပ်သည်",
    zh: "需要价格",
  },
  productsAlertPriceBody: {
    ko: "새 상품의 유효한 가격을 입력해 주세요.",
    my: "ပစ္စသစ်အတွက် မှန်ကန်သော စျေးနှုန်းထည့်ပါ။",
    zh: "请为新商品填写有效价格。",
  },
  productsAlertDeliveryFeePayerTitle: {
    ko: "배송비 부담",
    my: "ပို့ဆောင်ခ ပေးချေသူ",
    zh: "运费承担方",
  },
  productsAlertDeliveryFeePayerBody: {
    ko: "배송 가능일 때는 배송비를 BUYER 또는 SELLER 중 하나로 선택해야 합니다.",
    my: "ပို့ဆောင်ရနိုင်သည့်အခါ ပို့ဆောင်ခကို BUYER သို့မဟုတ် SELLER တစ်ခုခုဖြင့် ရွေးပါ။",
    zh: "开启配送时，必须选择由买家或卖家承担运费（BUYER 或 SELLER）。",
  },
  productsAlertImagesLimitTitle: {
    ko: "이미지 개수",
    my: "ပုံ အရေအတွက်",
    zh: "图片数量",
  },
  productsAlertImagesLimitBody: {
    ko: "이미지 URL은 최대 5개까지 보낼 수 있습니다.",
    my: "ပုံ URL အများဆုံး ၅ ခုသာ ပို့နိုင်သည်။",
    zh: "最多只能提交 5 个图片 URL。",
  },
  productsSuccessTitle: {
    ko: "완료",
    my: "ပြီးပါပြီ",
    zh: "完成",
  },
  productsSuccessCreated: {
    ko: "상품이 등록되었습니다.",
    my: "ပစ္စည်းထည့်သွင်းပြီးပါပြီ။",
    zh: "商品已创建。",
  },
  productsSuccessUpdated: {
    ko: "상품이 수정되었습니다.",
    my: "ပစ္စည်းပြင်ဆင်ပြီးပါပြီ။",
    zh: "商品已更新。",
  },
  productsErrorRequestTitle: {
    ko: "요청 실패",
    my: "တောင်းဆိုမှု မအောင်မြင်ပါ",
    zh: "请求失败",
  },
  productsErrorRequestBody: {
    ko: "입력을 확인한 뒤 다시 시도해 주세요.",
    my: "ထည့်သွင်းချက်များစစ်ပြီး ထပ်ကြိုးစားပါ။",
    zh: "请检查输入后重试。",
  },
  productsModalDetailTitle: {
    ko: "내 상품 상세",
    my: "ကျွန်ုပ်၏ ပစ္စည်း အသေးစိတ်",
    zh: "我的商品详情",
  },
  productsModalClose: {
    ko: "닫기",
    my: "ပိတ်မည်",
    zh: "关闭",
  },
  productsModalCreateTitle: {
    ko: "상품 등록",
    my: "ပစ္စည်းအသစ်ထည့်မည်",
    zh: "发布商品",
  },
  productsModalEditTitle: {
    ko: "상품 수정",
    my: "ပစ္စည်းပြင်မည်",
    zh: "编辑商品",
  },
  productsComposerProgress: {
    ko: "{current} / {total} 단계",
    my: "{current} / {total} အဆင့်",
    zh: "第 {current} / {total} 步",
  },
  productsComposerStepHint1: {
    ko: "카테고리, 제목, 설명, 가격·상태를 입력하세요.",
    my: "အမျိုးအစား၊ ခေါင်းစီး၊ ဖော်ပြချက်၊ စျေးနှုန်း၊ အခြေအနေကို ဖြည့်ပါ။",
    zh: "请填写分类、标题、描述、价格和成色。",
  },
  productsComposerStepHint2: {
    ko: "결제 수단과 배송 옵션을 선택하세요.",
    my: "ငွေပေးချေမှု နည်းလမ်းနှင့် ပို့ဆောင်မှု ရွေးချယ်ပါ။",
    zh: "请选择支付方式和配送选项。",
  },
  productsComposerStepHint3: {
    ko: "직거래 장소와 지도, 참고 정보를 입력하세요.",
    my: "တိုက်ရိုက်လဲလှယ်ရာနေရာ၊ မြေပုံနှင့် မှတ်ချက်များ ဖြည့်ပါ။",
    zh: "请填写当面交易地点、地图与补充说明。",
  },
  productsComposerStepHint4: {
    ko: "선호 거래 장소와 이미지 URL을 입력한 뒤 저장하세요.",
    my: "နှစ်သက်နေရာများနှင့် ပုံ URL များ ထည့်ပြီး သိမ်းပါ။",
    zh: "请填写偏好地点与图片地址，然后保存。",
  },
  productsComposerNext: {
    ko: "다음",
    my: "နောက်တစ်ဆင့်",
    zh: "下一步",
  },
  productsComposerBack: {
    ko: "이전",
    my: "နောက်သို့",
    zh: "上一步",
  },
  productsDetailNoData: {
    ko: "데이터가 없습니다.",
    my: "ဒေတာမရှိပါ။",
    zh: "暂无数据。",
  },
  productsDetailLoading: {
    ko: "상품 정보를 불러오는 중…",
    my: "ပစ္စည်းအချက်အလက် တင်နေသည်…",
    zh: "正在加载商品信息…",
  },
  productsDetailSectionListing: {
    ko: "상품 정보",
    my: "ပစ္စည်းအချက်အလက်",
    zh: "商品信息",
  },
  productsDetailSectionTrade: {
    ko: "거래 · 위치",
    my: "လဲလှယ်မှု · တည်နေရာ",
    zh: "交易与位置",
  },
  productsDetailSectionDelivery: {
    ko: "배송",
    my: "ပို့ဆောင်မှု",
    zh: "配送",
  },
  productsDetailSectionPreferred: {
    ko: "선호 거래 장소",
    my: "နှစ်သက်သော လဲလှယ်ရာနေရာများ",
    zh: "偏好交易地点",
  },
  productsDetailSectionPhotos: {
    ko: "사진",
    my: "ဓာတ်ပုံများ",
    zh: "图片",
  },
  productsDetailViewCount: {
    ko: "조회수",
    my: "ကြည့်ရှုမှု",
    zh: "浏览量",
  },
  productsDetailCreatedAt: {
    ko: "등록일",
    my: "တင်သည့်ရက်",
    zh: "发布时间",
  },
  productsDetailUpdatedAt: {
    ko: "수정일",
    my: "ပြင်ဆင်သည့်ရက်",
    zh: "更新时间",
  },
  productsDetailCoordinates: {
    ko: "좌표",
    my: "ကိုဩဒိနိတ်",
    zh: "坐标",
  },
  productsDetailListingId: {
    ko: "상품 ID",
    my: "ပစ္စည်း ID",
    zh: "商品 ID",
  },
  productsPaymentCash: {
    ko: "현금",
    my: "ငွေသား",
    zh: "现金",
  },
  productsPaymentKbzpay: {
    ko: "KBZ Pay",
    my: "KBZ Pay",
    zh: "KBZ Pay",
  },
  productsActiveDealTitle: {
    ko: "진행 중인 거래",
    my: "လက်ရှိ ချုပ်ဆိုမှု",
    zh: "进行中的交易",
  },
  productsActiveDealHint: {
    ko: "이 상품에서 직거래 또는 안전결제를 시작할 수 있는 구매자 채팅을 선택하세요.",
    my: "ဤပစ္စည်းအတွက် တိုက်ရိုက်တွေ့ဆုံ သို့မဟုတ် လုံခြုံငွေပေးချေမှု စတင်နိုင်သော ဝယ်သူ ချတ်ကို ရွေးချယ်ပါ။",
    zh: "选择可为此商品发起当面交易或担保支付的买家聊天。",
  },
  productsActiveDealEmpty: {
    ko: "이 상품에 대한 구매자 채팅이 아직 없습니다.",
    my: "ဤပစ္စည်းအတွက် ဝယ်သူ ချတ်များ မရှိသေးပါ။",
    zh: "该商品暂无买家聊天。",
  },
  productsActiveDealSet: {
    ko: "선택",
    my: "ရွေးချယ်မည်",
    zh: "选择",
  },
  productsActiveDealClear: {
    ko: "해제",
    my: "ဖယ်ရှားမည်",
    zh: "清除",
  },
  productsActiveDealSelected: {
    ko: "선택된 진행 거래",
    my: "ရွေးချယ်ထားသော လက်ရှိ ချုပ်ဆိုမှု",
    zh: "已选进行中的交易",
  },
  productsActiveDealNotSelected: {
    ko: "선택 안 됨",
    my: "မရွေးချယ်ရသေးပါ",
    zh: "未选择",
  },
  productsActiveDealUpdated: {
    ko: "진행 중인 거래가 업데이트되었습니다.",
    my: "လက်ရှိ ချုပ်ဆိုမှုကို ပြင်ဆင်ပြီးပါပြီ။",
    zh: "进行中的交易已更新。",
  },
  productsActiveDealFailed: {
    ko: "진행 중인 거래를 업데이트하지 못했습니다. 다시 시도해 주세요.",
    my: "လက်ရှိ ချုပ်ဆိုမှုကို ပြင်ဆင်၍မရပါ။ ထပ်မံကြိုးစားပါ။",
    zh: "无法更新进行中的交易，请重试。",
  },
  productsDetailEditListing: {
    ko: "수정",
    my: "ပြင်မည်",
    zh: "编辑",
  },
  productsDetailDescription: {
    ko: "설명",
    my: "ဖော်ပြချက်",
    zh: "描述",
  },
  productsDetailPhotosCount: {
    ko: "사진 {current}/{total}",
    my: "ပုံ {current}/{total}",
    zh: "图片 {current}/{total}",
  },
  publicDetailSellerReviews: {
    ko: "리뷰",
    my: "သုံးသပ်ချက်များ",
    zh: "评价",
  },
  publicDetailViewSeller: {
    ko: "판매자 프로필 보기",
    my: "ရောင်းသူ ပရိုဖိုင်ကြည့်ရန်",
    zh: "查看卖家资料",
  },
  publicDetailLoadMoreReviews: {
    ko: "리뷰 더 보기",
    my: "သုံးသပ်ချက်များ ထပ်ကြည့်ရန်",
    zh: "加载更多评价",
  },
  publicDetailChatSeller: {
    ko: "판매자에게 메시지",
    my: "ရောင်းသူကို စာပို့မည်",
    zh: "联系卖家",
  },
  publicDetailChatOpenFailedHint: {
    ko: "채팅방을 열지 못했습니다. 다시 시도해 주세요.",
    my: "ချတ်ခန်း ဖွင့်၍ မရပါ။ ထပ်ကြိုးစားပါ။",
    zh: "无法打开聊天，请重试。",
  },
  publicDetailChatNoAutoSendHint: {
    ko: "대화만 열리며, 메시지를 보내기 전까지 판매자에게 알림이 가지 않습니다.",
    my: "စကားပြောခန်းသာ ဖွင့်မည် — မက်ဆေ့မပို့မချင်း ရောင်းသူထံ အကြောင်းကြားချက် မရပါ။",
    zh: "仅打开对话；在您发送消息前，卖家不会收到通知。",
  },
  publicDetailChatSoon: {
    ko: "채팅 기능은 곧 제공됩니다.",
    my: "ချတ် 기능ကို မကြာမီ ရပါမည်။",
    zh: "聊天功能即将上线。",
  },
  publicProfileTitle: {
    ko: "판매자 프로필",
    my: "ရောင်းသူ ပရိုဖိုင်",
    zh: "卖家资料",
  },
  publicProfileRegion: {
    ko: "지역: {region}",
    my: "ဒေသ: {region}",
    zh: "地区：{region}",
  },
  publicProfileRatingSummary: {
    ko: "★ {avg} · 리뷰 {count}건",
    my: "★ {avg} · သုံးသပ်ချက် {count}",
    zh: "★ {avg} · {count} 条评价",
  },
  publicProfileMemberSince: {
    ko: "가입일",
    my: "အဖွဲ့ဝင်စတင်ရက်",
    zh: "注册时间",
  },
  publicProfileReviewsSection: {
    ko: "리뷰",
    my: "သုံးသပ်ချက်များ",
    zh: "评价",
  },
  publicProfilePrev: {
    ko: "이전",
    my: "ယခင်",
    zh: "上一页",
  },
  publicProfileNext: {
    ko: "다음",
    my: "နောက်",
    zh: "下一页",
  },
  publicProfilePage: {
    ko: "페이지 {page}",
    my: "စာမျက်နှာ {page}",
    zh: "第 {page} 页",
  },
  publicProfileNoComment: {
    ko: "코멘트 없음",
    my: "မှတ်ချက်မရှိ",
    zh: "无评论",
  },
  publicDetailOpenInMaps: {
    ko: "지도 앱에서 열기",
    my: "မြေပုံအက်ပ်တွင် ဖွင့်ရန်",
    zh: "在地图应用中打开",
  },
  publicDetailMapsUnavailable: {
    ko: "지도 앱을 열 수 없습니다.",
    my: "မြေပုံအက်ပ် မဖွင့်နိုင်ပါ။",
    zh: "无法打开地图应用。",
  },
  userRankNewbie: {
    ko: "뉴비",
    my: "အသစ်",
    zh: "新手",
  },
  userRankBronze: {
    ko: "브론즈",
    my: "ကြေးဝါ",
    zh: "青铜",
  },
  userRankSilver: {
    ko: "실버",
    my: "ငွေ",
    zh: "白银",
  },
  userRankGold: {
    ko: "골드",
    my: "ရွှေ",
    zh: "黄金",
  },
  userRankVip: {
    ko: "VIP",
    my: "VIP",
    zh: "VIP",
  },
  productsLabelStatus: {
    ko: "상태",
    my: "အခြေအနေ",
    zh: "状态",
  },
  productsLabelTitle: {
    ko: "제목",
    my: "ခေါင်းစီး",
    zh: "标题",
  },
  productsLabelCondition: {
    ko: "상태(물품)",
    my: "အခြေအနေ (ပစ္စည်း)",
    zh: "成色",
  },
  productsLabelCategoryId: {
    ko: "카테고리 ID",
    my: "အမျိုးအစား ID",
    zh: "分类 ID",
  },
  productsLabelPayment: {
    ko: "결제",
    my: "ငွေပေးချေမှု",
    zh: "支付",
  },
  productsLabelLocation: {
    ko: "거래 장소",
    my: "လဲလှယ်ရာနေရာ",
    zh: "交易地点",
  },
  productsLabelPrice: {
    ko: "가격",
    my: "စျေးနှုန်း",
    zh: "价格",
  },
  productsLabelDescription: {
    ko: "설명",
    my: "ဖော်ပြချက်",
    zh: "描述",
  },
  productsFieldCategory: {
    ko: "카테고리",
    my: "အမျိုးအစား",
    zh: "分类",
  },
  productsFieldTitle: {
    ko: "제목",
    my: "ခေါင်းစီး",
    zh: "标题",
  },
  productsFieldDescription: {
    ko: "설명",
    my: "ဖော်ပြချက်",
    zh: "描述",
  },
  productsFieldPriceCreateOnly: {
    ko: "가격 (신규만)",
    my: "စျေးနှုန်း (အသစ်သာ)",
    zh: "价格（仅新建）",
  },
  productsFieldCondition: {
    ko: "상태(물품)",
    my: "အခြေအနေ (ပစ္စည်း)",
    zh: "成色",
  },
  /** UI label for `ProductCondition` enum; API still receives NEW / LIKE_NEW / … */
  productsConditionNew: {
    ko: "새상품",
    my: "အသစ်",
    zh: "全新",
  },
  productsConditionLikeNew: {
    ko: "거의 새것",
    my: "အသစ်နီးပါး",
    zh: "几乎全新",
  },
  productsConditionGood: {
    ko: "양호",
    my: "ကောင်း",
    zh: "良好",
  },
  productsConditionFair: {
    ko: "보통",
    my: "အလယ်",
    zh: "一般",
  },
  productsConditionPoor: {
    ko: "상태 나쁨",
    my: "မကောင်း",
    zh: "较差",
  },
  productsFieldStatus: {
    ko: "판매 상태",
    my: "ရောင်းချမှု အခြေအနေ",
    zh: "销售状态",
  },
  productsFieldPaymentMethods: {
    ko: "결제 수단",
    my: "ငွေပေးချေမှု နည်းလမ်းများ",
    zh: "支付方式",
  },
  productsFieldDirectLocation: {
    ko: "직거래 장소",
    my: "တိုက်ရိုက် လဲလှယ်ရာနေရာ",
    zh: "当面交易地点",
  },
  productsDirectTradeMapTitle: {
    ko: "직거래 위치 — 지도",
    my: "တိုက်ရိုက် လဲလှယ်ရာ — မြေပုံ",
    zh: "当面交易地点 — 地图",
  },
  productsDirectTradeMapHint: {
    ko: "지도를 탭하거나 핀을 드래그하면 직거래 좌표가 저장됩니다.",
    my: "မြေပုံကို နှိပ်ပါ သို့မဟုတ် ပင်ကို ဆွဲပါ၊ တိုက်ရိုက်လဲလှယ်ရာ ကိုဩဒိနိတ်သိမ်းပါမည်။",
    zh: "点击地图或拖动图钉即可保存当面交易坐标。",
  },
  /** Step 2 — short helper under the direct meet-up address field */
  productsDirectTradeSectionHelp: {
    ko: "주소를 적은 뒤 지도에서 핀을 찍거나, GPS로 현재 위치를 불러올 수 있어요.",
    my: "လိပ်စာရေးပြီးနောက် မြေပုံတွင် ပင်ထိုးပါ သို့မဟုတ် GPS ဖြင့် လက်ရှိတည်နေရာကို ယူပါ။",
    zh: "填写见面地址后，可在地图选点或使用 GPS 定位当前位置。",
  },
  /** Primary action — opens full-screen map picker for direct trade */
  productsDirectTradeOpenMap: {
    ko: "지도에서 위치 정하기",
    my: "မြေပုံတွင် တည်နေရာ ရွေးပါ",
    zh: "在地图上选点",
  },
  /** Secondary — GPS for direct trade pin */
  productsDirectTradeGpsHint: {
    ko: "GPS로 현재 위치를 불러옵니다(위치 권한 필요).",
    my: "GPS ဖြင့် လက်ရှိတည်နေရာကို ယူပါ (တည်နေရာခွင့်ပြုချက် လိုအပ်သည်)။",
    zh: "使用 GPS 读取当前位置（需位置权限）。",
  },
  /** Label above lat/lng when a pin is saved */
  productsDirectTradeCoordsSaved: {
    ko: "선택된 만남 좌표",
    my: "ရွေးချယ်ထားသော တွေ့ဆုံမှု ကိုဩဒိနိတ်",
    zh: "已选见面坐标",
  },
  productsDirectTradeClearPin: {
    ko: "핀 지우기",
    my: "ပင်ဖယ်ရန်",
    zh: "清除图钉",
  },
  productsFieldLatitude: {
    ko: "위도",
    my: "လတ္တီတွဒ်",
    zh: "纬度",
  },
  productsFieldLongitude: {
    ko: "경도",
    my: "လောင်ဂျီတွဒ်",
    zh: "经度",
  },
  productsFieldNearbyLandmarks: {
    ko: "근처 랜드마크",
    my: "အနီးအနား လမ်းမှတ်များ",
    zh: "附近地标",
  },
  productsFieldPreferredTradeTime: {
    ko: "선호 거래 시간",
    my: "အလိုရှိသော အရောင်းအဝယ် အချိန်",
    zh: "偏好交易时间",
  },
  productsFieldMapScreenshotUrl: {
    ko: "지도 스크린샷 이미지",
    my: "မြေပုံ screenshot ပုံ",
    zh: "地图截图图片",
  },
  productsFieldPreferredLocations: {
    ko: "선호 거래 장소 (최대 3개)",
    my: "နှစ်သက်သော လဲလှယ်နေရာများ (အများဆုံး ၃ ခု)",
    zh: "偏好交易地点（最多3个）",
  },
  productsPreferredLocationsIntro: {
    ko: "직거래 외 추가로 만나기 좋은 곳입니다. 각 줄마다 이름과 주소가 필요하며, 지도에서 핀으로 위치를 선택할 수 있습니다(선택).",
    my: "တိုက်ရိုက်လဲလှယ်မှု အပြင် ထပ်မံတွေ့ရန် နေရာများ။ တစ်ကြောင်းလျှင် အမည်နှင့် လိပ်စာ လိုအပ်သည်။ မြေပုံပေါ်တွင် ပင်ထိုးခြင်းဖြင့် တည်နေရာ ရွေးချယ်နိုင်သည်။",
    zh: "除当面交易点外，可添加最多 3 个备选见面点；每行需填写名称和地址，并可通过地图选点（可选）。",
  },
  productsFieldPreferredLocationItem: {
    ko: "거래 장소",
    my: "လဲလှယ်နေရာ",
    zh: "交易地点",
  },
  productsFieldImages: {
    ko: "상품 이미지",
    my: "ကုန်ပစ္စည်း ပုံများ",
    zh: "商品图片",
  },
  productsPickImages: {
    ko: "이미지 업로드",
    my: "ပုံတင်ရန်",
    zh: "上传图片",
  },
  productsPickMapScreenshot: {
    ko: "지도 스크린샷 업로드",
    my: "မြေပုံ screenshot တင်ရန်",
    zh: "上传地图截图",
  },
  productsClearSelectedImages: {
    ko: "선택한 이미지 지우기",
    my: "ရွေးထားသော ပုံများ ဖယ်ရှားရန်",
    zh: "清除已选图片",
  },
  productsClearMapScreenshot: {
    ko: "스크린샷 지우기",
    my: "screenshot ဖယ်ရှားရန်",
    zh: "清除截图",
  },
  productsSelectedImagesCount: {
    ko: "{count}개 이미지 선택됨",
    my: "ပုံ {count} ခု ရွေးထားသည်",
    zh: "已选择 {count} 张图片",
  },
  productsSelectedMapScreenshot: {
    ko: "선택된 스크린샷: {name}",
    my: "ရွေးထားသော screenshot: {name}",
    zh: "已选截图：{name}",
  },
  productsExistingImagesCount: {
    ko: "현재 등록 이미지: {count}개",
    my: "လက်ရှိပုံများ: {count} ခု",
    zh: "当前图片：{count} 张",
  },
  productsExistingMapScreenshot: {
    ko: "현재 지도 스크린샷이 등록되어 있습니다.",
    my: "လက်ရှိ မြေပုံ screenshot ရှိပါသည်။",
    zh: "当前已存在地图截图。",
  },
  productsFieldDeliveryFeePayer: {
    ko: "배송비 부담",
    my: "ပို့ဆောင်ခ တာဝန်",
    zh: "运费承担",
  },
  productsFieldDelivery: {
    ko: "배송",
    my: "ပို့ဆောင်မှု",
    zh: "配送",
  },
  productsPlaceholderTitle: {
    ko: "예: iPhone 13 Pro Max",
    my: "ဥပမာ iPhone 13 Pro Max",
    zh: "例如 iPhone 13 Pro Max",
  },
  productsPlaceholderDescription: {
    ko: "예: 스크래치 없음, 배터리 87%",
    my: "ဥပမာ အကွာအဝေးမရှိ၊ ဘက်ထရီ ၈၇%",
    zh: "例如：无划痕，电池 87%",
  },
  productsPlaceholderPrice: {
    ko: "980000",
    my: "980000",
    zh: "980000",
  },
  productsPlaceholderLocation: {
    ko: "예: 파베단 타운শ립",
    my: "ဥပမာ ပါဘေဒန် မြို့နယ်",
    zh: "例如帕贝丹镇区",
  },
  productsPlaceholderLat: {
    ko: "위도",
    my: "လတ္တီတွဒ်",
    zh: "纬度",
  },
  productsPlaceholderLng: {
    ko: "경도",
    my: "လောင်ဂျီတွဒ်",
    zh: "经度",
  },
  productsMapPickHint: {
    ko: "현재 위치를 불러오거나, 지도에서 거래 지점을 선택하세요.",
    my: "လက်ရှိတည်နေရာယူပါ သို့မဟုတ် မြေပုံပေါ်တွင် လဲလှယ်နေရာရွေးပါ။",
    zh: "请获取当前位置，或在地图上选择交易点。",
  },
  productsMapUseCurrent: {
    ko: "현재 위치로 지도 시작",
    my: "လက်ရှိတည်နေရာဖြင့် မြေပုံစတင်",
    zh: "使用当前位置",
  },
  productsMapUpdateFromCurrent: {
    ko: "현재 위치로 갱신",
    my: "လက်ရှိတည်နေရာဖြင့် ပြန်လည်သတ်မှတ်",
    zh: "用当前位置更新",
  },
  productsMapLocating: {
    ko: "위치 확인 중…",
    my: "တည်နေရာရှာနေသည်…",
    zh: "定位中…",
  },
  productsPreferredLocationAdd: {
    ko: "+ 장소 추가",
    my: "+ နေရာ ထည့်ရန်",
    zh: "+ 添加地点",
  },
  productsPreferredLocationRemove: {
    ko: "삭제",
    my: "ဖျက်ရန်",
    zh: "删除",
  },
  productsPreferredLocationPickMap: {
    ko: "지도에서 위치 선택",
    my: "မြေပုံပေါ်မှ တည်နေရာရွေးပါ",
    zh: "在地图上选择位置",
  },
  productsPreferredLocationClearPin: {
    ko: "지도 핀 지우기",
    my: "မြေပုံပင်ဖယ်ရန်",
    zh: "清除地图定位",
  },
  productsPreferredLocationNoPin: {
    ko: "지도 위치 미설정 (선택)",
    my: "မြေပုံတည်နေရာ မသတ်မှတ်ရသေး (ရွေးချယ်)",
    zh: "尚未设置地图位置（可选）",
  },
  productsPreferredLocationMapTitle: {
    ko: "선호 장소 {index} — 지도",
    my: "နှစ်သက်နေရာ {index} — မြေပုံ",
    zh: "偏好地点 {index} — 地图",
  },
  productsPreferredLocationMapHint: {
    ko: "지도를 탭하거나 핀을 드래그하면 이 장소의 좌표가 저장됩니다.",
    my: "မြေပုံကို နှိပ်ပါ သို့မဟုတ် ပင်ကို ဆွဲပါ၊ ဤနေရာ၏ ကိုဩဒိနိတ်သိမ်းပါမည်။",
    zh: "点击地图或拖动图钉即可保存该地点的坐标。",
  },
  productsAlertPreferredLocationTitle: {
    ko: "선호 거래 장소 확인",
    my: "နှစ်သက်နေရာ စစ်ဆေးပါ",
    zh: "请检查偏好交易地点",
  },
  productsAlertPreferredLocationBody: {
    ko: "선호 거래 장소는 label과 address를 모두 입력해야 합니다.",
    my: "နှစ်သက်နေရာတွင် label နှင့် address ကို နှစ်ခုလုံး ဖြည့်ပါ။",
    zh: "偏好交易地点必须同时填写 label 和 address。",
  },
  productsPlaceholderNearbyLandmarks: {
    ko: "예: 술레 파고다 신호등 근처",
    my: "ဥပမာ Sule Pagoda မီးပွိုင့်အနီး",
    zh: "例如：苏雷宝塔红绿灯附近",
  },
  productsPlaceholderPreferredTradeTime: {
    ko: "예: 평일 오후 6시 이후",
    my: "ဥပမာ အပတ်စဉ် ညနေ ၆ နာရီနောက်ပိုင်း",
    zh: "例如：工作日晚上6点后",
  },
  productsPlaceholderMapScreenshotUrl: {
    ko: "https://.../map-shot.jpg",
    my: "https://.../map-shot.jpg",
    zh: "https://.../map-shot.jpg",
  },
  productsPlaceholderPreferredLocationLabel: {
    ko: "예: 백화점 정문, 지하철 3번 출구",
    my: "ဥပမာ − ဈေးအဝင်ပေါက်၊ မီထရာ ထွက်ပေါက်",
    zh: "例如：商场正门、地铁A口",
  },
  productsPlaceholderPreferredLocationAddress: {
    ko: "예: Pabedan Township, Yangon",
    my: "ဥပမာ Pabedan Township, Yangon",
    zh: "例如：Pabedan Township, Yangon",
  },
  productsPlaceholderPreferredLocationLatitude: {
    ko: "위도 (선택)",
    my: "လတ္တီတွဒ် (ရွေးချယ်)",
    zh: "纬度（可选）",
  },
  productsPlaceholderPreferredLocationLongitude: {
    ko: "경도 (선택)",
    my: "လောင်ဂျီတွဒ် (ရွေးချယ်)",
    zh: "经度（可选）",
  },
  productsPlaceholderImages: {
    ko: "https://.../1.jpg, https://.../2.jpg",
    my: "https://.../1.jpg, https://.../2.jpg",
    zh: "https://.../1.jpg, https://.../2.jpg",
  },
  productsAlertImagePermissionBody: {
    ko: "사진 접근 권한이 필요합니다.",
    my: "ဓာတ်ပုံခန်းသို့ ဝင်ခွင့်လိုအပ်ပါသည်။",
    zh: "需要照片访问权限。",
  },
  productsAlertImageTypeTitle: {
    ko: "이미지 형식 오류",
    my: "ပုံဖော်မတ် အမှား",
    zh: "图片格式错误",
  },
  productsAlertImageTypeBody: {
    ko: "PNG, JPEG, WebP 파일만 업로드할 수 있습니다.",
    my: "PNG, JPEG, WebP ပုံများသာ တင်နိုင်ပါသည်။",
    zh: "仅支持 PNG、JPEG、WebP。",
  },
  productsAlertImageSizeTitle: {
    ko: "이미지 크기 오류",
    my: "ပုံအရွယ်အစား အမှား",
    zh: "图片大小错误",
  },
  productsAlertImageSizeBody: {
    ko: "이미지 한 장은 4MB 이하여야 합니다.",
    my: "ပုံတစ်ပုံလျှင် 4MB အောက် ဖြစ်ရပါမည်။",
    zh: "单张图片必须小于 4MB。",
  },
  productsDeliveryOn: {
    ko: "배송 가능",
    my: "ပို့ဆောင်ရန်",
    zh: "可配送",
  },
  productsDeliveryOff: {
    ko: "배송 불가",
    my: "ပို့ဆောင်မရ",
    zh: "不可配送",
  },
  productsDeliveryBuyerPays: {
    ko: "구매자 부담",
    my: "ဝယ်သူပေးချေ",
    zh: "买家承担",
  },
  productsDeliverySellerPays: {
    ko: "판매자 부담",
    my: "ရောင်းသူပေးချေ",
    zh: "卖家承担",
  },
  productsSaveCreate: {
    ko: "등록",
    my: "ထည့်မည်",
    zh: "创建",
  },
  productsSaveUpdate: {
    ko: "수정 저장",
    my: "ပြင်ပြီး သိမ်းမည်",
    zh: "保存修改",
  },
  productsSaving: {
    ko: "저장 중…",
    my: "သိမ်းနေသည်…",
    zh: "保存中…",
  },
  loginPasswordLabel: { ko: "비밀번호", my: "စကားဝှက်", zh: "密码" },
  loginVerifyRequiredFallback: {
    ko: "로그인 전에 전화와 이메일 인증이 필요합니다",
    my: "ဝင်ရန်မီ ဖုန်းနှင့် အီးမေးလ် အတည်ပြုရန်လိုအပ်သည်",
    zh: "登录前需要完成手机和邮箱验证",
  },
  skipVerification: {
    ko: "인증 건너뛰기",
    my: "အတည်ပြုခြင်းကို ကျော်ရန်",
    zh: "跳过验证",
  },
  skipVerificationText: {
    ko: "인증을 건너뛰고 로그인으로 이동합니다.",
    my: "အတည်ပြုခြင်းကို ကျော်ပြီး လော့ဂ်အင်သို့ သွားပါ။",
    zh: "跳过验证并前往登录。",
  },
  actionCancel: { ko: "취소", my: "မလုပ်တော့", zh: "取消" },
  actionVerify: { ko: "인증", my: "အတည်ပြု", zh: "验证" },
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

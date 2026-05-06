import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { AppLocale } from "@/core/domain/types/locale";
import { useServices } from "./ServicesProvider";

type Dictionary = Record<string, Record<AppLocale, string>>;

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
  referralId: { ko: "추천인 코드", my: "အကြံပြုသူ ID", zh: "推荐人代码" },
  optional: { ko: "선택사항", my: "ရွေးချယ်", zh: "选填" },
  referralPlaceholder: {
    ko: "추천인 아이디를 입력하세요",
    my: "အကြံပြုသူအမည်ထည့်ပါ",
    zh: "请输入推荐人 ID",
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
    ko: "Ask admin to send the KBZPay transfer instruction.",
    my: "Ask admin to send the KBZPay transfer instruction.",
    zh: "Ask admin to send the KBZPay transfer instruction.",
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
    ko: "Transfer exactly 100 MMK, then submit your transaction number.",
    my: "Transfer exactly 100 MMK, then submit your transaction number.",
    zh: "Transfer exactly 100 MMK, then submit your transaction number.",
  },
  kbzPayStatusPendingInstruction: {
    ko: "Pending admin instruction",
    my: "Pending admin instruction",
    zh: "Pending admin instruction",
  },
  kbzPayStatusInstructionReady: {
    ko: "Instruction sent",
    my: "Instruction sent",
    zh: "Instruction sent",
  },
  kbzPayStatusTransactionSubmitted: {
    ko: "Transaction submitted",
    my: "Transaction submitted",
    zh: "Transaction submitted",
  },
  kbzPayWaitInstructionHint: {
    ko: "Wait for admin transfer instruction.",
    my: "Wait for admin transfer instruction.",
    zh: "Wait for admin transfer instruction.",
  },
  kbzPayAmountLabel: {
    ko: "Transfer amount",
    my: "Transfer amount",
    zh: "Transfer amount",
  },
  kbzPayAmountValue: {
    ko: "100 MMK",
    my: "100 MMK",
    zh: "100 MMK",
  },
  kbzPayAdminPhoneLabel: {
    ko: "Admin Phone For Transfer",
    my: "Admin Phone For Transfer",
    zh: "Admin Phone For Transfer",
  },
  kbzPayAdminNoteLabel: {
    ko: "Admin Note",
    my: "Admin Note",
    zh: "Admin Note",
  },
  kbzPayTxnIdLabel: {
    ko: "KBZ Transaction ID",
    my: "KBZ Transaction ID",
    zh: "KBZ Transaction ID",
  },
  kbzPayTxnIdPlaceholder: {
    ko: "KBZ-TXN-20260506-000321",
    my: "KBZ-TXN-20260506-000321",
    zh: "KBZ-TXN-20260506-000321",
  },
  submitTransaction: {
    ko: "Submit Transaction",
    my: "Submit Transaction",
    zh: "Submit Transaction",
  },
  kbzPayTransactionSubmitted: {
    ko: "KBZ transaction number submitted.",
    my: "KBZ transaction number submitted.",
    zh: "KBZ transaction number submitted.",
  },
  kbzPaySubmittedHint: {
    ko: "Transaction submitted, awaiting admin verification.",
    my: "Transaction submitted, awaiting admin verification.",
    zh: "Transaction submitted, awaiting admin verification.",
  },
  kbzPaySubmittedTxnLabel: {
    ko: "Submitted transaction",
    my: "Submitted transaction",
    zh: "Submitted transaction",
  },
  kbzPayTxnRequired: {
    ko: "KBZPay transaction number is required.",
    my: "KBZPay transaction number is required.",
    zh: "KBZPay transaction number is required.",
  },
  kbzPayTxnInvalid: {
    ko: "Enter a valid KBZPay transaction number.",
    my: "Enter a valid KBZPay transaction number.",
    zh: "Enter a valid KBZPay transaction number.",
  },
  kbzPayNeedsVerificationFirst: {
    ko: "Please verify phone and email first.",
    my: "Please verify phone and email first.",
    zh: "Please verify phone and email first.",
  },
  profileTitle: { ko: "프로필", my: "ပရိုဖိုင်", zh: "个人资料" },
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
    my: "မအတည်ပြုရသေး",
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
  signOutButton: { ko: "로그아웃", my: "ထွက်မည်", zh: "退出登录" },
  tabsHome: { ko: "홈", my: "ပင်မ", zh: "首页" },
  tabsProducts: { ko: "상품", my: "ပစ္စည်းများ", zh: "商品" },
  tabsExplore: { ko: "탐색", my: "စူးစမ်း", zh: "探索" },
  tabsProfile: { ko: "프로필", my: "ပရိုဖိုင်", zh: "个人资料" },
  homeWelcome: { ko: "환영합니다", my: "ကြိုဆိုပါသည်", zh: "欢迎" },
  homeBrandTitle: { ko: "Flex Used Market", my: "Flex Used Market", zh: "Flex Used Market" },
  homeDashboardSubtitle: {
    ko: "중고거래 대시보드입니다.",
    my: "အသုံးပြုပြီး ပစ္စည်း စျေးကွက် ဒက်ရှ်ဘုတ်",
    zh: "你的二手市场仪表板。",
  },
  loginPasswordLabel: { ko: "비밀번호", my: "စကားဝှက်", zh: "密码" },
  loginVerifyRequiredFallback: {
    ko: "로그인 전에 전화와 이메일 인증이 필요합니다",
    my: "ဝင်ရန်မီ ဖုန်းနှင့် အီးမေးလ် အတည်ပြုရန်လိုအပ်သည်",
    zh: "登录前需要完成手机和邮箱验证",
  },
  actionCancel: { ko: "취소", my: "မလုပ်တော့", zh: "取消" },
  actionVerify: { ko: "인증", my: "အတည်ပြု", zh: "验证" },
};

function t(key: keyof typeof DICT, locale: AppLocale): string {
  return DICT[key][locale];
}

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => Promise<void>;
  t: (key: keyof typeof DICT) => string;
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




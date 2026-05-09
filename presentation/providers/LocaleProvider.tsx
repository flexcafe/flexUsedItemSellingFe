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
  notificationsTitle: { ko: "알림함", my: "အသိပေးစာများ", zh: "通知收件箱" },
  notificationsEmpty: {
    ko: "아직 알림이 없습니다.",
    my: "အသိပေးချက် မရှိသေးပါ။",
    zh: "暂无通知。",
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

function formatTemplate(template: string, vars?: Record<string, unknown>): string {
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



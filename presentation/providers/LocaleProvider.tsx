import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  PreferencesStorage,
  type AppLocale,
} from "@/core/infrastructure/storage/PreferencesStorage";

type Dictionary = Record<string, Record<AppLocale, string>>;

const DICT: Dictionary = {
  appName: { ko: "Flex Cafe", my: "Flex Cafe", zh: "Flex Cafe" },
  signInSubtitle: {
    ko: "계정에 로그인하세요",
    my: "သင့်အကောင့်သို့ ဝင်ရောက်ပါ",
    zh: "登录你的账号",
  },
  phone: { ko: "전화번호", my: "ဖုန်းနံပါတ်", zh: "手机号" },
  facebookId: { ko: "페이스북 ID", my: "ဖေ့စ်ဘွတ် ID", zh: "Facebook ID" },
  password: { ko: "비밀번호", my: "စကားဝှက်", zh: "密码" },
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
  phoneRequired: { ko: "전화번호를 입력하세요", my: "ဖုန်းနံပါတ် လိုအပ်သည်", zh: "请输入手机号" },
  facebookIdRequired: {
    ko: "Facebook ID를 입력하세요",
    my: "Facebook ID လိုအပ်သည်",
    zh: "请输入 Facebook ID",
  },
  passwordRequired: { ko: "비밀번호를 입력하세요", my: "စကားဝှက် လိုအပ်သည်", zh: "请输入密码" },
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await PreferencesStorage.getLocale();
      if (mounted && saved) setLocaleState(saved);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setLocale = useCallback(async (next: AppLocale) => {
    setLocaleState(next);
    await PreferencesStorage.setLocale(next);
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => t(key, locale),
    }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}


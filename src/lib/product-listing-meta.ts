import { Locale } from "./i18n";

type ListingMeta = {
  minimum: string;
  maximum: string;
  averageTime: string;
};

const listingMeta: Record<
  string,
  Record<Locale, ListingMeta>
> = {
  "gpt-plus-pro": {
    zh: { minimum: "1", maximum: "10", averageTime: "5 到 30 分钟" },
    en: { minimum: "1", maximum: "10", averageTime: "5 to 30 min" },
    ko: { minimum: "1", maximum: "10", averageTime: "5~30분" },
  },
  "claude-pro": {
    zh: { minimum: "1", maximum: "3", averageTime: "15 到 60 分钟" },
    en: { minimum: "1", maximum: "3", averageTime: "15 to 60 min" },
    ko: { minimum: "1", maximum: "3", averageTime: "15~60분" },
  },
  "gemini-pro": {
    zh: { minimum: "1", maximum: "5", averageTime: "10 到 30 分钟" },
    en: { minimum: "1", maximum: "5", averageTime: "10 to 30 min" },
    ko: { minimum: "1", maximum: "5", averageTime: "10~30분" },
  },
  "notion-ai-plus": {
    zh: { minimum: "1", maximum: "10", averageTime: "10 到 30 分钟" },
    en: { minimum: "1", maximum: "10", averageTime: "10 to 30 min" },
    ko: { minimum: "1", maximum: "10", averageTime: "10~30분" },
  },
  "midjourney-standard": {
    zh: { minimum: "1", maximum: "5", averageTime: "15 到 45 分钟" },
    en: { minimum: "1", maximum: "5", averageTime: "15 to 45 min" },
    ko: { minimum: "1", maximum: "5", averageTime: "15~45분" },
  },
  "canva-pro-team": {
    zh: { minimum: "1", maximum: "20", averageTime: "5 到 20 分钟" },
    en: { minimum: "1", maximum: "20", averageTime: "5 to 20 min" },
    ko: { minimum: "1", maximum: "20", averageTime: "5~20분" },
  },
  "perplexity-pro": {
    zh: { minimum: "1", maximum: "8", averageTime: "10 到 30 分钟" },
    en: { minimum: "1", maximum: "8", averageTime: "10 to 30 min" },
    ko: { minimum: "1", maximum: "8", averageTime: "10~30분" },
  },
  "spotify-family": {
    zh: { minimum: "1", maximum: "3", averageTime: "10 到 40 分钟" },
    en: { minimum: "1", maximum: "3", averageTime: "10 to 40 min" },
    ko: { minimum: "1", maximum: "3", averageTime: "10~40분" },
  },
  "netflix-premium": {
    zh: { minimum: "1", maximum: "4", averageTime: "15 到 40 分钟" },
    en: { minimum: "1", maximum: "4", averageTime: "15 to 40 min" },
    ko: { minimum: "1", maximum: "4", averageTime: "15~40분" },
  },
  "disney-annual": {
    zh: { minimum: "1", maximum: "2", averageTime: "当天内" },
    en: { minimum: "1", maximum: "2", averageTime: "Same day" },
    ko: { minimum: "1", maximum: "2", averageTime: "당일 처리" },
  },
  "youtube-premium-family": {
    zh: { minimum: "1", maximum: "3", averageTime: "10 到 30 分钟" },
    en: { minimum: "1", maximum: "3", averageTime: "10 to 30 min" },
    ko: { minimum: "1", maximum: "3", averageTime: "10~30분" },
  },
  "apple-music-family": {
    zh: { minimum: "1", maximum: "3", averageTime: "10 到 30 分钟" },
    en: { minimum: "1", maximum: "3", averageTime: "10 to 30 min" },
    ko: { minimum: "1", maximum: "3", averageTime: "10~30분" },
  },
  "hbo-max-standard": {
    zh: { minimum: "1", maximum: "4", averageTime: "15 到 40 分钟" },
    en: { minimum: "1", maximum: "4", averageTime: "15 to 40 min" },
    ko: { minimum: "1", maximum: "4", averageTime: "15~40분" },
  },
  "crunchyroll-premium": {
    zh: { minimum: "1", maximum: "5", averageTime: "10 到 30 分钟" },
    en: { minimum: "1", maximum: "5", averageTime: "10 to 30 min" },
    ko: { minimum: "1", maximum: "5", averageTime: "10~30분" },
  },
};

const fallbackMeta: Record<Locale, ListingMeta> = {
  zh: { minimum: "1", maximum: "5", averageTime: "10 到 30 分钟" },
  en: { minimum: "1", maximum: "5", averageTime: "10 to 30 min" },
  ko: { minimum: "1", maximum: "5", averageTime: "10~30분" },
};

export function getProductListingMeta(slug: string, locale: Locale) {
  return listingMeta[slug]?.[locale] ?? fallbackMeta[locale];
}

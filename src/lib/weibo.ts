type WeiboHotSearchResponse = {
  data: {
    realtime: Array<{
      word: string;
      num: number;
      onboard_time?: number;
      label_name?: string;
      icon?: string;
      word_scheme?: string;
    }>;
  };
};

export type WeiboTopic = {
  rank: number;
  word: string;
  num: number;
  label: string;
  url: string;
};

export async function getWeiboHotSearch(): Promise<WeiboTopic[]> {
  const res = await fetch('https://weibo.com/ajax/side/hotSearch', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Referer': 'https://weibo.com/',
      'Accept': 'application/json, text/plain, */*',
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) throw new Error(`Weibo API error: ${res.status}`);

  const data = (await res.json()) as WeiboHotSearchResponse;

  return data.data.realtime.slice(0, 30).map((item, i) => ({
    rank: i + 1,
    word: item.word,
    num: item.num,
    label: item.label_name ?? '',
    url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word_scheme ?? item.word)}`,
  }));
}

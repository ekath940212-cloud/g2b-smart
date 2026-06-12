export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');

  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { keyword, startDt, endDt, apiKey } = req.query;

  if (!keyword || !apiKey) return res.status(400).json({ error: 'params missing' });

  const endpoints = [

        'getBidPblancListInfoServc',

        'getBidPblancListInfoCnstwk',

        'getBidPblancListInfoThng',

        'getBidPblancListInfoEtc',

      ];

  // 날짜를 7일 단위로 쪼개기

  const start = new Date(startDt.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));

  const end = new Date(endDt.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));

  const dateRanges = [];

  let cur = new Date(start);

  while (cur <= end) {

      const next = new Date(cur);

      next.setDate(next.getDate() + 6);

      if (next > end) next.setTime(end.getTime());

      const fmt = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;

      dateRanges.push({ sd: fmt(cur)+'0000', ed: fmt(next)+'2359' });

      cur = new Date(next);

      cur.setDate(cur.getDate() + 1);

  }

  try {

      const allFetches = [];

      for (const ep of endpoints) {

          for (const { sd, ed } of dateRanges) {

                const url = new URL(`https://apis.data.go.kr/1230000/ad/BidPublicInfoService/${ep}`);

                url.searchParams.set('serviceKey', apiKey);

                url.searchParams.set('numOfRows', '100');

                url.searchParams.set('pageNo', '1');

                url.searchParams.set('inqryDiv', '1');

                url.searchParams.set('type', 'json');

                url.searchParams.set('bidNtceNm', keyword);

                url.searchParams.set('inqryBgnDt', sd);

                url.searchParams.set('inqryEndDt', ed);

                allFetches.push(

                            fetch(url.toString())

                              .then(r => r.json())

                              .then(d => {

                                                  const items = d?.response?.body?.items?.item;

                                                  return !items ? [] : Array.isArray(items) ? items : [items];

                              })

                              .catch(() => [])

                          );

          }

      }

      const results = await Promise.all(allFetches);

      const allItems = results.flat();

      // 중복 제거

      const seen = new Set();

      const items = allItems.filter(item => {

                                          const id = item.bidNtceNo || JSON.stringify(item).slice(0, 60);

                                          if (seen.has(id)) return false;

                                          seen.add(id); return true;

      });

      res.status(200).json({ items, totalCount: items.length });

  } catch(e) {

      res.status(500).json({ error: e.message });

  }

}

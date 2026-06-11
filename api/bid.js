export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');

  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { keyword, startDt, endDt, apiKey } = req.query;

  if (!keyword || !apiKey) return res.status(400).json({ error: 'params missing' });

  const sd = (startDt || '20250101') + '0000';

  const ed = (endDt || '20261231') + '2359';

  const endpoints = [

        'getBidPblancListInfoServcPPSSrch',

        'getBidPblancListInfoCnstwkPPSSrch',

        'getBidPblancListInfoThngPPSSrch',

        'getBidPblancListInfoEtcPPSSrch',

      ];

  try {

      const fetches = endpoints.map(ep => {

                                          const url = new URL(`https://apis.data.go.kr/1230000/BidPublicInfoService/${ep}`);

                                          url.searchParams.set('serviceKey', apiKey);
                                          url.searchParams.set('inqryDiv', '1');

                                          url.searchParams.set('numOfRows', '100');

                                          url.searchParams.set('pageNo', '1');

                                          url.searchParams.set('type', 'json');

                                          url.searchParams.set('bidNtceNm', keyword);

                                          url.searchParams.set('inqryBgnDt', sd);

                                          url.searchParams.set('inqryEndDt', ed);

                                          return fetch(url.toString())

                                            .then(r => r.json())

                                            .then(d => {

                                                            const items = d?.response?.body?.items?.item;

                                                            return !items ? [] : Array.isArray(items) ? items : [items];

                                            })

                                            .catch(() => []);

      });

      const results = await Promise.all(fetches);

      const allItems = results.flat();

      const seen = new Set();

      const items = allItems.filter(item => {

                                          const id = item.bidNtceNo || JSON.stringify(item).slice(0, 50);

                                          if (seen.has(id)) return false;

                                          seen.add(id); return true;

      });

      res.status(200).json({ items, totalCount: items.length });

  } catch(e) {

      res.status(500).json({ error: e.message });

  }

}

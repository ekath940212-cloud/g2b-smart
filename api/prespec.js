export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');

  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const G2B_API_KEY = process.env.G2B_API_KEY;

  if (!G2B_API_KEY) return res.status(500).json({ error: 'API 키 누락' });

  const { keyword, startDt, endDt } = req.query;

  if (!keyword) return res.status(400).json({ error: 'keyword 필요' });

  const sd = (startDt || '20250101') + '0000';

  const ed = (endDt || '20261231') + '2359';

  const endpoints = [

        'getPublicPrcureThngInfoServcPPSSrch',

        'getPublicPrcureThngInfoCnstwkPPSSrch',

        'getPublicPrcureThngInfoThngPPSSrch',

        'getPublicPrcureThngInfoFrgcptPPSSrch',

      ];

  try {

      const fetches = endpoints.map(ep => {

                                          const url = new URL(`https://apis.data.go.kr/1230000/ao/HrcspSsstndrdInfoService/${ep}`);

                                          url.searchParams.set('serviceKey', G2B_API_KEY);

                                          url.searchParams.set('numOfRows', '100');

                                          url.searchParams.set('pageNo', '1');

                                          url.searchParams.set('inqryDiv', '1');

                                          url.searchParams.set('type', 'json');

                                          url.searchParams.set('inqryBgnDt', sd);

                                          url.searchParams.set('inqryEndDt', ed);

                                          url.searchParams.set('prdctClsfcNoNm', keyword);

                                          return fetch(url.toString())

                                            .then(r => r.json())

                                            .then(d => {

                                                            const body = d?.response?.body;

                                                            const items = body?.items?.item || body?.items;

                                                            return !items ? [] : Array.isArray(items) ? items : [items];

                                            })

                                            .catch(() => []);

      });

      let items = (await Promise.all(fetches)).flat();

      const seen = new Set();

      items = items.filter(item => {

                                 const id = item.bfSpecRgsNo || JSON.stringify(item).slice(0,50);

                                 if (seen.has(id)) return false;

                                 seen.add(id); return true;

      });

      const mapped = items.map(item => ({

                                              ...item,

              _isPreSpec: true,

              bidNtceNm: item.prdctClsfcNoNm || '',

              ntceInsttNm: item.dminsttNm || '',

              asignBdgtAmt: item.asignBdgtAmt || null,

              ntceDt: item.rcptDt || '',

              bidClseDt: item.opninRcptClseDt || '',

              prcrmntReqNo: item.bfSpecRgsNo || '',

      }));

      res.status(200).json({ items: mapped, totalCount: mapped.length });

  } catch(e) {

      res.status(500).json({ error: e.message });

  }

}

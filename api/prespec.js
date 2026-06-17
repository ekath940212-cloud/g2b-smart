export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const G2B_API_KEY = process.env.G2B_API_KEY;
  if (!G2B_API_KEY) return res.status(500).json({ error: 'API 키 누락' });

  const { keyword, startDt, endDt } = req.query;
  if (!keyword) return res.status(400).json({ error: 'keyword 필요' });

  const sd = startDt || '20250101';
  const ed = endDt || '20261231';

  // 사전규격공개 API: 나라장터 공공데이터 사전공개 정보 서비스
  // 입찰공고 사전규격공개 목록 엔드포인트
  const endpoints = [
    'https://apis.data.go.kr/1230000/ao/BidPublicInfoService/getBidPblancListInfoServcPPSSrch',
  ];

  try {
    // 사전규격공개 전용 API 엔드포인트 시도
    const url = new URL('https://apis.data.go.kr/1230000/ao/PlanPublicInfoService/getPlanlnfoList');
    url.searchParams.set('serviceKey', G2B_API_KEY);
    url.searchParams.set('numOfRows', '100');
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('type', 'json');
    url.searchParams.set('inqryBgnDt', sd);
    url.searchParams.set('inqryEndDt', ed);
    url.searchParams.set('prdctClsfcNoNm', keyword);

    const r = await fetch(url.toString());
    const rawText = await r.text();

    let d;
    try { d = JSON.parse(rawText); }
    catch(parseErr) {
      return res.status(500).json({
        error: 'API parse error',
        raw: rawText.substring(0, 300),
        url: url.toString().replace(G2B_API_KEY, 'HIDDEN')
      });
    }

    const body = d?.response?.body;
    const items = body?.items?.item || body?.items;
    const list = !items ? [] : Array.isArray(items) ? items : [items];

    const filtered = list.filter(item => {
      const nm = (item.prdctClsfcNoNm || item.bsnsSumryCn || item.bidNtceNm || '').toLowerCase();
      return nm.includes(keyword.toLowerCase());
    });

    res.status(200).json({
      items: filtered.map(i => ({ ...i, _isPreSpec: true })),
      totalCount: filtered.length,
      _debug_total: list.length
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}

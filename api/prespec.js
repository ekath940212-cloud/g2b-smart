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

  // 사전규격공개 API 후보 엔드포인트들 순서대로 시도
  const candidateUrls = [
    'https://apis.data.go.kr/1230000/ad/PrePbancService/getPrePbancList',
    'https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServcPPSSrch',
  ];

  for (const baseUrl of candidateUrls) {
    try {
      const url = new URL(baseUrl);
      url.searchParams.set('serviceKey', G2B_API_KEY);
      url.searchParams.set('numOfRows', '100');
      url.searchParams.set('pageNo', '1');
      url.searchParams.set('type', 'json');
      url.searchParams.set('inqryBgnDt', sd + '0000');
      url.searchParams.set('inqryEndDt', ed + '2359');
      url.searchParams.set('bidNtceNm', keyword);

      const r = await fetch(url.toString());
      const rawText = await r.text();

      if (rawText.includes('API not found')) continue; // 다음 후보 시도

      let d;
      try { d = JSON.parse(rawText); }
      catch(e) {
        return res.status(500).json({ error: 'parse error', raw: rawText.substring(0, 200), endpoint: baseUrl });
      }

      const body = d?.response?.body;
      const items = body?.items?.item || body?.items;
      const list = !items ? [] : Array.isArray(items) ? items : [items];

      const filtered = list.filter(item => {
        const nm = (item.bidNtceNm || item.prdctClsfcNoNm || item.bsnsSumryCn || '').toLowerCase();
        return nm.includes(keyword.toLowerCase());
      });

      return res.status(200).json({
        items: filtered.map(i => ({ ...i, _isPreSpec: true })),
        totalCount: filtered.length,
        _endpoint: baseUrl
      });
    } catch(e) {
      continue;
    }
  }

  res.status(500).json({ error: '모든 사전규격 엔드포인트 실패' });
}

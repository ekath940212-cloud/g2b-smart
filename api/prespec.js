export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const G2B_API_KEY = process.env.G2B_API_KEY;
  if (!G2B_API_KEY) return res.status(500).json({ error: 'API 키 누락' });

  const { keyword, startDt, endDt } = req.query;
  if (!keyword) return res.status(400).json({ error: 'keyword 필요' });

  const sd = (startDt || '20260101').replace(/-/g, '') + '0000';
  const ed = (endDt || '20261231').replace(/-/g, '') + '2359';

  // 공공데이터포털 사전규격정보서비스
  const BASE = 'https://apis.data.go.kr/1230000/ao/HrcspSsstndrdInfoService';
  const endpoints = [
    'getPublicPrcureThngInfoServcPPSSrch',  // 용역
    'getPublicPrcureThngInfoCnstwkPPSSrch', // 공사
    'getPublicPrcureThngInfoThngPPSSrch',   // 물품
  ];

  const allItems = [];
  const debugInfo = [];

  for (const ep of endpoints) {
    try {
      const url = new URL(`${BASE}/${ep}`);
      url.searchParams.set('serviceKey', G2B_API_KEY);
      url.searchParams.set('numOfRows', '100');
      url.searchParams.set('pageNo', '1');
      url.searchParams.set('type', 'json');
      url.searchParams.set('inqryBgnDt', sd);
      url.searchParams.set('inqryEndDt', ed);
      url.searchParams.set('prdctClsfcNoNm', keyword);

      const r = await fetch(url.toString());
      const rawText = await r.text();
      debugInfo.push({ ep, status: r.status, raw: rawText.substring(0, 400) });

      if (!rawText || rawText.startsWith('Forbidden') || r.status !== 200) continue;

      let d;
      try { d = JSON.parse(rawText); } catch(e) { continue; }

      const body = d?.response?.body;
      const resultCode = d?.response?.header?.resultCode;
      if (resultCode !== '00' && resultCode !== '0000') continue;

      const items = body?.items?.item;
      if (!items) continue;

      const list = Array.isArray(items) ? items : [items];
      list.forEach(item => {
        allItems.push({
          _isPreSpec: true,
          bidNtceNm: item.prdctClsfcNoNm || item.bidNtceNm || '',
          ntceInsttNm: item.ntceInsttNm || item.dminsttNm || '',
          dminsttNm: item.dminsttNm || item.ntceInsttNm || '',
          asignBdgtAmt: item.asignBdgtAmt || null,
          ntceDt: item.bidNtceDt || item.rgstDt || '',
          bidClseDt: item.opngDt || '',
          prcrmntReqNo: item.prcrmntReqNo || item.ssstndrdNo || '',
          raw_data: item,
        });
      });
    } catch(e) {
      debugInfo.push({ ep, error: e.message });
    }
  }

  // 중복 제거
  const seen = new Set();
  const unique = allItems.filter(item => {
    const key = item.prcrmntReqNo || item.bidNtceNm;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  res.status(200).json({ items: unique, totalCount: unique.length, debugInfo });
}

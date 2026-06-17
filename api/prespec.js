export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const G2B_API_KEY = process.env.G2B_API_KEY;
  if (!G2B_API_KEY) return res.status(500).json({ error: 'API 키 누락' });

  const { keyword, startDt, endDt } = req.query;
  if (!keyword) return res.status(400).json({ error: 'keyword 필요' });

  const sd = (startDt || '20260101').replace(/-/g, '');
  const ed = (endDt || '20261231').replace(/-/g, '');

  // 사전규격정보서비스 엔드포인트 (용역, 공사, 물품)
  const BASE = 'https://apis.data.go.kr/1230000/ao/HrcspSsstndrdInfoService';
  const endpoints = [
    `${BASE}/getPublicPrcureThngInfoServcPPSSrch`,
    `${BASE}/getPublicPrcureThngInfoCnstwkPPSSrch`,
    `${BASE}/getPublicPrcureThngInfoThngPPSSrch`,
  ];

  const params = new URLSearchParams({
    serviceKey: G2B_API_KEY,
    numOfRows: '100',
    pageNo: '1',
    type: 'json',
    bidNtceBgnDt: sd + '0000',
    bidNtceEndDt: ed + '2359',
    prdctClsfcNoNm: keyword,
  });

  const allItems = [];
  const debugInfo = [];

  for (const ep of endpoints) {
    try {
      const r = await fetch(`${ep}?${params.toString()}`);
      const rawText = await r.text();
      debugInfo.push({ ep, status: r.status, raw: rawText.substring(0, 300) });
      
      let d;
      try { d = JSON.parse(rawText); } catch(e) { continue; }
      
      const body = d?.response?.body;
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

  // 중복 제거 (prcrmntReqNo 기준)
  const seen = new Set();
  const unique = allItems.filter(item => {
    const key = item.prcrmntReqNo || item.bidNtceNm;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  res.status(200).json({ items: unique, totalCount: unique.length, debugInfo });
}

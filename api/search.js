export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const G2B_API_KEY = process.env.G2B_API_KEY;
  if (!G2B_API_KEY) return res.status(500).json({ error: 'API 키브 나락' });
  const { keyword, startDt, endDt } = req.query;
  if (!keyword) return res.status(400).json({ error: 'keyword 필요' });
  const endpoints = [
    'getBidPblancListInfoServcPPSSrch',
    'getBidPblancListInfoCnstwkPPSSrch',
    'getBidPblancListInfoThngPPSSrch',
    'getBidPblancListInfoEtcPPSSrch',
  ];
  const sd = (startDt || '20250101') + '0000';
  const ed = (endDt || '20261231') + '2359';
  // 키워드에 공백 있으면 첫 번째 단어로 API 검색 후 나머지 단어로 프론트 필터링
  const keywords = keyword.trim().split(/\s+/);
  const mainKeyword = keywords[0];
  const subKeywords = keywords.slice(1);
  try {
    const fetches = endpoints.map(ep => {
      const url = new URL(`https://apis.data.go.kr/1230000/ad/BidPublicInfoService/${ep}`);
      url.searchParams.set('serviceKey', G2B_API_KEY);
      url.searchParams.set('numOfRows', '100');
      url.searchParams.set('pageNo', '1');
      url.searchParams.set('inqryDiv', '1');
      url.searchParams.set('type', 'json');
      url.searchParams.set('bidNtceNm', mainKeyword);
      url.searchParams.set('inqryBgnDt', sd);
      url.searchParams.set('inqryEndDt', ed);
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
    // 추가 키워드로 필터링 (교집합)
    if (subKeywords.length > 0) {
      items = items.filter(item => {
        const nm = (item.bidNtceNm || '').toLowerCase().replace(/\s/g, '');
        return subKeywords.every(sk => nm.includes(sk.toLowerCase().replace(/\s/g, '')));
      });
    }
    // 중복 제거
    const seen = new Set();
    items = items.filter(item => {
      const id = item.bidNtceNo || JSON.stringify(item).slice(0, 50);
      if (seen.has(id)) return false;
      seen.add(id); return true;
    });
    res.status(200).json({ items, totalCount: items.length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}

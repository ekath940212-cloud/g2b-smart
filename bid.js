// api/bid.js - 입찰공고 검색 (서버사이드 → CORS 문제 없음)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { keyword, startDt, endDt, apiKey } = req.query;
  if (!keyword || !apiKey) return res.status(400).json({ error: 'keyword, apiKey 필요' });

  try {
    const url = new URL('https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServc');
    url.searchParams.set('serviceKey', apiKey);
    url.searchParams.set('numOfRows', '100');
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('inqryDiv', '1');
    url.searchParams.set('inqryBgnDt', (startDt || '20250101') + '0000');
    url.searchParams.set('inqryEndDt', (endDt || '20261231') + '2359');
    url.searchParams.set('bidNtceNm', keyword);
    url.searchParams.set('type', 'json');

    const response = await fetch(url.toString());
    const data = await response.json();
    const items = data?.response?.body?.items?.item;
    const list = !items ? [] : Array.isArray(items) ? items : [items];
    res.status(200).json({ items: list });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

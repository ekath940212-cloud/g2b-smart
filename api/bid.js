export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { keyword, startDt, endDt, apiKey } = req.query;
  if (!keyword || !apiKey) return res.status(400).json({ error: 'params missing' });
  try {
    const url = new URL('https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServc');
    url.searchParams.set('serviceKey', apiKey);
    url.searchParams.set('numOfRows', '100');
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('inqryDiv', '1');
    url.searchParams.set('inqryBgnDt', (startDt||'20250101')+'0000');
    url.searchParams.set('inqryEndDt', (endDt||'20261231')+'2359');
    url.searchParams.set('bidNtceNm', keyword);
    url.searchParams.set('type', 'json');
    const r = await fetch(url.toString());
    const d = await r.json();
    const items = d?.response?.body?.items?.item;
    res.status(200).json({ items: !items?[]:(Array.isArray(items)?items:[items]) });
  } catch(e) { res.status(500).json({ error: e.message }); }
}

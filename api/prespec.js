export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { keyword, startDt, endDt, apiKey } = req.query;
  if (!keyword || !apiKey) return res.status(400).json({ error: 'params missing' });
  try {
    const url = new URL('https://apis.data.go.kr/1230000/ao/CntrctProcssIntgOpenService/getCntrctProcssIntgList');
    url.searchParams.set('serviceKey', apiKey);
    url.searchParams.set('numOfRows', '100');
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('inqryBgnDt', startDt||'20250101');
    url.searchParams.set('inqryEndDt', endDt||'20261231');
    url.searchParams.set('prdctClsfcNoNm', keyword);
    url.searchParams.set('type', 'json');
    const r = await fetch(url.toString());
    const d = await r.json();
    const items = d?.response?.body?.items?.item;
    const list = !items?[]:(Array.isArray(items)?items:[items]);
    res.status(200).json({ items: list.map(i=>({...i,_isPreSpec:true})) });
  } catch(e) { res.status(500).json({ error: e.message }); }
}

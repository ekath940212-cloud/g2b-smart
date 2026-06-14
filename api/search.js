export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(500).json({ error: '환경변수 누락' });
  const { keyword, filter, startDt, endDt } = req.query;
  if (!keyword) return res.status(400).json({ error: 'keyword 필요' });
  try {
    let url = `${SUPABASE_URL}/rest/v1/bid_notices?select=*&bid_ntce_nm=ilike.*${encodeURIComponent(keyword)}*&order=bid_cls_dt.desc.nullslast&limit=500`;
    if (startDt) url += `&ntce_dt=gte.${startDt.slice(0,4)}-${startDt.slice(4,6)}-${startDt.slice(6,8)}`;
    if (endDt) url += `&ntce_dt=lte.${endDt.slice(0,4)}-${endDt.slice(4,6)}-${endDt.slice(6,8)}T23:59:59`;
    const dbRes = await fetch(url, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } });
    let items = await dbRes.json();
    if (!Array.isArray(items)) return res.status(200).json({ items: [], totalCount: 0 });
    // filter 파라미터: | 구분 OR 조건으로 JS에서 필터링
    if (filter) {
      const filters = filter.split('|').map(f => f.toLowerCase().replace(/\s/g, ''));
      items = items.filter(item => {
        const nm = (item.bid_ntce_nm || '').toLowerCase().replace(/\s/g, '');
        return filters.some(f => nm.includes(f));
      });
    }
    const mapped = items.map(item => ({
      ...item.raw_data,
      bidNtceNo: item.bid_ntce_no,
      bidNtceNm: item.bid_ntce_nm,
      ntceInsttNm: item.ntce_instt_nm,
      dminsttNm: item.dminstt_nm,
      bidMethdNm: item.bid_methd_nm,
      asignBdgtAmt: item.asign_bdgt_amt,
      ntceDt: item.ntce_dt,
      bidClseDt: item.bid_cls_dt,
    }));
    res.status(200).json({ items: mapped, totalCount: mapped.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
}

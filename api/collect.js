export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const G2B_API_KEY = process.env.G2B_API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!G2B_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(500).json({ error: '환경변수 누락' });

  const KEYWORDS = ['음식물','소각','자원','순환','재활용','매립','폐기물','침출수','슬러지','바이오','열분해','분뇌','환경'];

  let startDt = req.query.startDt;
  let endDt = req.query.endDt;
  if (!startDt || !endDt) {
    const now = new Date();
    const past = new Date(now);
    past.setDate(past.getDate() - 7);
    const fmt = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    startDt = fmt(past);
    endDt = fmt(now);
  }

  const endpoints = [
    { ep: 'getBidPblancListInfoServc', type: 'servc' },
    { ep: 'getBidPblancListInfoCnstwk', type: 'cnstwk' },
    { ep: 'getBidPblancListInfoThng', type: 'thng' },
    { ep: 'getBidPblancListInfoEtc', type: 'etc' },
  ];

  const chunks = [];
  let cur = new Date(startDt.slice(0,4)+'-'+startDt.slice(4,6)+'-'+startDt.slice(6,8));
  const end = new Date(endDt.slice(0,4)+'-'+endDt.slice(4,6)+'-'+endDt.slice(6,8));
  const fmt = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  while (cur <= end) {
    const chunkEnd = new Date(cur);
    chunkEnd.setDate(chunkEnd.getDate() + 29);
    if (chunkEnd > end) chunkEnd.setTime(end.getTime());
    chunks.push({ sd: fmt(cur)+'0000', ed: fmt(chunkEnd)+'2359' });
    cur = new Date(chunkEnd);
    cur.setDate(cur.getDate() + 1);
  }

  let totalSaved = 0;
  const errors = [];

  for (const { ep, type } of endpoints) {
    for (const { sd, ed } of chunks) {
      try {
        const firstData = await fetch(buildUrl(ep, G2B_API_KEY, sd, ed, 1, 100)).then(r=>r.json());
        const totalCount = firstData?.response?.body?.totalCount || 0;
        const totalPages = Math.ceil(totalCount / 100);
        const pagePromises = [];
        for (let p = 1; p <= Math.min(totalPages, 20); p++) {
          pagePromises.push(fetch(buildUrl(ep, G2B_API_KEY, sd, ed, p, 100)).then(r=>r.json()).then(d=>{
            const items=d?.response?.body?.items;
            if (!items) return [];
            return Array.isArray(items)?items:[items];
          }).catch(()=>[]));
        }
        const allItems = (await Promise.all(pagePromises)).flat();

        const filtered = allItems.filter(item => {
          const nm = (item.bidNtceNm || '').toLowerCase();
          return KEYWORDS.some(kw => nm.includes(kw.toLowerCase()));
        });

        for (let i = 0; i < filtered.length; i += 100) {
          const batch = filtered.slice(i, i+100).map(item => ({
            bid_ntce_no: item.bidNtceNo||null,
            bid_ntce_nm: item.bidNtceNm||'',
            ntce_instt_nm: item.ntceInsttNm||'',
            dminstt_nm: item.dminsttNm||'',
            bid_methd_nm: item.bidMethdNm||'',
            asign_bdgt_amt: item.asignBdgtAmt?parseInt(item.asignBdgtAmt):null,
            ntce_dt: parseDate(item.ntceDt),
            bid_cls_dt: parseDate(item.bidClseDt),
            bid_type: type,
            raw_data: item,
            updated_at: new Date().toISOString(),
          }));
          const r = await fetch(`${SUPABASE_URL}/rest/v1/bid_notices`, {
            method: 'POST',
            headers: {'Content-Type':'application/json','apikey':SUPABASE_SERVICE_KEY,'Authorization':`Bearer ${SUPABASE_SERVICE_KEY}`,'Prefer':'resolution=merge-duplicates'},
            body: JSON.stringify(batch),
          });
          if (r.ok) totalSaved += batch.length;
          else errors.push(await r.text().then(t=>t.slice(0,100)));
        }
      } catch(e) { errors.push(`${ep} ${sd}: ${e.message}`); }
    }
  }

  res.status(200).json({ success:true, totalSaved, errors, collectedAt:new Date().toISOString() });
}

function buildUrl(ep, apiKey, sd, ed, page, rows) {
  const url = new URL(`https://apis.data.go.kr/1230000/ad/BidPublicInfoService/${ep}`);
  url.searchParams.set('serviceKey', apiKey);
  url.searchParams.set('numOfRows', String(rows));
  url.searchParams.set('pageNo', String(page));
  url.searchParams.set('inqryDiv', '1');
  url.searchParams.set('type', 'json');
  url.searchParams.set('inqryBgnDt', sd);
  url.searchParams.set('inqryEndDt', ed);
  return url.toString();
}

function parseDate(str) {
  if (!str) return null;
  const s = String(str).replace(/[^0-9]/g,'');
  if (s.length>=12) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(8,10)}:${s.slice(10,12)}:00`;
  if (s.length>=8) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T00:00:00`;
  return null;
}

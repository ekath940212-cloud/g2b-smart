export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const G2B_API_KEY = process.env.G2B_API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!G2B_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(500).json({ error: '환경변수 누락' });
  const now = new Date();
  const fmt = d => String(d.getFullYear()) + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  let sd, ed;
  if (req.query.startDt && req.query.endDt) {
    sd = req.query.startDt + '0000';
    ed = req.query.endDt + '2359';
  } else {
    const past = new Date(now); past.setDate(past.getDate() - 7);
    sd = fmt(past)+'0000'; ed = fmt(now)+'2359';
  }
  const endpoints = [
    { ep: 'getBidPblancListInfoServc', type: 'servc' },
    { ep: 'getBidPblancListInfoCnstwk', type: 'cnstwk' },
    { ep: 'getBidPblancListInfoThng', type: 'thng' },
    { ep: 'getBidPblancListInfoEtc', type: 'etc' },
  ];
  let totalSaved = 0; const errors = [];
  for (const { ep, type } of endpoints) {
    try {
      const firstUrl = buildUrl(ep, G2B_API_KEY, sd, ed, 1, 100);
      const firstData = await fetch(firstUrl).then(r=>r.json());
      const totalCount = (firstData && firstData.response && firstData.response.body && firstData.response.body.totalCount) || 0;
      const totalPages = Math.ceil(totalCount / 100);
      const pagePromises = [];
      for (let p = 1; p <= Math.min(totalPages, 20); p++) {
        pagePromises.push(
          fetch(buildUrl(ep, G2B_API_KEY, sd, ed, p, 100))
            .then(r=>r.json())
            .then(d => {
              const raw = d && d.response && d.response.body && d.response.body.items;
              if (!raw) return [];
              return Array.isArray(raw) ? raw : [raw];
            })
            .catch(()=>[])
        );
      }
      const items = (await Promise.all(pagePromises)).flat();
      for (let i = 0; i < items.length; i += 100) {
        const batch = items.slice(i, i+100).map(item => ({
          bid_ntce_no: item.bidNtceNo||null,
          bid_ntce_nm: item.bidNtceNm||'',
          ntce_instt_nm: item.ntceInsttNm||'',
          dminstt_nm: item.dminsttNm||'',
          bid_methd_nm: item.bidMethdNm||'',
          asign_bdgt_amt: item.asignBdgtAmt ? parseInt(item.asignBdgtAmt) : null,
          ntce_dt: parseDate(item.bidNtceDt),
          bid_cls_dt: parseDate(item.bidClseDt),
          bid_type: type,
          raw_data: item,
          updated_at: new Date().toISOString(),
        }));
        const r = await fetch(SUPABASE_URL + '/rest/v1/bid_notices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(batch),
        });
        if (r.ok) totalSaved += batch.length;
        else errors.push(await r.text().then(t=>t.slice(0,200)));
      }
    } catch(e) { errors.push(ep + ': ' + e.message); }
  }
  res.status(200).json({ success:true, totalSaved, errors, collectedAt: new Date().toISOString(), range: { sd, ed } });
}

function buildUrl(ep, apiKey, sd, ed, page, rows) {
  const url = new URL('https://apis.data.go.kr/1230000/ad/BidPublicInfoService/' + ep);
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
  if (s.length >= 12) return s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8)+'T'+s.slice(8,10)+':'+s.slice(10,12)+':00';
  if (s.length >= 8) return s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8)+'T00:00:00';
  return null;
}

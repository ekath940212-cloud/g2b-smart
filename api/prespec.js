export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { keyword, startDt, endDt } = req.query;
  if (!keyword) return res.status(400).json({ error: 'keyword \ud544\uc694' });

  const sd = startDt || '20260101';
  const ed = endDt || '20261231';

  try {
    const body = {
      dlOderReqSrchM: {
        srchTy: '0002',
        bizNm: keyword,
        picNm: '',
        stepCd: '',
        prssCd: '',
        oderInstUntyGrpNo: '',
        oderInstUntyGrpNm: '',
        pbancInstUntyGrpNo: '',
        pbancInstUntyGrpNm: '',
        instSearchRangeYn: '',
        pbancSearchRangeYn: '',
        prgrsBgngYmd: sd,
        prgrsEndYmd: ed,
        currentPage: 1,
        recordCountPerPage: '100',
        preSrchTy: '',
        oderPlanPgstCd: '',
        srchTyNm: '',
        tkcgSe: '',
      }
    };

    const r = await fetch('https://www.g2b.go.kr/pr/prc/prca/OderReq/selectOderReqList.do', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await r.json();
    const list = data?.result || data?.data || data?.list || [];

    const items = list.map(item => ({
      _isPreSpec: true,
      bidNtceNm: item.bizNm || item.oderReqNm || '',
      ntceInsttNm: item.oderInstNm || item.pbancInstNm || '',
      dminsttNm: item.oderInstNm || '',
      asignBdgtAmt: item.oderPlanAmt || item.budgAmt || null,
      ntceDt: item.prgrsBgngYmd || item.regDt || '',
      bidClseDt: item.prgrsEndYmd || '',
      prcrmntReqNo: item.oderReqNo || '',
      raw_data: item,
    }));

    res.status(200).json({ items, totalCount: items.length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}

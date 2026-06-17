export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { keyword, startDt, endDt } = req.query;
  if (!keyword) return res.status(400).json({ error: 'keyword 필요' });

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
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://www.g2b.go.kr/',
        'Origin': 'https://www.g2b.go.kr',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(body),
    });

    const data = await r.json();

    // 나라장터 응답 구조: { dlOderReqL: [...], ErrorMsg: "정상적으로 조회되었습니다." }
    const list = data?.dlOderReqL || data?.result || data?.data || data?.list || [];

    const items = list.map(item => ({
      _isPreSpec: true,
      bidNtceNm: item.bizNm || item.oderReqNm || '',
      ntceInsttNm: item.oderInstUntyGrpNm || item.oderInstNm || item.tkcgDeptNm || '',
      dminsttNm: item.oderInstUntyGrpNm || item.oderInstNm || '',
      asignBdgtAmt: item.bgtSumAmt || item.oderPlanAmt || null,
      ntceDt: item.prcsYmd || item.prgrsBgngYmd || '',
      bidClseDt: item.prgrsEndYmd || '',
      prcrmntReqNo: item.oderPlanNo || item.unikey || '',
      raw_data: item,
    }));

    res.status(200).json({ items, totalCount: data?.dlOderReqL?.length || items.length, g2bTotal: list[0]?.totCnt || items.length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}

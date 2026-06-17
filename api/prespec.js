export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { keyword, startDt, endDt } = req.query;
  if (!keyword) return res.status(400).json({ error: 'keyword 필요' });

  const sd = (startDt || '20260101').replace(/-/g, '');
  const ed = (endDt || '20261231').replace(/-/g, '');

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

    const menuInfo = JSON.stringify({
      menuNo: '13713',
      menuCangVal: 'PRCA001_04',
      bsneClsfCd: '%EC%97%85130025',
      scrnNo: '00963'
    });

    const r = await fetch('https://www.g2b.go.kr/pr/prc/prca/OderReq/selectOderReqList.do', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'submissionid': 'mf_wfm_container_smSearchOderReqLstList',
        'Menu-Info': menuInfo,
        'Target-Id': 'btnS0001',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://www.g2b.go.kr/pr/prc/prca/OderReq/selectOderReqList.do',
        'Origin': 'https://www.g2b.go.kr',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      },
      body: JSON.stringify(body),
    });

    const rawText = await r.text();

    if (r.status !== 200) {
      return res.status(200).json({ debug_status: r.status, debug_raw: rawText.substring(0, 300), items: [], totalCount: 0 });
    }

    let data;
    try { data = JSON.parse(rawText); }
    catch(e) { return res.status(200).json({ debug_parse_error: e.message, debug_raw: rawText.substring(0, 300), items: [], totalCount: 0 }); }

    const list = data?.dlOderReqL || [];

    const items = list.map(item => ({
      _isPreSpec: true,
      bidNtceNm: item.bizNm || '',
      ntceInsttNm: item.oderInstUntyGrpNm || item.tkcgDeptNm || '',
      dminsttNm: item.oderInstUntyGrpNm || '',
      asignBdgtAmt: item.bgtSumAmt || null,
      ntceDt: item.prcsYmd || '',
      bidClseDt: item.prgrsEndYmd || '',
      prcrmntReqNo: item.oderPlanNo || item.unikey || '',
      raw_data: item,
    }));

    res.status(200).json({ items, totalCount: items.length, g2bTotal: list[0]?.totCnt || items.length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}

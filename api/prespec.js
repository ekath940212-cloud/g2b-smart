export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

  const G2B_API_KEY = process.env.G2B_API_KEY;
    if (!G2B_API_KEY) return res.status(500).json({ error: 'API 키 누락' });

  const { keyword, startDt, endDt } = req.query;
    if (!keyword) return res.status(400).json({ error: 'keyword 필요' });

  // HrcspSsstndrdInfoService 엔드포인트 목록
  const endpoints = [
        'getPublicPrcureThngInfoServcPPSSrch',
        'getPublicPrcureThngInfoCnstwkPPSSrch',
        'getPublicPrcureThngInfoThngPPSSrch',
        'getPublicPrcureThngInfoFrgcptPPSSrch',
      ];

  // 날짜 형식: YYYYMMDD -> YYYYMMDDHHmm
  const sd = (startDt || '20250101') + '0000';
    const ed = (endDt || '20261231') + '2359';

  try {
        const fetches = endpoints.map(ep => {
                const url = new URL(`https://apis.data.go.kr/1230000/ao/HrcspSsstndrdInfoService/${ep}`);
                url.searchParams.set('serviceKey', G2B_API_KEY);
                url.searchParams.set('numOfRows', '100');
                url.searchParams.set('pageNo', '1');
                url.searchParams.set('inqryDiv', '1');
                url.searchParams.set('type', 'json');
                url.searchParams.set('inqryBgnDt', sd);
                url.searchParams.set('inqryEndDt', ed);
                // 키워드로 물품분류번호명 검색
                                            url.searchParams.set('prdctClsfcNoNm', keyword);

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

      // 중복 제거 (bfSpecRgstNo 기준)
      const seen = new Set();
        items = items.filter(item => {
                const id = item.bfSpecRgstNo || item.bfSpecRgsNo || JSON.stringify(item).slice(0, 50);
                if (seen.has(id)) return false;
                seen.add(id); return true;
        });

      // 응답 필드 매핑: 사전규격공개 표준 필드 -> 프론트엔드 공통 필드
      const mapped = items.map(item => ({
              ...item,
              _isPreSpec: true,
              // 카드 제목: 물품분류번호명
              bidNtceNm: item.prdctClsfcNoNm || '',
              // 기관명
              ntceInsttNm: item.rlDminsttNm || item.dminsttNm || '',
              dminsttNm: item.rlDminsttNm || item.dminsttNm || '',
              // 예산
              asignBdgtAmt: item.asignBdgtAmt || null,
              // 등록일시 (게시일)
              ntceDt: item.rgstDt || item.rcptDt || '',
              // 의견수렴 마감일
              bidClseDt: item.opninRcptClseDt || '',
              // 사전규격 등록번호
              prcrmntReqNo: item.bfSpecRgstNo || item.bfSpecRgsNo || '',
              // 업무구분명
              bsnsDivNm: item.bsnsDivNm || '',
              // 단위명
              untyNm: item.untyNm || '',
      }));

      res.status(200).json({ items: mapped, totalCount: mapped.length });
  } catch (e) {
        res.status(500).json({ error: e.message });
  }
}

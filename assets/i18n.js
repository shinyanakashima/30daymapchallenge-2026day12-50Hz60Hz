window.I18N = (() => {
  const ui = {
    view: { es: "Vista", en: "View", ja: "画面" },
    language: { es: "Idioma", en: "Language", ja: "言語" },
    zoom: { es: "Zoom", en: "Zoom", ja: "ズーム" },
    soundTitle: { es: "Escuchar 50 Hz y 60 Hz", en: "Listen: 50 Hz vs 60 Hz", ja: "50Hz と 60Hz を聞き比べる" },
    soundHint: {
      es: "Sin sonido hasta que pulse un botón. Volumen bajo. Se suman armónicos (100 Hz / 120 Hz y superiores) para que se oiga también en altavoces pequeños. En iPhone, compruebe el volumen.",
      en: "Silent until you press a button. Low volume. Overtones (100 Hz / 120 Hz and above) are added so small speakers can play it too. On iPhone, check the volume.",
      ja: "ボタンを押すまで音は出ません。音量は控えめです。スマートフォンなど小さなスピーカーでも聞こえるよう、倍音（100Hz / 120Hz とその上）を重ねています。iPhone では音量を確認してください。"
    },
    stop: { es: "detener", en: "stop", ja: "停止" },
    pause: { es: "Pausar ondas", en: "Pause waves", ja: "波を止める" },
    play: { es: "Mover ondas", en: "Animate waves", ja: "波を動かす" },
    notes: { es: "Notas y fuentes", en: "Notes and sources", ja: "注記と出典" },
    leg50: { es: "50 Hz (onda larga)", en: "50 Hz (long wave)", ja: "50Hz（長い波）" },
    leg60: { es: "60 Hz (onda corta)", en: "60 Hz (short wave)", ja: "60Hz（短い波）" },
    legMixed: { es: "50 Hz y 60 Hz coexisten (Guyana)", en: "50 Hz and 60 Hz both in use (Guyana)", ja: "50Hz と 60Hz が混在（ガイアナ）" },
    legNoData: { es: "Sin asignar", en: "Not assigned (outside the supply areas)", ja: "割り当て対象外（供給区域外）" },
    legLinePy: { es: "Frontera entre 50 Hz y 60 Hz", en: "Border between 50 Hz and 60 Hz", ja: "50Hz と 60Hz の境目" },
    legLineJp: { es: "Límite aproximado", en: "Approximate 50/60 Hz boundary", ja: "50Hz / 60Hz のおおよその境界" },
    legM_dam: { es: "Represa / central hidroeléctrica", en: "Dam / hydropower plant", ja: "ダム・水力発電所" },
    legM_fc: { es: "Convertidor de frecuencia 50/60 Hz", en: "50/60 Hz frequency converter", ja: "周波数変換所（50Hz⇔60Hz）" },
    legM_dc_py: { es: "Estación conversora de corriente continua", en: "HVDC converter station", ja: "直流送電の変換所" },
    legM_dc_jp: { es: "Estación conversora HVDC", en: "HVDC converter station (Hokkaido–Honshu)", ja: "直流連系の変換所（北海道・本州間）" },
    legLink: { es: "Enlace en corriente continua (trazado esquemático)", en: "DC link (schematic route)", ja: "直流送電線（経路は模式的）" }
  };

  const viewNames = { py: { es: "Paraguay", en: "Paraguay", ja: "パラグアイ" }, jp: { es: "Japón", en: "Japan", ja: "日本" } };

  const presets = {
    py: [
      { name: { es: "Sudamérica", en: "South America" } },
      { name: { es: "Itaipu → São Paulo", en: "Itaipu → São Paulo" }, bbox: [-58.6, -28.6, -46.4, -22.4] },
      { name: { es: "Itaipu", en: "Itaipu" }, bbox: [-55.05, -25.75, -54.15, -25.1] }
    ],
    jp: [
      { name: { en: "Japan", ja: "全国" } },
      { name: { en: "Boundary", ja: "境界" }, bbox: [136.3, 34.5, 140.1, 37.9] },
      { name: { en: "Hokkaido–Honshu", ja: "北海道・本州" }, bbox: [139.6, 40.4, 141.8, 42.2] }
    ]
  };

  const factKeys = {
    units: { es: "Unidades", en: "Units", ja: "発電機" },
    capacity: { es: "Capacidad", en: "Capacity", ja: "容量" },
    start: { es: "En servicio", en: "In service", ja: "運用開始" },
    river: { es: "Río", en: "River", ja: "河川" },
    conversion: { es: "Conversión", en: "Conversion", ja: "変換" },
    operator: { es: "Operador", en: "Operator", ja: "運用者" },
    location: { es: "Ubicación", en: "Location", ja: "所在地" }
  };

  const countryLabels = [
    { name: { es: "Brasil", en: "Brazil" }, hz: "60", at: [-51.5, -9], maxK: 3.5 },
    { name: { es: "Argentina", en: "Argentina" }, hz: "50", at: [-65.5, -36], maxK: 3.5 },
    { name: { es: "Chile", en: "Chile" }, hz: "50", at: [-70.2, -24.5], maxK: 3.5 },
    { name: { es: "Bolivia", en: "Bolivia" }, hz: "50", at: [-64.5, -16.8], maxK: 3.5 },
    { name: { es: "Paraguay", en: "Paraguay" }, hz: "50", at: [-58.4, -23.0], maxK: 3.5 },
    { name: { es: "Uruguay", en: "Uruguay" }, hz: "50", at: [-56.0, -32.9], maxK: 3.5 },
    { name: { es: "Perú", en: "Peru" }, hz: "60", at: [-75.0, -9.6], maxK: 3.5 },
    { name: { es: "Ecuador", en: "Ecuador" }, hz: "60", at: [-78.4, -1.4], maxK: 3.5 },
    { name: { es: "Colombia", en: "Colombia" }, hz: "60", at: [-73.6, 4.0], maxK: 3.5 },
    { name: { es: "Venezuela", en: "Venezuela" }, hz: "60", at: [-66.0, 7.2], maxK: 3.5 },
    { name: { es: "Guyana", en: "Guyana" }, hz: "mixed", at: [-58.9, 5.0], minK: 1.6, maxK: 3.5 },
    { name: { es: "Surinam", en: "Suriname" }, hz: "60", at: [-55.9, 3.9], minK: 2.2, maxK: 3.5 },
    { name: { es: "Guayana Francesa", en: "French Guiana" }, hz: "50", at: [-53.1, 3.8], minK: 2.6, maxK: 3.5 },
    { name: { es: "Paraguay", en: "Paraguay" }, hz: "50", at: [-56.6, -24.6], minK: 3.5, maxK: 20 },
    { name: { es: "Brasil", en: "Brazil" }, hz: "60", at: [-51.5, -24.6], minK: 3.5, maxK: 20 },
    { name: { es: "Argentina", en: "Argentina" }, hz: "50", at: [-55.4, -27.0], minK: 3.5, maxK: 20 },
    { name: { es: "Uruguay", en: "Uruguay" }, hz: "50", at: [-56.4, -32.0], minK: 3.5, maxK: 20 },
    { name: { es: "Paraguay", en: "Paraguay" }, hz: "50", at: [-54.82, -25.62], minK: 20 },
    { name: { es: "Brasil", en: "Brazil" }, hz: "60", at: [-54.38, -25.25], minK: 20 }
  ];

  const japanLabels = [
    { name: { en: "50 Hz", ja: "50Hz" }, at: [141.6, 38.4], size: 22, maxK: 2.2 },
    { name: { en: "60 Hz", ja: "60Hz" }, at: [133.6, 35.6], size: 22, maxK: 2.2 },
    { name: { en: "Okinawa 60 Hz", ja: "沖縄 60Hz" }, at: [127.8, 27.0], size: 12, weight: 400, maxK: 2.2 },
    { name: { en: "Fuji River", ja: "富士川" }, at: [138.62, 35.36], size: 12, weight: 400, minK: 2.2, color: "#f0b54a" },
    { name: { en: "Itoigawa", ja: "糸魚川" }, at: [137.86, 37.12], size: 12, weight: 400, minK: 2.2, color: "#f0b54a" },
    { name: { en: "Sado 60 Hz", ja: "佐渡 60Hz" }, at: [138.38, 38.25], size: 12, weight: 400, minK: 2.2 },
    { name: { en: "50 Hz", ja: "50Hz" }, at: [139.3, 36.35], size: 18, minK: 2.2, maxK: 8 },
    { name: { en: "60 Hz", ja: "60Hz" }, at: [137.0, 35.25], size: 18, minK: 2.2, maxK: 8 },
    { name: { en: "Tsugaru Strait", ja: "津軽海峡" }, at: [140.75, 41.42], size: 12, weight: 400, minK: 4, color: "#7fc8d8" }
  ];

  const itaipuUnits = {
    title: { es: "Itaipu: 20 unidades, dos frecuencias", en: "Itaipu: 20 units, two frequencies" },
    left: { es: "10 × 50 Hz → Paraguay", en: "10 × 50 Hz → Paraguay" },
    right: { es: "10 × 60 Hz → Brasil", en: "10 × 60 Hz → Brazil" },
    aria: { es: "20 unidades generadoras de 700 MW: 10 a 50 Hz y 10 a 60 Hz", en: "20 generating units of 700 MW: 10 at 50 Hz and 10 at 60 Hz" },
    caption: {
      es: "Cada unidad: 700 MW. Total: 14 000 MW. La energía de 50 Hz que Paraguay no usa pasa a corriente continua en Foz do Iguaçu (±600 kV, 6300 MW) y llega a la red de 60 Hz en Ibiúna. La de 60 Hz va por tres líneas de 765 kV en corriente alterna.",
      en: "Each unit: 700 MW. Total: 14,000 MW. The 50 Hz energy Paraguay does not use becomes direct current at Foz do Iguaçu (±600 kV, 6,300 MW) and joins the 60 Hz grid at Ibiúna. The 60 Hz output travels on three 765 kV AC lines."
    }
  };

  const SRC_NE = '<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>';
  const SRC_IEC = '<a href="https://www.iec.ch/world-plugs" target="_blank" rel="noopener">IEC World Plugs</a>';
  const SRC_GPL = '<a href="https://gplinc.com/about-us/who-we-are/" target="_blank" rel="noopener">Guyana Power &amp; Light</a>';
  const SRC_ITAIPU = '<a href="https://www.itaipu.gov.br/contatos/perguntas-frequentes" target="_blank" rel="noopener">Itaipu Binacional</a>';
  const SRC_EBY = '<a href="https://www.eby.gov.py/central-hidroelectrica-eby/" target="_blank" rel="noopener">EBY</a>';
  const SRC_ANDE = '<a href="https://www.ande.gov.py/documentos/CH-ACARAY-WEB.pdf" target="_blank" rel="noopener">ANDE</a>';
  const SRC_ELB = '<a href="https://eletrobras.com/pt/Paginas/Noticia.aspx?ID=1374" target="_blank" rel="noopener">Eletrobras</a>';
  const SRC_EPE = '<a href="https://www.epe.gov.br/sites-pt/publicacoes-dados-abertos/publicacoes/PublicacoesArquivos/publicacao-227/topico-457/Integracao%20Energetica%20Regional.pdf" target="_blank" rel="noopener">EPE</a>';
  const SRC_ONS = '<a href="https://www.ons.org.br/AcervoDigitalDocumentosEPublicacoes/Relat%C3%B3rio%20de%20Intercambio%20Internacional_05%2021.pdf" target="_blank" rel="noopener">ONS</a>';
  const SRC_N03 = '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html" target="_blank" rel="noopener">国土数値情報（行政区域）N03</a>';
  const SRC_CHUBU = '<a href="https://miraiz.chuden.co.jp/home/electric/contract/structure/frequency/" target="_blank" rel="noopener">中部電力ミライズ</a>';
  const SRC_CHUBU_PG = '<a href="https://powergrid.chuden.co.jp/goannai/ippan/denchu/kyouga/office/" target="_blank" rel="noopener">中部電力パワーグリッド</a>';
  const SRC_TOHOKU = '<a href="https://nw.tohoku-epco.co.jp/consignment/system/rule/pdf/rule004.pdf" target="_blank" rel="noopener">東北電力ネットワーク</a>';
  const SRC_TEPCO = '<a href="https://www4.tepco.co.jp/pg/consignment/notification/pdf/henkou20260213.pdf" target="_blank" rel="noopener">東京電力パワーグリッド</a>';
  const SRC_HOKURIKU = '<a href="https://www.rikuden.co.jp/nw_qa/hz.html" target="_blank" rel="noopener">北陸電力送配電</a>';
  const SRC_HEPCO = '<a href="https://www.hepco.co.jp/network/con_service/stipulation/pdf/sp_frequency_adjust.pdf" target="_blank" rel="noopener">北海道電力ネットワーク</a>';
  const SRC_OKIDEN = '<a href="https://www.okiden.co.jp/shared/pdf/business/free/fd_221227_01.pdf" target="_blank" rel="noopener">沖縄電力</a>';
  const SRC_OCCTO = '<a href="https://www.occto.or.jp/assets/iinkai/kouikikeitouseibi/101/seibi_101_01_01.pdf" target="_blank" rel="noopener">OCCTO</a>';
  const SRC_JPOWER = '<a href="https://www.jpower.co.jp/company_info/history/" target="_blank" rel="noopener">J-POWER</a>';
  const SRC_FEPC = '<a href="https://www.fepc.or.jp/enelog/cover/vol_40.html" target="_blank" rel="noopener">電気事業連合会</a>';
  const SRC_CHUBU_STORY = '<a href="https://www.chuden.co.jp/energy/ene_about/electric/kids_denki/okuru/chichu/" target="_blank" rel="noopener">中部電力</a>';

  const strings = {
    py: {
      title: { es: "Paraguay", en: "Paraguay" },
      subtitle: { es: "Una represa, dos frecuencias", en: "One dam, two frequencies" },
      source: { es: "Fuente", en: "Source" },
      mapNote: {
        es: "Frecuencia nominal de cada país (IEC). Posiciones de las estaciones aproximadas. Bordes: Natural Earth.",
        en: "Nominal frequency of each country (IEC). Station positions are approximate. Borders: Natural Earth."
      },
      lede: {
        es: "En Sudamérica la frecuencia de la red eléctrica cambia de un país a otro. Brasil, Colombia, Perú, Ecuador y Venezuela usan <b>60 Hz</b>; Paraguay, Argentina, Uruguay, Chile y Bolivia, <b>50 Hz</b>. Sobre el río Paraná, entre Paraguay y Brasil, la represa de <b>Itaipu</b> tiene 20 unidades generadoras: 10 producen a 50 Hz para Paraguay y 10 a 60 Hz para Brasil.",
        en: "In South America the grid frequency changes from country to country. Brazil, Colombia, Peru, Ecuador and Venezuela use <b>60 Hz</b>; Paraguay, Argentina, Uruguay, Chile and Bolivia use <b>50 Hz</b>. On the Paraná River between Paraguay and Brazil, the <b>Itaipu</b> dam has 20 generating units: 10 run at 50 Hz for Paraguay and 10 at 60 Hz for Brazil."
      },
      notes: {
        es: `<h3>Frecuencias</h3>
<p>Se muestra la frecuencia nominal (estándar) de cada país según ${SRC_IEC}. Guyana figura con 60 Hz en IEC, pero la empresa ${SRC_GPL} indica que suministra a 50 y a 60 ciclos; por eso se dibuja con ambas ondas. Islas Malvinas/Falkland y Guayana Francesa: 50 Hz (IEC).</p>
<h3>Instalaciones</h3>
<ul>
<li>Itaipu: 20 unidades de 700 MW, 10 a 50 Hz y 10 a 60 Hz; 14 000 MW; primera unidad en 1984, últimas dos en 2007 (${SRC_ITAIPU}).</li>
<li>Enlace de corriente continua Foz do Iguaçu – Ibiúna: ±600 kV, 6300 MW, unos 800 km; bipolos de 1984 y 1987 (${SRC_ELB}, EPE/ONS). El trazado dibujado es esquemático.</li>
<li>Yacyretá: 20 unidades de 155 MW a 50 Hz, 3100 MW; 1994–1998 (${SRC_EBY}).</li>
<li>Acaray: 4 grupos, 233,4 MVA; Acaray I inaugurada en 1968 (${SRC_ANDE}). Conversora de 50 MW fuera de servicio desde 2007 (${SRC_EPE}).</li>
<li>Conversoras Garabi y Rivera (${SRC_ONS}) y Melo (${SRC_EPE}).</li>
</ul>
<p>Las posiciones de las estaciones son aproximadas.</p>
<h3>Fuentes</h3>
<p>Bordes: ${SRC_NE} (dominio público), escala 1:10m, simplificados. Frecuencias: ${SRC_IEC}, ${SRC_GPL}. Instalaciones: ${SRC_ITAIPU}, ${SRC_EBY}, ${SRC_ANDE}, ${SRC_ELB}, ${SRC_EPE}, ${SRC_ONS}. Consultado: 6 de noviembre de 2026.</p>
<p>Este mapa muestra hechos técnicos; no evalúa tratados ni el comercio de energía.</p>`,
        en: `<h3>Frequencies</h3>
<p>Each country is shown with its nominal (standard) frequency according to ${SRC_IEC}. IEC lists Guyana as 60 Hz, but the utility ${SRC_GPL} states that it supplies both 50 and 60 cycle power, so Guyana is drawn with both waves. Falkland Islands and French Guiana: 50 Hz (IEC).</p>
<h3>Facilities</h3>
<ul>
<li>Itaipu: 20 units of 700 MW, 10 at 50 Hz and 10 at 60 Hz; 14,000 MW; first unit 1984, last two 2007 (${SRC_ITAIPU}).</li>
<li>Foz do Iguaçu – Ibiúna DC link: ±600 kV, 6,300 MW, about 800 km; bipoles from 1984 and 1987 (${SRC_ELB}, EPE/ONS). The route drawn is schematic.</li>
<li>Yacyretá: 20 units of 155 MW at 50 Hz, 3,100 MW; 1994–1998 (${SRC_EBY}).</li>
<li>Acaray: 4 units, 233.4 MVA; Acaray I opened in 1968 (${SRC_ANDE}). Its 50 MW converter has been out of service since 2007 (${SRC_EPE}).</li>
<li>Garabi and Rivera converters (${SRC_ONS}) and Melo (${SRC_EPE}).</li>
</ul>
<p>Station positions are approximate.</p>
<h3>Sources</h3>
<p>Borders: ${SRC_NE} (public domain), 1:10m, simplified. Frequencies: ${SRC_IEC}, ${SRC_GPL}. Facilities: ${SRC_ITAIPU}, ${SRC_EBY}, ${SRC_ANDE}, ${SRC_ELB}, ${SRC_EPE}, ${SRC_ONS}. Accessed 6 November 2026.</p>
<p>This map shows technical facts; it does not assess treaties or energy trade.</p>`
      }
    },
    jp: {
      title: { en: "Japan", ja: "日本" },
      subtitle: { en: "Where 50 Hz meets 60 Hz", ja: "50Hz と 60Hz が出会う場所" },
      source: { en: "Source", ja: "出典" },
      mapNote: {
        en: "Approximate boundary, assigned by municipality. Station positions are approximate.",
        ja: "境界はおおよそです（市区町村単位で割り当て）。変換所の位置もおおよそです。"
      },
      lede: {
        en: "Japan's electricity is split in two: <b>50 Hz</b> in the east and <b>60 Hz</b> in the west, roughly along the Fuji River in Shizuoka and around Itoigawa in Niigata. Frequency converter stations along the boundary let the two sides exchange power, and Hokkaido and Honshu are joined by undersea direct-current links.",
        ja: "日本の電気は、東日本が <b>50Hz</b>、西日本が <b>60Hz</b> に分かれています。境目は静岡県の富士川と新潟県の糸魚川あたりです。境目には周波数変換所が並んで東西の電気をやりとりし、北海道と本州は海底を通る直流送電線（北本連系）でつながっています。"
      },
      story: {
        en: `<h2>Why two frequencies?</h2><div class="story">
<p>In the <span class="yr">Meiji era</span>, when large generators were first bought, Tokyo Electric Light imported them from <b>Germany</b> and Osaka Electric Light from the <b>United States</b>, each with a different frequency: 50 Hz in the east, 60 Hz in the west.</p>
<p>The split remains today. The first converter, Sakuma, opened in <span class="yr">1965</span>. Since 2021 the east–west converters can carry 2.1 GW; an expansion to 3.0 GW is under way.</p>
<p class="hint">Sources: ${SRC_CHUBU_STORY}, ${SRC_FEPC}, ${SRC_JPOWER}, ${SRC_OCCTO}</p></div>`,
        ja: `<h2>なぜ二つの周波数なのか</h2><div class="story">
<p><span class="yr">明治時代</span>、初めて大型の発電機を買ったとき、東京電灯は<b>ドイツ</b>から、大阪電灯は<b>アメリカ</b>から発電機を輸入しました。周波数はそれぞれ 50Hz と 60Hz で、これが東西の違いの始まりです。</p>
<p>この違いは今も続いています。最初の周波数変換所・佐久間は <span class="yr">1965年</span> に運転を開始しました。2021年からは東西で 210万kW をやりとりでき、300万kW への増強工事が進んでいます。</p>
<p class="hint">出典：${SRC_CHUBU_STORY}、${SRC_FEPC}、${SRC_JPOWER}、${SRC_OCCTO}</p></div>`
      },
      notes: {
        en: `<h3>How the boundary was drawn</h3>
<p>Each municipality (wards for designated cities) in 国土数値情報 N03 (1 January 2026) was given 50 Hz or 60 Hz from the supply areas published by the power companies: 1,899 units, 859 at 50 Hz and 1,040 at 60 Hz. The line is approximate.</p>
<p>Where a municipality is split, it was assigned to the side that covers most of it. Exceptions:</p>
<ul>
<li>Fuji (Shizuoka): mapped 50 Hz; the former Fujikawa Town west of the Fuji River is 60 Hz.</li>
<li>Fujinomiya (Shizuoka): mapped 50 Hz; Utsubusa in the former Shibakawa Town is 60 Hz.</li>
<li>Itoigawa and Myoko (Niigata): mapped 50 Hz; parts are supplied at 60 Hz.</li>
<li>Nagano: mapped 60 Hz; some districts of Sakae, Nozawaonsen, Iiyama, Komoro, Saku, Matsumoto, Azumino (Hotaka), Omachi (Taira) and Otari are supplied at 50 Hz.</li>
<li>Sado (Niigata) is 60 Hz and mapped as such.</li>
<li>Six villages of the Northern Territories (N03 codes 01695–01700) are outside the power companies' supply areas and are not assigned.</li>
</ul>
<h3>Frequencies, converters, links</h3>
<ul>
<li>Converters: Sakuma 300 MW (1965), Shin-Shinano 600 MW, Higashi-Shimizu 300 MW (2013), Hida–Shinano 900 MW (2021); total 2.1 GW. The expansion to 3.0 GW is now expected to finish in March 2030 or later (OCCTO, May 2026).</li>
<li>Hokkaido–Honshu: 600 MW (1979, 1993) + New Hokkaido–Honshu 300 MW (2019) = 900 MW; 300 MW more planned for the end of FY2027.</li>
<li>DC routes on the map are schematic; station positions are approximate.</li>
</ul>
<h3>Sources</h3>
<p>Boundaries: ${SRC_N03} (processed by the author). Supply areas and frequencies: ${SRC_TEPCO}, ${SRC_CHUBU}, ${SRC_CHUBU_PG}, ${SRC_TOHOKU}, ${SRC_HOKURIKU}, ${SRC_HEPCO}, ${SRC_OKIDEN}. Facilities: ${SRC_OCCTO}, ${SRC_JPOWER}, ${SRC_FEPC} and the company pages linked from each marker. Accessed 6 November 2026.</p>`,
        ja: `<h3>境界の作り方</h3>
<p>国土数値情報 N03（2026年1月1日）の市区町村（政令市は区）ごとに、各電力会社が公表する供給区域・周波数をもとに 50Hz / 60Hz を割り当てました。1,899 区域のうち 50Hz が 859、60Hz が 1,040 です。境界はおおよそです。</p>
<p>市区町村の中で周波数が分かれる場合は、広い方に寄せています。例外は次のとおりです。</p>
<ul>
<li>静岡県富士市：50Hz として表示。富士川の西の旧富士川町は 60Hz。</li>
<li>静岡県富士宮市：50Hz として表示。旧芝川町の内房は 60Hz。</li>
<li>新潟県糸魚川市・妙高市：50Hz として表示。一部は 60Hz で供給。</li>
<li>長野県：60Hz として表示。栄村、野沢温泉村、飯山市、小諸市、佐久市、松本市、安曇野市（穂高）、大町市（平）、小谷村の一部地区は 50Hz で供給。</li>
<li>新潟県佐渡市は 60Hz で、そのとおり表示。</li>
<li>北方領土の6村（N03 コード 01695〜01700）は電力会社の供給区域外のため、割り当てていません。</li>
</ul>
<h3>周波数変換所と連系線</h3>
<ul>
<li>周波数変換所：佐久間 30万kW（1965年）、新信濃 60万kW、東清水 30万kW（2013年）、飛騨信濃 90万kW（2021年）、合計 210万kW。300万kW への増強は、最終的な運開が 2030年3月以降となる見込みです（OCCTO、2026年5月）。</li>
<li>北海道・本州間：北本 60万kW（1979年・1993年）＋新北本 30万kW（2019年）＝90万kW。2027年度末に 30万kW の増強を予定。</li>
<li>地図上の直流送電線の経路は模式的で、変換所の位置はおおよそです。</li>
</ul>
<h3>出典</h3>
<p>境界：${SRC_N03}（加工して作成）。供給区域・周波数：${SRC_TEPCO}、${SRC_CHUBU}、${SRC_CHUBU_PG}、${SRC_TOHOKU}、${SRC_HOKURIKU}、${SRC_HEPCO}、${SRC_OKIDEN}。設備：${SRC_OCCTO}、${SRC_JPOWER}、${SRC_FEPC}、各印のリンク先の各社資料。閲覧日：2026年11月6日。</p>`
      }
    }
  };

  return {
    ui, viewNames, presets, factKeys, countryLabels, japanLabels, itaipuUnits, strings,
    langNames: { es: "Español", en: "English", ja: "日本語" }
  };
})();

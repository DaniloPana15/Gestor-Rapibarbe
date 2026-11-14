// Base de datos iniciales migrada desde Rapibarbe_Sistema_Centralizado_v1.xlsx
const INITIAL_DATA = {"clientes":[{"id":"CLI-001","barberia":"MATIAS","barbero":"MATIAS","zona":"LINIERS","ruta":"MARTES","direccion":"IBARROLA 7093","telefono":"1161298430","categoria":"DIAMOND","deudaBase":478000.0,"notas":""},{"id":"CLI-002","barberia":"RICHAR","barbero":"RONAL","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"ACONCAGUA","telefono":"1123046096","categoria":"DIAMOND","deudaBase":455000.0,"notas":""},{"id":"CLI-003","barberia":"DYNASTY 2","barbero":"POCHO","zona":"FLORES","ruta":"VIERNES","direccion":"EST FLOREZ","telefono":"1124888223","categoria":"DIAMOND","deudaBase":430000.0,"notas":""},{"id":"CLI-004","barberia":"RICHAR","barbero":"RICHAR","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"ACONCAGUA","telefono":"1150956695","categoria":"DIAMOND","deudaBase":399000.0,"notas":"ESPEJO LUCES"},{"id":"CLI-005","barberia":"LILI","barbero":"WUILLI","zona":"CHACARITA","ruta":"MARTES","direccion":"CHACARITA","telefono":"1165485441","categoria":"PLATA","deudaBas e":380000.0,"notas":""},{"id":"CLI-006","barberia":"KIKE","barbero":"BRIAYAN","zona":"LINIERS","ruta":"MARTES","direccion":"LINIER","telefono":"1171579607","categoria":"PLATA ","deudaBase":380000.0,"notas":""},{"id":"CLI-007","barberia":"YEREMEY","barbero":"YEREMEY","zona":"FLORES","ruta":"VIERNES","direccion":"LOIRA","telefono":"1127981683","cate goria":"DIAMOND","deudaBase":360000.0,"notas":""},{"id":"CLI-008","barberia":"DILAN","barbero":"DILAN","zona":"VIRREYES","ruta":"JUEVES","direccion":"VIRREYES","telefono":"","categoria":"PLATA","deudaBase":250000.0,"notas":""},{"id":"CLI-009","barberia":"ALEJANDRO","barbero":"OCTI","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CELINA","telefono":"1127092815","categoria":"PLATA","deudaBase":209000.0,"notas":""},{"id":"CLI-010","barberia":"ALEJANDRO","barbero":"JOSE","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CELINA","telefono":"93813444418","categoria":"PLATA","deudaBase":195000.0,"notas":""},{"id":"CLI-011","barberia":"GALERIA LAS VIAS","barbero":"MARCELA","zona":"LINIERS","ruta":"MARTES","direccion":"LINIER","telefono":"1121626964","categoria":"PLATA","deuda Base":182000.0,"notas":""},{"id":"CLI-012","barberia":"MARCELO","barbero":"TOMAS","zona":"VIRREYES","ruta":"JUEVES","direccion":"AV VIRREYES","telefono":"1163689433","categoria":"DIAMOND","deudaBase":165000.0,"notas":""},{"id":"CLI-013","barberia":"COFRADA","barbero":"SANTINO","zona":"JONTE","ruta":"VIERNES","direccion":"ALVARES JONTE","telefono":"","categoria":"PLATA","deudaBase":180000.0,"notas":""},{"id":"CLI-014","barberia":"TIZIANO","barbero":"LOIRA","zona":"LOIRA","ruta":"A DEFINIR","direccion":"","telefono":"1138460392","categoria":"PLATA","deudaBase":158000.0,"notas":"158000"},{"id":"CLI-015","barberia":"GOLLO","barbero":"CARLOS","zona":"OLAVARRIA","ruta":"LUNES / VIERNES","direccion":"OLAVARRIA","telefono":"1158748157","categoria":"PLATA","deudaBase":140000.0,"notas":""},{"id":"CLI-016","barberia":"GUARDADO BAR.","barbero":"LUCAS","zona":"POMPEYA","ruta":"VIERNES","direccion":"PLAZA POMPEYA","telefono":"1123583789","categoria":"DIAMOND","deudaBase":130000.0,"notas":""},{"id":"CLI-017","barberia":"TREN","barbero":"NICOLAS","zona":"FEDERICO LA CROS","ruta":"MARTES","direccion":"FEDERICO LA CROS","telefono":"93772692630","categoria":"PLATA","deudaBase":120000.0,"notas":""},{"id":"CLI-018","barberia":"BARBERIA ESPAÑA","barbero":"MATI","zona":"PIÑERO","ruta":"JUEVES","direccion":"PIÑERO","telefono":"1135600316","categoria":"PLATA","deudaBase ":200000.0,"notas":""},{"id":"CLI-019","barberia":"COFRADA","barbero":"ROMAN","zona":"FLORESTA","ruta":"VIERNES","direccion":"ALVARES JONTE","telefono":"1151327104","categoria":"DIAMOND","deudaBase":110000.0,"notas":"VENDER"},{"id":"CLI-020","barberia":"DYNASTY 2","barbero":"YEREMI","zona":"FLORES","ruta":"VIERNES","direccion":"FLORES","telefono":"1126915637","categoria":"PLATA","deudaBase":90000.0,"notas":""},{"id":"CLI-021","barberia":"LILI","barbero":"WUILI PURE","zona":"CHACARITA","ruta":"MARTES","direccion":"CHACARITA","telefono":"1136083479","categoria":"PLATA","deudaBase":89000.0,"notas":"GUANTES Y GEL"},{"id":"CLI-022","barberia":"PUNATA","barbero":"JHONY","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CELINA OLAVA","telefono":"1167877741","categoria":"PLATA","deudaBase":75000.0,"notas":""},{"id":"CLI-023","barberia":"ARMANDO","barbero":"ALEX LENTES","zona":"OLAVARRIA","ruta":"LUNES / VIERNES","direccion":"OLAVARRIA","telefono":"1162859986","categoria":"PLATA","deudaBase":73000.0,"notas":""},{"id":"CLI-024","barberia":"GOLLO","barbero":"LUIS CHAYAN","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"ACONCAGUA","telefono":"1124943517","categoria":"DIAMOND","deudaBase":70000.0,"notas":""},{"id":"CLI-025","barberia":"CHAMO","barbero":"CHAMO","zona":"POMPEYA","ruta":"VIERNES","direccion":"PLAZA POMPEYA","telefono":"1137936448","categoria":"DIAMOND","deudaBase":70000.0,"notas":""},{"id":"CLI-026","barberia":"DIEGO","barbero":"LENIN","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CELINA ACONCAGUA","telefono":"1128772729","categoria":"PLATA","deudaBase":62000.0,"notas":""},{"id":"CLI-027","barberia":"ARMANDO","barbero":"NELSON","zona":"OLAVARRIA","ruta":"LUNES / VIERNES","direccion":"OLAVARRIA","telefono":"1126933939","categoria":"PLATA","deudaBase":60000.0,"notas":""},{"id":"CLI-028","barberia":"NEIMAR","barbero":"NEIMAR","zona":"OLAVARRIA","ruta":"LUNES / VIERNES","direccion":"OLAVARRIA","telefono":"1138881817","categoria":"PLATA","deudaBase":60000.0,"notas":""},{"id":"CLI-029","barberia":"NEIMAR","barbero":"JHONY","zona":"OLAVARRIA","ruta":"LUNES / VIERNES","direccion":"OLAVARRIA","telefono":"1150000477","categoria":"PLATA","deudaBase":60000.0,"notas":""},{"id":"CLI-0 30","barberia":"MARCELO","barbero":"NAHUEL","zona":"VIRREYES","ruta":"JUEVES","direccion":"VIRREYES","telefono":"114091410 8","categoria":"PLATA","deudaBase":55000.0,"notas":""},{"id":"CLI-031","barberia":"YONAIBER","barbero":"YONAIBER","zona":" LINIERS","ruta":"MARTES","direccion":"LINIER","telefono":"1133859906","categoria":"PLATA","deudaBase":42000.0,"notas":""},{"id":"CLI-032","barberia":"LIAN","barbero":"LIAN","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CALLE 1","telefono":"1140443066","categoria":"DIAMOND","deudaBase":70000.0,"notas":""},{"id":"CLI-033","barberia":"JOSE MIGUEL","barbero":"GABRIEL","zona":"FLORES","ruta":"VIERNES","direccion":"INDEPENDENCIA","telefono":"1150504592","categoria" :"DIAMOND","deudaBase":40000.0,"notas":""},{"id":"CLI-034","barberia":"PERON","barbero":"DAVID","zona":"CHACABUCO","ruta":"A DEFINIR","direccion":"MIRAFLOREZ 2393","telefono":"1123888713","categoria":"DIAMOND","deudaBase":37000.0,"notas":""},{"id":"CLI-035","barberia":"ALEJANDRO","barbero":"TOÑO","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CELINA","telefono":"93518087617","categoria":"PLATA","deudaBase":30000.0,"notas":""},{"id":"CLI-036","barberia":"GOLLO","barbero":"GOLLO","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"OLAVARRIA","telefono":"1138784056","categoria":"DIAMOND","deudaBase":30000.0,"notas":""},{"id":"CLI-037","barberia":"GOLLO","barbero":"JESUS","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"ACONCAGUA","telefono":"1168846320","categoria":"DIAMOND","deudaBase":30000.0,"notas":""},{"id":"CLI-038","barberia":"YEREMEY","barbero":"CRISTIAN", "zona":"FLORES","ruta":"VIERNES","direccion":"LOIRA","telefono":"1134190553","categoria":"DIAMOND","deudaBase":30000.0,"notas":""},{"id":"CLI-039","barberia":"PELUQUERIA ALMENDRA","barbero":"MARI","zona":"OLAVARRIA","ruta":"LUNES / VIERNES","direccion":"OLAVARRIA","telefono":"","categoria":"PLATA","deudaBase":30000.0,"notas":"DEJE 2 CAPAS Y ME ENCARGO 2 CAPAS MAS SON EVEREST"},{"id":"CLI-040","barberia":"LA CABRA","barbero":"JHONATHAN","zona":"POMPEYA","ruta":"VIERNES","direccion":"PLAZA POMPEYA","telefono":"1138570346","categoria":"DIAMOND","deudaBase":27000.0,"notas":""},{"id":"CLI-041","barberia":"RIKI","barbero":"RIKY","zona":"LINIERS","ruta":"MARTES","direccion":"EST TREN LINIER","telefono":"1150494160","categoria":"DIAMOND","deudaBase":25000.0,"notas":""},{"id":"CLI-042","barberia":"ENCO","barbero":"ENCO","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"ACONCAGUA","telefono":"1153197616","categoria":"DIAMOND","deudaBase":24000.0,"notas":""},{"id":"CLI-043","barberia":"PUNATA","barbero":"PEDRO","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CELINA OLAVA","telefono":"1160357090","categoria":"PLATA","deudaBase":17000.0,"notas":""},{"id":"CLI-044","barberia":"ARMANDO","barbero":"ARMANDO","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CELINA OLAVA","telefono":"1178403756","categoria":"PLATA","deudaBase":5000.0,"notas":""},{"id":"CLI-045","barberia":"COFRADA","barbero":"SEBASTIAN","zona":"","ruta":"A DEFINIR","direccion":"","telefono":"","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-046","barberia":"JUAN VIRREYES","barbero":"JUAN","zona":"","ruta":"A DEFINIR","direccion":"AV. AVELLANEDA","telefono":"","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-047","barberia":"GOLLO","barbero":"DANI","zona":"ACONCAGUA","ruta":"A DEFINIR","direccion":"ACONCAGUA","telefono":"11671038807","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-048","barberia":"SEBASTIAN","barbero":"SEBASTIAN","zona":"ACOYTE","ruta":"VIERNES","direccion":"VIEL 374","telefono":"","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-049","barberia":"LEO","barbero":"LEO","zona":"ALSINA","ruta":"VIERNES","direccion":"TG JD PERON 2195","telefono":"1132772157","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-050","barberia":"LEO","barbero":"FABIAN","zona":"ALSINA","ruta":"VIERNES","direccion":"RIVADAVIA 2112","telefono":"1121731780","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-051","barberia":"LEO","barbero":"NICO","zona":"ALSINA","ruta":"VIERNES","direccion":"RIVADAVIA 2112","telefono":"1127987300","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-052","barberia":"LEO","barbero":"JULIOG GODOY","zona":"ALSINA","ruta":"VIERNES","direccion":"RIVADAVIA 2112","telefono":"1136041211","categoria":"COBRE","deudaBase":0.0,"notas":""},{"id":"CLI-053","barberia":"LEO","barbero":"TOVIAS","zona":"ALSINA","ruta":"VIERNES","direccion":"RIVADAVIA 2112","telefono":"1138433154","categoria":"PLATA","deudaBase":0.0,"notas":"155000 | 180000"},{"id":"CLI-054","barberia":"LEO","barbero":"LAUTARO","zona":"ALSINA","ruta":"VIERNES","direccion":"ALSINA","telefono":"112 5399957","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-055","barberia":"LEO","barbero":"JHOEL","zona":"ALSINA","ruta":"VIERNES","direccion":"ALSINA","telefono":"1123269387","categoria":"PLATA","deudaBase":0.0,"notas":"REPUESTO DE SHAVER"},{"id":"CLI-056","barberia":"MAURO","barbero":"MAURO","zona":"AVELLANEDA","ruta":"JUEVES","direccion":"AVELLANEDA MITRE 2915","telefono":"1166642715","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-057","barberia":"VERONA","barbero":"ALEJO","zona":"CABALLITO","ruta":"VIERNES","direccion":"PLAZA IRLANDA","telefono":"1127899962","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-058","barberia":"ALEJANDRO","barbero":"CHCHI","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CALLE 1 Y 7","telefono":"1133224637","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-059","barberia":"ALEJANDRO","barbero":"JUAN DIA","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CALLE 1 Y 7","telefono":"1136623187","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-060","barberia":"ALEJANDRO","barbero":"ALEJANDRO","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CALLE 1 Y 7","telefono":"1155886521","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-061","barberia":"ALEJANDRO","barbero":"CHICHI","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CELINA","telefono":"1133224637","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-062","barberia":"ALEJANDRO","barbero":"JUAN DIAZ","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CELINA","telefono":"1136623187","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-063","barberia":"ALEJANDRO","barbero":"SEBASTIAN","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CELINA LLAMADA 1","telefono":"1172709244","categoria":"PLATA","deudaBase":40000.0,"notas":""},{"id":"CLI-064","barberia":"ALMEDRA FELIPE","barbero":"LUIS","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CELINA OLAVA","telefono":"1172375084","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-065","barberia":"CHINGADA","barbero":"CARLOS","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CALLE 2","telefono":"1127388385","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-066","barberia":"DEMIAN","barbero":"FACUNDO","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"ENTRADA OLAVARRIA","telefono":"1159730226","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-067","barberia":"ENCO","barbero":"LUIZAO","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"ACONCAGUA","telefono":"1165560279","categoria":"DIAMOND","deudaBase":25000.0,"notas":""},{"id":"CLI-068","barberia":"ENCO","barbero":"EFRAIN","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"ACONCAGUA","telefono":"1139391081","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-069","barberia":"ENMANUEL","barbero":"ENMANUEL","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"ROTONDA","telefono":"1151613432","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-070","barberia":"GOLLO","barbero":"JHONY","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"ACONCAGUA","telefono":"1150000417","categoria":"DIAMANTE","deudaBase":0.0,"notas":""},{"id":"CLI-071","barberia":"GOLLO","barbero":"ALEXI","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"OLAVARRIA","telefono":"1144721760","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-072","barberia":"GOLLO","barbero":"MARCOS","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"BARRIO PRIVADO","telefono":"1136356436","categoria":"DIAMOND","deudaBase":0.0,"notas":"TRAER CUCHILLA BABY LISS"},{"id":"CLI-073","barberia":"MAGISTRAL","barbero":"MAGALI","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CALLE 1 OLAVARRIA","telefono":"1128381688","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-074","barberia":"MAGISTRAL","barbero":"ISAIAS","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CALLE 1 OLAVARRIA","telefono":"","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-075","barberia":"MAGISTRAL","barbero":"CHINO","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CELINA","telefono":"1122450007","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-076","barberia":"MAGISTRAL","barbero":"MIGUEL","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CELINA","telefono":"1161183615","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-077","barberia":"MAGISTRAL","barbero":"MAGALY","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CELINA CALLE 1","telefono":"1128381688","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-078","barberia":"PUNATA","barbero":"ABRHAN CHAVO","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CELINA OLAVA","telefono":"1123472839","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-079","barberia":"PUNATA","barbero":"ABRAAN MAMANI","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CELINA OLAVA","telefono":"1151210770","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-080","barberia":"PUNATHA","barbero":"JHONY","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"OLAVARRIA","telefono":"1167877741","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-081","barberia":"RICHAR","barbero":"SERJIO","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"ACONCAGUA","telefono":"1144010789","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-082","barberia":"RICHAR","barbero":"DIEGO","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"ACONCAGUA","telefono":"1128772729","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-083","barberia":"RICHAR","barbero":"LISSET","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CELINA ACONCAGUA","telefono":"1140767406","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-084","barberia":"RICHAR","barbero":"SERGIO","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CELINA ACONCAGUA","telefono":"1144010789","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-085","barberia":"SANDRO KIOSKO","barbero":"KIOSKO","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"OLAVARRIA CALLE1","telefono":"1151442139","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-086","barberia":"SUCRE","barbero":"ISAAC","zona":"CELINA","ruta":"LUNES / VIERNES","direccion":"CELINA OLAVA","telefono":"1153197986","categoria":"PLATA","deudaBase":0.0,"notas":"ENTREGAR CUCHILLA"},{"id":"CLI-087","barberia":"CRISTIAN","barbero":"CRISTIAN","zona":"CHACARITA","ruta":"MARTES","direccion":"FEDERICO LACROZE","telefono":"1133938501","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-088","barberia":"WUIL PURE","barbero":"LILI","zona":"CHACARITA","ruta":"MARTES","direccion":"FEDERICO LACROZE","telefono":"1136083479","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-089","barberia":"WUILL","barbero":"LILI","zona":"CHACARITA","ruta":"MARTES","direccion":"FEDERICO LACROZE","telefono":"1165485441","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-090","barberia":"CATIRE","barbero":"BRYAN","zona":"FLORES","ruta":"VIERNES","direccion":"PLAZA FLORES","telefono":"","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-091","barberia":"CATIRE","barbero":"CATIRE","zona":"FLORES","ruta":"VIERNES","direccion":"PLAZA FLORES","telefono":"","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-092","barberia":"CATIRE","barbero":"KENDER","zona":"FLORES","ruta":"VIERNES","direccion":"PLAZA FLORES","telefono":"","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-093","barberia":"DYNASTY 1","barbero":"DANIEL","zona":"FLORES","ruta":"VIERNES","direccion":"EST CARABOBO","telefono":"1138984714","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-094","barberia":"DYNASTY 1","barbero":"YILBER","zona":"FLORES","ruta":"VIERNES","direccion":"EST CARABOBO","telefono":"93872221046","categoria":"ORO","deudaBase":0.0,"notas":""},{"id":"CLI-095","barberia":"DYNASTY 2","barbero":"WUILL","zona":"FLORES","ruta":"VIERNES","direccion":"EST FLOREZ","telefono":"1157711113","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-096","barberia":"JOSE MIGUEL","barbero":"JOSE MIGUEL","zona":"FLORES","ruta":"VIERNES","direccion":"INDEPENDENCIA","telefono":"1132054956","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-097","barberia":"YEREMY","barbero":"YERAL","zona":"FLORES","ruta ":"VIERNES","direccion":"LOIRA","telefono":"1124843982","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-098","barberia":"COFRADA","barbero":"FERNANDO","zona":"FLORESTA","ruta":"VIERNES","direccion":"ALVARES JONTE","telefono":"1166242020","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-099","barberia":"COFRADA","barbero":"BRYAYAN","zona":"FLORESTA","ruta":"VIERNES","direccion":"ALVARES JONTE","telefono":"1122434871","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-100","barberia":"COFRADA","barbero":"SANTIAGO","zona":"FLORESTA","ruta":"VIERNES","direccion":"ALVARES JONTE","telefono":"1169438052","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-101","barberia":"COFRADA","barbero":"ALEX","zona":"FLORESTA","ruta":"VIERNES","direccion":"ALVARES JONTE","telefono":"1176015132","categoria":"DIAMANTE","deudaBase":0.0,"notas":""},{"id":"CLI-102","barberia":"DI CESARE","barbero":"EMILIO","zona":"FLORESTA","ruta":"VIERNES","direccion":"LÓPEZ DE VEGA 2396","telefono":"11755724896","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-103","barberia":"DI CESARE","barbero":"JUAN","zona":"FLORESTA","ruta":"VIERNES","direccion":"LÓPEZ DE VEGA 2396","telefono":"1167073310","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-104","barberia":"JAVA","barbero":"ROY KIKE","zona":"FLORESTA","ruta":"VIERNES","direccion":"ALVARES JONTE","telefono":"1128884921","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-105","barberia":"COFRADA","barbero":"BAUTISTA","zona":"JONTE","ruta":"VIERNES","direccion":"ALVARES JONTE","telefono":"1131580062","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-106","barberia":"COFRADA","barbero":"ADRIAN","zona":"JONTE","ruta":"VIERNES","direccion":"ALVARES JONTE","telefono":"1169628163","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-107","barberia":"LIDIA","barbero":"LIDIA","zona":"JONTE","ruta":"VIERNES","direccion":"ALVARES JONTE","telefono":"","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-108","barberia":"BARBERIA MARISA","barbero":"JAIRO JOEL","zona":"LINIERS","ruta":"MARTES","direccion":"LINIER","telefono":"93886650020","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-109","barberia":"BARBERIA VILMA","barbero":"VILMA","zona":"LINIERS","ruta":"MARTES","direccion":"LINIER","telefono"1128742638","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-110","barberia":"CARLOS","barbero":"CARLOS","zona":"LINIERS","ruta":"MARTES","direccion":"FRANCISCO DE VIETMA 6905","telefono":"1125786961","categoria":"DIAMOND","deudaBase":0.0,"notas":"BUSCAR FOTO"},{"id":"CLI-111","barberia":"CARLOS","barbero":"YONAIKER","zona":"LINIERS","ruta":"MARTES","direccion":"FRANCISCO DE VIETMA 6905","telefono":"1133859906","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-112","barberia":"CARLOS","barbero":"GONZALO","zona":"LINIERS","ruta":"MARTES","direccion":"FRANCISCO DE VIETMA 6905","telefono":"1126621180","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-113","barberia":"FABIOLA","barbero":"ROKI","zona":"LINIERS","ruta":"MARTES","direccion":"EST TREN LINIER","telefono":"1139104691","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-114","barberia":"PATRICIA","barbero":"FREDDY","zona":"LINIERS","ruta":"MARTES","direcc ion":"LINIER","telefono":"","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-115","barberia":"RIKI","barbero":"GONZALO","zona":"LINIERS","ruta":"MARTES","direccion":"EST tren LINIER","telefono":"1144002506","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-116","barberia":"ROKI","barbero":"FABIOLA","zona":"LINI ERS","ruta":"MARTES","direccion":"LINIER","telefono":"1139104691","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-117","barberia":"YEREMEY DOMINICANO","barbero":"WUILIAN","zona":"LOIRA","ruta":"A DEFINIR","direccion":"LOIRA","telefono":"","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-118","barberia":"LÓPEZ DE VEGA","barbero":"JUAN VALCASA","zona":"LOPE DE VEGA","ruta":"A DEFINIR","direccion":"LOPE DE VEGA","telefono":"1167073310","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-119","barberia":"ALMENDRA","barbero":"FELIPE","zona":"OLAVARRIA","ruta":"LUNES / VIERNES","direccion":"OLAVARRIA","telefono":"1172071429","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-120","barberia":"GOLLO","barbero":"MATIAS","zona":"OLAVARRIA","ruta":"LUNES / VIERNES","direccion":"OLAVARRIA","telefono":"1124077739","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-121","barberia":"LARRI","barbero":"LARRI","zona":"OLAVARRIA","ruta":"LUNES / VIERNES","direccion":"OLAVARRIA","telefono":"1139415963","categoria":"PLATA","deudaBase":0.0,"notas":"2299"},{"id":"CLI-122","barberia":"CHAMO","barbero":"CARLLOS","zona":"POMPEYA","ruta":"VIERNES","direccion":"PLAZA POMPEYA","telefono":"1137936448","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-123","barberia":"DEICY","barbero":"RENSO","zona":"POMPEYA","ruta":"VIERNES","direccion":"PLAZA POMPEYA","telefono":"1150574502","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-124","barberia":"DEICY","barbero":"NORA","zona":"POMPEYA","ruta":"VIERNES","direccion":"PLAZA POMPEYA","telefono":"1123317044","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-125","barberia":"DEICY","barbero":"PETTY","zona":"POMPEYA","ruta":"VIERNES","direccion":"PLAZA POMPEYA","telefono":"1125944247","categoria":"COBRE","deudaBase":0.0,"notas":""},{"id":"CLI-126","barberia":"DEICY","barbero":"DEISY","zona":"POMPEYA","ruta":"VIERNES","direccion":"PLAZA POMPEYA","telefono":"1159280371","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-127","barberia":"JOSE","barbero":"JOSE","zona":"POMPEYA","ruta":"VIERNES","direccion":"PUENTE POMPEYA","telefono":"1144018303","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-128","barberia":"LUZ","barbero":"LUZ","zona":"POMPEYA","ruta":"VIERNES","direccion":"PLAZA POMPEYA","telefono":"1167806221","categoria":"COBRE","deudaBase":0.0,"notas":""},{"id":"CLI-129","barberia":"BARBERIA MAERCELO","barbero":"AXEL","zona":"VIRREYES","ruta":"JUEVES","direccion":"VIRREYES","telefono":"1161271853","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-130","barberia":"COÑA"," barbero":"EXEQUIEL","zona":"VIRREYES","ruta":"JUEVES","direccion":"VIRREYES","telefono":"","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-131","barberia":"JUAN","barbero":"LAUTARO JUAN","zona":"VIRREYES","ruta":"JUEVES","direccion":"AV VIRREYES","telefono":"","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-132","barberia":"MARCELO","barbero":"ROY","zona":"VIRREYES","ruta":"JUEVES","direccion":"AV VIRREYES","telefono":"","categoria":"DIAMOND","deudaBase":0.0,"notas":""},{"id":"CLI-133","barberia":"MARCELO","barbero":"MARCELO","zona":"VIRREYES","ruta":"JUEVES","direccion":"AV VIRREYES","telefono":"","categoria":"DIAMANTE","deudaBase":0.0,"notas":""},{"id":"CLI-134","barberia":"VENEZOLANO","barbero":"RAMIRO" ,"zona":"WILDE","ruta":"JUEVES","direccion":"WUILDE","telefono":"","categoria":"PLATA","deudaBase":0.0,"notas":""},{"id":"CLI-135"," barberia":"VENEZOLANO","barbero":"RAULO","zona":"WILDE","ruta":"JUEVES","direccion":"WUILDE","telefono":"","categoria":"PLATA","deud aBase":0.0,"notas":""},{"id":"CLI-136","barberia":"VERONA","barbero":"MANUEL","zona":"CABALLITO","ruta":"VIERNES","direccion":"PLAZA IRLANDA","telefono":"1123869422","categoria":"DIAMOND","deudaBase":20000.0,"notas":""}],"movs":[{"id":"MOV-001","fecha":"2026-11-01","barberia":"COFRADA","barbero":"SANTINO","tipo":"ABONO / PAGO","detalle":"Abono registrado en hoja Noviembre","medio":"EFECTIVO","monto":20000.0,"obs":"Migrado de hoja Deudores"},{"id":"MOV-002","fecha":"2026-11-01","barberia":"BARBERIA ESPAÑA","barbero":"MATI","tipo":"ABONO / PAGO","detalle":"Abono registrado en hoja Noviembre","medio":"EFECTIVO","monto":80000.0,"obs":"Migrado de hoja Deudores"},{"id":"MOV-003","fecha":"2026-11-01","barberia":"LIAN","barbero":"LIAN","tipo":"ABONO / PAGO","detalle":"Abono registrado en hoja Noviembre","medio":"EFECTIVO","monto":30000.0,"obs":"Migrado de hoja Deudores"},{"id":"MOV-004","fecha":"2026-11-01","barberia":"ALEJANDRO","barbero":"SEBASTIAN","tipo":"ABONO / PAGO","detalle":"Abono registrado en hoja Noviembre","medio":"EFECTIVO","monto":40000.0,"obs":"Migrado de hoja Deudores"},{"id":"MOV-005","fecha":"2026-11-01","barberia":"ENCO","barbero":"LUIZAO","tipo":"ABONO / PAGO","detalle":"Abono registrado en hoja Noviembre","medio":"EFECTIVO","monto":25000.0,"obs":"Migrado de hoja Deudores"},{"id":"MOV-006","fecha":"2026-11-01","barberia":"VERONA","barbero":"MANUEL","tipo":"ABONO / PAGO","detalle":"Abono registrado en hoja Noviembre","medio":"EFECTIVO","monto":50000.0,"obs":"Migrado de hoja Deudores"},{"id":"MOV-007","fecha":"2026-10-29","barberia":"MARCELO","barbero":"ELIAS","tipo":"VENTA CONTADO","detalle":"2 repuestos afeitadora, 3 after shave, 4 capas Eloise","medio":"EFECTIVO","monto":100000.0,"obs":"Venta ruta Virreyes"},{"id":"MOV-008","fecha":"2026-10-29","barberia":"COÑA","barbero":"TOMAS","tipo":"VENTA CONTADO","detalle":"1 Cool Care, 1 Dorco, 3 after shave, 1 esterilizador Wmark","medio":"EFECTIVO","monto":220000.0,"obs":"Venta ruta Virreyes"},{"id":"MOV-009","fecha":"2026-11-04","barberia":"VIRREYES","barbero":"MARISOL","tipo":"VENTA CONTADO","detalle":"3 capas y alfombra","medio":"EFECTIVO","monto":99000.0,"obs":"Miércoles 4 Nov"},{"id":"MOV-010","fecha":"2026-11-04","barberia":"COÑA","barbero":"LAUTARO","tipo":"VENTA CONTADO","detalle":"1 Cool Care y 2 filos Treet","medio":"EFECTIVO","monto":65000.0,"obs":"Miércoles 4 Nov"}],"inv":[{"codigo":"ART-001","producto":"GEL DE AFEITAR ORIGINAL NEGRO 750ML","stock":0,"costo":0,"venta":12000},{"codigo":"ART-002","producto":"GOMA CHICA PARA PATILLERA","stock":40,"costo":0,"venta":2000},{"codigo":"ART-003","producto":"GOMA GRANDE PARA AFEITADORA","stock":26,"costo":0,"venta":4000},{"codigo":"ART-004","producto":"GOMA MEDIA PARA MÁQUINA DE CORTE","stock":20,"costo":0,"venta":3000},{"codigo":"ART-005","producto":"GORRO DE MECHAS DOMPEL","stock":2,"costo":0,"venta":9000},{"codigo":"ART-006","producto":"INTERRUPTOR DE MÁQUINA NEGRO - BEIGE","stock":15,"costo":0,"venta":6000},{"codigo":"ART-007","producto":"PATILLERA KEMEI 2299 SIN BASE DE CARGA","stock":2,"costo":0,"venta":30000},{"codigo":"ART-008","producto":"KEMEI 2299 CON BASE DE CARGA","stock":0,"costo":0,"venta":45000},{"codigo":"ART-009","producto":"KIT 8 ALZAS DE COLORES","stock":0,"costo":0,"venta":12000},{"codigo":"ART-010","producto":"MAQUINA AFEITADORA HOMBRE VGR V334","stock":0,"costo":0,"venta":220000},{"codigo":"ART-011","producto":"MAQUINA CORTA PELO VGR V-880 CERÁMICA A MOTOR BLANCA","stock":0,"costo":0,"venta":160000},{"codigo":"ART-012","producto":"MAQUINA CORTADORA DE PELO VGR PRO 885","stock":0,"costo":0,"venta":180000},{"codigo":"ART-013","producto":"MAQUINA CORTAPELO VGR V-001 AZUL","stock":0,"costo":0,"venta":220000},{"codigo":"ART-014","producto":"MAQUINA DE CORTE CLIPPER PROFESIONAL VGR V- 888","stock":0,"costo":0,"venta":180000},{"codigo":"ART-015","producto":"MASAJEADOR BARBER PRO","stock":1,"costo":0,"venta":180000},{"codigo":"ART-016","producto":"NAVAJA AZUL EVEREST","stock":0,"costo":0,"venta":6000},{"codigo":"ART-017","producto":"NAVAJA BARATA NEGRA","stock":7,"costo":0,"venta":2000},{"codigo":"ART-018","producto":"NAVAJA BARBER PRO TRICOLOR","stock":10,"costo":0,"venta":6000},{"codigo":"ART-019","producto":"NAVAJA DE METAL","stock":2,"costo":0,"venta":6000},{"codigo":"ART-020","producto":"NAVAJA MILITAR BARBERO PRO","stock":0,"costo":0,"venta":6000},{"codigo":"ART-021","producto":"NAVAJA MOSKU","stock":0,"costo":0,"venta":6000},{"codigo":"ART-022","producto":"PAR DE OREJERAS","stock":4,"costo":0,"venta":500},{"codigo":"ART-023","producto":"PACK DE 5 ROLLOS PAPEL DE PARA CUELLO","stock":4,"costo":0,"venta":10000},{"codigo":"ART-024","producto":"PALANCA DE MAQUINA DE CORTE","stock":3,"costo":0,"venta":5000},{"codigo":"ART-025","producto":"PAR DE GUANTES NEGROS","stock":9,"costo":0,"venta":150},{"codigo":"ART-026","producto":"PAR GANCHOS NEGROS ZATYS","stock":4,"costo":0,"venta":5000},{"codigo":"ART-027","producto":"PEINE BLANCO ANDIS","stock":0,"costo":0,"venta":5000},{"codigo":"ART-028","producto":"PEINE BROCHA","stock":5,"costo":0,"venta":2000},{"codigo":"ART-029","producto":"PEINE DEGRADO GRIS","stock":13,"costo":0,"venta":5000},{"codigo":"ART-030","producto":"PEINE DORADO","stock":0,"costo":0,"venta":6000},{"codigo":"ART-031","producto":"PEINE MANGO NEGRO","stock":0,"costo":0,"venta":1000},{"codigo":"ART-032","producto":"PEINE METAL ROSADO","stock":0,"costo":0,"venta":6000},{"codigo":"ART-033","producto":"PEINE NAVAJA","stock":2,"costo":0,"venta":1000},{"codigo":"ART-034","producto":"PEINE TEXTURIZADOR","stock":0,"costo":0,"venta":5000},{"codigo":"ART-035","producto":"PEINE METAL","stock":0,"costo":0,"venta":6000},{"codigo":"ART-036","producto":"PEINES NEGROS","stock":39,"costo":0,"venta":1000},{"codigo":"ART-037","producto":"POLO BLACK CON BACHA","stock":0,"costo":0,"venta":180000},{"codigo":"ART-038","producto":"POLO LED DE BARBERIA - CHICO","stock":0,"costo":0,"venta":100000},{"codigo":"ART-039","producto":"POLO LED DE BARBERIA - GRANDE","stock":0,"costo":0,"venta":160000},{"codigo":"ART-040","producto":"POLO LED DE BARBERIA - MEDIANO","stock":3,"costo":0,"venta":130000},{"codigo":"ART-041","producto":"POLVO TEXTURIZADOS ORIGINAL NEGRO","stock":5,"costo":0,"venta":6000},{"codigo":"ART-042","producto":"POMADA ORIGINAL NEGRA 50ML","stock":1,"costo":0,"venta":6000},{"codigo":"ART-043","producto":"PORTA ROLLO DE PAPEL PARA CUELLO","stock":6,"costo":0,"venta":8000},{"codigo":"ART-044","producto":"PORTA TIJERAS","stock":0,"costo":0,"venta":20000},{"codigo":"ART-045","producto":"PORTA TIJERAS CALAVERA","stock":1,"costo":0,"venta":10000},{"codigo":"ART-046","producto":"PROTECTOR DE ZAPATOS","stock":36,"costo":0,"venta":3000},{"codigo":"ART-047","producto":"PINCEL /BROCHA","stock":4,"costo":0,"venta":1000},{"codigo":"ART-050","producto":"QUITAPELOS DE LUJO NEGRO","stock":12,"costo":0,"venta":6000},{"codigo":"ART-051","producto":"QUITAPELO DE LUJO TRICOLOR","stock":9,"costo":0,"venta":8000},{"codigo":"ART-052","producto":"QUITAPELOS DE MADERA","stock":3,"costo":0,"venta":6000},{"codigo":"ART-053","producto":"REPUESTO CABEZAL AFEITADORA EVEREST","stock":5,"costo":0,"venta":18000},{"codigo":"ART-054","producto":"REPUESTO CABEZAL AFEITADORA KEMEI","stock":1,"costo":0,"venta":15000},{"codigo":"ART-055","producto":"REPUESTO CUCHILLA 5 ESTRELLAS: CORTADORA CALVIDA","stock":1,"costo":0,"venta":20000},{"codigo":"ART-056","producto":"REPUESTO CUCHILLA BABY LISS FX707BD2","stock":1,"costo":0,"venta":90000},{"codigo":"ART-057","producto":"REPUESTO CUCHILLA BABY LISS FX707G2","stock":3,"costo":0,"venta":90000},{"codigo":"ART-058","producto":"REPUESTO CUCHILLA EVEREST","stock":0,"costo":0,"venta":20000},{"codigo":"ART-059","producto":"REPUESTO CUCHILLA EVEREST T-317","stock":0,"costo":0,"venta":20000},{"codigo":"ART-060","producto":"REPUESTO CUCHILLA SENIOR","stock":0,"costo":0,"venta":45000},{"codigo":"ART-061","producto":"REPUESTO CUCHILLA SUPER TAPER WAHL","stock":2,"costo":0,"venta":30000},{"codigo":"ART-062","producto":"REPUESTO CUCHILLA WMARK T-317","stock":1,"costo":0,"venta":15000},{"codigo":"ART-063","producto":"REPUESTO CUCHILLA WMARK W-133","stock":0,"costo":0,"venta":15000},{"codigo":"ART-064","producto":"REPUESTO DE CUCHILLA CLIPPER EVEREST","stock":0,"costo":0,"venta":20000},{"codigo":"ART-065","producto":"REPUESTO DE PORTA CUCHILLA NEGRO","stock":12,"costo":0,"venta":20000},{"codigo":"ART-066","producto":"RESORTE","stock":10,"costo":0,"venta":4000},{"codigo":"ART-067","producto":"ROCIADOR BARBERÍA","stock":30,"costo":0,"venta":3000},{"codigo":"ART-068","producto":"ROCIADOR EVEREST ELÉCTRICO","stock":5,"costo":0,"venta":70000},{"codigo":"ART-069","producto":"ROCIADOR EVEREST MANUAL","stock":0,"costo":0,"venta":13000},{"codigo":"ART-070","producto":"SECADOR DE PELO PROFESIONAL VGR V-441METAL PLASMA 11000 RPM DORADO","stock":0,"costo":0,"venta":90000},{"codigo":"ART-071","producto":"SECADORDE PELO PROFESIONAL VGR V-401 11000 RPM FRIO CALOR NEGRO","stock":0,"costo":0,"venta":210000},{"codigo":"ART-072","producto":"SET DE 10 PEINES","stock":6,"costo":0,"venta":6000},{"codigo":"ART-073","producto":"AFEITADORA ANDIS","stock":1,"costo":0,"venta":190000},{"codigo":"ART-074","producto":"SUJETADORES TRU BARBER","stock":4,"costo":0,"venta":2000},{"codigo":"ART-075","producto":"TACHO CHICO","stock":2,"costo":0,"venta":6000},{"codigo":"ART-076","producto":"TACHO FILOS GRANDE","stock":4,"costo":0,"venta":6000},{"codigo":"ART-077","producto":"TARJETA DE MÁQUINA","stock":4,"costo":0,"venta":20000},{"codigo":"ART-078","producto":"TIJERA TINA DRAGON JAPONESAS","stock":4,"costo":0,"venta":39000},{"codigo":"ART-079","producto":"TIJERA DE CORTE TORNILLO AZUL","stock":5,"costo":0,"venta":5000},{"codigo":"ART-080","producto":"TIJERA DE PULIR ENTRE SACAR TORNILLO AZUL","stock":9,"costo":0,"venta":5000},{"codigo":"ART-081","producto":"TIJERA DE PULIR PAKISTANÍ","stock":1,"costo":0,"venta":39000},{"codigo":"ART-082","producto":"TIJERAS DE CORTE PAKISTANÍ","stock":5,"costo":0,"venta":39000},{"codigo":"ART-083","producto":"TIJERA EVEREST SURDO CHICA ROYAL","stock":1,"costo":0,"venta":39000},{"codigo":"ART-084","producto":"TIJERAS DE CORTE EVEREST 6","stock":5,"costo":0,"venta":39000},{"codigo":"ART-085","producto":"TIJERAS DE CORTE DE 6 PULGADAS Y MEDIA","stock":4,"costo":0,"venta":39000},{"codigo":"ART-086","producto":"TIJERAS EVEREST PULIR","stock":4,"costo":0,"venta":39000},{"codigo":"ART-088","producto":"TRIO DE ALZAS - VERDE, MORADO Y ROJA","stock":15,"costo":0,"venta":6000},{"codigo":"ART-089","producto":"TRIO DE ALZAS - NEGRAS Y METAL","stock":0,"costo":0,"venta":6000},{"codigo":"ART-090","producto":"DUO DE ALZAS VERDE ROJA","stock":4,"costo":0,"venta":4000},{"codigo":"ART-091","producto":"ALZAS 0,5","stock":0,"costo":0,"venta":6000},{"codigo":"ART-092","producto":"COOL CARE","stock":6,"costo":0,"venta":25000},{"codigo":"ART-093","producto":"DESPUÉS AFEITADO","stock":74,"costo":0,"venta":4500},{"codigo":"ART-094","producto":"FILOS DORCO BLISTER DE 200","stock":44,"costo":0,"venta":23000},{"codigo":"ART-095","producto":"ESTUCHE DE TIJERA ECOCUERO","stock":12,"costo":0,"venta":3000},{"codigo":"ART-096","producto":"CUCHILLA AJUSTABLE EVEREST ALZAS","stock":2,"costo":0,"venta":50000},{"codigo":"ART-097","producto":"SPRAY EVEREST 5 EN 1","stock":18,"costo":0,"venta":6000},{"codigo":"ART-098","producto":"ESPEJO","stock":7,"costo":0,"venta":12000},{"codigo":"ART-099","producto":"CEPILLO TINA GRANDE","stock":4,"costo":0,"venta":6000},{"codigo":"ART-100","producto":"CEPILLO DE MADERA","stock":2,"costo":0,"venta":8000},{"codigo":"ART-101","producto":"VGR 369","stock":2,"costo":0,"venta":40000},{"codigo":"ART-102","producto":"VGR 377","stock":3,"costo":0,"venta":130000},{"codigo":"ART-103","producto":"VGR 886","stock":0,"costo":0,"venta":140000},{"codigo":"ART-104","producto":"VGR 035","stock":1,"costo":0,"venta":240000},{"codigo":"ART-105","producto":"CEPILLO TINA CHICOS","stock":24,"costo":0,"venta":3000},{"codigo":"ART-106","producto":"PEINES NEGRO GENERAL","stock":0,"costo":0,"venta":1000},{"codigo":"ART-107","producto":"PEINE METALICO","stock":10,"costo":0,"venta":6000},{"codigo":"ART-108","producto":"MAQUINA DE PELOS DE NARIZ","stock":0,"costo":0,"venta":15000},{"codigo":"ART-109","producto":"GANCHOS DE METAL PACK DE 12","stock":5,"costo":0,"venta":5000},{"codigo":"ART-110","producto":"ALFOMBRA CHICA ANTIDESLIZANTE","stock":2,"costo":0,"venta":12000},{"codigo":"ART-111","producto":"ALFOMBRA ANTIDESLIZANTE TRU BARBER","stock":3,"costo":0,"venta":15000},{"codigo":"ART-112","producto":"ALFOMBRA SUPREME","stock":2,"costo":0,"venta":15000},{"codigo":"ART-113","producto":"ALFOMBRA APOYA TIJERA TRUE BARBER IMAN","stock":10,"costo":0,"venta":50000},{"codigo":"ART-115","producto":"CUCHILLA DE CERAMICA DOS GUECOS","stock":7,"costo":0,"venta":8000},{"codigo":"ART-116","producto":"CAJITA DE ARPA Y CUCHILLAS PARA AFEITADORA","stock":8,"costo":0,"venta":16000},{"codigo":"ART-117","producto":"ALZA NUMERO 1","stock":6,"costo":0,"venta":5000},{"codigo":"ART-118","producto":"ALZA NUMERO 3","stock":0,"costo":0,"venta":5000},{"codigo":"ART-119","producto":"BROCHA ZATYS DE ROJO Y AZUL","stock":5,"costo":0,"venta":2000},{"codigo":"ART-120","producto":"PALANCA / INTERRUPTOR DE ENCENDIDO Y APAGADO DE MAQUINA","stock":7,"costo":0,"venta":6000},{"codigo":"ART-121","producto":"PROTECTOR DE CABLE","stock":8,"costo":0,"venta":4000},{"codigo":"ART-122","producto":"PALANCA DE CUCHILLA","stock":0,"costo":0,"venta":5000},{"codigo":"ART-123","producto":"PORTA CUCHILLAS METAL","stock":2,"costo":0,"venta":6000},{"codigo":"ART-124","producto":"CABLE CHICO ROJO DE MAQUINA","stock":2,"costo":0,"venta":2000},{"codigo":"ART-125","producto":"CUCHILLA MAGIC CLIP WAHL","stock":3,"costo":0,"venta":30000},{"codigo":"ART-126","producto":"CUCHILLA EVEREST 1792","stock":0,"costo":0,"venta":15000},{"codigo":"ART-127","producto":"CUCHILLA EVEREST DLC","stock":10,"costo":0,"venta":20000},{"codigo":"ART-128","producto":"CUCHILLA WMARK PRO","stock":0,"costo":0,"venta":20000},{"codigo":"ART-129","producto":"CUCHILLA WMARK EN BOLSITA","stock":0,"costo":0,"venta":20000},{"codigo":"ART-130","producto":"CUCHIKKA RECORTADORA DLC ACERO INOX","stock":0,"costo":0,"venta":16500},{"codigo":"ART-131","producto":"CUCHILLA VGR 001","stock":1,"costo":0,"venta":35000},{"codigo":"ART-132","producto":"CUCHILLA WMARK CON CUCHILLA DE CERAMICA","stock":0,"costo":0,"venta":20000},{"codigo":"ART-133","producto":"CUCHILLA IMITACION MAGIC CLIP WAHL","stock":1,"costo":0,"venta":10000},{"codigo":"ART-134","producto":"CABEZAL SHAVER VGR 377","stock":1,"costo":0,"venta":30000},{"codigo":"ART-135","producto":"CAPAS ELOISE","stock":18,"costo":0,"venta":15000},{"codigo":"ART-136","producto":"CAPA EVEREST VERDE","stock":3,"costo":0,"venta":15000},{"codigo":"ART-137","producto":"CAPA EVEREST ROSADA","stock":3,"costo":0,"venta":15000},{"codigo":"ART-138","producto":"CAPA EVEREST NEGRA Y ROJA","stock":6,"costo":0,"venta":15000},{"codigo":"ART-139","producto":"CAPA VGR DISEÑO SELECCION ARGENTINA","stock":3,"costo":0,"venta":10000},{"codigo":"ART-140","producto":"CAPA DE LA SELECCION ARGENTINA GENERICA","stock":1,"costo":0,"venta":15000},{"codigo":"ART-141","producto":"CAPA EVEREST DE LA SELECCION ARGENTINA","stock":0,"costo":0,"venta":18000},{"codigo":"ART-142","producto":"CAPA EVEREST NEGRA Y AZUL","stock":7,"costo":0,"venta":15000},{"codigo":"ART-143","producto":"CAPA EVEREST NEGRA VERDE","stock":2,"costo":0,"venta":15000},{"codigo":"ART-144","producto":"GANCHOS COCODRILO PACK DE 6","stock":3,"costo":0,"venta":5000},{"codigo":"ART-145","producto":"CCHIA CERAMICA DETAILER","stock":2,"costo":0,"venta":8000},{"codigo":"ART-146","producto":"CUCHILLA DE CERAMICA CUATRO GUECOS","stock":6,"costo":0,"venta":8000},{"codigo":"ART-147","producto":"JARRA DE VIDRIO SANITISANTE","stock":2,"costo":0,"venta":30000},{"codigo":"ART-148","producto":"PATILLERA KEMEI 2293","stock":-1,"costo":0,"venta":40000},{"codigo":"ART-149","producto":"PINTURA DE AEROGRAFO","stock":4,"costo":0,"venta":5000},{"codigo":"ART-150","producto":"CABEZAL DE AFEITADORA ANDIS PLUS II","stock":5,"costo":0,"venta":40000},{"codigo":"ART-151","producto":"ESTENCIL AERÓGRAFO","stock":6,"costo":0,"venta":1000},{"codigo":"ART-152","producto":"ACEITE EVEREST","stock":0,"costo":0,"venta":5000},{"codigo":"ART-153","producto":"ACEITE VGR","stock":2,"costo":0,"venta":5000},{"codigo":"ART-154","producto":"RESORTES CIRCULARES OVALADOS","stock":4,"costo":0,"venta":0},{"codigo":"ART-155","producto":"BRAZALETE CON IMAN SUPREMO PARA ALZAS","stock":3,"costo":0,"venta":3000},{"codigo":"ART-156","producto":"CAPA NEGRA","stock":7,"costo":0,"venta":6000},{"codigo":"ART-157","producto":"BABY LISS PRO INFLUENCER COLECCIÓN","stock":1,"costo":0,"venta":280000},{"codigo":"ART-158","producto":"CAJITA DE FILOS TREET","stock":67,"costo":0,"venta":2000},{"codigo":"ART-159","producto":"ALZAS DUO NEGRAS Y GRIS","stock":15,"costo":0,"venta":7000},{"codigo":"ART-160","producto":"CEPILLO NEGRO ANDIS","stock":1,"costo":0,"venta":2000},{"codigo":"ART-161","producto":"BOWL DE TINTURA NEGRO","stock":2,"costo":0,"venta":1000},{"codigo":"ART-162","producto":"ESTUCHE DE TIJERA CON CIERRE","stock":2,"costo":0,"venta":2000},{"codigo":"ART-163","producto":"CAPA ZATYS","stock":2,"costo":0,"venta":6000},{"codigo":"ART-164","producto":"CAPA DE TINTE","stock":1,"costo":0,"venta":3000},{"codigo":"ART-165","producto":"ALZA 1/2","stock":1,"costo":0,"venta":3000},{"codigo":"ART-166","producto":"VGR 938","stock":1,"costo":0,"venta":25000},{"codigo":"ART-167","producto":"AERÓGRAFO","stock":1,"costo":0,"venta":50000},{"codigo":"ART-168","producto":"GEL DE AFEITAR ORIGINAL NEGRO 250 ML","stock":1,"costo":0,"venta":5000},{"codigo":"ART-169","producto":"TIJERAS PAKISTANI","stock":5,"costo":0,"venta":39000},{"codigo":"ART-172","producto":"EFEITADORA SHAVER VGR V325 NEGRO Y AZUL","stock":2,"costo":22359,"venta":44400},{"codigo":"ART-173","producto":"CABEZAL REPUES AFEITADORA VGR V322 NEGRO","stock":2,"costo":5433,"venta":10900},{"codigo":"ART-174","producto":"CUCHILLA REPUES CORTADORA V015 Y V035 NEGRO","stock":3,"costo":20304,"venta":20400},{"codigo":"ART-175","producto":"AET PEINES ALZAS MAGNETICOS VGR POR 8 VERDE","stock":4,"costo":0,"venta":28774},{"codigo":"ART-176","producto":"CUCHILLA VGR V001 NEGRA","stock":2,"costo":0,"venta":48500},{"codigo":"ART-177","producto":"MAQUINA CORTE VGR V285 9000 RPM AMARLLO","stock":2,"costo":0,"venta":151800},{"codigo":"ART-178","producto":"MAQUINA CORTADORA VGRV886C LED IVERDE","stock":2,"costo":0,"venta":63650},{"codigo":"ART-179","producto":"SECADOR DE PELO PROFES VGR V 441 DORADO","stock":5,"costo":0,"venta":93000},{"codigo":"ART-180","producto":"SECADOR DE PELO PROFESIO VGR V445 ROJO","stock":3,"costo":0,"venta":75000},{"codigo":"ART-181","producto":"CORTADORA TRIMMER VGR V977 ROJO","stock":0,"costo":0,"venta":130000},{"codigo":"ART-182","producto":"MAQUINA CORTADORA VGR V880C CERAMICA VERDE","stock":2,"costo":111823,"venta":190000},{"codigo":"ART-183","producto":"MAQUINA PATILLERA VGRE V906 NEGRO Y VERDE","stock":2,"costo":53081,"venta":90000},{"codigo":"ART-184","producto":"REPUESTO PARA VGR V308 Y V640S3","stock":1,"costo":0,"venta":106000},{"codigo":"ART-190","producto":"LOCIÓN BACTERIANA LIQUIDO PARA ESTERILIZADOR","stock":3,"costo":0,"venta":9000}]};"producto":"MAQUINA PATILLERA VGRE V906 NEGRO Y VERDE","stock":2,"costo":53081,"venta":90000},{"codigo":"ART-184","producto":"REPUESTO PARA VGR V308 Y V640S3","stock":1,"costo":0,"venta":106000},{"codigo":"ART-190","producto":"LOCIÓN BACTERIANA LIQUIDO PARA ESTERILIZADOR","stock":3,"costo":0,"venta":9000}]};"producto":"MAQUINA PATILLERA VGRE V906 NEGRO Y VERDE","stock":2,"costo":53081,"venta":90000},{"codigo":"ART-184","producto":"REPUESTO PARA VGR V308 Y V640S3","stock":1,"costo":0,"venta":106000},{"codigo":"ART-190","producto":"LOCIÓN BACTERIANA LIQUIDO PARA ESTERILIZADOR","stock":3,"costo":0,"venta":9000}]};

const STORAGE_KEY = 'rapibarbe_db_v2';
const CONFIG_KEY = 'rapibarbe_config_v2';

let db = { clientes: [], movimientos: [], inventario: [] };
let config = {
  PIN: '1234',
  cloudKey: '',
  cloudBin: ''
};

let activeRouteFilter = 'TODOS';

// Formateador de moneda Argentina
const fmtMoney = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  cargarConfiguración();
  cargarDatosLocales();
  document.getElementById('mov-fecha').value = new Date().toISOString().split('T')[0];

  // Verificar si ya está desbloqueado en esta sesión
  Si (sessionStorage.getItem('rapibarbe_unlocked') === '1') {
    mostrarAplicación();
  }
});

función loadConfig() {
  const saved = localStorage.getItem(CONFIG_KEY);
  si (guardado) {
    try { config = { ...config, ...JSON.parse(saved) }; } catch (e) {}
  }
  document.getElementById('cloud-key').value = config.cloudKey || '';
  document.getElementById('cloud-bin').value = config.cloudBin || '';
}

función saveConfigLocal() {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

función loadLocalData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  si (guardado) {
    intentar {
      db = JSON.parse(saved);
    } capturar (e) {
      db = JSON.parse(JSON.stringify(INITIAL_DATA));
    }
  } demás {
    db = JSON.parse(JSON.stringify(INITIAL_DATA));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }
}

función asíncrona persistData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  renderAll();

  si (config.cloudKey && config.cloudBin) {
    setSyncStatus('Sincronizando con nube...', false);
    intentar {
      const res = await fetch(`https://api.jsonbin.io/v3/b/${config.cloudBin}`, {
        método: 'PUT',
        encabezados: {
          'Content-Type': 'application/json',
          'X-Master-Key': config.cloudKey
        },
        cuerpo: JSON.stringify(db)
      });
      si (res.ok) {
        setSyncStatus('Sincronizado en la nube ✓', true);
      } demás {
        setSyncStatus('Error al subir a la nube (guardado local OK)', false);
      }
    } capturar (error) {
      setSyncStatus('Sin internet (guardado en dispositivo)', false);
    }
  } demás {
    setSyncStatus('Guardado en este dispositivo', false);
  }
}

función asíncrona syncFromCloud() {
  si (!config.cloudKey || !config.cloudBin) {
    showToast('Configura tu clave API en la pestaña "Nube & PIN" para sincronizar entre dispositivos.');
    switchTab('nube');
    devolver;
  }
  setSyncStatus('Descargando la nube...', false);
  intentar {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${config.cloudBin}/latest`, {
      encabezados: { 'X-Master-Key': config.cloudKey }
    });
    if (!res.ok) throw new Error('Error de lectura');
    const json = await res.json();
    Si (json.record && json.record.clients) {
      db = json.record;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      renderAll();
      setSyncStatus('Nube actualizada ✓', true);
      showToast('Datos actualizados desde la nube');
    }
  } capturar (e) {
    setSyncStatus('No se pudo conectar a la nube', false);
    showToast('Error al descargar datos de la nube');
  }
}

función asíncrona createCloudBin() {
  const key = document.getElementById('cloud-key').value.trim();
  si (!clave) {
    showToast('Pegá primero tu X-Master-Key de JSONBin.io');
    devolver;
  }
  config.cloudKey = clave;
  showToast('Creando base de datos privados en la nube...');
  intentar {
    const res = await fetch('https://api.jsonbin.io/v3/b', {
      método: 'POST',
      encabezados: {
        'Content-Type': 'application/json',
        'X-Master-Key': llave,
        'X-Bin-Nombre': 'Rapibarbe_DB_Privada',
        'X-Bin-Private': 'verdadero'
      },
      cuerpo: JSON.stringify(db)
    });
    const data = await res.json();
    si (data.metadata && data.metadata.id) {
      config.cloudBin = data.metadata.id;
      document.getElementById('cloud-bin').value = config.cloudBin;
      guardarConfiguraciónLocal();
      setSyncStatus('Nube privada conectada ✓', true);
      showToast('¡Nube creado y conectado! Guardá tu Bin ID para usarlo en otro dispositivo.');
    } demás {
      showToast('Revisá que tu X-Master-Key sea correcto.');
    }
  } capturar (e) {
    showToast('Error de conexión con JSONBin.io');
  }
}

función saveCloudConfig(e) {
  e.preventDefault();
  config.cloudKey = document.getElementById('cloud-key').value.trim();
  config.cloudBin = document.getElementById('cloud-bin').value.trim();
  guardarConfiguraciónLocal();
  showToast('Configuración de nube guardada');
  if (config.cloudKey && config.cloudBin) syncFromCloud();
}

función setSyncStatus(texto, isCloud) {
  const el = document.getElementById('sync-status');
  el.innerHTML = `<span class="dot ${isCloud ? 'dot-cloud' : 'dot-local'}"></span> ${text}`;
}

// Seguridad / PIN
función unlockApp(e) {
  e.preventDefault();
  const val = document.getElementById('pin-input').value.trim();
  si (val === config.pin) {
    sessionStorage.setItem('rapibarbe_unlocked', '1');
    mostrarAplicación();
  } demás {
    document.getElementById('login-error').style.display = 'block';
  }
}

función showApp() {
  document.getElementById('lock-screen').style.display = 'none';
  document.getElementById('app-shell').style.display = 'block';
  si (config.cloudKey && config.cloudBin) {
    syncFromCloud();
  } demás {
    renderAll();
  }
}

función lockApp() {
  sessionStorage.removeItem('rapibarbe_unlocked');
  document.getElementById('pin-input').value = '';
  document.getElementById('lock-screen').style.display = 'flex';
  document.getElementById('app-shell').style.display = 'none';
}

función actualizarPin(e) {
  e.preventDefault();
  const newPin = document.getElementById('new-pin').value.trim();
  if (newPin.length < 4) return showToast('El PIN debe tener al menos 4 dígitos');
  config.pin = nuevoPin;
  guardarConfiguraciónLocal();
  document.getElementById('new-pin').value = '';
  showToast('PIN actualizado correctamente');
}

// Navegación
función switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-pill').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  document.querySelector(`.nav-pill[data-tab="${tabId}"]`).classList.add('active');
}

// Cálculo dinámico de saldo por cliente
función obtenerSaldoCliente(cliente) {
  let saldo = Number(client.deudaBase) || 0;
  const b1 = (client.barberia || '').trim().toUpperCase();
  const b2 = (cliente.barbero || '').trim().toUpperCase();

  db.movs.forEach(m => {
    const mb1 = (m.barberia || '').trim().toUpperCase();
    const mb2 = (m.barbero || '').trim().toUpperCase();
    si (mb1 === b1 && mb2 === b2) {
      if (m.tipo === 'VENTA FIADA') saldo += Número(m.monto) || 0;
      if (m.tipo === 'ABONO / PAGO') saldo -= Número(m.monto) || 0;
    }
  });
  devolver saldo;
}

función renderAll() {
  renderizarKPIs();
  renderDashboard();
  renderMovements();
  renderClients();
  renderInventory();
  rellenarClientDatalist();
}

función renderKPIs() {
  sea ​​totalDeuda = 0;
  sea ​​deudoresCount = 0;

  db.clients.forEach(c => {
    const saldo = getClientBalance(c);
    si (saldo > 0) {
      totalDeuda += saldo;
      deudoresCount++;
    }
  });

  sea ​​totalCobrado = 0;
  let ventasContado = 0;
  let ventasFiadas = 0;

  db.movs.forEach(m => {
    monto constante = Número(m.monto) || 0;
    if (m.tipo === 'ABONO / PAGO') totalCobrado += monto;
    if (m.tipo === 'VENTA CONTADO') ventasContado += monto;
    if (m.tipo === 'VENTA FIADA') ventasFiadas += monto;
  });

  const lowStock = db.inv.filter(i => Number(i.stock) <= 3).length;

  document.getElementById('kpi-deuda').textContent = fmtMoney(totalDeuda);
  document.getElementById('kpi-deudores-count').textContent = `${deudoresCount} barberos con saldo pendiente`;
  document.getElementById('kpi-cobrado').textContent = fmtMoney(totalCobrado);
  document.getElementById('kpi-ventas').textContent = fmtMoney(ventasContado + ventasFiadas);
  document.getElementById('kpi-ventas-split').textContent = `Contado: ${fmtMoney(ventasContado)} | Fiado: ${fmtMoney(ventasFiadas)}`;
  document.getElementById('kpi-stock-bajo').textContent = lowStock;
}

función setRouteFilter(route, btn) {
  filtroRutaActiva = ruta;
  document.querySelectorAll('#route-filters .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderDashboard();
}

función renderDashboard() {
  const q = (document.getElementById('dash-search').value || '').toLowerCase();
  const tbody = document.getElementById('dash-debtors-body');

  const deudores = db.clientes
    .map(c => ({ ...c, saldoActual: getClientBalance(c) }))
    .filter(c => c.saldoActual > 0)
    .filter(c => activeRouteFilter === 'TODOS' || (c.ruta || '').toUpperCase().includes(activeRouteFilter))
    .filter(c =>
      (c.barberia || '').toLowerCase().includes(q) ||
      (c.barbero || '').toLowerCase().includes(q) ||
      (c.zona || '').toLowerCase().includes(q)
    )
    .sort((a, b) => b.saldoActual - a.saldoActual);

  tbody.innerHTML = debtors.length ? debtors.map(c => {
    const cleanPhone = (c.telefono || '').replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('54') ? cleanPhone : (cleanPhone ? '549' + cleanPhone : '');
    const waMsg = encodeURIComponent(`Hola ${c.barbero}! ¿Cómo va? Te escribo de Rapibarbe para recordarte el saldo pendiente de ${fmtMoney(c.saldoActual)}. Avisame cuando pase por ${c.zona || 'tu local'}!`);
    const waBtn = waPhone
      `<a href="https://wa.me/${waPhone}?text=${waMsg}" target="_blank" class="btn-sm btn-wa">WhatsApp</a>`
      : '';

    devolver `
      <tr>
        <td>
          <div class="font-bold">${c.barberia}</div>
          <div class="muted">${c.barbero}</div>
        </td>
        <td>
          <div>${c.zona || '-'}</div>
          <div class="muted" style="font-size:11px;">${c.ruta || 'A DEFINIR'}</div>
        </td>
        <td class="text-right font-bold text-amber">${fmtMoney(c.saldoActual)}</td>
        <td class="text-right" style="white-space:nowrap;">
          ${waBtn}
          <button class="btn-sm btn-pay" onclick="quickPayment('${c.barberia.replace(/'/g, "\\'")}', '${c.barbero.replace(/'/g, "\\'")}', ${c.saldoActual})">+ Cobrar</button>
        </td>
      </tr>
    `;
  }).join('') : `<tr><td colspan="4" class="text-center muted" style="padding:24px;">No hay deudas pendientes en este filtro.</td></tr>`;

  // Gráfico de barras por ruta
  const routeTotals = {};
  db.clients.forEach(c => {
    const s = getClientBalance(c);
    si (s > 0) {
      const r = c.ruta || 'UNA DEFINICIÓN';
      routeTotals[r] = (routeTotals[r] || 0) + s;
    }
  });
  const maxRoute = Math.max(...Object.values(routeTotals), 1);
  const barsHtml = Object.entries(routeTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([ruta, total]) => `
      <div class="bar-row">
        <div class="bar-labels">
          <span>${ruta}</span>
          <span class="font-bold">${fmtMoney(total)}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${Math.round((total / maxRoute) * 100)}%"></div>
        </div>
      </div>
    `).join('');
  document.getElementById('route-bars').innerHTML = barsHtml || '<p class="muted">Sin deudas activas</p>';

  // Últimos 5 movimientos
  const reciente = [...db.movs].reverse().slice(0, 5);
  document.getElementById('recent-movs-list').innerHTML = recent.map(m => {
    const isPay = m.tipo === 'ABONO / PAGO';
    devolver `
      <div class="activity-item">
        <div>
          <div class="font-bold" style="font-size:13px;">${m.barberia} — ${m.barbero}</div>
          <div class="muted" style="font-size:11.5px;">${m.fecha} · ${m.detalle || m.tipo}</div>
        </div>
        <div class="font-bold ${isPay ? 'text-green' : 'text-main'}">
          ${isPagar? '+' : ''}${fmtMoney(m.monto)}
        </div>
      </div>
    `;
  }).unirse('');
}

función pagorápido(barbería, barbero, saldo) {
  switchTab('movimientos');
  document.getElementById('mov-tipo').value = 'ABONO / PAGO';
  document.getElementById('mov-cliente-search').value = `${barberia} | ${barbero}`;
  document.getElementById('mov-monto').value = saldo;
  document.getElementById('mov-detalle').value = 'Bono de saldo pendiente';
  document.getElementById('mov-monto').focus();
}

función populateClientDatalist() {
  const dl = document.getElementById('clientes-datalist');
  dl.innerHTML = db.clients.map(c => `<option value="${c.barberia} | ${c.barbero}">${c.zona} (${c.ruta})</option>`).join('');
}

función saveMovement(e) {
  e.preventDefault();
  const rawCli = document.getElementById('mov-cliente-search').value.trim();
  let barberia = rawCli;
  let barbero = '';
  si (rawCli.includes('|')) {
    const partes = rawCli.split('|');
    barberia = partes[0].trim();
    barbero = partes[1].recortar();
  }

  const newMov = {
    id: 'MOV-' + Date.now(),
    fecha: document.getElementById('mov-fecha').value,
    barberia: barberia.toUpperCase(),
    barbero: barbero.toUpperCase(),
    tipo: document.getElementById('mov-tipo').value,
    detalle: document.getElementById('mov-detalle').value.trim(),
    medio: document.getElementById('mov-medio').value,
    monto: Número(document.getElementById('mov-monto').valor),
    obs: document.getElementById('mov-obs').value.trim()
  };

  db.movs.push(newMov);
  document.getElementById('mov-monto').value = '';
  document.getElementById('mov-detalle').value = '';
  document.getElementById('mov-obs').value = '';
  persistData();
  showToast('Movimiento guardado correctamente');
}

función eliminarMovimiento(id) {
  if (!confirm('¿Eliminar este movimiento? El saldo del cliente se recalculará automáticamente.')) return;
  db.movs = db.movs.filter(m => m.id !== id);
  persistData();
  showToast('Movimiento eliminado');
}

función renderMovements() {
  const tbody = document.getElementById('all-movs-body');
  const sorted = [...db.movs].reverse();
  tbody.innerHTML = sorted.map(m => {
    const badgeClass = m.tipo === 'ABONO / PAGO' ? 'badge-green' : (m.tipo === 'VENTA FIADA' ? 'badge-amber' : 'badge-blue');
    devolver `
      <tr>
        <td>${m.fecha}</td>
        <td>
          <div class="font-bold">${m.barberia}</div>
          <div class="muted" style="font-size:11.5px;">${m.barbero} · ${m.detalle || ''}</div>
        </td>
        <td><span class="kpi-badge ${badgeClass}">${m.tipo}</span></td>
        <td class="text-right font-bold">${fmtMoney(m.monto)}</td>
        <td class="text-right">
          <button class="btn-icon" onclick="deleteMovement('${m.id}')" title="Eliminar">🗑</button>
        </td>
      </tr>
    `;
  }).unirse('');
}

// Clientes
función renderClients() {
  const q = (document.getElementById('cli-search').value || '').toLowerCase();
  const tbody = document.getElementById('clients-body');

  const filtered = db.clients.filter(c =>
    (c.barberia || '').toLowerCase().includes(q) ||
    (c.barbero || '').toLowerCase().includes(q) ||
    (c.zona || '').toLowerCase().includes(q) ||
    (c.ruta || '').toLowerCase().includes(q)
  );

  tbody.innerHTML = filtered.map(c => {
    const saldo = getClientBalance(c);
    devolver `
      <tr>
        <td class="font-bold">${c.barberia}</td>
        <td>${c.barbero}</td>
        <td>
          <div>${c.zona || '-'}</div>
          <div class="muted" style="font-size:11.5px;">${c.direccion || ''}</div>
        </td>
        <td>${c.ruta || '-'}</td>
        <td><span class="tag-tier tier-${c.categoria}">${c.categoria}</span></td>
        <td class="text-right font-bold ${saldo > 0 ? 'text-amber' : 'text-green'}">${fmtMoney(saldo)}</td>
        <td class="text-right">
          <button class="btn-sm btn-pay" onclick="openClientModal('${c.id}')">Editar</button>
        </td>
      </tr>
    `;
  }).unirse('');
}

función openClientModal(id = null) {
  document.getElementById('client-modal').style.display = 'flex';
  si (id) {
    const c = db.clients.find(x => x.id === id);
    document.getElementById('client-modal-title').textContent = 'Editar Cliente';
    document.getElementById('edit-cli-id').value = c.id;
    document.getElementById('cli-barberia').value = c.barberia;
    document.getElementById('cli-barbero').value = c.barbero;
    document.getElementById('cli-zona').value = c.zona;
    document.getElementById('cli-ruta').value = c.ruta || 'UNA DEFINICIÓN';
    document.getElementById('cli-tel').value = c.telefono;
    document.getElementById('cli-cat').value = c.categoria || 'PLATA';
    document.getElementById('cli-dir').value = c.direccion;
    document.getElementById('cli-deuda').value = c.deudaBase || 0;
    document.getElementById('cli-notas').value = c.notas || '';
  } demás {
    document.getElementById('client-modal-title').textContent = 'Nuevo Cliente';
    document.getElementById('edit-cli-id').value = '';
    document.getElementById('cli-barberia').value = '';
    document.getElementById('cli-barbero').value = '';
    document.getElementById('cli-zona').value = '';
    document.getElementById('cli-tel').value = '';
    document.getElementById('cli-dir').value = '';
    document.getElementById('cli-deuda').value = 0;
    document.getElementById('cli-notas').value = '';
  }
}

función saveClient(e) {
  e.preventDefault();
  const id = document.getElementById('edit-cli-id').value;
  const payload = {
    id: id || 'CLI-' + String(db.clients.length + 1).padStart(3, '0'),
    barberia: document.getElementById('cli-barberia').value.trim().toUpperCase(),
    barbero: document.getElementById('cli-barbero').value.trim().toUpperCase(),
    zona: document.getElementById('cli-zona').value.trim().toUpperCase(),
    ruta: document.getElementById('cli-ruta').value,
    teléfono: document.getElementById('cli-tel').value.trim(),
    categoria: document.getElementById('cli-cat').value,
    dirección: document.getElementById('cli-dir').value.trim().toUpperCase(),
    deudaBase: Number(document.getElementById('cli-deuda').value) || 0,
    notas: document.getElementById('cli-notas').value.trim()
  };

  si (id) {
    const idx = db.clients.findIndex(x => x.id === id);
    if (idx !== -1) db.clients[idx] = payload;
  } demás {
    db.clients.unshift(payload);
  }

  closeModal('client-modal');
  persistData();
  showToast('Cliente guardado');
}

// Inventario
función renderInventory() {
  const q = (document.getElementById('inv-search').value || '').toLowerCase();
  const onlyLow = document.getElementById('filter-low-stock').checked;
  const tbody = document.getElementById('inv-body');

  const items = db.inv.filter(i => {
    const matchText = (i.producto || '').toLowerCase().includes(q) || (i.codigo || '').toLowerCase().includes(q);
    const matchStock = !onlyLow || Number(i.stock) <= 3;
    devolver texto coincidente && matchStock;
  });

  tbody.innerHTML = items.map(i => {
    const st = Number(i.stock);
    const stClass = st <= 0 ? 'texto-rojo' : (st <= 3 ? 'texto-ámbar' : 'texto-verde');
    devolver `
      <tr>
        <td class="muted">${i.codigo}</td>
        <td class="font-bold">${i.producto}</td>
        <td class="text-center font-bold ${stClass}">${st} u.</td>
        <td class="text-right">${fmtMoney(i.venta)}</td>
        <td class="text-right">
          <div class="stock-stepper">
            <button class="step-btn" onclick="adjustStock('${i.codigo}', -1)">-1</button>
            <button class="step-btn" onclick="adjustStock('${i.codigo}', 1)">+1</button>
          </div>
        </td>
      </tr>
    `;
  }).unirse('');
}

función adjustStock(código, delta) {
  const item = db.inv.find(x => x.codigo === codigo);
  si (!elemento) regresar;
  artículo.stock = Número(artículo.stock) + delta;
  persistData();
}

función openProductModal() {
  document.getElementById('product-modal').style.display = 'flex';
}

función saveProduct(e) {
  e.preventDefault();
  const nextNum = db.inv.length + 1;
  db.inv.unshift({
    código: 'ART-' + String(nextNum).padStart(3, '0'),
    producto: document.getElementById('prod-nombre').value.trim().toUpperCase(),
    stock: Number(document.getElementById('prod-stock').value) || 0,
    costo: 0,
    venta: Number(document.getElementById('prod-venta').value) || 0
  });
  document.getElementById('prod-nombre').value = '';
  closeModal('product-modal');
  persistData();
  showToast('Producto agregado al stock');
}

función closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

// Respaldos
función exportarCopiaDeSeguridad() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rapibarbe_Respaldo_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

función importarBackup(e) {
  const archivo = e.target.files[0];
  si (!archivo) regresar;
  const lector = nuevo lector de archivos();
  lector.onload = (ev) => {
    intentar {
      const analizado = JSON.parse(ev.target.result);
      si (parsed.clients && parsed.inv) {
        db = analizado;
        persistData();
        showToast('Respaldo restaurado con éxito');
      }
    } capturar (error) {
      showToast('Archivo JSON inválido');
    }
  };
  lector.readAsText(archivo);
}

función resetToExcelDefault() {
  if (!confirm('¿Seguro que querrás volver a los datos originales de Excel? Se borrarán los cambios locales.')) return;
  db = JSON.parse(JSON.stringify(INITIAL_DATA));
  persistData();
  showToast('Datos originales restaurados');
}

función mostrarToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

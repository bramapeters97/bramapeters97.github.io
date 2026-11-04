/* Amstroll Amsterdam catalogue v3.
 * Real place identities and broad locations are factual references, not Google data.
 * Original descriptions/itineraries © Bram Peters Studio. No provider ratings, reviews,
 * photographs, opening schedules or ticket prices are copied into this dataset.
 * Coordinates are approximate, manually authored planning coordinates, not street routing.
 * Numeric costs are illustrative discretionary allowances, NEVER verified venue prices.
 * Public/exterior stops exclude entry, purchases and ticketed events unless expressly stated.
 * Source provenance: primary venue/city pages and the official I amsterdam neighbourhood map.
 * Sources were consulted in November 2026. Access and commercial operations require refresh.
 */
(() => {
 'use strict';
 const root='https://www.iamsterdam.com/en/explore/neighbourhoods/';
 const areas={
  centrum:{name:'Centrum',photo:'central',bank:'south',source:root+'centrum'},
  jordaan:{name:'Jordaan',photo:'jordaan-coffee',bank:'south',source:root+'jordaan'},
  pijp:{name:'De Pijp',photo:'depijp',bank:'south',source:root+'de-pijp'},
  museum:{name:'Museumplein',photo:'museumplein',bank:'south',source:root+'oud-zuid'},
  oudwest:{name:'Oud-West',photo:'oud-west',bank:'south',source:root+'oud-west'},
  westerpark:{name:'Westerpark',photo:'westerpark',bank:'south',source:root+'westerpark'},
  oost:{name:'Oost',photo:'oosterpark',bank:'south',source:root+'oost'},
  noord:{name:'Noord',photo:'noord',bank:'north',source:root+'amsterdam-noord'},
  ndsm:{name:'NDSM',photo:'ndsm',bank:'north',source:'https://www.ndsm.nl/en/over/plattegrond-ndsm-werf'},
  ijburg:{name:'IJburg',photo:'ijburg',bank:'east',source:root+'ijburg'},
  zuid:{name:'Zuid',photo:'zuid',bank:'south',source:root+'zuid'},
  sloterdijk:{name:'Sloterdijk',photo:'sloterdijk',bank:'south',source:'https://www.oudsloterdijk.nl/stichting'},
  plantage:{name:'Plantage',photo:'oosterpark',bank:'south',source:root+'plantage'},
  nieuwWest:{name:'Nieuw-West',photo:'sloterdijk',bank:'south',source:root+'nieuw-west'}
 };
 const places=[];
 // P records: id, name, latitude, longitude, category, dwell, access, cost, description, optional source.
 function add(area,rows){for(const [id,name,lat,lng,category,dwell,access,cost,description,source] of rows){const a=areas[area];places.push({id,name,lat,lng,area:a.name,areaId:area,city:a.city||'Amsterdam',region:a.region||'Noord-Holland',bank:a.bank,category,photoKey:a.photo,indoor:access==='venue'&&!['market','food-street'].includes(category),cost,dwell,access,activityWalking:access==='public'?Math.ceil(dwell*({park:.55,waterfront:.4,photography:.6,neighbourhood:.65,architecture:.2,'independent-shops':.65,market:.65,'food-street':.6,quiet:.15}[category]??.3)):0,source:source||a.source,description,provenance:{identity:'Primary venue or official neighbourhood reference',coordinates:'Authored approximate coordinates',cost:cost===0?'No purchase/entry included':cost===null?'Unknown':'Illustrative allowance, not venue price',opening:'Unknown; check source',description:'Original editorial text'}});}}
 add('centrum',[
 ['dam','Dam square',52.3731,4.8931,'architecture',8,'public',0,'Take a slow lap of the square and notice the changing scale of the surrounding façades.'],
 ['palace','Royal Palace · exterior',52.3732,4.8919,'architecture',8,'public',0,'Study the palace from the square. Interior admission and opening are not part of this stop.','https://www.paleisamsterdam.nl/en/'],
 ['nieuwekerk','Nieuwe Kerk · exterior',52.3738,4.8915,'architecture',6,'public',0,'An exterior architectural pause beside Dam. Exhibitions and interior access are excluded.','https://www.nieuwekerk.nl/en/'],
 ['beurs','Beurs van Berlage · exterior',52.3754,4.8964,'architecture',8,'public',0,'Look at the brickwork and street frontage rather than assuming an exhibition is open.','https://beursvanberlage.com/'],
 ['oudekerk','Oude Kerk · exterior',52.3744,4.8981,'architecture',8,'public',0,'Walk the public streets around the church. An interior visit requires a separate access check.','https://oudekerk.nl/en/'],
 ['nieuwmarkt','Nieuwmarkt',52.3729,4.9005,'neighbourhood',9,'public',0,'A small square-side wander, with no promise that market stalls are operating.'],
 ['waag','De Waag · exterior',52.3729,4.9004,'architecture',7,'public',0,'Pause at the historic building from the square; restaurant and event access are excluded.','https://waag.org/en/'],
 ['oba','OBA Oosterdok',52.3759,4.9084,'books',20,'venue',0,'Browse a floor and find a place to read. Opening hours and events need checking.','https://oba.nl/nl/locaties/oba-oosterdok'],
 ['oosterdok','Oosterdokskade',52.3766,4.9085,'waterfront',10,'public',0,'Watch the water and changing harbour skyline from the public quay.'],
 ['pinto','Huis de Pinto',52.3698,4.9000,'books',20,'venue',0,'A reading-room idea in a historic house. Check access and programming before entering.','https://www.huisdepinto.nl/'],
 ['spui','Spui',52.3688,4.8898,'neighbourhood',9,'public',0,'A square-sized pause among the bookshops; purchases and market trading are excluded.'],
 ['athenaeum','Athenaeum Boekhandel · Spui',52.3691,4.8895,'books',20,'venue',0,'Browse the bookshop without a purchase allowance. Opening hours are unverified.','https://www.athenaeum.nl/']
 ]);
 add('jordaan',[
 ['westerkerk','Westerkerk · exterior',52.3745,4.8837,'architecture',5,'public',0,'Look up at the tower from the public street. No interior or tower admission is included.','https://www.westerkerk.nl/'],
 ['prinsengracht','Prinsengracht · Westermarkt',52.3749,4.8820,'waterfront',8,'public',0,'Follow a short canal-side stretch, keeping the stop at street level.'],
 ['egelantiersgracht','Egelantiersgracht',52.3751,4.8791,'quiet',10,'public',0,'A quieter canal street for looking up, slowing down and noticing doorways.'],
 ['noordermarkt','Noordermarkt',52.3792,4.8861,'neighbourhood',10,'public',0,'A loop of the square; the plan does not assume an operating market.','https://www.noordermarkt-amsterdam.nl/'],
 ['winkel43','Winkel 43',52.3793,4.8862,'coffee',18,'venue',6,'An illustrative coffee allowance at Noordermarkt. Check the current menu, queue and service.','https://www.winkel43.nl/'],
 ['papeneiland','Café Papeneiland',52.3802,4.8882,'coffee',18,'venue',6,'A small brown-café pause at the canal corner. The allowance is illustrative.','https://www.papeneiland.nl/'],
 ['brouwersgracht','Brouwersgracht',52.3805,4.8884,'photography',12,'public',0,'Look for reflections, bridges and the changing angle of the canal houses.'],
 ['annefrank','Anne Frank House',52.3752,4.8839,'museum',60,'venue',null,'A substantial museum visit requiring current ticket and entry-slot information.','https://www.annefrank.org/en/'],
 ['thijssen','Theo Thijssen Museum',52.3776,4.8840,'museum',30,'venue',null,'A smaller museum idea; current opening and admission are not verified.','https://www.theothijssenmuseum.nl/'],
 ['westerstraat','Westerstraat',52.3780,4.8829,'independent-shops',15,'public',0,'Browse façades and shop windows without assuming any purchase or market access.'],
 ['haarlemmerdijk','Haarlemmerdijk',52.3821,4.8845,'independent-shops',20,'public',0,'A street-level window-shopping wander. Purchases are optional and not included.'],
 ['lindengracht','Lindengracht',52.3800,4.8842,'neighbourhood',12,'public',0,'An unhurried street loop; market trading remains a separate access check.']
 ]);
 add('pijp',[
 ['sarphati','Sarphatipark',52.3543,4.8957,'park',15,'public',0,'A pond-side loop with room for a bench pause. Local access notices are unverified.','https://www.amsterdam.nl/leefomgeving/parken-recreatiegebieden/sarphatipark/'],
 ['albertcuyp','Albert Cuypstraat',52.3558,4.8935,'market',20,'public',0,'Walk the market street without promising that stalls are trading.','https://albertcuyp-markt.amsterdam/'],
 ['scandinavian','Scandinavian Embassy',52.3545,4.8952,'coffee',20,'venue',7,'A coffee idea beside the park, with an illustrative spend rather than a menu quotation.','https://scandinavianembassy.nl/coffee'],
 ['gerarddou','Gerard Douplein',52.3558,4.8914,'neighbourhood',10,'public',0,'A small square for a pause between the busier shopping streets.'],
 ['marieheineken','Marie Heinekenplein',52.3575,4.8908,'neighbourhood',10,'public',0,'Walk the public square and take a short break without needing a terrace purchase.'],
 ['heineken','Heineken Experience',52.3579,4.8910,'museum',75,'venue',null,'A timed attraction requiring current admission, age and opening checks.','https://www.heinekenexperience.com/'],
 ['bakers','Bakers & Roasters · De Pijp',52.3583,4.8921,'food',50,'venue',22,'A proper meal break with an illustrative allowance. Queues and current menus are unknown.','https://bakersandroasters.com/'],
 ['dageraad','Museum De Dageraad',52.3502,4.9043,'architecture',40,'venue',null,'An Amsterdam School visit; tour access, timing and ticket information need checking.','https://www.hetschip.nl/'],
 ['amstelkanaal','Amstelkanaal · Jozef Israëlkade',52.3487,4.8968,'waterfront',15,'public',0,'A waterside pause south of the busiest streets, using public pavement.'],
 ['cornelistroost','Cornelis Troostplein',52.3502,4.8920,'architecture',12,'public',0,'Look at the surrounding residential architecture from the square.'],
 ['ferdinandbol','Ferdinand Bolstraat',52.3533,4.8903,'independent-shops',15,'public',0,'Window-shop at an ordinary neighbourhood pace. Buying and entry are not included.'],
 ['littlecollins','Little Collins · De Pijp',52.3537,4.8972,'food',45,'venue',22,'A lunch-sized pause with an illustrative allowance and unverified availability.','https://www.littlecollins.nl/']
 ]);
 add('museum',[
 ['museumplein','Museumplein',52.3578,4.8816,'park',12,'public',0,'A broad open-square loop. Museum admission is excluded.'],
 ['rijks','Rijksmuseum',52.3600,4.8852,'museum',75,'venue',null,'Choose a focused collection visit; entry time and current ticket cost must be checked.','https://www.rijksmuseum.nl/en/visit'],
 ['vangogh','Van Gogh Museum',52.3584,4.8812,'museum',75,'venue',null,'A focused museum visit requiring a current admission-slot check.','https://www.vangoghmuseum.nl/en/visit'],
 ['stedelijk','Stedelijk Museum',52.3580,4.8793,'museum',60,'venue',null,'A modern-art visit; exhibitions, admission and opening information remain unverified.','https://www.stedelijk.nl/en'],
 ['stedelijk-front','Stedelijk · exterior',52.3578,4.8791,'architecture',8,'public',0,'Compare the museum’s exterior forms from public space; entry is not included.'],
 ['concertgebouw','Concertgebouw · exterior',52.3563,4.8791,'architecture',10,'public',0,'An exterior look from the square. Concerts and building tours need separate booking.','https://www.concertgebouw.nl/en'],
 ['moco','Moco Museum Amsterdam',52.3587,4.8816,'gallery',45,'venue',null,'An exhibition idea with current ticket and access checks still required.','https://www.mocomuseum.com/'],
 ['vondel-east','Vondelpark · eastern loop',52.3606,4.8732,'park',20,'public',0,'An easy park loop with time to look at the water and lawns.','https://www.amsterdam.nl/leefomgeving/parken-recreatiegebieden/vondelpark/'],
 ['vondelkerk','Vondelkerk · exterior',52.3613,4.8718,'architecture',10,'public',0,'Look at the church exterior from public pavement; event access is excluded.','https://stadsherstel.nl/'],
 ['melkhuis','Groot Melkhuis',52.3594,4.8673,'coffee',22,'venue',7,'A café break in Vondelpark with an illustrative allowance and no assumed service.','https://www.grootmelkhuis.nl/'],
 ['blauwethee','Blauwe Theehuis',52.3581,4.8665,'coffee',22,'venue',7,'A park café idea. Check current opening and menu before relying on it.','https://www.blauwetheehuis.nl/'],
 ['pcstreet','P.C. Hooftstraat',52.3600,4.8792,'independent-shops',15,'public',0,'A design-window walk; purchases and access to shops are not included.']
 ]);
 add('oudwest',[
 ['hallen','De Hallen · main passage',52.3664,4.8686,'architecture',20,'venue',0,'Explore the former tram-depot passage if open. The sample does not guarantee access.','https://www.dehallen-amsterdam.nl/en/about-de-hallen'],
 ['foodhallen','Foodhallen Amsterdam',52.3663,4.8682,'food',45,'venue',22,'A proper lunch stop. €22 is an illustrative allowance, not a stall or menu price.','https://foodhallen.nl/'],
 ['filmhallen','De Filmhallen',52.3665,4.8684,'culture',100,'venue',null,'A film-sized outing only after current programme, running time and ticket checks.','https://www.filmhallen.nl/'],
 ['tenkate','Ten Katestraat',52.3671,4.8677,'market',20,'public',0,'A market-street wander without assuming live trading.'],
 ['lot61','Lot Sixty One',52.3659,4.8708,'coffee',20,'venue',7,'A coffee detour on Kinkerstraat with an illustrative allowance.','https://lotsixtyone.com/'],
 ['kinker','Kinkerstraat',52.3670,4.8701,'independent-shops',18,'public',0,'Follow the street’s shop windows and tram-line rhythm at walking pace.'],
 ['lab111','LAB111',52.3607,4.8675,'culture',100,'venue',null,'An independent cinema idea, requiring a real programme and ticket check.','https://www.lab111.nl/'],
 ['orgelpark','Orgelpark · exterior',52.3607,4.8663,'architecture',10,'public',0,'An exterior architectural stop; performances and interior access are excluded.','https://www.orgelpark.nl/'],
 ['nieuweliefde','De Nieuwe Liefde · exterior',52.3697,4.8688,'architecture',10,'public',0,'Look at the building from the street. Events are not inferred from the venue name.','https://www.denieuweliefde.com/'],
 ['bellamy','Bellamyplein',52.3657,4.8663,'quiet',12,'public',0,'A small square for a neighbourhood-sized pause.'],
 ['jacobkade','Jacob van Lennepkade',52.3626,4.8704,'waterfront',15,'public',0,'A canal-side pause on public pavement, without an extra purchase or entry stop.'],
 ['dacosta','Da Costaplein',52.3688,4.8729,'quiet',12,'public',0,'A short residential-square pause between the livelier shopping streets.']
 ]);
 add('westerpark',[
 ['westerpark','Westerpark',52.3863,4.8775,'park',20,'public',0,'Take a compact green loop rather than treating the entire park as one tiny stop.','https://www.amsterdam.nl/leefomgeving/parken-recreatiegebieden/westerpark/'],
 ['westergas','Westergas · exterior grounds',52.3867,4.8707,'architecture',20,'public',0,'Walk the public grounds; ticketed events and interior access are excluded.','https://westergas.nl/'],
 ['gashouder','Gashouder · exterior',52.3871,4.8698,'architecture',10,'public',0,'Look at the former gas-storage building from outside; no event is included.','https://westergas.nl/'],
 ['ketelhuis','Het Ketelhuis',52.3867,4.8717,'culture',100,'venue',null,'A cinema-sized idea that requires actual programme and ticket verification.','https://www.ketelhuis.nl/'],
 ['bakkerswinkel','De Bakkerswinkel · Westergas',52.3859,4.8740,'bakery',30,'venue',12,'A bakery-and-coffee pause using an illustrative allowance.','https://www.debakkerswinkel.nl/'],
 ['hetschip','Museum Het Schip',52.3909,4.8749,'architecture',60,'venue',null,'An Amsterdam School museum visit, with current tour and admission checks required.','https://www.hetschip.nl/'],
 ['spaarndammer','Spaarndammerplantsoen',52.3898,4.8793,'park',15,'public',0,'An outdoor pause near the neighbourhood’s architectural streets.'],
 ['zandhoek','Zandhoek',52.3890,4.8884,'waterfront',12,'public',0,'A public waterside street for boat details and a quieter photograph.'],
 ['prinseneiland','Prinseneiland',52.3860,4.8880,'photography',20,'public',0,'A small public-street circuit around warehouses, water and bridges.'],
 ['pontsteiger','Pontsteiger · public waterfront',52.3970,4.8844,'architecture',15,'public',0,'See the waterside building from public space. Private residential access is excluded.'],
 ['spaarndammerstraat','Spaarndammerstraat',52.3910,4.8809,'independent-shops',18,'public',0,'Neighbourhood window-shopping; no purchase allowance or shop access is assumed.'],
 ['houtkade','Houthaven · public quays',52.3970,4.8790,'waterfront',20,'public',0,'A public-quay wander around the newer waterfront neighbourhood.']
 ]);
 add('oost',[
 ['oosterpark','Oosterpark',52.3602,4.9205,'park',20,'public',0,'A pond-side loop with time for a rest, using an authored path-time allowance.','https://www.amsterdam.nl/leefomgeving/parken-recreatiegebieden/oosterpark/'],
 ['wereldmuseum','Wereldmuseum Amsterdam',52.3628,4.9228,'museum',75,'venue',null,'A focused museum visit requiring current exhibition, opening and ticket information.','https://amsterdam.wereldmuseum.nl/'],
 ['coffee-bru','Coffee Bru · Beukenplein',52.3569,4.9242,'coffee',20,'venue',7,'A coffee detour with an illustrative allowance and unverified queue or opening.','https://coffeebru.nl/'],
 ['beukenplein','Beukenplein',52.3568,4.9238,'neighbourhood',10,'public',0,'A small square pause without needing to claim a café table.'],
 ['dapperstraat','Dapperstraat',52.3614,4.9275,'market',20,'public',0,'Browse the public street; an operating market is not assumed.','https://www.dappermarkt.nl/'],
 ['flevopark','Flevopark',52.3601,4.9481,'park',25,'public',0,'A generous green loop, with seasonal and local access notices still unverified.','https://www.amsterdam.nl/leefomgeving/parken-recreatiegebieden/flevopark/'],
 ['distilleerderij','Distilleerderij ’t Nieuwe Diep',52.3629,4.9505,'coffee',25,'venue',9,'A waterside drink stop; the allowance is illustrative and access must be checked.','https://www.nwediep.nl/'],
 ['javastraat','Javastraat',52.3631,4.9364,'food-street',22,'public',0,'A food-street look around. Purchases and restaurant entry are excluded.'],
 ['javaplantsoen','Javaplantsoen',52.3655,4.9427,'quiet',15,'public',0,'A quieter residential green pause away from the main shopping street.'],
 ['gooyer','De Gooyer · exterior',52.3668,4.9263,'architecture',10,'public',0,'See the windmill from public pavement. Interior access is not included.'],
 ['brouwerijij','Brouwerij ’t IJ',52.3669,4.9266,'food',30,'venue',14,'A refreshment stop with an illustrative allowance; service and age requirements need checking.','https://www.brouwerijhetij.nl/'],
 ['frankendael','Park Frankendael',52.3483,4.9302,'park',25,'public',0,'An unhurried landscape-park loop. Events and buildings are not included.','https://www.amsterdam.nl/leefomgeving/parken-recreatiegebieden/frankendael/']
 ]);
 add('noord',[
 ['eye','Eye Filmmuseum',52.3844,4.9008,'museum',60,'venue',null,'A museum or film idea that needs a current programme and ticket check.','https://www.eyefilm.nl/en'],
 ['eye-exterior','Eye · public waterfront',52.3840,4.9008,'architecture',12,'public',0,'See the building and the IJ from public outdoor space; no museum entry is included.','https://www.eyefilm.nl/en'],
 ['adam','A’DAM Tower · exterior',52.3839,4.9022,'architecture',8,'public',0,'An exterior stop only; lookout tickets, rooftop access and swings are excluded.','https://www.adamlookout.com/'],
 ['tolhuistuin','Tolhuistuin',52.3834,4.9044,'culture',35,'venue',null,'A garden or cultural-venue idea requiring current access and programme checks.','https://tolhuistuin.nl/'],
 ['buiksloterweg','Buiksloterweg · ferry landing',52.3833,4.9024,'waterfront',8,'public',0,'A waterside pause near the ferry. This stop does not itself establish a sailing.'],
 ['vanderpek','Van der Pekstraat',52.3879,4.9112,'independent-shops',20,'public',0,'A public-street wander without assuming a market, shop opening or purchase.'],
 ['noorderpark','Noorderpark',52.3966,4.9179,'park',25,'public',0,'A green loop around a manageable part of the park.','https://www.amsterdam.nl/leefomgeving/parken-recreatiegebieden/noorderpark/'],
 ['ceuvel','De Ceuvel',52.3939,4.9104,'food',45,'venue',22,'A café-sized break at the former shipyard site; current access and menu are unknown.','https://deceuvel.nl/en/'],
 ['nieuwendammerdijk','Nieuwendammerdijk',52.3933,4.9359,'architecture',25,'public',0,'A public-street architecture wander through the old dike neighbourhood.'],
 ['vliegenbos','Vliegenbos',52.3926,4.9277,'park',30,'public',0,'A short woodland loop. Lighting, weather and local access remain checks for the visitor.','https://www.amsterdam.nl/leefomgeving/parken-recreatiegebieden/vliegenbos/'],
 ['schoonschip','Schoonschip · public approach',52.4007,4.9028,'architecture',15,'public',0,'View the floating neighbourhood from public access routes, respecting private homes.','https://schoonschipamsterdam.org/'],
 ['breek','Breekpark',52.3972,4.9394,'quiet',20,'public',0,'A small outdoor pause near Nieuwendam, with a clear allowance for sitting and looking.']
 ]);
 add('ndsm',[
 ['ndsm-quay','NDSM-werf · waterfront',52.3999,4.8949,'waterfront',15,'public',0,'Watch the IJ from the public wharf. The ferry journey is calculated separately.','https://www.ndsm.nl/contact'],
 ['straat','STRAAT Museum',52.4025,4.8944,'museum',60,'venue',null,'A focused street-art visit requiring a current ticket and entry check.','https://straatmuseum.com/'],
 ['pllek','Pllek',52.4008,4.8982,'food',45,'venue',23,'A waterfront meal idea with an illustrative allowance and unverified availability.','https://pllek.pro/'],
 ['noorderlicht','Noorderlicht Café',52.4016,4.9011,'coffee',25,'venue',9,'A waterfront café pause. Current operating information and menu are unknown.','https://noorderlichtcafe.nl/'],
 ['ijver','IJver Amsterdam',52.4017,4.8944,'food',45,'venue',23,'A meal break around the wharf’s industrial buildings. The allowance is illustrative.','https://www.ijveramsterdam.nl/'],
 ['ndsmfuse','NDSM FUSE',52.4014,4.8949,'gallery',35,'venue',null,'An art-space visit with current opening and exhibition checks required.','https://www.ndsm.nl/'],
 ['kunststad','NDSM Loods · exterior',52.4017,4.8950,'architecture',15,'public',0,'Look at the former shipbuilding hall from public outdoor space. Studio entry is excluded.'],
 ['crane','Faralda Crane · exterior',52.4008,4.8970,'architecture',12,'public',0,'See the crane from the public wharf. Private hotel access is not part of the stop.'],
 ['treehouse','Treehouse NDSM',52.4020,4.8996,'gallery',35,'venue',null,'A cultural-workspace idea; current visiting access and exhibitions are unknown.','https://www.treehousendsm.com/'],
 ['ijhallen','IJ-Hallen',52.4027,4.8919,'market',60,'venue',null,'A market-sized idea only when an actual event date and ticket are checked.','https://ijhallen.nl/en/'],
 ['ndsmplein','NDSM-Plein',52.4014,4.8936,'photography',18,'public',0,'A public-square photography wander. Festival access and street-art installations may vary.'],
 ['helling','NDSM · Y-helling exterior',52.4006,4.9000,'architecture',15,'public',0,'An exterior look at the shipyard landscape from public routes, with no venue entry assumed.']
 ]);
 add('ijburg',[
 ['diemerpark','Diemerpark',52.3538,4.9831,'park',30,'public',0,'A manageable landscape-park loop, allowing time to pause and look over the reeds.','https://www.amsterdam.nl/projecten/diemerpark/'],
 ['diemerstrand','Diemerpark · public beach',52.3529,4.9850,'waterfront',25,'public',0,'A shore-side pause, not a swimming-safety recommendation or a promise of facilities.'],
 ['enneus','Enneüs Heerma Bridge',52.3656,4.9780,'architecture',15,'public',0,'Cross or view the public bridge; the route uses its connector rather than crossing open water.','https://www.amsterdam.nl/projecten/ijburg/nieuwe-bruggen/'],
 ['nescio','Nescio Bridge',52.3519,4.9753,'architecture',18,'public',0,'A cycle-and-footbridge architecture stop, with bridge approaches included in travel estimates.'],
 ['haveneiland','IJburg · harbour quay',52.3520,5.0068,'waterfront',20,'public',0,'A public-quay wander around the yacht harbour, without restaurant entry or boat access.'],
 ['centrumeiland','Centrumeiland · public streets',52.3481,5.0120,'architecture',25,'public',0,'Look at the newer neighbourhood from open streets. Construction and access require attention.'],
 ['theovangogh','Theo van Goghpark',52.3547,4.9951,'park',20,'public',0,'A small green loop on Haveneiland, leaving room for a bench break.'],
 ['steiger','Steigereiland · public waterfront',52.3623,4.9854,'architecture',20,'public',0,'View the water-side housing from public routes, respecting private pontoons and homes.'],
 ['sluishuis','Sluishuis · exterior from public approach',52.3675,4.9817,'architecture',15,'public',0,'View the building from the public mainland approach. Private bridges, pontoons and roof visits are excluded.','https://sluishuis.eu/'],
 ['ijburglaan','IJburglaan',52.3588,4.9906,'neighbourhood',15,'public',0,'A street-level look at the island’s everyday architecture, without promising shop openings.'],
 ['diemerzeedijk','Diemerzeedijk · public path',52.3494,4.9839,'quiet',25,'public',0,'A longer waterside path pause. Local access, lighting and weather need checking.'],
 ['nap-ijburg','NAP Amsterdam',52.3520,5.0050,'food',45,'venue',22,'A harbour-side meal idea with an illustrative allowance; current service and menu need checking.','https://napamsterdam.nl/contact/']
 ]);
 add('zuid',[
 ['beatrix','Beatrixpark',52.3419,4.8814,'park',25,'public',0,'A park loop with an actual sitting break included in the dwell allowance.','https://www.amsterdam.nl/leefomgeving/parken-recreatiegebieden/beatrixpark/'],
 ['amstelpark','Amstelpark',52.3282,4.8938,'park',35,'public',0,'Explore a manageable section of the park. Attraction opening and paid facilities are excluded.','https://www.amsterdam.nl/leefomgeving/parken-recreatiegebieden/amstelpark/'],
 ['riekermolen','Riekermolen · exterior',52.3231,4.8940,'architecture',15,'public',0,'Look at the windmill from public outdoor space. Interior access is not included.'],
 ['rijnstraat','Rijnstraat',52.3442,4.8994,'independent-shops',20,'public',0,'A neighbourhood window-shopping walk without purchase or opening assumptions.'],
 ['berlagebrug','Berlagebrug',52.3483,4.9120,'architecture',12,'public',0,'An architectural bridge pause using public pedestrian access.'],
 ['martinluther','Martin Luther Kingpark',52.3384,4.9076,'park',25,'public',0,'A riverside green pause; festival access and event schedules are not inferred.'],
 ['zuidas','George Gershwinplein',52.3344,4.8754,'architecture',15,'public',0,'Look at contemporary urban forms from public space, without entering office buildings.','https://zuidas.nl/en/'],
 ['botaniszuidas','Botanische Tuin Zuidas',52.3332,4.8636,'garden',35,'venue',null,'A garden visit requiring current opening and access information.','https://botanischetuinzuidas.nl/'],
 ['grootgelderland','Groot Gelderlandplein',52.3300,4.8784,'independent-shops',25,'venue',0,'A shopping-centre browsing idea; access hours and purchases are separate checks.','https://www.gelderlandplein.nl/'],
 ['olympic','Olympic Stadium · exterior',52.3432,4.8544,'architecture',20,'public',0,'Walk the stadium’s exterior public approach. Tours, facilities and events are excluded.','https://www.olympischstadion.nl/'],
 ['stadionplein','Stadionplein',52.3442,4.8564,'neighbourhood',12,'public',0,'A square-side pause near the stadium, without a café purchase requirement.'],
 ['amsteloever','Amstel · public west-bank path',52.3345,4.9081,'waterfront',20,'public',0,'A public riverside wander with no rowing-club or private terrace access included.']
 ]);
 add('sloterdijk',[
 ['orly','Orlyplein',52.3892,4.8378,'quiet',10,'public',0,'A small outdoor pause that keeps the station close.'],
 ['bret','BRET',52.3897,4.8371,'coffee',25,'venue',9,'A café-sized stop with an illustrative allowance and no assumed service hours.','https://www.bret.bar/'],
 ['petrus','Petruskerk · exterior',52.3874,4.8464,'architecture',12,'public',0,'See the old village church from public access. Interior and private cemetery access are excluded.','https://www.oudsloterdijk.nl/stichting'],
 ['oudsloterdijk','Oud-Sloterdijk · public streets',52.3870,4.8468,'neighbourhood',18,'public',0,'A small village-street circuit among the newer office districts.','https://www.oudsloterdijk.nl/'],
 ['bretten','De Bretten · eastern paths',52.3906,4.8227,'park',30,'public',0,'A manageable green-path loop; trail conditions and local access remain unverified.','https://www.amsterdam.nl/leefomgeving/parken-recreatiegebieden/'],
 ['westerkanaal','Haarlemmertrekvaart · Sloterdijk',52.3862,4.8379,'waterfront',15,'public',0,'A short canal-side look using public access paths, not private banks.'],
 ['spieringhorn','Spieringhorn · public green paths',52.3841,4.8247,'park',25,'public',0,'An outdoor loop around public park paths; sport facilities and bookings are excluded.'],
 ['tuinwest','De Tuinen van West',52.3770,4.7950,'park',40,'public',0,'A longer open-landscape idea. Public-path access and weather must still be checked.','https://www.amsterdam.nl/leefomgeving/parken-recreatiegebieden/'],
 ['spaarndammerdijk','Spaarndammerdijk · Oud-Sloterdijk',52.3878,4.8491,'architecture',15,'public',0,'A public-street look at the old dike line and surrounding neighbourhood.'],
 ['sloterdijkplein','Sloterdijk station · public approach',52.3890,4.8377,'architecture',8,'public',0,'Notice the station’s layered infrastructure from the public forecourt; platforms and paid travel are excluded.']
 ]);
 add('plantage',[
 ['hortus','Hortus Botanicus Amsterdam',52.3668,4.9077,'garden',60,'venue',null,'A botanical-garden visit requiring current admission and opening checks.','https://www.dehortus.nl/en/'],
 ['wertheim','Wertheimpark',52.3675,4.9086,'quiet',18,'public',0,'A reflective park pause. Memorial areas deserve quiet, respectful visiting.','https://www.amsterdam.nl/leefomgeving/parken-recreatiegebieden/wertheimpark/'],
 ['entrepotdok','Entrepotdok',52.3678,4.9141,'waterfront',20,'public',0,'A public-quay look at the former warehouses and the water.'],
 ['artis','ARTIS',52.3660,4.9169,'culture',120,'venue',null,'A substantial garden-and-zoo visit requiring current admission and opening information.','https://www.artis.nl/en/'],
 ['micropia','ARTIS-Micropia',52.3663,4.9121,'museum',60,'venue',null,'A focused museum visit, with current access, age guidance and ticket checks required.','https://www.micropia.nl/en/'],
 ['resistance','Verzetsmuseum Amsterdam',52.3672,4.9137,'museum',60,'venue',null,'A reflective museum visit requiring current admission and opening checks.','https://www.verzetsmuseum.org/en/'],
 ['hollandsche','Hollandsche Schouwburg',52.3654,4.9118,'museum',40,'venue',null,'A memorial visit that requires current access information and thoughtful conduct.','https://jck.nl/en/location/hollandsche-schouwburg'],
 ['magerebrug','Magere Brug',52.3634,4.9028,'photography',12,'public',0,'A bridge-side photography pause using public pavement; do not obstruct people crossing.'],
 ['hermitage','H’ART Museum',52.3650,4.9025,'museum',60,'venue',null,'An exhibition idea with programme, opening and ticket checks still required.','https://www.hartmuseum.nl/en/'],
 ['hogesluis','Hogesluis',52.3604,4.9047,'architecture',12,'public',0,'An exterior bridge-and-river pause, with no hotel or terrace access assumed.']
 ]);
 add('nieuwWest',[
 ['sloterpark','Sloterpark',52.3706,4.8174,'park',30,'public',0,'A sample loop on a manageable part of the park rather than an entire-lake promise.','https://www.amsterdam.nl/leefomgeving/parken-recreatiegebieden/sloterpark/'],
 ['sloterplas','Sloterplas · north shore',52.3720,4.8239,'waterfront',25,'public',0,'A public-shore pause; swimming, weather and facilities are not verified.'],
 ['vaneesteren','Van Eesteren Museum',52.3755,4.8190,'museum',50,'venue',null,'An architecture-and-planning museum visit requiring current access and ticket information.','https://vaneesterenmuseum.nl/'],
 ['natureluur','De Natureluur',52.3690,4.8090,'garden',25,'venue',null,'A green-space idea with current visitor access and programme checks required.','https://www.denatureluur.nl/'],
 ['rembrandtpark','Rembrandtpark',52.3630,4.8441,'park',30,'public',0,'A generous public-park loop with time for a bench pause.','https://www.amsterdam.nl/leefomgeving/parken-recreatiegebieden/rembrandtpark/'],
 ['erasmuspark','Erasmuspark',52.3743,4.8492,'park',25,'public',0,'A compact green loop; gates, local notices and weather remain visitor checks.','https://www.amsterdam.nl/leefomgeving/parken-recreatiegebieden/erasmuspark/'],
 ['mercator','Mercatorplein',52.3696,4.8504,'architecture',15,'public',0,'Look at the square and its surrounding brickwork from public space.'],

 ['osdorpplein','Osdorpplein',52.3594,4.8077,'neighbourhood',20,'public',0,'A square-sized look around; market trading, shopping and theatre access are excluded.'],
 ['meervaart','Meervaart',52.3588,4.8073,'culture',100,'venue',null,'A performance-sized idea only after an actual programme and ticket check.','https://www.meervaart.nl/']
 ]);

 add('oost', [['jeruzalem','Jeruzalem · public streets',52.3515,4.9397,'architecture',20,'public',0,'A public-street architecture look in the Watergraafsmeer garden neighbourhood.','https://www.amsterdam.nl/']]);
 const experiences=[];
 function experience(id,title,description,placeIds,moods,kind='wander',extra={}){const first=places.find(p=>p.id===placeIds[0]);experiences.push({id,title,description,placeIds,moods,photoKey:first.photoKey,city:first.city,region:first.region,kind,...extra});}
 const e=experience;
 e('centre-first-light','A different way through the centre','Look up at two very different buildings, then let the square set the pace.',['beurs','dam','palace'],['culture','unexpected'],'architecture');
 e('centre-old-stones','Old stones, small streets','The public streets around Oude Kerk and Nieuwmarkt make an unhurried architectural pairing.',['oudekerk','nieuwmarkt','waag'],['culture','outdoors'],'architecture');
 e('centre-water-books','A chapter beside the water','Browse the library, then take a short waterside pause before moving on.',['oba','oosterdok'],['quiet','culture'],'reading');
 e('centre-bookish','A bookshop and a square','Make room for a browse without turning it into a shopping mission.',['athenaeum','spui'],['quiet','unexpected'],'reading');
 e('centre-pinto','A reading room, a different century','A focused reading-house stop and a small square, with access checked before starting.',['pinto','nieuwmarkt'],['quiet','culture'],'reading');
 e('centre-five-facades','The centre in five façades','A longer outdoor architectural sequence with a deliberate square-side rest.',['beurs','oudekerk','waag','dam','palace'],['culture','outdoors'],'architecture',{restAt:'dam',restMinutes:25});
 e('jordaan-pocket','A pocket of canal air','Two short outdoor stops around Westermarkt, without a ticket or café purchase.',['westerkerk','prinsengracht'],['outdoors','quiet'],'waterfront');
 e('jordaan-coffee','Coffee on Noordermarkt','An unhurried coffee idea followed by a loop of the square. Current service needs checking.',['winkel43','noordermarkt'],['coffee','food'],'coffee');
 e('jordaan-browncafe','A brown café and a blue canal','A café-sized pause followed by bridge reflections on Brouwersgracht.',['papeneiland','brouwersgracht'],['coffee','unexpected'],'coffee');
 e('jordaan-quiet','The quieter Jordaan','Choose the smaller canal streets and leave room to stop looking at a screen.',['egelantiersgracht','lindengracht','noordermarkt'],['quiet','outdoors'],'waterfront');
 e('jordaan-windows','Window-shopping without a list','Three public streets, no purchase target and a slower view of the neighbourhood.',['westerstraat','haarlemmerdijk','lindengracht'],['unexpected','outdoors'],'shops');
 e('jordaan-museum','A writer, a neighbourhood','A smaller museum idea with a quiet street pause afterwards.',['thijssen','westerstraat'],['culture','quiet'],'museum');
 e('jordaan-reflect','A reflective museum morning','Allow a meaningful museum visit rather than squeezing it into an implausible gap.',['annefrank','prinsengracht'],['culture','quiet'],'museum');
 e('pijp-green','A little Sarphatipark','A simple park loop and a small square, with no obligation to buy anything.',['sarphati','gerarddou'],['outdoors','quiet'],'park');
 e('pijp-coffee','Coffee, then the pond','A café idea next to Sarphatipark, followed by time to sit outside.',['scandinavian','sarphati'],['coffee','quiet'],'coffee');
 e('pijp-streetfood','A market street and a proper lunch','Browse the public street, then allow a real meal-sized break. Trading and restaurant access need checks.',['albertcuyp','bakers','marieheineken'],['food','unexpected'],'food');
 e('pijp-brickwork','The Amsterdam School, up close','A museum idea paired with the surrounding public architectural streets.',['dageraad','cornelistroost','amstelkanaal'],['culture','outdoors'],'architecture');
 e('pijp-lunch','Lunch with a greener way back','A meal-sized stop and a short park loop, with costs and access kept explicit.',['littlecollins','sarphati'],['food','quiet'],'food');
 e('pijp-canalsouth','The Pijp beyond the market','Explore the less hurried southern streets and finish by the canal.',['cornelistroost','ferdinandbol','amstelkanaal'],['unexpected','outdoors'],'neighbourhood');
 e('pijp-brewery','A brewery-sized afternoon','Leave space for a real timed visit and a square-side pause; admission is not assumed.',['heineken','marieheineken'],['culture','unexpected'],'museum');
 e('museum-without-queues','Museumplein without the queue','Enjoy the public square and museum architecture without claiming interior access.',['museumplein','stedelijk-front','concertgebouw'],['culture','outdoors'],'architecture');
 e('museum-one-gallery','One good museum visit','A focused Rijksmuseum visit with breathing room outside afterwards.',['rijks','museumplein'],['culture','quiet'],'museum');
 e('museum-colour','Colour, then open space','A proper Van Gogh Museum visit followed by time on the square.',['vangogh','museumplein'],['culture'],'museum');
 e('museum-modern','A modern-art afternoon','Pair a focused Stedelijk visit with a slower walk towards the park.',['stedelijk','vondelkerk','vondel-east'],['culture','outdoors'],'museum');
 e('museum-moco','A small exhibition detour','An exhibition idea and an exterior architecture stop, pending real access information.',['moco','concertgebouw'],['culture','unexpected'],'museum');
 e('vondel-green','A park loop, no agenda','Take a compact Vondelpark loop and notice the church from the street.',['vondel-east','vondelkerk'],['outdoors','quiet'],'park');
 e('vondel-cafe','Coffee among the trees','A park café idea with a real sitting allowance and a manageable green loop.',['melkhuis','vondel-east'],['coffee','outdoors'],'coffee');
 e('vondel-slow-lunch','The long way to the blue teahouse','A longer park-and-café combination with a proper rest, not just a more distant coffee.',['vondelkerk','vondel-east','blauwethee'],['coffee','quiet'],'park',{restAt:'vondel-east',restMinutes:30});
 e('oudwest-tramdepot','From tram depot to table','Explore the old depot if open, then allow a proper Foodhallen lunch.',['hallen','foodhallen','bellamy'],['food','culture'],'food');
 e('oudwest-coffee','A coffee on Kinkerstraat','A focused coffee idea with public-street window-shopping afterwards.',['lot61','kinker','dacosta'],['coffee','unexpected'],'coffee');
 e('oudwest-public-loop','The softer side of Oud-West','A small square, a canal and another square make a purchase-free outdoor loop.',['bellamy','jacobkade','dacosta'],['quiet','outdoors'],'waterfront');
 e('oudwest-markets','A street market, a neighbourhood','Take the public market street as a starting point, without assuming stalls are open.',['tenkate','kinker','bellamy'],['unexpected','outdoors'],'neighbourhood');
 e('oudwest-filmnight','A film and a little canal air','A cinema-sized idea with time outside before the show. Programme and exact runtime need verification.',['jacobkade','lab111'],['culture','quiet'],'film');
 e('oudwest-depotfilm','An afternoon at the depot','A meal and cinema combination with a real break between them; current timings are required.',['foodhallen','filmhallen'],['food','culture'],'film');
 e('oudwest-buildings','Three buildings, one neighbourhood','Explore public exteriors and the streets between them without assuming an event is running.',['nieuweliefde','dacosta','orgelpark'],['culture','outdoors'],'architecture');
 e('westergas-openair','Old gasworks, fresh air','A public-grounds architectural walk followed by a manageable park loop.',['westergas','gashouder','westerpark'],['culture','outdoors'],'architecture');
 e('westerpark-bakery','A bakery-sized pause','A bakery idea before some open green space, with a clear illustrative spend.',['bakkerswinkel','westerpark'],['coffee','food'],'coffee');
 e('westerpark-brick','Brickwork with a story','A museum idea and public neighbourhood streets around the Amsterdam School district.',['hetschip','spaarndammer','spaarndammerstraat'],['culture','unexpected'],'architecture');
 e('westerpark-islands','The western islands at walking pace','A public-street photography circuit among warehouse façades, bridges and water.',['prinseneiland','zandhoek'],['quiet','unexpected'],'photography');
 e('westerpark-newwater','New edges of the city','Compare public quays around Houthaven and Pontsteiger, without entering private buildings.',['houtkade','pontsteiger'],['architecture','outdoors','unexpected'],'waterfront');
 e('westerpark-cinema','A park and a picture','Leave a park-sized breather before a film; live programme details are required.',['westerpark','ketelhuis'],['culture','quiet'],'film');
 e('oost-coffee','Beukenplein, then the park','A café idea with a green way back through Oosterpark.',['coffee-bru','beukenplein','oosterpark'],['coffee','outdoors'],'coffee');
 e('oost-green','A small Oosterpark escape','An outdoor park loop with a square-side pause and no purchase requirement.',['oosterpark','beukenplein'],['outdoors','quiet'],'park');
 e('oost-culture','A museum with room to think','Allow a meaningful Wereldmuseum visit and a proper park break afterwards.',['wereldmuseum','oosterpark'],['culture','quiet'],'museum');
 e('oost-marketstreets','Two streets, many everyday stories','A public-street wander between Dapperstraat and Javastraat; trading is not assumed.',['dapperstraat','javastraat','javaplantsoen'],['food','unexpected'],'neighbourhood');
 e('oost-windmill','A windmill, a neighbourhood','An exterior windmill stop followed by time on the surrounding streets.',['gooyer','dapperstraat'],['culture','outdoors'],'architecture');
 e('oost-refreshment','A windmill and a refreshment','A public exterior stop followed by a drink-sized break; service and age checks remain explicit.',['gooyer','brouwerijij'],['food','unexpected'],'food');
 e('oost-flevogreen','A generous green loop','A longer Flevopark visit with a deliberate rest, rather than a race through the park.',['flevopark','javaplantsoen'],['outdoors','quiet'],'park',{restAt:'flevopark',restMinutes:25});
 e('oost-watersidecafe','A café by the quieter water','A café-sized pause and a park loop, with current opening still to check.',['distilleerderij','flevopark'],['coffee','quiet'],'coffee');
 e('oost-frankendael','A little landscape, a little architecture','A proper park loop followed by the public streets of Jeruzalem.',['frankendael','jeruzalem'],['outdoors','culture'],'park');
 e('noord-waterfront','The city from the other bank','An outdoor look at Eye, the tower and the waterfront. Any necessary ferry time is included separately.',['eye-exterior','adam','buiksloterweg'],['outdoors','unexpected'],'waterfront');
 e('noord-eye','A museum across the IJ','A meaningful Eye visit with a public-waterfront pause, pending current access.',['eye','eye-exterior'],['culture','quiet'],'museum');
 e('noord-smallstreets','The other side of the ferry landing','A public-street neighbourhood wander that finishes with space in Noorderpark.',['vanderpek','noorderpark'],['unexpected','outdoors'],'neighbourhood');
 e('noord-ceuvel','A shipyard-sized lunch','A proper meal idea followed by a public view of the floating neighbourhood.',['ceuvel','schoonschip'],['food','unexpected'],'food');
 e('noord-woods','A wood and an old dike','A woodland loop and public-street architecture walk, allowing time to pause.',['vliegenbos','nieuwendammerdijk'],['outdoors','quiet'],'park');
 e('noord-oldvillage','A calmer Noord','A public dike-street wander and a smaller park break away from the busiest ferry routes.',['nieuwendammerdijk','breek'],['quiet','unexpected'],'neighbourhood');
 e('noord-culturalgarden','A garden before the water','A Tolhuistuin idea with a public waterfront finish; garden access is not assumed.',['tolhuistuin','eye-exterior'],['culture','quiet'],'gallery');
 e('ndsm-shortair','A little shipyard air','Two public outdoor wharf stops, with ferry travel counted when needed.',['ndsm-quay','crane'],['outdoors','unexpected'],'waterfront');
 e('ndsm-bigcanvas','A larger canvas','A focused STRAAT visit and a pause on the public wharf, with ticket checks still required.',['straat','ndsmplein','ndsm-quay'],['culture','unexpected'],'museum');
 e('ndsm-lunch','Lunch by a different skyline','A meal-sized Pllek break followed by time at the water.',['pllek','ndsm-quay'],['food','quiet'],'food');
 e('ndsm-cafe','A shipyard coffee detour','A café-sized idea and a slow exterior look at the old shipyard.',['noorderlicht','helling'],['coffee','outdoors'],'coffee');
 e('ndsm-artspaces','An art-space afternoon','Two different cultural spaces, with access and exhibitions checked rather than invented.',['ndsmfuse','treehouse'],['culture','unexpected'],'gallery');
 e('ndsm-industrial','Lines, cranes and open space','A public-exterior photography circuit, excluding private studios and hotel access.',['kunststad','crane','helling','ndsmplein'],['culture','outdoors'],'photography');
 e('ndsm-marketday','A market-sized adventure','An IJ-Hallen idea with a proper meal afterwards. Requires a genuine operating event date.',['ijhallen','ijver'],['food','unexpected'],'market');
 e('ijburg-bridges','An island held together by bridges','An architectural bridge-and-waterfront route using actual connectors rather than crossing open water.',['enneus','steiger'],['culture','outdoors'],'architecture');
 e('ijburg-green','A greener edge of the city','A landscape-park loop and shore-side pause, without a swimming or weather guarantee.',['diemerpark','diemerstrand'],['outdoors','quiet'],'park');
 e('ijburg-footbridge','A bridge worth the detour','A footbridge look and a public dike-path pause with approach travel included.',['nescio','diemerzeedijk'],['outdoors','unexpected'],'architecture');
 e('ijburg-harbour','A harbour, then the new city','Explore the public harbour and newer residential streets without private-pontoon access.',['haveneiland','centrumeiland'],['unexpected','outdoors'],'waterfront');
 e('ijburg-neighbourhood','The island at everyday pace','A neighbourhood street and park loop, with a proper time allowance for sitting.',['ijburglaan','theovangogh','sluishuis'],['quiet','outdoors'],'neighbourhood');
 e('ijburg-food','Lunch on the islands','A food stop and a harbour-side wander, with spending and opening explicitly unverified.',['nap-ijburg','haveneiland'],['food','unexpected'],'food');
 e('zuid-park','A little Beatrixpark','A quieter public-park loop and a look at the changing skyline nearby.',['beatrix','zuidas'],['outdoors','quiet'],'park');
 e('zuid-amstel','A river-sized breather','A park and public-riverbank walk, leaving paid facilities and events out of the plan.',['martinluther','amsteloever'],['outdoors','quiet'],'waterfront');
 e('zuid-windmill','A park with a windmill at the end','Give Amstelpark a proper visit, then look at Riekermolen from outside.',['amstelpark','riekermolen'],['outdoors','unexpected'],'park');
 e('zuid-stadium','A stadium without a ticket','An exterior architectural loop and a public-square pause. Tours and events are excluded.',['olympic','stadionplein'],['culture','outdoors'],'architecture');
 e('zuid-botanical','A small botanical afternoon','A garden idea paired with a public architectural square. Check garden access before starting.',['botaniszuidas','zuidas'],['quiet','culture'],'garden');
 e('zuid-riverstreets','Bridgework and neighbourhood windows','A public bridge pause and a residential shopping-street wander, with no purchase assumed.',['berlagebrug','rijnstraat'],['unexpected','outdoors'],'architecture');
 e('sloterdijk-short','A moment before the platform','A short public-square pause with the station still close.',['orly'],['quiet','outdoors'],'quiet');
 e('sloterdijk-cafe','A square-sized coffee detour','A BRET café idea, then an outdoor pause. Service hours remain a check.',['bret','orly'],['coffee','quiet'],'coffee');
 e('sloterdijk-village','Find the village behind the station','A church exterior and the old public streets, without private building or cemetery access.',['petrus','oudsloterdijk','spaarndammerdijk'],['culture','unexpected'],'architecture');
 e('sloterdijk-green','The green side of Sloterdijk','A public green-path loop with no sport-facility access or booking implied.',['bretten','spieringhorn'],['outdoors','quiet'],'park');
 e('sloterdijk-water','A different view of the station district','A public canal-side pause and a slower look at the station approach.',['westerkanaal','sloterdijkplein'],['unexpected','outdoors'],'waterfront');
 e('plantage-water','A quieter warehouse waterfront','A reflective park pause and an unhurried public-quay walk.',['wertheim','entrepotdok'],['quiet','outdoors'],'waterfront');
 e('plantage-botanical','A garden and a little breathing room','A meaningful botanical visit followed by a quiet park pause, with admission checked separately.',['hortus','wertheim'],['culture','quiet'],'garden');
 e('plantage-micro','Small worlds, open water','A focused Micropia idea and a public waterfront pause. Current entry remains unverified.',['micropia','entrepotdok'],['culture','unexpected'],'museum');
 e('plantage-history','A thoughtful museum afternoon','Allow time for a meaningful museum visit and quiet reflection afterwards.',['resistance','wertheim'],['culture','quiet'],'museum');
 e('plantage-river','Two bridges and a different pace','An outdoor river-and-bridge photography walk, with space for a proper rest.',['magerebrug','hogesluis'],['outdoors','quiet'],'photography',{restAt:'hogesluis',restMinutes:20});
 e('plantage-art','An exhibition by the Amstel','An H’ART exhibition idea with time to look at the river afterwards.',['hermitage','magerebrug'],['culture','quiet'],'museum');
 e('nieuwest-lake','A generous lake-side pause','A public-park and north-shore combination that does not promise a full circuit of the lake.',['sloterpark','sloterplas'],['outdoors','quiet'],'waterfront');
 e('nieuwest-planning','How a city grows','An architecture-museum idea followed by a lake-side pause, with opening checked before departure.',['vaneesteren','sloterplas'],['culture','unexpected'],'museum');
 e('nieuwest-rembrandt','A park without a purchase','A generous Rembrandtpark loop and a public-square architectural look.',['rembrandtpark','mercator'],['outdoors','quiet'],'park');
 e('nieuwest-erasmus','A smaller green escape','A manageable Erasmuspark loop and a square-side pause, with no café purchase requirement.',['erasmuspark','mercator'],['outdoors','quiet'],'park');
 e('nieuwest-nature','A small nature afternoon','A green-space idea and a proper park break; visitor access is checked rather than assumed.',['natureluur','sloterpark'],['outdoors','quiet'],'garden');
 // Longer ideas are specifically composed multi-stop sequences with meal/rest dwell, not
 // a short idea stretched by relabelling its duration. They remain subject to the same limits.
 e('long-centre-jordaan','An afternoon from the old city to the canals','A varied outdoor sequence with a packed-lunch rest on Noordermarkt. Bring your own food; no purchased meal is included.',['beurs','oudekerk','nieuwmarkt','prinsengracht','noordermarkt','brouwersgracht'],['culture','outdoors','unexpected'],'half-day',{restAt:'noordermarkt',restMinutes:45,meal:'Packed-lunch/rest break · bring your own food'});
 e('long-museum-pijp','Art, lunch, and a different kind of collection','A focused museum visit, a proper lunch and time outdoors in De Pijp. Real access and menu checks are required.',['rijks','museumplein','bakers','sarphati','albertcuyp'],['culture','food'],'half-day');
 e('long-west-green','The softer western side','A varied public-space route with a packed-lunch break, from canal-side streets to old gasworks and green space.',['jacobkade','bellamy','dacosta','prinseneiland','westergas','westerpark'],['quiet','outdoors'],'half-day',{restAt:'westerpark',restMinutes:50,meal:'Packed-lunch/rest break · bring your own food'});
 e('long-noord-public','Across the water, without rushing','An outdoor ferry-linked sequence from the waterfront to Noord’s public streets and park, with a proper packed-lunch rest.',['eye-exterior','adam','vanderpek','noorderpark','schoonschip'],['outdoors','unexpected'],'half-day',{restAt:'noorderpark',restMinutes:45,meal:'Packed-lunch/rest break · bring your own food'});
 e('long-ndsm-art','The shipyard, one space at a time','A larger art-and-food combination with a proper lunch, not an implausibly short museum hop.',['straat','ndsmplein','pllek','ndsmfuse','ndsm-quay'],['culture','food','unexpected'],'half-day');
 e('long-east-green','A green day on the eastern side','Two substantial parks and the streets between them, with a packed-lunch rest. Bring food and check local path conditions.',['frankendael','jeruzalem','oosterpark','dapperstraat','flevopark'],['outdoors','quiet'],'half-day',{restAt:'oosterpark',restMinutes:50,meal:'Packed-lunch/rest break · bring your own food'});
 e('long-island-day','An island afternoon with room to sit','Bridges, open landscapes and a harbour-side finish, with a deliberate packed-lunch break along the way.',['enneus','steiger','diemerpark','diemerstrand','theovangogh','haveneiland'],['outdoors','unexpected'],'half-day',{restAt:'diemerpark',restMinutes:50,meal:'Packed-lunch/rest break · bring your own food'});
 e('long-zuid-landscape','The longer green line south','A varied park-and-river sequence with a substantial rest, using public outdoor stops.',['beatrix','amstelpark','riekermolen','amsteloever','martinluther'],['outdoors','quiet'],'half-day',{restAt:'amstelpark',restMinutes:50,meal:'Packed-lunch/rest break · bring your own food'});
 e('long-west-lake','From the old village to open water','Old village streets, green paths and the lake, with a packed-lunch/rest break. A longer cycle or transit selection may suit the distances.',['petrus','oudsloterdijk','bretten','sloterpark','sloterplas'],['outdoors','culture'],'half-day',{restAt:'sloterpark',restMinutes:50,meal:'Packed-lunch/rest break · bring your own food'});
 e('long-two-museums','A city seen through two collections','Two proper museum visits separated by a meal-sized break, with real admission and service checks required.',['rijks','museumplein','foodhallen','hallen','stedelijk'],['culture','food'],'full-day');


 // Optional excursions start in Amsterdam and always require NS route/fare checks.
 // These four destination POIs are excluded from the Amsterdam core count.
 Object.assign(areas,{haarlemExcursion:{name:'Haarlem · optional NS excursion',city:'Haarlem',region:'Noord-Holland',photo:'haarlem',bank:'excursion',source:'https://www.visithaarlem.com/'},zandvoortExcursion:{name:'Zandvoort · optional NS excursion',city:'Zandvoort',region:'Noord-Holland',photo:'zandvoort',bank:'excursion',source:'https://visitzandvoort.com/beach/boulevard/'}});
 add('haarlemExcursion',[
 ['exc-haarlem-markt','Haarlem · Grote Markt',52.3812,4.6368,'neighbourhood',35,'public',0,'An optional Amsterdam round-trip destination: public-square time, excluding church entry and market-trading assumptions.','https://www.visithaarlem.com/'],
 ['exc-haarlem-spaarne','Haarlem · public Spaarne quay',52.3792,4.6397,'waterfront',30,'public',0,'A public waterside pause on the optional NS excursion. Current trains, fares and return must be checked.','https://www.visithaarlem.com/']
 ]);
 add('zandvoortExcursion',[
 ['exc-zandvoort-boulevard','Zandvoort · public boulevard',52.3743,4.5291,'waterfront',35,'public',0,'A manageable public promenade pause on an optional Amsterdam round trip; this is not a swimming or weather guarantee.','https://visitzandvoort.com/beach/boulevard/'],
 ['exc-zandvoort-beach','Zandvoort · public shore',52.3748,4.5273,'quiet',45,'public',0,'A shore-side rest after a separately checked NS journey. Food, swimming safety and beach facilities are not included.','https://visitzandvoort.com/beach/']
 ]);
 for(const p of places)if(p.id.startsWith('exc-'))p.excursionOnly=true;
 const nsHaarlem={operator:'NS',destination:'Haarlem',origin:'Amsterdam Centraal',minimumWindow:240,railAllowance:30,waitAllowance:15,stationBuffer:10,destinationStation:{id:'ns-haarlem',name:'Haarlem station',lat:52.3878,lng:4.6388,bank:'excursion',city:'Haarlem'},source:'https://www.ns.nl/en/routes/amsterdam-to-haarlem',planner:'https://www.ns.nl/en/journeyplanner/#/?vertrek=Amsterdam%20Centraal&vertrektype=treinstation&aankomst=Haarlem&aankomsttype=treinstation&type=vertrek',outboundURL:'https://www.ns.nl/en/journeyplanner/#/?vertrek=Amsterdam%20Centraal&vertrektype=treinstation&aankomst=Haarlem&aankomsttype=treinstation&type=vertrek',returnURL:'https://www.ns.nl/en/journeyplanner/#/?vertrek=Haarlem&vertrektype=treinstation&aankomst=Amsterdam%20Centraal&aankomsttype=treinstation&type=vertrek'};
 const nsZandvoort={operator:'NS',destination:'Zandvoort aan Zee',origin:'Amsterdam Centraal',minimumWindow:300,railAllowance:45,waitAllowance:20,stationBuffer:10,destinationStation:{id:'ns-zandvoort',name:'Zandvoort aan Zee station',lat:52.3751,lng:4.5329,bank:'excursion',city:'Zandvoort'},source:'https://www.ns.nl/en/journeyplanner/',planner:'https://www.ns.nl/en/journeyplanner/#/?vertrek=Amsterdam%20Centraal&vertrektype=treinstation&aankomst=Zandvoort%20aan%20Zee&aankomsttype=treinstation&type=vertrek',outboundURL:'https://www.ns.nl/en/journeyplanner/#/?vertrek=Amsterdam%20Centraal&vertrektype=treinstation&aankomst=Zandvoort%20aan%20Zee&aankomsttype=treinstation&type=vertrek',returnURL:'https://www.ns.nl/en/journeyplanner/#/?vertrek=Zandvoort%20aan%20Zee&vertrektype=treinstation&aankomst=Amsterdam%20Centraal&aankomsttype=treinstation&type=vertrek',serviceNoticeSource:'https://www.ns.nl/en/travel/better-journey/engineering-work-in-north-holland'};
 e('ns-haarlem-halfday','A half-day out to Haarlem','Optional NS round trip from Amsterdam: a public-square wander, Spaarne time and a packed-lunch rest. Outbound, return services and fares must be checked; displayed rail allowances are not a timetable.',['exc-haarlem-markt','exc-haarlem-spaarne'],['outdoors','culture'],'rail-excursion',{city:'Amsterdam',region:'Noord-Holland',restAt:'exc-haarlem-markt',restMinutes:45,meal:'Packed-lunch/rest break · bring your own food',excursion:nsHaarlem,operator:'NS'});
 e('ns-zandvoort-halfday','A little more time, a little sea air','Optional NS round trip from Amsterdam with a proper boulevard and shore-side rest. Current outward and return trains, fares, weather and local conditions must be checked before starting.',['exc-zandvoort-boulevard','exc-zandvoort-beach'],['outdoors','quiet'],'rail-excursion',{city:'Amsterdam',region:'Noord-Holland',restAt:'exc-zandvoort-beach',restMinutes:60,meal:'Packed-lunch/rest break · bring your own food',excursion:nsZandvoort,operator:'NS'});

 const starts=[
 {id:'central',name:'Amsterdam Centraal',lat:52.3791,lng:4.9003,area:'Centrum',bank:'south'},
 {id:'jordaan',name:'Westermarkt · Jordaan',lat:52.3746,lng:4.8846,area:'Jordaan',bank:'south'},
 {id:'pijp',name:'De Pijp · metro station',lat:52.3555,lng:4.8904,area:'De Pijp',bank:'south'},
 {id:'museum',name:'Museumplein',lat:52.3580,lng:4.8811,area:'Museumplein',bank:'south'},
 {id:'oudwest',name:'De Hallen · Oud-West',lat:52.3664,lng:4.8688,area:'Oud-West',bank:'south'},
 {id:'westerpark',name:'Westergas · Westerpark',lat:52.3861,lng:4.8725,area:'Westerpark',bank:'south'},
 {id:'oost',name:'Oosterpark · west entrance',lat:52.3602,lng:4.9189,area:'Oost',bank:'south'},
 {id:'noord',name:'Buiksloterweg · Noord',lat:52.3833,lng:4.9024,area:'Noord',bank:'north'},
 {id:'ndsm',name:'NDSM · ferry landing',lat:52.4000,lng:4.8941,area:'NDSM',bank:'north'},
 {id:'ijburg',name:'IJburg · IJburglaan',lat:52.3575,lng:4.9930,area:'IJburg',bank:'east'},
 {id:'zuid',name:'Amsterdam Zuid',lat:52.3388,lng:4.8723,area:'Zuid',bank:'south'},
 {id:'sloterdijk',name:'Amsterdam Sloterdijk',lat:52.3890,lng:4.8377,area:'Sloterdijk',bank:'south'},
 {id:'plantage',name:'Plantage · Artisplein',lat:52.3668,lng:4.9123,area:'Plantage',bank:'south'},
 {id:'nieuwWest',name:'Sloterplas · north shore',lat:52.3732,lng:4.8238,area:'Nieuw-West',bank:'south'}
 ];
 starts.forEach(s=>{s.city??="Amsterdam";s.region??="Noord-Holland";});
 window.AmstrollCatalog={version:4,places,experiences,starts,areas,attribution:'Original descriptions and itineraries © Bram Peters Studio. Place identities are factual references to linked primary venue/city and official Amsterdam tourism sources; approximate coordinates and all travel/cost allowances are authored estimates. No Google review, rating, photo or opening data is stored.',sources:[{url:root,title:'I amsterdam · official neighbourhood guides'},{url:'https://download.iamsterdam.com/5twy0nmhslbo/z-card-z10-city-map-465x820-insert-nlhrdef.pdf',title:'I amsterdam · official city map'},{url:'https://www.amsterdam.nl/leefomgeving/parken-recreatiegebieden/',title:'Gemeente Amsterdam · parks'},{url:'https://gvb.nl/en/travel-products/ferry-tickets',title:'GVB · ferry access and connections'}]};
})();

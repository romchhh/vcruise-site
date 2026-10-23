/**
 * Country names as they appear in 4gates routes (UA / RU / EN, with typos)
 * → ISO-style flag code used by country-flag-icons.
 * SVG flags, not Unicode emoji: emoji flags render as letter pairs on Windows.
 */

const NOTE =
  /\((?:круїз|hot|дубль|msc[^)]*|royal caribbean[^)]*|e-prix[^)]*|optional[^)]*|transfer[^)]*|weather[^)]*|уточнити)\)/gi;

const COUNTRY_NAMES: Record<string, string> = {};

function fold(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[’'`´ʼʻʹ′]/g, "")
    .replace(/ґ/g, "г")
    .replace(/о-в[иа]/g, "острови")
    .replace(/\./g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function add(code: string, names: string) {
  for (const name of names.split("|")) {
    const key = fold(name);
    if (key) COUNTRY_NAMES[key] = code;
  }
}

add("IT", "італія|италия|italy|italia|itay|сицилія|сицилия|sicily|корсика|корсика|corsica");
add("ES", "іспанія|испания|spain|españa");
add("GR", "греція|греция|greece");
add("FR", "франція|франция|france");
add("US", "сша|usa|u s a|united states|соединенные штаты|сполучені штати|аляска|alaska|гаваї|гавайи|hawaii");
add("MX", "мексика|mexico");
add("TR", "туреччина|турция|turkey|türkiye|turkiye");
add("JP", "японія|япония|japan");
add("NO", "норвегія|норвегия|norway|шпіцберген|шпицберген|spitsbergen|svalbard");
add("BR", "бразилія|бразилия|brazil");
add("BS", "багамські острови|багамские острова|багамські о-ви|багами|багамы|bahamas");
add("HR", "хорватія|хорватия|croatia");
add("PT", "португалія|португалия|portugal|мадейра|madeira|азорські о-ви|азорские острова|azores");
add("MT", "мальта|malta");
add("GB", "великобританія|великобритания|велика британія|великая британия|united kingdom|uk|britain");
add("GB_ENG", "англія|англия|england");
add("GB_SCT", "шотландія|шотландия|scotland");
add("GB_WLS", "уельс|уэльс|wales");
add("GB_NIR", "північна ірландія|северная ирландия|northern ireland");
add("AU", "австралія|австралия|australia");
add("DE", "німеччина|германия|germany|deutschland");
add("NL", "нідерланди|нидерланды|netherlands|holland");
add("DO", "домініканська республіка|доміниканська республіка|доминиканская республика|dominican republic|домінікана|доминикана");
add("BB", "барбадос|barbados");
add("MQ", "мартиніка|мартиника|martinique");
add("GP", "гваделупа|гваделупе|guadeloupe");
add("HN", "гондурас|honduras");
add("TN", "туніс|тунис|tunisia");
add("AG", "антигуа і барбуда|антигуа и барбуда|антигуа та барбуда|антигуа|antigua and barbuda|antigua");
add("EC", "еквадор|эквадор|ecuador|галапагоські о-ви|галапагоські острови|галапагосские острова|galapagos");
add("AR", "аргентина|аргентина|argentina");
add("KN", "сент-кітс і невіс|сент-китс и невис|saint kitts and nevis|st kitts|nevis");
add("IS", "ісландія|исландия|iceland");
add("ME", "чорногорія|черногорія|черногория|montenegro");
add("CN", "китай|china");
add("NZ", "нова зеландія|новая зеландия|new zealand");
add("MA", "марокко|марокко|morocco|marocco");
add("SE", "швеція|швеция|sweden");
add("CA", "канада|canada");
add("PR", "пуерто рико|пуерто-рико|пуерто-ріко|puerto rico");
add("SX", "сен-мартен|сінт-мартен|синт-мартен|sint maarten|saint martin");
add("MF", "сен-мартен франція");
add("AW", "аруба|aruba");
add("BM", "бермудські острови|бермудские острова|бермуди|бермуды|bermuda");
add("VG", "британські віргінські острови|британские виргинские острова|british virgin islands");
add("VI", "віргінські острови сша|американські віргінські острови|американские виргинские острова|us virgin islands");
add("LC", "сент-люсія|сент-люсия|saint lucia|st lucia");
add("JM", "ямайка|jamaica");
add("KR", "південна корея|южная корея|south korea|korea");
add("CW", "кюрасао|кюрасао|curacao|curaçao");
add("PA", "панама|panama");
add("CO", "колумбія|колумбия|colombia");
add("CL", "чилі|чили|chile");
add("MC", "монако|monaco");
add("DM", "домініка|доминика|dominica");
add("TH", "таїланд|таиланд|thailand");
add("BE", "бельгія|бельгия|belgium");
add("PF", "французька полінезія|французская полинезия|french polynesia|таїті|таити|tahiti|tahiti island|society islands|tuamotu islands");
add("ZA", "пар|юар|південна африка|южная африка|south africa");
add("ID", "індонезія|индонезия|indonesia|балі|бали|bali");
add("TC", "теркс і кайкос|теркс та кайкос|теркс и кайкос|turks and caicos");
add("BZ", "беліз|белиз|belize");
add("GD", "гренада|grenada");
add("GF", "французька гвіана|французская гвиана|french guiana");
add("EE", "естонія|эстония|estonia");
add("FI", "фінляндія|финляндия|finland|аландські о-ви|аландские острова");
add("PL", "польща|польша|poland");
add("EG", "єгипет|египет|egypt");
add("TW", "тайвань|тайвань|taiwan");
add("MY", "малайзія|малайзия|malaysia");
add("LT", "литва|литва|lithuania");
add("VU", "вануату|vanuatu");
add("SG", "сінгапур|сингапур|singapore");
add("SI", "словенія|словения|slovenia");
add("LV", "латвія|латвия|latvia");
add("FJ", "фіджі|фиджи|fiji");
add("AE", "оае|оаэ|uae|united arab emirates");
add("AT", "австрія|австрия|austria");
add("HT", "гаїті|гаити|haiti");
add("PH", "філіппіни|филиппины|philippines");
add("CY", "кіпр|кипр|cyprus");
add("CR", "коста-рика|коста-ріка|коста рика|costa rica");
add("KH", "камбоджа|камбоджі|камбоджа|cambodia");
add("CH", "швейцарія|швейцария|switzerland");
add("NA", "намібія|намибия|namibia");
add("OM", "оман|oman");
add("SA", "саудівська аравія|саудовская аравия|saudi arabia");
add("IL", "ізраїль|израиль|israel");
add("BG", "болгарія|болгария|bulgaria");
add("RO", "румунія|румыния|romania");
add("IN", "індія|индия|india");
add("LU", "люксембург|люксембург|luxembourg");
add("BN", "бруней|brunei");
add("WS", "самоа|samoa");
add("GL", "гренландія|гренландия|greenland");
add("FO", "фарерські острови|фарерские острова|faroe islands");
add("CK", "острови кука|острова кука|cook islands");
add("NC", "нова каледонія|новая каледония|new caledonia");
add("GI", "гібралтар|гибралтар|gibraltar");
add("GG", "гернсі|гернси|guernsey");
add("JE", "джерсі|джерси|jersey");
add("IM", "острів мен|остров мэн|isle of man");
add("HK", "гонконг|hong kong");
add("GU", "гуам|guam");
add("AS", "американське самоа|американское самоа|american samoa");
add("AQ", "антарктида|антарктика|antarctica");
add("IE", "ірландія|ирландия|ireland");
add("DK", "данія|дания|denmark");
add("HU", "угорщина|венгрия|hungary");
add("SK", "словаччина|словакия|slovakia");
add("RS", "сербія|сербия|serbia");
add("AL", "албанія|албания|albania");
add("QA", "катар|qatar");
add("MU", "маврикій|маврикий|mauritius");
add("SC", "сейшели|сейшельські острови|seychelles");
add("MV", "мальдіви|мальдивы|maldives");
add("LK", "шрі-ланка|шри-ланка|sri lanka");
add("MG", "мадагаскар|madagascar");
add("MZ", "мозамбік|мозамбик|mozambique");
add("TZ", "танзанія|танзания|tanzania");
add("KE", "кенія|кения|kenya");
add("SN", "сенегал|senegal");
add("CV", "кабо-верде|кабо верде|cape verde");
add("ST", "сан-томе та принсипі|сан-томе и принсипи|sao tome and principe");
add("DZ", "алжир|алжир|algeria");
add("AO", "ангола|angola");
add("BJ", "бенін|бенин|benin");
add("GH", "гана|ghana");
add("BW", "ботсвана|botswana");
add("ZW", "зімбабве|зимбабве|zimbabwe");
add("PG", "папуа-нова гвінея|папуа новая гвинея|papua new guinea");
add("KI", "кірібаті|кирибати|kiribati");
add("TO", "тонга|tonga");
add("KY", "кайманові острови|кайманові о-ви|каймановы острова|cayman islands|гранд кайман|гранд-кайман");
add("FK", "фолклендські острови|фолклендские о-ви|фолклендские острова|falkland islands");
add("AI", "ангілья|ангилья|anguilla");
add("MS", "монтсеррат|montserrat");
add("BQ", "бонайре|бонейр|bonaire");
add("BL", "сен-бартелемі|сен-бартельмі|saint barthelemy|st barthelemy");
add("VC", "сент-вінсент і гренадіни|сент-вінсент і ґренадіни|сент-винсент и гренадины|saint vincent and the grenadines");
add("TT", "тринідад і тобаго|тринідад та тобаго|тринидад и тобаго|trinidad and tobago");
add("UY", "уругвай|uruguay");
add("PE", "перу|перу|peru");
add("GT", "гватемала|guatemala");
add("SV", "сальвадор|salvador");
add("NI", "нікарагуа|никарагуа|nicaragua");
add("CU", "куба|cuba");
add("JO", "йорданія|иордания|jordan");
add("VN", "в'єтнам|вʼєтнам|вьетнам|vietnam|viet nam");
add("RE", "реюньйон|реюньон|reunion");
add("PM", "сен-п'єр і мікелон|сен-пьер и микелон|saint pierre and miquelon");
add("IC", "канарські острови|канарские острова|canary islands");
add("ES_CT", "каталонія|каталония|catalonia");

function lookup(value: string) {
  const key = fold(value);
  if (!key) return null;
  return COUNTRY_NAMES[key] ?? null;
}

/** Flag code for a route place line such as "Італія" or "Флорида, США". */
export function countryCodeFromPlace(place: string): string | null {
  const cleaned = place.replace(NOTE, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  const folded = fold(cleaned);
  if (/віргін|виргин|virgin/.test(folded)) {
    if (/сша|usa|united states/.test(folded)) return "VI";
    if (/брит|united kingdom|велик|вел-я|вел я/.test(folded)) return "VG";
  }

  const direct = lookup(cleaned);
  if (direct) return direct;

  const parens = [...cleaned.matchAll(/\(([^)]+)\)/g)].map((match) => match[1]);
  const parts = cleaned
    .replace(/\([^)]*\)/g, " ")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const code = lookup(parts[index]);
    if (code) return code;
  }

  for (const paren of parens) {
    const code = lookup(paren);
    if (code) return code;
  }

  return null;
}

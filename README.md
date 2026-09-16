# Pokemon-vahti

Seuraa valittujen Pokemon-tuotteiden (esim. "30th Anniversary") saatavuutta
suomalaisissa (ja muissa) verkkokaupoissa ja lähettää Discord-ilmoituksen kun
tuote tulee saataville.

## Miten se toimii

1. `npm run check` (tai ajastettu `npm run watch` / GitHub Actions -workflow)
   käy läpi kaikki `config/config.json`-tiedostossa määritellyt kaupat.
2. Jokaisesta kaupasta yritetään ensin lukea Shopify-alustan julkista
   `/products.json`-rajapintaa (`platform: "auto"` tai `"shopify"`). Moni
   pieni harrastekauppa käyttää Shopifya, joten tämä toimii yleensä suoraan
   ilman erillistä konfigurointia.
3. Jos kauppa ei vastaa Shopify-muodossa, käytetään yleistä HTML-hakua:
   haetaan kaupan hakusivu jokaiselle hakusanalle ja etsitään tuotekortteja,
   joiden teksti sisältää hakusanan. Varastotilanne päätellään tekstistä
   (esim. "Lisää ostoskoriin" / "Loppuunmyyty").
4. Löydetyt tuotteet verrataan edelliseen ajoon tallennettuun tilaan
   (`data/state.json`). Discord-ilmoitus lähetetään vain kun tuote **muuttuu**
   ei-saatavilla → saatavilla -tilaan, jotta samasta tuotteesta ei spämmätä
   joka ajolla.
5. Voit myös lisätä `watchedProducts`-listaan suoria tuotesivun URLeja, joiden
   varastotilannetta seurataan ilman hakusanahakua.

## Käyttöönotto

```bash
npm install
cp .env.example .env
# muokkaa .env: DISCORD_WEBHOOK_URL=<discordin webhook-url>
npm run check      # yksi tarkistuskierros
npm run watch       # jatkuva vahti, oletusväli 10 min (config.json: intervalMinutes)
```

Discordin webhook luodaan kanavan asetuksista: **Kanava-asetukset → Integraatiot
→ Webhookit → Uusi webhook**, kopioi URL `.env`-tiedostoon.

## Kaupat ja hakusanat

Muokkaa `config/config.json`:

```jsonc
{
  "intervalMinutes": 10,
  "keywords": [
    "30th anniversary",
    "151",
    { "keyword": "prismatic evolutions", "maxPrice": 80 }
  ],
  "shops": [
    { "id": "esimerkki", "name": "Esimerkkikauppa", "baseUrl": "https://esimerkki.fi", "platform": "auto" }
  ],
  "watchedProducts": [
    { "url": "https://esimerkki.fi/tuotteet/pokemon-30v", "name": "Pokemon 30v-tuote" }
  ]
}
```

- `platform: "auto"` (suositus) kokeilee ensin Shopifya ja jatkaa yleiseen
  HTML-hakuun jos se ei toimi.
- Ei-Shopify-kaupoille voi antaa `searchUrlTemplate` (`{baseUrl}` ja `{query}`
  korvataan) ja tarkempia CSS-selektoreita `html`-objektissa
  (`itemSelector`, `nameSelector`, `linkSelector`, `priceSelector`) — katso
  `src/types.ts` kommentit.
- `id` on pysyvä tunniste tilan tallennukseen — älä muuta sitä jälkikäteen,
  tai kauppa "unohtaa" aiemmin nähdyt tuotteet.

### Hintaraja hakusanalle

Jokainen `keywords`-listan alkio voi olla joko pelkkä merkkijono (ei
hintarajaa, ilmoitus millä tahansa hinnalla) tai olio jossa on lisäksi
`maxPrice`:

```jsonc
{ "keyword": "30th anniversary", "maxPrice": 100 }
```

Tällöin ilmoitus lähetetään vain jos tuotteen hinta on **enintään** 100 €.
Hintaraja toimii luotettavasti Shopify-kaupoille (hinta luetaan suoraan
`/products.json`-datasta). HTML-kaupoille hintaraja toimii vain jos kaupalle
on määritelty `html.priceSelector` — jos hintaa ei pystytä lukemaan sivulta,
osuma päästetään silti läpi (parempi näyttää liikaa kuin jättää tuote
huomaamatta).

### Mukana valmiiksi

Konfiguraatiossa on valmiina kaikki pyydetyt kaupat: Kevin's Hobby Shop,
Korttistoppi, PokePulls, Infinity Prints TCG, Block House Games, MaxGaming,
Alpha Games, VPD, Pelimies, Muksumassi, Swagykarp, Verkkokauppa.com,
TCG Kauppa, Prisma ja Citymarket.

**Huomio osoitteista:** suurin osa osoitteista ja hakulogiikasta on nyt
vahvistettu joko `npm run check-robots` -ajolla (ks. alla) tai käyttäjän
antamilla oikeilla linkeillä. Prisma ja Citymarket eivät käytä hakusanakohtaista
hakuosoitetta vaan kiinteää keräilykorttien kategoriasivua
(`searchUrlTemplate` ilman `{query}`-paikkamerkkiä) — skräpperi hakee sivun
kerran ja vertaa sisältöä kaikkiin hakusanoihin. Jos jokin kauppa ei tuota
osumia, avaa kaupan haku-/kategoriasivu selaimessa, tarkista todellinen
osoite ja tarvittaessa lisää `html`-selektorit.

### "Kaikki suomalaiset verkkokaupat"

Automaattista tuntemattomien kauppojen löytämistä ("kaikki Suomen
verkkokaupat") ei ole rakennettu — sellaista listaa ei ole olemassa
luotettavana lähteenä, ja jokaisen kaupan hakulogiikka pitää silti pystyä
tunnistamaan. Sen sijaan arkkitehtuuri on tehty helposti laajennettavaksi:
minkä tahansa Shopify-kaupan voi lisätä `shops`-listaan pelkällä
`baseUrl`:lla, ja muut kaupat lisäämällä hakuosoitteen (ja tarvittaessa
selektorit). Lisää kauppoja sitä mukaa kun niitä tulee vastaan.

## Ajastettu ajo (GitHub Actions)

`.github/workflows/watch.yml` ajaa tarkistuksen 10 minuutin välein
GitHub Actionsissa (ei vaadi omaa palvelinta):

1. Lisää repoon secret `DISCORD_WEBHOOK_URL` (**Settings → Secrets and
   variables → Actions**).
2. Workflow tallentaa `data/state.json`-tilan `actions/cache`-välimuistiin
   ajojen välillä, jotta ilmoituksia ei lähetetä toistuvasti samasta
   tuotteesta.
3. Voit ajaa workflown myös käsin (**Actions → Pokemon-vahti → Run
   workflow**).

GitHub Actionsin cron-ajastus ei ole sekuntilleen tarkka etenkään ruuhka-
aikoina — todellinen väli voi venyä muutamalla minuutilla.

## Rajoitukset ja hyvät tavat

- Tämä on parhaan yrityksen periaatteella toimiva skräpperi: verkkokauppojen
  sivurakenteet muuttuvat ajoittain, jolloin selektorit pitää päivittää.
- Älä aseta `intervalMinutes`-arvoa liian pieneksi — kohtuuton pyyntitiheys
  kuormittaa etenkin pieniä kauppoja turhaan. 10 minuuttia on järkevä oletus.
- Tarkista kunkin kaupan käyttöehdot/robots.txt jos aiot ajaa vahtia jatkuvasti
  tuotannossa.

## Testit

```bash
npm test        # yksikkötestit (vitest)
npm run typecheck
```

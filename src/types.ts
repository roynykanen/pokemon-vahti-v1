export type ShopPlatform = "auto" | "shopify" | "html";

export interface ShopConfig {
  /** Vakaa tunniste, käytetään tilan tallennuksessa. Älä muuta jälkikäteen. */
  id: string;
  /** Näyttönimi Discord-ilmoituksissa. */
  name: string;
  /** Kaupan etusivun URL, esim. "https://esimerkki.fi" */
  baseUrl: string;
  /**
   * "auto" (oletus) kokeilee ensin Shopify-alustan julkista /products.json
   * -rajapintaa ja jos se ei toimi, käyttää yleistä HTML-hakua.
   * "shopify" tai "html" pakottaa tietyn strategian.
   */
  platform?: ShopPlatform;
  /**
   * Hakusivun URL-malli HTML-strategialle, {query} korvataan hakusanalla.
   * Jos puuttuu, käytetään oletusta "{baseUrl}/search?q={query}".
   */
  searchUrlTemplate?: string;
  /** Valinnaiset CSS-selektorit HTML-strategian tarkentamiseksi. */
  html?: {
    /** Yksittäisen tuotekortin selektori hakutuloslistassa. */
    itemSelector?: string;
    /** Tuotteen nimen selektori (tuotekortin sisällä). */
    nameSelector?: string;
    /** Tuotteen linkin selektori (tuotekortin sisällä), luetaan href. */
    linkSelector?: string;
    /** Tuotteen hinnan selektori (tuotekortin sisällä), valinnainen. */
    priceSelector?: string;
  };
  /** Ohita tämä kauppa tarkistuksista (esim. jos vielä keskeneräinen). */
  disabled?: boolean;
  /** Vapaamuotoinen muistiinpano, ei käytetä koodissa. */
  note?: string;
}

export interface WatchedProduct {
  /** Suora tuotesivun URL, jota seurataan varastotilanteen osalta. */
  url: string;
  /** Näyttönimi Discord-ilmoituksissa. */
  name: string;
  /** Minkä kaupan alle tämä kuuluu (vain näyttöä/ryhmittelyä varten). */
  shopName?: string;
}

/** Hakusana ja siihen valinnaisesti liittyvä yläraja hinnalle. */
export interface KeywordFilter {
  keyword: string;
  /**
   * Jos asetettu, ilmoitus lähetetään vain jos tuotteen hinta on tämä tai
   * alle. Jos hintaa ei pystytä päättelemään (esim. HTML-kauppa ilman
   * priceSelectoria), osuma päästetään silti läpi.
   */
  maxPrice?: number;
}

/** Hakusana joko pelkkänä merkkijonona tai {keyword, maxPrice}-olio. */
export type KeywordConfig = string | KeywordFilter;

export interface AppConfig {
  /**
   * Hakusanat, joilla tuotteita etsitään jokaisen kaupan haku-/tuotelistalta.
   * Vertailu on case-insensitive ja diakriittejä normalisoiva. Pelkkä
   * merkkijono ei rajoita hintaa; {"keyword": "...", "maxPrice": 100}
   * ilmoittaa vain jos tuotteen hinta on enintään annettu raja.
   */
  keywords: KeywordConfig[];
  /** Kaupat, joiden hakutuloksia seurataan hakusanoilla. */
  shops: ShopConfig[];
  /** Yksittäiset tuotesivut, joiden varastotilannetta seurataan suoraan. */
  watchedProducts?: WatchedProduct[];
  /** Tarkistusväli minuutteina jatkuvassa "watch"-tilassa. */
  intervalMinutes?: number;
}

export interface FoundProduct {
  /** Uniikki avain tilan tallennusta varten: `${shopId}:${url}` */
  key: string;
  shopId: string;
  shopName: string;
  name: string;
  url: string;
  price?: string;
  imageUrl?: string;
  available: boolean;
  matchedKeyword?: string;
}

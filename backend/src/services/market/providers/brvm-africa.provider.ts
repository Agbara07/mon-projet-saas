/**
 * OUTIL 4 — COMPARATEUR BOURSES AFRICAINES
 * Réf : ASEA Annual Statistics 2023, FMI WEO Oct 2024,
 *       World Bank Global Financial Development Database 2024
 * Route : GET /market/brvm/tools/africa
 */

export interface AfricanMarketData {
  market:         string
  country:        string
  indexName:      string
  currency:       string
  peRatio?:       number
  dividendYield?: number
  ytdReturn?:     number
  marketCapUSD?:  number
  volatility?:    string
  mainSectors:    string[]
  description:    string
  source:         string
}

export function getAfricanMarketsComparison(): AfricanMarketData[] {
  return [
    {
      market:'BRVM', country:'UEMOA (8 pays)', indexName:'BRVM Composite', currency:'XOF (€ peg)',
      peRatio:10.2, dividendYield:5.1, ytdReturn:4.8, marketCapUSD:14_500, volatility:'Faible',
      mainSectors:['Télécoms','Banque','Agriculture','Industrie'],
      description:'Marché régional UEMOA, 48 sociétés cotées. Devise ancrée à l\'euro (parité fixe 655,957 XOF/EUR depuis 1999). Faible corrélation avec marchés développés = diversification.',
      source:'BRVM Yearbook 2023 + CREPMF',
    },
    {
      market:'NSE', country:'Kenya', indexName:'NSE 20 Share Index', currency:'KES',
      peRatio:7.8, dividendYield:6.2, ytdReturn:-8.3, marketCapUSD:18_200, volatility:'Modérée',
      mainSectors:['Banque','Telecom (Safaricom)','Energie','Immobilier'],
      description:'Hub financier d\'Afrique de l\'Est. Safaricom (M-Pesa) = ~50% du marché. Forte volatilité KES/USD récente.',
      source:'NSE Monthly Bulletin Nov 2024 ; FMI Article IV Kenya 2024',
    },
    {
      market:'NGX', country:'Nigeria', indexName:'NGX All Share Index', currency:'NGN',
      peRatio:13.5, dividendYield:3.4, ytdReturn:33.2, marketCapUSD:62_000, volatility:'Très élevée',
      mainSectors:['Banque','Ciment (Dangote)','Pétrole','Telecom (MTN NG)'],
      description:'Première capitalisation d\'Afrique subsaharienne. Forte dévaluation NGN 2023 (+70%). Marché volatile mais profond.',
      source:'NGX Fact Sheet Q3 2024 ; Banque Mondiale Nigeria Update 2024',
    },
    {
      market:'JSE', country:'Afrique du Sud', indexName:'JSE All Share (ALSI)', currency:'ZAR',
      peRatio:11.3, dividendYield:4.1, ytdReturn:6.5, marketCapUSD:1_050_000, volatility:'Modérée',
      mainSectors:['Mines (Anglo, Naspers)','Finance','Distribution','Energie'],
      description:'Plus grand marché africain (~80% des capitalisations continentales). Standard institutionnel. Exposition USD via minières.',
      source:'JSE Market Statistics 2024 ; FMI Article IV Afrique du Sud 2024',
    },
    {
      market:'GSE', country:'Ghana', indexName:'GSE Composite Index', currency:'GHS',
      peRatio:5.8, dividendYield:4.8, ytdReturn:44.1, marketCapUSD:8_200, volatility:'Élevée',
      mainSectors:['Banque','Assurance','Telecom (MTN Ghana)','Cacao'],
      description:'Marché en restructuration post-crise dette 2022. Rendements nominaux élevés mais risque inflation/change GHS très présent.',
      source:'GSE Monthly Report Oct 2024 ; FMI Ghana ECF 2023',
    },
    {
      market:'CASE', country:'Égypte', indexName:'EGX 30', currency:'EGP',
      peRatio:9.1, dividendYield:2.8, ytdReturn:58.0, marketCapUSD:45_000, volatility:'Élevée',
      mainSectors:['Banque','Immobilier','Telecom','Energie'],
      description:'Premier marché d\'Afrique du Nord. Forte dévaluation EGP 2023-2024. Réformes FMI en cours.',
      source:'Egyptian Exchange Fact Sheet 2024 ; FMI Egypt SBA 2024',
    },
    {
      market:'USE', country:'Ouganda', indexName:'USE All Share Index', currency:'UGX',
      peRatio:9.4, dividendYield:5.5, ytdReturn:2.1, marketCapUSD:5_800, volatility:'Faible',
      mainSectors:['Banque (Stanbic)','Telecom (MTN Uganda)','Energie'],
      description:'Petit marché stable, devenu attractif avec cross-listing NSE Kenya. Stanbic = ~60% du marché.',
      source:'USE Annual Report 2023 ; Banque Africaine de Développement',
    },
  ]
}

/**
 * OUTIL 5 — TABLEAU DE BORD MACRO UEMOA
 * Réf : BCEAO Rapport annuel 2023, UEMOA Commission Q3 2024,
 *       FMI WEO Oct 2024, GSMA Mobile Money 2024
 * Route : GET /market/brvm/tools/macro
 *         GET /market/macro/uemoa
 */

export interface UEMOAMacroIndicator {
  name:         string
  value:        number
  unit:         string
  previousYear: number
  trend:        'hausse' | 'baisse' | 'stable'
  impact:       'positif' | 'négatif' | 'neutre'
  description:  string
  source:       string
}

export interface UEMOAMacroDashboard {
  lastUpdated:    string
  bceaoRate:      number
  inflation:      number
  gdpGrowth:      number
  indicators:     UEMOAMacroIndicator[]
  commodityLinks: { commodity: string; price: string; relevance: string }[]
  risks:          { label: string; level: 'Faible' | 'Modéré' | 'Élevé'; description: string }[]
}

export function getUEMOAMacroDashboard(): UEMOAMacroDashboard {
  return {
    lastUpdated: '2024-11',
    bceaoRate:   3.50,
    inflation:   3.8,
    gdpGrowth:   6.1,
    indicators: [
      { name:'Taux directeur BCEAO', value:3.50, unit:'%', previousYear:3.00, trend:'hausse', impact:'négatif',
        description:'Hausse de 50 pb en 2023 pour contrer l\'inflation. Impact négatif sur crédits bancaires et marges des émetteurs.',
        source:'BCEAO, Communiqué Comité de Politique Monétaire nov 2023' },
      { name:'Inflation UEMOA', value:3.8, unit:'%', previousYear:7.2, trend:'baisse', impact:'positif',
        description:'Reflux depuis le pic 2022-2023. Pression sur les marges de distribution (TTLC, SHEC) en voie de normalisation.',
        source:'BCEAO Bulletin Mensuel de Statistiques oct 2024' },
      { name:'Croissance PIB UEMOA', value:6.1, unit:'%', previousYear:5.8, trend:'hausse', impact:'positif',
        description:'Solide résilience portée par le Sénégal (+10,1% avec pétrole offshore), la CI (+6,7%) et le Bénin (+6,4%). Favorable aux bancaires et télécoms.',
        source:'FMI World Economic Outlook oct 2024' },
      { name:'Croissance du crédit à l\'économie', value:8.2, unit:'%', previousYear:11.5, trend:'baisse', impact:'négatif',
        description:'Ralentissement du crédit après la hausse des taux. Signifie des NBI bancaires sous pression à court terme (ETIT, SGBC, BOABF).',
        source:'BCEAO Bulletin Mensuel oct 2024' },
      { name:'Pénétration mobile money', value:51, unit:'%', previousYear:47, trend:'hausse', impact:'positif',
        description:'Plus de la moitié de la population adulte utilisatrice. Moteur de croissance de SONATEL (Orange Money), ONTBF (Moov Money). GSMA projette 65% en 2027.',
        source:'GSMA State of the Industry Report on Mobile Money 2024' },
      { name:'Réserves de change (mois d\'importation)', value:5.8, unit:'mois', previousYear:6.1, trend:'baisse', impact:'neutre',
        description:'Au-dessus du seuil minimal UEMOA (3 mois). Pas de risque de convertibilité à court terme. Parité XOF/EUR garantie par France/BCE.',
        source:'BCEAO Rapport Annuel 2023' },
      { name:'Dette publique UEMOA / PIB', value:56.3, unit:'% PIB', previousYear:54.8, trend:'hausse', impact:'négatif',
        description:'Dépassement du critère de convergence UEMOA (70% plafond). Espace fiscal réduit. Risque sur titres d\'État TPCI/TPSE (portefeuilles bancaires).',
        source:'UEMOA Commission, Rapport Surveillance Multilatérale T3 2024' },
      { name:'Taux de bancarisation UEMOA', value:22.5, unit:'% population', previousYear:19.8, trend:'hausse', impact:'positif',
        description:'Marge de croissance bancaire considérable. Potentiel fort pour ETIT, SGBC, BOABF, BICC. Mobile banking facteur d\'accélération.',
        source:'BCEAO Rapport Inclusion Financière 2023' },
      { name:'Production cacao Côte d\'Ivoire', value:2_200, unit:'kt', previousYear:2_400, trend:'baisse', impact:'neutre',
        description:'Recul de ~8% dû aux maladies (swollen shoot) et sécheresse. Impact négatif sur SICC mais positif sur prix (faveur à SOGC).',
        source:'Conseil Café-Cacao CI, rapport campagne 2023-2024' },
      { name:'Investissements Directs Étrangers UEMOA', value:4.8, unit:'Mds USD', previousYear:4.2, trend:'hausse', impact:'positif',
        description:'Hausse portée par le pétrole sénégalais (BP, Woodside) et l\'énergie au BF, CI. Soutien indirect à l\'activité boursière.',
        source:'CNUCED World Investment Report 2024' },
    ],
    commodityLinks: [
      { commodity:'Cacao',            price:'~9,500 USD/tonne', relevance:'SICC, SOGC — prix au plus haut depuis 40 ans (mai 2024)' },
      { commodity:'Huile de palme',   price:'~900 USD/tonne',   relevance:'PALC, SAPH, SOGB — prix modéré' },
      { commodity:'Caoutchouc naturel', price:'~1.60 USD/kg',   relevance:'SAPH — pression sur marges (-12% vs 2022)' },
      { commodity:'Brent Crude',      price:'~75-80 USD/bbl',   relevance:'TTLC, TTLS, SHEC — volumes stables, marges réduites' },
      { commodity:'Coton',            price:'~80 cts USD/lb',   relevance:'Burkina Faso, Mali — pas de coté direct sur BRVM' },
      { commodity:'Or',               price:'~2,650 USD/oz',    relevance:'Proxy macro — corrélation inverse avec risque UEMOA' },
    ],
    risks: [
      { label:'Risque géopolitique Sahel', level:'Élevé',
        description:'Instabilité politique au Mali, Burkina Faso, Niger (juntes militaires). Impact sur BOAM, BOAN, BNBC, NTAB.' },
      { label:'Risque de change EUR/USD', level:'Modéré',
        description:'Le XOF est indexé à l\'EUR. Une baisse EUR/USD érode la compétitivité des exportations de la zone.' },
      { label:'Risque souverain dette', level:'Modéré',
        description:'Hausse des spreads sur les Eurobonds UEMOA. Impact sur les bancaires exposés aux titres d\'État.' },
      { label:'Risque climatique', level:'Modéré',
        description:'Sécheresses et El Niño affectent productions agricoles. Risque sur PALC, SAPH, SICC.' },
      { label:'Risque liquidité marché', level:'Élevé',
        description:'Volumes journaliers faibles. Sortie institutionnelle peut déclencher forte baisse sans acheteur.' },
    ],
  }
}

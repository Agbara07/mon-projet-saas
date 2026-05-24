/**
 * OUTIL 6 — ANALYSEUR DE GOUVERNANCE BRVM
 * Réf : Altman, Hartzell & Peck (1995), rapports annuels BRVM
 * Route : GET /market/brvm/tools/governance
 *         GET /market/brvm/:symbol/governance  (à implémenter si besoin)
 */
import { BRVM_COMPANIES } from './brvm.provider'

export interface BRVMGovernanceScore {
  symbol:            string
  name:              string
  totalScore:        number
  auditScore:        number
  transparencyScore: number
  dividendScore:     number
  parentScore:       number
  auditor?:          string
  parentCompany?:    string
  floatPct?:         number
  riskLevel:         'Faible' | 'Modéré' | 'Élevé'
  strengths:         string[]
  warnings:          string[]
}

const GOVERNANCE_DB: Record<string, {
  auditor: string; parent?: string; floatPct: number
  yearsDiv: number; listingsCount: number; notes: string
}> = {
  'SNTS':  { auditor:'PwC + KPMG', parent:'Orange SA (France)',           floatPct:17, yearsDiv:25, listingsCount:1, notes:'Gouvernance groupe CAC40' },
  'SGBC':  { auditor:'Deloitte',   parent:'Société Générale (France)',     floatPct:26, yearsDiv:20, listingsCount:1, notes:'Standard Société Générale' },
  'ETIT':  { auditor:'PwC',        parent:'Ecobank Group (Togo)',          floatPct:95, yearsDiv:12, listingsCount:3, notes:'Cross-listed BRVM/NSE/GSE' },
  'TTLC':  { auditor:'Deloitte',   parent:'TotalEnergies SE (France)',     floatPct:20, yearsDiv:18, listingsCount:1, notes:'Gouvernance groupe SBF120' },
  'TTLS':  { auditor:'Deloitte',   parent:'TotalEnergies SE (France)',     floatPct:23, yearsDiv:16, listingsCount:1, notes:'Même standard groupe Total' },
  'SLBC':  { auditor:'KPMG',       parent:'Castel Group (France)',         floatPct:10, yearsDiv:15, listingsCount:1, notes:'Float faible' },
  'CIEC':  { auditor:'EY',         parent:'SAUR International + État CI',  floatPct:32, yearsDiv:20, listingsCount:1, notes:'Concession publique bien gérée' },
  'SIBS':  { auditor:'Deloitte',   parent:'Moroccan BANK BCP',            floatPct:25, yearsDiv:10, listingsCount:1, notes:'Adossé au groupe BCP' },
  'BOABF': { auditor:'KPMG',       parent:'BOA Group (Maroc)',             floatPct:35, yearsDiv:12, listingsCount:1, notes:'Groupe BancABC' },
  'PALC':  { auditor:'PwC',        parent:'PALMCI (filiale Sifca)',        floatPct:20, yearsDiv:14, listingsCount:1, notes:'Sifca = agri-business CI' },
  'SAPH':  { auditor:'Deloitte',   parent:'SIFCA + Michelin',             floatPct:28, yearsDiv:12, listingsCount:1, notes:'Partenariat Michelin' },
  'ORGT':  { auditor:'EY',         parent:'Oragroup (Togo)',              floatPct:45, yearsDiv:8,  listingsCount:1, notes:'Expansion rapide' },
  'ONTBF': { auditor:'KPMG',       parent:'État Burkina Faso (60%)',       floatPct:40, yearsDiv:16, listingsCount:1, notes:'Risque politique transition militaire' },
  'BICC':  { auditor:'PwC',        parent:'BNP Paribas (France)',         floatPct:30, yearsDiv:18, listingsCount:1, notes:'Standard BNP Paribas' },
  'ECOC':  { auditor:'Deloitte',   parent:'Ecobank Group',                floatPct:38, yearsDiv:8,  listingsCount:1, notes:'Filiale locale Ecobank' },
  'UNXC':  { auditor:'KPMG',       parent:'Unilever PLC (UK/NL)',         floatPct:15, yearsDiv:20, listingsCount:1, notes:'Gouvernance FTSE100' },
  'NSIA':  { auditor:'EY',         parent:'NSIA Groupe (CI)',             floatPct:30, yearsDiv:6,  listingsCount:1, notes:'Groupe régional assurance/banque' },
}

const BIG4 = ['PwC', 'Deloitte', 'KPMG', 'EY', 'Ernst & Young']

export function computeGovernanceScore(symbol: string): BRVMGovernanceScore {
  const db   = GOVERNANCE_DB[symbol]
  const info = BRVM_COMPANIES[symbol] ?? { name: symbol, sector: 'Autre', country: 'UEMOA' }

  if (!db) {
    return {
      symbol, name: info.name,
      totalScore:35, auditScore:10, transparencyScore:10, dividendScore:10, parentScore:5,
      riskLevel:'Élevé', strengths:[],
      warnings:['Données de gouvernance non disponibles', 'Audit et actionnariat non documentés'],
    }
  }

  const auditScore       = BIG4.some(b => db.auditor.includes(b)) ? 25 : 12
  const floatScore       = db.floatPct >= 30 ? 15 : db.floatPct >= 20 ? 10 : 5
  const crossScore       = db.listingsCount >= 3 ? 10 : db.listingsCount === 2 ? 5 : 0
  const transparencyScore = Math.min(25, floatScore + crossScore)
  const dividendScore    = db.yearsDiv >= 20 ? 25 : db.yearsDiv >= 10 ? 20 : db.yearsDiv >= 5 ? 15 : db.yearsDiv >= 3 ? 8 : 0
  const hasIFRS          = db.parent && (db.parent.includes('France') || db.parent.includes('UK') || db.parent.includes('NL') || db.parent.includes('Group'))
  const hasState         = db.parent?.includes('État')
  const parentScore      = hasIFRS ? 20 : hasState ? 10 : 15
  const totalScore       = auditScore + transparencyScore + dividendScore + parentScore
  const riskLevel        = totalScore >= 70 ? 'Faible' : totalScore >= 45 ? 'Modéré' : 'Élevé'

  const strengths: string[] = []
  const warnings:  string[] = []
  if (auditScore === 25)     strengths.push(`Audité par ${db.auditor} (Big 4)`)
  if (db.yearsDiv >= 10)     strengths.push(`Dividende versé depuis ${db.yearsDiv}+ ans`)
  if (db.parent)             strengths.push(`Actionnaire de référence : ${db.parent}`)
  if (db.listingsCount >= 2) strengths.push('Cross-listing — transparence renforcée')
  if (db.floatPct < 15)      warnings.push(`Float très faible (${db.floatPct}%) — risque liquidité`)
  if (hasState)              warnings.push('Actionnariat public — risque d\'ingérence politique')
  if (db.yearsDiv < 3)       warnings.push('Historique dividende court (<3 ans)')

  return {
    symbol, name: info.name,
    totalScore, auditScore, transparencyScore, dividendScore, parentScore,
    auditor:      db.auditor,
    parentCompany: db.parent,
    floatPct:     db.floatPct,
    riskLevel, strengths, warnings,
  }
}

export function getAllGovernanceScores(): BRVMGovernanceScore[] {
  return Object.keys(BRVM_COMPANIES)
    .map(sym => computeGovernanceScore(sym))
    .sort((a, b) => b.totalScore - a.totalScore)
}

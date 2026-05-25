import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Politique de Confidentialité — InvestSaaS',
  description: "Politique de confidentialité d'InvestSaaS conforme au RGPD et à la Loi ivoirienne n°2013-450 sur la protection des données personnelles.",
}

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-3xl mx-auto">

        <div className="mb-8">
          <Link href="/" className="text-blue-600 dark:text-blue-400 text-sm hover:underline">
            ← Retour à l&apos;accueil
          </Link>
        </div>

        <article className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 prose prose-sm dark:prose-invert max-w-none">

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Politique de Confidentialité
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Version 1.0 — En vigueur à compter du 1er juin 2026
          </p>
          <div className="not-prose mb-8">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                Conforme Loi ivoirienne n°2013-450
              </span>
              <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
                Conforme RGPD (UE) 2016/679
              </span>
              <span className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium">
                ARTCI — Autorité de Régulation CI
              </span>
            </div>
          </div>

          {/* ARTICLE 1 */}
          <h2>Article 1 — Identité du Responsable de Traitement</h2>
          <p>
            Le responsable du traitement des données personnelles collectées via la Plateforme
            InvestSaaS est :
          </p>
          <div className="not-prose bg-gray-50 dark:bg-gray-800 rounded-lg p-4 my-3 text-sm">
            <p><strong>AGBARA CONSORTIUM SARL</strong></p>
            <p>RCCM : CI-ABJ-03-2025-B13-01915</p>
            <p>Siège social : Abidjan, Côte d&apos;Ivoire</p>
            <p>Email DPO :{' '}
              <a href="mailto:privacy@investsaas.com"
                className="text-blue-600 dark:text-blue-400 hover:underline">
                privacy@investsaas.com
              </a>
            </p>
          </div>

          {/* ARTICLE 2 */}
          <h2>Article 2 — Cadre légal applicable</h2>
          <p>
            La présente Politique est établie en conformité avec :
          </p>
          <ul>
            <li>
              La <strong>Loi ivoirienne n°2013-450 du 19 juin 2013</strong> relative à la
              protection des données à caractère personnel, et ses décrets d&apos;application ;
            </li>
            <li>
              Le <strong>Règlement Général sur la Protection des Données (RGPD)</strong> —
              Règlement UE 2016/679 du 27 avril 2016, applicable dès lors que des utilisateurs
              résidant dans l&apos;Union Européenne accèdent à la Plateforme ;
            </li>
            <li>
              Les directives de l&apos;<strong>ARTCI</strong> (Autorité de Régulation des
              Télécommunications et des TIC de Côte d&apos;Ivoire) en matière de traitement
              de données personnelles.
            </li>
          </ul>

          {/* ARTICLE 3 */}
          <h2>Article 3 — Données collectées</h2>

          <h3>3.1 Données fournies directement par l&apos;utilisateur</h3>
          <div className="not-prose overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="text-left p-2 border border-gray-200 dark:border-gray-700">Donnée</th>
                  <th className="text-left p-2 border border-gray-200 dark:border-gray-700">Finalité</th>
                  <th className="text-left p-2 border border-gray-200 dark:border-gray-700">Base légale</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Adresse email</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Création de compte, authentification, notifications</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Exécution du contrat</td>
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Nom / Prénom</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Personnalisation, facturation</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Exécution du contrat</td>
                </tr>
                <tr>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Mot de passe (haché bcrypt)</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Authentification sécurisée</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Exécution du contrat</td>
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Données de paiement</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Traitement des abonnements</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Exécution du contrat (Stripe)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>3.2 Données générées par l&apos;utilisation</h3>
          <div className="not-prose overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="text-left p-2 border border-gray-200 dark:border-gray-700">Donnée</th>
                  <th className="text-left p-2 border border-gray-200 dark:border-gray-700">Finalité</th>
                  <th className="text-left p-2 border border-gray-200 dark:border-gray-700">Base légale</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Portefeuilles et transactions</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Fonctionnalité portfolio tracker</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Exécution du contrat</td>
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Watchlist et alertes</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Fonctionnalité suivi de marché</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Exécution du contrat</td>
                </tr>
                <tr>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Logs de connexion (IP, date, heure)</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Sécurité, détection de fraude</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Intérêt légitime</td>
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Tokens JWT</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Authentification et sessions</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Exécution du contrat</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ARTICLE 4 */}
          <h2>Article 4 — Durée de conservation</h2>
          <div className="not-prose overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="text-left p-2 border border-gray-200 dark:border-gray-700">Catégorie</th>
                  <th className="text-left p-2 border border-gray-200 dark:border-gray-700">Durée de conservation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Données de compte actif</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Durée de la relation contractuelle</td>
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Données après résiliation</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">30 jours puis suppression définitive</td>
                </tr>
                <tr>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Données de facturation</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">10 ans (obligation comptable SYSCOHADA)</td>
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Logs de connexion</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">12 mois</td>
                </tr>
                <tr>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Tokens JWT (refresh)</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">7 jours (expiration automatique)</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ARTICLE 5 */}
          <h2>Article 5 — Droits des utilisateurs</h2>
          <p>
            Conformément à la Loi ivoirienne n°2013-450 et au RGPD, tout utilisateur dispose
            des droits suivants concernant ses données personnelles :
          </p>
          <ul>
            <li><strong>Droit d&apos;accès</strong> : obtenir une copie des données personnelles détenues ;</li>
            <li><strong>Droit de rectification</strong> : corriger des données inexactes ou incomplètes ;</li>
            <li><strong>Droit à l&apos;effacement</strong> : demander la suppression des données («&nbsp;droit à l&apos;oubli&nbsp;») ;</li>
            <li><strong>Droit d&apos;opposition</strong> : s&apos;opposer à certains traitements fondés sur l&apos;intérêt légitime ;</li>
            <li><strong>Droit à la portabilité</strong> : recevoir ses données dans un format structuré (RGPD) ;</li>
            <li><strong>Droit de limitation</strong> : demander la suspension temporaire d&apos;un traitement.</li>
          </ul>
          <p>
            Pour exercer ces droits, adressez votre demande à :{' '}
            <a href="mailto:privacy@investsaas.com"
              className="text-blue-600 dark:text-blue-400 hover:underline">
              privacy@investsaas.com
            </a>.
            La Société s&apos;engage à répondre dans un délai de <strong>30 jours</strong>.
          </p>
          <p>
            Les utilisateurs résidant en Côte d&apos;Ivoire peuvent également saisir l&apos;
            <strong>ARTCI</strong> (Autorité de Régulation des Télécommunications et des TIC
            de Côte d&apos;Ivoire) en cas de litige relatif au traitement de leurs données.
            Les utilisateurs résidant dans l&apos;Union Européenne peuvent saisir leur autorité
            nationale de protection des données.
          </p>

          {/* ARTICLE 6 */}
          <h2>Article 6 — Partage des données avec des tiers</h2>
          <p>
            La Société ne vend, ne loue et ne cède pas les données personnelles des utilisateurs
            à des tiers à des fins commerciales. Les données peuvent être partagées avec les
            sous-traitants suivants, dans le strict cadre de l&apos;exécution du service :
          </p>
          <div className="not-prose overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="text-left p-2 border border-gray-200 dark:border-gray-700">Sous-traitant</th>
                  <th className="text-left p-2 border border-gray-200 dark:border-gray-700">Rôle</th>
                  <th className="text-left p-2 border border-gray-200 dark:border-gray-700">Pays</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Railway</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Hébergement backend et base de données</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">États-Unis</td>
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Vercel</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Hébergement frontend</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">États-Unis</td>
                </tr>
                <tr>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Stripe</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">Traitement des paiements</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">États-Unis / Irlande</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Ces sous-traitants sont soumis à des obligations contractuelles de confidentialité
            et de sécurité conformes aux standards internationaux (SOC 2, ISO 27001).
          </p>

          {/* ARTICLE 7 */}
          <h2>Article 7 — Transferts internationaux de données</h2>
          <p>
            Les données personnelles des utilisateurs sont hébergées sur des serveurs situés
            aux États-Unis (Railway, Vercel, Stripe). Ces transferts sont encadrés par les
            clauses contractuelles types de la Commission Européenne et les garanties
            contractuelles de chaque prestataire.
          </p>
          <p>
            Conformément à la Loi ivoirienne n°2013-450, tout transfert de données vers un pays
            tiers est soumis à l&apos;existence de garanties adéquates de protection.
          </p>

          {/* ARTICLE 8 */}
          <h2>Article 8 — Sécurité des données</h2>
          <p>La Société met en œuvre les mesures techniques et organisationnelles suivantes :</p>
          <ul>
            <li>Chiffrement des mots de passe par algorithme bcrypt (facteur de coût adapté) ;</li>
            <li>Authentification par tokens JWT (access token 15 min / refresh token 7 jours) ;</li>
            <li>Communications chiffrées en HTTPS/TLS ;</li>
            <li>Rate limiting et protection contre les attaques par force brute ;</li>
            <li>Revue automatique de sécurité du code via GitHub Actions (Claude Code Security Review) ;</li>
            <li>Accès à la base de données limité aux services applicatifs autorisés.</li>
          </ul>

          {/* ARTICLE 9 */}
          <h2>Article 9 — Cookies et traceurs</h2>
          <p>
            La Plateforme utilise uniquement des cookies strictement nécessaires au fonctionnement
            du service (tokens d&apos;authentification, préférences d&apos;interface). Aucun cookie
            publicitaire ou de traçage tiers n&apos;est utilisé.
          </p>

          {/* ARTICLE 10 */}
          <h2>Article 10 — Mineurs</h2>
          <p>
            La Plateforme est réservée aux personnes majeures (18 ans et plus). La Société ne
            collecte pas sciemment de données relatives à des mineurs. Tout compte créé par un
            mineur sera supprimé dès que la Société en sera informée.
          </p>

          {/* ARTICLE 11 */}
          <h2>Article 11 — Modification de la Politique</h2>
          <p>
            La présente Politique peut être modifiée à tout moment. Les utilisateurs seront
            informés par email de toute modification substantielle avec un préavis de 15 jours.
            La version en vigueur est toujours accessible à l&apos;adresse{' '}
            <Link href="/politique-confidentialite"
              className="text-blue-600 dark:text-blue-400 hover:underline">
              /politique-confidentialite
            </Link>.
          </p>

          {/* ARTICLE 12 */}
          <h2>Article 12 — Contact et réclamations</h2>
          <p>
            Pour toute question relative à la protection de vos données personnelles :
          </p>
          <div className="not-prose bg-gray-50 dark:bg-gray-800 rounded-lg p-4 my-3 text-sm">
            <p><strong>Délégué à la Protection des Données (DPO)</strong></p>
            <p>AGBARA CONSORTIUM SARL</p>
            <p>Abidjan, Côte d&apos;Ivoire</p>
            <p>Email :{' '}
              <a href="mailto:privacy@investsaas.com"
                className="text-blue-600 dark:text-blue-400 hover:underline">
                privacy@investsaas.com
              </a>
            </p>
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              <strong>Autorité de contrôle (Côte d&apos;Ivoire) :</strong><br />
              ARTCI — Autorité de Régulation des Télécommunications et des TIC de Côte d&apos;Ivoire<br />
              <a href="https://www.artci.ci" target="_blank" rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline">
                www.artci.ci
              </a>
            </p>
          </div>

          <hr className="my-6 border-gray-200 dark:border-gray-700" />
          <p className="text-xs text-gray-400 text-center">
            Politique de Confidentialité InvestSaaS v1.0 — Conforme Loi ivoirienne n°2013-450 et RGPD UE 2016/679
          </p>

        </article>
      </div>
    </div>
  )
}

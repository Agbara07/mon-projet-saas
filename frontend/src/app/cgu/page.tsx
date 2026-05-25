import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — InvestSaaS",
  description: "CGU d'InvestSaaS — plateforme d'information financière conforme à la réglementation AMF-UMOA, CREPMF et au droit ivoirien.",
}

export default function CGUPage() {
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
            Conditions Générales d&apos;Utilisation
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Version 1.0 — En vigueur à compter du 1er juin 2026
          </p>

          <h2>Article 1 — Objet et champ d&apos;application</h2>
          <p>
            Les présentes Conditions Générales d&apos;Utilisation (ci-après «&nbsp;CGU&nbsp;») régissent
            l&apos;accès et l&apos;utilisation de la plateforme <strong>InvestSaaS</strong>, éditée par
            <strong> AGBARA CONSORTIUM SARL</strong>, société à responsabilité limitée immatriculée
            au Registre du Commerce et du Crédit Mobilier de Côte d&apos;Ivoire sous le numéro
            <strong> CI-ABJ-03-2025-B13-01915</strong>, dont le siège social est situé à Abidjan,
            Côte d&apos;Ivoire (ci-après «&nbsp;la Société&nbsp;»).
          </p>
          <p>
            L&apos;accès à la Plateforme vaut acceptation pleine et entière des présentes CGU.
            Toute personne qui n&apos;accepte pas les CGU doit cesser immédiatement d&apos;utiliser
            la Plateforme.
          </p>

          <h2>Article 2 — Description du service</h2>
          <p>
            InvestSaaS est une plateforme numérique d&apos;agrégation et de visualisation
            d&apos;informations financières couvrant les marchés boursiers mondiaux, incluant les
            marchés nord-américains (NYSE, NASDAQ), européens, canadiens (TSX) et la Bourse
            Régionale des Valeurs Mobilières (BRVM) de l&apos;UEMOA.
          </p>
          <p>La Plateforme propose notamment :</p>
          <ul>
            <li>L&apos;affichage de cours boursiers et d&apos;indicateurs de marché issus de fournisseurs tiers ;</li>
            <li>Des outils de suivi de portefeuille à titre personnel et indicatif ;</li>
            <li>Des outils de screener et de recherche de valeurs mobilières ;</li>
            <li>Des informations macroéconomiques et des actualités financières ;</li>
            <li>Des alertes de cours configurées par l&apos;utilisateur.</li>
          </ul>

          <h2>Article 3 — Nature des informations — Absence de conseil en investissement</h2>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 my-4 not-prose">
            <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm mb-2">
              ⚠️ MENTION LÉGALE OBLIGATOIRE — AMF-UMOA / CREPMF
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
              <strong>Les informations, données, analyses, graphiques et indicateurs techniques
              disponibles sur la Plateforme sont fournis à titre exclusivement éducatif et
              informatif.</strong> Ils ne constituent en aucun cas un conseil en investissement
              personnalisé, une recommandation d&apos;achat ou de vente de valeurs mobilières, ni
              une offre de services d&apos;investissement au sens des réglementations de
              l&apos;Autorité des Marchés Financiers de l&apos;UMOA (AMF-UMOA) et du Conseil
              Régional de l&apos;Épargne Publique et des Marchés Financiers (CREPMF).
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
              <strong>AGBARA CONSORTIUM SARL n&apos;est pas agréée en qualité de Société de
              Gestion et d&apos;Intermédiation (SGI) par l&apos;AMF-UMOA</strong> et n&apos;est
              pas habilitée à fournir des services de conseil en investissement au sens de la
              réglementation UEMOA.
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Toute décision d&apos;investissement prise sur la base des informations disponibles
              sur la Plateforme relève de la seule et entière responsabilité de l&apos;utilisateur.
            </p>
          </div>

          <h2>Article 4 — Sources de données et limitations</h2>

          <h3>4.1 Données des marchés internationaux</h3>
          <p>
            Les données relatives aux marchés boursiers internationaux sont fournies par des
            prestataires tiers spécialisés, notamment Finnhub, Twelve Data, Polygon.io, EODHD,
            Alpha Vantage, Marketstack, MarketData.app, IEX Cloud, Benzinga, TMX Group, ETF
            Global et Financial Modeling Prep. La Société ne garantit pas l&apos;exactitude,
            l&apos;exhaustivité ou la disponibilité en temps réel des données fournies.
          </p>

          <h3>4.2 Données BRVM / UEMOA</h3>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 my-3 not-prose">
            <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
              <strong>Les données relatives à la BRVM affichées sur la Plateforme sont issues
              de sources publiques non officielles</strong> et peuvent présenter des délais,
              des inexactitudes ou des lacunes. Elles ne sont pas fournies dans le cadre d&apos;un
              accord officiel avec la BRVM ou le CREPMF.
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Pour les données officielles, consultez{' '}
              <a href="https://www.brvm.org" target="_blank" rel="noopener noreferrer"
                className="underline">www.brvm.org</a>{' '}
              ou un prestataire agréé AMF-UMOA.
            </p>
          </div>

          <h3>4.3 Indicateurs techniques</h3>
          <p>
            Les indicateurs techniques (RSI, MACD, moyennes mobiles, Bandes de Bollinger) sont
            calculés algorithmiquement à partir des données historiques disponibles. Leur exactitude
            dépend de la qualité et de la complétude des données sources. Ils ne constituent pas
            des signaux d&apos;achat ou de vente.
          </p>

          <h2>Article 5 — Inscription et compte utilisateur</h2>
          <p>
            L&apos;accès aux fonctionnalités de la Plateforme nécessite la création d&apos;un compte
            utilisateur. L&apos;utilisateur s&apos;engage à fournir des informations exactes et à maintenir
            la confidentialité de ses identifiants. Toute utilisation suspecte doit être signalée
            immédiatement à <strong>contact@investsaas.com</strong>.
          </p>

          <h2>Article 6 — Plans tarifaires et facturation</h2>
          <p>
            La Plateforme propose plusieurs plans d&apos;abonnement (FREE, STARTER, PRO, ADVISOR)
            détaillés sur la page Abonnement. Les paiements sont traités par Stripe. La Société
            se réserve le droit de modifier ses tarifs avec un préavis de 30 jours par email.
          </p>

          <h2>Article 7 — Obligations de l&apos;utilisateur</h2>
          <p>L&apos;utilisateur s&apos;engage à :</p>
          <ul>
            <li>Utiliser la Plateforme conformément aux présentes CGU et à la réglementation applicable ;</li>
            <li>Ne pas reproduire, redistribuer ou commercialiser les données affichées ;</li>
            <li>Ne pas tenter de contourner les mesures de sécurité de la Plateforme ;</li>
            <li>Ne pas utiliser la Plateforme à des fins illicites ou contraires à l&apos;ordre public.</li>
          </ul>

          <h2>Article 8 — Limitation de responsabilité</h2>
          <p>
            Dans les limites permises par le droit applicable, la Société ne saurait être tenue
            responsable des dommages résultant de l&apos;inexactitude des données, des décisions
            d&apos;investissement prises sur la base des informations de la Plateforme, ou des
            interruptions de service dues à des tiers.
          </p>

          <h2>Article 9 — Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble des éléments constitutifs de la Plateforme est la propriété exclusive
            d&apos;AGBARA CONSORTIUM SARL ou de ses partenaires et est protégé par les lois ivoiriennes
            et internationales sur la propriété intellectuelle.
          </p>

          <h2>Article 10 — Résiliation</h2>
          <p>
            La Société se réserve le droit de suspendre ou de résilier l&apos;accès d&apos;un utilisateur
            en cas de violation des présentes CGU. L&apos;utilisateur peut résilier son compte à tout
            moment depuis la page Paramètres. Les données sont supprimées sous 30 jours.
          </p>

          <h2>Article 11 — Droit applicable et juridiction</h2>
          <p>
            Les présentes CGU sont régies par le <strong>droit ivoirien</strong>. En cas de litige,
            les parties rechercheront une solution amiable. À défaut, le litige sera soumis à la
            compétence exclusive des <strong>tribunaux d&apos;Abidjan, Côte d&apos;Ivoire</strong>.
          </p>

          <h2>Article 12 — Modification des CGU</h2>
          <p>
            La Société peut modifier les présentes CGU à tout moment avec un préavis de 15 jours
            par email. La poursuite de l&apos;utilisation de la Plateforme vaut acceptation des
            nouvelles CGU.
          </p>

          <h2>Article 13 — Contact</h2>
          <p>
            <strong>AGBARA CONSORTIUM SARL</strong><br />
            Abidjan, Côte d&apos;Ivoire — RCCM : CI-ABJ-03-2025-B13-01915<br />
            Email :{' '}
            <a href="mailto:contact@investsaas.com"
              className="text-blue-600 dark:text-blue-400 hover:underline">
              contact@investsaas.com
            </a>
          </p>

          <hr className="my-6 border-gray-200 dark:border-gray-700" />
          <p className="text-xs text-gray-400 text-center">
            CGU InvestSaaS v1.0 — Droit applicable : droit ivoirien — Juridiction : Abidjan, Côte d&apos;Ivoire
          </p>

        </article>
      </div>
    </div>
  )
}

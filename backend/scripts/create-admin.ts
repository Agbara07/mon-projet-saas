/**
 * Crée (ou met à jour) le compte admin principal.
 * Usage : npx ts-node scripts/create-admin.ts <mot_de_passe>
 */
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const password = process.argv[2]
  if (!password || password.length < 8) {
    console.error('❌ Fournir un mot de passe d\'au moins 8 caractères : npx ts-node scripts/create-admin.ts <mot_de_passe>')
    process.exit(1)
  }

  const EMAIL    = 'cherifdinne07@gmail.com'
  const ORG_NAME = 'InvestSaaS Admin'
  const ORG_SLUG = 'investsaas-admin'

  const hashed = await bcrypt.hash(password, 12)

  // Vérifier si l'utilisateur existe déjà
  const existing = await prisma.user.findUnique({ where: { email: EMAIL }, include: { organization: true } })

  if (existing) {
    // Mettre à jour : role OWNER + plan ENTERPRISE + emailVerified
    await prisma.user.update({
      where: { email: EMAIL },
      data: { password: hashed, role: 'OWNER', emailVerified: true },
    })
    await prisma.organization.update({
      where: { id: existing.organizationId },
      data: { plan: 'ENTERPRISE', trialEndsAt: null },
    })
    // S'assurer que la subscription est ACTIVE
    await prisma.subscription.upsert({
      where: { organizationId: existing.organizationId },
      create: { organizationId: existing.organizationId, status: 'ACTIVE' },
      update: { status: 'ACTIVE', canceledAt: null },
    })
    console.log(`✅ Compte mis à jour : ${EMAIL} — OWNER / ENTERPRISE`)
  } else {
    // Créer org + user + subscription
    const org = await prisma.organization.create({
      data: {
        name: ORG_NAME,
        slug: ORG_SLUG,
        plan: 'ENTERPRISE',
        trialEndsAt: null,
        users: {
          create: {
            email: EMAIL,
            password: hashed,
            name: 'Cherif Admin',
            role: 'OWNER',
            emailVerified: true,
          },
        },
      },
    })
    await prisma.subscription.create({
      data: { organizationId: org.id, status: 'ACTIVE' },
    })
    console.log(`✅ Compte admin créé : ${EMAIL} — OWNER / ENTERPRISE`)
  }

  console.log('   Email    :', EMAIL)
  console.log('   Rôle     : OWNER')
  console.log('   Plan     : ENTERPRISE (accès total)')
  console.log('   Vérifié  : oui')
}

main()
  .catch(e => { console.error('❌', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())

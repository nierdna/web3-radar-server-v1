const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanDatabase() {
  try {
    console.log('🧹 Starting database cleanup...')
    
    // Xóa theo thứ tự để tránh foreign key constraint
    await prisma.audit.deleteMany()
    console.log('✅ Deleted all audits')
    
    await prisma.roadmapItem.deleteMany()
    console.log('✅ Deleted all roadmap items')
    
    await prisma.preMarketPricing.deleteMany()
    console.log('✅ Deleted all pre-market pricing')
    
    await prisma.teamMember.deleteMany()
    console.log('✅ Deleted all team members')
    
    await prisma.communityMetrics.deleteMany()
    console.log('✅ Deleted all community metrics')
    
    await prisma.socials.deleteMany()
    console.log('✅ Deleted all socials')
    
    await prisma.fundingRound.deleteMany()
    console.log('✅ Deleted all funding rounds')
    
    await prisma.tokenAllocation.deleteMany()
    console.log('✅ Deleted all token allocations')
    
    await prisma.fundraising.deleteMany()
    console.log('✅ Deleted all fundraising')
    
    await prisma.tgeInfo.deleteMany()
    console.log('✅ Deleted all TGE info')
    
    await prisma.tokenomic.deleteMany()
    console.log('✅ Deleted all tokenomics')
    
    await prisma.web3Project.deleteMany()
    console.log('✅ Deleted all web3 projects')
    
    await prisma.user.deleteMany()
    console.log('✅ Deleted all users')
    
    console.log('🎉 Database cleanup completed successfully!')
    
  } catch (error) {
    console.error('❌ Error cleaning database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

cleanDatabase()

/**
 * OMNI-CRM Database Seed Script
 * Populates the database with demo data
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/security';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ============================================
  // 1. CREATE PERMISSIONS
  // ============================================
  console.log('Creating permissions...');
  
  const permissions = await Promise.all([
    // Tasks
    prisma.permission.upsert({ where: { name: 'tasks.create' }, update: {}, create: { name: 'tasks.create', module: 'tasks', action: 'create', description: 'Create tasks' } }),
    prisma.permission.upsert({ where: { name: 'tasks.read' }, update: {}, create: { name: 'tasks.read', module: 'tasks', action: 'read', description: 'View tasks' } }),
    prisma.permission.upsert({ where: { name: 'tasks.update' }, update: {}, create: { name: 'tasks.update', module: 'tasks', action: 'update', description: 'Update tasks' } }),
    prisma.permission.upsert({ where: { name: 'tasks.delete' }, update: {}, create: { name: 'tasks.delete', module: 'tasks', action: 'delete', description: 'Delete tasks' } }),
    
    // Transactions
    prisma.permission.upsert({ where: { name: 'transactions.create' }, update: {}, create: { name: 'transactions.create', module: 'transactions', action: 'create', description: 'Create transactions' } }),
    prisma.permission.upsert({ where: { name: 'transactions.read' }, update: {}, create: { name: 'transactions.read', module: 'transactions', action: 'read', description: 'View transactions' } }),
    prisma.permission.upsert({ where: { name: 'transactions.approve' }, update: {}, create: { name: 'transactions.approve', module: 'transactions', action: 'approve', description: 'Approve transactions' } }),
    
    // Clients
    prisma.permission.upsert({ where: { name: 'clients.read' }, update: {}, create: { name: 'clients.read', module: 'clients', action: 'read', description: 'View clients' } }),
    prisma.permission.upsert({ where: { name: 'clients.update' }, update: {}, create: { name: 'clients.update', module: 'clients', action: 'update', description: 'Update clients' } }),
    
    // KYC
    prisma.permission.upsert({ where: { name: 'kyc.read' }, update: {}, create: { name: 'kyc.read', module: 'kyc', action: 'read', description: 'View KYC documents' } }),
    prisma.permission.upsert({ where: { name: 'kyc.approve' }, update: {}, create: { name: 'kyc.approve', module: 'kyc', action: 'approve', description: 'Approve KYC documents' } }),
    
    // IB
    prisma.permission.upsert({ where: { name: 'ib.read' }, update: {}, create: { name: 'ib.read', module: 'ib', action: 'read', description: 'View IB profiles' } }),
    prisma.permission.upsert({ where: { name: 'ib.manage' }, update: {}, create: { name: 'ib.manage', module: 'ib', action: 'manage', description: 'Manage IB profiles' } }),
    
    // Settings
    prisma.permission.upsert({ where: { name: 'settings.read' }, update: {}, create: { name: 'settings.read', module: 'settings', action: 'read', description: 'View settings' } }),
    prisma.permission.upsert({ where: { name: 'settings.update' }, update: {}, create: { name: 'settings.update', module: 'settings', action: 'update', description: 'Update settings' } }),
  ]);

  // ============================================
  // 2. CREATE ROLES
  // ============================================
  console.log('Creating roles...');

  const superAdminRole = await prisma.role.upsert({
    where: { name: 'super_admin' },
    update: {},
    create: {
      name: 'super_admin',
      displayName: 'Super Admin',
      description: 'Full system access',
      level: 100,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      displayName: 'Administrator',
      description: 'Administrative access',
      level: 80,
    },
  });

  const financeRole = await prisma.role.upsert({
    where: { name: 'finance_manager' },
    update: {},
    create: {
      name: 'finance_manager',
      displayName: 'Finance Manager',
      description: 'Financial operations access',
      level: 60,
    },
  });

  const supportRole = await prisma.role.upsert({
    where: { name: 'support' },
    update: {},
    create: {
      name: 'support',
      displayName: 'Support Agent',
      description: 'Customer support access',
      level: 40,
    },
  });

  const salesRole = await prisma.role.upsert({
    where: { name: 'sales' },
    update: {},
    create: {
      name: 'sales',
      displayName: 'Sales Agent',
      description: 'Sales and client management',
      level: 40,
    },
  });

  // Assign permissions to roles
  await prisma.role.update({
    where: { id: superAdminRole.id },
    data: {
      permissions: { connect: permissions.map(p => ({ id: p.id })) },
    },
  });

  // ============================================
  // 3. CREATE USERS
  // ============================================
  console.log('Creating users...');

  const hashedPassword = await hashPassword('Admin123!');

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@omnicrm.com' },
    update: {},
    create: {
      email: 'admin@omnicrm.com',
      name: 'System Administrator',
      password: hashedPassword,
      userType: 'ADMIN',
      status: 'ACTIVE',
      roleId: superAdminRole.id,
    },
  });

  const financeManager = await prisma.user.upsert({
    where: { email: 'finance@omnicrm.com' },
    update: {},
    create: {
      email: 'finance@omnicrm.com',
      name: 'John Smith',
      password: hashedPassword,
      userType: 'STAFF',
      status: 'ACTIVE',
      roleId: financeRole.id,
    },
  });

  const supportAgent = await prisma.user.upsert({
    where: { email: 'support@omnicrm.com' },
    update: {},
    create: {
      email: 'support@omnicrm.com',
      name: 'Sarah Connor',
      password: hashedPassword,
      userType: 'STAFF',
      status: 'ACTIVE',
      roleId: supportRole.id,
    },
  });

  // Demo clients
  const clients = await Promise.all([
    prisma.user.upsert({
      where: { email: 'client1@demo.com' },
      update: {},
      create: {
        email: 'client1@demo.com',
        name: 'Demo Client 1',
        password: hashedPassword,
        userType: 'CLIENT',
        status: 'ACTIVE',
      },
    }),
    prisma.user.upsert({
      where: { email: 'client2@demo.com' },
      update: {},
      create: {
        email: 'client2@demo.com',
        name: 'Demo Client 2',
        password: hashedPassword,
        userType: 'CLIENT',
        status: 'ACTIVE',
      },
    }),
  ]);

  // ============================================
  // 4. CREATE CLIENT PROFILES
  // ============================================
  console.log('Creating client profiles...');

  for (const client of clients) {
    await prisma.clientProfile.upsert({
      where: { userId: client.id },
      update: {},
      create: {
        userId: client.id,
        firstName: client.name.split(' ')[0],
        lastName: client.name.split(' ')[1] || 'Client',
        country: 'United States',
        kycStatus: 'APPROVED',
        kycLevel: 2,
        riskLevel: 'MEDIUM',
        riskScore: 45,
        bookingType: 'B_BOOK',
      },
    });
  }

  // ============================================
  // 5. CREATE WALLETS
  // ============================================
  console.log('Creating wallets...');

  for (const client of clients) {
    // Get existing wallets to avoid unique constraint error
    const existingWallets = await prisma.wallet.findMany({
      where: { userId: client.id },
    });

    if (existingWallets.length === 0) {
      await prisma.wallet.create({
        data: {
          userId: client.id,
          walletType: 'INTERNAL',
          currency: 'USD',
          balance: 10000,
          status: 'ACTIVE',
        },
      });

      await prisma.wallet.create({
        data: {
          userId: client.id,
          walletType: 'TRADING',
          currency: 'USD',
          balance: 5000,
          status: 'ACTIVE',
        },
      });
    }
  }

  // ============================================
  // 6. CREATE TRADING ACCOUNTS
  // ============================================
  console.log('Creating trading accounts...');

  for (let i = 0; i < clients.length; i++) {
    const mtAccountId = `MT5-${100000 + i}`;
    const existing = await prisma.tradingAccount.findUnique({
      where: { mtAccountId },
    });

    if (!existing) {
      await prisma.tradingAccount.create({
        data: {
          userId: clients[i].id,
          mtAccountId,
          mtPassword: 'encrypted_password',
          mtServer: 'OMNI-MT5-Live',
          mtGroup: 'default',
          accountType: 'STANDARD',
          currency: 'USD',
          leverage: 100,
          balance: 5000 + i * 1000,
          equity: 5200 + i * 1000,
          margin: 500,
          freeMargin: 4700 + i * 1000,
          totalDeposits: 10000,
          totalVolume: 50 + i * 10,
          bookingType: i === 0 ? 'A_BOOK' : 'B_BOOK',
          status: 'ACTIVE',
        },
      });
    }
  }

  // ============================================
  // 7. CREATE IB PROFILE
  // ============================================
  console.log('Creating IB profile...');

  const ibUser = await prisma.user.upsert({
    where: { email: 'ib@demo.com' },
    update: {},
    create: {
      email: 'ib@demo.com',
      name: 'Demo IB Partner',
      password: hashedPassword,
      userType: 'IB',
      status: 'ACTIVE',
    },
  });

  const existingIB = await prisma.iBProfile.findUnique({
    where: { userId: ibUser.id },
  });

  if (!existingIB) {
    await prisma.iBProfile.create({
      data: {
        userId: ibUser.id,
        ibCode: 'IB-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        ibLevel: 1,
        status: 'ACTIVE',
        totalClients: 15,
        activeClients: 12,
        totalVolume: 500,
        totalCommission: 5000,
      },
    });
  }

  // ============================================
  // 8. CREATE TASKS
  // ============================================
  console.log('Creating tasks...');

  const taskData = [
    { title: 'KYC Document Verification Required', category: 'KYC_VERIFICATION', priority: 'HIGH', status: 'NEW' },
    { title: 'Large Deposit Pending Approval', category: 'DEPOSIT', priority: 'CRITICAL', status: 'IN_PROGRESS' },
    { title: 'Withdrawal Request - Risk Review', category: 'WITHDRAWAL', priority: 'HIGH', status: 'ESCALATED' },
    { title: 'Client Complaint - Platform Issue', category: 'COMPLAINT', priority: 'CRITICAL', status: 'OPEN' },
    { title: 'New Account Application', category: 'ACCOUNT_OPENING', priority: 'MEDIUM', status: 'NEW' },
    { title: 'Support Ticket - Trading Issue', category: 'SUPPORT', priority: 'MEDIUM', status: 'IN_PROGRESS' },
    { title: 'Compliance Review Required', category: 'COMPLIANCE', priority: 'HIGH', status: 'NEW' },
    { title: 'Password Reset Request', category: 'SUPPORT', priority: 'LOW', status: 'RESOLVED' },
  ];

  for (let i = 0; i < taskData.length; i++) {
    const task = taskData[i];
    const slaMinutes = task.priority === 'CRITICAL' ? 15 : task.priority === 'HIGH' ? 30 : 60;
    
    await prisma.task.create({
      data: {
        title: task.title,
        description: `Description for task ${i + 1}`,
        category: task.category as 'KYC_VERIFICATION' | 'DEPOSIT' | 'WITHDRAWAL' | 'ACCOUNT_OPENING' | 'SUPPORT' | 'COMPLAINT' | 'COMPLIANCE' | 'OTHER',
        priority: task.priority as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
        priorityScore: task.priority === 'CRITICAL' ? 100 : task.priority === 'HIGH' ? 75 : task.priority === 'MEDIUM' ? 50 : 25,
        creatorId: superAdmin.id,
        assigneeId: i % 2 === 0 ? financeManager.id : supportAgent.id,
        platformSource: ['WEB', 'MT5', 'EMAIL', 'API'][i % 4] as 'WEB' | 'MT5' | 'EMAIL' | 'API',
        sourceReference: `REF-${10000 + i}`,
        slaMinutes,
        slaDeadline: new Date(Date.now() + slaMinutes * 60 * 1000),
        status: task.status as 'NEW' | 'OPEN' | 'IN_PROGRESS' | 'ESCALATED' | 'RESOLVED',
      },
    });
  }

  // ============================================
  // 9. CREATE TRANSACTIONS
  // ============================================
  console.log('Creating transactions...');

  for (let i = 0; i < clients.length; i++) {
    await prisma.transaction.create({
      data: {
        userId: clients[i].id,
        type: 'DEPOSIT',
        amount: 5000 + i * 1000,
        currency: 'USD',
        fee: 0,
        netAmount: 5000 + i * 1000,
        status: 'COMPLETED',
        paymentMethod: 'Wire Transfer',
        paymentReference: `PAY-${100000 + i}`,
        processedAt: new Date(),
      },
    });
  }

  // ============================================
  // 10. CREATE SETTINGS
  // ============================================
  console.log('Creating settings...');

  await Promise.all([
    prisma.setting.upsert({ where: { key: 'system.name' }, update: {}, create: { key: 'system.name', value: 'OMNI-CRM', category: 'system', description: 'System name' } }),
    prisma.setting.upsert({ where: { key: 'system.version' }, update: {}, create: { key: 'system.version', value: '1.0.0', category: 'system', description: 'System version' } }),
    prisma.setting.upsert({ where: { key: 'trading.default_leverage' }, update: {}, create: { key: 'trading.default_leverage', value: '100', category: 'trading', description: 'Default leverage' } }),
    prisma.setting.upsert({ where: { key: 'kyc.auto_approve' }, update: {}, create: { key: 'kyc.auto_approve', value: 'false', category: 'kyc', description: 'Auto-approve KYC' } }),
  ]);

  console.log('✅ Seeding completed!');
  console.log('\n📋 Demo Credentials:');
  console.log('   Super Admin: admin@omnicrm.com / Admin123!');
  console.log('   Finance Manager: finance@omnicrm.com / Admin123!');
  console.log('   Support Agent: support@omnicrm.com / Admin123!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

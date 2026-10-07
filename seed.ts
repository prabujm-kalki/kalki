import { seedDefaultChartOfAccounts } from './src/domains/accounts/seeder';

(async () => {
  try {
    const organizationId = 'b5334ab2-b652-432b-8c16-774c90406261'; // Kalki Business Group
    console.log('Seeding defaults for organization:', organizationId);
    await seedDefaultChartOfAccounts(organizationId);
    console.log('Successfully seeded Chart of Accounts!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed:', err);
    process.exit(1);
  }
})();

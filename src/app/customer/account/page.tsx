import { redirect } from 'next/navigation';
import { getCustomerSession } from '@/lib/customer-auth';
import { CustomerProfileDetails } from './CustomerProfileDetails';

export default async function CustomerAccountPage() {
  const customer = await getCustomerSession();
  if (!customer) redirect('/customer/login');
  return <CustomerProfileDetails customer={customer} />;
}

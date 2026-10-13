import { redirect } from 'next/navigation';

export default function RootPage() {
  // Simplest possible behaviour: everyone lands on the citizen portal.
  // Officials navigate to /login themselves, or click "Log in" in the header.
  redirect('/report');
}

import { SingleEmailValidator } from '../components/SingleEmailValidator';
import { BulkEmailValidator } from '../components/BulkEmailValidator';
import { useSupabaseUser } from '../hooks/useSupabaseUser';

export const Dashboard = () => {
  const { user, signOut } = useSupabaseUser();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Email Validator Pro
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-600 bg-gray-100 px-3 py-1 rounded-full text-sm">
                {user?.email}
              </span>
              <button
                onClick={signOut}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <SingleEmailValidator />
          <BulkEmailValidator />
        </div>
      </main>
    </div>
  );
};
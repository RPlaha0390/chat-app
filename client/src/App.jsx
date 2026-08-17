import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Routing and pages are added in Task 8 */}
      </div>
    </AuthProvider>
  );
}

export default App;

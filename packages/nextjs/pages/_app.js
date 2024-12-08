import { GoogleOAuthProvider } from '@react-oauth/google';
import { OktoProvider, BuildType } from 'okto-sdk-react';
import Navbar from '../components/Navbar';
import '../styles/globals.css';
import { AuthProvider } from '@/components/providers/PrivyProvider';
export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
      <OktoProvider 
        apiKey={process.env.NEXT_PUBLIC_OKTO_CLIENT_API_KEY} 
        buildType={BuildType.SANDBOX}
      >
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-black">
          <Navbar />
          <Component {...pageProps} />
        </div>
      </OktoProvider>
    </GoogleOAuthProvider>
    </AuthProvider>
  );
}

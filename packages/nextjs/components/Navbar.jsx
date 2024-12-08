import { useOkto } from 'okto-sdk-react';
import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';

export default function Navbar() {

  // const { showWidgetModal } = useOkto();
  const { login, authenticated, user } = usePrivy();

  return (
    <nav className="fixed top-0 w-full bg-black/50 backdrop-blur-sm border-b border-purple-500/20 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-cyan-400 font-bold text-xl">Neural Garden</div>
        
        {authenticated ? (
          <Link href="/home">
            <div className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300">
              Dashboard
            </div>
          </Link>
        ) : (
          <button
            onClick={login}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
          >
            Login
          </button>
        )}

        {/* Okto implementation for later */}
        {/* <button
          onClick={() => showWidgetModal()}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
        >
          Connect Wallet
        </button> */}
      </div>
    </nav>
  );
} 
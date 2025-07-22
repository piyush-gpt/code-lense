// app/github/callback/page.tsx
"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";

export default function GitHubCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setUser } = useAuthStore();

  // Function to poll for installation completion
  const pollForInstallationCompletion = async (installationId: number) => {
    const maxAttempts = 30; // 30 seconds
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`https://localhost:4000/api/github/callback?installation_id=${installationId}`, {
          credentials: "include",
        });
        
        const data = await response.json();
        
        if (data.token) {
          console.log('✅ Installation completed, setting token...');
          // Set the token and complete the flow
          const setTokenRes = await fetch("https://localhost:4000/api/user/session/set-token?token=" + encodeURIComponent(data.token), {
            method: "POST",
            credentials: "include",
          });
          
          const setTokenData = await setTokenRes.json();
          if (setTokenData.success && setTokenData.user) {
            setUser(setTokenData.user);
          }
          
          router.push("/dashboard");
          return;
        }
        
        // Wait 1 second before next attempt
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        console.error('❌ Polling error:', error);
        attempts++;
      }
    }
    
    // If we get here, polling failed
    console.error('❌ Installation setup timeout');
    router.push("/error");
  };

  useEffect(() => {
    const installationId = searchParams.get("installation_id");
    if (!installationId) return;

    const completeSetup = async () => {
      try {
        // 1. Hit backend to get token
        const res = await fetch(`https://localhost:4000/api/github/callback?installation_id=${installationId}`, {
          credentials: "include",
        });

        const data = await res.json();
        console.log('📡 Response:', data);
        
        if (data.status === "pending") {
          // Installation is being set up - poll for completion
          console.log('⏳ Installation pending, polling for completion...');
          await pollForInstallationCompletion(Number(data.installation_id));
        } else if (data.token) {
          console.log('🔧 Setting session token...');
          // 2. Set secure cookie by calling backend
          const setTokenRes = await fetch("https://localhost:4000/api/user/session/set-token?token=" + encodeURIComponent(data.token), {
            method: "POST",
            credentials: "include",
          });
          
          const setTokenData = await setTokenRes.json();
          console.log('🍪 Set token response:', setTokenData);
          
          if (setTokenData.success && setTokenData.user) {
            // 3. Set user in Zustand store
            setUser(setTokenData.user);
          }

          // 4. Redirect to dashboard
          router.push("/dashboard");
        } else {
          throw new Error("Invalid response from server");
        }
      } catch (err) {
        console.error("❌ Failed GitHub auth flow:", err);
        router.push("/error");
      }
    };

    completeSetup();
  }, [searchParams, setUser, router]);

  return (
    <div className="p-6 text-center">
      <h2 className="text-xl font-bold">🔐 Setting up your GitHub session...</h2>
      <p className="text-gray-500 mt-2">Please wait while we complete the login process.</p>
    </div>
  );
}

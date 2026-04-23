"use client";

import { signIn } from "next-auth/react";

interface SignInButtonProps {
  text?: string;
  className?: string;
}

export function SignInButton({ 
  text = "Sign In with Twitch", 
  className = "flex items-center gap-2 rounded-full bg-purple-600 px-8 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-500/30 active:scale-95" 
}: SignInButtonProps) {
  return (
    <button
      onClick={() => signIn("twitch")}
      className={className}
    >
      {text}
    </button>
  );
}

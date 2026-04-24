import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Trophy, Music, Award, Star, Activity } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/Header"; // Assuming this exists or similar

export default async function ViewerProfilePage({ params }: { params: { username: string } }) {
  // Await params according to Next 15 standard, or gracefully default
  const { username } = await Promise.resolve(params);
  const decodedUsername = decodeURIComponent(username).toLowerCase();
  
  const user = await prisma.user.findFirst({
    where: { twitchLogin: { equals: decodedUsername, mode: "insensitive" } },
    include: {
      submissions: {
         include: { evaluations: true, session: { include: { streamer: true } } }
      }
    }
  });

  if (!user) {
    return notFound();
  }

  const tracks = user.submissions;
  const evaluatedTracks = tracks.filter(t => t.evaluations.length > 0);
  
  let totalScore = 0;
  evaluatedTracks.forEach(t => {
     const tScore = t.evaluations.reduce((acc, e) => acc + e.score, 0) / t.evaluations.length;
     totalScore += tScore;
  });

  const averageScore = evaluatedTracks.length > 0 ? (totalScore / evaluatedTracks.length) : 0;

  // Rank Logic
  let rankName = "Rookie";
  let rankColor = "text-zinc-500";
  let bgGradient = "from-zinc-500/20 to-zinc-900";
  let Icon = Activity;

  if (evaluatedTracks.length > 0) {
    if (averageScore >= 8.5) {
      rankName = "Banger Maker";
      rankColor = "text-pink-500";
      bgGradient = "from-pink-500/20 to-pink-900/10";
      Icon = Trophy;
    } else if (averageScore >= 6.0) {
      rankName = "Tastemaker";
      rankColor = "text-blue-500";
      bgGradient = "from-blue-500/20 to-blue-900/10";
      Icon = Star;
    } else if (averageScore < 4.0) {
      rankName = "Chat Troll";
      rankColor = "text-amber-500";
      bgGradient = "from-amber-500/20 to-amber-900/10";
      Icon = Award;
    } else {
      rankName = "Music Fan";
      rankColor = "text-purple-500";
      bgGradient = "from-purple-500/20 to-purple-900/10";
      Icon = Music;
    }
  }

  // Top Session
  const streamerInteractions = tracks.reduce((acc, t) => {
    if (t.session?.streamer?.name) {
       acc[t.session.streamer.name] = (acc[t.session.streamer.name] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  const favoriteStreamer = Object.entries(streamerInteractions).sort((a,b) => b[1] - a[1])[0];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">
      <main className="max-w-5xl mx-auto px-6 py-20 mt-10">
        
        <Link href="/" className="text-sm font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-all mb-10 inline-block border-b border-transparent hover:border-white pb-1">
           ← Back Home
        </Link>

        {/* Hero Section */}
        <div className={`w-full rounded-[3rem] p-12 bg-gradient-to-br ${bgGradient} border border-white/5 relative overflow-hidden`}>
           <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
           <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
              <div className={`h-32 w-32 rounded-[2rem] bg-black/50 border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-xl ${rankColor}`}>
                 <Icon size={64} />
              </div>
              <div className="space-y-2 text-center md:text-left">
                 <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase">{user.twitchLogin}</h1>
                 <div className={`text-xl font-bold uppercase tracking-widest ${rankColor}`}>Rank: {rankName}</div>
              </div>
           </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
           <div className="glass p-8 rounded-[2.5rem] border border-white/5 flex items-center gap-6">
              <div className="h-16 w-16 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-500">
                <Music size={32} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total Dropped</p>
                <h3 className="text-4xl font-black">{tracks.length}</h3>
              </div>
           </div>

           <div className="glass p-8 rounded-[2.5rem] border border-white/5 flex items-center gap-6">
              <div className={`h-16 w-16 bg-zinc-900 rounded-2xl flex items-center justify-center ${rankColor}`}>
                <Star size={32} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Avg Score</p>
                <h3 className={`text-4xl font-black ${rankColor}`}>{averageScore.toFixed(1)}</h3>
              </div>
           </div>

           <div className="glass p-8 rounded-[2.5rem] border border-white/5 flex items-center gap-6 overflow-hidden relative">
              <div className="h-16 w-16 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-500 z-10 relative shrink-0">
                <Trophy size={32} />
              </div>
              <div className="z-10 relative">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Fav Streamer</p>
                <h3 className="text-3xl font-black truncate max-w-[150px]">{favoriteStreamer ? favoriteStreamer[0] : "-"}</h3>
              </div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[10rem] font-black italic opacity-5 pointer-events-none pr-4">#1</div>
           </div>
        </div>

        {/* History Log */}
        <div className="mt-20">
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-8">Drop History</h2>
          <div className="space-y-4">
             {tracks.slice(0, 20).map((t, index) => {
               const evals = t.evaluations;
               const score = evals.length > 0 ? (evals.reduce((a,e) => a + e.score, 0) / evals.length).toFixed(1) : "Pending";
               const isWinner = t.status === "EVALUATED" && evals.some(e => e.criteriaId.includes("duel-win"));

               return (
                 <div key={t.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-[2rem] bg-zinc-950 border border-zinc-900 hover:border-zinc-800 transition-all gap-4">
                    <div className="flex items-center gap-6 min-w-0">
                      <span className="text-zinc-600 font-bold tabular-nums w-6">{index + 1}.</span>
                      <div className="min-w-0">
                         <h4 className="font-bold text-lg truncate">{t.title}</h4>
                         <p className="text-xs text-zinc-500">Played on <span className="text-zinc-300">{t.session.streamer.name}</span>'s stream</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      {isWinner && <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/30">Duel Winner</span>}
                      {t.status === "QUEUED" && <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 border border-amber-500/30 bg-amber-500/10 px-3 py-1 rounded-full">In Queue</span>}
                      <div className="text-right">
                        <span className="text-2xl font-black w-14 inline-block">{score}</span>
                      </div>
                    </div>
                 </div>
               );
             })}
             {tracks.length === 0 && (
               <div className="text-zinc-500 text-sm font-bold uppercase tracking-widest text-center py-20">
                 No tracks dropped yet.
               </div>
             )}
          </div>
        </div>

      </main>
    </div>
  );
}

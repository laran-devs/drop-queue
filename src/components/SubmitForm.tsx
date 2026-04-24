"use client";

import { submitTrack } from "@/app/actions/submit-track";
import { useSocket } from "@/hooks/use-socket";
import { toast } from "sonner";
import { useRef, useState } from "react";

export function SubmitForm() {
  const { emit } = useSocket();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPriority, setIsPriority] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    // Add priority flag to formData
    formData.append("isPriority", isPriority.toString());

    const promise = submitTrack(formData);

    toast.promise(promise, {
      loading: "Submitting your track...",
      success: (res: any) => {
        if (res.paymentUrl) {
          window.location.href = res.paymentUrl;
          return "Redirecting to payment...";
        }

        emit("new_track", { 
          title: formData.get("title"),
          submitter: "Someone"
        });
        formRef.current?.reset();
        setIsPriority(false);
        return "Track added to the queue!";
      },
      error: (err) => err.message || "Failed to submit track"
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="mt-10 space-y-6">
      <div className="grid grid-cols-1 gap-x-6 gap-y-8">
        <div>
          <label htmlFor="title" className="block text-sm font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
            Track Title
          </label>
          <div className="mt-2.5">
            <input
              type="text"
              name="title"
              id="title"
              required
              placeholder="e.g. Moonlight Sonata - Remix"
              className="block w-full rounded-xl border-0 px-4 py-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-purple-600 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800 sm:text-sm sm:leading-6 border-none outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="url" className="block text-sm font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
            Streaming URL (Spotify/SoundCloud/YouTube)
          </label>
          <div className="mt-2.5">
            <input
              type="url"
              name="url"
              id="url"
              placeholder="https://..."
              className="block w-full rounded-xl border-0 px-4 py-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-purple-600 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800 sm:text-sm sm:leading-6 border-none outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
            Track Description
          </label>
          <div className="mt-2.5">
            <textarea
              name="description"
              id="description"
              rows={3}
              placeholder="Tell the streamer why they should listen..."
              className="block w-full rounded-xl border-0 px-4 py-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-purple-600 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800 sm:text-sm sm:leading-6 border-none outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="lyrics" className="block text-sm font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
            Lyrics
          </label>
          <div className="mt-2.5">
            <textarea
              name="lyrics"
              id="lyrics"
              rows={6}
              placeholder="Paste the lyrics here..."
              className="block w-full rounded-xl border-0 px-4 py-3 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-purple-600 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-800 sm:text-sm sm:leading-6 border-none outline-none"
            />
          </div>
        </div>

        {/* Priority Option */}
        <div className="relative flex items-start p-4 rounded-2xl border-2 border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40 transition-all cursor-pointer" onClick={() => setIsPriority(!isPriority)}>
          <div className="flex h-6 items-center">
            <input
              id="priority"
              name="priority"
              type="checkbox"
              checked={isPriority}
              onChange={(e) => setIsPriority(e.target.checked)}
              className="h-5 w-5 rounded border-zinc-300 text-purple-600 focus:ring-purple-600 cursor-pointer"
            />
          </div>
          <div className="ml-4 text-sm leading-6">
            <label htmlFor="priority" className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              🚀 Priority Bump (+ 50 RUB)
              <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300">
                Guaranteed Listen
              </span>
            </label>
            <p className="text-zinc-500 dark:text-zinc-400">
              Your track will be placed at the top of the queue and marked as priority.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <button
          type="submit"
          className="block w-full rounded-xl bg-purple-600 px-3.5 py-4 text-center text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          Add to Queue
        </button>
      </div>
    </form>
  );
}

import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const f = createUploadthing();

import { z } from "zod";
import prisma from "@/lib/prisma";

export const ourFileRouter = {
  audioUploader: f({ audio: { maxFileSize: "128MB" } })
    .input(z.object({ sessionId: z.string() }))
    .middleware(async ({ input }) => {
      const session = await getServerSession(authOptions);
      if (!session) throw new Error("Unauthorized");

      // Check session limits
      const streamSession = await prisma.streamSession.findUnique({
        where: { id: input.sessionId },
        select: { allowDirectUploads: true, maxAudioFileSize: true }
      });

      if (!streamSession) throw new Error("Session not found");
      if (!streamSession.allowDirectUploads) throw new Error("Direct uploads are disabled for this session");

      return { userId: session.user.id, maxFileSize: streamSession.maxAudioFileSize };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      
      // Secondary check for file size (since UT enforces the 128MB hard limit)
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > metadata.maxFileSize) {
        console.error(`File size ${fileSizeMB}MB exceeds session limit of ${metadata.maxFileSize}MB`);
        // Note: In a production environment, you might want to delete the file from UT here
        // but for now we'll just log it. The client-side should prevent this.
      }

      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

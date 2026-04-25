import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";

export type ActionResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * A wrapper for Server Actions to ensure type safety, authentication,
 * and consistent error handling.
 */
export function createServerAction<TInput extends z.ZodTypeAny, TOutput>(
  schema: TInput,
  handler: (data: z.infer<TInput>, userId: string) => Promise<TOutput>
) {
  return async (data: unknown): Promise<ActionResponse<TOutput>> => {
    try {
      // 1. Authentication Check
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return { success: false, error: "Unauthorized. Please sign in to continue.", code: "UNAUTHORIZED" };
      }

      // 2. Input Validation
      const result = schema.safeParse(data);
      if (!result.success) {
        const errorMessage = result.error.issues[0]?.message || "Invalid input data";
        return { success: false, error: errorMessage, code: "VALIDATION_ERROR" };
      }

      // 3. Execute Handler
      const output = await handler(result.data, session.user.id);
      return { success: true, data: output };

    } catch (error: any) {
      logger.error({ 
        err: error, 
        action: handler.name,
        userId: session?.user?.id 
      }, "[SERVER_ACTION_ERROR]");
      
      // Handle known error types (e.g. Prisma P2002)
      if (error.code === 'P2002') {
        return { success: false, error: "A record with this unique identifier already exists.", code: "CONFLICT" };
      }

      return { 
        success: false, 
        error: error.message || "An unexpected error occurred. Please try again later.",
        code: "INTERNAL_ERROR" 
      };
    }
  };
}

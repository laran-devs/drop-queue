"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
// Last updated: 2026-04-23 13:50

/**
 * Updates the DonationAlerts secret token for the user.
 * Used for webhook signature verification.
 */
export async function updateDASecret(secret: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.user.update({
      where: { id: session.user.id },
      data: { daSecret: secret }
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update DA secret:", error);
    return { success: false, error: "Failed to update security token" };
  }
}

/**
 * Fetches user preferences from the database.
 * If no preferences exist, creates a default set.
 */
export async function getUserPreferences() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        minDonationAmount: true,
        donationCurrency: true,
        daSecret: true,
        accentColor: true
      }
    });

    let prefs = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id }
    });

    if (!prefs) {
      prefs = await prisma.userPreferences.create({
        data: { userId: session.user.id }
      });
    }

    return { prefs, user };
  } catch (err) {
    console.error("Failed to fetch user preferences:", err);
    return null;
  }
}

/**
 * Updates the public/private status of the user's profile.
 */
export async function updatePrivacyPreference(isPublic: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      update: { isPublic },
      create: { userId: session.user.id, isPublic }
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update privacy:", error);
    return { success: false };
  }
}

/**
 * Updates the minimum donation amount and currency required to bump a track.
 */
export async function updateDonationSettings(amount: number, currency: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        minDonationAmount: amount,
        donationCurrency: currency
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update donation settings:", error);
    return { success: false, error: "Failed to update donation settings" };
  }
}

/**
 * Updates the user's preferred accent color for overlays and UI.
 */
export async function updateAccentColor(color: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.user.update({
      where: { id: session.user.id },
      data: { accentColor: color }
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update accent color:", error);
    return { success: false, error: "Failed to update theme color" };
  }
}

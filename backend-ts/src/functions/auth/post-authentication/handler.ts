/**
 * Cognito post-authentication trigger.
 *
 * This Lambda is triggered after a user successfully authenticates.
 * It creates or updates the user profile in DynamoDB and generates
 * a fun username if the user doesn't have one.
 */

import type { PostAuthenticationTriggerEvent, Context } from "aws-lambda";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { getUserProfile, upsertUserProfile } from "@shared/db/users";
import type { UserProfile } from "@shared/types";

const bedrockClient = new BedrockRuntimeClient({});

/**
 * Generate an epic Christmas-themed username using Bedrock.
 */
async function generateChristmasUsername(inspiration: string): Promise<string | null> {
  try {
    // Clean up the inspiration
    const cleanInspiration = inspiration.includes("@")
      ? inspiration.split("@")[0] ?? inspiration
      : inspiration;

    const response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 256,
          tools: [
            {
              name: "generate_username",
              description: "Generate an epic Christmas lights adventure username",
              input_schema: {
                type: "object",
                properties: {
                  username: {
                    type: "string",
                    description: "A fun, creative Christmas-themed username",
                  },
                },
                required: ["username"],
              },
            },
          ],
          tool_choice: { type: "tool", name: "generate_username" },
          messages: [
            {
              role: "user",
              content: `Create ONE epic Christmas lights adventure username inspired by "${cleanInspiration}".
Make it FUN, MEMORABLE, and CHRISTMAS-THEMED. No numbers, CamelCase format, 15-25 characters.
Examples: GlowPatrolCaptain, TinselTornadoTom, SparkleSquadLeader, HollyJollyHunter`,
            },
          ],
        }),
      })
    );

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Extract tool use result
    for (const block of responseBody.content ?? []) {
      if (block.type === "tool_use" && block.name === "generate_username") {
        const username = block.input?.username as string | undefined;
        if (username) {
          // Clean up the username
          return username
            .replace(/\s+/g, "")
            .replace(/[^a-zA-Z0-9_]/g, "")
            .slice(0, 30);
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error generating username:", error);
    return null;
  }
}

/**
 * Generate a fallback username if Bedrock fails.
 */
function generateFallbackUsername(inspiration: string): string {
  // Clean input
  const cleanName = inspiration.includes("@")
    ? (inspiration.split("@")[0] ?? "User")
    : inspiration;

  const cleaned = cleanName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();

  // Fun prefixes and suffixes
  const prefixes = ["Sparkle", "Twinkle", "Glow", "Merry", "Festive", "Jolly"];
  const suffixes = ["Scout", "Hunter", "Ranger", "Chaser", "Seeker", "Finder"];

  // Use a simple hash to consistently pick words
  const hash = Array.from(inspiration).reduce((a, c) => a + c.charCodeAt(0), 0);
  const prefix = prefixes[hash % prefixes.length];
  const suffix = suffixes[(hash >> 4) % suffixes.length];

  return `${prefix}${capitalized ?? suffix}`;
}

/**
 * Handle Cognito post-authentication trigger.
 */
export async function handler(
  event: PostAuthenticationTriggerEvent,
  _context: Context
): Promise<PostAuthenticationTriggerEvent> {
  try {
    const userId = event.request.userAttributes.sub;
    const email = event.request.userAttributes.email;
    const name = event.request.userAttributes.name;

    if (!userId) {
      console.error("No user ID in event");
      return event;
    }

    // Check if user already has a profile
    const existingProfile = await getUserProfile(userId);

    if (existingProfile) {
      // User already has a profile, nothing to do
      console.log(`User ${userId} already has a profile`);
      return event;
    }

    // Generate a fun username
    const inspiration = name ?? email ?? userId;
    let username = await generateChristmasUsername(inspiration);

    if (!username) {
      username = generateFallbackUsername(inspiration);
    }

    // Create new user profile
    const profile: UserProfile = {
      userId,
      email: email ?? "",
      username,
      name: name ?? undefined,
      isAdmin: false,
      createdAt: new Date().toISOString(),
    };

    await upsertUserProfile(profile);

    console.log(`Created profile for user ${userId} with username ${username}`);

    return event;
  } catch (error) {
    console.error("Error in post-authentication trigger:", error);
    // Don't fail authentication, just log the error
    return event;
  }
}

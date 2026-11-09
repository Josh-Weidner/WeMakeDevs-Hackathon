import type { Logger, MeResponse, PeopleRepository } from "@confy/shared";

export interface MeService {
  get(userId: string): Promise<MeResponse>;
}

/** The active persona, plus the opt-in profile bits the UI needs (name, LinkedIn for the share QR). */
export function createMeService(deps: { people: Pick<PeopleRepository, "getProfile">; logger: Logger }): MeService {
  return {
    async get(userId) {
      // The persona id alone is enough to use the app: if the profile lookup fails, degrade instead of erroring.
      const profile = await deps.people.getProfile(userId).catch((err: unknown) => {
        deps.logger.warn({ err }, "profile lookup failed");
        return null;
      });
      return {
        userId,
        ...(profile ? { displayName: profile.display_name } : {}),
        ...(profile?.linkedin_url ? { linkedinUrl: profile.linkedin_url } : {}),
      };
    },
  };
}

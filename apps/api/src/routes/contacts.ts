import { ContactFollowUpResponse, ContactListQuery, ContactSearchQuery, ContactSearchResponse } from "@confy/shared/contracts";
import type { FastifyInstance } from "fastify";
import type { ContactsService } from "../services/contacts.js";
import { parse } from "./parse.js";

export function contactsRoutes(contacts: ContactsService) {
  return async (app: FastifyInstance) => {
    app.get("/contacts", async (request) =>
      ContactSearchResponse.parse(await contacts.list(request.userId, parse(ContactListQuery, request.query))),
    );

    app.get("/contacts/search", async (request) =>
      ContactSearchResponse.parse(await contacts.search(request.userId, parse(ContactSearchQuery, request.query))),
    );

    app.post<{ Params: { id: string } }>("/contacts/:id/follow-up", async (request) =>
      ContactFollowUpResponse.parse(await contacts.followUp(request.userId, request.params.id)),
    );
  };
}

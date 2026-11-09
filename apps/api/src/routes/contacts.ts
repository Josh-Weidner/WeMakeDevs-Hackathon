import { ContactSearchQuery, ContactSearchResponse } from "@confy/shared/contracts";
import type { FastifyInstance } from "fastify";
import type { ContactsService } from "../services/contacts.js";
import { parse } from "./parse.js";

export function contactsRoutes(contacts: ContactsService) {
  return async (app: FastifyInstance) => {
    app.get("/contacts/search", async (request) =>
      ContactSearchResponse.parse(await contacts.search(request.userId, parse(ContactSearchQuery, request.query))),
    );
  };
}

/**
 * Shared TypeScript types used by the API, server components and the client
 * data table. The API exposes ContentItems with camelCase field names.
 */

export type ContentStatus = "DRAFT" | "SCRIPTED" | "RECORDED";

export const CONTENT_STATUSES: ContentStatus[] = [
  "DRAFT",
  "SCRIPTED",
  "RECORDED",
];

/** Public shape of a ContentItem as returned by /api/items. */
export type ContentItemDTO = {
  id: string;
  title: string;
  sourceUrl: string | null;
  status: ContentStatus;
  createdAt: string;
};

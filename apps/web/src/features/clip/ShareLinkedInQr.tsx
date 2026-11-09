"use client";

import { MeResponse } from "@confy/shared/contracts";
import { Check, Copy, ExternalLink, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { configuredShareUrl, parseLinkedInUrl, resolveShareUrl, shareStorageKey } from "@/lib/linkedin/share";
import { usePersona } from "@/lib/persona/PersonaProvider";

export const SHARE_QR_ID = "share-linkedin";

function readStored(personaId: string): string | null {
  try {
    return window.localStorage.getItem(shareStorageKey(personaId));
  } catch {
    return null;
  }
}

function writeStored(personaId: string, value: string | null) {
  try {
    if (value) window.localStorage.setItem(shareStorageKey(personaId), value);
    else window.localStorage.removeItem(shareStorageKey(personaId));
  } catch {
    // Storage blocked (private window): the URL still works for this visit.
  }
}

/**
 * "Missed it? Share your LinkedIn" (SPEC §10b): a QR of the user's OWN profile for the other person to
 * scan. Nothing is recorded or uploaded, and Confy never contacts anyone on LinkedIn.
 */
/** The URL the QR shows for the current persona (pasted on this device → demo default → opt-in profile). */
export function useLinkedInShare() {
  const { persona } = usePersona();
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const [stored, setStored] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    // Read device storage after mount (not during render) so the server and first client render match.
    async function load() {
      const me = await api.get("/v1/me", MeResponse, { userId: persona.id, signal: controller.signal }).catch(() => null);
      if (controller.signal.aborted) return;
      setStored(readStored(persona.id));
      setProfileUrl(me?.linkedinUrl ?? null);
    }
    void load();
    return () => controller.abort();
  }, [persona.id]);

  return { persona, share: resolveShareUrl({ stored, configured: configuredShareUrl(), profile: profileUrl }), setStored };
}

/** Phone layout: only the code, as large as the screen allows, for someone else to scan. */
export function LinkedInQrOnly({ url }: { url: string }) {
  return (
    <figure className="mx-auto w-full max-w-xs">
      <div role="img" aria-label={`QR code to connect on LinkedIn: ${url}`} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/10">
        <QRCodeSVG value={url} size={512} level="M" marginSize={1} bgColor="#ffffff" fgColor="#000000" aria-hidden="true" className="h-auto w-full" />
      </div>
      <figcaption className="mt-3 text-center text-sm text-muted-foreground">Scan to connect on LinkedIn</figcaption>
    </figure>
  );
}

export function ShareLinkedInQr() {
  const { persona, share, setStored } = useLinkedInShare();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [large, setLarge] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputId = useId();
  const errorId = useId();

  const showForm = editing || !share;

  function submit(event: FormEvent) {
    event.preventDefault();
    const url = parseLinkedInUrl(draft);
    if (!url) {
      setDraftError("Enter your LinkedIn profile URL, starting with https://www.linkedin.com/");
      return;
    }
    writeStored(persona.id, url);
    setStored(url);
    setDraft("");
    setDraftError(null);
    setEditing(false);
  }

  function reset() {
    writeStored(persona.id, null);
    setStored(null);
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card id={SHARE_QR_ID} tabIndex={-1} className="scroll-mt-24">
      <CardHeader>
        <CardTitle>
          <h2 className="flex items-center gap-2">
            <QrCode aria-hidden="true" className="size-5" /> Missed it? Share your LinkedIn
          </h2>
        </CardTitle>
        <CardDescription>Didn&apos;t catch the conversation in time? Let them scan this to connect with you. Nothing is recorded.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {share && !editing && (
          <div className="flex flex-wrap items-start gap-6">
            <div role="img" aria-label={`QR code linking to ${share.url}`} className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-black/10">
              <QRCodeSVG value={share.url} size={large ? 288 : 176} level="M" marginSize={2} bgColor="#ffffff" fgColor="#000000" aria-hidden="true" />
            </div>
            <div className="grid min-w-0 gap-3">
              <p className="break-all text-sm font-medium">{share.url}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" aria-pressed={large} onClick={() => setLarge((v) => !v)}>
                  {large ? "Smaller QR" : "Show larger"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => void copy(share.url)}>
                  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={share.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden="true" /> Open<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={() => setEditing(true)}>
                  Use a different profile
                </Button>
                {share.source === "device" && (
                  <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={reset}>
                    Forget the one saved on this device
                  </Button>
                )}
              </div>
              <p role="status" className="sr-only">
                {copied ? "Link copied" : ""}
              </p>
            </div>
          </div>
        )}

        {showForm && (
          <form onSubmit={submit} noValidate className="grid max-w-md gap-2">
            <Label htmlFor={inputId}>Your LinkedIn profile URL</Label>
            <p className="text-sm text-muted-foreground">Kept on this device only.</p>
            <Input
              id={inputId}
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://www.linkedin.com/in/your-name/"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-invalid={draftError ? true : undefined}
              aria-describedby={draftError ? errorId : undefined}
            />
            {draftError && (
              <p id={errorId} className="text-sm text-destructive">
                {draftError}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Show QR code
              </Button>
              {share && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

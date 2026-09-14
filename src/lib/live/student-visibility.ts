type LiveResources = {
  status: string;
  joinUrl: string | null;
  replayUrl: string | null;
  replayPdfUrl: string | null;
};

export function sanitizeStudentLiveResources<T extends LiveResources>(session: T): T {
  return {
    ...session,
    joinUrl: session.status === "LIVE" ? session.joinUrl : null,
    replayUrl: session.status === "COMPLETED" ? session.replayUrl : null,
    replayPdfUrl: session.status === "COMPLETED" ? session.replayPdfUrl : null,
  };
}

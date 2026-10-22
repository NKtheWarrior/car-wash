import { IssueClient } from "./IssueClient";

export default async function IssuePage({
  searchParams,
}: {
  searchParams: Promise<{ bayId?: string; sessionId?: string }>;
}) {
  const { bayId, sessionId } = await searchParams;
  return <IssueClient bayId={bayId} sessionId={sessionId} />;
}

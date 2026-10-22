import { BayClient } from "./BayClient";

export default async function BayPage({
  params,
  searchParams,
}: {
  params: Promise<{ bayId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { bayId } = await params;
  const { t } = await searchParams;
  return <BayClient bayId={bayId} token={t ?? ""} />;
}


// CycleProof — AWS API Service client
// Connects to Amazon API Gateway (or local dev server http://127.0.0.1:5000)

import type { Claim, Organization, Discrepancy } from '../types';

const API_BASE_URL =
  ((import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env
    ?.VITE_API_BASE_URL) || 'http://127.0.0.1:5000';

async function getErrorMessage(res: Response): Promise<string> {
  const responseText = await res.text();

  if (!responseText) {
    return `${res.status} ${res.statusText}`;
  }

  try {
    const parsed = JSON.parse(responseText);
    return parsed.error || parsed.message || responseText;
  } catch {
    return responseText;
  }
}

export async function fetchHealth(): Promise<{
  status: string;
  service: string;
}> {
  const res = await fetch(`${API_BASE_URL}/health`);

  if (!res.ok) {
    throw new Error(`Health check failed: ${await getErrorMessage(res)}`);
  }

  return res.json();
}

export async function fetchOrganizations(): Promise<Organization[]> {
  const res = await fetch(`${API_BASE_URL}/organizations`);

  if (!res.ok) {
    throw new Error(
      `Failed to fetch organizations: ${await getErrorMessage(res)}`
    );
  }

  return res.json();
}

export async function fetchClaims(params?: {
  orgId?: string;
  status?: string;
}): Promise<Claim[]> {
  const query = new URLSearchParams();

  if (params?.orgId) query.set('orgId', params.orgId);
  if (params?.status) query.set('status', params.status);

  const queryString = query.toString();
  const url = queryString
    ? `${API_BASE_URL}/claims?${queryString}`
    : `${API_BASE_URL}/claims`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch claims: ${await getErrorMessage(res)}`);
  }

  return res.json();
}

export async function fetchClaimById(id: string): Promise<Claim> {
  const res = await fetch(
    `${API_BASE_URL}/claims/${encodeURIComponent(id)}`
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch claim ${id}: ${await getErrorMessage(res)}`
    );
  }

  return res.json();
}

export async function updateClaimStatus(
  id: string,
  status: string,
  reviewerNotes?: string,
  _actorRole = 'Reviewer'
): Promise<{ message: string; claim: Claim }> {
  // The AWS API rejects actorRole as an unsupported field.
  // Only send fields accepted by the backend.
  const body: Record<string, string> = { status };

  if (reviewerNotes !== undefined) {
    body.reviewerNotes = reviewerNotes;
  }

  const res = await fetch(
    `${API_BASE_URL}/claims/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to update claim ${id}: ${await getErrorMessage(res)}`
    );
  }

  return res.json();
}

export async function triggerReconciliation(
  claimId: string
): Promise<{
  claimId: string;
  discrepancies: Discrepancy[];
  recommendedStatus: string;
}> {
  const res = await fetch(
    `${API_BASE_URL}/claims/${encodeURIComponent(claimId)}/reconcile`,
    {
      method: 'POST',
    }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to reconcile claim ${claimId}: ${await getErrorMessage(res)}`
    );
  }

  return res.json();
}

export async function fetchDiscrepancies(
  claimId?: string
): Promise<Discrepancy[]> {
  const query = claimId
    ? `?claimId=${encodeURIComponent(claimId)}`
    : '';

  const res = await fetch(`${API_BASE_URL}/discrepancies${query}`);

  if (!res.ok) {
    throw new Error(
      `Failed to fetch discrepancies: ${await getErrorMessage(res)}`
    );
  }

  return res.json();
}

export async function getPresignedUploadUrl(
  fileName: string,
  claimId: string
): Promise<{
  uploadUrl: string;
  s3Key: string;
  bucket: string;
}> {
  const res = await fetch(`${API_BASE_URL}/evidence/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileName, claimId }),
  });

  if (!res.ok) {
    throw new Error(
      `Failed to generate upload URL: ${await getErrorMessage(res)}`
    );
  }

  return res.json();
}

export async function fetchBootstrap() {
  const res = await fetch(`${API_BASE_URL}/bootstrap`);

  if (!res.ok) {
    throw new Error(
      `Failed to load app data: ${await getErrorMessage(res)}`
    );
  }

  return res.json();
}

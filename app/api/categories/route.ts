import { NextResponse } from 'next/server';

export async function GET() {
  // Simulate the new API response format
  const response = {
    categories: [
      {
        id: "9c3523f5-0c5b-412e-a158-99e07b888bd3",
        name: "IT Sector"
      },
      {
        id: "e543505d-6a79-48a5-ba47-8c83e79e4e5b",
        name: "Automotive"
      },
      {
        id: "f1234567-1234-1234-1234-123456789abc",
        name: "Healthcare"
      },
      {
        id: "f2345678-2345-2345-2345-23456789abcd",
        name: "Education"
      },
      {
        id: "f3456789-3456-3456-3456-3456789abcde",
        name: "Retail"
      },
      {
        id: "f4567890-4567-4567-4567-456789abcdef",
        name: "Finance"
      },
      {
        id: "f5678901-5678-5678-5678-56789abcdef0",
        name: "Manufacturing"
      },
      {
        id: "f6789012-6789-6789-6789-6789abcdef01",
        name: "Entertainment"
      },
      {
        id: "f7890123-7890-7890-7890-789abcdef012",
        name: "Food & Beverage"
      },
      {
        id: "f8901234-8901-8901-8901-89abcdef0123",
        name: "Travel & Tourism"
      }
    ]
  };

  return NextResponse.json(response);
}

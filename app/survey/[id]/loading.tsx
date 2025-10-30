import { RefreshCw } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-violet-600 mx-auto mb-4" />
        <p className="text-slate-600">Loading survey...</p>
      </div>
    </div>
  );
}


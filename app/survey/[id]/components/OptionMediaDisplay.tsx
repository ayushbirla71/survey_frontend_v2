import { cn } from "@/lib/utils"; 
 
 interface OptionMedia {
  type: "IMAGE" | "VIDEO" | "AUDIO";
  url: string;
  meta?: {
    originalname?: string;
    size?: number;
    mimetype?: string;
  };
}


// Component to render option media preview (smaller version)
export default function OptionMediaDisplay({
  media,
  fullWidth = false,
}: {
  media: OptionMedia | null | undefined;
  fullWidth?: boolean;
}) {
  if (!media || !media.url) return null;

  const mediaType = (media.type || "").toUpperCase();

  return (
    <div
      className={cn(
        "mt-1 rounded-md overflow-hidden border border-slate-200 bg-slate-50",
        fullWidth ? "w-full" : "max-w-[200px]",
      )}
    >
      {mediaType === "IMAGE" && (
        <img
          src={media.url}
          alt={media.meta?.originalname || "Option image"}
          className={cn(
            "object-contain mx-auto",
            fullWidth ? "w-full max-h-[300px]" : "max-h-[100px]",
          )}
        />
      )}
      {mediaType === "VIDEO" && (
        <video
          src={media.url}
          controls
          className={cn(
            "mx-auto",
            fullWidth ? "w-full max-h-[300px]" : "max-h-[100px]",
          )}
        />
      )}
      {mediaType === "AUDIO" && (
        <div className="p-2">
          <audio
            src={media.url}
            controls
            className="w-full h-8 min-w-[200px]"
          />
        </div>
      )}
    </div>
  );
}
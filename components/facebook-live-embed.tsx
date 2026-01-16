"use client";
import { useEffect } from "react";

interface FacebookLiveEmbedProps {
  videoUrl: string;
}

export default function FacebookLiveEmbed({
  videoUrl,
}: FacebookLiveEmbedProps) {
  useEffect(() => {
    // Load Facebook SDK
    if (
      typeof window !== "undefined" &&
      !document.getElementById("facebook-sdk")
    ) {
      const script = document.createElement("script");
      script.id = "facebook-sdk";
      script.src =
        "https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v20.0";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);

      // Parse after SDK loads
      script.onload = () => {
        if (window.FB) {
          window.FB.XFBML.parse();
        }
      };
    }
  }, []);

  return (
    <>
      <div id="fb-root" />
      <div
        className="fb-video fb-xfbml-parse-ignore"
        data-href={videoUrl}
        data-width="1000"
        data-allowfullscreen="true"
        data-autoplay="true"
      >
        <blockquote cite={videoUrl} className="fb-xfbml-parse-ignore">
          <a target="_blank" href={videoUrl}>
            Facebook Live Stream
          </a>
        </blockquote>
      </div>
    </>
  );
}

// "use client";
// import { useEffect } from "react";

// export default function LiveEmbed({ videoUrl }: { videoUrl: string }) {
//   useEffect(() => {
//     if (typeof window !== "undefined") {
//       const script = document.createElement("script");
//       script.src =
//         "https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v20.0";
//       script.async = true;
//       script.defer = true;
//       script.crossOrigin = "anonymous";
//       document.body.appendChild(script);
//       return () => {
//         document.body.removeChild(script);
//       };
//     }
//   }, []);

//   return (
//     <div>
//       <div id="fb-root"></div>
//       <div
//         className="fb-video"
//         data-href={videoUrl}
//         data-width="500"
//         data-allowfullscreen="true"
//       />
//     </div>
//   );
// }

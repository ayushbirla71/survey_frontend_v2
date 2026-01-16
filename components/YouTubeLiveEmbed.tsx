// components/YouTubeLiveEmbed.tsx
import React from "react";

interface YouTubeLiveEmbedProps {
  videoId?: string; // Specific video ID
  channelId?: string; // OR channel ID for live detection
  height?: string;
  width?: string;
}

const YouTubeLiveEmbed: React.FC<YouTubeLiveEmbedProps> = ({
  videoId,
  channelId,
  height = "315",
  width = "560",
}) => {
  const src = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`
    : channelId
    ? `https://www.youtube.com/embed/live_stream?channel=${channelId}`
    : "";

  return (
    <div
      className="youtube-embed-container"
      style={{
        position: "relative",
        width: "100%",
        height: "0",
        paddingBottom: "56.25%",
      }}
    >
      {src && (
        <iframe
          src={src}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          title="YouTube Video Player"
          loading="lazy"
        />
      )}
    </div>
  );
};

export default YouTubeLiveEmbed;

// // components/YouTubeLiveEmbed.tsx
// import React from "react";

// interface YouTubeLiveEmbedProps {
//   videoId: string; // e.g., 'UC_x5XG1OV2P6uZZ5FSM9Ttw'
//   height?: string;
//   width?: string;
// }

// const YouTubeLiveEmbed: React.FC<YouTubeLiveEmbedProps> = ({
//   videoId,
//   height = "315",
//   width = "560",
// }) => {
//   return (
//     <div
//       className="youtube-embed-container"
//       style={{
//         position: "relative",
//         width: "100%",
//         height: "0",
//         paddingBottom: "56.25%",
//       }}
//     >
//       <iframe
//         src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
//         style={{
//           position: "absolute",
//           top: 0,
//           left: 0,
//           width: "100%",
//           height: "100%",
//         }}
//         frameBorder="0"
//         allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
//         allowFullScreen
//         title="YouTube Live Stream"
//       />
//     </div>
//   );
// };

// export default YouTubeLiveEmbed;

import React from "react";

type ProfilePhotoProps = {
  src?: string; // optional image URL
  alt: string;
};

export default function ProfilePhoto({ src, alt }: ProfilePhotoProps) {
  return (
    <div className="flex flex-col items-center mb-4">
      <div className="border-4 border-black shadow-[4px_4px_0_#000] bg-white p-1">
        {src ? (
          <img
            src={src}
            alt={alt}
            className="w-32 h-32 object-cover"
          />
        ) : (
          <div className="w-32 h-32 flex items-center justify-center bg-yellow-200 text-black text-sm">
            No Photo
          </div>
        )}
      </div>
    </div>
  );
}

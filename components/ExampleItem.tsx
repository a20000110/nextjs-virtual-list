import React from "react";
import Image from "next/image";
import { FeedItem } from "@/utils/mock";
import { RiHeartLine, RiChat1Line, RiShareForwardLine } from "@remixicon/react";

interface ExampleItemProps {
  source: FeedItem;
  index: number;
  fixedHeight?: boolean;
}

export const ExampleItem: React.FC<ExampleItemProps> = ({ source, index, fixedHeight }) => {
  return (
    <div 
      className={`bg-white border-b border-gray-100 p-4 hover:bg-gray-50 transition-colors ${
        fixedHeight ? 'h-[100px] overflow-hidden' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 shadow-sm">
             <Image 
               src={source.author.avatar} 
               alt={source.author.name}
               fill
               className="object-cover"
               sizes="40px"
             />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex justify-between items-baseline">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              {source.author.name} 
              <span className="text-gray-400 font-normal text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">#{index}</span>
            </h3>
            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{source.createdAt}</span>
          </div>

          {/* Text */}
          <p className={`text-gray-700 text-sm mt-1 leading-relaxed ${fixedHeight ? 'line-clamp-2' : ''}`}>
            {source.text}
          </p>

          {/* Images */}
          {!fixedHeight && source.images.length > 0 && (
            <div className="mt-3 grid gap-2 grid-cols-2 sm:grid-cols-3 max-w-[500px]">
              {source.images.map((img, i) => (
                <div key={i} className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shadow-sm group">
                  <Image
                    src={img}
                    alt="Post image"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 50vw, 33vw"
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Actions */}
          {!fixedHeight && (
            <div className="flex items-center gap-6 mt-3 pt-2 border-t border-gray-50">
               <button className="flex items-center gap-1.5 text-gray-500 hover:text-red-500 transition-colors text-xs font-medium group cursor-pointer">
                 <div className="p-1.5 rounded-full group-hover:bg-red-50 transition-colors">
                    <RiHeartLine className="w-4 h-4 group-hover:scale-110 transition-transform" />
                 </div>
                 <span>Like</span>
               </button>
               <button className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition-colors text-xs font-medium group cursor-pointer">
                 <div className="p-1.5 rounded-full group-hover:bg-blue-50 transition-colors">
                    <RiChat1Line className="w-4 h-4 group-hover:scale-110 transition-transform" />
                 </div>
                 <span>Comment</span>
               </button>
               <button className="flex items-center gap-1.5 text-gray-500 hover:text-green-500 transition-colors text-xs font-medium group cursor-pointer">
                 <div className="p-1.5 rounded-full group-hover:bg-green-50 transition-colors">
                    <RiShareForwardLine className="w-4 h-4 group-hover:scale-110 transition-transform" />
                 </div>
                 <span>Share</span>
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

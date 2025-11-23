import { useState, useEffect } from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';
import Link from 'next/link';

interface ActivityItem {
    id: string;
    type: 'join' | 'post' | 'decoration' | 'badge';
    user: string;
    detail: string;
    time: string;
}

export default function CommunityPulse() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);

    // Simulate live activity feed
    useEffect(() => {
        const mockActivities: ActivityItem[] = [
            { id: '1', type: 'join', user: 'pixel_pete', detail: 'joined the neighborhood!', time: '2m ago' },
            { id: '2', type: 'post', user: 'retro_fan', detail: 'posted in /gardening', time: '5m ago' },
            { id: '3', type: 'decoration', user: 'builder_bob', detail: 'planted a rose bush', time: '12m ago' },
            { id: '4', type: 'badge', user: 'art_lover', detail: 'earned "Pixel Artist"', time: '1h ago' },
            { id: '5', type: 'join', user: 'new_neighbor', detail: 'moved in!', time: '2h ago' },
        ];
        setActivities(mockActivities);
    }, []);

    const getIcon = (type: ActivityItem['type']) => {
        switch (type) {
            case 'join': return 'user-plus';
            case 'post': return 'chat';
            case 'decoration': return 'heart';
            case 'badge': return 'trophy';
            default: return 'chart';
        }
    };

    const getColor = (type: ActivityItem['type']) => {
        switch (type) {
            case 'join': return 'text-blue-600 bg-blue-100';
            case 'post': return 'text-green-600 bg-green-100';
            case 'decoration': return 'text-pink-600 bg-pink-100';
            case 'badge': return 'text-yellow-600 bg-yellow-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_#000] rounded-lg overflow-hidden h-full">
            <div className="bg-[#FFD700] p-3 border-b-2 border-black flex justify-between items-center">
                <h3 className="font-bold text-black flex items-center gap-2">
                    <PixelIcon name="chart" size={20} />
                    Community Pulse
                </h3>
                <div className="flex gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse delay-75"></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-150"></div>
                </div>
            </div>

            <div className="p-0">
                {activities.map((item, index) => (
                    <div
                        key={item.id}
                        className={`flex items-center gap-3 p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${index === activities.length - 1 ? 'border-b-0' : ''}`}
                    >
                        <div className={`p-2 rounded-md border border-black/10 ${getColor(item.type)}`}>
                            <PixelIcon name={getIcon(item.type)} size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                <span className="font-bold hover:underline cursor-pointer">{item.user}</span> {item.detail}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">{item.time}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-2 bg-gray-50 border-t border-gray-200 text-center">
                <Link href="/feed" className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline">
                    View All Activity &rarr;
                </Link>
            </div>
        </div>
    );
}

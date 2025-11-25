import React, { useState } from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useRouter } from 'next/router';

export const QuickSubmitWidget = () => {
    const router = useRouter();
    const [url, setUrl] = useState('');
    const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;

        // Basic URL validation
        try {
            new URL(url);
        } catch {
            setStatus('error');
            setMessage('Please enter a valid URL (e.g., https://example.com)');
            return;
        }

        setStatus('scanning');
        setMessage('Waking up the spider...');

        try {
            // We'll redirect to the full submit page with the URL pre-filled
            // This allows the user to verify details before final submission
            // But we simulate a "scan" here for fun feedback

            await new Promise(resolve => setTimeout(resolve, 800)); // Fake scan delay for effect

            router.push(`/community-index/submit?url=${encodeURIComponent(url)}&auto=true`);

        } catch (error) {
            setStatus('error');
            setMessage('Something went wrong. Try again?');
        }
    };

    return (
        <div className="bg-white border-2 border-gray-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
            {/* Background decoration */}
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <PixelIcon name="debug" size={120} />
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-yellow-400 p-2 rounded-lg border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <PixelIcon name="search" size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg leading-tight">Feed the Spider</h3>
                        <p className="text-xs text-gray-500 font-medium">Found a cool site? Let us know!</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="relative">
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => {
                            setUrl(e.target.value);
                            setStatus('idle');
                            setMessage('');
                        }}
                        placeholder="Paste a URL here..."
                        className="w-full pl-4 pr-12 py-3 bg-gray-50 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-0 outline-none transition-all font-mono text-sm"
                        disabled={status === 'scanning'}
                    />

                    <button
                        type="submit"
                        disabled={status === 'scanning' || !url}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all ${url ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-400'
                            }`}
                    >
                        {status === 'scanning' ? (
                            <div className="animate-spin">
                                <PixelIcon name="reload" size={16} />
                            </div>
                        ) : (
                            <PixelIcon name="arrow-right" size={16} />
                        )}
                    </button>
                </form>

                {/* Status Message */}
                {message && (
                    <div className={`mt-2 text-xs font-medium flex items-center gap-1.5 ${status === 'error' ? 'text-red-500' : 'text-blue-500'
                        }`}>
                        <PixelIcon name={status === 'error' ? 'alert' : 'info-box'} size={12} />
                        {message}
                    </div>
                )}

                {/* Gamification hint */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                    <span>Earn <span className="font-bold text-yellow-600">Scout Points</span> for every gem!</span>
                    <PixelIcon name="trophy" size={14} className="text-yellow-500" />
                </div>
            </div>
        </div>
    );
};

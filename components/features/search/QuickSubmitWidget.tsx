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
            setMessage('Invalid URL');
            return;
        }

        setStatus('scanning');

        try {
            await new Promise(resolve => setTimeout(resolve, 800)); // Fake scan delay for effect
            router.push(`/community-index/submit?url=${encodeURIComponent(url)}&auto=true`);
        } catch (error) {
            setStatus('error');
            setMessage('Error');
        }
    };

    return (
        <div className="bg-white border-2 border-gray-900 rounded-lg p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4">
            <div className="flex items-center gap-2 flex-shrink-0">
                <div className="bg-yellow-400 p-1.5 rounded border border-gray-900">
                    <PixelIcon name="search" size={16} />
                </div>
                <div className="hidden sm:block">
                    <h3 className="font-bold text-sm leading-tight">Feed the Spider</h3>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 relative flex items-center gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => {
                            setUrl(e.target.value);
                            setStatus('idle');
                            setMessage('');
                        }}
                        placeholder="Paste a URL to add to the index..."
                        className="w-full pl-3 pr-8 py-1.5 bg-gray-50 border border-gray-300 rounded focus:border-blue-500 focus:ring-0 outline-none transition-all font-mono text-xs"
                        disabled={status === 'scanning'}
                    />
                    {status === 'error' && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500">
                            <PixelIcon name="alert" size={12} />
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={status === 'scanning' || !url}
                    className={`p-1.5 rounded border border-gray-900 transition-all flex-shrink-0 ${url ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' : 'bg-gray-100 text-gray-400'
                        }`}
                >
                    {status === 'scanning' ? (
                        <div className="animate-spin">
                            <PixelIcon name="reload" size={14} />
                        </div>
                    ) : (
                        <PixelIcon name="arrow-right" size={14} />
                    )}
                </button>
            </form>

            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <PixelIcon name="info-box" size={12} />
                <span>Help grow the indie web index</span>
            </div>
        </div>
    );
};

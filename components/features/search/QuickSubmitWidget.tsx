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
        <div className="widget-container widget--flat bg-thread-paper border border-thread-sage rounded-cozy shadow-cozy-sm p-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-nb-ink">
                    <PixelIcon name="search" size={16} />
                </div>
                <div className="hidden sm:block">
                    <h3 className="thread-headline font-bold text-sm leading-tight mb-0">Feed the Spider</h3>
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
                        className="w-full pl-3 pr-8 py-1.5 bg-white border-2 border-nb-ink-mid/60 rounded-md focus:border-nb-ink-mid outline-none font-mono text-xs"
                        disabled={status === 'scanning'}
                    />
                    {status === 'error' && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-nb-rose-ink">
                            <PixelIcon name="alert" size={12} />
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={status === 'scanning' || !url}
                    className="ts-icon-button flex-shrink-0 disabled:opacity-50"
                    aria-label="Add URL to the index"
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

            <div className="text-xs text-nb-ink-mid basis-full sm:basis-auto">
                <span>Help grow the indie web index</span>
            </div>
        </div>
    );
};

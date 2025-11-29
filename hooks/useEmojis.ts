import { useState, useEffect } from 'react';

export interface Emoji {
    id: string;
    name: string;
    imageUrl: string;
}

export function useEmojis() {
    const [emojis, setEmojis] = useState<Emoji[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function loadEmojis() {
            try {
                const response = await fetch('/api/emojis');
                if (response.ok && mounted) {
                    const data = await response.json();
                    setEmojis(data.emojis || []);
                }
            } catch (error) {
                console.error('Failed to load emojis:', error);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        loadEmojis();

        return () => {
            mounted = false;
        };
    }, []);

    return { emojis, loading };
}
